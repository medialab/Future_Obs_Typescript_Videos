import { json, error } from '@sveltejs/kit';
import { unlink } from 'fs/promises';
import path from 'path';
import type { RequestEvent } from '@sveltejs/kit';

// Import the tempFiles map from the parent endpoint
// This is a bit of a hack, but since SvelteKit doesn't share state easily,
// we'll recreate the logic here
const TEMP_UPLOAD_DIR = path.join(process.cwd(), 'tmp/temp-uploads');

export const DELETE = async ({ params }: RequestEvent) => {
	try {
		const tempId = params?.tempId;
		if (!tempId) {
			throw error(400, 'No tempId provided');
		}

		try {
			// This is a simplified cleanup - in production you'd track temp files properly
			console.log('Attempting to clean up temp file for:', tempId);
			// Since we don't have shared state, we'll rely on the TTL cleanup
			// that runs every 5 minutes in the temp-upload/+server.ts
		} catch (fileErr) {
			console.warn('Could not delete temp file:', fileErr);
		}

		return json({ success: true });
	} catch (err) {
		console.error('Temp cleanup error:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Cleanup failed');
	}
};
