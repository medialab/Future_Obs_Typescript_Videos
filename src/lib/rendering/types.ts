/**
 * Rendering Types
 * Shared types for SSR and CSR rendering modes
 */

export type RenderingMode = 'ssr' | 'csr';

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

export interface RenderOptions {
	mode: RenderingMode;
	onProgress?: (progress: RenderProgress) => void;
	onStatus?: (message: string) => void;
	onComplete?: (result: RenderResult) => void;
	onError?: (error: string) => void;
}

export interface RenderResult {
	blob: Blob;
	filename: string;
}

export interface CSRRenderConfig {
	composition: {
		component: React.FC<any>;
		durationInFrames: number;
		fps: number;
		width: number;
		height: number;
		id: string;
	};
	inputProps: Record<string, any>;
}
