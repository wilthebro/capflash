import { HeroCarousel } from '../components/HeroCarousel';
import { SiteLayout } from '../components/SiteLayout';
import { Link } from '../lib/router';
import { site } from '../site/config';
import { COMPARISON, FAQS, FEATURES, STEPS } from '../site/content';
import { useDocumentMeta } from '../site/meta';

const TITLE = 'Free TikTok-style captions, generated in your browser';

const DESCRIPTION =
  'Free TikTok-style caption generator that runs entirely in your browser: no upload, no watermark, no account. Transcribe, style and burn captions into an MP4.';

/** The four claims the hero makes, repeated as badges underneath it. */
const BADGES = [
  { label: '100% free', detail: 'Every feature, no paid tier' },
  { label: 'No upload', detail: 'Your video is opened locally' },
  { label: 'No watermark', detail: 'Nothing stamped on the export' },
  { label: 'Nothing to install', detail: 'It runs in the page' },
];

/**
 * Structured data, built from the same arrays the page renders.
 *
 * The FAQPage node is generated from `FAQS` rather than written out by hand so
 * the markup cannot drift from the visible questions — Google requires them to
 * match. `price: "0"` is the one part of this that is worth having even though
 * rich results are not guaranteed: it is an unambiguous statement of the thing
 * the page is claiming.
 */
function structuredData() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: site.name,
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Any (web browser)',
        description: DESCRIPTION,
        url: site.siteOrigin,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        featureList: FEATURES.map((feature) => feature.title),
      },
      { '@type': 'WebSite', name: site.name, url: site.siteOrigin },
      {
        '@type': 'FAQPage',
        mainEntity: FAQS.map((faq) => ({
          '@type': 'Question',
          name: faq.q,
          acceptedAnswer: { '@type': 'Answer', text: faq.a },
        })),
      },
    ],
  };
}

function Cta({ variant = 'primary', label = 'Open the editor' }: { variant?: 'primary' | 'ghost'; label?: string }) {
  return (
    <Link to={site.appUrl} className={`site-button site-button-${variant} site-button-lg`}>
      {label}
    </Link>
  );
}

export function Landing() {
  useDocumentMeta({ title: `${site.name} — ${TITLE}`, description: DESCRIPTION });

  return (
    <SiteLayout path="/">
      <script
        type="application/ld+json"
        // Escaping `<` keeps a stray `</script>` inside any string from ending
        // the block early.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData()).replace(/</g, '\\u003c') }}
      />

      <section className="site-hero">
        <div className="site-hero-copy">
          <p className="site-eyebrow">Free online caption generator</p>
          <h1>{TITLE}</h1>
          <p className="site-lede">
            {site.name} is a free caption generator that runs entirely in your browser. Transcribe
            your video, style word-by-word captions, and export an MP4 with them burned in — no
            upload, no watermark, no account, nothing to install.
          </p>
          <div className="site-cta-row">
            <Cta variant="primary" label="Open the editor — it's free" />
            <a href="#how" className="site-button site-button-ghost site-button-lg">
              See how it works
            </a>
          </div>
          <p className="site-hero-note">
            Nothing to download. Your video stays on your device unless you ask for the faster
            server render.
          </p>
        </div>

        <div className="site-hero-visual">
          <HeroCarousel />
        </div>
      </section>

      <ul className="site-badges">
        {BADGES.map((badge) => (
          <li key={badge.label}>
            <span className="site-badge-label">{badge.label}</span>
            <span className="site-badge-detail">{badge.detail}</span>
          </li>
        ))}
      </ul>

      <section id="features" className="site-section">
        <h2>Everything you need to caption a video</h2>
        <p className="site-section-lede">
          These are the parts that matter when you are captioning for a feed rather than for
          broadcast — and none of them are behind a paywall.
        </p>
        <div className="site-grid">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="site-card">
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how" className="site-section">
        <h2>How it works</h2>
        <p className="site-section-lede">
          Five steps, and the whole thing runs in a tab — there is nothing to install and no account
          to make.
        </p>
        <ol className="site-steps">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <span className="site-step-number" aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="privacy" className="site-section site-section-alt">
        <h2>Privacy is the architecture, not a setting</h2>
        <p className="site-section-lede">
          Most caption tools upload your video, because the server is where the computing power is.
          This one moves the computing power into the page instead. That single decision is why the
          privacy claims here hold up.
        </p>
        <dl className="site-privacy-list">
          <div>
            <dt>Transcription runs on your machine</dt>
            <dd>
              Whisper runs in a worker in your browser. The audio is decoded out of the video you
              opened and stays in memory on your device.
            </dd>
          </div>
          <div>
            <dt>Rendering happens in the page</dt>
            <dd>
              Captions are burned in with ffmpeg compiled to WebAssembly. The finished file is
              assembled in your browser and saved straight to your disk.
            </dd>
          </div>
          <div>
            <dt>The only things downloaded are the models</dt>
            <dd>
              The speech model, the first time you transcribe, and the render engine, the first
              time you export. Both are cached, so it happens once. Downloads, not uploads.
            </dd>
          </div>
          <div>
            <dt>The exception, stated plainly</dt>
            <dd>
              The editor can hand a render to the server running this site, which is roughly twice
              as fast. That does upload the video, it is an explicit choice in the export dialog,
              and the{' '}
              <Link to="/privacy">privacy policy</Link> says exactly what is kept and for how long.
            </dd>
          </div>
        </dl>
      </section>

      <section className="site-section">
        <h2>How it compares</h2>
        <p className="site-section-lede">
          Measured against the shape of the typical upload-and-pay online caption generator. No
          particular product is named — this is about the category, not about anyone in it.
        </p>
        <div className="site-table-wrap">
          <table className="site-table">
            <thead>
              <tr>
                <th scope="col">
                  <span className="site-visually-hidden">Feature</span>
                </th>
                <th scope="col">{site.name}</th>
                <th scope="col">Typical online caption generator</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td className="site-cell-good">{row.ours}</td>
                  <td>{row.theirs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="site-fineprint">
          General descriptions of the category rather than of any specific tool. Check a particular
          product's own terms before relying on this.
        </p>
      </section>

      <section id="faq" className="site-section">
        <h2>Frequently asked questions</h2>
        <div className="site-faq">
          {FAQS.map((faq) => (
            <article key={faq.q}>
              <h3>{faq.q}</h3>
              <p>{faq.a}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="site-cta-band">
        <h2>Caption your next video</h2>
        <p>
          Free, private, and nothing to install. Open the editor and load a video — the whole thing
          runs in this tab.
        </p>
        <Cta variant="primary" />
      </section>
    </SiteLayout>
  );
}
