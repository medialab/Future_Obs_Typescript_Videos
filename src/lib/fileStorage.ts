// IndexedDB utility for storing File objects persistently
import type { RenderedVideo } from './types';

const DB_NAME = 'videoFilesDB';
const DB_VERSION = 2; // Increment from 1 to 2 to trigger upgrade
const STORE_NAME = 'uploadedFiles';
const CSV_STORE_NAME = 'csvFile';
const RENDERED_VIDEO_STORE_NAME = 'renderedVideo';

let db: IDBDatabase | null = null;

export async function initDB(): Promise<IDBDatabase> {
	if (db) return db;

	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => {
			db = request.result;
			resolve(db);
		};

		request.onupgradeneeded = (event) => {
			const database = (event.target as IDBOpenDBRequest).result;

			// Store for video files
			if (!database.objectStoreNames.contains(STORE_NAME)) {
				database.createObjectStore(STORE_NAME, { keyPath: 'name' });
			}

			// Store for CSV file
			if (!database.objectStoreNames.contains(CSV_STORE_NAME)) {
				database.createObjectStore(CSV_STORE_NAME, { keyPath: 'id' });
			}

			// Store for rendered video
			if (!database.objectStoreNames.contains(RENDERED_VIDEO_STORE_NAME)) {
				database.createObjectStore(RENDERED_VIDEO_STORE_NAME, { keyPath: 'filename' });
			}
		};
	});
}

export async function clearFile(filename: string): Promise<void> {
	console.log('[clearFile] Starting to clear file:', filename);
	const database = await initDB();
	console.log(
		'[clearFile] Database initialized, available stores:',
		Array.from(database.objectStoreNames)
	);

	// Search through uploadedFiles store (keyPath is 'name')
	console.log('[clearFile] Searching in uploadedFiles store...');
	try {
		const videoTransaction = database.transaction([STORE_NAME], 'readwrite');
		const videoStore = videoTransaction.objectStore(STORE_NAME);

		await new Promise<void>((resolve, reject) => {
			const request = videoStore.delete(filename);
			request.onsuccess = () => {
				console.log('[clearFile] Successfully deleted from uploadedFiles store:', filename);
				resolve();
			};
			request.onerror = () => {
				console.error('[clearFile] Error deleting from uploadedFiles store:', request.error);
				reject(request.error);
			};
		});
	} catch (error) {
		console.log('[clearFile] File not found in uploadedFiles store or error occurred:', error);
		// File not found in this store, continue searching
	}

	// Search through csvFile store (keyPath is 'id', but has 'name' property)
	console.log('[clearFile] Searching in csvFile store...');
	try {
		const csvTransaction = database.transaction([CSV_STORE_NAME], 'readwrite');
		const csvStore = csvTransaction.objectStore(CSV_STORE_NAME);

		await new Promise<void>((resolve, reject) => {
			const getRequest = csvStore.get('csv');
			getRequest.onsuccess = () => {
				const result = getRequest.result;
				console.log('[clearFile] CSV file in store:', result ? result.name : 'not found');
				if (result && result.name === filename) {
					console.log('[clearFile] CSV filename matches, deleting...');
					const deleteRequest = csvStore.delete('csv');
					deleteRequest.onsuccess = () => {
						console.log('[clearFile] Successfully deleted CSV file');
						resolve();
					};
					deleteRequest.onerror = () => {
						console.error('[clearFile] Error deleting CSV file:', deleteRequest.error);
						reject(deleteRequest.error);
					};
				} else {
					console.log('[clearFile] CSV filename does not match or not found');
					resolve(); // File not found, but that's okay
				}
			};
			getRequest.onerror = () => {
				console.error('[clearFile] Error getting CSV file:', getRequest.error);
				reject(getRequest.error);
			};
		});
	} catch (error) {
		console.log('[clearFile] File not found in csvFile store or error occurred:', error);
		// File not found in this store, continue searching
	}

	// Search through renderedVideo store if it exists
	const hasRenderedStore = database.objectStoreNames.contains(RENDERED_VIDEO_STORE_NAME);
	console.log('[clearFile] Rendered video store exists:', hasRenderedStore);

	if (hasRenderedStore) {
		console.log('[clearFile] Searching in renderedVideo store...');
		try {
			const renderedTransaction = database.transaction([RENDERED_VIDEO_STORE_NAME], 'readwrite');
			const renderedStore = renderedTransaction.objectStore(RENDERED_VIDEO_STORE_NAME);

			await new Promise<void>((resolve, reject) => {
				const cursorRequest = renderedStore.openCursor();
				cursorRequest.onsuccess = (event) => {
					const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
					if (cursor) {
						const video = cursor.value as RenderedVideo;
						console.log(
							'[clearFile] Checking rendered video:',
							video.filename,
							'against:',
							filename
						);
						if (video.filename === filename) {
							console.log('[clearFile] Filename matches, deleting rendered video...');
							cursor.delete();
							console.log('[clearFile] Successfully deleted rendered video');
							resolve();
						} else {
							console.log('[clearFile] Filename does not match, continuing cursor...');
							cursor.continue();
						}
					} else {
						console.log('[clearFile] No more rendered videos to check');
						resolve(); // No matching file found, that's okay
					}
				};
				cursorRequest.onerror = () => {
					console.error(
						'[clearFile] Error opening cursor in renderedVideo store:',
						cursorRequest.error
					);
					reject(cursorRequest.error);
				};
			});
		} catch (error) {
			console.log('[clearFile] File not found in renderedVideo store or error occurred:', error);
			// File not found in this store, that's okay
		}
	} else {
		console.log('[clearFile] Rendered video store does not exist, skipping');
	}

	console.log('[clearFile] Finished clearing file:', filename);
}

// Save array of File objects to IndexedDB
export async function saveFiles(files: File[]): Promise<void> {
	console.log('[saveFiles] Starting to save files:', files);

	const database = await initDB();
	const transaction = database.transaction([STORE_NAME], 'readwrite');
	const store = transaction.objectStore(STORE_NAME);

	store.clear();

	const savePromises = files.map((file) => {
		return new Promise<void>((resolve, reject) => {
			const request = store.put({
				name: file.name,
				file: file,
				size: file.size,
				type: file.type,
				lastModified: file.lastModified
			});
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	});

	console.log('[saveFiles] Saving files:', savePromises);

	await Promise.all(savePromises);
}

export async function loadFiles(): Promise<File[]> {
	console.log('[loadFiles] Starting to load files');
	const database = await initDB();
	const transaction = database.transaction([STORE_NAME], 'readonly');
	const store = transaction.objectStore(STORE_NAME);

	return new Promise((resolve, reject) => {
		const request = store.getAll();
		request.onsuccess = () => {
			const files = request.result.map((item: any) => item.file as File);
			resolve(files);
		};
		request.onerror = () => reject(request.error);
	});
}

// Clear all files from IndexedDB
export async function clearFiles(): Promise<void> {
	console.log('[clearFiles] Starting to clear files');
	const database = await initDB();
	const transaction = database.transaction([STORE_NAME], 'readwrite');
	const store = transaction.objectStore(STORE_NAME);

	return new Promise((resolve, reject) => {
		const request = store.clear();
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

export async function storeRenderedVideo(video: RenderedVideo): Promise<void> {
	console.log('[storeRenderedVideo] Starting to store rendered video:', video);
	const database = await initDB();

	// Check if store exists, if not, we need to upgrade
	if (!database.objectStoreNames.contains(RENDERED_VIDEO_STORE_NAME)) {
		// Close and reopen with higher version to trigger upgrade
		db = null; // Reset cached db
		const upgradedDb = await initDB();
		// If still doesn't exist after upgrade, throw error
		if (!upgradedDb.objectStoreNames.contains(RENDERED_VIDEO_STORE_NAME)) {
			throw new Error('Rendered video store not available. Please refresh the page.');
		}
	}

	const transaction = database.transaction([RENDERED_VIDEO_STORE_NAME], 'readwrite');
	const store = transaction.objectStore(RENDERED_VIDEO_STORE_NAME);

	return new Promise((resolve, reject) => {
		const request = store.put(video);
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

// Save CSV file to IndexedDB
export async function saveCsvFile(file: File | undefined): Promise<void> {
	console.log('[saveCsvFile] Starting to save CSV file:', file);
	const database = await initDB();
	const transaction = database.transaction([CSV_STORE_NAME], 'readwrite');
	const store = transaction.objectStore(CSV_STORE_NAME);

	if (file) {
		return new Promise((resolve, reject) => {
			const request = store.put({
				id: 'csv',
				file: file,
				name: file.name,
				size: file.size,
				type: file.type
			});
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	} else {
		return new Promise((resolve, reject) => {
			const request = store.delete('csv');
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}
}

// Load CSV file from IndexedDB
export async function loadCsvFile(): Promise<File | undefined> {
	console.log('[loadCsvFile] Starting to load CSV file');
	const database = await initDB();
	const transaction = database.transaction([CSV_STORE_NAME], 'readonly');
	const store = transaction.objectStore(CSV_STORE_NAME);

	return new Promise((resolve, reject) => {
		const request = store.get('csv');
		request.onsuccess = () => {
			const result = request.result;
			resolve(result ? (result.file as File) : undefined);
		};
		request.onerror = () => reject(request.error);
	});
}

// Load rendered video from IndexedDB
export async function loadRenderedVideo(): Promise<RenderedVideo | undefined> {
	console.log('[loadRenderedVideo] Starting to load rendered video');
	const database = await initDB();

	// Check if the store exists
	if (!database.objectStoreNames.contains(RENDERED_VIDEO_STORE_NAME)) {
		return undefined;
	}

	const transaction = database.transaction([RENDERED_VIDEO_STORE_NAME], 'readonly');
	const store = transaction.objectStore(RENDERED_VIDEO_STORE_NAME);

	return new Promise((resolve, reject) => {
		const request = store.getAll();
		request.onsuccess = () => {
			const results = request.result;
			// Return the first video if any exist
			resolve(results && results.length > 0 ? (results[0] as RenderedVideo) : undefined);
		};
		request.onerror = () => reject(request.error);
	});
}
