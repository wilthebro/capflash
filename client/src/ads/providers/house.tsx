import { createRoot } from 'react-dom/client';
import type { AdContext, AdProvider } from '../types';

/**
 * House ads, so the rail has something to show with no account and no network
 * request. These stand in for a real network's creatives — replace them (or
 * point `AD_PROVIDER` at another provider) rather than shipping them.
 */
const CREATIVES = [
  {
    title: 'Export in one pass',
    // Deliberately not "no upload": the video is POSTed to the local server
    // that burns it in. Only a third-party service is out of the picture.
    body: 'Captions are burned in with ffmpeg on your own machine — no watermark, no queue, no third-party service.',
    cta: 'Try an export',
  },
  {
    title: 'Transcribe on your machine',
    body: 'Whisper runs in the browser tab. Your video and audio never leave the computer.',
    cta: 'Open Transcribe',
  },
  {
    title: 'Style once, apply everywhere',
    body: 'Set a default caption style and push it onto every segment in a single click.',
    cta: 'See the style panel',
  },
  {
    title: 'Placeholder ad slot',
    body: 'This rail is wired for a real ad network. Point AD_PROVIDER at one to go live.',
    cta: 'Read src/ads/config.ts',
  },
];

function HouseAd({ creative }: { creative: (typeof CREATIVES)[number] }) {
  return (
    <div className="ad-card">
      <h3 className="ad-card-title">{creative.title}</h3>
      <p className="ad-card-body">{creative.body}</p>
      <span className="ad-card-cta">{creative.cta}</span>
    </div>
  );
}

export const houseProvider: AdProvider = {
  id: 'house',
  label: 'Ad',
  // Our own creatives: nothing forbids swapping them, so the rail rotates.
  rotates: true,
  mount(container: HTMLElement, ctx: AdContext) {
    const creative = CREATIVES[ctx.rotation % CREATIVES.length]!;
    // A React root rather than hand-built DOM: the placeholder is UI, and this
    // keeps it in the same idiom as the rest of the app while the *provider*
    // interface stays imperative for the networks that need it.
    const root = createRoot(container);
    root.render(<HouseAd creative={creative} />);
    return {
      dispose() {
        // Unmounting rather than clearing innerHTML: React keeps its own
        // bookkeeping, and leaving it behind would leak on every rotation.
        root.unmount();
      },
    };
  },
};
