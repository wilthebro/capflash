/**
 * Does a freshly transcribed caption land inside the frame at this resolution?
 *
 * Renders the shipped default box and default font size for a given video size
 * through the real server path, then measures the painted ink. This is the check
 * whose absence let the 1080x1920-only default ship: the stock box put every
 * caption 396px below the bottom of a 576x1024 frame, invisible in the preview
 * and clipped out of the export, and nothing asserted otherwise.
 *
 *   npm run dev
 *   npx tsx scripts/measure-export.ts            # 1080x1920
 *   W=576 H=1024 npx tsx scripts/measure-export.ts
 *   python scripts/measure-export.py             # measures the frame it wrote
 */
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  defaultBoxFor,
  defaultFontSizeFor,
  LINE_HEIGHT,
  resolveSegmentLayout,
  type RenderSpec,
  type Segment,
  type SegmentStyle,
  type Word,
} from '../shared/src/index';

const ROOT = path.resolve(import.meta.dirname, '..');
const FONTS_DIR = path.join(ROOT, 'client', 'src', 'assets', 'fonts');
const OUT_DIR = path.join(ROOT, 'test-assets', 'measure');
const SERVER = process.env.CAPTIONER_SERVER ?? 'http://localhost:3001';

const W = Number(process.env.W ?? 1080);
const H = Number(process.env.H ?? 1920);
const VIDEO = { width: W, height: H };

/** The box and text size a new project starts with at this resolution. */
const BOX = defaultBoxFor(VIDEO);
const FONT_SIZE = defaultFontSizeFor(VIDEO);
const FLAT = path.join(OUT_DIR, `flat-${W}x${H}.mp4`);

const STYLE: SegmentStyle = {
  fontFamily: 'Montserrat',
  fontSize: FONT_SIZE,
  fontWeight: 800,
  color: '#FFFFFF',
  outlineColor: '#000000',
  // Zero outline, so the measurement is the glyph's own ink and not a ring.
  outlineWidth: 0,
  highlightColor: '#FFD400',
};

// A word long enough to be unmistakable in the measurement, spanning the whole
// clip so any extracted frame has it on screen.
const WORDS: Word[] = [{ id: 'w0', text: 'HANDGLASS', start: 0, end: 3 }];

function run(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args);
    let out = '';
    let err = '';
    p.stdout.on('data', (d: Buffer) => (out += d.toString()));
    p.stderr.on('data', (d: Buffer) => (err += d.toString()));
    p.on('close', (code) =>
      code === 0 ? resolve(out + err) : reject(new Error(`${cmd} exited ${code}: ${err.slice(-400)}`)),
    );
  });
}

async function ensureFlat(): Promise<void> {
  try {
    await fs.access(FLAT);
    return;
  } catch {
    /* generate below */
  }
  await fs.mkdir(OUT_DIR, { recursive: true });
  console.log(`Generating flat mid-grey ${W}x${H} test video…`);
  await run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'lavfi', '-i', `color=c=0x808080:s=${W}x${H}:d=3:r=30`,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', FLAT,
  ]);
}

async function buildSpec(): Promise<RenderSpec> {
  const [regular, extraBold] = await Promise.all([
    fs.readFile(path.join(FONTS_DIR, 'Montserrat-Regular.ttf')),
    fs.readFile(path.join(FONTS_DIR, 'Montserrat-ExtraBold.ttf')),
  ]);
  // Only used for wrapping, and one long word never wraps; the export does no
  // measuring of its own.
  const measure = (t: string, st: SegmentStyle) => t.length * st.fontSize * 0.6;
  const seg: Segment = {
    id: 'seg',
    wordIds: ['w0'],
    start: 0,
    end: 3,
    mode: 'line',
    style: STYLE,
    box: BOX,
  };
  return {
    version: 1,
    renderer: 'ass',
    video: { name: 'flat.mp4', duration: 3, ...VIDEO },
    segments: [resolveSegmentLayout(seg, WORDS, (t) => measure(t, STYLE), BOX)],
    fonts: [
      { family: 'Montserrat', fileName: 'Montserrat-Regular.ttf', dataBase64: regular.toString('base64') },
      { family: 'Montserrat', fileName: 'Montserrat-ExtraBold.ttf', dataBase64: extraBold.toString('base64') },
    ],
    output: { videoCodec: 'libx264', crf: 18, preset: 'veryfast', audioCodec: 'aac', audioBitrate: '192k' },
  };
}

interface Status {
  status: string;
  error?: string;
}

async function waitForRender(id: string): Promise<Status> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const res = await fetch(`${SERVER}/api/render/${id}/status`);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const st = (await res.json()) as Status;
    if (st.status === 'done' || st.status === 'error') return st;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('render timed out');
}

async function main(): Promise<void> {
  console.log(`=== caption frame check: ${W}x${H} ===`);
  await ensureFlat();

  const boxBottom = BOX.y + BOX.maxLines * FONT_SIZE * LINE_HEIGHT;
  console.log(`default box   : x=${BOX.x} y=${BOX.y} width=${BOX.width} (bottom edge ${Math.round(boxBottom)})`);
  console.log(`default font  : ${FONT_SIZE}px  (line height ${(FONT_SIZE * LINE_HEIGHT).toFixed(1)})`);
  console.log(
    `expected ink  : top >= ${BOX.y}, bottom <= ${Math.round(boxBottom)}, left >= ${BOX.x}, right <= ${BOX.x + BOX.width}`,
  );

  const fd = new FormData();
  fd.append('spec', JSON.stringify(await buildSpec()));
  fd.append('video', new Blob([await fs.readFile(FLAT)]), 'flat.mp4');
  const res = await fetch(`${SERVER}/api/render`, { method: 'POST', body: fd });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(`render request failed: ${JSON.stringify(body)}`);
  }
  const { id } = (await res.json()) as { id: string };

  const st = await waitForRender(id);
  if (st.status === 'error') throw new Error(`render failed: ${st.error}`);

  await fs.mkdir(OUT_DIR, { recursive: true });
  const mp4 = path.join(OUT_DIR, `out-${W}x${H}.mp4`);
  const dl = await fetch(`${SERVER}/api/render/${id}/download`);
  if (!dl.ok) throw new Error(`download ${dl.status}`);
  await fs.writeFile(mp4, Buffer.from(await dl.arrayBuffer()));

  const png = path.join(OUT_DIR, `frame-${W}x${H}.png`);
  await run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-ss', '1.5', '-i', mp4, '-frames:v', '1', png]);

  console.log(`\n✓ frame: ${png}`);
  console.log(`next: FRAME=${path.basename(png)} python scripts/measure-export.py`);
}

main().catch((err) => {
  console.error(`=== check FAILED: ${err instanceof Error ? err.message : err} ===`);
  process.exit(1);
});
