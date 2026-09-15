import { LINE_HEIGHT } from '@captioner/shared';
import { useDragBox } from '../hooks/useDragBox';
import { useEditorStore } from '../store/editorStore';

/**
 * Dashed box over the preview showing where captions sit. Drag the body to
 * move, the right-edge handle to resize the width, the bottom-edge handle to
 * step the box's height in whole lines. With nothing selected the box *is* the
 * global default, so dragging changes every caption that follows it; with a
 * segment selected, dragging pins that one segment's own box.
 *
 * The box is a fixed rectangle: its height comes from `maxLines` and the text
 * size, not from how many lines the current caption happens to wrap to, so the
 * placement region stays put from caption to caption and the text has somewhere
 * to be aligned within.
 */
export function BoundingBox({ scale }: { scale: number }) {
  const selection = useEditorStore((s) => s.selection);
  const videoMeta = useEditorStore((s) => s.videoMeta);
  const segments = useEditorStore((s) => s.segments);
  const defaultBox = useEditorStore((s) => s.defaultBox);
  const defaultStyle = useEditorStore((s) => s.defaultStyle);
  const drag = useDragBox();

  const selected = selection.length === 1 ? segments.find((x) => x.id === selection[0]) : undefined;
  const box = selected?.box ?? defaultBox;
  const style = selected?.style ?? defaultStyle;

  if (!videoMeta) return null;
  const lineHeight = style.fontSize * LINE_HEIGHT;
  // While dragging, the box follows the pointer from local state; the store
  // (and with it every caption) is only updated on release.
  const shown = drag.liveBox ?? box;
  const height = shown.maxLines * lineHeight;

  return (
    <div
      className={`bounding-box ${selected ? 'is-segment' : 'is-default'}`}
      style={{ left: shown.x, top: shown.y, width: shown.width, height }}
      onPointerDown={(e) => drag.onPointerDown(e, 'move', scale, lineHeight)}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp}
    >
      <span className="bounding-box-label">
        {/* A selected segment without its own box still sits on the global one. */}
        {selected?.box ? 'segment' : 'default'} · {shown.maxLines}{' '}
        {shown.maxLines === 1 ? 'line' : 'lines'}
      </span>
      <div
        className="bounding-box-handle is-right"
        title="Drag to change the box width"
        onPointerDown={(e) => drag.onPointerDown(e, 'resize', scale, lineHeight)}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
      />
      <div
        className="bounding-box-handle is-bottom"
        title="Drag to show more or fewer lines"
        onPointerDown={(e) => drag.onPointerDown(e, 'resize-lines', scale, lineHeight)}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
      />
    </div>
  );
}
