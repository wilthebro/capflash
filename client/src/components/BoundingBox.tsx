import { LINE_HEIGHT } from '@captioner/shared';
import { useDragBox } from '../hooks/useDragBox';
import { useSegmentLayouts } from '../hooks/useSegmentLayouts';
import { useEditorStore } from '../store/editorStore';

/**
 * Dashed box over the preview showing where captions sit. Drag the body to
 * move, the right-edge handle to resize. With nothing selected the box *is*
 * the global default, so dragging moves every caption that follows it; with a
 * segment selected, dragging pins that one segment's own box.
 */
export function BoundingBox({ scale }: { scale: number }) {
  const selection = useEditorStore((s) => s.selection);
  const videoMeta = useEditorStore((s) => s.videoMeta);
  const segments = useEditorStore((s) => s.segments);
  const defaultBox = useEditorStore((s) => s.defaultBox);
  const defaultStyle = useEditorStore((s) => s.defaultStyle);
  // The segment on screen right now, as an id: the box's height is the height
  // of the captions actually being drawn — not of the whole transcript, which
  // made it thousands of pixels tall. Returning an id (rather than the segment)
  // keeps the per-frame playhead updates from re-rendering this component.
  const activeSegmentId = useEditorStore((s) => {
    const seg = s.segments.find((x) => x.start <= s.playhead && s.playhead < x.end);
    return seg ? seg.id : null;
  });
  const { layouts } = useSegmentLayouts();
  const drag = useDragBox();

  const selected = selection.length === 1 ? segments.find((x) => x.id === selection[0]) : undefined;
  const box = selected?.box ?? defaultBox;
  const style = selected?.style ?? defaultStyle;

  if (!videoMeta) return null;
  const sizedTo = selected?.id ?? activeSegmentId;
  const lineCount = (sizedTo ? layouts.get(sizedTo)?.lines.length : 0) || 1;
  const height = lineCount * style.fontSize * LINE_HEIGHT;
  // While dragging, the box follows the pointer from local state; the store
  // (and with it every caption) is only updated on release.
  const shown = drag.liveBox ?? box;

  return (
    <div
      className={`bounding-box ${selected ? 'is-segment' : 'is-default'}`}
      style={{ left: shown.x, top: shown.y, width: shown.width, height }}
      onPointerDown={(e) => drag.onPointerDown(e, 'move', scale)}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp}
    >
      <span className="bounding-box-label">
        {/* A selected segment without its own box still sits on the global one. */}
        {selected?.box ? 'segment' : 'default'}
      </span>
      <div
        className="bounding-box-handle"
        onPointerDown={(e) => drag.onPointerDown(e, 'resize', scale)}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
      />
    </div>
  );
}
