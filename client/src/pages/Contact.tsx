import { Link } from '../lib/router';
import { SiteLayout } from '../components/SiteLayout';
import { site } from '../site/config';
import { useDocumentMeta } from '../site/meta';

const TITLE = 'Contact';
const DESCRIPTION = `Get in touch about ${site.name} — bug reports, questions and takedown requests.`;

/**
 * There is no form here on purpose.
 *
 * The app has no form endpoint and no account system, so a form would need a
 * third-party service and a new dependency to do what a mailto link already
 * does. If one is ever added, this page and the privacy policy both change.
 */
export function Contact() {
  useDocumentMeta({ title: `${TITLE} — ${site.name}`, description: DESCRIPTION });

  return (
    <SiteLayout path="/contact">
      <article className="site-prose">
        <h1>{TITLE}</h1>
        <p className="site-lede">
          There is no account system behind {site.name}, so email is the whole of it — and it goes
          straight to a person.
        </p>

        <p className="site-cta-row">
          <a href={`mailto:${site.contactEmail}`} className="site-button site-button-primary site-button-lg">
            Email {site.contactEmail}
          </a>
        </p>

        <h2>Before you write</h2>
        <p>A couple of details turn a "it doesn't work" email into one that can be answered:</p>
        <ul>
          <li>
            <strong>Which browser and version</strong> — transcription behaves differently on
            Chrome, Edge, Firefox and Safari, and on the same browser across machines.
          </li>
          <li>
            <strong>Where it stopped</strong> — loading the video, transcribing, styling, or
            exporting. If it was the export, say whether the in-browser renderer had loaded and
            whether the dialog mentioned the server.
          </li>
          <li>
            <strong>What the dialog said</strong> — the editor reports its own errors rather than
            failing silently, so the message is usually the answer.
          </li>
        </ul>

        <h2>Deleting an uploaded video</h2>
        <p>
          If you used the server-side export and want that upload removed, say so and it will be
          deleted. Include roughly when you used it, since there are no accounts to look you up by.
          The <Link to="/privacy">privacy policy</Link> explains what is kept and why.
        </p>

        <h2>Feature requests and bugs</h2>
        <p>
          Both are welcome. Concrete beats general: "export fails on a 4K portrait video" is
          actionable, "export is broken" is a conversation.
        </p>
      </article>
    </SiteLayout>
  );
}
