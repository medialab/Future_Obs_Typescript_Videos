import { error } from '@sveltejs/kit';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { RequestEvent } from '@sveltejs/kit';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_VIDEOS_DIR = path.join(process.cwd(), 'tmp/uploads');
const RENDERED_VIDEOS_DIR = path.join(process.cwd(), 'tmp/renders');
const ASSET_EXT_RE = /\.(mp4|mov|mkv|avi)$/i;

export const GET = async ({ params }: RequestEvent) => {
	if (!params.slug) {
		throw error(400, 'No slug provided');
	}
	try {
		// Try rendered videos first, then uploads
		let filepath = path.join(RENDERED_VIDEOS_DIR, params.slug);

		if (!existsSync(filepath)) {
			filepath = path.join(TMP_VIDEOS_DIR, params.slug);
		}

		// Security check - ensure file is in one of our allowed directories
		if (!filepath.startsWith(TMP_VIDEOS_DIR) && !filepath.startsWith(RENDERED_VIDEOS_DIR)) {
			throw error(400, 'Invalid file path');
		}

		if (!existsSync(filepath) || !ASSET_EXT_RE.test(params.slug)) {
			throw error(404, 'File not found');
		}

		console.log('Files endpoint called:', {
			slug: params.slug,
			filepath,
			tmpDir: TMP_VIDEOS_DIR,
			fileExists: existsSync(filepath)
		});

		const buffer = await readFile(filepath);
		const fileStats = await stat(filepath);

		const ext = params.slug.split('.').pop()?.toLowerCase();
		const mimeTypes: Record<string, string> = {
			mp4: 'video/mp4',
			mov: 'video/quicktime',
			mkv: 'video/x-matroska',
			avi: 'video/x-msvideo'
		};

		return new Response(buffer, {
			headers: {
				'Content-Type': mimeTypes[ext || 'mp4'] || 'video/mp4',
				'Content-Length': fileStats.size.toString(),
				'Cache-Control': 'public, max-age=300',
				'Access-Control-Allow-Origin': '*'
			}
		});
	} catch (err) {
		console.error('Error serving file:', {
			slug: params.slug,
			error: err instanceof Error ? err.message : String(err),
			stack: err instanceof Error ? err.stack : undefined
		});
		throw error(404, 'File not found');
	}
};
