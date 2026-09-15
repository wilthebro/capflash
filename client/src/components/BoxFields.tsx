import { MAX_LINES, type AlignX, type AlignY, type Box } from '@captioner/shared';

/** The nine placements, row by row — the grid's buttons set both axes at once. */
const ALIGNMENTS: { x: AlignX; y: AlignY; label: string; arrow: string }[] = [
  { x: 'left', y: 'top', label: 'Top left', arrow: '↖' },
  { x: 'center', y: 'top', label: 'Top', arrow: '↑' },
  { x: 'right', y: 'top', label: 'Top right', arrow: '↗' },
  { x: 'left', y: 'middle', label: 'Left', arrow: '←' },
  { x: 'center', y: 'middle', label: 'Middle', arrow: '⊙' },
  { x: 'right', y: 'middle', label: 'Right', arrow: '→' },
  { x: 'left', y: 'bottom', label: 'Bottom left', arrow: '↙' },
  { x: 'center', y: 'bottom', label: 'Bottom', arrow: '↓' },
  { x: 'right', y: 'bottom', label: 'Bottom right', arrow: '↘' },
];

interface Props {
  box: Box;
  onChange: (patch: Partial<Box>) => void;
}

/**
 * Shared editor for the bounding box — position, width, how many lines it shows
 * and where the text sits inside it (default box or per-segment).
 */
export function BoxFields({ box, onChange }: Props) {
  const clampLines = (n: number) => Math.min(MAX_LINES, Math.max(1, Math.round(n) || 1));
  return (
    <div className="box-fields">
      <div className="field-row">
        <div className="field">
          <span className="field-label">Box X</span>
          <input
            type="number"
            value={Math.round(box.x)}
            onChange={(e) => onChange({ x: Math.max(0, Number(e.target.value) || 0) })}
          />
        </div>
        <div className="field">
          <span className="field-label">Box Y</span>
          <input
            type="number"
            value={Math.round(box.y)}
            onChange={(e) => onChange({ y: Math.max(0, Number(e.target.value) || 0) })}
          />
        </div>
        <div className="field">
          <span className="field-label">Box width</span>
          <input
            type="number"
            min={40}
            value={Math.round(box.width)}
            onChange={(e) => onChange({ width: Math.max(40, Number(e.target.value) || 40) })}
          />
        </div>
      </div>
      <div className="field-row align-row">
        <div className="field">
          <span className="field-label">Lines</span>
          <input
            type="number"
            min={1}
            max={MAX_LINES}
            value={box.maxLines}
            title="How many lines the box shows at once; a longer caption pages through the rest."
            onChange={(e) => onChange({ maxLines: clampLines(Number(e.target.value)) })}
          />
        </div>
        <div className="field">
          <span className="field-label">Text position</span>
          <div className="align-grid">
            {ALIGNMENTS.map((a) => {
              const active = box.alignX === a.x && box.alignY === a.y;
              return (
                <button
                  key={a.label}
                  type="button"
                  className={`align-cell${active ? ' is-active' : ''}`}
                  title={a.label}
                  aria-label={a.label}
                  aria-pressed={active}
                  onClick={() => onChange({ alignX: a.x, alignY: a.y })}
                >
                  {a.arrow}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
