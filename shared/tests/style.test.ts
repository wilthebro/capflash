import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BOX,
  DEFAULT_STYLE,
  defaultBoxFor,
  defaultFontSizeFor,
  fitBoxToVideo,
  LINE_HEIGHT,
} from '../src/style';
import type { Box } from '../src/types';

/** The box's own height in pixels, for checking it lands inside the frame. */
const boxHeight = (box: Box, fontSize: number) => box.maxLines * fontSize * LINE_HEIGHT;

describe('defaultBoxFor', () => {
  it('reproduces the shipped box exactly at the reference resolution', () => {
    // The whole point of the reference: work made at 1080x1920 must not shift.
    expect(defaultBoxFor({ width: 1080, height: 1920 })).toEqual(DEFAULT_BOX);
  });

  it('scales the shipped 1080x1920 design down to a smaller 9:16 frame', () => {
    // Before this existed the stock box sat at y=1420 on a 1024-tall frame —
    // 396px below the bottom edge — so transcribed captions were invisible.
    expect(defaultBoxFor({ width: 576, height: 1024 })).toEqual({
      x: 64,
      y: 757,
      width: 448,
      maxLines: DEFAULT_BOX.maxLines,
      alignX: DEFAULT_BOX.alignX,
      alignY: DEFAULT_BOX.alignY,
    });
  });

  it('scales each axis separately, so a non-9:16 frame stays proportionate', () => {
    // 4:5 portrait — the height is untouched by the width scale factor.
    expect(defaultBoxFor({ width: 1080, height: 1350 })).toMatchObject({ x: 120, y: 998, width: 840 });
    // Landscape — a single shared factor would misplace both axes here.
    expect(defaultBoxFor({ width: 1920, height: 1080 })).toMatchObject({ x: 213, y: 799, width: 1493 });
  });

  it('lands inside the frame at every resolution, with room to spare', () => {
    const frames = [
      { width: 576, height: 1024 },
      { width: 720, height: 1280 },
      { width: 1080, height: 1920 },
      { width: 1080, height: 1350 },
      { width: 1920, height: 1080 },
      { width: 1440, height: 2560 },
      { width: 3840, height: 2160 },
    ];
    for (const video of frames) {
      const box = defaultBoxFor(video);
      const size = defaultFontSizeFor(video);
      const label = `${video.width}x${video.height}`;
      expect(box.x, label).toBeGreaterThanOrEqual(0);
      expect(box.y, label).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, label).toBeLessThanOrEqual(video.width);
      expect(box.y + boxHeight(box, size), label).toBeLessThanOrEqual(video.height);
    }
  });

  it('falls back to the shipped box rather than producing NaN on a degenerate frame', () => {
    expect(defaultBoxFor({ width: 0, height: 0 })).toEqual(DEFAULT_BOX);
  });
});

describe('defaultFontSizeFor', () => {
  it('keeps the shipped size at the reference resolution', () => {
    expect(defaultFontSizeFor({ width: 1080, height: 1920 })).toBe(DEFAULT_STYLE.fontSize);
  });

  it('scales text with frame height', () => {
    // 64px on a 576-wide frame would be ~1.9x oversized.
    expect(defaultFontSizeFor({ width: 576, height: 1024 })).toBe(34);
    expect(defaultFontSizeFor({ width: 1920, height: 1080 })).toBe(36);
  });

  it('never returns zero, which would make the text vanish', () => {
    expect(defaultFontSizeFor({ width: 10, height: 10 })).toBeGreaterThanOrEqual(1);
  });
});

describe('fitBoxToVideo', () => {
  const line = DEFAULT_STYLE.fontSize * LINE_HEIGHT;

  it('pulls an off-frame box back inside, and keeps it whole', () => {
    // Exactly the failure: the stock 1080x1920 box applied to a 576x1024 video.
    expect(fitBoxToVideo(DEFAULT_BOX, { width: 576, height: 1024 }, line)).toEqual({
      ...DEFAULT_BOX,
      x: 0,
      y: 870,
      width: 576,
    });
  });

  it('leaves an in-frame box untouched', () => {
    const box: Box = { x: 64, y: 757, width: 448, maxLines: 2, alignX: 'center', alignY: 'top' };
    expect(fitBoxToVideo(box, { width: 576, height: 1024 }, line)).toEqual(box);
  });

  it('pins to the top when the frame is shorter than one page of lines', () => {
    // No valid y exists, and a negative one would put the text off the top.
    const box: Box = { x: 0, y: 500, width: 400, maxLines: 8, alignX: 'center', alignY: 'top' };
    expect(fitBoxToVideo(box, { width: 500, height: 100 }, line).y).toBe(0);
  });

  it('keeps a sane maxLines when the value is unusable', () => {
    const box = { x: 0, y: 0, width: 400, maxLines: Number.NaN, alignX: 'center', alignY: 'top' } as Box;
    expect(fitBoxToVideo(box, { width: 500, height: 500 }, line).maxLines).toBe(2);
  });
});
