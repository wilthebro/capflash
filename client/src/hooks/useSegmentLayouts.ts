import { useEffect, useMemo, useState } from 'react';
import {
  resolveSegmentLayout,
  type DisplayEvent,
  type ExportSegment,
  type Word,
} from '@captioner/shared';
import { clearMeasureCache, measureText } from '../lib/measure';
import { useEditorStore } from '../store/editorStore';

export interface SegmentLayouts {
  layouts: Map<string, ExportSegment>;
  events: DisplayEvent[]; // all events, sorted by start
  bySegment: Map<string, DisplayEvent[]>;
}

/**
 * Derived layout: one memo computes wrap + positions + events for every
 * segment. Re-runs on segments/words/font changes and after fonts finish
 * loading (measuring with a fallback font would poison all geometry).
 */
export function useSegmentLayouts(): SegmentLayouts {
  const segments = useEditorStore((s) => s.segments);
  const words = useEditorStore((s) => s.words);
  const fontsVersion = useEditorStore((s) => s.fontsVersion);
  const [fontsReadyTick, setFontsReadyTick] = useState(0);

  useEffect(() => {
    clearMeasureCache();
    let alive = true;
    document.fonts.ready.then(() => {
      clearMeasureCache();
      if (alive) setFontsReadyTick((v) => v + 1);
    });
    return () => {
      alive = false;
    };
  }, [fontsVersion]);

  return useMemo(() => {
    const wordMap = new Map(words.map((w) => [w.id, w]));
    const layouts = new Map<string, ExportSegment>();
    const bySegment = new Map<string, DisplayEvent[]>();
    const all: DisplayEvent[] = [];
    for (const seg of segments) {
      const segWords = seg.wordIds
        .map((id) => wordMap.get(id))
        .filter((w): w is Word => w !== undefined);
      const measure = (t: string) => measureText(t, seg.style.fontFamily, seg.style.fontSize);
      const layout = resolveSegmentLayout(seg, segWords, measure);
      layouts.set(seg.id, layout);
      bySegment.set(seg.id, layout.events);
      all.push(...layout.events);
    }
    all.sort((a, b) => a.start - b.start);
    return { layouts, events: all, bySegment };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments, words, fontsVersion, fontsReadyTick]);
}
