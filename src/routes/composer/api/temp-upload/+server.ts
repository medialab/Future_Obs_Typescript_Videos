import { json, error } from '@sveltejs/kit';
import { writeFile, mkdir } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import type { RequestEvent } from '@sveltejs/kit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use a separate temp directory for render-time uploads
const TEMP_UPLOAD_DIR = path.join(process.cwd(), 'tmp', 'temp-uploads');

// Store temp file mappings for cleanup
const tempFiles = new Map<string, { filepath: string; expires: number }>();

// Clean up expired temp files every 5 minutes
setInterval(
	() => {
		const now = Date.now();
		for (const [id, data] of tempFiles.entries()) {
			if (now > data.expires) {
				// File cleanup will happen via TTL in the directory
				tempFiles.delete(id);
			}
		}
	},
	5 * 60 * 1000
);

async function ensureDirExistence(dir: string) {
	try {
		await mkdir(dir, { recursive: true });
	} catch (err) {
		console.error('Error creating temp upload directory:', err);
	}
}

export const POST = async ({ request }: RequestEvent) => {
	try {
		await ensureDirExistence(TEMP_UPLOAD_DIR);

		const formData = await request.formData();
		const videoFile = formData.get('video') as File;

		if (!videoFile) {
			throw error(400, 'No video file provided');
		}

		// Generate unique filename
		const fileExtension = videoFile.name.split('.').pop() || 'mp4';
		const filename = `${uuidv4()}.${fileExtension}`;
		const filepath = path.join(TEMP_UPLOAD_DIR, filename);

		// Write file to temp directory
		await writeFile(filepath, Buffer.from(await videoFile.arrayBuffer()));

		// Generate temp ID for cleanup tracking
		const tempId = uuidv4();
		const expires = Date.now() + 30 * 60 * 1000; // 30 minutes TTL

		tempFiles.set(tempId, { filepath, expires });

		// Return the temp URL that can be accessed via files API
		const tempUrl = `/composer/api/files/temp-${tempId}-${filename}`;

		return json({
			url: tempUrl,
			tempId,
			expires,
			size: videoFile.size
		});
	} catch (err) {
		console.error('Temp upload error:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, err instanceof Error ? err.message : 'Upload failed');
	}
};
