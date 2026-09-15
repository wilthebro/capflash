import { Link } from '../lib/router';
import { SiteLayout } from '../components/SiteLayout';
import { site } from '../site/config';
import { useDocumentMeta } from '../site/meta';

/**
 * TEMPLATE, NOT LEGAL ADVICE. Written to describe this service accurately, but
 * unreviewed. The liability and governing-law clauses in particular should be
 * checked by a lawyer for your jurisdiction before launch.
 */

const TITLE = 'Terms of use';
const DESCRIPTION = `The terms for using ${site.name} — a free caption editor that runs in your browser.`;

export function Terms() {
  useDocumentMeta({
    title: `${TITLE} — ${site.name}`,
    description: DESCRIPTION,
  });

  return (
    <SiteLayout path="/terms">
      <article className="site-prose">
        <h1>{TITLE}</h1>
        <p className="site-effective">Last updated {site.effectiveDate}</p>

        <p className="site-callout">
          <strong>The short version.</strong> {site.name} is free to use. Your videos and your
          captions are yours. It comes with no warranty, and you should not rely on it as the only
          copy of anything important.
        </p>

        <h2>1. Accepting these terms</h2>
        <p>
          By using {site.name} (the "service"), operated by {site.companyName} ("we", "us"), you
          agree to these terms. If you do not agree with them, please do not use the service.
        </p>

        <h2>2. What the service is</h2>
        <p>
          {site.name} is a browser-based caption editor. It transcribes speech, lets you style and
          time captions, and exports a video with those captions burned into the picture. The
          processing normally happens entirely on your own device; an optional server-side render is
          described in our <Link to="/privacy">privacy policy</Link>.
        </p>
        <p>
          There are no accounts and no fees. We may change, suspend or discontinue any part of the
          service at any time, and we do not guarantee that any particular feature will remain
          available.
        </p>

        <h2>3. Your content</h2>
        <p>
          You keep all rights to the videos you load, the transcripts and captions you create, and
          the videos you export. We claim no licence over any of it, because in the ordinary course
          of using the service we never receive it. If you use the optional server-side render, you
          grant us only the permission needed to process that upload and return the result to you.
        </p>
        <p>
          You are responsible for having the rights you need to the material you caption, and for
          what you do with the result.
        </p>

        <h2>4. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the service for anything unlawful, or to infringe anyone's rights.</li>
          <li>
            Use the optional server-side render to upload material you have no right to upload.
          </li>
          <li>
            Attempt to disrupt or overload the service, or to access parts of it you are not
            authorised to use.
          </li>
          <li>
            Misrepresent the service as your own, or remove attribution where attribution is
            required by a licence.
          </li>
        </ul>

        <h2>5. Third-party components</h2>
        <p>
          The service builds on other people's work: FFmpeg (via ffmpeg.wasm) for rendering,
          speech recognition models from the Whisper family, ONNX Runtime for running them in the
          browser, and the Montserrat typeface, which is licensed under the SIL Open Font License.
          Each component remains under its own licence and copyright. Speech models are downloaded
          from Hugging Face when you first transcribe — their terms apply to that download.
        </p>

        <h2>6. No warranty</h2>
        <p>
          The service is provided "as is" and "as available", without warranties of any kind,
          whether express or implied, including any implied warranty of merchantability, fitness for
          a particular purpose, or non-infringement. We do not warrant that it will be
          uninterrupted, error-free, or that transcription or rendering will be accurate.
        </p>
        <p>
          Transcription is a best effort by a statistical model. Check the captions before you
          publish them. Keep your own copy of any video you care about.
        </p>

        <h2>7. Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, we are not liable for any indirect, incidental,
          special, consequential or punitive damages, or for any loss of data, profits, revenue or
          goodwill arising out of or relating to your use of the service. Where liability cannot be
          excluded, our total liability is limited to the greater of the amount you paid us to use
          the service — which is nothing — or the minimum permitted by applicable law.
        </p>
        <p>
          Nothing in these terms excludes liability for death or personal injury caused by
          negligence, for fraud, or for anything else that cannot lawfully be excluded.
        </p>

        <h2>8. Changes to these terms</h2>
        <p>
          We may update these terms. The date at the top of this page will change when we do.
          Continuing to use the service after a change means you accept the updated terms.
        </p>

        <h2>9. Governing law</h2>
        <p>
          These terms are governed by the laws of {site.jurisdiction}, and any dispute arising from
          them is subject to the exclusive jurisdiction of the courts there.
        </p>

        <h2>10. Contact</h2>
        <p>
          Questions about these terms go to{' '}
          <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>, or see the{' '}
          <Link to="/contact">contact page</Link>.
        </p>
      </article>
    </SiteLayout>
  );
}
