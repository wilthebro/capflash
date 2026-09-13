import type { SegmentStyle } from '@captioner/shared';
import { FontPicker } from './FontPicker';

interface Props {
  style: SegmentStyle;
  onChange: (patch: Partial<SegmentStyle>) => void;
}

/** Shared editor for font/size/color/outline/highlight fields (default style or per-segment). */
export function StyleFields({ style, onChange }: Props) {
  return (
    <div className="style-fields">
      <div className="field">
        <span className="field-label">Font</span>
        <FontPicker value={style.fontFamily} onChange={(fontFamily) => onChange({ fontFamily })} />
      </div>
      <div className="field-row">
        <div className="field">
          <span className="field-label">Size</span>
          <div className="input-with-unit">
            <input
              type="number"
              min={8}
              max={500}
              value={style.fontSize}
              onChange={(e) => onChange({ fontSize: Math.min(500, Math.max(1, Number(e.target.value) || 1)) })}
            />
            <span>px</span>
          </div>
        </div>
        <div className="field">
          <span className="field-label">Outline width</span>
          <div className="input-with-unit">
            <input
              type="number"
              min={0}
              max={50}
              value={style.outlineWidth}
              onChange={(e) => onChange({ outlineWidth: Math.min(50, Math.max(0, Number(e.target.value) || 0)) })}
            />
            <span>px</span>
          </div>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <span className="field-label">Color</span>
          <input type="color" value={style.color} onChange={(e) => onChange({ color: e.target.value })} />
        </div>
        <div className="field">
          <span className="field-label">Outline color</span>
          <input
            type="color"
            value={style.outlineColor}
            onChange={(e) => onChange({ outlineColor: e.target.value })}
          />
        </div>
        <div className="field">
          <span className="field-label">Highlight</span>
          <input
            type="color"
            value={style.highlightColor}
            onChange={(e) => onChange({ highlightColor: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
