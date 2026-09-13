import { describe, expect, it } from 'vitest';
import { wordsFromWhisperChunks, type WhisperChunk } from '../src/whisper';

let n = 0;
const makeId = () => `w${n++}`;
const chunk = (text: string, start: number, end: number): WhisperChunk => ({
  text,
  timestamp: [start, end],
});

describe('wordsFromWhisperChunks', () => {
  it('converts chunks to words and trims text', () => {
    const { words, dropped } = wordsFromWhisperChunks(
      [chunk(' And', 0, 0.78), chunk(' so', 0.78, 1.2)],
      { durationSec: 10, makeId },
    );
    expect(dropped).toBe(0);
    expect(words).toHaveLength(2);
    expect(words[0]).toMatchObject({ text: 'And', start: 0, end: 0.78 });
    expect(words[1]).toMatchObject({ text: 'so', start: 0.78, end: 1.2 });
    expect(words[0]!.id).not.toBe(words[1]!.id);
  });

  it('clamps timestamps past the media duration', () => {
    const { words } = wordsFromWhisperChunks(
      [chunk('end', 7.8, 9.4), chunk('neg', -0.4, 0.3)],
      { durationSec: 8, makeId },
    );
    expect(words.find((w) => w.text === 'end')).toMatchObject({ start: 7.8, end: 8 });
    expect(words.find((w) => w.text === 'neg')).toMatchObject({ start: 0, end: 0.3 });
  });

  it('drops zero/negative-length and too-short chunks, counting them', () => {
    const { words, dropped } = wordsFromWhisperChunks(
      [chunk('ok', 0, 0.5), chunk('bad', 1, 1), chunk('backwards', 2, 1.5), chunk('tiny', 3, 3.02)],
      { durationSec: 10, makeId },
    );
    expect(words.map((w) => w.text)).toEqual(['ok']);
    expect(dropped).toBe(3);
  });

  it('skips empty text without counting it as dropped', () => {
    const { words, dropped } = wordsFromWhisperChunks(
      [chunk('   ', 0, 0.5), chunk('', 0.5, 1), chunk('real', 1, 1.5)],
      { durationSec: 10, makeId },
    );
    expect(words.map((w) => w.text)).toEqual(['real']);
    expect(dropped).toBe(0);
  });

  it('drops chunks with missing or non-finite timestamps', () => {
    const bad = [
      { text: 'a', timestamp: [Number.NaN, 1] },
      { text: 'b', timestamp: [0, Number.POSITIVE_INFINITY] },
      { text: 'c' },
    ] as unknown as WhisperChunk[];
    const { words, dropped } = wordsFromWhisperChunks(bad, { durationSec: 10, makeId });
    expect(words).toHaveLength(0);
    expect(dropped).toBe(3);
  });

  it('sorts by start and handles empty input', () => {
    const { words } = wordsFromWhisperChunks([chunk('b', 2, 2.5), chunk('a', 1, 1.5)], {
      durationSec: 10,
      makeId,
    });
    expect(words.map((w) => w.text)).toEqual(['a', 'b']);
    expect(wordsFromWhisperChunks(undefined, { durationSec: 10, makeId })).toEqual({
      words: [],
      dropped: 0,
    });
    expect(wordsFromWhisperChunks([], { durationSec: 10, makeId }).words).toEqual([]);
  });

  it('honours a custom minDurationSec', () => {
    const { words, dropped } = wordsFromWhisperChunks([chunk('short', 0, 0.2)], {
      durationSec: 10,
      makeId,
      minDurationSec: 0.5,
    });
    expect(words).toHaveLength(0);
    expect(dropped).toBe(1);
  });
});
