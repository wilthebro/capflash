import opentype from 'opentype.js';
import type { FontMetrics, FontRecord } from '@captioner/shared';

/**
 * The metrics libass normalises a face's drawn size by, read off the file we
 * are about to hand it. Undefined when the OS/2 table is missing or unusable,
 * which leaves the ASS size unconverted rather than guessed at.
 * See FontMetrics in shared/src/types.ts for why this is needed at all.
 */
export function fontMetricsOf(font: opentype.Font): FontMetrics | undefined {
  const os2 = font.tables.os2 as { usWinAscent?: unknown; usWinDescent?: unknown } | undefined;
  const unitsPerEm = font.unitsPerEm;
  if (!os2 || !(unitsPerEm > 0)) return undefined;
  const { usWinAscent, usWinDescent } = os2;
  if (typeof usWinAscent !== 'number' || typeof usWinDescent !== 'number') return undefined;
  if (usWinAscent + usWinDescent <= 0) return undefined;
  return { unitsPerEm, winAscent: usWinAscent, winDescent: usWinDescent };
}

/** Curated fallback list — always available, covers the common caption fonts. */
export const FALLBACK_FONTS = [
  'Arial',
  'Helvetica Neue',
  'Helvetica',
  'Verdana',
  'Tahoma',
  'Segoe UI',
  'Trebuchet MS',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Impact',
  'Comic Sans MS',
  'Montserrat',
  'Poppins',
  'Roboto',
  'Oswald',
  'Bebas Neue',
];

/** Chromium-only; permission-gated. Falls back to the curated list. */
export async function listSystemFonts(): Promise<string[]> {
  const set = new Set<string>(FALLBACK_FONTS);
  try {
    const w = window as unknown as { queryLocalFonts?: () => Promise<{ family: string }[]> };
    if (w.queryLocalFonts) {
      const all = await w.queryLocalFonts();
      for (const f of all) set.add(f.family);
    }
  } catch {
    // permission denied or unsupported — curated list only
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/** Parse a font file, register it as a FontFace, and return its record (with embedded bytes). */
export async function loadFontFile(file: File): Promise<FontRecord> {
  const buf = await file.arrayBuffer();
  const font = opentype.parse(buf);
  const family = font.names?.fontFamily?.en ?? file.name.replace(/\.[^.]+$/, '');
  const face = new FontFace(family, buf);
  await face.load();
  document.fonts.add(face);
  return {
    family,
    fileName: file.name,
    dataBase64: arrayBufferToBase64(buf),
    metrics: fontMetricsOf(font),
  };
}

/** Re-register a font from a saved project's embedded bytes. */
export async function registerFontRecord(rec: FontRecord): Promise<void> {
  if (!rec.dataBase64) return;
  const face = new FontFace(rec.family, base64ToArrayBuffer(rec.dataBase64));
  await face.load();
  document.fonts.add(face);
}
