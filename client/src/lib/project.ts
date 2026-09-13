import {
  ProjectSchema,
  resolveSegmentLayout,
  type RenderSpec,
  type Word,
} from '@captioner/shared';
import { measureText } from './measure';
import { registerFontRecord } from './fonts';
import { useEditorStore } from '../store/editorStore';

export async function saveProjectToFile(): Promise<void> {
  const project = useEditorStore.getState().buildProject();
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name || 'project'}.captioner.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Load a project file; registers embedded fonts before the store loads so measurement uses them. */
export async function loadProjectFromFile(file: File): Promise<string[]> {
  const text = await file.text();
  const parsed = ProjectSchema.safeParse(JSON.parse(text));
  if (!parsed.success) {
    throw new Error('Invalid project file: ' + parsed.error.issues[0]?.message);
  }
  const p = parsed.data;
  const warnings: string[] = [];
  for (const rec of p.fonts) {
    try {
      await registerFontRecord(rec);
    } catch {
      warnings.push(`Font "${rec.family}" could not be loaded.`);
    }
  }
  useEditorStore.getState().loadProject(p);
  return warnings;
}

/**
 * Resolve the current editor state into a render spec. Same geometry pipeline
 * as the preview (resolveSegmentLayout + eventsForSegment with canvas
 * measureText) — the server performs no text measurement of its own.
 * Call only after `document.fonts.ready`.
 */
export function buildRenderSpec(): RenderSpec {
  const s = useEditorStore.getState();
  if (!s.videoMeta || !s.videoFile) throw new Error('Load a video first.');
  const wordMap = new Map(s.words.map((w) => [w.id, w]));
  const segments = s.segments.map((seg) => {
    const segWords = seg.wordIds
      .map((id) => wordMap.get(id))
      .filter((w): w is Word => w !== undefined);
    const measure = (t: string) => measureText(t, seg.style.fontFamily, seg.style.fontSize);
    return resolveSegmentLayout(seg, segWords, measure);
  });
  return {
    version: 1,
    renderer: 'ass',
    video: s.videoMeta,
    segments,
    fonts: s.fonts,
    output: {
      videoCodec: 'libx264',
      crf: 18,
      preset: 'veryfast',
      audioCodec: 'aac',
      audioBitrate: '192k',
    },
  };
}
