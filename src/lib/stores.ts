import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { loadFiles, saveFiles, loadCsvFile, saveCsvFile } from './fileStorage';

export type RenderedVideo = {
	filename: string;
	blob: Blob | undefined;
};

export let renderedVideo = writable<RenderedVideo[]>([{filename: '', blob: undefined}]);
export let csvVideoFilenames = writable<string[]>([]);
export let uploadedVideoFiles = writable<File[]>([]);
export let missingFilenames = writable<string[]>([]);
export let emptyCellsInCsv = writable<string[]>([]);
export let uploadedCsvFile = writable<File | undefined>(undefined);
export let unknownFiles = writable<string[]>([]);

// Sync stores with IndexedDB on browser
if (browser) {
	// Load files from IndexedDB on initialization
	loadFiles().then(files => {
		if (files.length > 0) {
			uploadedVideoFiles.set(files);
		}
	}).catch(err => {
		console.error('Error loading files from IndexedDB:', err);
	});

	loadCsvFile().then(file => {
		if (file) {
			uploadedCsvFile.set(file);
		}
	}).catch(err => {
		console.error('Error loading CSV from IndexedDB:', err);
	});

	// Auto-save when files change
	uploadedVideoFiles.subscribe(files => {
		saveFiles(files).catch(err => {
			console.error('Error saving files to IndexedDB:', err);
		});
	});

	uploadedCsvFile.subscribe(file => {
		saveCsvFile(file).catch(err => {
			console.error('Error saving CSV to IndexedDB:', err);
		});
	});
}