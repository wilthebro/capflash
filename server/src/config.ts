import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const PORT = Number(process.env.PORT ?? 3001);
export const DATA_DIR = process.env.DATA_DIR ?? path.resolve(here, '../data');
export const JOBS_DIR = path.join(DATA_DIR, 'jobs');
export const MAX_VIDEO_BYTES = 8 * 1024 * 1024 * 1024; // 8 GB
