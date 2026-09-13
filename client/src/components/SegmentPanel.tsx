import type { DisplayMode } from '@captioner/shared';
import { useEditorStore } from '../store/editorStore';
import { StyleFields } from './StyleFields';

const MODES: { value: DisplayMode; label: string }[] = [
  { value: 'word', label: 'Word by word' },
  { value: 'line', label: 'Line by line' },
  { value: 'highlight', label: 'Line + highlight' },
];

/** Per-segment editing: mode, style, bounding box, and combine/delete actions. */
export function SegmentPanel() {
  const segments = useEditorStore((s) => s.segments);
  const selection = useEditorStore((s) => s.selection);
  const defaultBox = useEditorStore((s) => s.defaultBox);
  const updateSegment = useEditorStore((s) => s.updateSegment);
  const mergeSegments = useEditorStore((s) => s.mergeSegments);
  const deleteSegments = useEditorStore((s) => s.deleteSegments);
  const setSelection = useEditorStore((s) => s.setSelection);

  const selected = segments.filter((x) => selection.includes(x.id));

  if (selected.length === 0) {
    return (
      <section className="panel">
        <h2 className="panel-title">Segment</h2>
        <p className="panel-hint">
          Click a caption block on the timeline to edit its mode, style and box. Shift+click to
          select several and combine them.
        </p>
      </section>
    );
  }

  if (selected.length > 1) {
    return (
      <section className="panel">
        <h2 className="panel-title">{selected.length} segments selected</h2>
        <div className="button-row">
          <button className="button" onClick={() => mergeSegments(selected.map((x) => x.id))}>
            Combine into one
          </button>
          <button className="button danger" onClick={() => deleteSegments(selected.map((x) => x.id))}>
            Delete
          </button>
        </div>
      </section>
    );
  }

  const seg = selected[0]!;
  const linked = seg.box === undefined;
  const box = seg.box ?? defaultBox;
  return (
    <section className="panel">
      <h2 className="panel-title">Segment</h2>
      <p className="panel-meta">
        {seg.start.toFixed(2)}s – {seg.end.toFixed(2)}s · {seg.wordIds.length} words
      </p>
      <div className="mode-radios">
        {MODES.map((m) => (
          <label key={m.value} className={`mode-radio mode-${m.value}`}>
            <input
              type="radio"
              name={`mode-${seg.id}`}
              checked={seg.mode === m.value}
              onChange={() => updateSegment(seg.id, { mode: m.value })}
            />
            {m.label}
          </label>
        ))}
      </div>
      <StyleFields
        style={seg.style}
        onChange={(patch) => updateSegment(seg.id, { style: { ...seg.style, ...patch } })}
      />
      <div className="field-row">
        <div className="field">
          <span className="field-label">Box X</span>
          <input
            type="number"
            value={Math.round(box.x)}
            onChange={(e) =>
              updateSegment(seg.id, { box: { ...box, x: Math.max(0, Number(e.target.value) || 0) } })
            }
          />
        </div>
        <div className="field">
          <span className="field-label">Box Y</span>
          <input
            type="number"
            value={Math.round(box.y)}
            onChange={(e) =>
              updateSegment(seg.id, { box: { ...box, y: Math.max(0, Number(e.target.value) || 0) } })
            }
          />
        </div>
        <div className="field">
          <span className="field-label">Box width</span>
          <input
            type="number"
            min={40}
            value={Math.round(box.width)}
            onChange={(e) =>
              updateSegment(seg.id, {
                box: { ...box, width: Math.max(40, Number(e.target.value) || 40) },
              })
            }
          />
        </div>
      </div>
      <p className="panel-hint">
        {linked
          ? 'This caption follows the global box — dragging it here pins its own position.'
          : 'This caption has its own box, so the global box no longer moves it.'}
      </p>
      <div className="button-row">
        {!linked && (
          <button className="button ghost" onClick={() => updateSegment(seg.id, { box: undefined })}>
            Reset box to default
          </button>
        )}
        <button className="button danger" onClick={() => deleteSegments([seg.id])}>
          Delete segment
        </button>
        <button className="button ghost" onClick={() => setSelection([])}>
          Deselect
        </button>
      </div>
    </section>
  );
}
