import { json } from '@sveltejs/kit';
import { writeFile, mkdir } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { error } from '@sveltejs/kit';
import path from 'path';
import { fileURLToPath } from 'url';
import type { RequestEvent } from '@sveltejs/kit';
import type { VideoData } from '$lib/remotion/SingleVideoComp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ASSET_EXT_RE = /\.(mp4|mov|mkv|avi)$/i;
const TTL_MS = 25 * 60 * 1000; // 25 minutes

// Save to project-root/static/videos (not src/static)
const STATIC_VIDEOS_DIR = path.resolve(__dirname, '../../../../../static/videos');

async function ensureStaticVideosDir() {
	try {
		await mkdir(STATIC_VIDEOS_DIR, { recursive: true });
	} catch (err) {
		console.error('Error creating static videos directory:', err);
	}
}

async function cleanupOldVideos() {
	try {
		const entries = await (await import('fs/promises')).readdir(STATIC_VIDEOS_DIR, {
			withFileTypes: true
		});
		const now = Date.now();
		for (const entry of entries) {
			if (!entry.isFile()) continue;
			if (!ASSET_EXT_RE.test(entry.name)) continue;
			const full = path.join(STATIC_VIDEOS_DIR, entry.name);
			const st = await (await import('fs/promises')).stat(full);
			if (now - st.mtimeMs > TTL_MS) {
				await (await import('fs/promises')).unlink(full);
			}
		}
        console.log('🧹 Cleanup completed');
	} catch (err) {
		console.warn('Cleanup skipped:', err);
	}
}

export const POST = async ({ request }: RequestEvent) => {
	try {
		await ensureStaticVideosDir();
		await cleanupOldVideos();

		const formData = await request.formData();
		
		// Get the videos array from JSON
		const videosJson = formData.get('videos') as string;

		if (!videosJson) {
			throw error(400, 'No videos data provided');
		}
		
		const videos: VideoData[] = JSON.parse(videosJson);
		
		// Get all video files
		const videoFiles = formData.getAll('files') as File[];
		
		if (videoFiles.length === 0) {
			throw error(400, 'No video files provided');
		}
		
		// Create a map of ClipName to File for easy lookup
		const fileMap = new Map<string, File>();
		videoFiles.forEach(file => {
			// Match by filename (remove extension)
			const nameWithoutExt = file.name.replace(/\.(mp4|mov|avi|mkv)$/i, '');
			fileMap.set(nameWithoutExt, file);
		});
		
		// Process each video: save file and update path
		const updatedVideos = await Promise.all(
			videos.map(async (video) => {
				// Try to find matching file by ClipName
				const clipName = (video as any).ClipName?.trim();
				if (!clipName) {
					console.warn('Video missing ClipName, skipping:', video);
					return video;
				}
				
				const matchingFile = fileMap.get(clipName);
				if (!matchingFile) {
					console.warn(`No matching file found for ClipName: ${clipName}`);
					return video;
				}
				
				// Generate unique filename
				const fileExtension = matchingFile.name.split('.').pop() || 'mp4';
				const filename = `${uuidv4()}-${clipName}.${fileExtension}`;
				const filepath = path.join(STATIC_VIDEOS_DIR, filename);
				
				// Save file to static/videos directory
				const arrayBuffer = await matchingFile.arrayBuffer();
				await writeFile(filepath, Buffer.from(arrayBuffer));
				
				return {
					...video,
					videoSrc: `/videos/${filename}`, // HTTP URL for client-side
					videoSrcPath: filepath  // Absolute file path for server-side rendering
				};
			})
		);
		
		return json({ videos: updatedVideos });
	} catch (err) {
		console.error('Upload error:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, err instanceof Error ? err.message : 'Unknown error');
	}
};