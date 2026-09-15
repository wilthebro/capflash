import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface FfmpegInfo {
  found: boolean;
  version: string;
  libass: boolean;
  whisper: boolean;
}

export const FFMPEG_BIN = process.env.FFMPEG_BIN ?? 'ffmpeg';

let cached: FfmpegInfo | null = null;

/** Probe the ffmpeg binary once per process. */
export async function probeFfmpeg(): Promise<FfmpegInfo> {
  if (cached) return cached;
  try {
    // Probe the binary that will actually be spawned, not a hardcoded 'ffmpeg':
    // with FFMPEG_BIN set the two used to disagree, so health could report a
    // working ffmpeg while renders ran something else (or nothing).
    const { stdout } = await execFileAsync(FFMPEG_BIN, ['-version'], { timeout: 10_000 });
    cached = {
      found: true,
      version: stdout.split('\n')[0] ?? '',
      libass: stdout.includes('--enable-libass'),
      whisper: stdout.includes('--enable-whisper'),
    };
  } catch {
    cached = { found: false, version: '', libass: false, whisper: false };
  }
  return cached;
}

/**
 * Escape a Windows path for use inside an ffmpeg filter argument: forward
 * slashes as separators, backslash-escape the drive-letter colon, commas,
 * single quotes and backslashes (ffmpeg filter syntax, not shell quoting —
 * we spawn with an args array so no shell layer exists).
 */
export function escapeFilterPath(p: string): string {
  return p
    .replace(/\\/g, '/')
    .replace(/([:',\\])/g, '\\$1');
}

/** Build the -vf filter value: ass=…:fontsdir=… (each path single-quoted). */
export function buildAssFilter(assPath: string, fontsDir?: string): string {
  const parts = [`ass='${escapeFilterPath(assPath)}'`];
  if (fontsDir) parts.push(`fontsdir='${escapeFilterPath(fontsDir)}'`);
  return parts.join(':');
}
