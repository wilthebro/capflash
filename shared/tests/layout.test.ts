import { describe, expect, it } from 'vitest';
import { eventsForSegment, resolveSegmentLayout } from '../src/layout';
import { DEFAULT_BOX, DEFAULT_STYLE, highlightFontSize, highlightFontWeight } from '../src/style';
import type { Box, Segment, Word } from '../src/types';

const word = (id: string, text: string, start: number, end: number): Word => ({ id, text, start, end });
// 40px per char at the default 64px style.
const measure = (t: string) => t.length * 40;

const makeSeg = (box?: Box): Segment => ({
  id: 's1',
  wordIds: ['w1'],
  start: 0,
  end: 0.5,
  mode: 'line',
  style: { ...DEFAULT_STYLE },
  ...(box ? { box } : {}),
});

describe('resolveSegmentLayout box resolution', () => {
  it('follows the default box when the segment has none', () => {
    const box: Box = { x: 100, y: 1400, width: 800 };
    const layout = resolveSegmentLayout(makeSeg(), [word('w1', 'hello', 0, 0.5)], measure, box);
    expect(layout.box).toEqual(box);
    expect(layout.lines[0]!.centerX).toBe(100 + 800 / 2);
    expect(layout.lines[0]!.topY).toBe(1400);
    expect(layout.events[0]!.x).toBe(500);
    expect(layout.events[0]!.y).toBe(1400);
  });

  it('lets an explicit segment box win over the default', () => {
    const own: Box = { x: 0, y: 0, width: 400 };
    const layout = resolveSegmentLayout(
      makeSeg(own),
      [word('w1', 'hello', 0, 0.5)],
      measure,
      { x: 100, y: 1400, width: 800 },
    );
    expect(layout.box).toEqual(own);
    expect(layout.lines[0]!.centerX).toBe(200);
    expect(layout.lines[0]!.topY).toBe(0);
  });

  it('wraps against the resolved box width, not a stale one', () => {
    // "hello there" is 11 chars = 440px: fits a 500px box, not a 400px one.
    const words = [word('w1', 'hello', 0, 0.25), word('w2', 'there', 0.25, 0.5)];
    const wide = resolveSegmentLayout(makeSeg(), words, measure, { x: 0, y: 0, width: 500 });
    const narrow = resolveSegmentLayout(makeSeg(), words, measure, { x: 0, y: 0, width: 400 });
    expect(wide.lines).toHaveLength(1);
    expect(narrow.lines).toHaveLength(2);
  });

  it('defaults to the shipped box when given DEFAULT_BOX', () => {
    const layout = resolveSegmentLayout(makeSeg(), [word('w1', 'hi', 0, 0.5)], measure, DEFAULT_BOX);
    expect(layout.box).toEqual(DEFAULT_BOX);
  });
});

describe('highlight emphasis helpers', () => {
  it('keeps the +6px floor for small text and the 10% bump for large text', () => {
    expect(highlightFontSize(10)).toBe(16); // 10% would only add 1px
    expect(highlightFontSize(48)).toBe(54); // round(52.8) = 53, floor wins
    expect(highlightFontSize(64)).toBe(70);
    expect(highlightFontSize(100)).toBe(110); // 10% now beats the floor
  });

  it('never drops below bold', () => {
    expect(highlightFontWeight(400)).toBe(700);
    expect(highlightFontWeight(700)).toBe(700);
    expect(highlightFontWeight(800)).toBe(800);
  });
});

describe('eventsForSegment clipping', () => {
  it('clips events to the segment bounds and drops empty ones', () => {
    const seg = { ...makeSeg(), start: 0.2, end: 0.4 };
    const layout = resolveSegmentLayout(seg, [word('w1', 'hello', 0, 0.5)], measure, DEFAULT_BOX);
    const events = eventsForSegment(seg, layout);
    expect(events).toHaveLength(1);
    expect(events[0]!.start).toBe(0.2);
    expect(events[0]!.end).toBe(0.4);
  });
});
