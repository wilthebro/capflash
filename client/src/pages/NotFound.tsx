import { Link } from '../lib/router';
import { SiteLayout } from '../components/SiteLayout';
import { site } from '../site/config';
import { useDocumentMeta } from '../site/meta';

/**
 * Rendered for any path the router does not know.
 *
 * It asks not to be indexed: the production server currently answers every
 * unknown path with a 200 and this page, which without the meta tag would be a
 * soft 404 — a page Google is happy to add to the index under a URL that does
 * not exist.
 */
export function NotFound() {
  useDocumentMeta({
    title: `Page not found — ${site.name}`,
    description: 'That page does not exist.',
    noindex: true,
  });

  return (
    <SiteLayout path="/404">
      <article className="site-prose site-prose-center">
        <h1>That page does not exist</h1>
        <p className="site-lede">
          The link may be old, or the address may have a typo in it. The editor is still where you
          left it.
        </p>
        <p className="site-cta-row">
          <Link to="/" className="site-button site-button-ghost site-button-lg">
            Back to the home page
          </Link>
        </p>
      </article>
    </SiteLayout>
  );
}
