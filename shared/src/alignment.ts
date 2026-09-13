import { defaultId } from './style';
import type { DisplayMode, Segment, SegmentStyle, Word } from './types';

/** Lowercase, strip everything except letters/digits/apostrophes. */
export function normalizeWord(w: string): string {
  return w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '');
}

export interface AlignmentResult {
  matches: { transcriptIndex: number; scriptIndex: number }[];
  unmatchedTranscript: number[]; // spoken words not in the script
  unmatchedScript: string[]; // script words not found in the transcript
}

/**
 * Align two word sequences by DP edit distance over normalized words.
 * Costs: match 0, substitute 2 (= ins+del, so a mismatch surfaces as an
 * unmatched word on both sides rather than a fake match), insert/delete 1.
 * Ties prefer diagonal (match). Falls back to a greedy windowed walk when
 * n*m exceeds 4M cells (keeps worst-case memory/time bounded).
 */
export function alignSequences(transcript: string[], script: string[]): AlignmentResult {
  const t = transcript.map(normalizeWord);
  const s = script.map(normalizeWord);
  const n = t.length;
  const m = s.length;
  if (n * m > 4_000_000) return greedyAlign(t, s, script);

  // dp[i][j]: min edit cost aligning transcript[0..i) with script[0..j)
  // dir: 1 = diag (match/sub), 2 = down (unmatched transcript), 3 = right (unmatched script)
  const dp: Float64Array[] = [];
  const dir: Uint8Array[] = [];
  for (let i = 0; i <= n; i++) {
    dp.push(new Float64Array(m + 1));
    dir.push(new Uint8Array(m + 1));
  }
  for (let i = 0; i <= n; i++) {
    dp[i]![0] = i;
    dir[i]![0] = 2;
  }
  for (let j = 0; j <= m; j++) {
    dp[0]![j] = j;
    dir[0]![j] = 3;
  }
  dir[0]![0] = 0;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const diag = dp[i - 1]![j - 1]! + (t[i - 1] === s[j - 1] ? 0 : 2);
      const down = dp[i - 1]![j]! + 1;
      const right = dp[i]![j - 1]! + 1;
      let best = diag;
      let d = 1;
      if (down < best) {
        best = down;
        d = 2;
      }
      if (right < best) {
        best = right;
        d = 3;
      }
      dp[i]![j] = best;
      dir[i]![j] = d;
    }
  }

  const matches: AlignmentResult['matches'] = [];
  const unmatchedTranscript: number[] = [];
  const unmatchedScript: string[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const d = dir[i]![j]!;
    if (d === 1) {
      if (t[i - 1] === s[j - 1]) {
        matches.push({ transcriptIndex: i - 1, scriptIndex: j - 1 });
      } else {
        unmatchedTranscript.push(i - 1);
        unmatchedScript.push(script[j - 1]!);
      }
      i--;
      j--;
    } else if (d === 2) {
      unmatchedTranscript.push(i - 1);
      i--;
    } else {
      unmatchedScript.push(script[j - 1]!);
      j--;
    }
  }
  return {
    matches: matches.reverse(),
    unmatchedTranscript: unmatchedTranscript.reverse(),
    unmatchedScript: unmatchedScript.reverse(),
  };
}

const GREEDY_WINDOW = 3;

/** Bounded-memory fallback: advance both cursors, jumping to the nearest matching pair within a small window. */
function greedyAlign(t: string[], s: string[], script: string[]): AlignmentResult {
  const matches: AlignmentResult['matches'] = [];
  const unmatchedTranscript: number[] = [];
  const unmatchedScript: string[] = [];
  let i = 0;
  let j = 0;
  while (i < t.length && j < s.length) {
    if (t[i] === s[j]) {
      matches.push({ transcriptIndex: i, scriptIndex: j });
      i++;
      j++;
      continue;
    }
    let bestDi = -1;
    let bestDj = -1;
    let bestCost = Infinity;
    for (let di = 0; di <= GREEDY_WINDOW && i + di < t.length; di++) {
      for (let dj = 0; dj <= GREEDY_WINDOW && j + dj < s.length; dj++) {
        if (di === 0 && dj === 0) continue;
        if (t[i + di] === s[j + dj]) {
          const cost = di + dj;
          if (cost < bestCost) {
            bestCost = cost;
            bestDi = di;
            bestDj = dj;
          }
        }
      }
    }
    if (bestDi >= 0) {
      for (let k = 0; k < bestDi; k++) unmatchedTranscript.push(i + k);
      for (let k = 0; k < bestDj; k++) unmatchedScript.push(script[j + k]!);
      i += bestDi;
      j += bestDj;
      matches.push({ transcriptIndex: i, scriptIndex: j });
      i++;
      j++;
    } else {
      unmatchedTranscript.push(i);
      unmatchedScript.push(script[j]!);
      i++;
      j++;
    }
  }
  while (i < t.length) unmatchedTranscript.push(i++);
  while (j < s.length) unmatchedScript.push(script[j++]!);
  return { matches, unmatchedTranscript, unmatchedScript };
}

export interface ScriptSegmentResult {
  segments: Segment[];
  warnings: string[];
  stats: {
    matched: number;
    unmatchedTranscript: number;
    unmatchedScript: number;
  };
}

/**
 * Regroup the transcript into caption segments whose boundaries follow the
 * script's own lines (overriding period-based splitting). Word timestamps
 * still come from the transcript; script words without a spoken counterpart
 * are dropped with a warning, and spoken words between script lines attach
 * to the previous line.
 */
export function segmentsFromScript(
  transcript: Word[],
  scriptText: string,
  defaults: { style: SegmentStyle; mode: DisplayMode },
  makeId: () => string = defaultId,
): ScriptSegmentResult {
  const lines = scriptText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) {
    return {
      segments: [],
      warnings: ['The script is empty.'],
      stats: { matched: 0, unmatchedTranscript: 0, unmatchedScript: 0 },
    };
  }

  const scriptWordsByLine = lines.map((line) => line.split(/\s+/).filter(Boolean));
  const flatScript = scriptWordsByLine.flat();
  const align = alignSequences(
    transcript.map((w) => w.text),
    flatScript,
  );

  // Which transcript indices belong to which script line.
  const matchedPerLine: number[][] = lines.map(() => []);
  const matchedLineByTi = new Map<number, number>();
  let offset = 0;
  const lineRanges = scriptWordsByLine.map((ws) => {
    const r = { start: offset, end: offset + ws.length };
    offset += ws.length;
    return r;
  });
  for (const match of align.matches) {
    const lineIdx = lineRanges.findIndex((r) => match.scriptIndex >= r.start && match.scriptIndex < r.end);
    if (lineIdx >= 0) {
      matchedPerLine[lineIdx]!.push(match.transcriptIndex);
      matchedLineByTi.set(match.transcriptIndex, lineIdx);
    }
  }

  // Spoken words not in the script attach to the line of the previous matched word.
  const sortedTi = [...matchedLineByTi.keys()].sort((a, b) => a - b);
  for (const ti of align.unmatchedTranscript) {
    let lineIdx = 0;
    for (let k = sortedTi.length - 1; k >= 0; k--) {
      if (sortedTi[k]! < ti) {
        lineIdx = matchedLineByTi.get(sortedTi[k]!)!;
        break;
      }
    }
    matchedPerLine[lineIdx]!.push(ti);
  }

  const warnings: string[] = [];
  const segments: Segment[] = [];
  for (let li = 0; li < lines.length; li++) {
    const wordIds = matchedPerLine[li]!
      .sort((a, b) => a - b)
      .map((ti) => transcript[ti]!.id);
    if (wordIds.length === 0) {
      warnings.push(`Line ${li + 1} ("${lines[li]}") has no matching transcript words and was skipped.`);
      continue;
    }
    const times = wordIds.map((id) => transcript.find((w) => w.id === id)!);
    segments.push({
      id: makeId(),
      wordIds,
      start: Math.min(...times.map((w) => w.start)),
      end: Math.max(...times.map((w) => w.end)),
      mode: defaults.mode,
      style: { ...defaults.style },
      // No box: the segment follows the project's default box until moved.
    });
  }
  if (align.unmatchedScript.length > 0) {
    const shown = align.unmatchedScript.slice(0, 10).join(', ');
    warnings.push(
      `${align.unmatchedScript.length} script word(s) not found in the transcript: ${shown}${align.unmatchedScript.length > 10 ? '…' : ''}`,
    );
  }
  return {
    segments,
    warnings,
    stats: {
      matched: align.matches.length,
      unmatchedTranscript: align.unmatchedTranscript.length,
      unmatchedScript: align.unmatchedScript.length,
    },
  };
}

/**
 * Alignment seam. The client-side script aligner above already implements it
 * (timestamps come from the word-level transcript). A future Whisper-based
 * forced aligner (e.g. ffmpeg's native `whisper` filter, server-side) returns
 * the same `Word[]` shape and plugs in without touching callers.
 */
export interface WordAligner {
  align(scriptText: string, mediaRef: string): Promise<Word[]>;
}
