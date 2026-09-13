import { useEffect, useRef } from 'react';
import type React from 'react';
import { useEditorStore } from '../store/editorStore';
import { useSegmentLayouts } from './useSegmentLayouts';

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
        const key = active.map((e) => `${e.start}:${e.end}:${e.text}:${e.y}`).join('|');
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
