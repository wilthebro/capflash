import { describe, expect, it } from 'vitest';
import type { Word } from '../src/types';
import { wrapWords } from '../src/wrapping';

// 10px per character + space = 10px
const measure = (t: string) => t.length * 10;

const w = (text: string): Word => ({ id: text, text, start: 0, end: 1 });

describe('wrapWords', () => {
  it('wraps at the box boundary and preserves placement offsets', () => {
    // "aaa bb" = 60px fits in 75px; "aaa bb ccc" = 100px does not
    const words = [w('aaa'), w('bb'), w('ccc')];
    const { lines, placements } = wrapWords(words, 75, measure);
    expect(lines.map((l) => l.text)).toEqual(['aaa bb', 'ccc']);
    expect(lines[0]!.widthPx).toBe(60);
    expect(lines[1]!.widthPx).toBe(30);

    expect(placements[0]).toMatchObject({ lineIndex: 0, charStart: 0, charEnd: 3, leftPx: 0, widthPx: 30 });
    expect(placements[1]).toMatchObject({ lineIndex: 0, charStart: 4, charEnd: 6, leftPx: 40, widthPx: 20 });
    expect(placements[2]).toMatchObject({ lineIndex: 1, charStart: 0, charEnd: 3, leftPx: 0, widthPx: 30 });

    // charStart/charEnd index into the joined line text
    for (const p of placements) {
      expect(lines[p.lineIndex]!.text.slice(p.charStart, p.charEnd)).toBe(p.word.text);
    }
  });

  it('gives an overlong word its own line (overflow accepted)', () => {
    const words = [w('aaaa'), w('abcdefghij')];
    const { lines } = wrapWords(words, 75, measure);
    expect(lines.map((l) => l.text)).toEqual(['aaaa', 'abcdefghij']);
  });

  it('handles empty input', () => {
    const { lines, placements } = wrapWords([], 75, measure);
    expect(lines).toEqual([]);
    expect(placements).toEqual([]);
  });

  it('keeps a word that exactly fills the box', () => {
    const words = [w('aaaaaaa'), w('bb')];
    const { lines } = wrapWords(words, 70, measure);
    expect(lines.map((l) => l.text)).toEqual(['aaaaaaa', 'bb']);
  });

  it('starts a new line when the space+word exceeds the box', () => {
    // "aa" = 20; +space+ "aaaa" = 20+10+40 = 70 > 65 -> wrap
    const words = [w('aa'), w('aaaa')];
    const { lines } = wrapWords(words, 65, measure);
    expect(lines.map((l) => l.text)).toEqual(['aa', 'aaaa']);
  });
});
