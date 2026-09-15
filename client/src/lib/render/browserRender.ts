import { generateAss, type RenderSpec } from '@captioner/shared';
import { resolveFonts } from './fontFiles';

/**
 * Self-hosted ffmpeg.wasm, copied out of node_modules by vite.config.ts for the
 * same reason ONNX Runtime is: the library's defaults point at a CDN, and the
 * core's worker has to be same-origin with the page.
 */
const CORE_BASE = '/ffmpeg';
const FONTS_DIR = '/fonts';
const ASS_PATH = '/captions.ass';
const INPUT_DIR = '/input';
const OUTPUT_PATH = '/output.mp4';

export interface BrowserRenderResult {
  blob: Blob;
  /** Families with no font file available, rendered in the bundled face instead. */
  substitutedFonts: string[];
}

type ProgressFn = (fraction: number) => void;

let instance: Promise<import('@ffmpeg/ffmpeg').FFmpeg> | null = null;
let onProgress: ProgressFn | null = null;
let loadedOnce = false;

/** False until the ~32 MB core has been fetched, so the UI can say so up front. */
export function isRenderEngineReady(): boolean {
  return loadedOnce;
}

/** The worker is torn down on cancel; the next run loads a fresh one. */
async function getFfmpeg(): Promise<import('@ffmpeg/ffmpeg').FFmpeg> {
  if (!instance) {
    instance = (async () => {
      // Imported lazily so the wrapper is not in the initial bundle, the same
      // treatment the Whisper worker gets for @huggingface/transformers.
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const ffmpeg = new FFmpeg();
      ffmpeg.on('progress', ({ progress }) => onProgress?.(Math.min(1, Math.max(0, progress))));
      const origin = window.location.origin;
      await ffmpeg.load({
        coreURL: `${origin}${CORE_BASE}/ffmpeg-core.js`,
        wasmURL: `${origin}${CORE_BASE}/ffmpeg-core.wasm`,
        // Must be absolute: the library resolves it against import.meta.url,
        // which inside a bundle is a build-time file:/// path.
        classWorkerURL: `${origin}${CORE_BASE}/worker.js`,
      });
      loadedOnce = true;
      return ffmpeg;
    })().catch((err) => {
      // Let a later attempt retry rather than caching the failure forever.
      instance = null;
      throw err;
    });
  }
  return instance;
}

/** Stop a run in flight. The core dies with it and is re-loaded next time. */
export async function cancelBrowserRender(): Promise<void> {
  const pending = instance;
  instance = null;
  onProgress = null;
  if (pending) {
    try {
      (await pending).terminate();
    } catch {
      // already gone
    }
  }
}

export async function renderInBrowser(
  spec: RenderSpec,
  videoFile: File,
  onFraction?: ProgressFn,
): Promise<BrowserRenderResult> {
  const ffmpeg = await getFfmpeg();
  onProgress = onFraction ?? null;

  const { spec: renderSpec, files, substituted } = await resolveFonts(spec);

  // Fonts must be real files: wasm libass has no fontconfig, so a face it
  // cannot find draws nothing at all rather than falling back.
  await ffmpeg.createDir(FONTS_DIR);
  for (const font of files) {
    await ffmpeg.writeFile(`${FONTS_DIR}/${font.fileName}`, font.bytes);
  }
  await ffmpeg.writeFile(ASS_PATH, generateAss(renderSpec));

  // WORKERFS reads the File straight from its Blob, so the video is never
  // copied into the wasm heap — which is what makes a large input possible.
  await ffmpeg.createDir(INPUT_DIR);
  await ffmpeg.mount('WORKERFS' as never, { files: [videoFile] }, INPUT_DIR);
  const inputPath = `${INPUT_DIR}/${videoFile.name}`;

  try {
    // The same argument list the server renderer uses
    // (server/src/lib/renderers/assRenderer.ts), minus the progress pipe the
    // browser gets from the library's event instead.
    const code = await ffmpeg.exec([
      '-y',
      '-hide_banner',
      '-nostdin',
      '-i', inputPath,
      '-map', '0:v',
      '-map', '0:a?',
      '-vf', `ass='${ASS_PATH}':fontsdir='${FONTS_DIR}'`,
      '-c:v', spec.output.videoCodec,
      '-preset', spec.output.preset,
      '-crf', String(spec.output.crf),
      '-pix_fmt', 'yuv420p',
      '-c:a', spec.output.audioCodec,
      '-b:a', spec.output.audioBitrate,
      '-movflags', '+faststart',
      OUTPUT_PATH,
    ]);

    if (code !== 0) throw new Error(`ffmpeg exited with code ${code}`);

    const data = await ffmpeg.readFile(OUTPUT_PATH);
    if (typeof data === 'string') throw new Error('ffmpeg returned text where a video was expected');
    // Copy out of the wasm heap before anything is deleted.
    const bytes = new Uint8Array(data);

    onProgress?.(1);
    return { blob: new Blob([bytes], { type: 'video/mp4' }), substitutedFonts: substituted };
  } finally {
    onProgress = null;
    // Clear the VFS so a second export cannot pick up the first one's files.
    for (const path of [OUTPUT_PATH, ASS_PATH]) {
      await ffmpeg.deleteFile(path).catch(() => {});
    }
    for (const font of files) {
      await ffmpeg.deleteFile(`${FONTS_DIR}/${font.fileName}`).catch(() => {});
    }
    await ffmpeg.unmount(INPUT_DIR).catch(() => {});
  }
}
