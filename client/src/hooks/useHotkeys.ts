import { useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';

/** Global shortcuts: space = play/pause, delete = remove selection, arrows = nudge playhead. */
export function useHotkeys(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
      ) {
        return;
      }
      const s = useEditorStore.getState();
      if (e.code === 'Space') {
        e.preventDefault();
        useEditorStore.setState({ togglePlayNonce: s.togglePlayNonce + 1 });
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (s.selection.length > 0) s.deleteSegments(s.selection);
      } else if (e.key === 'ArrowLeft') {
        s.seek(s.playhead - 1 / 30);
      } else if (e.key === 'ArrowRight') {
        s.seek(s.playhead + 1 / 30);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
