import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initBundledFonts } from './lib/bundledFonts';
import { useEditorStore } from './store/editorStore';
import './index.css';

// Kick off before the first render so the default font is measuring correctly
// as early as possible. The store bump lands the faces through the existing
// fontsVersion -> document.fonts.ready -> clearMeasureCache path, which is what
// discards the widths taken against the fallback face.
void initBundledFonts().then(() => {
  useEditorStore.setState((s) => ({ fontsVersion: s.fontsVersion + 1 }));
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
