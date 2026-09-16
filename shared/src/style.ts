import type { Box, SegmentStyle, VideoMeta } from './types';

/** Line height as a factor of fontSize — single constant used by preview, wrapping and ASS export. */
export const LINE_HEIGHT = 1.2;

/** Bundled with the client (Montserrat Regular + ExtraBold, SIL OFL) so the default look is identical everywhere. */
export const DEFAULT_FONT_FAMILY = 'Montserrat';

export const DEFAULT_STYLE: SegmentStyle = {
  fontFamily: DEFAULT_FONT_FAMILY,
  fontSize: 64,
  fontWeight: 800,
  color: '#FFFFFF',
  outlineColor: '#000000',
  outlineWidth: 4,
  highlightColor: '#FFD400',
};

/** Hard ceiling on the box's line count — shared by the drag handle and the Lines control. */
export const MAX_LINES = 8;

/** Box height in lines out of the box: two stacked lines, with longer segments paging. */
export const DEFAULT_MAX_LINES = 2;

/**
 * Centered near the bottom of a 1080x1920 portrait video (TikTok-style
 * placement). `center`/`top` alignment reproduces the original look exactly, so
 * projects created before the box had alignment render unchanged.
 */
export const DEFAULT_BOX: Box = {
  x: 120,
  y: 1420,
  width: 840,
  maxLines: DEFAULT_MAX_LINES,
  alignX: 'center',
  alignY: 'top',
};

/**
 * The resolution `DEFAULT_BOX` and `DEFAULT_STYLE` were designed against. Every
 * other video measures itself against these two numbers — see `defaultBoxFor`.
 */
export const REFERENCE_VIDEO = { width: 1080, height: 1920 } as const;

type VideoSize = Pick<VideoMeta, 'width' | 'height'>;

/**
 * The default caption box for a given video.
 *
 * `DEFAULT_BOX` is absolute pixels tuned to one resolution, which silently
 * broke every other one: at 576x1024 its `y` of 1420 sits 396px below the frame
 * and its right edge lands 384px past it, so freshly transcribed captions were
 * laid out off-screen — invisible in the preview, and clipped out of the export
 * the same way (libass gets the real dimensions as `PlayRes`). The box was also
 * unreachable to drag back, since the preview stage clips its overflow.
 *
 * Scaling per axis rather than by a single factor keeps the proportions on
 * non-9:16 video: the box is 78% of the frame's width but 82% of its height, so
 * one factor would misplace one of the two. Both axes always land in frame
 * ((120+840)/1080 = 0.889, (1420 + 2*76.8)/1920 = 0.82).
 */
export function defaultBoxFor(video: VideoSize): Box {
  const sx = video.width / REFERENCE_VIDEO.width;
  const sy = video.height / REFERENCE_VIDEO.height;
  if (!(sx > 0) || !(sy > 0)) return { ...DEFAULT_BOX };
  return {
    x: Math.round(DEFAULT_BOX.x * sx),
    y: Math.round(DEFAULT_BOX.y * sy),
    width: Math.round(DEFAULT_BOX.width * sx),
    maxLines: DEFAULT_BOX.maxLines,
    alignX: DEFAULT_BOX.alignX,
    alignY: DEFAULT_BOX.alignY,
  };
}

/**
 * The default font size for a given video, on the same reasoning as
 * `defaultBoxFor` — scaled by height, which is what governs how large text
 * reads on screen. Without this a 576x1024 video would draw its captions at
 * 64px, roughly 1.9x too large for the frame.
 */
export function defaultFontSizeFor(video: VideoSize): number {
  const sy = video.height / REFERENCE_VIDEO.height;
  if (!(sy > 0)) return DEFAULT_STYLE.fontSize;
  return Math.max(1, Math.round(DEFAULT_STYLE.fontSize * sy));
}

const clamp = (n: number, lo: number, hi: number): number => Math.min(Math.max(n, lo), hi);

/**
 * Pull a box back inside the frame. The single authority for that clamp, so a
 * typed-in value and a dragged one land in the same place.
 *
 * `lineHeightPx` is the style's own `fontSize * LINE_HEIGHT`; the box does not
 * carry a font size, so the caller supplies it. `maxLines` sets how tall the box
 * is, and therefore how far down it can start.
 *
 * A frame too short for even one page of lines leaves no valid position, so the
 * box pins to the top rather than going negative — visible-but-overflowing beats
 * off-screen.
 */
export function fitBoxToVideo(box: Box, video: VideoSize, lineHeightPx: number): Box {
  const maxLines = Number.isFinite(box.maxLines) && box.maxLines >= 1 ? Math.floor(box.maxLines) : DEFAULT_MAX_LINES;
  const height = maxLines * Math.max(0, lineHeightPx);
  const width = clamp(box.width, 1, Math.max(1, video.width));
  return {
    ...box,
    x: Math.round(clamp(box.x, 0, Math.max(0, video.width - width))),
    y: Math.round(clamp(box.y, 0, Math.max(0, video.height - height))),
    width: Math.round(width),
    maxLines,
  };
}

/**
 * The spoken word in 'highlight' mode is drawn slightly larger and at least
 * bold, so it reads as emphasized even when the base style is already heavy.
 * Shared by the preview overlay and the ASS generator to keep them identical.
 */
export function highlightFontSize(base: number): number {
  return Math.max(base + 6, Math.round(base * 1.1));
}

export function highlightFontWeight(base: number): number {
  return Math.max(base, 700);
}

let idCounter = 0;

/** Environment-free id generator (works in browser, Node and tests). */
export function defaultId(): string {
  idCounter += 1;
  return `id-${Date.now().toString(36)}-${idCounter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
