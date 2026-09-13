import { useEffect, useRef } from 'react';
import type React from 'react';
import { useEditorStore } from '../store/editorStore';
import { CaptionTrack } from './CaptionTrack';
import { TimeRuler } from './TimeRuler';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Main video timeline with a caption track above it and a scrubbing playhead. */
export function Timeline() {
  const duration = useEditorStore((s) => s.videoMeta?.duration ?? 0);
  const videoName = useEditorStore((s) => s.videoMeta?.name);
  const zoom = useEditorStore((s) => s.zoom);
  const playhead = useEditorStore((s) => s.playhead);
  const setZoom = useEditorStore((s) => s.setZoom);
  const seek = useEditorStore((s) => s.seek);
  const setSelection = useEditorStore((s) => s.setSelection);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrubbing = useRef(false);

  // Keep the playhead in view while playing.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !useEditorStore.getState().isPlaying) return;
    const x = playhead * zoom;
    const viewLeft = el.scrollLeft;
    const viewRight = el.scrollLeft + el.clientWidth;
    if (x < viewLeft + 60 || x > viewRight - 60) {
      el.scrollLeft = x - el.clientWidth / 2;
    }
  }, [playhead, zoom]);

  if (duration === 0) {
    return <div className="timeline timeline-empty">Load a video to see the timeline.</div>;
  }

  const timeAtEvent = (e: React.PointerEvent): number => {
    const el = scrollRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left + el.scrollLeft;
    return clamp(x / zoom, 0, duration);
  };

  const onScrubStart = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    scrubbing.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    seek(timeAtEvent(e));
  };
  const onScrubMove = (e: React.PointerEvent) => {
    if (scrubbing.current) seek(timeAtEvent(e));
  };
  const onScrubEnd = (e: React.PointerEvent) => {
    scrubbing.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // capture may already be released
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    setZoom(zoom * (e.deltaY < 0 ? 1.25 : 1 / 1.25));
  };

  const onTrackBackground = (e: React.PointerEvent) => {
    // clicking empty caption-track space deselects; the pointer handlers also scrub
    if (e.target === e.currentTarget) setSelection([]);
  };

  return (
    <div className="timeline">
      <div className="timeline-header">
        <span className="timeline-title">Timeline</span>
        <div className="timeline-zoom">
          <button onClick={() => setZoom(zoom / 1.25)} title="Zoom out">−</button>
          <span className="timeline-zoom-label">{Math.round(zoom)} px/s</span>
          <button onClick={() => setZoom(zoom * 1.25)} title="Zoom in">+</button>
        </div>
      </div>
      <div className="timeline-scroll" ref={scrollRef} onWheel={onWheel}>
        <div className="timeline-content" style={{ width: Math.max(400, duration * zoom) }}>
          <TimeRuler
            duration={duration}
            zoom={zoom}
            onPointerDown={onScrubStart}
            onPointerMove={onScrubMove}
            onPointerUp={onScrubEnd}
          />
          <CaptionTrack
            onPointerDown={(e) => {
              onTrackBackground(e);
              onScrubStart(e);
            }}
            onPointerMove={onScrubMove}
            onPointerUp={onScrubEnd}
          />
          <div
            className="video-strip"
            onPointerDown={onScrubStart}
            onPointerMove={onScrubMove}
            onPointerUp={onScrubEnd}
          >
            <span className="track-label">Video</span>
            <span className="video-strip-name">{videoName}</span>
          </div>
          <div className="playhead" style={{ left: playhead * zoom }}>
            <span className="playhead-cap" />
          </div>
        </div>
      </div>
    </div>
  );
}
