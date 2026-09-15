/** Where an ad is being placed. Currently only the right-hand rail. */
export type AdSlotId = 'sidebar';

export interface AdContext {
  slot: AdSlotId;
  /** Which ad in the rotation this is, counting from 0 — a provider picks its creative with it. */
  rotation: number;
}

export interface AdMount {
  /** Remove the ad *and* everything it created: nodes, listeners, timers. */
  dispose(): void;
}

/**
 * An ad source. `mount` is imperative rather than a React component on purpose:
 * every real network works by injecting a `<script>`/`<ins>` into a container
 * (AdSense's `adsbygoogle.push`, EthicalAds' loader), so an imperative mount is
 * the lowest common denominator they all fit. A provider that only draws UI can
 * still use React — see `reactMount.ts`.
 *
 * Swapping networks is a one-line change in `config.ts`.
 */
export interface AdProvider {
  id: string;
  label: string; // shown in the slot's "Ad" chip — the network's name once it is real
  /**
   * Whether the slot may swap this provider's ad for a fresh one after it has
   * been up a while. True for your own creatives; **false for AdSense**, which
   * forbids site-initiated refresh — Google's policy is that an ad may only be
   * refreshed when the user asks for a refresh, so a timed or action-gated swap
   * is out. Encoding it here rather than in a comment means a network that
   * prohibits it physically cannot be rotated.
   */
  rotates: boolean;
  /** Called with a container that is already in the document. */
  mount(container: HTMLElement, ctx: AdContext): AdMount | void;
}
