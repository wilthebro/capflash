import { useRef } from 'react';
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
 * width. Writes to the selected segment's box, or the default box when
 * nothing is selected. Deltas are divided by the preview scale so the
 * stored values stay in video px.
 */
export function useDragBox() {
  const drag = useRef<DragState | null>(null);

  const onPointerDown = (e: React.PointerEvent, mode: 'move' | 'resize', scale: number) => {
    if (e.button !== 0) return;
    const s = useEditorStore.getState();
    const seg =
      s.selection.length === 1 ? s.segments.find((x) => x.id === s.selection[0]) : undefined;
    const origBox = seg ? seg.box : s.defaultBox;
    drag.current = { mode, startX: e.clientX, startY: e.clientY, origBox: { ...origBox }, segmentId: seg?.id ?? null, scale };
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const s = useEditorStore.getState();
    const dx = (e.clientX - d.startX) / d.scale;
    const dy = (e.clientY - d.startY) / d.scale;
    const video = s.videoMeta;
    const maxX = video ? video.width - d.origBox.width : Infinity;
    const maxY = video ? video.height - 40 : Infinity;
    if (d.mode === 'move') {
      const box: Box = {
        x: Math.max(0, Math.min(maxX, d.origBox.x + dx)),
        y: Math.max(0, Math.min(maxY, d.origBox.y + dy)),
        width: d.origBox.width,
      };
      applyBox(s, d.segmentId, box);
    } else {
      const box: Box = {
        ...d.origBox,
        width: Math.max(MIN_WIDTH, d.origBox.width + dx),
      };
      if (video) box.width = Math.min(box.width, video.width - box.x);
      applyBox(s, d.segmentId, box);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    drag.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // capture may already be released
    }
  };

  return { onPointerDown, onPointerMove, onPointerUp };
}

function applyBox(
  s: ReturnType<typeof useEditorStore.getState>,
  segmentId: string | null,
  box: Box,
): void {
  if (segmentId) s.updateSegment(segmentId, { box });
  else s.updateDefaultBox(box);
}
