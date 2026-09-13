import { defaultId } from './style';
import type { Box, DisplayMode, Segment, SegmentStyle, Word } from './types';

const SENTENCE_END = /[.!?…]["')\]]*$/;

export interface SplitOptions {
  maxWords?: number; // default 10
  maxDurationSec?: number; // default 3.2
}

/**
 * Default (no script) segmentation: walk words in time order, close a segment
 * at a sentence terminator, or when the segment grows past `maxWords` /
 * `maxDurationSec` (with at least 3 words so tiny sentences aren't split).
 */
export function splitTranscript(
  transcript: Word[],
  defaults: { style: SegmentStyle; box: Box; mode: DisplayMode },
  makeId: () => string = defaultId,
  opts?: SplitOptions,
): Segment[] {
  const maxWords = opts?.maxWords ?? 10;
  const maxDurationSec = opts?.maxDurationSec ?? 3.2;
  const words = [...transcript].sort((a, b) => a.start - b.start);
  const segments: Segment[] = [];
  let cur: Word[] = [];

  const close = () => {
    if (cur.length === 0) return;
    segments.push({
      id: makeId(),
      wordIds: cur.map((w) => w.id),
      start: cur[0]!.start,
      end: cur[cur.length - 1]!.end,
      mode: defaults.mode,
      style: { ...defaults.style },
      box: { ...defaults.box },
    });
    cur = [];
  };

  for (const w of words) {
    cur.push(w);
    const dur = cur[cur.length - 1]!.end - cur[0]!.start;
    const sentenceEnd = SENTENCE_END.test(w.text);
    const tooMany = cur.length >= maxWords;
    const tooLong = dur >= maxDurationSec && cur.length >= 3;
    if (sentenceEnd || tooMany || tooLong) close();
  }
  close();
  return segments;
}
