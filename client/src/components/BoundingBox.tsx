import { useMemo } from 'react';
import { LINE_HEIGHT, wrapWords } from '@captioner/shared';
import { measureText } from '../lib/measure';
import { useDragBox } from '../hooks/useDragBox';
import { useSegmentLayouts } from '../hooks/useSegmentLayouts';
import { useEditorStore } from '../store/editorStore';

/**
 * Dashed box over the preview showing where captions sit. Drag the body to
 * move, the right-edge handle to resize. Edits the selected segment's box,
 * or the default box when nothing is selected.
 */
export function BoundingBox({ scale }: { scale: number }) {
  const selection = useEditorStore((s) => s.selection);
  const videoMeta = useEditorStore((s) => s.videoMeta);
  const words = useEditorStore((s) => s.words);
  const segments = useEditorStore((s) => s.segments);
  const defaultBox = useEditorStore((s) => s.defaultBox);
  const defaultStyle = useEditorStore((s) => s.defaultStyle);
  const fontsVersion = useEditorStore((s) => s.fontsVersion);
  const { layouts } = useSegmentLayouts();
  const drag = useDragBox();

  const selected = selection.length === 1 ? segments.find((x) => x.id === selection[0]) : undefined;
  const box = selected?.box ?? defaultBox;
  const style = selected?.style ?? defaultStyle;

  const lineCount = useMemo(() => {
    if (selected) return layouts.get(selected.id)?.lines.length ?? 1;
    const { lines } = wrapWords(words, defaultBox.width, (t) =>
      measureText(t, defaultStyle.fontFamily, defaultStyle.fontSize),
    );
    return Math.max(1, lines.length);
  }, [selected, layouts, words, defaultBox.width, defaultStyle, fontsVersion]);

  if (!videoMeta) return null;
  const height = lineCount * style.fontSize * LINE_HEIGHT;

  return (
    <div
      className={`bounding-box ${selected ? 'is-segment' : 'is-default'}`}
      style={{ left: box.x, top: box.y, width: box.width, height }}
      onPointerDown={(e) => drag.onPointerDown(e, 'move', scale)}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp}
    >
      <span className="bounding-box-label">{selected ? 'segment' : 'default'}</span>
      <div
        className="bounding-box-handle"
        onPointerDown={(e) => drag.onPointerDown(e, 'resize', scale)}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
      />
    </div>
  );
}
