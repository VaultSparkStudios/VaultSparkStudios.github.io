#!/usr/bin/env node
/* build-game-covers.mjs — S200 bespoke game-card cover rasterizer.

   The win: the games grid is the #1 conversion surface and every card was a bare
   radial-gradient blur behind text — uniform and impersonal, the opposite of
   "studio-owned, not generic" (SOUL). This generates one branded SVG→PNG cover tile
   per game (per-game accent palette + serif title lockup + genre eyebrow + status +
   a faint vault grid texture) so each card reads as its own world. ZERO new deps —
   sharp@0.34.5 is already a trusted devDependency (S196 OG-card pattern reused).

   Covers are keyed by the per-game CSS class already on each .card-hero (.doodie,
   .gridiron, …) so wiring is one CSS block per class and the HTML needs no change.
   The radial gradient stays as the load/fallback layer behind the image.

   Import-safe: side effects run only when invoked directly.
   Usage:
     node scripts/build-game-covers.mjs            # render assets/covers/<class>.png
     node scripts/build-game-covers.mjs --check    # report what would render (no write)
     node scripts/build-game-covers.mjs --self-test
*/
import { writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'assets', 'covers');
const W = 800, H = 460;

// class → cover spec. Accent hi/lo mirror the existing .card-hero::before gradients.
export const COVERS = [
  { cls: 'doodie',      title: 'Call of Doodie',  eyebrow: 'Action Comedy Shooter', status: 'SPARKED', hi: '#e84040', lo: '#6b1a1a' },
  { cls: 'gridiron',    title: 'Gridiron GM',     eyebrow: 'Franchise Simulation',  status: 'VAULTED', hi: '#1fa2ff', lo: '#0a3d70' },
  { cls: 'footballgm',  title: 'Franchise Architect',     eyebrow: 'NFL Front Office Sim',  status: 'SPARKED', hi: '#22c55e', lo: '#064e1e' },
  { cls: 'vaultfront',  title: 'VaultFront',      eyebrow: 'Real-Time Strategy',    status: 'FORGE',   hi: '#ffc400', lo: '#5c3d00' },
  { cls: 'solara',      title: 'Solara',          eyebrow: 'Roguelite RPG',         status: 'FORGE',   hi: '#c084fc', lo: '#3b0764' },
  { cls: 'mindframe',   title: 'MindFrame',       eyebrow: 'Cognitive Puzzle',      status: 'FORGE',   hi: '#06b6d4', lo: '#012d35' },
  { cls: 'the-exodus',  title: 'The Exodus',      eyebrow: 'Narrative Survival',    status: 'FORGE',   hi: '#f97316', lo: '#4a1d05' },
  { cls: 'vault-sealed', title: 'Project ???',    eyebrow: 'Classified',            status: 'SEALED',  hi: '#64748b', lo: '#0f172a' },
  // S249 — bespoke covers for the 2 spotlit PROJECTS (not games) that S248's hero
  // recuration surfaced (Call of Doodie · MindFrame · VEILOS · Vorn · Franchise Architect);
  // without these two, 2 of the 5 spotlight tiles fell back to accent-gradient-only.
  // Palettes + eyebrows are the products' own brand (api/public-intelligence.json).
  { cls: 'veilos',      title: 'VEILOS',          eyebrow: 'Cognitive Civilization OS', status: 'SPARKED', hi: '#22d3ee', lo: '#083344' },
  { cls: 'vorn',        title: 'Vorn',            eyebrow: 'Social Agent Platform', status: 'SPARKED', hi: '#a78bfa', lo: '#2e1065' },
];

const STATUS_COLOR = { SPARKED: '#fbbf24', VAULTED: '#94a3b8', FORGE: '#f59e0b', SEALED: '#cbd5e1' };

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Title auto-fits: shrink font for long names so it never clips the tile.
function titleSize(title) {
  const n = title.length;
  if (n <= 9) return 92;
  if (n <= 13) return 74;
  if (n <= 18) return 58;
  return 46;
}

export function renderCoverSvg({ title, eyebrow, status, hi, lo }) {
  const ts = titleSize(title);
  const sc = STATUS_COLOR[status] || '#cbd5e1';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="28%" cy="34%" r="85%">
      <stop offset="0%" stop-color="${hi}" stop-opacity="0.92"/>
      <stop offset="46%" stop-color="${lo}" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#07080f" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="legibility" x1="0" y1="0" x2="0" y2="1">
      <stop offset="40%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.66"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0V40" fill="none" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="#07080f"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <rect width="${W}" height="${H}" fill="url(#legibility)"/>
  <text x="44" y="64" font-family="Inter, system-ui, sans-serif" font-size="22" font-weight="700"
        letter-spacing="3" fill="${sc}">${esc(status)}</text>
  <text x="44" y="${H - 96}" font-family="Inter, system-ui, sans-serif" font-size="22" font-weight="600"
        letter-spacing="1.5" fill="#c8d2ec" opacity="0.92">${esc(eyebrow.toUpperCase())}</text>
  <text x="42" y="${H - 36}" font-family="Georgia, 'Times New Roman', serif" font-size="${ts}" font-weight="700"
        letter-spacing="-1" fill="#ffffff">${esc(title)}</text>
</svg>`;
}

export async function renderCoverPng(spec) {
  return sharp(Buffer.from(renderCoverSvg(spec))).png({ compressionLevel: 9 }).toBuffer();
}

// D-S208: modern-format siblings. Covers are CSS background-images delivered via
// image-set() with a PNG fallback (progressive enhancement, @supports-guarded), so
// emitting AVIF + WebP next to each PNG cuts the cover payload ~60-75% on the
// homepage hero and games grid with zero markup risk — non-supporting browsers
// keep the PNG. sharp@0.34.5 (trusted devDep) rasterizes all three from one SVG.
export async function renderCoverWebp(spec) {
  return sharp(Buffer.from(renderCoverSvg(spec))).webp({ quality: 78, effort: 5 }).toBuffer();
}
export async function renderCoverAvif(spec) {
  return sharp(Buffer.from(renderCoverSvg(spec))).avif({ quality: 52, effort: 5 }).toBuffer();
}

async function run({ check } = {}) {
  if (!check && !existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  let n = 0, bytesPng = 0, bytesModern = 0;
  for (const spec of COVERS) {
    const rel = `assets/covers/${spec.cls}.png`;
    if (check) { console.log(`  • would render ${rel} (+.webp +.avif) (${spec.title})`); n++; continue; }
    const [png, webp, avif] = await Promise.all([
      renderCoverPng(spec), renderCoverWebp(spec), renderCoverAvif(spec),
    ]);
    writeFileSync(join(ROOT, rel), png);
    writeFileSync(join(ROOT, `assets/covers/${spec.cls}.webp`), webp);
    writeFileSync(join(ROOT, `assets/covers/${spec.cls}.avif`), avif);
    bytesPng += png.length; bytesModern += avif.length;
    n++;
  }
  const saved = bytesPng > 0 ? Math.round((1 - bytesModern / bytesPng) * 100) : 0;
  console.log(check
    ? `build-game-covers --check: ${n} cover(s) would render (png+webp+avif)`
    : `✓ build-game-covers: ${n} cover tile(s) rendered → assets/covers/ (png+webp+avif · AVIF ~${saved}% smaller than PNG)`);
}

async function selfTest() {
  let fail = 0;
  const assert = (c, m) => { if (!c) { console.error('  ✗ ' + m); fail++; } };
  assert(COVERS.length === 10, 'all 8 games + 2 spotlit projects (VEILOS, Vorn) have a cover spec');
  assert(COVERS.some(c => c.cls === 'veilos') && COVERS.some(c => c.cls === 'vorn'), 'S249 spotlight projects have covers');
  assert(COVERS.every(c => c.cls && c.title && c.hi && c.lo), 'every spec has class + title + palette');
  assert(new Set(COVERS.map(c => c.cls)).size === COVERS.length, 'cover classes are unique');
  assert(titleSize('Franchise Architect Extended') < titleSize('Solara'), 'long titles shrink');
  const svg = renderCoverSvg(COVERS[0]);
  assert(svg.includes('Call of Doodie') && svg.includes('SPARKED'), 'svg carries title + status');
  const png = await renderCoverPng(COVERS[0]);
  const meta = await sharp(png).metadata();
  assert(meta.width === W && meta.height === H, `cover is ${W}×${H} (got ${meta.width}×${meta.height})`);
  if (fail === 0) { console.log('✓ build-game-covers --self-test: 6/6 passed'); process.exit(0); }
  console.error(`✗ build-game-covers --self-test: ${fail} failed`); process.exit(1);
}

const RUN_DIRECT = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('build-game-covers.mjs');
if (RUN_DIRECT) {
  if (process.argv.includes('--self-test')) selfTest();
  else run({ check: process.argv.includes('--check') });
}
