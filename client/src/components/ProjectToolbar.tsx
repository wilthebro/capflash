import { loadProjectFromFile, saveProjectToFile } from '../lib/project';
import { useEditorStore } from '../store/editorStore';

interface Props {
  onExport: () => void;
  onTranscribe: () => void;
  onEditTranscript: () => void;
}

export function ProjectToolbar({ onExport, onTranscribe, onEditTranscript }: Props) {
  const projectName = useEditorStore((s) => s.projectName);
  const setProjectName = useEditorStore((s) => s.setProjectName);
  const loadVideo = useEditorStore((s) => s.loadVideo);
  const loadTranscript = useEditorStore((s) => s.loadTranscript);
  const addNotice = useEditorStore((s) => s.addNotice);
  const clearNotices = useEditorStore((s) => s.clearNotices);
  const notices = useEditorStore((s) => s.notices);
  const reset = useEditorStore((s) => s.reset);
  const hasVideo = useEditorStore((s) => s.videoMeta !== null);
  const hasSegments = useEditorStore((s) => s.segments.length > 0);
  const hasWords = useEditorStore((s) => s.words.length > 0);
  const isPlaying = useEditorStore((s) => s.isPlaying);

  const errMsg = (err: unknown) => (err instanceof Error ? err.message : String(err));

  const onVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      await loadVideo(f);
      addNotice(`Loaded video "${f.name}".`);
    } catch (err) {
      addNotice(`Could not load video: ${errMsg(err)}`);
    }
  };

  const onTranscriptFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const raw: unknown = JSON.parse(await f.text());
      const warnings = loadTranscript(raw);
      addNotice(`Loaded transcript: ${useEditorStore.getState().words.length} words, ${useEditorStore.getState().segments.length} segments.`);
      warnings.forEach((w) => addNotice(`⚠ ${w}`));
    } catch (err) {
      addNotice(`Could not load transcript: ${errMsg(err)}`);
    }
  };

  const onProjectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const warnings = await loadProjectFromFile(f);
      addNotice(`Loaded project "${useEditorStore.getState().projectName}". Re-open the video file to preview/export.`);
      warnings.forEach((w) => addNotice(`⚠ ${w}`));
    } catch (err) {
      addNotice(`Could not load project: ${errMsg(err)}`);
    }
  };

  const onSave = async () => {
    try {
      await saveProjectToFile();
      addNotice('Project saved.');
    } catch (err) {
      addNotice(`Could not save project: ${errMsg(err)}`);
    }
  };

  const onNew = () => {
    if (window.confirm('Start a new project? Unsaved changes will be lost.')) {
      reset();
    }
  };

  return (
    <header className="toolbar">
      <span className="app-title">🎬 Captioner</span>
      <input
        type="text"
        className="project-name"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        title="Project name"
      />
      <label className="button ghost">
        Load video
        <input type="file" accept="video/*" hidden onChange={(e) => void onVideoFile(e)} />
      </label>
      <label className="button ghost">
        Load transcript
        <input
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => void onTranscriptFile(e)}
        />
      </label>
      <button className="button ghost" onClick={onTranscribe} disabled={!hasVideo} title="Speech-to-text in your browser">
        Transcribe
      </button>
      <button className="button ghost" onClick={onEditTranscript} disabled={!hasWords}>
        Edit transcript
      </button>
      <label className="button ghost">
        Open project
        <input type="file" accept=".json,application/json" hidden onChange={(e) => void onProjectFile(e)} />
      </label>
      <button className="button ghost" onClick={() => void onSave()}>
        Save project
      </button>
      <span className="toolbar-spacer" />
      <button
        className="button ghost"
        disabled={!hasVideo}
        onClick={() =>
          useEditorStore.setState((s) => ({ togglePlayNonce: s.togglePlayNonce + 1 }))
        }
        title="Space"
      >
        {isPlaying ? '⏸ Pause' : '▶ Play'}
      </button>
      <button className="button primary" disabled={!hasVideo || !hasSegments} onClick={onExport}>
        Export MP4
      </button>
      <button className="button ghost" onClick={onNew} title="Start over">
        New
      </button>
      {notices.length > 0 && (
        <div className="toasts">
          {notices.map((n, i) => (
            <div key={i} className="toast" onClick={clearNotices} title="Click to dismiss">
              {n}
            </div>
          ))}
        </div>
      )}
    </header>
  );
}
