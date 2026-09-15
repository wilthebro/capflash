import { useState } from 'react';
import { AdPane } from '../components/AdPane';
import { ExportDialog } from '../components/ExportDialog';
import { HelpDialog } from '../components/HelpDialog';
import { ProjectToolbar } from '../components/ProjectToolbar';
import { ScriptImport } from '../components/ScriptImport';
import { SegmentPanel } from '../components/SegmentPanel';
import { StylePanel } from '../components/StylePanel';
import { Timeline } from '../components/Timeline';
import { TranscribeDialog } from '../components/TranscribeDialog';
import { TranscriptEditorDialog } from '../components/TranscriptEditorDialog';
import { VideoPreview } from '../components/VideoPreview';
import { useHotkeys } from '../hooks/useHotkeys';

/**
 * The editor shell, at /app.
 *
 * This is the app as it was before the site existed around it: a fixed-viewport
 * grid with the toolbar, preview, side panes and timeline, plus the four modal
 * dialogs whose open state lives here.
 *
 * The global hotkeys are mounted from this component rather than from the root,
 * which is what keeps Space and the arrow keys from driving a playhead on the
 * landing page.
 */
export function Editor() {
  useHotkeys();
  const [exportOpen, setExportOpen] = useState(false);
  const [transcribeOpen, setTranscribeOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className="app">
      <ProjectToolbar
        onExport={() => setExportOpen(true)}
        onTranscribe={() => setTranscribeOpen(true)}
        onEditTranscript={() => setEditorOpen(true)}
        onHelp={() => setHelpOpen(true)}
      />
      <div className="main">
        <div className="preview-pane">
          <VideoPreview />
        </div>
        <aside className="side-pane">
          <StylePanel />
          <SegmentPanel />
          <ScriptImport onTranscribe={() => setTranscribeOpen(true)} />
        </aside>
        <AdPane />
      </div>
      <Timeline />
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
      <TranscribeDialog open={transcribeOpen} onClose={() => setTranscribeOpen(false)} />
      <TranscriptEditorDialog open={editorOpen} onClose={() => setEditorOpen(false)} />
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
