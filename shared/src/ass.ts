import { highlightFontSize, LINE_HEIGHT } from './style';
import type { DisplayEvent, FontMetrics, RenderSpec, SegmentStyle } from './types';

/** #RRGGBB -> &H00BBGGRR (ASS colors are little-endian BGR). */
export function hexToAssBgr(hex: string): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) throw new Error(`Invalid hex color: ${hex}`);
  const rgb = m[1]!;
  const r = rgb.slice(0, 2);
  const g = rgb.slice(2, 4);
  const b = rgb.slice(4, 6);
  return `&H00${b}${g}${r}`.toUpperCase();
}

/** Seconds -> H:MM:SS.cc. Start timestamps floor, end timestamps ceil (1 cs overlaps are harmless — the later event wins). */
export function assTimestamp(sec: number, ceil = false): string {
  const cs = Math.max(0, ceil ? Math.ceil(sec * 100) : Math.floor(sec * 100));
  const totalSec = Math.floor(cs / 100);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor(totalSec / 60) % 60;
  const s = totalSec % 60;
  const cc = cs % 100;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cc).padStart(2, '0')}`;
}

/** Escape ASS override-significant characters in caption text. */
export function escapeAssText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}');
}

/**
 * Convert an outline width in video px to ASS \bord units. libass follows the
 * VSFilter convention of scaling border widths relative to a 288px-tall
 * reference, so units = px * 288 / PlayResY. Centralized here — the one place
 * to adjust if empirical verification disagrees.
 */
export function assOutlineUnits(outlineWidthPx: number, playResY: number): number {
  return Math.max(0, Math.round((outlineWidthPx * 288) / playResY));
}

/**
 * Convert an editor font size (video px, CSS semantics — the em size) into the
 * number the ASS `Fontsize` field needs for libass to draw the same glyphs at
 * the same size.
 *
 * The two disagree about what the number means. CSS `font-size: N` sets the em
 * box to N; libass instead scales the face so that `usWinAscent + usWinDescent`
 * equals N (see FontMetrics). Montserrat's win pair is 1.562 em, so a raw 64
 * used to draw at 64/1.562 = 41px — the "text too small, margins too large"
 * that the preview/export mismatch was. Multiplying by the same ratio puts the
 * two back in agreement, and it has to be per-face: Bebas Neue (1.300) needs a
 * visibly different correction, so a single constant would fix one font and
 * quietly break the next.
 *
 * Without metrics — an unparsed face, or a spec built before this existed —
 * the size passes through unchanged rather than being guessed at.
 */
export function assFontSize(cssPx: number, metrics?: FontMetrics): number {
  if (!metrics) return cssPx;
  const { unitsPerEm, winAscent, winDescent } = metrics;
  const win = winAscent + winDescent;
  if (!(unitsPerEm > 0) || !(win > 0)) return cssPx;
  return (cssPx * win) / unitsPerEm;
}

const round1 = (n: number): string => String(Math.round(n * 10) / 10);

/**
 * The `\pos` anchor and `\an` code for an event. Word mode draws a single word
 * centred on its own centre. Line/highlight mode draws a page of lines that the
 * box's `alignX` places — which is exactly what `\an7`/`\an8`/`\an9` mean, so
 * the box's alignment travels into the export as the line's own alignment
 * instead of every line being centred on one point.
 */
function anchorFor(e: DisplayEvent): { x: number; an: number } {
  if (e.mode === 'word') return { x: e.x, an: 8 };
  if (e.alignX === 'left') return { x: e.x, an: 7 }; // event x is the box's left edge
  if (e.alignX === 'right') return { x: e.x + e.boxWidth, an: 9 };
  return { x: e.x + e.boxWidth / 2, an: 8 };
}

/**
 * Build the Text field for one event, breaking wrapped blocks into lines and
 * inserting override tags at the flagged spans.
 *
 * Line/highlight events carry the segment's whole block, so its lines are
 * split on '\n' and every line after the first is prefixed `\N{\pos(cx,y_i)\an8}`:
 * the dialogue's own prefix anchors line 0, and each further line re-anchors
 * itself at its line's top edge — the same pitch the overlay's line box uses
 * (fontSize * LINE_HEIGHT). A later `\pos` simply moves the pen, so no repeated
 * `\an8` would strictly be needed, but each line carries its own for clarity.
 *
 * The spoken word in 'highlight' mode is recolored, forced bold and enlarged —
 * the same emphasis the preview overlay draws (\fs is absolute, so the base
 * size and weight are restored right after the span).
 */
function buildEventText(e: DisplayEvent, metrics?: FontMetrics): string {
  const { style } = e;
  const hl = hexToAssBgr(style.highlightColor);
  const base = hexToAssBgr(style.color);
  // Both sizes need the conversion, not just the style's: \fs is absolute, so
  // the enlarged highlight and the size restored after it are independent of
  // the Style line's own Fontsize.
  const hlSize = Math.round(assFontSize(highlightFontSize(style.fontSize), metrics));
  const baseSize = Math.round(assFontSize(style.fontSize, metrics));
  const baseBold = style.fontWeight >= 700 ? 1 : 0;
  const isHighlight = e.mode === 'highlight';
  const { x: ax, an } = anchorFor(e);

  let out = '';
  let lineStart = 0;
  e.text.split('\n').forEach((line, i) => {
    if (i > 0) {
      const y = e.y + i * style.fontSize * LINE_HEIGHT;
      out += `\\N{\\pos(${round1(ax)},${round1(y)})\\an${an}}`;
    }
    const esc = escapeAssText(line);
    if (!isHighlight) {
      out += esc;
    } else {
      // Spans were resolved against the whole block; wrapping never splits a
      // word, so each lies within one line and is applied with the line's start
      // subtracted. (Pre-existing quirk: they index the *escaped* line, so a
      // word containing '{' or '\' shifts the spans after it on that line.)
      let pos = 0;
      for (const w of e.words) {
        const start = Math.max(w.charStart - lineStart, 0);
        const end = Math.min(w.charEnd - lineStart, line.length);
        if (end <= start) continue; // belongs to another line
        out += esc.slice(pos, start);
        if (w.highlighted) {
          out += `{\\c${hl}\\b1\\fs${hlSize}}${esc.slice(start, end)}{\\c${base}\\b${baseBold}\\fs${baseSize}}`;
        } else {
          out += esc.slice(start, end);
        }
        pos = end;
      }
      out += esc.slice(pos);
    }
    lineStart += line.length + 1; // +1 for the '\n' that followed it
  });
  return out;
}

/**
 * Generate a complete ASS document for the render spec. The editor has already
 * computed every line break and position, so libass performs no wrapping and
 * minimal layout (WrapStyle 2, hard breaks, per-event \pos with \an8).
 */
export function generateAss(spec: RenderSpec): string {
  const { video, segments } = spec;
  // One face can back several styles, so resolve its metrics once by family.
  // A family with no record keeps the raw size (see assFontSize).
  const metricsByFamily = new Map<string, FontMetrics>();
  for (const f of spec.fonts) if (f.metrics) metricsByFamily.set(f.family, f.metrics);
  const metricsOf = (family: string): FontMetrics | undefined => metricsByFamily.get(family);

  const out: string[] = [];
  out.push('[Script Info]');
  out.push('; Generated by captioner');
  out.push('ScriptType: v4.00+');
  out.push(`PlayResX: ${Math.round(video.width)}`);
  out.push(`PlayResY: ${Math.round(video.height)}`);
  out.push('ScaledBorderAndShadow: yes');
  out.push('WrapStyle: 2');
  out.push('');

  out.push('[V4+ Styles]');
  out.push(
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
  );
  const styles = new Map<string, { name: string; style: SegmentStyle }>();
  let styleCounter = 0;
  const styleKey = (st: SegmentStyle) =>
    `${st.fontFamily}|${st.fontSize}|${st.fontWeight}|${st.color}|${st.outlineColor}|${st.outlineWidth}|${st.highlightColor}`;
  const styleNameOf = (st: SegmentStyle): string => {
    const key = styleKey(st);
    let entry = styles.get(key);
    if (!entry) {
      entry = { name: `st${styleCounter++}`, style: st };
      styles.set(key, entry);
    }
    return entry.name;
  };

  const allEvents = segments
    .flatMap((seg) => seg.events.map((e) => ({ e, seg })))
    .sort((a, b) => a.e.start - b.e.start);

  // Collect styles first so [V4+ Styles] precedes [Events].
  for (const { e } of allEvents) styleNameOf(e.style);

  for (const { name, style: st } of styles.values()) {
    out.push(
      `Style: ${name},${st.fontFamily},${Math.round(assFontSize(st.fontSize, metricsOf(st.fontFamily)))},${hexToAssBgr(st.color)},${hexToAssBgr(
        st.highlightColor,
      )},${hexToAssBgr(st.outlineColor)},&H80000000,${st.fontWeight >= 700 ? -1 : 0},0,0,0,100,100,0,0,1,${assOutlineUnits(
        st.outlineWidth,
        video.height,
      )},0,8,0,0,0,1`,
    );
  }
  out.push('');

  out.push('[Events]');
  out.push('Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text');
  for (const { e } of allEvents) {
    const name = styleNameOf(e.style);
    const { x: ax, an } = anchorFor(e);
    const prefix = `{\\pos(${round1(ax)},${round1(e.y)})\\an${an}}`;
    out.push(
      `Dialogue: 0,${assTimestamp(e.start)},${assTimestamp(e.end, true)},${name},,0,0,0,,${prefix}${buildEventText(e, metricsOf(e.style.fontFamily))}`,
    );
  }
  return out.join('\n') + '\n';
}
