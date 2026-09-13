import { describe, expect, it } from 'vitest';
import { DEFAULT_STYLE } from '../src/style';
import { alignSequences, normalizeWord, segmentsFromScript } from '../src/alignment';
import type { Word } from '../src/types';

const word = (id: string, text: string, start: number, end: number): Word => ({ id, text, start, end });
const defaults = { style: DEFAULT_STYLE, mode: 'line' as const };
let n = 0;
const makeId = () => `s${n++}`;

describe('normalizeWord', () => {
  it('lowercases and strips punctuation but keeps apostrophes', () => {
    expect(normalizeWord('Hello,')).toBe('hello');
    expect(normalizeWord("WORLD'S!")).toBe("world's");
    expect(normalizeWord('«Qué»?')).toBe('qué');
  });
});

describe('alignSequences', () => {
  it('matches exact sequences', () => {
    const r = alignSequences(['hello', 'world'], ['hello', 'world']);
    expect(r.matches).toEqual([
      { transcriptIndex: 0, scriptIndex: 0 },
      { transcriptIndex: 1, scriptIndex: 1 },
    ]);
    expect(r.unmatchedTranscript).toEqual([]);
    expect(r.unmatchedScript).toEqual([]);
  });

  it('ignores case and punctuation', () => {
    const r = alignSequences(['Hello,', 'WORLD', 'today'], ['hello', 'world']);
    expect(r.matches).toEqual([
      { transcriptIndex: 0, scriptIndex: 0 },
      { transcriptIndex: 1, scriptIndex: 1 },
    ]);
    expect(r.unmatchedTranscript).toEqual([2]);
    expect(r.unmatchedScript).toEqual([]);
  });

  it('marks a transcript insertion as unmatched', () => {
    const r = alignSequences(['a', 'b', 'c'], ['a', 'c']);
    expect(r.matches.map((m) => m.transcriptIndex)).toEqual([0, 2]);
    expect(r.unmatchedTranscript).toEqual([1]);
    expect(r.unmatchedScript).toEqual([]);
  });

  it('marks a script insertion as unmatched', () => {
    const r = alignSequences(['a', 'c'], ['a', 'b', 'c']);
    expect(r.matches.map((m) => m.scriptIndex)).toEqual([0, 2]);
    expect(r.unmatchedTranscript).toEqual([]);
    expect(r.unmatchedScript).toEqual(['b']);
  });

  it('treats a substitution as unmatched on both sides', () => {
    const r = alignSequences(['foo'], ['bar']);
    expect(r.matches).toEqual([]);
    expect(r.unmatchedTranscript).toEqual([0]);
    expect(r.unmatchedScript).toEqual(['bar']);
  });

  it('handles empty inputs', () => {
    expect(alignSequences([], []).matches).toEqual([]);
    expect(alignSequences(['a'], []).unmatchedTranscript).toEqual([0]);
    expect(alignSequences([], ['a']).unmatchedScript).toEqual(['a']);
  });
});

describe('segmentsFromScript', () => {
  it('groups transcript words by script lines, overriding sentence periods', () => {
    const transcript = [
      word('w1', 'Hello', 0.0, 0.4),
      word('w2', 'world.', 0.4, 0.8),
      word('w3', 'This', 0.9, 1.2),
      word('w4', 'stays', 1.2, 1.5),
      word('w5', 'together', 1.5, 1.9),
      word('w6', 'okay', 2.0, 2.4),
    ];
    // "world." has a period but the script keeps it on line 1
    const script = 'Hello world\nThis stays together\nokay';
    const { segments, warnings } = segmentsFromScript(transcript, script, defaults, makeId);
    expect(warnings).toEqual([]);
    expect(segments).toHaveLength(3);
    expect(segments[0]!.wordIds).toEqual(['w1', 'w2']);
    expect(segments[1]!.wordIds).toEqual(['w3', 'w4', 'w5']);
    expect(segments[2]!.wordIds).toEqual(['w6']);
    expect(segments[0]!.start).toBe(0.0);
    expect(segments[0]!.end).toBe(0.8);
  });

  it('attaches spoken words between script lines to the previous line', () => {
    const transcript = [word('w1', 'one', 0, 1), word('w2', 'two', 1, 2), word('w3', 'three', 2, 3)];
    const script = 'one\nthree'; // "two" is spoken but absent from the script
    const { segments } = segmentsFromScript(transcript, script, defaults, makeId);
    expect(segments).toHaveLength(2);
    expect(segments[0]!.wordIds).toEqual(['w1', 'w2']);
    expect(segments[1]!.wordIds).toEqual(['w3']);
  });

  it('warns about script words with no spoken counterpart and empty lines', () => {
    const transcript = [word('w1', 'hello', 0, 1), word('w2', 'world', 1, 2)];
    const script = 'hello WORLD extra\n\n';
    const { segments, warnings } = segmentsFromScript(transcript, script, defaults, makeId);
    expect(segments).toHaveLength(1);
    expect(warnings.some((w) => w.includes('not found in the transcript'))).toBe(true);
  });

  it('skips script lines with no matching transcript words', () => {
    const transcript = [word('w1', 'hello', 0, 1)];
    const script = 'hello\nmystery line';
    const { segments, warnings } = segmentsFromScript(transcript, script, defaults, makeId);
    expect(segments).toHaveLength(1);
    expect(warnings.some((w) => w.includes('mystery line'))).toBe(true);
  });
});
