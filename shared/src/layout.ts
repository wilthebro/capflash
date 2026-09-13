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
 * - line mode: one event per word showing the whole line at the line's center.
 * - highlight mode: like line mode, but the spoken word's [charStart, charEnd)
 *   span is flagged `highlighted`.
 * All events are clipped to [seg.start, seg.end]; fully clipped words drop out.
 */
export function eventsForSegment(
  seg: Segment,
  layout: Pick<ExportSegment, 'mode' | 'style' | 'lines'>,
): DisplayEvent[] {
  const { mode, style, lines } = layout;
  const events: DisplayEvent[] = [];
  for (const line of lines) {
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
          text: line.text,
          x: line.centerX,
          y: line.topY,
          words: line.words.map((lw) => ({
            charStart: lw.charStart,
            charEnd: lw.charEnd,
            highlighted: isHighlight && lw === w,
          })),
          style,
          mode,
        });
      }
    }
  }
  return events.sort((a, b) => a.start - b.start);
}

/** Line count for a box with the given style (used to draw the box's height). */
export function lineCountFor(words: Word[], box: Box, measure: MeasureFn): number {
  const { lines } = wrapWords(words, box.width, measure);
  return Math.max(1, lines.length);
}

export type { Box, DisplayEvent, DisplayMode, ExportLine, ExportSegment, Word };
