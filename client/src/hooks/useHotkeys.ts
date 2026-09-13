import { useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';

/** Input types where the keyboard belongs to the field, not to the editor. */
const TEXT_INPUT_TYPES = new Set([
  'text',
  'number',
  'email',
  'search',
  'tel',
  'url',
  'password',
  'date',
  'time',
  'datetime-local',
  'month',
  'week',
]);

/**
 * Only text entry swallows the shortcuts. Deliberately not every INPUT: after
 * clicking a mode radio or a checkbox the focus stays on the control, and a
 * dead space bar there reads as "playback broke".
 */
function isTextEntry(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  if (el.isContentEditable) return true;
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
  if (el.tagName === 'INPUT') return TEXT_INPUT_TYPES.has((el as HTMLInputElement).type.toLowerCase());
  return false;
}

/** Global shortcuts: space = play/pause, delete = remove selection, arrows = nudge playhead. */
export function useHotkeys(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTextEntry(e.target)) return;
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
