import { useLayoutEffect } from 'react';
import { site } from './config';

interface PageMeta {
  title: string;
  description: string;
  /** The 404 page asks not to be indexed; nothing else does. */
  noindex?: boolean;
}

function upsertMeta(name: string, content: string): void {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.name = name;
    document.head.appendChild(tag);
  }
  tag.content = content;
}

function upsertCanonical(href: string): void {
  let tag = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!tag) {
    tag = document.createElement('link');
    tag.rel = 'canonical';
    document.head.appendChild(tag);
  }
  tag.href = href;
}

/**
 * Per-route title, description and canonical.
 *
 * The canonical is computed from `location` rather than written down anywhere,
 * and that is the whole point: one index.html serves every route, so a static
 * `<link rel="canonical" href="https://site/">` in the head would tell a crawler
 * that /privacy and /terms are duplicates of the landing page, and drop them.
 *
 * `useLayoutEffect` so the title is correct before the first paint. The OG tags
 * stay static in index.html — no social scraper runs JavaScript, so mutating
 * them here would achieve nothing.
 */
export function useDocumentMeta({ title, description, noindex = false }: PageMeta): void {
  useLayoutEffect(() => {
    document.title = title;
    upsertMeta('description', description);
    upsertMeta('robots', noindex ? 'noindex, follow' : 'index, follow');
    upsertCanonical(site.siteOrigin + window.location.pathname.replace(/\/+$/, ''));
  }, [title, description, noindex]);
}
