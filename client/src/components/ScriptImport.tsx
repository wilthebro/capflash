import { useState } from 'react';
import { useEditorStore, type ScriptImportResult } from '../store/editorStore';

/**
 * Plaintext script import: the script's own line breaks define caption
 * segments, overriding period-based splitting. Word timestamps still come
 * from the transcript (aligned in sequence order).
 */
export function ScriptImport() {
  const importScript = useEditorStore((s) => s.importScript);
  const words = useEditorStore((s) => s.words);
  const [text, setText] = useState('');
  const [result, setResult] = useState<ScriptImportResult | null>(null);

  const apply = () => {
    if (!text.trim()) return;
    setResult(importScript(text));
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setText(await file.text());
  };

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
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={words.length === 0}
      />
      <div className="button-row">
        <label className="button ghost">
          Open .txt
          <input type="file" accept=".txt,text/plain" hidden onChange={(e) => void onFile(e)} />
        </label>
        <button className="button" onClick={apply} disabled={words.length === 0 || !text.trim()}>
          Apply script
        </button>
      </div>
      {words.length === 0 && <p className="panel-warn">Load a transcript first (timings come from it).</p>}
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
