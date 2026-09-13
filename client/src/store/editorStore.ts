import { create } from 'zustand';
import {
  DEFAULT_BOX,
  DEFAULT_STYLE,
  defaultId,
  reassignSegments,
  segmentsFromScript,
  splitTranscript,
  TranscriptSchema,
  type Box,
  type DisplayEvent,
  type DisplayMode,
  type FontRecord,
  type Project,
  type Segment,
  type SegmentStyle,
  type VideoMeta,
  type Word,
} from '@captioner/shared';
import { readVideoMeta } from '../lib/video';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * One word is one token: strip surrounding whitespace and collapse any run of
 * inner whitespace to a single space. Transcripts and hand-edited project files
 * can carry newlines or tabs inside a word, and a '\n' would read as a line
 * break in the wrapped caption block.
 */
const normalizeWordText = (t: string) => t.replace(/\s+/g, ' ').trim();

export interface ScriptImportResult {
  warnings: string[];
  stats: { matched: number; unmatchedTranscript: number; unmatchedScript: number };
}

interface EditorState {
  videoFile: File | null;
  videoUrl: string | null;
  videoMeta: VideoMeta | null;
  words: Word[];
  segments: Segment[];
  fonts: FontRecord[];
  fontsVersion: number;
  defaultStyle: SegmentStyle;
  defaultBox: Box;
  defaultMode: DisplayMode;
  selection: string[];
  isPlaying: boolean;
  playhead: number; // seconds
  zoom: number; // px per second on the timeline
  seekTime: number;
  seekNonce: number;
  togglePlayNonce: number;
  activeEvents: DisplayEvent[];
  projectName: string;
  notices: string[];
  scriptText: string;

  loadVideo(file: File): Promise<void>;
  loadTranscript(raw: unknown): string[];
  /** Replace the transcript wholesale (Whisper results, JSON import). */
  commitTranscript(words: Word[]): string[];
  /** Re-derive segments after the transcript editor changed words. */
  applyTranscriptEdit(nextWords: Word[]): string[];
  importScript(scriptText: string): ScriptImportResult;
  setScriptText(text: string): void;
  updateSegment(id: string, patch: Partial<Pick<Segment, 'mode' | 'style' | 'box'>>): void;
  moveSegment(id: string, deltaSec: number): void;
  resizeSegment(id: string, edge: 'start' | 'end', t: number): void;
  mergeSegments(ids: string[]): void;
  deleteSegments(ids: string[]): void;
  updateDefaultStyle(patch: Partial<SegmentStyle>): void;
  updateDefaultBox(patch: Partial<Box>): void;
  setDefaultMode(mode: DisplayMode): void;
  applyDefaultsToAll(): void;
  addFont(rec: FontRecord): void;
  removeFont(family: string): void;
  setSelection(ids: string[]): void;
  setPlaying(p: boolean): void;
  setPlayhead(t: number): void;
  seek(t: number): void;
  setZoom(z: number): void;
  setActiveEvents(events: DisplayEvent[]): void;
  setProjectName(name: string): void;
  addNotice(text: string): void;
  clearNotices(): void;
  buildProject(): Project;
  loadProject(p: Project): void;
  reset(): void;
}

const initialData = {
  videoFile: null as File | null,
  videoUrl: null as string | null,
  videoMeta: null as VideoMeta | null,
  words: [] as Word[],
  segments: [] as Segment[],
  fonts: [] as FontRecord[],
  fontsVersion: 0,
  defaultStyle: { ...DEFAULT_STYLE } as SegmentStyle,
  defaultBox: { ...DEFAULT_BOX } as Box,
  defaultMode: 'highlight' as DisplayMode,
  selection: [] as string[],
  isPlaying: false,
  playhead: 0,
  zoom: 120,
  seekTime: 0,
  seekNonce: 0,
  togglePlayNonce: 0,
  activeEvents: [] as DisplayEvent[],
  projectName: 'Untitled',
  notices: [] as string[],
  scriptText: '',
};

export const useEditorStore = create<EditorState>()((set, get) => ({
  ...initialData,

  loadVideo: async (file) => {
    const { videoUrl } = get();
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const url = URL.createObjectURL(file);
    const meta = await readVideoMeta(url, file);
    set((s) => ({
      videoFile: file,
      videoUrl: url,
      videoMeta: meta,
      playhead: 0,
      isPlaying: false,
      projectName: s.projectName === 'Untitled' ? file.name.replace(/\.[^.]+$/, '') : s.projectName,
    }));
  },

  loadTranscript: (raw) => {
    const parsed = TranscriptSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        'Invalid transcript: ' +
          parsed.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      );
    }
    return get().commitTranscript(
      parsed.data.map((w) => ({ id: defaultId(), text: w.text, start: w.start, end: w.end })),
    );
  },

  commitTranscript: (input) => {
    const warnings: string[] = [];
    const words: Word[] = [];
    let dropped = 0;
    for (const w of input) {
      if (w.end <= w.start) {
        dropped++;
        continue;
      }
      words.push({ id: w.id, text: normalizeWordText(w.text), start: w.start, end: w.end });
    }
    if (dropped > 0) warnings.push(`${dropped} word(s) skipped (end <= start).`);
    words.sort((a, b) => a.start - b.start);
    const { defaultStyle, defaultMode } = get();
    const segments = splitTranscript(words, { style: defaultStyle, mode: defaultMode });
    set({ words, segments, selection: [], playhead: 0 });
    return warnings;
  },

  applyTranscriptEdit: (nextWords) => {
    const { segments, defaultStyle, defaultMode } = get();
    const words = [...nextWords]
      .map((w) => ({ ...w, text: normalizeWordText(w.text) }))
      .sort((a, b) => a.start - b.start);
    const { segments: nextSegments, droppedEmpty } = reassignSegments(segments, words, {
      style: defaultStyle,
      mode: defaultMode,
    });
    const warnings: string[] = [];
    if (droppedEmpty > 0) warnings.push(`${droppedEmpty} segment(s) became empty and were removed.`);
    set({ words, segments: nextSegments, selection: [] });
    return warnings;
  },

  setScriptText: (text) => set({ scriptText: text }),

  importScript: (scriptText) => {
    const { words, defaultStyle, defaultMode } = get();
    if (words.length === 0) {
      return {
        warnings: ['Load a transcript first — word timestamps come from the word-level JSON.'],
        stats: { matched: 0, unmatchedTranscript: 0, unmatchedScript: 0 },
      };
    }
    const { segments, warnings, stats } = segmentsFromScript(words, scriptText, {
      style: defaultStyle,
      mode: defaultMode,
    });
    set({ segments, selection: [] });
    return { warnings, stats };
  },

  updateSegment: (id, patch) =>
    set((s) => ({
      segments: s.segments.map((seg) => (seg.id === id ? { ...seg, ...patch } : seg)),
    })),

  moveSegment: (id, deltaSec) =>
    set((s) => {
      const seg = s.segments.find((x) => x.id === id);
      if (!seg || !s.videoMeta) return {};
      const maxT = s.videoMeta.duration;
      const newStart = clamp(seg.start + deltaSec, 0, Math.max(0, maxT - (seg.end - seg.start)));
      const shift = newStart - seg.start;
      if (Math.abs(shift) < 1e-9) return {};
      const wordIds = new Set(seg.wordIds);
      const words = s.words.map((w) =>
        wordIds.has(w.id)
          ? { ...w, start: clamp(w.start + shift, 0, maxT), end: clamp(w.end + shift, 0, maxT) }
          : w,
      );
      const segments = s.segments.map((x) =>
        x.id === id ? { ...x, start: x.start + shift, end: x.end + shift } : x,
      );
      return { words, segments };
    }),

  resizeSegment: (id, edge, t) =>
    set((s) => {
      const seg = s.segments.find((x) => x.id === id);
      if (!seg || !s.videoMeta) return {};
      const maxT = s.videoMeta.duration;
      const minDur = 0.1;
      if (edge === 'start') {
        const newStart = clamp(t, 0, seg.end - minDur);
        if (newStart === seg.start) return {};
        return { segments: s.segments.map((x) => (x.id === id ? { ...x, start: newStart } : x)) };
      }
      const newEnd = clamp(t, seg.start + minDur, maxT);
      if (newEnd === seg.end) return {};
      return { segments: s.segments.map((x) => (x.id === id ? { ...x, end: newEnd } : x)) };
    }),

  mergeSegments: (ids) =>
    set((s) => {
      const segs = s.segments.filter((x) => ids.includes(x.id));
      if (segs.length < 2) return {};
      const first = segs[0]!;
      const wordIds = [...new Set(segs.flatMap((x) => x.wordIds))].sort((a, b) => {
        const wa = s.words.find((w) => w.id === a);
        const wb = s.words.find((w) => w.id === b);
        return (wa?.start ?? 0) - (wb?.start ?? 0);
      });
      const merged: Segment = {
        id: defaultId(),
        wordIds,
        start: Math.min(...segs.map((x) => x.start)),
        end: Math.max(...segs.map((x) => x.end)),
        mode: first.mode,
        style: { ...first.style },
        // Keep the mergee's own box only if it had one; otherwise stay linked.
        ...(first.box ? { box: { ...first.box } } : {}),
      };
      const keep = s.segments.filter((x) => !ids.includes(x.id));
      keep.push(merged);
      keep.sort((a, b) => a.start - b.start);
      return { segments: keep, selection: [merged.id] };
    }),

  deleteSegments: (ids) =>
    set((s) => {
      const doomed = s.segments.filter((x) => ids.includes(x.id));
      const droppedWordIds = new Set(doomed.flatMap((x) => x.wordIds));
      return {
        segments: s.segments.filter((x) => !ids.includes(x.id)),
        // The caption and its words go together; orphaned words would keep
        // reappearing in the transcript editor with no way to reach them.
        words: s.words.filter((w) => !droppedWordIds.has(w.id)),
        selection: s.selection.filter((id) => !ids.includes(id)),
      };
    }),

  updateDefaultStyle: (patch) => set((s) => ({ defaultStyle: { ...s.defaultStyle, ...patch } })),
  updateDefaultBox: (patch) => set((s) => ({ defaultBox: { ...s.defaultBox, ...patch } })),
  setDefaultMode: (mode) => set({ defaultMode: mode }),

  applyDefaultsToAll: () =>
    set((s) => ({
      segments: s.segments.map((seg) => ({
        ...seg,
        mode: s.defaultMode,
        style: { ...s.defaultStyle },
        // Drop per-segment boxes so every caption follows the global box again,
        // and resetting to defaults can't strand captions at a stale position.
        box: undefined,
      })),
    })),

  addFont: (rec) =>
    set((s) => ({ fonts: [...s.fonts, rec], fontsVersion: s.fontsVersion + 1 })),
  removeFont: (family) =>
    set((s) => ({ fonts: s.fonts.filter((f) => f.family !== family), fontsVersion: s.fontsVersion + 1 })),

  setSelection: (ids) => set({ selection: ids }),
  setPlaying: (p) => set({ isPlaying: p }),
  setPlayhead: (t) => set({ playhead: t }),
  seek: (t) =>
    set((s) => ({
      seekTime: clamp(t, 0, s.videoMeta?.duration ?? 0),
      seekNonce: s.seekNonce + 1,
      playhead: clamp(t, 0, s.videoMeta?.duration ?? 0),
    })),
  setZoom: (z) => set({ zoom: clamp(z, 40, 400) }),
  setActiveEvents: (events) => set({ activeEvents: events }),
  setProjectName: (name) => set({ projectName: name }),
  addNotice: (text) => set((s) => ({ notices: [...s.notices, text] })),
  clearNotices: () => set({ notices: [] }),

  buildProject: () => {
    const s = get();
    return {
      version: 1 as const,
      name: s.projectName,
      video: s.videoMeta,
      words: s.words,
      segments: s.segments,
      defaultStyle: s.defaultStyle,
      defaultBox: s.defaultBox,
      defaultMode: s.defaultMode,
      fonts: s.fonts,
    };
  },

  loadProject: (p) => {
    const { videoUrl } = get();
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    set({
      videoFile: null,
      videoUrl: null,
      videoMeta: p.video,
      words: p.words.map((w) => ({ ...w, text: normalizeWordText(w.text) })),
      segments: p.segments,
      defaultStyle: p.defaultStyle,
      defaultBox: p.defaultBox,
      defaultMode: p.defaultMode,
      fonts: p.fonts,
      fontsVersion: get().fontsVersion + 1,
      projectName: p.name,
      selection: [],
      playhead: 0,
      isPlaying: false,
      activeEvents: [],
    });
  },

  reset: () => {
    const { videoUrl } = get();
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    set({ ...initialData });
  },
}));
