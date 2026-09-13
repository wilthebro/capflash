import { useMemo } from 'react';
import type React from 'react';
import { useEditorStore } from '../store/editorStore';
import { SegmentBlock } from './SegmentBlock';

interface Props {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}

/** The secondary caption track: draggable/resizable blocks above the video strip. */
export function CaptionTrack({ onPointerDown, onPointerMove, onPointerUp }: Props) {
  const segments = useEditorStore((s) => s.segments);
  const words = useEditorStore((s) => s.words);
  const selection = useEditorStore((s) => s.selection);
  const setSelection = useEditorStore((s) => s.setSelection);
  const zoom = useEditorStore((s) => s.zoom);

  const wordMap = useMemo(() => new Map(words.map((w) => [w.id, w])), [words]);

  const handleSelect = (id: string, additive: boolean) => {
    if (additive) {
      setSelection(
        selection.includes(id) ? selection.filter((x) => x !== id) : [...selection, id],
      );
    } else {
      setSelection([id]);
    }
  };

  return (
    <div
      className="caption-track"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <span className="track-label">Captions</span>
      {segments.map((seg) => {
        const label = seg.wordIds
          .map((id) => wordMap.get(id)?.text ?? '')
          .filter(Boolean)
          .slice(0, 6)
          .join(' ');
        return (
          <SegmentBlock
            key={seg.id}
            seg={seg}
            zoom={zoom}
            label={label}
            selected={selection.includes(seg.id)}
            onSelect={handleSelect}
          />
        );
      })}
    </div>
  );
}
