import opentype from 'opentype.js';
import type { FontRecord } from '@captioner/shared';
import { arrayBufferToBase64, fontMetricsOf } from './fonts';
import regularUrl from '../assets/fonts/Montserrat-Regular.ttf?url';
import extraBoldUrl from '../assets/fonts/Montserrat-ExtraBold.ttf?url';

/**
 * Fonts shipped with the editor. Montserrat (SIL OFL, see
 * assets/fonts/OFL-Montserrat.txt) is the default caption face: it is a heavy
 * geometric sans that stays legible over busy video, and shipping it means the
 * preview and the export agree without the user installing anything.
 *
 * The ExtraBold cut is patched at build-time-adjacent (scripts/patch-montserrat.mjs)
 * so its family name is plain "Montserrat": libass matches `Fontname` against
 * the name table's family record, and the stock file calls itself
 * "Montserrat ExtraBold" — a separate family it would never match.
 */
const BUNDLED = [
  { family: 'Montserrat', weight: 400, fileName: 'Montserrat-Regular.ttf', url: regularUrl },
  { family: 'Montserrat', weight: 800, fileName: 'Montserrat-ExtraBold.ttf', url: extraBoldUrl },
] as const;

const records: FontRecord[] = [];
let initPromise: Promise<void> | null = null;

async function load(): Promise<void> {
  const loaded = await Promise.all(
    BUNDLED.map(async (spec) => {
      const res = await fetch(spec.url);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const buf = await res.arrayBuffer();
      const face = new FontFace(spec.family, buf, { weight: String(spec.weight) });
      await face.load();
      document.fonts.add(face);
      // The export's px -> ASS-Fontsize fixup needs these; a parse failure must
      // not cost us the font itself, so it degrades to "no correction".
      let metrics;
      try {
        metrics = fontMetricsOf(opentype.parse(buf));
      } catch {
        metrics = undefined;
      }
      return {
        family: spec.family,
        fileName: spec.fileName,
        dataBase64: arrayBufferToBase64(buf),
        metrics,
      };
    }),
  );
  records.push(...loaded);
}

/**
 * Register the bundled faces with the document (idempotent). Resolves once the
 * faces are available to canvas measurement and the DOM; a failed fetch warns
 * and leaves the editor running with whatever fonts the system provides.
 */
export function initBundledFonts(): Promise<void> {
  if (!initPromise) {
    initPromise = load().catch((err: unknown) => {
      // Never block startup on a font: the fallback list still renders.
      console.warn('Bundled fonts could not be loaded:', err);
    });
  }
  return initPromise;
}

/** Await this before measuring, exporting, or painting bundled text. */
export function bundledFontsReady(): Promise<void> {
  return initBundledFonts();
}

/** The bundled fonts as they should appear in a render spec (empty until loaded). */
export function bundledFontRecords(): FontRecord[] {
  return records;
}
