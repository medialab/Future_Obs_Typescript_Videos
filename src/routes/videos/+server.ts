import type { RequestEvent } from '@sveltejs/kit';
import { bundle } from '@remotion/bundler';
import { getCompositions, renderMedia } from '@remotion/renderer';
import path from 'path';
import { fileURLToPath } from 'url';
import type { VideoData } from '$lib/remotion/SingleVideoComp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function POST({ request }: RequestEvent) {
	const { videos } = await request.json();

	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();

			const sendMessage = (type: string, data: any) => {
				const message = JSON.stringify({ type, data, timestamp: Date.now() });
				// SSE format: "data: {json}\n\n"
				controller.enqueue(encoder.encode(`data: ${message}\n\n`));
			};

			try {
				sendMessage('status', { message: 'Starting bundling...' });

				const projectRoot = path.resolve(__dirname, '../../..');

				const entryPoint = path.resolve(__dirname, '../../lib/remotion/index.ts');

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
					inputProps: { segments: videos as VideoData[] }
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
					return new Response(
						`Composition "VideoComp" not found. Available: ${compositions.map((c) => c.id).join(', ')}`,
						{
							status: 404,
							headers: { 'Content-Type': 'text/plain' }
						}
					);
				}

				// Calculate total duration
				const totalDuration = videos.reduce((sum: number, seg: VideoData) => {
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
					inputProps: { segments: videos as VideoData[] },
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
					controller.close();
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

				controller.close();
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				const errorStack = error instanceof Error ? error.stack : undefined;
				console.error('Error rendering video:', errorMessage);
				console.error('Stack:', errorStack);
				sendMessage('error', { message: errorMessage, stack: errorStack });
				controller.close();
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
