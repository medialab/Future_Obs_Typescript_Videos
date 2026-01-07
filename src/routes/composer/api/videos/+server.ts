import type { RequestEvent } from '@sveltejs/kit';
import { bundle } from '@remotion/bundler';
import { getCompositions, renderMedia } from '@remotion/renderer';
import path from 'path';
import { fileURLToPath } from 'url';
import type { VideoData } from '$lib/types';
import { mkdir, rm } from 'fs/promises';
import { error } from '@sveltejs/kit';
import { existsSync } from 'fs';

/**
 * Simple audio validation - trusts the client-side hasAudio flag
 * which was determined by @remotion/media-parser
 *
 * This is more reliable than trying to run ffprobe on temp URLs
 */
function logAudioStatus(videos: VideoData[]): void {
	const withAudio = videos.filter((v) => v.hasAudio);
	const withoutAudio = videos.filter((v) => !v.hasAudio);

	console.log(`[Audio] ${withAudio.length} videos with audio, ${withoutAudio.length} without`);

	if (withAudio.length > 0) {
		console.log('[Audio] Videos with audio:', withAudio.map((v) => v.ClipName).join(', '));
	}
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RENDERED_VIDEOS_DIR = path.join(process.cwd(), 'tmp/renders');

export async function POST({ request }: RequestEvent) {
	process.env.REMOTION_RENDERING = 'true';

	// Handle both JSON and FormData (for video files)
	let videos: any[];
	let videoFiles: File[] = [];

	if (request.headers.get('content-type')?.includes('multipart/form-data')) {
		// New approach: videos come as FormData with files
		const formData = await request.formData();
		const videosJson = formData.get('videos') as string;
		videos = JSON.parse(videosJson);
		videoFiles = formData.getAll('files') as File[];
	} else {
		// Legacy approach: videos come as JSON
		const data = await request.json();
		videos = data.videos;
	}

	const origin = process.env.ASSET_ORIGIN ?? new URL(request.url).origin;

	// Track temp files for cleanup
	const tempFiles: Array<{ tempId: string; url: string }> = [];

	// Upload videos to temp URLs if files are provided
	const videoFileMap = new Map<string, File>();
	if (videoFiles.length > 0) {
		videoFiles.forEach((file) => {
			const nameWithoutExt = file.name.replace(/\.(mp4|mov|avi|mkv)$/i, '');
			videoFileMap.set(nameWithoutExt, file);
		});
	}

	const renderingVideos: VideoData[] = await Promise.all(
		videos.map(async (video) => {
			let renderSrc: string;

			// If we have video files, upload them to temp URLs
			if (videoFiles.length > 0) {
				const clipName = (video as any).ClipName?.trim();
				if (!clipName) {
					throw error(400, `Missing ClipName for video`);
				}

				const matchingFile = videoFileMap.get(clipName);
				if (!matchingFile) {
					throw error(400, `No matching file found for ClipName: ${clipName}`);
				}

				// Upload to temp URL
				const formData = new FormData();
				formData.append('video', matchingFile);

				const uploadResponse = await fetch(`${origin}/composer/api/temp-upload`, {
					method: 'POST',
					body: formData
				});

				if (!uploadResponse.ok) {
					throw error(500, `Failed to upload video ${clipName}`);
				}

				const uploadData = await uploadResponse.json();

				renderSrc = uploadData.url.startsWith('http')
					? uploadData.url
					: uploadData.url.startsWith('/')
						? `${origin}${uploadData.url}`
						: `${origin}/${uploadData.url}`;
				tempFiles.push({ tempId: uploadData.tempId, url: renderSrc });
			} else {
				// Legacy approach: use existing URLs
				const normalizedVideoSrc = video.videoSrc?.startsWith('/')
					? `${origin}${video.videoSrc}`
					: video.videoSrc
						? `${origin}/${video.videoSrc}`
						: undefined;

				renderSrc = video.renderSrc || normalizedVideoSrc;

				if (!renderSrc) {
					throw error(
						400,
						`Missing renderSrc/videoSrc for clip: ${(video as any).ClipName || 'unknown'}`
					);
				}
			}

			return {
				...video,
				renderSrc,
				isRendering: true
			};
		})
	);

	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();
			let closed = false;
			let bundleLocation: string | null = null; // Track bundle location for cleanup

			const sendMessage = (type: string, data: any) => {
				if (closed) return;
				const message = JSON.stringify({ type, data, timestamp: Date.now() });
				controller.enqueue(encoder.encode(`data: ${message}\n\n`));
			};

			const closeController = () => {
				if (closed) return;
				closed = true;
				controller.close();
			};

			const cleanup = async () => {
				// Clean up bundle directory
				if (bundleLocation) {
					try {
						console.log('Cleaning up bundle location:', bundleLocation);
						await rm(bundleLocation, { recursive: true, force: true });
						console.log('Bundle cleanup complete');
					} catch (cleanupError) {
						console.error('Error cleaning up bundle:', cleanupError);
					}
				}

				// Clean up temp uploaded files
				if (tempFiles.length > 0) {
					try {
						console.log('Cleaning up temp files:', tempFiles.length, 'files');
						await Promise.all(
							tempFiles.map(async ({ tempId }) => {
								try {
									const deleteResponse = await fetch(
										`${origin}/composer/api/temp-upload/${tempId}`,
										{
											method: 'DELETE'
										}
									);
									if (deleteResponse.ok) {
										console.log('Cleaned up temp file:', tempId);
									} else {
										console.warn('Failed to clean up temp file:', tempId);
									}
								} catch (deleteError) {
									console.warn('Error cleaning up temp file:', tempId, deleteError);
								}
							})
						);
						console.log('Temp files cleanup complete');
					} catch (cleanupError) {
						console.error('Error cleaning up temp files:', cleanupError);
					}
				}
			};

			try {
				sendMessage('status', { message: 'Starting bundling...' });

				sendMessage('status', { message: 'Verifying video files...' });
				for (const video of renderingVideos) {
					const videoUrl = video.renderSrc;
					if (videoUrl && videoUrl.startsWith('http')) {
						try {
							const response = await fetch(videoUrl, { method: 'HEAD' });
							if (!response.ok) {
								throw error(
									404,
									`Video file not accessible: ${videoUrl} (status: ${response.status})`
								);
							}
							console.log(`Verified video file: ${videoUrl}`);
						} catch (fetchError) {
							if (fetchError instanceof Error && 'status' in fetchError) {
								throw fetchError;
							}
							throw error(
								404,
								`Video file not accessible: ${videoUrl} - ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`
							);
						}
					}
				}
				sendMessage('status', { message: 'All video files verified' });

				// Log audio status (trusting client-side detection from @remotion/media-parser)
				sendMessage('status', { message: 'Checking audio tracks...' });
				logAudioStatus(renderingVideos);
				sendMessage('status', { message: 'Audio check complete' });

				// Find project root by looking for package.json or svelte.config.js
				let projectRoot = process.cwd();
				let currentDir = __dirname;

				// Traverse up until we find package.json or svelte.config.js
				while (currentDir !== path.dirname(currentDir)) {
					if (
						existsSync(path.join(currentDir, 'package.json')) ||
						existsSync(path.join(currentDir, 'svelte.config.js'))
					) {
						projectRoot = currentDir;
						break;
					}
					currentDir = path.dirname(currentDir);
				}

				// Verify we found the correct project root by checking for src/lib/remotion/index.ts
				const entryPointCheck = path.resolve(projectRoot, 'src/lib/remotion/index.ts');
				if (!existsSync(entryPointCheck)) {
					// Fallback: try process.cwd() if the traversal didn't work
					const fallbackEntryPoint = path.resolve(process.cwd(), 'src/lib/remotion/index.ts');
					if (existsSync(fallbackEntryPoint)) {
						projectRoot = process.cwd();
					} else {
						throw error(
							500,
							`Could not find project root. Checked: ${projectRoot} and ${process.cwd()}. Entry point should be at: src/lib/remotion/index.ts`
						);
					}
				}

				console.log('Project root resolved to:', projectRoot);

				// Fix: Use projectRoot to resolve the entry point
				const entryPoint = path.resolve(projectRoot, 'src/lib/remotion/index.ts');

				// Verify entry point exists
				if (!existsSync(entryPoint)) {
					throw error(500, `Entry point not found: ${entryPoint}`);
				}

				sendMessage('status', { message: 'Bundling Remotion project...' });

				bundleLocation = await bundle({
					entryPoint,
					publicDir: path.resolve(projectRoot, 'static'),
					webpackOverride: (config) => {
						if (!config.resolve) {
							config.resolve = {};
						}
						if (!config.resolve.alias) {
							config.resolve.alias = {};
						}
						// $lib resolves to src/lib in SvelteKit
						const libPath = path.resolve(projectRoot, 'src/lib');
						(config.resolve.alias as Record<string, string>)['$lib'] = libPath;

						// Also add support for other SvelteKit aliases if needed
						(config.resolve.alias as Record<string, string>)['$app'] = path.resolve(
							projectRoot,
							'.svelte-kit/runtime/app'
						);

						console.log('Webpack alias configured: $lib ->', libPath);
						return config;
					}
				});
				console.log('Bundle location:', bundleLocation);

				const compositions = await getCompositions(bundleLocation, {
					inputProps: { segments: renderingVideos }
				});

				sendMessage('status', {
					message: 'Found compositions:',
					compositions: compositions.map((c) => c.id)
				});

				const composition = compositions.find((c) => c.id === 'MasterComposition');

				console.log('Composition:', composition);

				if (!composition) {
					console.error(
						'Composition not found. Available:',
						compositions.map((c) => c.id)
					);
					sendMessage('error', {
						message: `Composition "VideoComp" not found. Available: ${compositions.map((c) => c.id).join(', ')}`
					});
					await cleanup(); // Clean up before closing
					closeController();
					return;
				}

				// Calculate total duration in frames using precomputed per-segment frames
				// Must include intro duration (INTRO_UNIQUE_DURATION * 3 = 240 frames from MasterComp)
				const INTRO_DURATION_FRAMES = 240;
				const segmentsDuration = renderingVideos.reduce((sum: number, seg: VideoData) => {
					return sum + seg.durationInFrames;
				}, 0);
				const totalDurationFrames = INTRO_DURATION_FRAMES + segmentsDuration;

				composition.durationInFrames = totalDurationFrames;

				sendMessage('status', { message: 'Starting render...', totalFrames: totalDurationFrames });

				await mkdir(RENDERED_VIDEOS_DIR, { recursive: true });
				const renderedFilename = `rendered-${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`;
				const outputPath = path.join(RENDERED_VIDEOS_DIR, renderedFilename);

				await renderMedia({
					composition,
					serveUrl: bundleLocation,
					codec: 'h264',
					concurrency: null,
					videoBitrate: '2M',
					audioBitrate: '128k',
					audioCodec: 'aac',
					outputLocation: outputPath,
					inputProps: { segments: renderingVideos },
					hardwareAcceleration: 'if-possible',
					x264Preset: 'veryfast',
					onProgress: ({ renderedFrames, encodedFrames }) => {
						const renderedPercent = Math.round((renderedFrames / totalDurationFrames) * 100);
						const encodedPercent = Math.round((encodedFrames / totalDurationFrames) * 100);

						sendMessage('progress', {
							renderedFrames,
							encodedFrames,
							totalFrames: totalDurationFrames,
							renderedPercent,
							encodedPercent
						});
					}
				});

				const { stat } = await import('fs/promises');

				try {
					const fileStats = await stat(outputPath);
					const fileSizeMB = (fileStats.size / 1024 / 1024).toFixed(2);

					console.log('Render complete, file saved:', outputPath, `(${fileSizeMB} MB)`);

					sendMessage('status', {
						message: 'Render complete!',
						fileSize: fileStats.size,
						fileSizeMB: fileSizeMB
					});

					sendMessage('complete', {
						downloadUrl: `/composer/api/files/${renderedFilename}`,
						filename: 'master-video.mp4'
					});
				} catch (fileError) {
					sendMessage('error', {
						message: `Render completed but file not found: ${outputPath}`
					});
					await cleanup();
					closeController();
					return;
				}

				await cleanup();

				closeController();
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);

				const cleanMessage = errorMessage.includes('The response body was:')
					? errorMessage.split('The response body was:')[0].trim()
					: errorMessage;

				console.error('Error rendering video:', cleanMessage);
				const errorStack = error instanceof Error ? error.stack : undefined;

				if (errorStack) {
					console.error('Stack:', errorStack);
				}

				sendMessage('error', { message: cleanMessage });

				closeController();
			}
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
}
