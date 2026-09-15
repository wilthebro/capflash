import { useRef, useState } from 'react';
import type React from 'react';
import { MAX_LINES, type Box } from '@captioner/shared';
import { useEditorStore } from '../store/editorStore';

interface DragState {
  mode: 'move' | 'resize' | 'resize-lines';
  startX: number;
  startY: number;
  origBox: Box;
  segmentId: string | null;
  scale: number;
  /** One line's height in video px — the step the bottom handle snaps to. */
  lineHeight: number;
}

const MIN_WIDTH = 40;

/**
 * Pointer drag for the bounding box on the preview: moves x/y, resizes width,
 * or steps the box's line count (its height). Deltas are divided by the preview
 * scale so the stored values stay in video px.
 *
 * Dragging with nothing selected moves the global box (every caption linked to
 * it follows). Dragging a selected segment gives that segment its own box —
 * which is also what un-links it, so a drag always means "pin this one here".
 *
 * The drag is previewed in local state (`liveBox`) and written to the store
 * once, on release. Writing on every pointermove re-wrapped and re-laid out
 * every segment on each move — plus the panels that subscribe to them — which
 * is what made dragging stall.
 */
export function useDragBox() {
  const drag = useRef<DragState | null>(null);
  const [liveBox, setLiveBox] = useState<Box | null>(null);

  /** Box for the pointer's current position, with the same clamps as before. */
  const boxAt = (d: DragState, clientX: number, clientY: number): Box => {
    const video = useEditorStore.getState().videoMeta;
    const dx = (clientX - d.startX) / d.scale;
    const dy = (clientY - d.startY) / d.scale;
    if (d.mode === 'move') {
      const maxX = video ? video.width - d.origBox.width : Infinity;
      // The box's real height, not a guess: a taller box must still sit inside
      // the frame rather than being pushed off the bottom of it.
      const maxY = video ? video.height - d.origBox.maxLines * d.lineHeight : Infinity;
      return {
        ...d.origBox,
        x: Math.max(0, Math.min(maxX, d.origBox.x + dx)),
        y: Math.max(0, Math.min(maxY, d.origBox.y + dy)),
      };
    }
    if (d.mode === 'resize-lines') {
      // Snap to whole lines: the value is a page size, so half a line would be
      // meaningless, and dragging feels like it clicks between sizes. The box
      // is also capped at what still fits below its top edge.
      const room = video ? Math.floor((video.height - d.origBox.y) / d.lineHeight) : MAX_LINES;
      const ceiling = Math.max(1, Math.min(MAX_LINES, room));
      const lines = d.origBox.maxLines + Math.round(dy / d.lineHeight);
      return { ...d.origBox, maxLines: Math.max(1, Math.min(ceiling, lines)) };
    }
    const box: Box = {
      ...d.origBox,
      width: Math.max(MIN_WIDTH, d.origBox.width + dx),
    };
    if (video) box.width = Math.min(box.width, video.width - box.x);
    return box;
  };

  const onPointerDown = (
    e: React.PointerEvent,
    mode: DragState['mode'],
    scale: number,
    lineHeight: number,
  ) => {
    if (e.button !== 0) return;
    const s = useEditorStore.getState();
    const seg =
      s.selection.length === 1 ? s.segments.find((x) => x.id === s.selection[0]) : undefined;
    const origBox = seg?.box ?? s.defaultBox;
    drag.current = { mode, startX: e.clientX, startY: e.clientY, origBox: { ...origBox }, segmentId: seg?.id ?? null, scale, lineHeight };
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    setLiveBox(boxAt(d, e.clientX, e.clientY));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // capture may already be released
    }
    if (!d) return;
    // Re-derive from the release point: a press-and-release with no move must
    // not commit anything (it would pin a linked segment for a stray click).
    const box = boxAt(d, e.clientX, e.clientY);
    if (
      box.x !== d.origBox.x ||
      box.y !== d.origBox.y ||
      box.width !== d.origBox.width ||
      box.maxLines !== d.origBox.maxLines
    ) {
      const s = useEditorStore.getState();
      if (d.segmentId) s.updateSegment(d.segmentId, { box });
      else s.updateDefaultBox(box);
    }
    setLiveBox(null);
  };

  return { liveBox, onPointerDown, onPointerMove, onPointerUp };
}
