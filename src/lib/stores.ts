import { writable } from 'svelte/store';

export type RenderedVideo = {
	filename: string;
	blob: Blob;
};

export let renderedVideos = writable<RenderedVideo[]>([]);
