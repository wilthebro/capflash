import { describe, expect, it } from 'vitest';
import { reassignSegments } from '../src/reassign';
import { DEFAULT_BOX, DEFAULT_STYLE } from '../src/style';
import type { Segment, SegmentStyle, Word } from '../src/types';

const word = (id: string, start: number, end: number, text = id): Word => ({ id, text, start, end });

const seg = (id: string, wordIds: string[], start: number, end: number, style?: Partial<SegmentStyle>): Segment => ({
  id,
  wordIds,
  start,
  end,
  mode: 'highlight',
  style: { ...DEFAULT_STYLE, ...style },
  box: { ...DEFAULT_BOX },
});

const defaults = { style: DEFAULT_STYLE, mode: 'line' as const };
let n = 0;
const makeId = () => `new${n++}`;

describe('reassignSegments', () => {
  it('keeps segments untouched when the words did not change', () => {
    const words = [word('a', 0, 0.5), word('b', 0.5, 1.0), word('c', 2, 2.5)];
    const segs = [seg('s1', ['a', 'b'], 0, 1.0), seg('s2', ['c'], 2, 2.5)];
    const r = reassignSegments(segs, words, defaults, makeId);
    expect(r.droppedEmpty).toBe(0);
    expect(r.segments.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(r.segments[0]!.wordIds).toEqual(['a', 'b']);
    expect(r.segments[0]!.start).toBe(0);
    expect(r.segments[0]!.end).toBe(1.0);
  });

  it('keeps style, mode and box on surviving segments', () => {
    const words = [word('a', 0, 0.5, 'Hello')];
    const segs = [seg('s1', ['a'], 0, 0.5, { fontSize: 99, color: '#FF0000' })];
    segs[0]!.mode = 'word';
    segs[0]!.box = { x: 10, y: 20, width: 300 };
    const r = reassignSegments(segs, words, defaults, makeId);
    expect(r.segments[0]!.style.fontSize).toBe(99);
    expect(r.segments[0]!.style.color).toBe('#FF0000');
    expect(r.segments[0]!.mode).toBe('word');
    expect(r.segments[0]!.box).toEqual({ x: 10, y: 20, width: 300 });
  });

  it('keeps a word in its segment when its timing is edited, stretching the bounds', () => {
    const words = [word('a', 0, 0.5), word('b', 0.5, 2.4)]; // b now runs past the old end
    const segs = [seg('s1', ['a', 'b'], 0, 1.0, { fontSize: 42 })];
    const r = reassignSegments(segs, words, defaults, makeId);
    expect(r.segments).toHaveLength(1);
    expect(r.segments[0]!.id).toBe('s1');
    expect(r.segments[0]!.end).toBe(2.4);
    expect(r.segments[0]!.style.fontSize).toBe(42);
  });

  it('drops deleted words and removes segments left empty', () => {
    const words = [word('a', 0, 0.5)];
    const segs = [seg('s1', ['a'], 0, 0.5), seg('s2', ['gone'], 2, 2.5)];
    const r = reassignSegments(segs, words, defaults, makeId);
    expect(r.droppedEmpty).toBe(1);
    expect(r.segments.map((s) => s.id)).toEqual(['s1']);
  });

  it('drops every segment when the transcript is emptied', () => {
    const segs = [seg('s1', ['a'], 0, 0.5), seg('s2', ['b'], 1, 1.5)];
    const r = reassignSegments(segs, [], defaults, makeId);
    expect(r.segments).toEqual([]);
    expect(r.droppedEmpty).toBe(2);
  });

  it('adds a new word to the segment it overlaps and recomputes the bounds', () => {
    const words = [word('a', 0, 0.5), word('b', 0.5, 1.2), word('new', 1.2, 1.6)];
    const segs = [seg('s1', ['a', 'b'], 0, 1.2, { fontSize: 88 })];
    const r = reassignSegments(segs, words, defaults, makeId);
    expect(r.segments).toHaveLength(1);
    expect(r.segments[0]!.wordIds).toEqual(['a', 'b', 'new']);
    expect(r.segments[0]!.end).toBe(1.6);
    expect(r.segments[0]!.style.fontSize).toBe(88);
  });

  it('sorts a segment word list by time after an edit', () => {
    const words = [word('b', 0.5, 1.0), word('a', 0, 0.5)];
    const segs = [seg('s1', ['a', 'b'], 0, 1.0)];
    const r = reassignSegments(segs, words, defaults, makeId);
    expect(r.segments[0]!.wordIds).toEqual(['a', 'b']);
  });

  it('keeps a linked survivor linked instead of pinning it to the default box', () => {
    const words = [word('a', 0, 0.5)];
    const linked: Segment = {
      id: 's1',
      wordIds: ['a'],
      start: 0,
      end: 0.5,
      mode: 'highlight',
      style: { ...DEFAULT_STYLE },
      // no box: follows the project default
    };
    const r = reassignSegments([linked], words, defaults, makeId);
    expect(r.segments[0]!.box).toBeUndefined();
  });

  it('starts a new segment for words added outside every existing segment', () => {
    const words = [word('a', 0, 0.5), word('far', 5.0, 5.4)];
    const segs = [seg('s1', ['a'], 0, 0.5, { fontSize: 70 })];
    const r = reassignSegments(segs, words, defaults, makeId);
    expect(r.segments).toHaveLength(2);
    expect(r.segments[1]!.wordIds).toEqual(['far']);
    expect(r.segments[1]!.style).toEqual(DEFAULT_STYLE);
    expect(r.segments[1]!.mode).toBe('line');
    expect(r.segments[1]!.id).toBe('new0');
    // New segments are born linked to the global box.
    expect(r.segments[1]!.box).toBeUndefined();
  });

  it('groups nearby new words into one segment and separates distant runs', () => {
    const words = [
      word('fit', 5.0, 5.3),
      word('near', 5.4, 5.7),
      word('apart', 8.0, 8.3),
    ];
    const r = reassignSegments([], words, defaults, makeId);
    expect(r.segments).toHaveLength(2);
    expect(r.segments[0]!.wordIds).toEqual(['fit', 'near']);
    expect(r.segments[1]!.wordIds).toEqual(['apart']);
  });

  it('returns segments sorted by start', () => {
    const words = [word('late', 9, 9.4), word('early', 0, 0.5), word('mid', 4, 4.4)];
    const r = reassignSegments([], words, defaults, makeId);
    expect(r.segments.map((s) => s.start)).toEqual([0, 4, 9]);
  });

  it('honours a custom newWordGapSec', () => {
    const words = [word('x', 0, 0.5), word('y', 1.5, 2.0)];
    const joined = reassignSegments([], words, defaults, makeId, { newWordGapSec: 2 });
    expect(joined.segments).toHaveLength(1);
    const split = reassignSegments([], words, defaults, makeId, { newWordGapSec: 0.3 });
    expect(split.segments).toHaveLength(2);
  });
});
