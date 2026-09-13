import { useRef } from 'react';
import type React from 'react';
import { useEditorStore } from '../store/editorStore';

export type SegmentDragMode = 'move' | 'resize-start' | 'resize-end';

interface DragState {
  mode: SegmentDragMode;
  startX: number;
  origStart: number;
  origEnd: number;
  wordTimes: { start: number; end: number }[];
}

const SNAP_PX = 6;

/**
 * Pointer-capture drag/resize for a caption block on the timeline.
 * Move shifts the segment AND its words; resize trims the segment only.
 * Edges snap to word boundaries within SNAP_PX (Alt disables snapping and
 * neighbor clamping uses live store state).
 */
export function useSegmentDrag(segmentId: string) {
  const zoom = useEditorStore((s) => s.zoom);
  const drag = useRef<DragState | null>(null);

  const onPointerDown = (e: React.PointerEvent, mode: SegmentDragMode) => {
    if (e.button !== 0) return;
    const s = useEditorStore.getState();
    const seg = s.segments.find((x) => x.id === segmentId);
    if (!seg) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = {
      mode,
      startX: e.clientX,
      origStart: seg.start,
      origEnd: seg.end,
      wordTimes: seg.wordIds
        .map((id) => s.words.find((w) => w.id === id))
        .filter((w) => w !== undefined)
        .map((w) => ({ start: w!.start, end: w!.end })),
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const s = useEditorStore.getState();
    const seg = s.segments.find((x) => x.id === segmentId);
    const duration = s.videoMeta?.duration ?? 0;
    if (!seg || duration === 0) return;
    const dt = (e.clientX - d.startX) / zoom;
    const sorted = s.segments.slice().sort((a, b) => a.start - b.start);
    const idx = sorted.findIndex((x) => x.id === segmentId);
    const prev = idx > 0 ? sorted[idx - 1] : undefined;
    const next = idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : undefined;
    const snapTargets = d.wordTimes.flatMap((wt) => [wt.start, wt.end]);
    const snapPx = SNAP_PX / zoom;

    if (d.mode === 'move') {
      let newStart = d.origStart + dt;
      newStart = Math.max(0, prev ? prev.end : 0, newStart);
      newStart = Math.min(newStart, (next ? next.start : duration) - (d.origEnd - d.origStart));
      if (!e.altKey) {
        const snap = snapTargets.find((t) => Math.abs(t - newStart) <= snapPx);
        if (snap !== undefined) newStart = snap;
      }
      s.moveSegment(segmentId, newStart - d.origStart);
    } else {
      let t = d.mode === 'resize-start' ? d.origStart + dt : d.origEnd + dt;
      t = Math.max(0, Math.min(duration, t));
      if (!e.altKey) {
        const snap = snapTargets.find((x) => Math.abs(x - t) <= snapPx);
        if (snap !== undefined) t = snap;
      }
      if (d.mode === 'resize-start' && prev) t = Math.max(t, prev.end);
      if (d.mode === 'resize-end' && next) t = Math.min(t, next.start);
      s.resizeSegment(segmentId, d.mode === 'resize-start' ? 'start' : 'end', t);
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
