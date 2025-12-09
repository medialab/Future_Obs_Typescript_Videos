import type { RequestEvent } from '@sveltejs/kit';
import { bundle } from '@remotion/bundler';
import { getCompositions, renderMedia } from '@remotion/renderer';
import path from 'path';
import { fileURLToPath } from 'url';
import type { VideoData } from '$lib/remotion/SingleVideoComp';
import { mkdir, writeFile } from 'fs/promises';
import { error } from '@sveltejs/kit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMP_DIR = path.resolve(__dirname, '../../../../temp/uploads');

async function ensureTempDir() {
	try {
		await mkdir(TEMP_DIR, { recursive: true });
	} catch (error) {
	}
}

export async function POST({ request }: RequestEvent) {

	process.env.REMOTION_RENDERING = 'true';

	const { videos } = await request.json();
	const origin = process.env.ASSET_ORIGIN ?? new URL(request.url).origin;

	const renderingVideos: VideoData[] = (videos as VideoData[]).map((video) => {
		// Prefer absolute http(s) URL for renderer to download
		const normalizedVideoSrc = video.videoSrc?.startsWith('/')
			? `${origin}${video.videoSrc}`
			: video.videoSrc
				? `${origin}/${video.videoSrc}`
				: undefined;

		const renderSrc = video.renderSrc || normalizedVideoSrc;

		if (!renderSrc) {
			throw error(400, `Missing renderSrc/videoSrc for clip: ${(video as any).ClipName || 'unknown'}`);
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

			try {
				sendMessage('status', { message: 'Starting bundling...' });

				// Fix: Go up 5 levels from src/routes/composer/api/videos/ to project root
				const projectRoot = path.resolve(__dirname, '../../../../..');

				// Fix: Use projectRoot to resolve the entry point
				const entryPoint = path.resolve(projectRoot, 'src/lib/remotion/index.ts');

				sendMessage('status', { message: 'Bundling Remotion project...' });

				const bundleLocation = await bundle({
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

				closeController();
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				const errorStack = error instanceof Error ? error.stack : undefined;
				console.error('Error rendering video:', errorMessage);
				console.error('Stack:', errorStack);
				sendMessage('error', { message: errorMessage, stack: errorStack });
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
