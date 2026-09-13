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

  it('extends the last event to the segment end', () => {
    // A trimmed/extended segment keeps its caption on screen to the end.
    const seq = [word('w1', 'hi', 0, 0.3)];
    const seg = { ...makeSeg(), start: 0, end: 1.5 };
    const events = eventsForSegment(seg, resolveSegmentLayout(seg, seq, measure, DEFAULT_BOX));
    expect(events[0]!.end).toBe(1.5);
  });
});

describe('eventsForSegment wrapped blocks', () => {
  // "hello there" is 11 chars = 440px: wraps to two lines in a 400px box.
  const seq = [word('w1', 'hello', 0, 0.5), word('w2', 'there', 0.5, 1)];
  const box: Box = { x: 100, y: 1400, width: 400 };
  const make = (mode: 'line' | 'highlight' | 'word', end = 1) => {
    const seg: Segment = { ...makeSeg(box), id: 's1', mode, start: 0, end, wordIds: ['w1', 'w2'] };
    const layout = resolveSegmentLayout(seg, seq, measure, DEFAULT_BOX);
    return { layout, events: eventsForSegment(seg, layout) };
  };

  it('shows the whole block for every word, anchored at the block top', () => {
    const { layout, events } = make('line', 1);
    expect(layout.lines).toHaveLength(2);
    expect(events).toHaveLength(2);
    for (const e of events) {
      expect(e.text).toBe('hello\nthere');
      expect(e.x).toBe(300); // shared box centerX, not a per-line center
      expect(e.y).toBe(1400); // box.y — NOT the second line's topY
      expect(e.words).toEqual([
        { charStart: 0, charEnd: 5, highlighted: false },
        { charStart: 6, charEnd: 11, highlighted: false }, // +1 for the '\n'
      ]);
    }
    expect(layout.lines[1]!.topY).not.toBe(events[0]!.y);
  });

  it('flags only the spoken word, across both lines', () => {
    const { events } = make('highlight', 1);
    expect(events[0]!.words).toEqual([
      { charStart: 0, charEnd: 5, highlighted: true },
      { charStart: 6, charEnd: 11, highlighted: false },
    ]);
    expect(events[1]!.words).toEqual([
      { charStart: 0, charEnd: 5, highlighted: false },
      { charStart: 6, charEnd: 11, highlighted: true },
    ]);
  });

  it('keeps word mode one word at a time at the word center', () => {
    const { layout, events } = make('word', 1);
    expect(events.map((e) => e.text)).toEqual(['hello', 'there']);
    expect(events[0]!.x).toBe(layout.lines[0]!.words[0]!.centerX);
    expect(events[0]!.y).toBe(1400);
    expect(events[1]!.y).toBe(layout.lines[1]!.topY);
  });
});

describe('eventsForSegment gap bridging', () => {
  it('holds a word through the pause that follows it', () => {
    const seq = [word('w1', 'yes', 0, 0.5), word('w2', 'sir', 1.0, 1.5)];
    const seg: Segment = { ...makeSeg(), wordIds: ['w1', 'w2'], start: 0, end: 2 };
    const events = eventsForSegment(seg, resolveSegmentLayout(seg, seq, measure, DEFAULT_BOX));
    expect(events.map((e) => [e.start, e.end])).toEqual([
      [0, 1.0], // held across the 0.5s pause
      [1.0, 2], // and the last one holds to the segment end
    ]);
  });

  it('bridges in word mode too', () => {
    const seq = [word('w1', 'yes', 0, 0.5), word('w2', 'sir', 1.0, 1.5)];
    const seg: Segment = { ...makeSeg(), mode: 'word', wordIds: ['w1', 'w2'], start: 0, end: 2 };
    const events = eventsForSegment(seg, resolveSegmentLayout(seg, seq, measure, DEFAULT_BOX));
    expect(events.map((e) => [e.start, e.end])).toEqual([
      [0, 1.0],
      [1.0, 2],
    ]);
  });

  it('never shortens an overlapping event', () => {
    const seq = [word('w1', 'yes', 0, 1.2), word('w2', 'sir', 1.0, 1.5)];
    const seg: Segment = { ...makeSeg(), wordIds: ['w1', 'w2'], start: 0, end: 1.5 };
    const events = eventsForSegment(seg, resolveSegmentLayout(seg, seq, measure, DEFAULT_BOX));
    expect(events.map((e) => [e.start, e.end])).toEqual([
      [0, 1.2],
      [1.0, 1.5],
    ]);
  });
});
