import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Whether the reader has asked their system to reduce motion.
 *
 * The hero carousel uses this to stop advancing on its own entirely, rather than
 * to merely slow down. For someone who has asked for less movement, a picture
 * that changes by itself every few seconds is exactly the thing they turned off;
 * slowing it down would be missing the point. The dots still work, so the slides
 * stay reachable — they just wait to be asked for.
 *
 * Guarded for a missing `window` so the marketing pages stay renderable outside
 * a browser (a prerender pass would run them in Node).
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const query = window.matchMedia(QUERY);
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
