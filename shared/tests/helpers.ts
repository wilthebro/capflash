import { DEFAULT_MAX_LINES } from '../src/style';
import type { Box } from '../src/types';

/**
 * A box with the shipped defaults (two lines, centred, top-anchored), so a test
 * only states the geometry it actually cares about. Override `maxLines` or the
 * alignment to exercise paging and placement within the box.
 */
export function makeBox(x: number, y: number, width: number, over: Partial<Box> = {}): Box {
  return { x, y, width, maxLines: DEFAULT_MAX_LINES, alignX: 'center', alignY: 'top', ...over };
}
