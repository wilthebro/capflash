import type { Box, SegmentStyle } from './types';

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
