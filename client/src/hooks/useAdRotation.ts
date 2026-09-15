import { useEffect, useRef, useState } from 'react';
import { AD_MIN_DISPLAY_MS } from '../ads/config';
import { useEditorStore } from '../store/editorStore';

/**
 * Rotates the ad slot after a minimum display time, but only on a user action —
 * never on a bare timer. An ad that has been up for the floor gets replaced the
 * next time the user does something to the player; an ad that has not, stays up
 * however long they sit there.
 *
 * The trigger is the editor's own command counters: `togglePlayNonce` and
 * `seekNonce` are bumped by every entry point that moves playback — the toolbar
 * play/pause, the space bar, clicking the video, scrubbing the timeline, the
 * arrow-key nudge — so one subscription covers all of them and any future
 * caller that bumps the same counters is covered for free. `isPlaying` is
 * deliberately not used: it is set as an *effect* of play/pause, so it would
 * count one action twice.
 *
 * Subscribing through the store rather than a selector keeps this hook out of
 * the render path: a scrub drag bumps `seekNonce` dozens of times a second and
 * each one is a couple of number comparisons here, not a re-render.
 */
export function useAdRotation(
  rotates: boolean,
  floorMs: number = AD_MIN_DISPLAY_MS,
): number {
  const [rotation, setRotation] = useState(0);
  const shownAt = useRef(Date.now());

  useEffect(() => {
    // A provider that must not rotate (AdSense) gets no subscription at all —
    // the policy is enforced by simply not listening, not by listening and
    // then declining to act.
    if (!rotates) return;
    return useEditorStore.subscribe((s, prev) => {
      const acted = s.togglePlayNonce !== prev.togglePlayNonce || s.seekNonce !== prev.seekNonce;
      if (!acted) return;
      const now = Date.now();
      if (now - shownAt.current < floorMs) return; // floor has not elapsed: the ad stays
      // Reset before publishing, so the rest of a scrub drag is inside the new
      // window and cannot rotate twice for one gesture.
      shownAt.current = now;
      setRotation((r) => r + 1);
    });
  }, [rotates, floorMs]);

  return rotation;
}
