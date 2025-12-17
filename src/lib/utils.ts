import { error } from '@sveltejs/kit';
import Papa from 'papaparse';

export async function triggerBlobDownload(blob: Blob, filename: string) {
	if (blob.size === 0) {
		console.error('ERROR: Blob is empty!');
		return;
	}

	// Proceed with download
	const blobUrl = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = blobUrl;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
}

export function parseTimeToSeconds(timeString: string): number {
	if (!timeString) throw error(400, 'Time string is required');

	const parts = timeString.split(':').map(Number);
	if (parts.length !== 3) {
		console.warn(`Invalid time format: ${timeString}. Expected HH:MM:SS`);
		return 0;
	}
	const [hours, minutes, seconds] = parts;

	const totalSeconds = hours * 3600 + minutes * 60 + seconds;
	return totalSeconds;
}
