import { json, error } from '@sveltejs/kit';
import { readdir, stat, unlink } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Point to your upload dir
const UPLOAD_DIR = path.resolve(__dirname, '../../../../../static/videos');

const TTL_MS = 24 * 60 * 60 * 1000; // 24h
const AUTH_TOKEN = process.env.CLEANUP_TOKEN || 'dev-clean';

export const POST = async ({ request }) => {
  const headerToken = request.headers.get('x-cleanup-token');
  if (headerToken !== AUTH_TOKEN) {
    throw error(401, 'Unauthorized');
  }

  const now = Date.now();
  const entries = await readdir(UPLOAD_DIR, { withFileTypes: true });

  let removed = 0;
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.match(/\.(mp4|mov|mkv|avi)$/i)) continue; // only uploaded videos

    const full = path.join(UPLOAD_DIR, entry.name);
    const st = await stat(full);
    if (now - st.mtimeMs > TTL_MS) {
      await unlink(full);
      removed++;
    }
  }

  return json({ removed });
};