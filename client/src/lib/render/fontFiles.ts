import type { RenderSpec, SegmentStyle } from '@captioner/shared';
import { base64ToArrayBuffer } from '../fonts';

/**
 * Local Font Access API. Chromium-only and permission-gated, so every use is
 * optional: `queryLocalFonts` may be missing, or may reject when the user
 * declines. It is the only way to get the BYTES of a system font.
 */
interface LocalFontData {
  family: string;
  fullName: string;
  postscriptName: string;
  style: string;
  weight: number;
  blob(): Promise<Blob>;
}
type QueryLocalFonts = (options?: { postscriptNames?: string[] }) => Promise<LocalFontData[]>;

export interface ResolvedFontFile {
  family: string;
  weight: number;
  fileName: string;
  bytes: Uint8Array;
}

export interface ResolvedFonts {
  /**
   * The spec to actually render. Families that could not be resolved are
   * rewritten to the fallback, so the ASS can never name a font that has no
   * file — wasm libass has no fontconfig, and a missing face draws NOTHING
   * rather than falling back on its own.
   */
  spec: RenderSpec;
  files: ResolvedFontFile[];
  /** Families that were swapped for the fallback, for the caller to report. */
  substituted: string[];
}

export const FALLBACK_FAMILY = 'Montserrat';

/** Every distinct (family, weight) an ASS will ask libass for. */
function neededFaces(spec: RenderSpec): { family: string; weight: number }[] {
  const seen = new Map<string, { family: string; weight: number }>();
  for (const seg of spec.segments) {
    const { fontFamily, fontWeight } = seg.style;
    // >= 700 is what generateAss emits as ASS Bold, so that is the granularity
    // libass matches a face at — 700 and 800 want the same thing.
    const weight = fontWeight >= 700 ? 700 : 400;
    seen.set(`${fontFamily}|${weight}`, { family: fontFamily, weight });
  }
  return [...seen.values()];
}

/** Closest available weight, preferring the heavier face for bold requests. */
function closestWeight(fonts: LocalFontData[], family: string, weight: number): LocalFontData | undefined {
  const candidates = fonts.filter((f) => f.family.toLowerCase() === family.toLowerCase());
  if (candidates.length === 0) return undefined;
  return candidates.reduce((best, f) =>
    Math.abs(f.weight - weight) < Math.abs(best.weight - weight) ? f : best,
  );
}

/**
 * Turn every font in the spec into a file libass can read. Bundled and uploaded
 * fonts already carry their bytes (lib/bundledFonts.ts, FontRecord.dataBase64);
 * a system font does not, so its bytes have to be pulled from the Local Font
 * Access API. Anything still unresolved is rewritten to the bundled face rather
 * than left to render as an empty frame.
 */
export async function resolveFonts(spec: RenderSpec): Promise<ResolvedFonts> {
  const embedded = new Map(spec.fonts.map((f) => [f.family.toLowerCase(), f]));
  const files: ResolvedFontFile[] = [];
  const substituted: string[] = [];
  const resolvedFamilies = new Set<string>();

  let systemFonts: LocalFontData[] | null = null;
  const getSystemFonts = async (): Promise<LocalFontData[]> => {
    if (systemFonts) return systemFonts;
    try {
      const w = window as unknown as { queryLocalFonts?: QueryLocalFonts };
      systemFonts = w.queryLocalFonts ? await w.queryLocalFonts() : [];
    } catch {
      // Declined, or not Chromium. Treated exactly like "no such font".
      systemFonts = [];
    }
    return systemFonts;
  };

  for (const face of neededFaces(spec)) {
    if (resolvedFamilies.has(`${face.family}|${face.weight}`)) continue;

    const record = embedded.get(face.family.toLowerCase());
    if (record?.dataBase64) {
      files.push({
        family: face.family,
        weight: face.weight,
        fileName: record.fileName,
        bytes: new Uint8Array(base64ToArrayBuffer(record.dataBase64)),
      });
      resolvedFamilies.add(`${face.family}|${face.weight}`);
      continue;
    }

    const match = closestWeight(await getSystemFonts(), face.family, face.weight);
    if (match) {
      const bytes = new Uint8Array(await (await match.blob()).arrayBuffer());
      files.push({
        family: face.family,
        weight: face.weight,
        fileName: `${face.family}-${face.weight}.ttf`,
        bytes,
      });
      resolvedFamilies.add(`${face.family}|${face.weight}`);
      continue;
    }

    if (!substituted.includes(face.family)) substituted.push(face.family);
  }

  if (substituted.length === 0) return { spec, files, substituted };

  const swap = (style: SegmentStyle): SegmentStyle =>
    substituted.includes(style.fontFamily) ? { ...style, fontFamily: FALLBACK_FAMILY } : style;

  return {
    spec: {
      ...spec,
      segments: spec.segments.map((seg) => ({
        ...seg,
        style: swap(seg.style),
        // Events carry their own style copy — generateAss reads those, not the
        // segment's, so both have to be rewritten or the ASS keeps the old name.
        events: seg.events.map((e) => ({ ...e, style: swap(e.style) })),
      })),
    },
    files,
    substituted,
  };
}
