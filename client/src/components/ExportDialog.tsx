import { useEffect, useRef, useState } from 'react';
import { getRenderStatus, renderDownloadUrl, startRender, type RenderStatus } from '../lib/api';
import { buildRenderSpec } from '../lib/project';
import { useEditorStore } from '../store/editorStore';

type Phase = 'closed' | 'preparing' | 'uploading' | 'rendering' | 'done' | 'error';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Runs the render on the local server: spec + video upload, progress polling, download. */
export function ExportDialog({ open, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('closed');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [jobId, setJobId] = useState('');
  const runningRef = useRef(false);
  const pollRef = useRef<number | null>(null);

  const stopPoll = () => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    if (open && !runningRef.current) {
      runningRef.current = true;
      void run();
    }
    if (!open) {
      stopPoll();
      setPhase('closed');
      runningRef.current = false;
      setProgress(0);
      setError('');
      setJobId('');
    }
    return stopPoll;
  }, [open]);

  const run = async () => {
    setPhase('preparing');
    setProgress(0);
    setError('');
    setJobId('');
    try {
      await document.fonts.ready;
      const videoFile = useEditorStore.getState().videoFile;
      if (!videoFile) throw new Error('Load a video first.');
      const spec = buildRenderSpec();
      if (spec.segments.length === 0) throw new Error('Nothing to render — no caption segments.');
      setPhase('uploading');
      const id = await startRender(spec, videoFile);
      setJobId(id);
      setPhase('rendering');
      poll(id);
    } catch (err) {
      setPhase('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const poll = (id: string) => {
    let failures = 0;
    pollRef.current = window.setInterval(async () => {
      let st: RenderStatus;
      try {
        st = await getRenderStatus(id);
        failures = 0;
      } catch {
        failures++;
        if (failures > 30) {
          stopPoll();
          setPhase('error');
          setError('Lost contact with the server.');
        }
        return;
      }
      setProgress(st.progress);
      if (st.status === 'done') {
        stopPoll();
        setPhase('done');
      } else if (st.status === 'error') {
        stopPoll();
        setPhase('error');
        setError(st.error ?? 'Render failed.');
      }
    }, 500);
  };

  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2 className="modal-title">Export captioned video</h2>
        {(phase === 'preparing' || phase === 'uploading') && (
          <p className="modal-status">{phase === 'preparing' ? 'Resolving caption layout…' : 'Uploading video…'}</p>
        )}
        {phase === 'rendering' && (
          <>
            <p className="modal-status">Rendering with ffmpeg…</p>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <p className="modal-percent">{Math.round(progress * 100)}%</p>
          </>
        )}
        {phase === 'done' && (
          <>
            <p className="modal-status">✅ Render complete.</p>
            <a className="button download-button" href={renderDownloadUrl(jobId)} download>
              Download MP4
            </a>
          </>
        )}
        {phase === 'error' && (
          <>
            <p className="modal-status">❌ Render failed</p>
            <pre className="modal-error">{error}</pre>
          </>
        )}
        <div className="modal-actions">
          {phase !== 'rendering' && (
            <button className="button ghost" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
