import { useState } from 'react';
import { useEditorStore, type ScriptImportResult } from '../store/editorStore';

interface Props {
  onTranscribe: () => void;
}

/**
 * Plaintext script import: the script's own line breaks define caption
 * segments, overriding period-based splitting. Word timestamps come from the
 * transcript — either a loaded JSON file or Whisper's own transcription, so a
 * script can be used with no JSON transcript at all.
 */
export function ScriptImport({ onTranscribe }: Props) {
  const importScript = useEditorStore((s) => s.importScript);
  const words = useEditorStore((s) => s.words);
  const scriptText = useEditorStore((s) => s.scriptText);
  const setScriptText = useEditorStore((s) => s.setScriptText);
  const hasVideo = useEditorStore((s) => s.videoMeta !== null);
  const [result, setResult] = useState<ScriptImportResult | null>(null);

  const apply = () => {
    if (!scriptText.trim()) return;
    setResult(importScript(scriptText));
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setScriptText(await file.text());
  };

  const noTranscript = words.length === 0;

  return (
    <section className="panel">
      <h2 className="panel-title">Script (optional)</h2>
      <p className="panel-hint">
        Upload a plaintext script to make each of its lines one caption segment — periods in the
        transcript will no longer split lines. Timings come from the transcript.
      </p>
      <textarea
        className="script-textarea"
        placeholder={'One caption line per line…\n\nExample:\nHello world\nThis stays together'}
        value={scriptText}
        onChange={(e) => setScriptText(e.target.value)}
      />
      <div className="button-row">
        <label className="button ghost">
          Open .txt
          <input type="file" accept=".txt,text/plain" hidden onChange={(e) => void onFile(e)} />
        </label>
        {noTranscript ? (
          <button className="button" onClick={onTranscribe} disabled={!hasVideo}>
            Transcribe audio
          </button>
        ) : (
          <button className="button" onClick={apply} disabled={!scriptText.trim()}>
            Apply script
          </button>
        )}
      </div>
      {noTranscript && (
        <p className="panel-hint">
          {hasVideo
            ? 'No transcript yet. Paste your script, then transcribe the video: Whisper supplies the word timings and this script defines the caption lines.'
            : 'Load a video, then transcribe it to get word timings — or load a transcript JSON.'}
        </p>
      )}
      {result && (
        <div className="script-result">
          <p className="script-stats">
            {result.stats.matched} words matched · {result.stats.unmatchedTranscript} spoken words
            not in script · {result.stats.unmatchedScript} script words not spoken
          </p>
          {result.warnings.map((w, i) => (
            <p key={i} className="panel-warn">
              {w}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
