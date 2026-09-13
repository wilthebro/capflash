import type { Word } from './types';

export type MeasureFn = (text: string) => number;

export interface Placement {
  word: Word;
  lineIndex: number;
  charStart: number; // index into the joined line text
  charEnd: number;
  leftPx: number; // word left edge within the line
  widthPx: number;
}

export interface WrapLine {
  text: string; // words joined with single spaces
  widthPx: number;
  words: Word[];
}

export interface WrapResult {
  lines: WrapLine[];
  placements: Placement[];
}

/**
 * Greedy word wrap constrained to `boxWidthPx`. A word that is longer than the
 * box always gets its own line (overflow accepted — flagged visually in the
 * editor). `charStart`/`charEnd` index into the joined line text built with
 * single spaces — exactly the string the ASS exporter receives — so highlight
 * spans are offset-correct by construction.
 */
export function wrapWords(words: Word[], boxWidthPx: number, measure: MeasureFn): WrapResult {
  const lines: WrapLine[] = [];
  const placements: Placement[] = [];
  let cur: Word[] = [];
  let curWidth = 0;
  let curCharLen = 0;

  const flush = () => {
    if (cur.length > 0) {
      lines.push({ text: cur.map((w) => w.text).join(' '), widthPx: curWidth, words: cur });
      cur = [];
      curWidth = 0;
      curCharLen = 0;
    }
  };

  for (const w of words) {
    const ww = measure(w.text);
    const spaceW = measure(' ');
    const candidate = cur.length ? curWidth + spaceW + ww : ww;
    if (cur.length > 0 && candidate > boxWidthPx) flush();
    const charStart = curCharLen + (cur.length > 0 ? 1 : 0); // +1 for the joining space
    const leftPx = curWidth + (cur.length > 0 ? spaceW : 0);
    placements.push({
      word: w,
      lineIndex: lines.length,
      charStart,
      charEnd: charStart + w.text.length,
      leftPx,
      widthPx: ww,
    });
    cur.push(w);
    curWidth = leftPx + ww;
    curCharLen = charStart + w.text.length;
  }
  flush();
  return { lines, placements };
}
