import { useEffect, useState } from 'react';
import { defaultId, type Word } from '@captioner/shared';
import { useEditorStore } from '../store/editorStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Editable copy of one word; times are kept as strings so partial typing is allowed. */
interface Row {
  id: string;
  text: string;
  start: string;
  end: string;
}

/**
 * Edit the word-level transcript (text and timings, add/remove words) and
 * re-derive the caption segments from it — per-segment styling is preserved.
 */
export function TranscriptEditorDialog({ open, onClose }: Props) {
  const addNotice = useEditorStore((s) => s.addNotice);
  const [rows, setRows] = useState<Row[]>([]);
  const [problems, setProblems] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setRows(
      useEditorStore.getState().words.map((w) => ({
        id: w.id,
        text: w.text,
        start: w.start.toFixed(2),
        end: w.end.toFixed(2),
      })),
    );
    setProblems([]);
  }, [open]);

  if (!open) return null;

  const patch = (index: number, changes: Partial<Row>) =>
    setRows((rs) => rs.map((r, i) => (i === index ? { ...r, ...changes } : r)));

  const addRow = () =>
    setRows((rs) => {
      const last = rs[rs.length - 1];
      const previousEnd = last ? Number(last.end) : 0;
      const start = Number.isFinite(previousEnd) ? previousEnd : 0;
      return [...rs, { id: defaultId(), text: '', start: start.toFixed(2), end: (start + 0.5).toFixed(2) }];
    });

  const removeRow = (index: number) => setRows((rs) => rs.filter((_, i) => i !== index));

  const apply = () => {
    const found: string[] = [];
    const next: Word[] = [];
    rows.forEach((row, i) => {
      const text = row.text.trim();
      const start = Number(row.start);
      const end = Number(row.end);
      if (!text) found.push(`Row ${i + 1}: text is empty.`);
      if (!Number.isFinite(start) || !Number.isFinite(end)) {
        found.push(`Row ${i + 1}: start and end must be numbers.`);
      } else if (end <= start) {
        found.push(`Row ${i + 1}: end must come after start.`);
      }
      next.push({ id: row.id, text, start, end });
    });

    if (found.length > 0) {
      setProblems(found);
      return;
    }

    const outOfOrder = next.some((w, i) => i > 0 && w.start < next[i - 1]!.start);
    const warnings = useEditorStore.getState().applyTranscriptEdit(next);
    if (outOfOrder) addNotice('Word timings were out of order — the transcript was re-sorted.');
    warnings.forEach((w) => addNotice(`⚠ ${w}`));
    addNotice(`Transcript updated: ${next.length} words.`);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal wide">
        <h2 className="modal-title">Edit transcript</h2>
        <p className="panel-hint">
          Fix words and their timings. Captions are regrouped from the edited words — segments that become
          empty are removed, and their styles and positions are kept.
        </p>

        <div className="transcript-table-wrap">
          <table className="transcript-table">
            <thead>
              <tr>
                <th className="transcript-col-index">#</th>
                <th className="transcript-col-time">Start</th>
                <th className="transcript-col-time">End</th>
                <th>Text</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id}>
                  <td className="transcript-col-index">{i + 1}</td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.start}
                      onChange={(e) => patch(i, { start: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.end}
                      onChange={(e) => patch(i, { end: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="transcript-text"
                      value={row.text}
                      onChange={(e) => patch(i, { text: e.target.value })}
                    />
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      onClick={() => removeRow(i)}
                      title={`Delete word ${i + 1}`}
                      aria-label={`Delete word ${i + 1}`}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && <p className="panel-hint">No words yet — add one below.</p>}
        {problems.length > 0 && (
          <div className="transcript-problems">
            {problems.slice(0, 8).map((p, i) => (
              <p key={i} className="panel-warn">
                {p}
              </p>
            ))}
            {problems.length > 8 && <p className="panel-warn">…and {problems.length - 8} more.</p>}
          </div>
        )}

        <div className="button-row">
          <button className="button ghost" onClick={addRow}>
            Add word
          </button>
          <span className="transcript-count">{rows.length} words</span>
        </div>

        <div className="modal-actions">
          <button className="button ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" onClick={apply}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
