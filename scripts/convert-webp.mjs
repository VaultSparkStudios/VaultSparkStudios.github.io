import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dir, '..', 'assets');

const FILES = [
  'darth-spike-poster.jpg',
  'darth-spike-still-1.jpg',
  'darth-spike-still-2.jpg',
  'darth-spike-still-3.jpg',
];

for (const f of FILES) {
  const src = join(ASSETS, f);
  const out = join(ASSETS, f.replace('.jpg', '.webp'));
  const info = await sharp(src).webp({ quality: 82 }).toFile(out);
  const orig = (await import('fs')).statSync(src).size;
  const pct  = Math.round((1 - info.size / orig) * 100);
  console.log(`  ✓ ${f.replace('.jpg', '.webp')}  ${Math.round(info.size/1024)}KB  (${pct}% smaller)`);
}
console.log('\nDone.');
