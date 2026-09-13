import { useRef, useState } from 'react';
import type React from 'react';
import type { Box } from '@captioner/shared';
import { useEditorStore } from '../store/editorStore';

interface DragState {
  mode: 'move' | 'resize';
  startX: number;
  startY: number;
  origBox: Box;
  segmentId: string | null;
  scale: number;
}

const MIN_WIDTH = 40;

/**
 * Pointer drag for the bounding box on the preview: moves x/y or resizes
 * width. Deltas are divided by the preview scale so the stored values stay in
 * video px.
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
      const maxY = video ? video.height - 40 : Infinity;
      return {
        x: Math.max(0, Math.min(maxX, d.origBox.x + dx)),
        y: Math.max(0, Math.min(maxY, d.origBox.y + dy)),
        width: d.origBox.width,
      };
    }
    const box: Box = {
      ...d.origBox,
      width: Math.max(MIN_WIDTH, d.origBox.width + dx),
    };
    if (video) box.width = Math.min(box.width, video.width - box.x);
    return box;
  };

  const onPointerDown = (e: React.PointerEvent, mode: 'move' | 'resize', scale: number) => {
    if (e.button !== 0) return;
    const s = useEditorStore.getState();
    const seg =
      s.selection.length === 1 ? s.segments.find((x) => x.id === s.selection[0]) : undefined;
    const origBox = seg?.box ?? s.defaultBox;
    drag.current = { mode, startX: e.clientX, startY: e.clientY, origBox: { ...origBox }, segmentId: seg?.id ?? null, scale };
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
    if (box.x !== d.origBox.x || box.y !== d.origBox.y || box.width !== d.origBox.width) {
      const s = useEditorStore.getState();
      if (d.segmentId) s.updateSegment(d.segmentId, { box });
      else s.updateDefaultBox(box);
    }
    setLiveBox(null);
  };

  return { liveBox, onPointerDown, onPointerMove, onPointerUp };
}
