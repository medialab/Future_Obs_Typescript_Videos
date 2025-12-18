import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { loadFiles, saveFiles, loadCsvFile, saveCsvFile } from './fileStorage';
import type { RenderedVideo } from './types';

export let renderedVideo = writable<RenderedVideo[]>([{ filename: '', blob: undefined }]);
export let requiredFilenames = writable<string[]>([]);
export let uploadedVideoFiles = writable<File[]>([]);
export let missingFilenames = writable<string[]>([]);
export let uploadedCsvFile = writable<File | undefined>(undefined);
export let unknownFiles = writable<string[]>([]);
export let currentFrame = writable<number>(0);
export let timelineDurationInFrames = writable<number>(0);
export let isStorageSaving = writable<boolean>(false);

if (browser) {
	loadFiles()
		.then((files) => {
			if (files.length > 0) {
				uploadedVideoFiles.set(files);
			}
		})
		.catch((err) => {
			console.error('Error loading files from IndexedDB:', err);
		});

	loadCsvFile()
		.then((file) => {
			if (file) {
				uploadedCsvFile.set(file);
			}
		})
		.then(() => {
			isStorageSaving.set(false);
		})
		.catch((err) => {
			console.error('Error loading CSV from IndexedDB:', err);
		});

	uploadedVideoFiles.subscribe((files) => {
		isStorageSaving.set(true);
		saveFiles(files)
			.catch((err) => {
				isStorageSaving.set(false);
				console.error('Error saving files to IndexedDB:', err);
			})
			.then(() => {
				isStorageSaving.set(false);
			});
	});

	uploadedCsvFile.subscribe((file) => {
		isStorageSaving.set(true);
		saveCsvFile(file)
			.catch((err) => {
				console.error('Error saving CSV to IndexedDB:', err);
			})
			.then(() => {
				isStorageSaving.set(false);
			});
	});
}
