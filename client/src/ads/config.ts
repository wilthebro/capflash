import { createAdsenseProvider } from './providers/adsense';
import { houseProvider } from './providers/house';
import type { AdProvider } from './types';

// ---------------------------------------------------------------------------
// The ad setup lives here. Everything below is the whole configuration surface.
// ---------------------------------------------------------------------------

/** AdSense ids — fill both in, then point AD_PROVIDER at `adsenseProvider`. */
export const ADSENSE = {
  client: '', // 'ca-pub-XXXXXXXXXXXXXXXX'
  slot: '', // '1234567890'
};

const adsenseProvider = createAdsenseProvider(ADSENSE);

/** Which provider serves the rail. Swap this line to change networks. */
export const AD_PROVIDER: AdProvider = houseProvider;

/**
 * Hard floor on how long an ad stays up, in milliseconds. Nothing on a timer
 * rotates an ad: once this has elapsed, the *next* thing the user does to the
 * player swaps it. See `useAdRotation`.
 */
export const AD_MIN_DISPLAY_MS = 30_000;

/** Set false to drop the rail entirely (the column is also hidden on narrow windows). */
export const ADS_ENABLED = true;
