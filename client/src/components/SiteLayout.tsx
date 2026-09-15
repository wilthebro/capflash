import { useLayoutEffect } from 'react';
import type { ReactNode } from 'react';
import { Link } from '../lib/router';
import { site } from '../site/config';

interface Props {
  /** This page's route, so the header knows whether its section anchors are local. */
  path: string;
  children: ReactNode;
}

/**
 * The chrome around every marketing page.
 *
 * It also owns the two document-level adjustments the site needs, because it is
 * living inside an app shell built for the editor: index.css pins `html, body
 * and #root` to the viewport height and hides body overflow, which no descendant
 * selector can undo. `useLayoutEffect` rather than `useEffect` so the class lands
 * before the first paint — with `useEffect` the page would be visibly
 * unscrollable for a frame.
 */
export function SiteLayout({ path, children }: Props) {
  useLayoutEffect(() => {
    document.body.classList.add('site-mode');
    return () => document.body.classList.remove('site-mode');
  }, []);

  // On the landing page the nav links are plain in-page anchors and the browser
  // scrolls them; from anywhere else they have to route back to the landing page
  // first, so they carry the path.
  const onLanding = path === '/';
  const sectionHref = (hash: string) => (onLanding ? hash : `/${hash}`);

  return (
    <div className="site-root">
      <header className="site-header">
        <div className="site-header-inner">
          <Link to="/" className="site-logo">
            <span className="site-logo-mark" aria-hidden="true" />
            <span className="site-logo-text">{site.name}</span>
          </Link>

          <nav className="site-nav" aria-label="Sections">
            {site.nav.map((link) => (
              <Link key={link.to} to={link.to.startsWith('#') ? sectionHref(link.to) : link.to}>
                {link.label}
              </Link>
            ))}
          </nav>

          <Link to={site.appUrl} className="site-button site-button-primary site-header-cta">
            Open the editor
          </Link>
        </div>
      </header>

      <main className="site-main">{children}</main>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <div className="site-footer-brand">
            <p className="site-footer-name">{site.name}</p>
            <p className="site-footer-tagline">{site.tagline}</p>
          </div>

          <nav className="site-footer-col" aria-label="Sections">
            <h2 className="site-footer-heading">Explore</h2>
            {site.nav.map((link) => (
              <Link key={link.to} to={link.to.startsWith('#') ? sectionHref(link.to) : link.to}>
                {link.label}
              </Link>
            ))}
            <Link to={site.appUrl}>Open the editor</Link>
          </nav>

          <nav className="site-footer-col" aria-label="Legal">
            <h2 className="site-footer-heading">Legal</h2>
            {site.legal.map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label}
              </Link>
            ))}
            <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
          </nav>
        </div>

        <div className="site-footer-bottom">
          <p>
            © {new Date().getFullYear()} {site.companyName}. All rights reserved.
          </p>
          <p className="site-footer-note">
            {site.name} is an independent tool. It is not affiliated with, endorsed by or sponsored
            by TikTok or ByteDance.
          </p>
        </div>
      </footer>
    </div>
  );
}
