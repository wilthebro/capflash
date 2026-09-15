import type { DisplayMode } from '@captioner/shared';
import { useEditorStore } from '../store/editorStore';
import { BoxFields } from './BoxFields';
import { StyleFields } from './StyleFields';

const MODES: { value: DisplayMode; label: string }[] = [
  { value: 'word', label: 'Word by word' },
  { value: 'line', label: 'Line by line' },
  { value: 'highlight', label: 'Line + highlight' },
];

/**
 * Whole-frame placements, as a fraction of video height at the box's top edge.
 * Named for the band of the frame they drop the box into — the box's own
 * left/centre/right and top/middle/bottom setting is the Text position grid.
 */
const VERTICAL_PRESETS = [
  { label: 'Upper', frac: 0.06 },
  { label: 'Center', frac: 0.42 },
  { label: 'Lower', frac: 0.72 },
];

/** Defaults for new segments, with an apply-to-all action and the global box. */
export function StylePanel() {
  const defaultStyle = useEditorStore((s) => s.defaultStyle);
  const defaultMode = useEditorStore((s) => s.defaultMode);
  const defaultBox = useEditorStore((s) => s.defaultBox);
  const videoMeta = useEditorStore((s) => s.videoMeta);
  const updateDefaultStyle = useEditorStore((s) => s.updateDefaultStyle);
  const updateDefaultBox = useEditorStore((s) => s.updateDefaultBox);
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
      <h3 className="panel-subtitle">Caption position</h3>
      <p className="panel-hint">
        Captions follow this box until you move one individually. Drag the box on the preview with
        nothing selected — or use these fields — to move them all at once.
      </p>
      {videoMeta && (
        <div className="button-row">
          {VERTICAL_PRESETS.map((p) => (
            <button
              key={p.label}
              className="button ghost"
              onClick={() => updateDefaultBox({ y: Math.round(videoMeta.height * p.frac) })}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
      <BoxFields box={defaultBox} onChange={updateDefaultBox} />
      <button
        className="button"
        disabled={segmentCount === 0}
        onClick={applyDefaultsToAll}
        title="Applies the mode and style above to every segment, and re-links them all to the global box."
      >
        Apply defaults to all {segmentCount > 0 ? `${segmentCount} ` : ''}segments
      </button>
    </section>
  );
}
