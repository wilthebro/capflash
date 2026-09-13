import { LINE_HEIGHT } from './style';
import type {
  Box,
  DisplayEvent,
  DisplayMode,
  ExportLine,
  ExportSegment,
  Segment,
  Word,
} from './types';
import { wrapWords, type MeasureFn } from './wrapping';

/**
 * Resolve a segment to absolute video-px geometry plus its display events.
 * The measure function is injected so this module stays DOM-free (canvas
 * measureText in the client, mock functions in tests).
 *
 * A segment without its own `box` follows `defaultBox` — that is what makes the
 * global caption position live: segments only store a box once they are moved
 * individually. The returned layout always carries a resolved, concrete box.
 */
export function resolveSegmentLayout(
  seg: Segment,
  words: Word[],
  measure: MeasureFn,
  defaultBox: Box,
): ExportSegment {
  const box = seg.box ?? defaultBox;
  const { lines, placements } = wrapWords(words, box.width, measure);
  const centerX = box.x + box.width / 2;
  const exportLines: ExportLine[] = lines.map((line, lineIndex) => {
    const exportWords = placements
      .filter((p) => p.lineIndex === lineIndex)
      .map((p) => ({
        text: p.word.text,
        start: p.word.start,
        end: p.word.end,
        centerX: centerX - line.widthPx / 2 + p.leftPx + p.widthPx / 2,
        charStart: p.charStart,
        charEnd: p.charEnd,
      }));
    return {
      text: line.text,
      topY: box.y + lineIndex * seg.style.fontSize * LINE_HEIGHT,
      centerX,
      widthPx: line.widthPx,
      words: exportWords,
    };
  });
  const layout = { mode: seg.mode, style: seg.style, box, lines: exportLines };
  return { ...layout, events: eventsForSegment(seg, layout) };
}

/**
 * The single source of truth for what is visible when. Both the client
 * overlay and the ASS generator render from this event list.
 *
 * - word mode: one event per word at the word's center.
 * - line mode: one event per word showing the segment's WHOLE wrapped block
 *   (its lines joined with '\n') anchored at the block's top edge.
 * - highlight mode: like line mode, but the spoken word's [charStart, charEnd)
 *   span is flagged `highlighted`.
 *
 * Line/highlight show the whole block for every word rather than just the
 * current word's own line: the text then never changes shape or moves mid
 * segment — only the highlight travels — which is what stops wrapped captions
 * jumping as playback crosses a line break.
 *
 * All events are clipped to [seg.start, seg.end]; fully clipped words drop out.
 */
export function eventsForSegment(
  seg: Segment,
  layout: Pick<ExportSegment, 'mode' | 'style' | 'lines'>,
): DisplayEvent[] {
  const { mode, style, lines } = layout;
  const events: DisplayEvent[] = [];

  // Every line shares the box's centerX, so the block anchors like a single
  // line: top-center at the first line's position (== box.y).
  const blockX = lines[0]?.centerX ?? 0;
  const blockY = lines[0]?.topY ?? 0;
  const blockText = lines.map((l) => l.text).join('\n');
  // Where each line starts in blockText, so per-word spans stay valid there.
  const lineBase: number[] = [];
  let base = 0;
  for (const line of lines) {
    lineBase.push(base);
    base += line.text.length + 1; // +1 for the joining '\n'
  }
  const spans = lines.flatMap((line, i) =>
    line.words.map((lw) => ({
      charStart: lw.charStart + lineBase[i]!,
      charEnd: lw.charEnd + lineBase[i]!,
      word: lw,
    })),
  );

  lines.forEach((line) => {
    for (const w of line.words) {
      const start = Math.max(w.start, seg.start);
      const end = Math.min(w.end, seg.end);
      if (end <= start) continue;
      if (mode === 'word') {
        events.push({
          start,
          end,
          text: w.text,
          x: w.centerX,
          y: line.topY,
          words: [{ charStart: 0, charEnd: w.text.length, highlighted: false }],
          style,
          mode,
        });
      } else {
        const isHighlight = mode === 'highlight';
        events.push({
          start,
          end,
          text: blockText,
          x: blockX,
          y: blockY,
          words: spans.map((s) => ({
            charStart: s.charStart,
            charEnd: s.charEnd,
            highlighted: isHighlight && s.word === w,
          })),
          style,
          mode,
        });
      }
    }
  });

  events.sort((a, b) => a.start - b.start);

  // Hold each event on screen through the pause that follows it (commas,
  // breaths) instead of blanking between words — a gap with no active event
  // reads as a flicker. The last event holds until the segment ends, so a
  // trimmed segment's tail stays captioned. Ends are only ever extended.
  for (let i = 0; i < events.length - 1; i++) {
    const cur = events[i]!;
    const next = events[i + 1]!;
    if (cur.end < next.start) cur.end = next.start;
  }
  const last = events[events.length - 1];
  if (last && last.end < seg.end) last.end = seg.end;
  return events;
}

/** Line count for a box with the given style (used to draw the box's height). */
export function lineCountFor(words: Word[], box: Box, measure: MeasureFn): number {
  const { lines } = wrapWords(words, box.width, measure);
  return Math.max(1, lines.length);
}

export type { Box, DisplayEvent, DisplayMode, ExportLine, ExportSegment, Word };
