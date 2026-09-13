/**
 * Montserrat's ExtraBold TTF declares its family (name table, nameID 1) as
 * "Montserrat ExtraBold" — a *separate* family rather than a weight of
 * "Montserrat". libass/fontconfig match the ASS `Fontname` against nameID 1, so
 * `Fontname: Montserrat, Bold: -1` would never find this face and would fall
 * back to emboldened Regular — the exported MP4 would not match the preview.
 *
 * This rewrites that string in place to "Montserrat" and leaves the OS/2
 * usWeightClass (800) to select the face: fontconfig ranks candidates by
 * numeric weight, so a bold request picks 800 and a regular one picks 400.
 *
 * The patch is byte-for-byte in-place (no re-serialization, so kerning/GPOS
 * tables survive); only the name record's length, the name table checksum and
 * head.checkSumAdjustment change. Re-running it is a no-op.
 *
 * Usage: node scripts/patch-montserrat.mjs [path-to-ttf]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const DEFAULT_PATH = path.resolve(
  import.meta.dirname,
  '../client/src/assets/fonts/Montserrat-ExtraBold.ttf',
);
const FROM = 'Montserrat ExtraBold';
const TO = 'Montserrat';

const file = process.argv[2] ?? DEFAULT_PATH;

/** Sum of big-endian uint32s over a table, zero-padded past its end. */
function tableChecksum(buf, offset, length) {
  let sum = 0;
  for (let i = 0; i < length; i += 4) {
    const b0 = buf[offset + i] ?? 0;
    const b1 = buf[offset + i + 1] ?? 0;
    const b2 = buf[offset + i + 2] ?? 0;
    const b3 = buf[offset + i + 3] ?? 0;
    sum = (sum + (((b0 << 24) >>> 0) + (b1 << 16) + (b2 << 8) + b3)) >>> 0;
  }
  return sum >>> 0;
}

function tableDirectory(buf) {
  const numTables = buf.readUInt16BE(4);
  const tables = new Map();
  for (let i = 0; i < numTables; i++) {
    const recOffset = 12 + i * 16;
    tables.set(buf.toString('latin1', recOffset, recOffset + 4), {
      recOffset,
      offset: buf.readUInt32BE(recOffset + 8),
      length: buf.readUInt32BE(recOffset + 12),
    });
  }
  return tables;
}

/** Decode a platform-3 (Microsoft, UTF-16BE) name record. */
function readName(buf, nameTable, recordOffset) {
  const length = buf.readUInt16BE(recordOffset + 8);
  const offset = buf.readUInt16BE(recordOffset + 10);
  const strings = nameTable.offset + buf.readUInt16BE(nameTable.offset + 4);
  const raw = buf.subarray(strings + offset, strings + offset + length);
  const swapped = Buffer.alloc(raw.length);
  for (let i = 0; i < raw.length; i += 2) {
    swapped[i] = raw[i + 1];
    swapped[i + 1] = raw[i];
  }
  return swapped.toString('utf16le');
}

function familyOf(buf) {
  const tables = tableDirectory(buf);
  const name = tables.get('name');
  const count = buf.readUInt16BE(name.offset + 2);
  for (let i = 0; i < count; i++) {
    const rec = name.offset + 6 + i * 12;
    if (buf.readUInt16BE(rec) === 3 && buf.readUInt16BE(rec + 6) === 1) {
      return { family: readName(buf, name, rec), recordOffset: rec };
    }
  }
  throw new Error('no platform-3 nameID-1 record found');
}

const buf = readFileSync(file);
const { family, recordOffset } = familyOf(buf);

if (family === TO) {
  console.log(`✓ ${path.basename(file)} already patched (family "${TO}") — nothing to do`);
  process.exit(0);
}
if (family !== FROM) {
  throw new Error(`unexpected family "${family}" — expected "${FROM}"`);
}

const tables = tableDirectory(buf);
const name = tables.get('name');
const head = tables.get('head');
const strings = name.offset + buf.readUInt16BE(name.offset + 4);
const strOffset = strings + buf.readUInt16BE(recordOffset + 10);

// Same byte length (both UTF-16BE), so every following offset stays valid.
const fromBytes = Buffer.from(FROM, 'utf16le').swap16();
const toBytes = Buffer.from(TO, 'utf16le').swap16();
if (fromBytes.length !== buf.readUInt16BE(recordOffset + 8)) {
  throw new Error('record length does not match the string it points at');
}
buf.fill(0, strOffset, strOffset + fromBytes.length);
toBytes.copy(buf, strOffset);
buf.writeUInt16BE(toBytes.length, recordOffset + 8);

// Checksums: the name table changed, so its directory entry and the head
// adjustment (which covers the whole font) both need recomputing.
buf.writeUInt32BE(tableChecksum(buf, name.offset, name.length), name.recOffset + 4);
buf.writeUInt32BE(0, head.offset + 8);
let sum = 0;
for (const t of tables.values()) sum = (sum + tableChecksum(buf, t.offset, t.length)) >>> 0;
buf.writeUInt32BE((0xb1b0afba - sum) >>> 0, head.offset + 8);

writeFileSync(file, buf);

const after = familyOf(readFileSync(file));
const os2 = tableDirectory(buf).get('OS/2');
console.log(
  `✓ patched ${path.basename(file)}: family "${family}" -> "${after.family}", ` +
    `usWeightClass ${readFileSync(file).readUInt16BE(os2.offset + 4)}`,
);
