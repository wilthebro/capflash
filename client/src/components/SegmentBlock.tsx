import type { Segment } from '@captioner/shared';
import { useSegmentDrag } from '../hooks/useDragSegment';

const MODE_LABELS: Record<Segment['mode'], string> = {
  word: 'Word',
  line: 'Line',
  highlight: 'Highlight',
};

interface Props {
  seg: Segment;
  zoom: number;
  label: string;
  selected: boolean;
  onSelect: (id: string, additive: boolean) => void;
}

export function SegmentBlock({ seg, zoom, label, selected, onSelect }: Props) {
  const drag = useSegmentDrag(seg.id);

  return (
    <div
      className={`segment-block mode-${seg.mode} ${selected ? 'selected' : ''}`}
      style={{ left: seg.start * zoom, width: Math.max(10, (seg.end - seg.start) * zoom) }}
      title={`${label || '(empty)'}\n${seg.start.toFixed(2)}s – ${seg.end.toFixed(2)}s\n${MODE_LABELS[seg.mode]} mode`}
      onPointerDown={(e) => {
        onSelect(seg.id, e.shiftKey);
        drag.onPointerDown(e, 'move');
      }}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp}
    >
      <span className="segment-dot" style={{ backgroundColor: seg.style.color }} />
      <span className="segment-mode-chip">{MODE_LABELS[seg.mode]}</span>
      <span className="segment-label">{label || '…'}</span>
      <div
        className="segment-edge edge-left"
        onPointerDown={(e) => drag.onPointerDown(e, 'resize-start')}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
      />
      <div
        className="segment-edge edge-right"
        onPointerDown={(e) => drag.onPointerDown(e, 'resize-end')}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
      />
    </div>
  );
}
