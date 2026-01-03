/**
 * Client-Side Rendering (CSR) for Remotion
 * Uses @remotion/web-renderer to render videos in the browser using WebCodecs
 *
 * Key differences from SSR:
 * - Uses direct URLs instead of staticFile() for images/audio
 * - Uses <Video> from @remotion/media instead of OffthreadVideo
 *
 * @see https://www.remotion.dev/docs/client-side-rendering/
 * @see https://github.com/remotion-dev/remotion/issues/5913
 */

import { renderMediaOnWeb } from '@remotion/web-renderer';
import type { VideoData } from '$lib/types';
import type { RenderProgress, RenderResult } from './types';

// Use CSR-compatible composition (uses @remotion/media Video instead of OffthreadVideo)
import { MasterCompositionCSR } from '$lib/remotion/MasterCompCSR';

// Intro duration must match MasterComp.tsx
const INTRO_UNIQUE_DURATION = 80;
const INTRO_TOTAL_DURATION = INTRO_UNIQUE_DURATION * 3; // 240 frames

export interface CSRRenderOptions {
	segments: VideoData[];
	fps?: number;
	width?: number;
	height?: number;
	onProgress?: (progress: RenderProgress) => void;
	onStatus?: (message: string) => void;
}

/**
 * Render video using client-side rendering (CSR)
 * This runs entirely in the browser using WebCodecs
 * Uses the same MasterComposition as SSR for visual consistency
 */
export async function renderWithCSR(options: CSRRenderOptions): Promise<RenderResult> {
	const { segments, fps = 25, width = 1920, height = 1080, onProgress, onStatus } = options;

	onStatus?.('Starting client-side rendering...');

	// Prepare segments for rendering (same as SSR does)
	// - Set isRendering: true so SingleVideoComp uses the correct video source logic
	// - For CSR, we use the blob URLs directly since videos are in browser memory
	const renderingSegments: VideoData[] = segments.map((segment) => ({
		...segment,
		isRendering: true,
		// For CSR, videoSrc (blob URL) is the render source
		renderSrc: segment.videoSrc || segment.renderSrc
	}));

	// Calculate total duration (same as SSR)
	// Intro (240 frames) + all segment durations
	const segmentsDuration = renderingSegments.reduce((sum, seg) => sum + seg.durationInFrames, 0);
	const totalDurationInFrames = INTRO_TOTAL_DURATION + segmentsDuration;

	console.log('[CSR] Using MasterComposition with:', {
		introFrames: INTRO_TOTAL_DURATION,
		segmentFrames: segmentsDuration,
		totalFrames: totalDurationInFrames,
		segmentCount: renderingSegments.length,
		segments: renderingSegments.map((s) => ({
			ClipName: s.ClipName,
			isRendering: s.isRendering,
			hasVideoSrc: !!s.videoSrc,
			hasRenderSrc: !!s.renderSrc,
			durationInFrames: s.durationInFrames
		}))
	});

	onStatus?.(`Preparing composition (${totalDurationInFrames} frames)...`);

	try {
		const { getBlob } = await renderMediaOnWeb({
			composition: {
				component: MasterCompositionCSR,
				durationInFrames: totalDurationInFrames,
				fps,
				width,
				height,
				calculateMetadata: null,
				id: 'MasterCompositionCSR',
				defaultProps: { segments: [] }
			},
			inputProps: { segments: renderingSegments },
			onProgress: (progressInfo) => {
				// The progress object structure from web-renderer
				const renderedPercent = Math.round(
					((progressInfo.renderedFrames ?? 0) / totalDurationInFrames) * 100
				);
				const encodedPercent = Math.round(
					((progressInfo.encodedFrames ?? 0) / totalDurationInFrames) * 100
				);

				onProgress?.({
					renderedFrames: progressInfo.renderedFrames ?? 0,
					encodedFrames: progressInfo.encodedFrames ?? 0,
					totalFrames: totalDurationInFrames,
					renderedPercent,
					encodedPercent
				});
				onStatus?.(`Rendering: ${Math.max(renderedPercent, encodedPercent)}%`);
			}
		});

		onStatus?.('Finalizing video...');

		const rawBlob = await getBlob();

		// Ensure the blob has the correct MIME type for video/mp4
		const blob = new Blob([rawBlob], { type: 'video/mp4' });

		console.log('[CSR] Blob created:', {
			size: blob.size,
			type: blob.type,
			originalType: rawBlob.type
		});

		onStatus?.('Client-side render complete!');

		// Ensure filename ends with .mp4
		const baseFilename = segments[0]?.originalVideoTitle || 'video';
		const filename = baseFilename.endsWith('.mp4') ? baseFilename : `${baseFilename}.mp4`;

		return {
			blob,
			filename
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		throw new Error(`CSR rendering failed: ${errorMessage}`);
	}
}

/**
 * Check if the browser supports WebCodecs (required for CSR)
 */
export function isCSRSupported(): boolean {
	if (typeof window === 'undefined') return false;

	// Check for WebCodecs API support
	const hasVideoEncoder = 'VideoEncoder' in window;
	const hasVideoDecoder = 'VideoDecoder' in window;
	const hasAudioEncoder = 'AudioEncoder' in window;
	const hasAudioDecoder = 'AudioDecoder' in window;

	return hasVideoEncoder && hasVideoDecoder && hasAudioEncoder && hasAudioDecoder;
}

/**
 * Get information about CSR capabilities
 */
export function getCSRCapabilities(): {
	supported: boolean;
	features: {
		videoEncoder: boolean;
		videoDecoder: boolean;
		audioEncoder: boolean;
		audioDecoder: boolean;
	};
	limitations: string[];
} {
	const features = {
		videoEncoder: typeof window !== 'undefined' && 'VideoEncoder' in window,
		videoDecoder: typeof window !== 'undefined' && 'VideoDecoder' in window,
		audioEncoder: typeof window !== 'undefined' && 'AudioEncoder' in window,
		audioDecoder: typeof window !== 'undefined' && 'AudioDecoder' in window
	};

	return {
		supported: Object.values(features).every(Boolean),
		features,
		limitations: [
			'Uses CSR-compatible composition with @remotion/media',
			'Static files loaded via direct URLs (not staticFile())',
			'Videos use <Video> component instead of OffthreadVideo',
			'Experimental feature - expect bugs'
		]
	};
}
