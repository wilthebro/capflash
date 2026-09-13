import {
  highlightFontSize,
  highlightFontWeight,
  LINE_HEIGHT,
  type DisplayEvent,
} from '@captioner/shared';
import { useEditorStore } from '../store/editorStore';

/** Renders the currently active caption events over the video (video-px coordinates). */
export function CaptionOverlay() {
  const activeEvents = useEditorStore((s) => s.activeEvents);
  const videoMeta = useEditorStore((s) => s.videoMeta);
  if (!videoMeta || activeEvents.length === 0) return null;
  return (
    <div className="caption-overlay" style={{ width: videoMeta.width, height: videoMeta.height }}>
      {activeEvents.map((e, i) => (
        <CaptionEventView key={`${i}-${e.start}`} event={e} />
      ))}
    </div>
  );
}

function CaptionEventView({ event }: { event: DisplayEvent }) {
  const { style } = event;
  const outline =
    style.outlineWidth > 0 ? `${style.outlineWidth}px ${style.outlineColor}` : undefined;
  return (
    <div
      className="caption-event"
      style={{
        left: event.x,
        top: event.y,
        fontFamily: `"${style.fontFamily}", sans-serif`,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        color: style.color,
        WebkitTextStroke: outline,
        // Paint the outline behind the glyph instead of centred on its edge, so
        // the letterform keeps its full weight. That is also how libass draws a
        // border, so the preview and the export agree on how thick the text
        // looks. Browsers that don't implement paint-order for text fall back to
        // the usual centred stroke.
        paintOrder: outline ? 'stroke fill' : undefined,
        lineHeight: LINE_HEIGHT,
        textAlign: 'center',
      }}
    >
      {event.mode === 'highlight' ? <HighlightedText event={event} /> : event.text}
    </div>
  );
}

function HighlightedText({ event }: { event: DisplayEvent }) {
  const parts: React.ReactNode[] = [];
  let pos = 0;
  event.words.forEach((w, i) => {
    if (w.charStart > pos) parts.push(event.text.slice(pos, w.charStart));
    const word = event.text.slice(w.charStart, w.charEnd);
    parts.push(
      <span
        key={i}
        style={
          w.highlighted
            ? {
                color: event.style.highlightColor,
                // Same emphasis the ASS generator emits (\b1\fs<big>): bold and
                // ~10% larger, so the spoken word is unmistakable at a glance.
                fontWeight: highlightFontWeight(event.style.fontWeight),
                fontSize: highlightFontSize(event.style.fontSize),
              }
            : undefined
        }
      >
        {word}
      </span>,
    );
    pos = w.charEnd;
  });
  if (pos < event.text.length) parts.push(event.text.slice(pos));
  return <>{parts}</>;
}
