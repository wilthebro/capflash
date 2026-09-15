/**
 * The hero carousel's slides.
 *
 * There is nothing to configure here: every image in `src/assets/carousel/` is
 * picked up at build time, in filename order. That is also why an empty folder
 * is a supported state rather than a mistake — the glob resolves to nothing and
 * the hero falls back to the CSS illustration, so the page is never broken by a
 * missing asset and the build never fails on one.
 *
 * Vite fingerprints whatever lands in the folder, so replacing an image with the
 * same name still busts the cache.
 */

const files = import.meta.glob('../assets/carousel/*.{webp,png,jpg,jpeg,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export interface Slide {
  url: string;
  alt: string;
}

/**
 * `01-word-by-word.webp` becomes "Word by word" — the leading number is there to
 * order the slides, not to be read aloud. Naming the files descriptively is what
 * gives the slides their alt text, so there is no second place to fill in.
 */
function humanise(path: string): string {
  const name = (path.split('/').pop() ?? '')
    .replace(/\.[^.]+$/, '')
    .replace(/^\d+[-_]?/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : '';
}

export const SLIDES: Slide[] = Object.keys(files)
  .sort((a, b) => a.localeCompare(b))
  .flatMap((path) => {
    const url = files[path];
    return url ? [{ url, alt: humanise(path) }] : [];
  });
