// Minimal typings/augmentation for etro to allow usage in TS without ts-nocheck

// Global namespace so `etro.Movie` works in type positions
export as namespace etro;

declare namespace etro {
	class Movie {
		constructor(options: MovieOptions);
		layers: any[];
		refresh(): Promise<void>;
		record(opts: any): Promise<Blob>;
		play(): Promise<void>;
	}

	namespace layer {
		class Text {
			constructor(opts: any);
		}
		class Image {
			constructor(opts: any);
		}
		class Video {
			constructor(opts: any);
		}
	}

	function parseColor(input: any): any;
	type Color = any;

	interface MovieOptions {
		canvas: HTMLCanvasElement | OffscreenCanvas;
		[key: string]: any;
	}
}

// Module export so `import etro from 'etro'` continues to work
declare module 'etro' {
	export = etro;
}
