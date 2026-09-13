import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../store/editorStore';
import { usePlayback } from '../hooks/usePlayback';
import { CaptionOverlay } from './CaptionOverlay';
import { BoundingBox } from './BoundingBox';

export function VideoPreview() {
  const videoUrl = useEditorStore((s) => s.videoUrl);
  const videoMeta = useEditorStore((s) => s.videoMeta);
  const seekNonce = useEditorStore((s) => s.seekNonce);
  const seekTime = useEditorStore((s) => s.seekTime);
  const togglePlayNonce = useEditorStore((s) => s.togglePlayNonce);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  usePlayback(videoRef);

  // Seek requests from the timeline / keyboard.
  useEffect(() => {
    const v = videoRef.current;
    if (v && seekNonce > 0) {
      v.currentTime = Math.min(seekTime, v.duration || 0);
    }
  }, [seekNonce, seekTime]);

  // Play/pause requests (space bar, toolbar button).
  useEffect(() => {
    if (togglePlayNonce === 0) return;
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  }, [togglePlayNonce]);

  // Keep the preview scale in sync with the available width.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !videoMeta) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w > 0 && videoMeta.width > 0) setScale(w / videoMeta.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [videoMeta]);

  const syncPlaying = (playing: boolean) => {
    if (useEditorStore.getState().isPlaying !== playing) {
      useEditorStore.getState().setPlaying(playing);
    }
  };

  if (!videoUrl || !videoMeta) {
    return (
      <div className="preview-empty">
        <div className="preview-empty-icon">🎬</div>
        <p>Load a video to get started.</p>
      </div>
    );
  }

  const stageW = Math.round(videoMeta.width * scale);
  const stageH = Math.round(videoMeta.height * scale);

  return (
    <div className="preview-container" ref={containerRef}>
      <div className="preview-stage" style={{ width: stageW, height: stageH }}>
        <video
          ref={videoRef}
          src={videoUrl}
          onClick={() => useEditorStore.setState((s) => ({ togglePlayNonce: s.togglePlayNonce + 1 }))}
          onPlay={() => syncPlaying(true)}
          onPause={() => syncPlaying(false)}
          onEnded={() => syncPlaying(false)}
        />
        <div
          className="overlay-scale"
          style={{
            width: videoMeta.width,
            height: videoMeta.height,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <CaptionOverlay />
          <BoundingBox scale={scale} />
        </div>
      </div>
    </div>
  );
}
