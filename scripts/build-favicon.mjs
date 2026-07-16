#!/usr/bin/env node
/** Build a canonical favicon.ico from the committed 256px brand PNG. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'assets', 'icon-256.png');
const OUT = path.join(ROOT, 'favicon.ico');
const CHECK = process.argv.includes('--check');
const SELF_TEST = process.argv.includes('--self-test');

export function pngDimensions(png) {
  if (png.length < 24 || png.subarray(1, 4).toString('ascii') !== 'PNG') throw new Error('source is not a PNG');
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

export function buildIco(png) {
  const { width, height } = pngDimensions(png);
  if (width > 256 || height > 256 || width < 1 || height < 1) throw new Error(`ICO PNG dimensions must be 1..256 (got ${width}x${height})`);
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // icon
  header.writeUInt16LE(1, 4); // one image
  header.writeUInt8(width === 256 ? 0 : width, 6);
  header.writeUInt8(height === 256 ? 0 : height, 7);
  header.writeUInt8(0, 8); // PNG color count
  header.writeUInt8(0, 9);
  header.writeUInt16LE(1, 10); // planes
  header.writeUInt16LE(32, 12); // bit depth
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(header.length, 18);
  return Buffer.concat([header, png]);
}

if (SELF_TEST) {
  const fake = Buffer.alloc(24);
  fake.write('PNG', 1, 'ascii');
  fake.writeUInt32BE(256, 16);
  fake.writeUInt32BE(256, 20);
  const ico = buildIco(fake);
  const ok = ico.readUInt16LE(2) === 1 && ico.readUInt16LE(4) === 1 && ico.readUInt32LE(18) === 22 && ico.subarray(22).equals(fake);
  console.log(`build-favicon --self-test: ${ok ? 'ok' : 'FAIL'}`);
  process.exit(ok ? 0 : 1);
}

const expected = buildIco(fs.readFileSync(SOURCE));
if (CHECK) {
  const actual = fs.existsSync(OUT) ? fs.readFileSync(OUT) : Buffer.alloc(0);
  if (!actual.equals(expected)) {
    console.error('build-favicon --check: favicon.ico missing or drifted');
    process.exit(1);
  }
  console.log(`build-favicon --check: ok (${expected.length} bytes)`);
} else {
  fs.writeFileSync(OUT, expected);
  console.log(`build-favicon: wrote favicon.ico (${expected.length} bytes)`);
}
