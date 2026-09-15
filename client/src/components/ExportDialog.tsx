import { useEffect, useRef, useState } from 'react';
import type { RenderSpec } from '@captioner/shared';
import {
  fetchHealth,
  getRenderStatus,
  renderDownloadUrl,
  startRender,
  type RenderStatus,
} from '../lib/api';
import { bundledFontsReady } from '../lib/bundledFonts';
import { buildRenderSpec } from '../lib/project';
import {
  cancelBrowserRender,
  isRenderEngineReady,
  renderInBrowser,
} from '../lib/render/browserRender';
import { useEditorStore } from '../store/editorStore';

type Phase = 'closed' | 'preparing' | 'rendering' | 'done' | 'error';
type Engine = 'browser' | 'server';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Exports by rendering in the page (ffmpeg.wasm, nothing uploaded, nothing to
 * install) and falls back to the local server when it has a usable ffmpeg —
 * which is roughly twice as fast, so it is offered as a switch rather than
 * being the default. Both engines are handed the same RenderSpec, so the
 * geometry and the burned-in result are identical by construction.
 */
export function ExportDialog({ open, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('closed');
  const [engine, setEngine] = useState<Engine>('browser');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [substituted, setSubstituted] = useState<string[]>([]);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [serverReady, setServerReady] = useState(false);
  const [jobId, setJobId] = useState('');

  const runningRef = useRef(false);
  const pollRef = useRef<number | null>(null);
  const urlRef = useRef('');
  // Kept so "use the server instead" can restart without rebuilding the spec.
  const jobRef = useRef<{ video: File; spec: RenderSpec } | null>(null);

  const stopPoll = () => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const releaseUrl = () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = '';
  };

  useEffect(() => {
    if (open && !runningRef.current) {
      runningRef.current = true;
      void run();
    }
    if (!open) {
      stopPoll();
      void cancelBrowserRender();
      releaseUrl();
      setPhase('closed');
      runningRef.current = false;
      setProgress(0);
      setError('');
      setNote('');
      setSubstituted([]);
      setDownloadUrl('');
      setJobId('');
    }
    return stopPoll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const run = async () => {
    setPhase('preparing');
    setProgress(0);
    setError('');
    setNote('');
    setSubstituted([]);
    setDownloadUrl('');
    setJobId('');
    try {
      // Both matter before the spec is built: document fonts for the faces the
      // user loaded from disk, bundledFontsReady for the shipped ones — either
      // way the spec's font bytes have to be in hand before it is serialized.
      await Promise.all([document.fonts.ready, bundledFontsReady()]);
      const videoFile = useEditorStore.getState().videoFile;
      if (!videoFile) throw new Error('Load a video first.');
      const spec = buildRenderSpec();
      if (spec.segments.length === 0) throw new Error('Nothing to render — no caption segments.');
      jobRef.current = { video: videoFile, spec };

      const health = await fetchHealth().catch(() => null);
      const canUseServer = health?.ffmpeg.found === true && health.ffmpeg.libass === true;
      setServerReady(canUseServer);

      await runBrowser();
    } catch (err) {
      setPhase('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  /** Render in the page. Falls back to the server if the core cannot start. */
  const runBrowser = async () => {
    const job = jobRef.current;
    if (!job) return;
    setEngine('browser');
    setPhase('rendering');
    setProgress(0);
    setNote(
      isRenderEngineReady()
        ? 'Rendering in your browser — nothing is uploaded.'
        : 'Loading the render engine (about 32 MB, downloaded once)…',
    );
    try {
      const { blob, substitutedFonts } = await renderInBrowser(job.spec, job.video, setProgress);
      releaseUrl();
      urlRef.current = URL.createObjectURL(blob);
      setDownloadUrl(urlRef.current);
      setSubstituted(substitutedFonts);
      setPhase('done');
    } catch (err) {
      if (!serverReady) throw err;
      setNote('The in-browser renderer could not start — using the local server instead.');
      await runServer();
    }
  };

  const runServer = async () => {
    const job = jobRef.current;
    if (!job) return;
    setEngine('server');
    setPhase('rendering');
    setProgress(0);
    const id = await startRender(job.spec, job.video);
    setJobId(id);
    poll(id);
  };

  /** Switch an in-flight browser render over to the faster server one. */
  const switchToServer = async () => {
    await cancelBrowserRender();
    setProgress(0);
    try {
      await runServer();
    } catch (err) {
      setPhase('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const poll = (id: string) => {
    stopPoll();
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

  const percent = Math.round(progress * 100);

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2 className="modal-title">Export captioned video</h2>
        {phase === 'preparing' && <p className="modal-status">Resolving caption layout…</p>}
        {phase === 'rendering' && (
          <>
            <p className="modal-status">
              {engine === 'browser' ? 'Rendering in your browser…' : 'Rendering on the local server…'}
            </p>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${percent}%` }} />
            </div>
            <p className="modal-percent">{percent}%</p>
            {note && <p className="panel-hint">{note}</p>}
            {engine === 'browser' && serverReady && (
              <button className="button ghost" onClick={() => void switchToServer()}>
                Use the server instead (faster)
              </button>
            )}
          </>
        )}
        {phase === 'done' && (
          <>
            <p className="modal-status">
              ✅ Render complete{engine === 'browser' ? ' — in your browser' : ''}.
            </p>
            {engine === 'browser' ? (
              <a className="button download-button" href={downloadUrl} download="captioned.mp4">
                Download MP4
              </a>
            ) : (
              <a className="button download-button" href={renderDownloadUrl(jobId)} download>
                Download MP4
              </a>
            )}
            {substituted.length > 0 && (
              <p className="panel-warn">
                {substituted.join(', ')} {substituted.length === 1 ? 'is a system font' : 'are system fonts'} the
                in-browser renderer cannot read, so {substituted.length === 1 ? 'it was' : 'they were'} drawn in
                Montserrat. Upload the font file, or export on the server to keep the original face.
              </p>
            )}
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
