import { DEFAULT_MAX_LINES, LINE_HEIGHT } from './style';
import type {
  Box,
  DisplayEvent,
  DisplayMode,
  ExportLine,
  ExportSegment,
  ExportWord,
  Segment,
  Word,
} from './types';
import { wrapWords, type MeasureFn } from './wrapping';

/** How many lines of the box are on screen at once — its height, and its page size. */
export function pageSizeOf(box: Box): number {
  const lines = Math.floor(box.maxLines);
  // A box that arrived without the field (an untyped caller, a stale spec) would
  // otherwise make every page index NaN and silently drop each caption.
  return Number.isFinite(lines) && lines >= 1 ? lines : DEFAULT_MAX_LINES;
}

/** Left edge of a line of `lineWidthPx` inside the box, from its `alignX`. */
function lineLeft(box: Box, lineWidthPx: number): number {
  if (box.alignX === 'left') return box.x;
  if (box.alignX === 'right') return box.x + box.width - lineWidthPx;
  // Centred: every line of a page shares the box's centre line.
  return box.x + (box.width - lineWidthPx) / 2;
}

/**
 * Where a page of `count` lines starts inside the box, from its `alignY`. A
 * full page has no slack and sits at the box top whatever the alignment; only a
 * short page (the tail of a segment, or a segment that wraps to fewer lines
 * than the box is tall) is moved down within it.
 */
function pageOffset(box: Box, count: number, lineHeight: number): number {
  const slack = (pageSizeOf(box) - count) * lineHeight;
  if (box.alignY === 'middle') return slack / 2;
  if (box.alignY === 'bottom') return slack;
  return 0;
}

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
  const lineHeight = seg.style.fontSize * LINE_HEIGHT;
  const pageSize = pageSizeOf(box);
  const pageOf = (lineIndex: number) => Math.floor(lineIndex / pageSize);
  const pageTopY = (page: number) =>
    box.y + pageOffset(box, Math.min(pageSize, lines.length - page * pageSize), lineHeight);

  const exportLines: ExportLine[] = lines.map((line, lineIndex) => {
    const left = lineLeft(box, line.widthPx);
    const exportWords = placements
      .filter((p) => p.lineIndex === lineIndex)
      .map((p) => ({
        text: p.word.text,
        start: p.word.start,
        end: p.word.end,
        centerX: left + p.leftPx + p.widthPx / 2,
        charStart: p.charStart,
        charEnd: p.charEnd,
      }));
    return {
      // `topY` is where the line sits on ITS page, so the page's own first line
      // lands on the page's top edge and the lines below keep the pitch.
      text: line.text,
      topY: pageTopY(pageOf(lineIndex)) + (lineIndex % pageSize) * lineHeight,
      centerX: left + line.widthPx / 2,
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
 * - line mode: one event per word showing the PAGE that word sits on — up to
 *   `box.maxLines` consecutive wrapped lines joined with '\n' — anchored at the
 *   page's top edge.
 * - highlight mode: like line mode, but the spoken word's [charStart, charEnd)
 *   span is flagged `highlighted`.
 *
 * Showing a whole page rather than just the current word's own line keeps the
 * text from re-breaking under the reader: within a page the words only gain the
 * highlight as they are spoken. A page is only turned once playback reaches a
 * word past its last line, and every page is anchored at the same x, so the
 * turn swaps the text in place instead of moving it sideways. Vertically each
 * page starts at the box top under the default `top` alignment, so nothing
 * moves then either; `middle`/`bottom` deliberately shift only a SHORT page —
 * a full one leaves no slack to distribute.
 *
 * All events are clipped to [seg.start, seg.end]; fully clipped words drop out.
 */
export function eventsForSegment(
  seg: Segment,
  layout: Pick<ExportSegment, 'mode' | 'style' | 'box' | 'lines'>,
): DisplayEvent[] {
  const { mode, style, box, lines } = layout;
  // Each event carries the page it was built from: the overlap rule at the end
  // needs to know whether two simultaneous events would draw the same text.
  const built: { event: DisplayEvent; page: number }[] = [];
  const pageSize = pageSizeOf(box);

  // One page of text plus the spans indexing into it, built once per page: the
  // same page is re-emitted for each of its words, and rebuilding the string
  // (and every span offset) per word would be pointless work.
  const pages: { text: string; y: number; spans: { charStart: number; charEnd: number; word: ExportWord }[] }[] = [];
  for (let from = 0; from < lines.length; from += pageSize) {
    const pageLines = lines.slice(from, from + pageSize);
    let base = 0;
    const spans: { charStart: number; charEnd: number; word: ExportWord }[] = [];
    for (const line of pageLines) {
      for (const lw of line.words) {
        spans.push({ charStart: lw.charStart + base, charEnd: lw.charEnd + base, word: lw });
      }
      base += line.text.length + 1; // +1 for the joining '\n'
    }
    pages.push({
      text: pageLines.map((l) => l.text).join('\n'),
      y: pageLines[0]?.topY ?? box.y, // a page's first line sits on the page top
      spans,
    });
  }

  lines.forEach((line, lineIndex) => {
    const pageIndex = Math.floor(lineIndex / pageSize);
    const page = pages[pageIndex];
    if (!page) return;
    for (const w of line.words) {
      const start = Math.max(w.start, seg.start);
      const end = Math.min(w.end, seg.end);
      if (end <= start) continue;
      if (mode === 'word') {
        built.push({
          page: pageIndex,
          event: {
            start,
            end,
            text: w.text,
            x: w.centerX,
            y: line.topY,
            boxWidth: box.width,
            alignX: box.alignX,
            words: [{ charStart: 0, charEnd: w.text.length, highlighted: false }],
            style,
            mode,
          },
        });
      } else {
        const isHighlight = mode === 'highlight';
        built.push({
          page: pageIndex,
          event: {
            start,
            end,
            text: page.text,
            // The box's left edge, not the line's: the overlay lays the page's
            // lines out across `boxWidth` with `alignX`, which is what lets a
            // line shorter than the box sit left, centred or right within it.
            x: box.x,
            y: page.y,
            boxWidth: box.width,
            alignX: box.alignX,
            words: page.spans.map((s) => ({
              charStart: s.charStart,
              charEnd: s.charEnd,
              highlighted: isHighlight && s.word === w,
            })),
            style,
            mode,
          },
        });
      }
    }
  });

  built.sort((a, b) => a.event.start - b.event.start);

  // Hold each event on screen through the pause that follows it (commas,
  // breaths) instead of blanking between words — a gap with no active event
  // reads as a flicker. The last event holds until the segment ends, so a
  // trimmed segment's tail stays captioned. Ends are only ever extended.
  for (let i = 0; i < built.length - 1; i++) {
    const cur = built[i]!;
    const next = built[i + 1]!;
    if (cur.event.end < next.event.start) {
      cur.event.end = next.event.start;
    } else if (cur.event.end > next.event.start && cur.page !== next.page) {
      // Two words whose timings overlap AND that sit on different pages: both
      // events would be active at once and the overlay would paint one page's
      // text on top of the other's. libass draws only the later dialogue, so
      // the earlier page is cut short here to keep preview and export alike.
      cur.event.end = next.event.start;
    }
  }
  const last = built[built.length - 1];
  if (last && last.event.end < seg.end) last.event.end = seg.end;
  return built.map((b) => b.event);
}

export type { Box, DisplayEvent, DisplayMode, ExportLine, ExportSegment, Word };
