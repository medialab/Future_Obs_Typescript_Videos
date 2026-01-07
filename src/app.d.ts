// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

// Asset module declarations
declare module '*.png' {
	const src: string;
	export default src;
}

declare module '*.svg' {
	const src: string;
	export default src;
}

// SvelteKit $lib asset aliases
declare module '$lib/*' {
	const src: string;
	export default src;
}

export {};
