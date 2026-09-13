import type { Box, SegmentStyle } from './types';

/** Line height as a factor of fontSize — single constant used by preview, wrapping and ASS export. */
export const LINE_HEIGHT = 1.2;

export const DEFAULT_STYLE: SegmentStyle = {
  fontFamily: 'Arial',
  fontSize: 64,
  color: '#FFFFFF',
  outlineColor: '#000000',
  outlineWidth: 4,
  highlightColor: '#FFD400',
};

/** Centered near the bottom of a 1080x1920 portrait video (TikTok-style placement). */
export const DEFAULT_BOX: Box = { x: 120, y: 1420, width: 840 };

let idCounter = 0;

/** Environment-free id generator (works in browser, Node and tests). */
export function defaultId(): string {
  idCounter += 1;
  return `id-${Date.now().toString(36)}-${idCounter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
