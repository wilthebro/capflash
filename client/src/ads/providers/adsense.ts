import type { AdProvider } from '../types';

const SCRIPT_BASE = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';

export interface AdsenseConfig {
  client: string; // 'ca-pub-XXXXXXXXXXXXXXXX'
  slot: string; // '1234567890'
}

/**
 * Google AdSense. Takes its ids rather than importing them, so the settings
 * stay in `config.ts` and the provider can be dropped in anywhere. Inert until
 * both are filled in, so the app makes no network request out of the box.
 *
 * This is the template for any script-tag network: build the markup the network
 * expects, pull in its loader once, then hand it the node. Everything created
 * here is torn down by `dispose`, which the slot calls before each rotation —
 * without that, every rotation would leave another <ins> and another push()
 * behind.
 */
export function createAdsenseProvider(config: AdsenseConfig): AdProvider {
  return {
    id: 'adsense',
    label: 'AdSense',
    // AdSense forbids site-initiated refresh: an ad may only be replaced when
    // the user asks for a refresh, so a timed or action-gated swap is out.
    // This is what stops the rail rotating an AdSense unit.
    rotates: false,
    mount(container: HTMLElement) {
      if (!config.client || !config.slot) return;

      const ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.display = 'block';
      // Nothing is served until the domain is approved, and an ad can take a
      // moment to arrive; holding the space keeps the rail from collapsing and
      // then jumping when the creative lands.
      ins.style.minHeight = '250px';
      ins.dataset.adClient = config.client;
      ins.dataset.adSlot = config.slot;
      ins.dataset.adFormat = 'auto';
      ins.dataset.fullWidthResponsive = 'true';
      container.appendChild(ins);

      // The loader is shared and wanted exactly once, and it is NOT removed by
      // dispose — re-adding it on a later mount would re-download it for
      // nothing. The match is deliberately loose (any adsbygoogle.js script):
      // the snippet AdSense tells you to paste into index.html carries a
      // `?client=` query, so an exact src comparison would miss it and inject a
      // second copy alongside it.
      if (!document.querySelector('script[src*="adsbygoogle.js"]')) {
        const script = document.createElement('script');
        // Same URL shape as the snippet AdSense gives you, client param and all.
        script.src = `${SCRIPT_BASE}?client=${encodeURIComponent(config.client)}`;
        script.async = true;
        script.crossOrigin = 'anonymous';
        container.appendChild(script);
      }

      const w = window as unknown as { adsbygoogle?: unknown[] };
      w.adsbygoogle = w.adsbygoogle || [];
      w.adsbygoogle.push({});

      return {
        dispose() {
          ins.remove();
        },
      };
    },
  };
}
