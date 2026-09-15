import { useSyncExternalStore } from 'react';
import type { AnchorHTMLAttributes, MouseEvent } from 'react';

/**
 * A five-route path router.
 *
 * The app carries no router dependency and does not need one: every route is a
 * static page, so this is a `popstate` subscription plus an `<a>` that
 * intercepts plain left-clicks and pushes history itself. Both the dev server
 * and the production server already fall back to index.html for unknown paths,
 * so deep links work with no config.
 *
 * A note for the whole module: nothing at module scope may touch `window` or
 * `document`. `usePath` reads them only inside `getSnapshot`, so the site
 * components stay importable outside a browser.
 */

const listeners = new Set<() => void>();

/** `/app/` and `/app` are the same route; `/` survives as itself. */
function normalize(path: string): string {
  const trimmed = path.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener('popstate', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('popstate', onChange);
  };
}

/**
 * The current pathname — never the hash, never the query string.
 *
 * This matters more than it looks. The landing page links to its own sections
 * with `#features`-style anchors, and every one of those fires `popstate`. A
 * snapshot that included the hash would re-render the whole route on each one,
 * and any scroll-to-top keyed on the path would drag the reader back to the top
 * of the page they are already reading.
 */
export function usePath(): string {
  return useSyncExternalStore(
    subscribe,
    () => normalize(window.location.pathname),
    // Used when there is no DOM (a prerender pass renders these in Node).
    () => '/',
  );
}

/** `mailto:`, `tel:`, `https:` and protocol-relative URLs are not ours to route. */
export function isExternal(href: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href);
}

/**
 * Push a new history entry and let the subscribers re-render.
 *
 * Scrolling happens here rather than in an effect on the path: inside the click
 * handler the scroll and the commit both land before the browser paints, where
 * an effect would paint the new page at the old scroll offset and then jump.
 * `popstate` is deliberately not handled — that is the browser restoring a
 * position the user actually had, and it should be left alone.
 */
export function navigate(to: string, opts: { replace?: boolean } = {}): void {
  const url = new URL(to, window.location.origin);

  // Re-clicking the page you are already on should not stack a duplicate
  // history entry — it makes the back button appear broken.
  if (url.href === window.location.href) return;

  if (opts.replace) window.history.replaceState(null, '', url.href);
  else window.history.pushState(null, '', url.href);

  for (const listener of listeners) listener();

  if (!url.hash) {
    // `behavior: 'instant'` is load-bearing, not a style choice: site.css turns
    // on smooth scrolling so anchor links glide, and without this every route
    // change would animate its way to the top too.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    return;
  }

  // A cross-page anchor like `/#features`: the section does not exist until React
  // has committed the new route, so it is looked up on the next frame.
  requestAnimationFrame(() => {
    document.getElementById(url.hash.slice(1))?.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'> & {
  to: string;
};

/**
 * An `<a href>` that routes client-side for plain left-clicks.
 *
 * It renders a real href on purpose: middle-click, ⌘-click, "copy link address"
 * and crawlers all keep working, and an external `to` (once `VITE_APP_URL`
 * points at a subdomain) simply navigates with no change to the call site.
 */
export function Link({ to, target, children, ...rest }: LinkProps) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (target && target !== '_self') return;
    // In-page anchors are the browser's job: native smooth scroll, native focus
    // handling, and a history entry that means something.
    if (isExternal(to) || to.startsWith('#')) return;

    event.preventDefault();
    navigate(to);
  };

  return (
    <a href={to} target={target} onClick={onClick} {...rest}>
      {children}
    </a>
  );
}
