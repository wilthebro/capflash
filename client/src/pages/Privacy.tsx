import { Link } from '../lib/router';
import { SiteLayout } from '../components/SiteLayout';
import { site } from '../site/config';
import { useDocumentMeta } from '../site/meta';

/**
 * TEMPLATE, NOT LEGAL ADVICE. This describes what the software actually does —
 * which is unusually little — but it has not been reviewed by a lawyer. Have
 * someone qualified read it before launch, particularly if you enable
 * third-party advertising or collect anything at all.
 *
 * If you change what the app sends anywhere, this page changes with it.
 */

const TITLE = 'Privacy policy';
const DESCRIPTION =
  'What this caption editor stores, what it downloads, and the one case where your video is uploaded — in plain language.';

export function Privacy() {
  useDocumentMeta({
    title: `${TITLE} — ${site.name}`,
    description: DESCRIPTION,
  });

  return (
    <SiteLayout path="/privacy">
      <article className="site-prose">
        <h1>{TITLE}</h1>
        <p className="site-effective">Last updated {site.effectiveDate}</p>

        <p className="site-callout">
          <strong>The short version.</strong> There is no account and no tracking. Your video is
          processed on your own device and is not uploaded, with one exception you have to ask for:
          the optional server-side export, described below. We do not sell anything about you
          because we do not collect anything about you.
        </p>

        <h2>Who this covers</h2>
        <p>
          This policy describes {site.name}, operated by {site.companyName} ("we", "us"). It covers
          this website and the caption editor it hosts. It does not cover what you do with the
          videos you caption, or any site you publish them to.
        </p>

        <h2>Your video is processed on your device</h2>
        <p>
          By default, nothing about your video leaves your computer. The file is opened directly by
          your browser and held in memory; it is not sent to us, and there is no copy of it on our
          servers. Two things happen locally:
        </p>
        <ul>
          <li>
            <strong>Transcription</strong> — the audio is decoded from your video and passed to a
            speech recognition model running in a worker inside your browser.
          </li>
          <li>
            <strong>Export</strong> — the captions are burned into the video by a rendering engine
            compiled to WebAssembly, also running in your browser. The finished file is assembled
            there and saved straight to your disk.
          </li>
        </ul>

        <h2>The one case where a video is uploaded</h2>
        <p>
          The editor can hand a render to the server running this site, which is roughly twice as
          fast as rendering in the page. When that happens, your video <em>is</em> uploaded, along
          with the caption data needed to render it. This is used when you choose it in the export
          dialog, and as a fallback if the in-browser renderer cannot start — the dialog tells you
          when that happens.
        </p>
        <p>
          Uploaded videos are written to the server's job directory so the render can run, and the
          finished MP4 is served back to you from there. They are not analysed, shared or used for
          anything else. Note that job files are not currently deleted on a timer; if you need a
          specific upload removed, email{' '}
          <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> and it will be deleted.
        </p>

        <h2>What is stored on your device</h2>
        <p>
          We use your browser's local storage for two preferences, so the editor remembers them
          between visits: which speech model you last chose, and which spoken language you selected.
          That is the whole of it. There is no identifier, no session token and no account data,
          because there are no accounts.
        </p>
        <p>
          Separately, your browser caches the speech model files it downloads so it does not fetch
          them again. Clearing your browser's site data removes all of the above.
        </p>

        <h2>What is downloaded, and from where</h2>
        <ul>
          <li>
            <strong>Speech models</strong> — fetched from Hugging Face the first time you transcribe.
            That request is made by your browser to their servers, so their own privacy policy
            applies to it and your IP address is visible to them in the ordinary way that any web
            request reveals it.
          </li>
          <li>
            <strong>Rendering engine and runtime</strong> — served from this site's own domain. No
            third party is involved.
          </li>
        </ul>

        <h2>Advertising</h2>
        <p>
          This site is free to use and is paid for by advertising. When third-party advertising is
          enabled, Google and its partners may set cookies or read device identifiers to serve and
          measure ads, and may use them to personalise advertising across sites. That is Google's
          processing, governed by Google's own policies, not ours.
        </p>
        <p>
          You can control personalised advertising in{' '}
          <a href="https://myadcenter.google.com/" rel="noopener noreferrer" target="_blank">
            Google's My Ad Center
          </a>
          , and opt out of personalised advertising from many vendors at{' '}
          <a href="https://www.aboutads.info/" rel="noopener noreferrer" target="_blank">
            aboutads.info
          </a>
          . If you are in the UK, the EEA or Switzerland, you will be asked for consent before any
          non-essential cookies are set.
        </p>

        <h2>Analytics</h2>
        <p>
          There are none. This site runs no analytics, no session recording and no fingerprinting,
          and we do not build a profile of you. The only measurement happens inside advertising, if
          advertising is enabled.
        </p>

        <h2>Children</h2>
        <p>
          This service is not directed at children under 13, and we do not knowingly collect
          personal information from them. Since we collect no personal information at all, there is
          nothing for a parent to request the deletion of — other than an uploaded video, which the
          address above can remove.
        </p>

        <h2>Your rights</h2>
        <p>
          Data protection law gives you rights of access, correction, deletion and portability over
          personal data held about you. We hold none, so in practice there is nothing to exercise
          them against. If you have uploaded a video through the server-side export and want it
          gone, contact us and we will delete it.
        </p>

        <h2>Changes</h2>
        <p>
          If this policy changes, the date at the top changes with it. Material changes will be
          noted on this page. Continuing to use the site after a change means you accept the
          updated policy.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about any of this, or a deletion request, go to{' '}
          <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>. See also our{' '}
          <Link to="/terms">terms of use</Link>.
        </p>
      </article>
    </SiteLayout>
  );
}
