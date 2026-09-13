import { useEffect, useState } from 'react';
import { useWhisper, useWhisperModelInfo } from '../hooks/useWhisper';
import {
  WHISPER_LANGUAGES,
  WHISPER_MODELS,
  formatBytes,
  loadWhisperPrefs,
  saveWhisperPrefs,
  whisperModel,
} from '../lib/whisper/models';
import { WhisperCancelled, cancelWhisper, runWhisper } from '../lib/whisper/whisperClient';
import { useEditorStore } from '../store/editorStore';
import { useWhisperStore } from '../store/whisperStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

const RUNNING = new Set(['decoding', 'loading', 'warmup', 'transcribing']);

/** Transcribe the loaded video's audio in the browser, then hand the words to the editor. */
export function TranscribeDialog({ open, onClose }: Props) {
  const { status, capabilities, modelInfo, result, busy } = useWhisper();
  const prefs = loadWhisperPrefs();
  const [modelId, setModelId] = useState(prefs.modelId);
  const [language, setLanguage] = useState(prefs.language);
  const info = useWhisperModelInfo(modelId);
  const videoMeta = useEditorStore((s) => s.videoMeta);
  const videoFile = useEditorStore((s) => s.videoFile);
  const addNotice = useEditorStore((s) => s.addNotice);

  const entry = whisperModel(modelId);
  const running = RUNNING.has(status.phase);

  // A finished run keeps its result visible when the dialog is reopened.
  useEffect(() => {
    if (open && !busy && status.phase !== 'done') useWhisperStore.getState().resetRun();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    saveWhisperPrefs({ modelId, language });
  }, [modelId, language]);

  if (!open) return null;

  const start = () => {
    if (!videoFile) return;
    void runWhisper({ file: videoFile, modelId, language: entry?.englishOnly ? undefined : language }).catch(
      (err: unknown) => {
        if (!(err instanceof WhisperCancelled)) addNotice(`Transcription failed: ${String(err)}`);
      },
    );
  };

  const stop = () => {
    cancelWhisper();
    onClose();
  };

  const useTranscript = () => {
    if (!result) return;
    const editor = useEditorStore.getState();
    const warnings = editor.commitTranscript(result.words);
    const words = editor.words.length;
    const segments = editor.segments.length;
    addNotice(`Transcript applied: ${words} words in ${segments} segments.`);
    warnings.forEach((w) => addNotice(`⚠ ${w}`));

    // A pasted script defines the caption lines; align it against the fresh timings.
    if (editor.scriptText.trim()) {
      const scriptResult = editor.importScript(editor.scriptText);
      addNotice(
        `Script applied: ${scriptResult.stats.matched} words matched.`,
      );
      scriptResult.warnings.forEach((w) => addNotice(`⚠ ${w}`));
    }
    onClose();
  };

  const downloadJson = () => {
    if (!result) return;
    const payload = result.words.map(({ text, start, end }) => ({ text, start, end }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${useEditorStore.getState().projectName || 'transcript'}.transcript.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const covered = result && result.words.length > 0 ? result.words[result.words.length - 1]!.end - result.words[0]!.start : 0;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2 className="modal-title">Transcribe audio</h2>

        <p className="panel-hint transcribe-capability">
          {capabilities ? capabilities.statusLine : 'Checking what this browser can run…'}
          {capabilities?.note && <span className="transcribe-note"> {capabilities.note}</span>}
        </p>

        {!running && status.phase !== 'done' && (
          <>
            <div className="field">
              <label className="field-label" htmlFor="whisper-model">
                Model
              </label>
              <select id="whisper-model" value={modelId} onChange={(e) => setModelId(e.target.value)}>
                {WHISPER_MODELS.map((m) => {
                  const live = modelInfo[m.id];
                  const bytes = live?.totalBytes ? live.totalBytes : m.approxBytes;
                  return (
                    <option key={m.id} value={m.id}>
                      {m.label} — {formatBytes(bytes)}
                      {live?.cached ? ' · cached' : ''}
                    </option>
                  );
                })}
              </select>
              <p className="panel-hint">
                {info?.cached
                  ? 'Already downloaded — this run starts instantly.'
                  : 'The model downloads once and is cached by the browser for later runs.'}
              </p>
            </div>

            {!entry?.englishOnly && (
              <div className="field">
                <label className="field-label" htmlFor="whisper-language">
                  Spoken language
                </label>
                <select id="whisper-language" value={language} onChange={(e) => setLanguage(e.target.value)}>
                  {WHISPER_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
                <p className="panel-hint">
                  Whisper does not detect the language by itself — pick the one being spoken. English-only
                  models skip this.
                </p>
              </div>
            )}

            {videoMeta && (
              <p className="script-stats">
                {videoMeta.name} · {videoMeta.duration.toFixed(1)}s
              </p>
            )}
            {!videoFile && <p className="panel-warn">Load a video first — its audio track is transcribed.</p>}

            <div className="modal-actions">
              <button className="button ghost" onClick={onClose}>
                Close
              </button>
              <button className="button primary" onClick={start} disabled={!videoFile}>
                Transcribe
              </button>
            </div>
          </>
        )}

        {running && (
          <>
            <p className="modal-status">{phaseText(status.phase)}</p>
            {status.phase === 'loading' && (
              <>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.round((status.downloadProgress ?? 0) * 100)}%` }}
                  />
                </div>
                <p className="modal-percent">
                  {status.downloadProgress === null
                    ? 'Preparing…'
                    : `${Math.round(status.downloadProgress * 100)}%`}
                  {status.downloadFile ? ` · ${status.downloadFile}` : ''}
                </p>
              </>
            )}
            {status.phase === 'transcribing' && (
              <p className="modal-percent">{status.elapsedSec.toFixed(0)}s elapsed</p>
            )}
            <div className="modal-actions">
              <button className="button ghost" onClick={stop}>
                Cancel
              </button>
            </div>
          </>
        )}

        {status.phase === 'error' && (
          <>
            <p className="modal-status">❌ Transcription failed</p>
            <pre className="modal-error">{status.error}</pre>
            <div className="modal-actions">
              <button className="button ghost" onClick={onClose}>
                Close
              </button>
              <button className="button" onClick={() => useWhisperStore.getState().resetRun()}>
                Try again
              </button>
            </div>
          </>
        )}

        {status.phase === 'done' && result && (
          <>
            <p className="modal-status">
              ✅ {result.words.length} words
              {videoMeta ? ` · covers ${covered.toFixed(1)}s of ${videoMeta.duration.toFixed(1)}s` : ''}
            </p>
            <p className="transcribe-preview">{result.rawText.slice(0, 400)}{result.rawText.length > 400 ? '…' : ''}</p>
            {result.warnings.map((w, i) => (
              <p key={i} className="panel-warn">
                {w}
              </p>
            ))}
            <p className="panel-hint">
              Applying replaces the current transcript and re-splits the captions into segments.
            </p>
            <div className="modal-actions">
              <button className="button ghost" onClick={() => useWhisperStore.getState().resetRun()}>
                Start over
              </button>
              <button className="button ghost" onClick={downloadJson}>
                Download JSON
              </button>
              <button className="button primary" onClick={useTranscript}>
                Use transcript
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function phaseText(phase: string): string {
  switch (phase) {
    case 'decoding':
      return 'Reading the audio track…';
    case 'loading':
      return 'Loading the speech model…';
    case 'warmup':
      return 'Warming up…';
    case 'transcribing':
      return 'Transcribing…';
    default:
      return 'Working…';
  }
}
