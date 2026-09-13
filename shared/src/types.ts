// Core domain model shared by the client preview and the server export.

/** A single spoken word with absolute timing in seconds. */
export interface Word {
  id: string;
  text: string;
  start: number; // seconds
  end: number; // seconds
}

/** Caption bounding box, in video pixels. */
export interface Box {
  x: number;
  y: number;
  width: number;
}

export type DisplayMode = 'word' | 'line' | 'highlight';

export interface SegmentStyle {
  fontFamily: string; // matches FontFace family / ASS Fontname
  fontSize: number; // video px
  fontWeight: number; // 400/700/800; >= 700 exports as ASS Bold
  color: string; // #RRGGBB
  outlineColor: string; // #RRGGBB
  outlineWidth: number; // video px
  highlightColor: string; // #RRGGBB, used in 'highlight' mode
}

/** A contiguous caption block on the caption track. */
export interface Segment {
  id: string;
  wordIds: string[];
  start: number;
  end: number;
  mode: DisplayMode;
  style: SegmentStyle;
  /** Absent = follow the project's default box live (see Project.defaultBox). */
  box?: Box;
}

/** A font known to the editor; uploaded fonts carry their bytes. */
export interface FontRecord {
  family: string;
  fileName: string;
  dataBase64?: string; // present for uploaded fonts
}

export interface VideoMeta {
  name: string;
  duration: number;
  width: number;
  height: number;
}

/** Serializable editor project (saved/loaded as a JSON file). */
export interface Project {
  version: 1;
  name: string;
  video: VideoMeta | null;
  words: Word[];
  segments: Segment[];
  defaultStyle: SegmentStyle;
  defaultBox: Box;
  defaultMode: DisplayMode;
  fonts: FontRecord[];
}

// ---------------------------------------------------------------------------
// Export-side types: the render spec sent to the server.
// ---------------------------------------------------------------------------

export interface ExportWord {
  text: string;
  start: number;
  end: number;
  centerX: number; // absolute video px, word center
  charStart: number; // index into the joined line text
  charEnd: number;
}

export interface ExportLine {
  text: string; // words joined with single spaces
  topY: number; // absolute video px, line top
  centerX: number; // absolute video px, line center (== box center)
  widthPx: number;
  words: ExportWord[];
}

export interface ExportSegment {
  mode: DisplayMode;
  style: SegmentStyle;
  box: Box;
  lines: ExportLine[];
  events: DisplayEvent[]; // resolved with segment time clipping
}

/**
 * One unit of time-visible caption text. Drives BOTH the preview overlay and
 * the generated ASS file — this list is the preview/export parity guarantee.
 *
 * In line/highlight mode `text` is the segment's whole wrapped block, with its
 * lines joined by '\n' (the overlay renders it with `white-space: pre-line`,
 * the ASS generator breaks it with `\N`); the spans then index into that block.
 */
export interface DisplayEvent {
  start: number;
  end: number;
  text: string;
  x: number; // top-center anchor X, video px
  y: number; // top Y, video px
  words: { charStart: number; charEnd: number; highlighted: boolean }[];
  style: SegmentStyle;
  mode: DisplayMode;
}

export interface RenderSpec {
  version: 1;
  renderer: 'ass';
  video: VideoMeta;
  segments: ExportSegment[];
  fonts: FontRecord[];
  output: {
    videoCodec: 'libx264';
    crf: number;
    preset: string;
    audioCodec: 'aac';
    audioBitrate: string;
  };
}
