import { describe, expect, it } from 'vitest';
import { DEFAULT_BOX, DEFAULT_STYLE } from '../src/style';
import { splitTranscript } from '../src/segmentation';
import type { Word } from '../src/types';

const word = (id: string, text: string, start: number, end: number): Word => ({ id, text, start, end });
const defaults = { style: DEFAULT_STYLE, box: DEFAULT_BOX, mode: 'highlight' as const };
let n = 0;
const makeId = () => `s${n++}`;

describe('splitTranscript', () => {
  it('splits at sentence terminators', () => {
    const t = [
      word('w1', 'Hello', 0.0, 0.4),
      word('w2', 'world.', 0.4, 0.8),
      word('w3', 'Goodbye', 1.0, 1.4),
      word('w4', 'now!', 1.4, 1.8),
    ];
    const segs = splitTranscript(t, defaults, makeId);
    expect(segs).toHaveLength(2);
    expect(segs[0]!.wordIds).toEqual(['w1', 'w2']);
    expect(segs[1]!.wordIds).toEqual(['w3', 'w4']);
    expect(segs[0]!.start).toBe(0.0);
    expect(segs[0]!.end).toBe(0.8);
    expect(segs[0]!.mode).toBe('highlight');
  });

  it('splits on trailing quotes after a terminator', () => {
    const t = [word('w1', 'Hey', 0, 0.5), word('w2', 'there!"', 0.5, 1.0), word('w3', 'Next', 1.2, 1.6)];
    const segs = splitTranscript(t, defaults, makeId);
    expect(segs).toHaveLength(2);
  });

  it('closes at maxWords even without a terminator', () => {
    const t = Array.from({ length: 25 }, (_, i) => word(`w${i}`, `word${i}`, i, i + 0.4));
    const segs = splitTranscript(t, defaults, makeId, { maxDurationSec: 100 });
    expect(segs).toHaveLength(3); // 10 + 10 + 5
    expect(segs[0]!.wordIds).toHaveLength(10);
  });

  it('closes at maxDurationSec only with at least 3 words', () => {
    // two long words, then a third: split happens once the 3-word segment exceeds 3.2s
    const t = [
      word('w1', 'loooong', 0.0, 2.0),
      word('w2', 'loooong', 2.0, 4.0),
      word('w3', 'loooong', 4.0, 6.0),
      word('w4', 'loooong', 6.0, 8.0),
    ];
    const segs = splitTranscript(t, defaults, makeId, { maxDurationSec: 3.2, maxWords: 100 });
    expect(segs).toHaveLength(2); // [w1,w2,w3] then [w4]
    expect(segs[0]!.wordIds).toEqual(['w1', 'w2', 'w3']);
  });

  it('returns nothing for empty input', () => {
    expect(splitTranscript([], defaults, makeId)).toEqual([]);
  });
});
