/**
 * Rendering Types
 * Shared types for SSR rendering
 */

export interface RenderProgress {
	renderedFrames: number;
	encodedFrames: number;
	totalFrames: number;
	renderedPercent: number;
	encodedPercent: number;
}

export interface RenderStatus {
	type: 'status' | 'progress' | 'complete' | 'error';
	message?: string;
	progress?: RenderProgress;
	downloadUrl?: string;
	blob?: Blob;
	filename?: string;
}

export interface RenderResult {
	blob: Blob;
	filename: string;
}
