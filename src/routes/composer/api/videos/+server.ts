import type { RequestEvent } from '@sveltejs/kit';
import { bundle } from '@remotion/bundler';
import { getCompositions, renderMedia } from '@remotion/renderer';
import path from 'path';
import { fileURLToPath } from 'url';
import type { VideoData } from '$lib/remotion/SingleVideoComp';
import { mkdir, writeFile, rm } from 'fs/promises'; // Add 'rm' for cleanup
import { unlink } from 'fs/promises'; // Add unlink for deleting individual files
import { error } from '@sveltejs/kit';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function POST({ request }: RequestEvent) {
	process.env.REMOTION_RENDERING = 'true';

	const { videos } = await request.json();
	const origin = process.env.ASSET_ORIGIN ?? new URL(request.url).origin;

	const videoFilePaths: string[] = (videos as VideoData[])
		.map((video) => (video as any).videoSrcPath)
		.filter((path): path is string => Boolean(path));

	const renderingVideos: VideoData[] = (videos as VideoData[]).map((video) => {
		// Prefer absolute http(s) URL for renderer to download
		const normalizedVideoSrc = video.videoSrc?.startsWith('/')
			? `${origin}${video.videoSrc}`
			: video.videoSrc
				? `${origin}/${video.videoSrc}`
				: undefined;

		const renderSrc = video.renderSrc || normalizedVideoSrc;

		if (!renderSrc) {
			throw error(
				400,
				`Missing renderSrc/videoSrc for clip: ${(video as any).ClipName || 'unknown'}`
			);
		}

		return {
			...video,
			renderSrc,
			isRendering: true
		};
	});

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

			// Cleanup function - now handles both bundle and static/videos files
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

				// Clean up static/videos files
				if (videoFilePaths.length > 0) {
					try {
						console.log('Cleaning up static/videos files:', videoFilePaths.length, 'files');
						await Promise.all(
							videoFilePaths.map(async (filePath) => {
								try {
									await unlink(filePath);
									console.log('Deleted:', filePath);
								} catch (fileError) {
									console.error(`Error deleting file ${filePath}:`, fileError);
								}
							})
						);
						console.log('Static/videos cleanup complete');
					} catch (cleanupError) {
						console.error('Error cleaning up static/videos files:', cleanupError);
					}
				}
			};

			try {
				sendMessage('status', { message: 'Starting bundling...' });

				// Verify all video files exist and are accessible before starting render
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

				// Calculate total duration
				const totalDuration = renderingVideos.reduce((sum: number, seg: VideoData) => {
					return sum + (seg.duration || 0);
				}, 0);
				const totalDurationFrames = Math.ceil(totalDuration * 30);
				composition.durationInFrames = totalDurationFrames;

				sendMessage('status', { message: 'Starting render...', totalFrames: totalDurationFrames });

				const result = await renderMedia({
					composition,
					serveUrl: bundleLocation,
					codec: 'h264',
					outputLocation: null, // Render to buffer instead of file
					inputProps: { segments: renderingVideos },
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

				const buffer = result.buffer;

				if (!buffer) {
					sendMessage('error', { message: 'No buffer returned' });
					await cleanup(); // Clean up before closing
					closeController();
					return;
				}

				console.log('Render complete, buffer size:', buffer.length / 1024 / 1024, 'MB');

				sendMessage('status', { message: 'Render complete!', bufferSize: buffer.length });

				// Send video as base64
				const base64 = Buffer.from(buffer).toString('base64');
				sendMessage('complete', {
					video: base64,
					filename: 'master-video.mp4'
				});

				// Clean up bundle directory after successful render
				await cleanup();

				closeController();
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				// Remove verbose HTML response body from error messages
				const cleanMessage = errorMessage.includes('The response body was:')
					? errorMessage.split('The response body was:')[0].trim()
					: errorMessage;

				console.error('Error rendering video:', cleanMessage);
				const errorStack = error instanceof Error ? error.stack : undefined;
				if (errorStack) {
					console.error('Stack:', errorStack);
				}
				sendMessage('error', { message: cleanMessage });

				// Clean up even on error
				//await cleanup();

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
