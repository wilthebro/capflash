import type { DisplayMode } from '@captioner/shared';
import { useEditorStore } from '../store/editorStore';
import { StyleFields } from './StyleFields';

const MODES: { value: DisplayMode; label: string }[] = [
  { value: 'word', label: 'Word by word' },
  { value: 'line', label: 'Line by line' },
  { value: 'highlight', label: 'Line + highlight' },
];

/** Defaults for new segments, with an apply-to-all action. */
export function StylePanel() {
  const defaultStyle = useEditorStore((s) => s.defaultStyle);
  const defaultMode = useEditorStore((s) => s.defaultMode);
  const updateDefaultStyle = useEditorStore((s) => s.updateDefaultStyle);
  const setDefaultMode = useEditorStore((s) => s.setDefaultMode);
  const applyDefaultsToAll = useEditorStore((s) => s.applyDefaultsToAll);
  const segmentCount = useEditorStore((s) => s.segments.length);

  return (
    <section className="panel">
      <h2 className="panel-title">Default caption style</h2>
      <div className="mode-radios">
        {MODES.map((m) => (
          <label key={m.value} className={`mode-radio mode-${m.value}`}>
            <input
              type="radio"
              name="defaultMode"
              checked={defaultMode === m.value}
              onChange={() => setDefaultMode(m.value)}
            />
            {m.label}
          </label>
        ))}
      </div>
      <StyleFields style={defaultStyle} onChange={updateDefaultStyle} />
      <button className="button" disabled={segmentCount === 0} onClick={applyDefaultsToAll}>
        Apply defaults to all {segmentCount > 0 ? `${segmentCount} ` : ''}segments
      </button>
    </section>
  );
}
