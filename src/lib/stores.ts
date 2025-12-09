import { writable } from 'svelte/store';

export type RenderedVideo = {
	filename: string;
	blob: Blob;
};

export let renderedVideos = writable<RenderedVideo[]>([]);
export let csvVideoFilenames = writable<string[]>([]);
export let uploadedVideoFiles = writable<File[]>([]);
export let missingFilenames = writable<string[]>([]);
export let emptyCellsInCsv = writable<string[]>([]);