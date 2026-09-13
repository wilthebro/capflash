import { useState } from 'react';
import { ExportDialog } from './components/ExportDialog';
import { ProjectToolbar } from './components/ProjectToolbar';
import { ScriptImport } from './components/ScriptImport';
import { SegmentPanel } from './components/SegmentPanel';
import { StylePanel } from './components/StylePanel';
import { Timeline } from './components/Timeline';
import { VideoPreview } from './components/VideoPreview';
import { useHotkeys } from './hooks/useHotkeys';

export default function App() {
  useHotkeys();
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div className="app">
      <ProjectToolbar onExport={() => setExportOpen(true)} />
      <div className="main">
        <div className="preview-pane">
          <VideoPreview />
        </div>
        <aside className="side-pane">
          <StylePanel />
          <SegmentPanel />
          <ScriptImport />
        </aside>
      </div>
      <Timeline />
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}
