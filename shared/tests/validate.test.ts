import { describe, expect, it } from 'vitest';
import { resolveSegmentLayout } from '../src/layout';
import { DEFAULT_BOX, DEFAULT_STYLE } from '../src/style';
import type { Segment } from '../src/types';
import { ProjectSchema, RenderSpecSchema } from '../src/validate';

/** The default style as an old (pre-weight) project file would have written it. */
const { fontWeight: _dropped, ...styleWithoutWeight } = DEFAULT_STYLE;

const segment = (over: Partial<Segment> = {}) => ({
  id: 's1',
  wordIds: ['w1'],
  start: 0,
  end: 1,
  mode: 'line' as const,
  style: { ...DEFAULT_STYLE },
  ...over,
});

const project = (segments: unknown[], defaultStyle: unknown = { ...DEFAULT_STYLE }) => ({
  version: 1,
  name: 'p',
  video: null,
  words: [{ id: 'w1', text: 'hi', start: 0, end: 1 }],
  segments,
  defaultStyle,
  defaultBox: { ...DEFAULT_BOX },
  defaultMode: 'line',
  fonts: [],
});

describe('ProjectSchema', () => {
  it('accepts a segment with no box (linked to the global default)', () => {
    const parsed = ProjectSchema.parse(project([segment()]));
    expect(parsed.segments[0]!.box).toBeUndefined();
  });

  it('still accepts a segment with its own box', () => {
    const parsed = ProjectSchema.parse(project([segment({ box: { x: 1, y: 2, width: 3 } })]));
    expect(parsed.segments[0]!.box).toEqual({ x: 1, y: 2, width: 3 });
  });

  it('defaults a missing fontWeight to 400 so old projects keep their look', () => {
    const parsed = ProjectSchema.parse(
      project([segment({ style: { ...styleWithoutWeight } as never })], { ...styleWithoutWeight }),
    );
    expect(parsed.segments[0]!.style.fontWeight).toBe(400);
    expect(parsed.defaultStyle.fontWeight).toBe(400);
  });

  it('keeps an explicit fontWeight', () => {
    const parsed = ProjectSchema.parse(project([segment({ style: { ...DEFAULT_STYLE, fontWeight: 800 } })]));
    expect(parsed.segments[0]!.style.fontWeight).toBe(800);
  });

  it('rejects a non-positive box width', () => {
    expect(ProjectSchema.safeParse(project([segment({ box: { x: 0, y: 0, width: 0 } })])).success).toBe(false);
  });
});

describe('RenderSpecSchema', () => {
  const layoutOf = (seg: Segment) =>
    resolveSegmentLayout(seg, [{ id: 'w1', text: 'hi', start: 0, end: 1 }], (t) => t.length * 40, DEFAULT_BOX);

  const spec = () => ({
    version: 1 as const,
    renderer: 'ass' as const,
    video: { name: 'v.mp4', duration: 1, width: 1080, height: 1920 },
    segments: [layoutOf(segment())],
    fonts: [],
    output: {
      videoCodec: 'libx264' as const,
      crf: 18,
      preset: 'veryfast',
      audioCodec: 'aac' as const,
      audioBitrate: '192k',
    },
  });

  it('accepts a spec whose boxes are already resolved', () => {
    const parsed = RenderSpecSchema.parse(spec());
    expect(parsed.segments[0]!.box).toEqual(DEFAULT_BOX);
  });

  it('requires a resolved box on every segment', () => {
    const s = spec();
    const { box: _resolved, ...unresolved } = s.segments[0]!;
    expect(RenderSpecSchema.safeParse({ ...s, segments: [unresolved] }).success).toBe(false);
  });
});
