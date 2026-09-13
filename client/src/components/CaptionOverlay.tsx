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
      {/* Keyed by slot, not by time: a time-bearing key remounted the div on
          every word transition, recreating its text-stroke paint layers and
          making the caption flicker. The views are stateless, so patching in
          place is enough. */}
      {activeEvents.map((e, i) => (
        <CaptionEventView key={i} event={e} />
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
        // An absolute line box, not a multiplier: every line is then exactly
        // fontSize * LINE_HEIGHT tall whatever it contains, which is the pitch
        // the ASS generator positions each line at. A unitless line-height
        // would instead scale with the enlarged highlight word and push the
        // lines below it down for as long as that word is highlighted.
        lineHeight: `${style.fontSize * LINE_HEIGHT}px`,
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
                // Let the bigger word overflow its line box rather than grow
                // it: the lines' pitch stays put and the word grows about the
                // baseline, which is what libass does with a larger \fs.
                lineHeight: 0,
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
