import { defaultId } from './style';
import type { DisplayMode, Segment, SegmentStyle, Word } from './types';

export interface ReassignDefaults {
  style: SegmentStyle;
  mode: DisplayMode;
}

export interface ReassignOptions {
  /** Consecutive new words closer than this join one new segment (default 0.3s). */
  newWordGapSec?: number;
}

export interface ReassignResult {
  segments: Segment[];
  /** Segments removed because none of their words survived the edit. */
  droppedEmpty: number;
}

const EPS = 1e-6;

/**
 * Re-derive segment membership after the transcript was edited, keeping every
 * segment's id, mode, style and box so hand-styled captions survive the edit.
 *
 * Rules:
 *  - A word keeps the segment that owned it (`wordIds`), even if the edit moved
 *    its timings — fixing a timestamp must not silently restyle a caption.
 *  - A word nobody owned (newly added) joins the segment whose original time
 *    range it overlaps, so a word added at either edge of a caption stays with
 *    it; otherwise it starts a new segment, grouped with other unowned
 *    neighbours within `newWordGapSec`.
 *  - Segment bounds are always recomputed from the words they contain, and
 *    segments are returned sorted by start.
 */
export function reassignSegments(
  segments: readonly Segment[],
  words: readonly Word[],
  defaults: ReassignDefaults,
  makeId: () => string = defaultId,
  opts?: ReassignOptions,
): ReassignResult {
  const newWordGapSec = opts?.newWordGapSec ?? 0.3;
  const sorted = [...words].sort((a, b) => a.start - b.start);
  const byId = new Map(sorted.map((w) => [w.id, w] as const));

  // Which segment owned each word before the edit (first owner wins).
  const ownerOf = new Map<string, string>();
  for (const seg of segments) {
    for (const id of seg.wordIds) {
      if (!ownerOf.has(id)) ownerOf.set(id, seg.id);
    }
  }

  const memberIds = new Map<string, string[]>(segments.map((s) => [s.id, [] as string[]]));
  const unowned: Word[] = [];
  for (const w of sorted) {
    const owner = ownerOf.get(w.id);
    if (owner !== undefined && memberIds.has(owner)) {
      memberIds.get(owner)!.push(w.id);
      continue;
    }
    const host = segments.find((s) => w.start <= s.end + EPS && w.end >= s.start - EPS);
    if (host) memberIds.get(host.id)!.push(w.id);
    else unowned.push(w);
  }

  const out: Segment[] = [];
  let droppedEmpty = 0;
  for (const seg of segments) {
    const members = memberIds
      .get(seg.id)!
      .map((id) => byId.get(id)!)
      .sort((a, b) => a.start - b.start);
    if (members.length === 0) {
      droppedEmpty++;
      continue;
    }
    out.push({
      id: seg.id,
      wordIds: members.map((w) => w.id),
      start: Math.min(...members.map((w) => w.start)),
      end: Math.max(...members.map((w) => w.end)),
      mode: seg.mode,
      style: { ...seg.style },
      // Only carry a box the segment actually owned; linked ones stay linked.
      ...(seg.box ? { box: { ...seg.box } } : {}),
    });
  }

  // Newly added words outside every segment: grouped runs become new segments
  // with the current defaults.
  let run: Word[] = [];
  const flush = () => {
    if (run.length === 0) return;
    out.push({
      id: makeId(),
      wordIds: run.map((w) => w.id),
      start: run[0]!.start,
      end: run[run.length - 1]!.end,
      mode: defaults.mode,
      style: { ...defaults.style },
      // No box: the segment follows the project's default box until moved.
    });
    run = [];
  };
  for (const w of unowned) {
    if (run.length > 0 && w.start - run[run.length - 1]!.end > newWordGapSec) flush();
    run.push(w);
  }
  flush();

  out.sort((a, b) => a.start - b.start);
  return { segments: out, droppedEmpty };
}
