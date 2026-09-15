/**
 * The whole configuration surface of the marketing site.
 *
 * Everything below starts as a placeholder. Change the values here and the site
 * follows — the product name, the contact address, the legal entity and the
 * domain are each read from this file, never written into a page.
 *
 * Two files cannot read this one and carry the same values inline instead:
 *   - client/index.html          (the static <title>, description and OG tags —
 *                                 what non-JS crawlers and social scrapers see)
 *   - client/public/sitemap.xml  (and robots.txt, for its Sitemap: line)
 * Each of those names the others at the top. Before deploying:
 *
 *   grep -rn "\[Product Name\]\|example\." client/
 */

/**
 * Where every "Open the editor" button points.
 *
 * Defaults to the in-app route. Set VITE_APP_URL (in client/.env or the host's
 * environment) to move the editor to a subdomain — the CTAs become ordinary
 * outbound links with no copy changes anywhere.
 */
const env = import.meta.env ?? {};
export const APP_URL: string = env.VITE_APP_URL ?? '/app';

export interface NavLink {
  label: string;
  to: string;
}

export const site = {
  /** Used in the header, the footer, the page titles and the JSON-LD. */
  name: '[Product Name]',
  /** One line, used as the footer blurb and the OG description fallback. */
  tagline: 'Free TikTok-style captions, generated in your browser.',

  appUrl: APP_URL,

  contactEmail: 'hello@example.com',
  companyName: '[Your Company]',
  jurisdiction: '[State, Country]',
  /** Where the site is published — the canonical origin and the sitemap base. */
  siteOrigin: 'https://example.com',
  effectiveDate: 'September 15, 2026',

  /** Header and footer navigation. Sections use `#` anchors; pages use paths. */
  nav: [
    { label: 'Features', to: '#features' },
    { label: 'How it works', to: '#how' },
    { label: 'Privacy', to: '#privacy' },
    { label: 'FAQ', to: '#faq' },
  ] as NavLink[],

  legal: [
    { label: 'Privacy policy', to: '/privacy' },
    { label: 'Terms of use', to: '/terms' },
    { label: 'Contact', to: '/contact' },
  ] as NavLink[],
};
