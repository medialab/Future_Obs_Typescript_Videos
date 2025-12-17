import { json } from '@sveltejs/kit';
import { writeFile, mkdir } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { error } from '@sveltejs/kit';
import path from 'path';
import { fileURLToPath } from 'url';
import type { RequestEvent } from '@sveltejs/kit';
import type { VideoData } from '$lib/types';
import { readdir, stat, unlink } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ASSET_EXT_RE = /\.(mp4|mov|mkv|avi)$/i;
const TTL_MS = 25 * 60 * 1000;

const TMP_VIDEOS_DIR = path.join(process.cwd(), 'tmp/uploads');

async function ensureDirExistence(dir: string) {
	try {
		await mkdir(dir, { recursive: true });
	} catch (err) {
		console.error('Error creating temp videos directory:', err);
	}
}

async function cleanupOldVideos(dir: string) {
	try {
		const entries = await readdir(dir, {
			withFileTypes: true
		});
		const now = Date.now();

		for (const entry of entries) {
			if (!entry.isFile() || !ASSET_EXT_RE.test(entry.name)) continue;
			const full = path.join(dir, entry.name);
			const st = await stat(full);
			if (now - st.mtimeMs > TTL_MS) {
				await unlink(full);
			}
		}
		console.log('🧹 Cleanup completed');
	} catch (err) {
		console.warn('Cleanup skipped:', err);
	}
}

export const POST = async ({ request }: RequestEvent) => {
	try {
		await ensureDirExistence(TMP_VIDEOS_DIR as string);
		await cleanupOldVideos(TMP_VIDEOS_DIR as string);

		const formData = await request.formData();

		const videosJson = formData.get('videos') as string;

		if (!videosJson) {
			throw error(400, 'No videos data provided');
		}

		const videos: VideoData[] = JSON.parse(videosJson);
		const videoFiles = formData.getAll('files') as File[];

		if (videoFiles.length === 0) {
			throw error(400, 'No video files provided');
		}

		const fileMap = new Map<string, File>();
		videoFiles.forEach((file) => {
			const nameWithoutExt = file.name.replace(/\.(mp4|mov|avi|mkv)$/i, '');
			fileMap.set(nameWithoutExt, file);
		});

		const updatedVideos = await Promise.all(
			videos.map(async (video) => {
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

				const fileExtension = matchingFile.name.split('.').pop() || 'mp4';
				const filename = `${uuidv4()}-${clipName}.${fileExtension}`; //temp crypt
				const filepath = path.join(TMP_VIDEOS_DIR, filename);

				await writeFile(filepath, Buffer.from(await matchingFile.arrayBuffer()));

				// Verify file exists and is readable before proceeding
				let retries = 5;
				while (retries > 0) {
					try {
						const fileStats = await stat(filepath);
						if (fileStats.size > 0) {
							break; // File exists and has content, proceed
						}
					} catch (err) {
						retries--;
						if (retries === 0) {
							throw new Error(`File ${filename} was not accessible after write`);
						}
						await new Promise((resolve) => setTimeout(resolve, 100)); // Wait 100ms and retry
					}
				}

				return {
					...video,
					videoSrc: `composer/api/files/${filename}`,
					videoSrcPath: filepath
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
