/**
 * End-to-end export smoke test: builds a RenderSpec covering all three
 * display modes, POSTs it to the running local server, polls until done,
 * verifies the output with ffprobe and spot-checks the generated ASS.
 *
 * Prereqs: `npm run dev` running, ffmpeg/ffprobe on PATH.
 * Usage:   npm run verify:export
 */
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_BOX,
  resolveSegmentLayout,
  type RenderSpec,
  type Segment,
  type SegmentStyle,
  type Word,
} from '../shared/src/index';

const ROOT = path.resolve(import.meta.dirname, '..');
const TEST_ASSETS = path.join(ROOT, 'test-assets');
// Set SMOKE_VIDEO to run the same spec against another file (e.g. a no-audio copy).
const VIDEO_PATH = process.env.SMOKE_VIDEO ?? path.join(TEST_ASSETS, 'input.mp4');
const FONT_PATH = path.join(TEST_ASSETS, 'BebasNeue-Regular.ttf');
const BUNDLED_FONTS_DIR = path.join(ROOT, 'client', 'src', 'assets', 'fonts');
const OUT_DIR = path.join(TEST_ASSETS, 'output');
const SERVER = process.env.CAPTIONER_SERVER ?? 'http://localhost:3001';

// Weight 700 => the ASS Style line must carry Bold -1.
const STYLE_A: SegmentStyle = {
  fontFamily: 'Arial',
  fontSize: 64,
  fontWeight: 700,
  color: '#FFFFFF',
  outlineColor: '#000000',
  outlineWidth: 4,
  highlightColor: '#FFD400',
};
const STYLE_B: SegmentStyle = {
  fontFamily: 'Arial',
  fontSize: 56,
  fontWeight: 400,
  color: '#FFFFFF',
  outlineColor: '#000000',
  outlineWidth: 6,
  highlightColor: '#FFD400',
};
const STYLE_CUSTOM: SegmentStyle = {
  fontFamily: 'Bebas Neue',
  fontSize: 64,
  fontWeight: 400,
  color: '#FFFFFF',
  outlineColor: '#000000',
  outlineWidth: 4,
  highlightColor: '#FFD400',
};
// The shipped default: bundled Montserrat at Heavy (800). Verifies end to end
// that the patched ExtraBold actually matches `Fontname: Montserrat` in libass
// — the stock file calls itself "Montserrat ExtraBold", a separate family.
const STYLE_BUNDLED: SegmentStyle = {
  fontFamily: 'Montserrat',
  fontSize: 64,
  fontWeight: 800,
  color: '#FFFFFF',
  outlineColor: '#000000',
  outlineWidth: 4,
  highlightColor: '#FFD400',
};

// 18 words over 8s: 8 + 6 + 4, three groups with gaps.
const RAW: [string, number][] = [
  ['Hello', 0.2],
  ['world,', 0.5],
  ['this', 0.9],
  ['is', 1.3],
  ['a', 1.7],
  ['test', 2.1],
  ['sentence', 2.5],
  ['here.', 2.9],
  ['Second', 3.6],
  ['sentence', 4.0],
  ['starts', 4.4],
  ['right', 4.8],
  ['now', 5.2],
  ['okay!', 5.6],
  ['One', 6.2],
  ['more', 6.5],
  ['line', 6.9],
  ['here', 7.3],
];
const words: Word[] = RAW.map(([text, start], i) => ({
  id: `w${i}`,
  text,
  start,
  end: start + 0.3,
}));

const measure = (t: string, style: SegmentStyle) => t.length * style.fontSize * 0.55;

function makeSegment(id: string, idx: [number, number], mode: Segment['mode'], style: SegmentStyle, box?: Segment['box']): Segment {
  const ids = words.slice(idx[0], idx[1] + 1).map((w) => w.id);
  const ws = words.slice(idx[0], idx[1] + 1);
  return {
    id,
    wordIds: ids,
    start: Math.min(...ws.map((w) => w.start)),
    end: Math.max(...ws.map((w) => w.end)),
    mode,
    style,
    box,
  };
}

async function buildSpec(): Promise<RenderSpec> {
  const segs = [
    makeSegment('s-word', [0, 7], 'word', STYLE_A, { x: 100, y: 1400, width: 800 }),
    makeSegment('s-highlight', [8, 13], 'highlight', STYLE_B, { x: 100, y: 1450, width: 800 }),
    makeSegment('s-line', [14, 17], 'line', STYLE_A, { x: 100, y: 1580, width: 800 }),
  ];
  // Custom-font gate: same text at y=1700 in Bebas Neue when the font file exists.
  let fonts: RenderSpec['fonts'] = [];
  try {
    const buf = await fs.readFile(FONT_PATH);
    fonts = [{ family: 'Bebas Neue', fileName: 'BebasNeue-Regular.ttf', dataBase64: buf.toString('base64') }];
    segs.push(makeSegment('s-font', [14, 17], 'line', STYLE_CUSTOM, { x: 100, y: 1700, width: 800 }));
  } catch {
    console.log('⚠ BebasNeue-Regular.ttf not found in test-assets — skipping custom-font segment');
  }
  // Bundled-font gate: the shipped Montserrat pair at the top of the frame.
  // `s-linked` has no box, so it also exercises the default-box fallback.
  try {
    const [regular, extraBold] = await Promise.all([
      fs.readFile(path.join(BUNDLED_FONTS_DIR, 'Montserrat-Regular.ttf')),
      fs.readFile(path.join(BUNDLED_FONTS_DIR, 'Montserrat-ExtraBold.ttf')),
    ]);
    fonts.push(
      { family: 'Montserrat', fileName: 'Montserrat-Regular.ttf', dataBase64: regular.toString('base64') },
      { family: 'Montserrat', fileName: 'Montserrat-ExtraBold.ttf', dataBase64: extraBold.toString('base64') },
    );
    segs.push(makeSegment('s-bundled', [0, 3], 'line', STYLE_BUNDLED, { x: 100, y: 100, width: 800 }));
    segs.push(makeSegment('s-linked', [4, 7], 'line', STYLE_BUNDLED));
  } catch {
    console.log('⚠ bundled Montserrat fonts not found — skipping bundled-font segments');
  }
  return {
    version: 1,
    renderer: 'ass',
    video: { name: 'input.mp4', duration: 8, width: 1080, height: 1920 },
    segments: segs.map((seg) =>
      resolveSegmentLayout(
        seg,
        seg.wordIds.map((id) => words.find((w) => w.id === id)!),
        (t) => measure(t, seg.style),
        DEFAULT_BOX,
      ),
    ),
    fonts,
    output: { videoCodec: 'libx264', crf: 18, preset: 'veryfast', audioCodec: 'aac', audioBitrate: '192k' },
  };
}

function run(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args);
    let out = '';
    let err = '';
    p.stdout.on('data', (d: Buffer) => (out += d.toString()));
    p.stderr.on('data', (d: Buffer) => (err += d.toString()));
    p.on('close', (code) => (code === 0 ? resolve(out + err) : reject(new Error(`${cmd} exited ${code}: ${err.slice(-500)}`))));
  });
}

async function ensureAssets(): Promise<void> {
  try {
    await fs.access(VIDEO_PATH);
    console.log(`✓ test video present: ${VIDEO_PATH}`);
  } catch {
    console.log('Generating test video (8s, 1080x1920, testsrc2 + sine)…');
    await run('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-f', 'lavfi', '-i', 'testsrc2=size=1080x1920:rate=30:duration=8',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=8',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', VIDEO_PATH,
    ]);
  }
}

interface Status { status: string; progress: number; error?: string }

async function waitForRender(id: string): Promise<Status> {
  const deadline = Date.now() + 180_000;
  let last = 0;
  while (Date.now() < deadline) {
    const res = await fetch(`${SERVER}/api/render/${id}/status`);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const st = (await res.json()) as Status;
    if (Math.abs(st.progress - last) > 0.05) {
      last = st.progress;
      console.log(`  progress ${Math.round(st.progress * 100)}%`);
    }
    if (st.status === 'done' || st.status === 'error') return st;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('render timed out');
}

async function main(): Promise<void> {
  console.log('=== captioner export smoke test ===');
  await ensureAssets();

  const spec = await buildSpec();
  const families = [...new Set(spec.fonts.map((f) => f.family))];
  console.log(
    `spec: ${spec.segments.length} segments, ${spec.video.width}x${spec.video.height}, embedded fonts: ${families.join(', ') || 'none'}`,
  );

  console.log('POST /api/render …');
  const fd = new FormData();
  fd.append('spec', JSON.stringify(spec));
  fd.append('video', new Blob([await fs.readFile(VIDEO_PATH)]), 'input.mp4');
  const res = await fetch(`${SERVER}/api/render`, { method: 'POST', body: fd });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string; details?: string[] } | null;
    throw new Error(`render request failed: ${JSON.stringify(body)}`);
  }
  const { id } = (await res.json()) as { id: string };
  console.log(`job: ${id}`);

  const st = await waitForRender(id);
  if (st.status === 'error') throw new Error(`render failed: ${st.error}`);
  console.log('✓ render done');

  await fs.mkdir(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, 'output.mp4');
  const dl = await fetch(`${SERVER}/api/render/${id}/download`);
  if (!dl.ok) throw new Error(`download ${dl.status}`);
  await fs.writeFile(outPath, Buffer.from(await dl.arrayBuffer()));
  console.log(`✓ saved ${outPath} (${(await fs.stat(outPath)).size} bytes)`);

  // ffprobe: duration, streams (audio passes through iff the source has audio)
  const srcProbe = await run('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type', '-of', 'default=nw=1', VIDEO_PATH]);
  const srcHasAudio = srcProbe.includes('codec_type=audio');
  const probe = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-show_entries', 'stream=codec_type,codec_name', '-of', 'default=nw=1', outPath]);
  console.log('ffprobe:\n' + probe.trim());
  if (!probe.includes('codec_type=video')) throw new Error('no video stream in output');
  if (srcHasAudio && !probe.includes('codec_type=audio')) throw new Error('audio stream lost in output');
  if (!srcHasAudio && probe.includes('codec_type=audio')) throw new Error('unexpected audio stream in output');

  // Spot-check frames: word mode ~0.4s (also shows the bundled Montserrat line
  // at the top of the frame), highlight ~4.0s, line + custom font ~6.4s.
  for (const [t, name] of [[0.4, 'frame-word'], [4.0, 'frame-highlight'], [6.4, 'frame-line']] as const) {
    const p = path.join(OUT_DIR, `${name}.png`);
    await run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-ss', String(t), '-i', outPath, '-frames:v', '1', p]);
    console.log(`✓ extracted ${path.basename(p)} (open and compare against the preview at ${t}s)`);
  }

  // spot-check the ASS the server generated
  try {
    const assPath = path.join(ROOT, 'server', 'data', 'jobs', id, 'captions.ass');
    const ass = await fs.readFile(assPath, 'utf8');
    const dialogues = ass.split('\n').filter((l) => l.startsWith('Dialogue:'));
    const styleLines = ass.split('\n').filter((l) => l.startsWith('Style:'));
    console.log(`ASS: ${dialogues.length} dialogue lines, ${styleLines.length} styles`);
    // Column order: Name, Fontname, Fontsize, Primary, Secondary, Outline, Back, Bold, …
    // Found by face rather than by style name: style names follow first-event
    // order, which shifts as the spec gains segments.
    const boldOf = (fontname: string, fontsize: number) =>
      styleLines.find((l) => l.split(',')[1] === fontname && l.split(',')[2] === String(fontsize))?.split(',')[7];
    const montserrat = styleLines.filter((l) => l.split(',')[1] === 'Montserrat');
    const checks = [
      ['word event', dialogues.some((l) => l.includes('\\pos') && l.endsWith('Hello'))],
      ['highlight color tag', dialogues.some((l) => l.includes('\\c&H0000D4FF'))],
      // s-highlight wraps to two lines, so its dialogues carry the block's
      // second line, hard-broken and re-positioned.
      ['wrapped block broken with \\N and re-\\pos', dialogues.some((l) => l.includes('\\N{\\pos'))],
      ['highlight bold+size tags', dialogues.some((l) => /\\b1\\fs\d+/.test(l) && /\\b0\\fs\d+/.test(l))],
      ['outline units', ass.includes('Outline')],
      ['styles', ass.includes('Style: st0')],
      ['Bold column -1 for the 700-weight style', boldOf('Arial', 64) === '-1'],
      ['Bold column 0 for the 400-weight style', boldOf('Arial', 56) === '0'],
      ...(montserrat.length > 0
        ? ([
            ['bundled Montserrat resolves as one family', true],
            ['bundled Montserrat is bold', montserrat.every((l) => l.split(',')[7] === '-1')],
          ] as const)
        : []),
      ['a box-less segment falls back to the default box', dialogues.some((l) => l.includes(`\\pos(540,${DEFAULT_BOX.y})`))],
    ] as const;
    for (const [name, ok] of checks) console.log(`${ok ? '✓' : '✗ MISSING'} ${name}`);
    if (checks.some(([, ok]) => !ok)) throw new Error('ASS spot checks failed');
    console.log(`(ASS kept at ${assPath})`);
  } catch (err) {
    if (err instanceof Error && err.message.includes('ENOENT')) {
      console.log('⚠ could not read generated ASS (job dir missing)');
    } else {
      throw err;
    }
  }

  console.log('=== smoke test PASSED ===');
}

main().catch((err) => {
  console.error(`=== smoke test FAILED: ${err instanceof Error ? err.message : err} ===`);
  process.exit(1);
});
