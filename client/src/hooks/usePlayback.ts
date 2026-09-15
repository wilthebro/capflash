import { useEffect, useRef } from 'react';
import type React from 'react';
import type { DisplayEvent } from '@captioner/shared';
import { useEditorStore } from '../store/editorStore';
import { useSegmentLayouts } from './useSegmentLayouts';

/**
 * Fingerprint of everything the overlay actually renders. Comparing the whole
 * event list by reference would false-positive every frame (the store rebuilds
 * the objects), so the key has to cover every field CaptionOverlay reads —
 * including the ones that don't move anything: an earlier version keyed on
 * `start:end:text:y` alone, so re-styling a caption (mode, color, weight) at
 * unchanged geometry left the overlay rendering the old objects forever.
 *
 * `alignX`/`boxWidth` are in for the same reason: a block event's x is the
 * box's left edge, so changing the alignment alone moves nothing in the
 * geometry above and would otherwise never reach the overlay.
 */
function eventKey(events: readonly DisplayEvent[]): string {
  return events
    .map((e) => {
      const st = e.style;
      const spans = e.words.map((w) => `${w.charStart}-${w.charEnd}-${w.highlighted ? 1 : 0}`).join(',');
      return [
        e.start,
        e.end,
        e.mode,
        e.text,
        e.x,
        e.y,
        e.alignX,
        e.boxWidth,
        spans,
        st.fontFamily,
        st.fontSize,
        st.fontWeight,
        st.color,
        st.outlineColor,
        st.outlineWidth,
        st.highlightColor,
      ].join(':');
    })
    .join('|');
}

/**
 * rAF loop reading video.currentTime (`timeupdate` fires at ~4 Hz — far too
 * coarse for word-level captions). Writes playhead every frame but only
 * updates the active caption state when the active event set changes.
 */
export function usePlayback(videoRef: React.RefObject<HTMLVideoElement | null>): void {
  const { events } = useSegmentLayouts();
  const lastKey = useRef('');

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const v = videoRef.current;
      if (v) {
        const t = v.currentTime;
        useEditorStore.getState().setPlayhead(t);
        const active: typeof events = [];
        for (const e of events) {
          if (e.start > t) break;
          if (t < e.end) active.push(e);
        }
        const key = eventKey(active);
        if (key !== lastKey.current) {
          lastKey.current = key;
          useEditorStore.getState().setActiveEvents(active);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [events, videoRef]);
}
