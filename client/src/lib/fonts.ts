import opentype from 'opentype.js';
import type { FontRecord } from '@captioner/shared';

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
  return { family, fileName: file.name, dataBase64: arrayBufferToBase64(buf) };
}

/** Re-register a font from a saved project's embedded bytes. */
export async function registerFontRecord(rec: FontRecord): Promise<void> {
  if (!rec.dataBase64) return;
  const face = new FontFace(rec.family, base64ToArrayBuffer(rec.dataBase64));
  await face.load();
  document.fonts.add(face);
}
