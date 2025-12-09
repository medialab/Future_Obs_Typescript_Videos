// IndexedDB utility for storing File objects persistently

const DB_NAME = 'videoFilesDB';
const DB_VERSION = 1;
const STORE_NAME = 'uploadedFiles';
const CSV_STORE_NAME = 'csvFile';

let db: IDBDatabase | null = null;

// Initialize the database
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
		};
	});
}

export async function clearFile(filename: string): Promise<void> {
	const database = await initDB();
	const transaction = database.transaction([STORE_NAME], 'readwrite');
	const store = transaction.objectStore(STORE_NAME);

	return new Promise((resolve, reject) => {
		const request = store.delete(filename);
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

// Save array of File objects to IndexedDB
export async function saveFiles(files: File[]): Promise<void> {
	const database = await initDB();
	const transaction = database.transaction([STORE_NAME], 'readwrite');
	const store = transaction.objectStore(STORE_NAME);

	// Clear existing files first
	await store.clear();

	// Save new files
	const savePromises = files.map(file => {
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

	await Promise.all(savePromises);
}

// Load all File objects from IndexedDB
export async function loadFiles(): Promise<File[]> {
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
	const database = await initDB();
	const transaction = database.transaction([STORE_NAME], 'readwrite');
	const store = transaction.objectStore(STORE_NAME);
	
	return new Promise((resolve, reject) => {
		const request = store.clear();
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

// Save CSV file to IndexedDB
export async function saveCsvFile(file: File | undefined): Promise<void> {
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
	const database = await initDB();
	const transaction = database.transaction([CSV_STORE_NAME], 'readonly');
	const store = transaction.objectStore(CSV_STORE_NAME);

	return new Promise((resolve, reject) => {
		const request = store.get('csv');
		request.onsuccess = () => {
			const result = request.result;
			resolve(result ? result.file as File : undefined);
		};
		request.onerror = () => reject(request.error);
	});
}

// Clear all data (both files and CSV)
export async function clearAllData(): Promise<void> {
	await clearFiles();
	const database = await initDB();
	const transaction = database.transaction([CSV_STORE_NAME], 'readwrite');
	const store = transaction.objectStore(CSV_STORE_NAME);
	
	return new Promise((resolve, reject) => {
		const request = store.clear();
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}
