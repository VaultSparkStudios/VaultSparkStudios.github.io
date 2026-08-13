#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};
const inputDir = path.resolve(arg('--input', '.cache/s314-visual'));
const output = path.resolve(arg('--output', '.cache/s314-visual-contact-sheet.jpg'));
const contains = arg('--contains', '');
const files = fs.readdirSync(inputDir).filter((file) => /\.(png|jpe?g)$/i.test(file) && (!contains || file.includes(contains))).sort();
if (!files.length) throw new Error(`No images found in ${inputDir}`);

const cellWidth = Number(arg('--cell-width', '420'));
const cellHeight = Number(arg('--cell-height', '260'));
const quality = Number(arg('--quality', '78'));
const columns = Number(arg('--columns', '4'));
const rows = Math.ceil(files.length / columns);
const cells = [];
for (let index = 0; index < files.length; index += 1) {
  const file = files[index];
  const label = file.replace(/[&<>]/g, '');
  const left = (index % columns) * cellWidth;
  const top = Math.floor(index / columns) * cellHeight;
  const buffer = await sharp(path.join(inputDir, file)).resize(cellWidth, cellHeight, { fit: 'cover', position: 'top' }).png().toBuffer();
  cells.push({ input: buffer, left, top });
  cells.push({ input: Buffer.from(`<svg width="${cellWidth}" height="34" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="34" fill="#07080f" fill-opacity=".9"/><text x="10" y="23" fill="#ffc400" font-family="Arial,sans-serif" font-size="13">${label}</text></svg>`), left, top });
}
await sharp({ create: { width: columns * cellWidth, height: rows * cellHeight, channels: 3, background: '#07080f' } })
  .composite(cells)
  .jpeg({ quality })
  .toFile(output);
console.log(`build-visual-contact-sheet: ${files.length} image(s) → ${output}`);
