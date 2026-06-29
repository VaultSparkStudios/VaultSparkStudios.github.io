#!/usr/bin/env node
/* build-og-cards.mjs — S196 per-title Open Graph card rasterizer.

   The win this ships: VaultSpark's growth thesis is "a shared link sells the studio."
   After S194 repointed 73 blank-SVG cards at static PNGs, ~48 pages still shared ONE
   generic card (35 on og-image.png, 13 journal pages on og-journal.png) — so a link to
   a game looked identical to a link to the privacy policy. S195 deferred the fix citing
   "needs native satori/resvg deps + Windows-build risk." That premise was FALSE: sharp
   is already a trusted devDependency and rasterizes the existing OG SVG template to a
   1200×630 PNG on this machine. This generates a bespoke per-title card for every page
   still on a generic card, with ZERO new dependencies and ZERO runtime cost.

   Non-destructive: pages that already carry a hand-made bespoke card (game covers, etc.)
   are LEFT ALONE — we never overwrite real art with a generated text card. Only meta
   tags currently pointing at a GENERIC_CARD are regenerated + rewritten.

   The card SVG is the single source of truth in scripts/lib/og-template.mjs (shared with
   the /_og/ preview worker). check-og-images.mjs already gates the result (no SVG, no
   missing asset), so this generator's output is validated by the existing build:check.

   Import-safe: side effects run only when invoked directly.
   Usage:
     node scripts/build-og-cards.mjs            # generate PNGs + rewrite generic-card meta
     node scripts/build-og-cards.mjs --check    # report which pages would change (no write)
     node scripts/build-og-cards.mjs --self-test
*/
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execSync } from './lib/safe-spawn.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { renderSvg } from './lib/og-template.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'assets', 'og');
const PROD = 'https://vaultsparkstudios.com';

// A share image counts as "generic" (every page looks the same) when it points here.
// Only meta tags on these targets get regenerated; bespoke art is never touched.
// S236: og-leaderboards.png added — all leaderboard sub-pages get distinct title cards
// (cod/football-gm leaderboards already reassigned to game-specific art; remaining 5
// category pages had identical cards despite unique titles).
export const GENERIC_CARDS = ['/assets/og-image.png', '/assets/og-journal.png', '/assets/og-leaderboards.png'];

// Secondary pages that intentionally started with strong bespoke art but still need
// their own crawler-facing cards because social platforms collapse identical og:image
// URLs into indistinguishable shares.
const DUPLICATE_CARD_OVERRIDES = new Set([
  'leaderboards/call-of-doodie/index.html',
  'games/gridiron-gm-play/index.html',
  'leaderboards/football-gm/index.html',
  'vaultspark-football-gm/index.html',
  'universe/voidfall/index.html',
  'invite/index.html',
  'projects/vault-member/index.html',
]);

// Pages where a generic studio card is correct/intended — never bespoke these.
const SKIP_PATH = [
  'vault-member', 'investor-portal', 'studio-hub', 'share/', 'open-source',
  '404.html', 'offline.html', 'google-site-verification',
];

// rel path → stable slug for the PNG filename.  index.html → "home".
export function slugFor(rel) {
  const p = rel.replace(/\\/g, '/').replace(/\/index\.html$/, '').replace(/\.html$/, '');
  if (p === 'index' || p === '') return 'home';
  return p.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

// Path-based eyebrow + status (mirrors update-og-images.getMeta).
export function metaFor(rel) {
  const p = rel.replace(/\\/g, '/');
  if (p.startsWith('games/') && p !== 'games/index.html') {
    const slug = p.split('/')[1];
    const statusMap = {
      'call-of-doodie': 'sparked', 'vaultspark-football-gm': 'sparked',
      'gridiron-gm': 'forge', 'mindframe': 'forge', 'project-unknown': 'sealed',
      'solara': 'forge', 'the-exodus': 'forge', 'vaultfront': 'forge',
    };
    return { eyebrow: 'Game · VaultSpark Studios', status: statusMap[slug] || 'forge' };
  }
  if (p.startsWith('games/')) return { eyebrow: 'Games · VaultSpark Studios', status: 'sparked' };
  if (p.startsWith('universe/')) return { eyebrow: 'Universe · VaultSpark Studios', status: 'forge' };
  if (p.startsWith('journal/')) return { eyebrow: 'Journal · VaultSpark Studios', status: 'sparked' };
  if (p.startsWith('leaderboards/') || p.startsWith('api/leaderboard')) return { eyebrow: 'Leaderboard · VaultSpark Studios', status: 'sparked' };
  if (p.startsWith('membership/') || p.startsWith('vaultsparked/')) return { eyebrow: 'Vault Membership · VaultSpark Studios', status: 'sparked' };
  if (p.startsWith('studio-pulse/') || p.startsWith('ignis/') || p.startsWith('notebook/') || p.startsWith('signal-log/')) return { eyebrow: 'Studio · VaultSpark Studios', status: 'sparked' };
  if (p.startsWith('vault-wall/') || p.startsWith('social/') || p.startsWith('invite/')) return { eyebrow: 'Community · VaultSpark Studios', status: 'sparked' };
  if (p.startsWith('press/') || p.startsWith('studio/')) return { eyebrow: 'About · VaultSpark Studios', status: 'sparked' };
  if (p.startsWith('changelog/')) return { eyebrow: 'Changelog · VaultSpark Studios', status: 'sparked' };
  if (p === 'index.html') return { eyebrow: 'Vault · SPARKED', status: 'sparked' };
  return { eyebrow: 'VaultSpark Studios', status: 'sparked' };
}

function ogTitle(html) {
  const m = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
  return m ? m[1] : null;
}

// The card footer already carries the VAULTSPARK STUDIOS wordmark, so a "| VaultSpark
// Studios" suffix in the og:title would waste 2 of the 3 big title lines on redundant
// branding. Drop the brand segment (split on |) so the headline is the page's real name.
// Decode the handful of HTML entities that appear in og:title values.
export function cleanCardTitle(title) {
  const decoded = String(title)
    .replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const parts = decoded.split('|').map((s) => s.trim()).filter(Boolean);
  const nonBrand = parts.filter((p) => !/^VaultSpark Studios\b/i.test(p));
  return (nonBrand.length ? nonBrand.join(' — ') : 'VaultSpark Studios');
}
function metaImage(html, key) {
  const re = new RegExp(`<meta\\s+(?:property|name)="${key}"\\s+content="([^"]*)"`, 'i');
  const m = html.match(re);
  return m ? m[1] : null;
}
// Strip the prod origin so a value can be compared to GENERIC_CARDS path form.
function asPath(url) { return (url || '').replace(PROD, ''); }
function isGeneric(url) { return GENERIC_CARDS.includes(asPath(url)); }
// A card this generator already produced — re-render it so a template/title change
// (e.g. cleanCardTitle) refreshes the PNG content even though the meta already points here.
function isOurs(url) { return /\/assets\/og\/og-[^"?]+\.png(\?|$)/.test(url || ''); }

export async function renderCardPng({ title, eyebrow, status }) {
  const svg = renderSvg({ title, eyebrow, status, theme: 'dark' });
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}

function listPages() {
  return execSync('git ls-files "*.html"', { cwd: ROOT, encoding: 'utf8' })
    .split('\n').filter(Boolean)
    .filter((f) => !f.startsWith('docs/'))
    .filter((f) => DUPLICATE_CARD_OVERRIDES.has(f.replace(/\\/g, '/')) || !SKIP_PATH.some((s) => f.includes(s)));
}

async function run({ check } = {}) {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const pages = listPages();
  let generated = 0, rewritten = 0, scanned = 0;
  const changes = [];

  for (const rel of pages) {
    const full = join(ROOT, rel);
    let html = readFileSync(full, 'utf8');
    const og = metaImage(html, 'og:image');
    const tw = metaImage(html, 'twitter:image');
    const forceBespoke = DUPLICATE_CARD_OVERRIDES.has(rel.replace(/\\/g, '/'));
    // Process if a share image is still a generic card (rewrite needed) OR already points
    // at a card we generated (content refresh on template/title change). Bespoke hand-art
    // (game covers etc.) matches neither and is left untouched.
    if (!forceBespoke && !isGeneric(og) && !isGeneric(tw) && !isOurs(og) && !isOurs(tw)) continue;
    scanned++;

    const rawTitle = ogTitle(html);
    if (!rawTitle) continue;
    const title = cleanCardTitle(rawTitle);
    const slug = slugFor(rel);
    const { eyebrow, status } = metaFor(rel);
    const cardRel = `assets/og/og-${slug}.png`;
    const cardUrl = `${PROD}/${cardRel}`;
    changes.push({ rel, slug, title });

    if (!check) {
      const png = await renderCardPng({ title, eyebrow, status });
      writeFileSync(join(ROOT, cardRel), png);
      generated++;
      // Rewrite ONLY the meta tags that currently point at a generic card.
      let next = html;
      if (forceBespoke || isGeneric(og)) {
        next = next.replace(/(<meta\s+property="og:image"\s+content=")[^"]+(")/i, `$1${cardUrl}$2`);
      }
      if (forceBespoke || isGeneric(tw)) {
        next = next.replace(/(<meta\s+(?:property|name)="twitter:image"\s+content=")[^"]+(")/i, `$1${cardUrl}$2`);
      }
      if (next !== html) { writeFileSync(full, next, 'utf8'); rewritten++; }
    }
  }

  if (check) {
    console.log(`build-og-cards --check: ${changes.length} page(s) on a generic card would get a bespoke PNG`);
    changes.slice(0, 50).forEach((c) => console.log(`  • ${c.rel} → og-${c.slug}.png`));
    process.exit(0);
  }
  console.log(`✓ build-og-cards: ${generated} bespoke card(s) rendered · ${rewritten} page(s) rewritten · ${scanned} scanned`);
}

async function selfTest() {
  let fail = 0;
  const assert = (c, m) => { if (!c) { console.error('  ✗ ' + m); fail++; } };
  assert(slugFor('index.html') === 'home', 'index.html → home');
  assert(slugFor('journal/first-sparks/index.html') === 'journal-first-sparks', 'nested slug');
  assert(slugFor('privacy/index.html') === 'privacy', 'simple slug');
  assert(isGeneric('https://vaultsparkstudios.com/assets/og-image.png'), 'prod generic detected');
  assert(isGeneric('/assets/og-journal.png'), 'path generic detected');
  assert(!isGeneric('/assets/og-cod.png'), 'bespoke card not flagged generic');
  assert(metaFor('games/gridiron-gm/index.html').status === 'forge', 'game status mapped');
  assert(cleanCardTitle('FAQ | VaultSpark Studios') === 'FAQ', 'strips trailing brand suffix');
  assert(cleanCardTitle('VaultSpark Studios | The Vault Is Sparked') === 'The Vault Is Sparked', 'strips leading brand segment');
  assert(cleanCardTitle('Signal Log | VaultSpark Studios Devlog') === 'Signal Log', 'strips brand-prefixed tail segment');
  assert(cleanCardTitle('IGNIS — Studio Cognition Score | VaultSpark Studios') === 'IGNIS — Studio Cognition Score', 'keeps em-dash subtitles intact');
  assert(cleanCardTitle('VaultSpark Studios') === 'VaultSpark Studios', 'brand-only title survives');
  // sharp actually rasterizes the card
  const png = await renderCardPng({ title: 'Self Test', eyebrow: 'Test', status: 'sparked' });
  const meta = await sharp(png).metadata();
  assert(meta.width === 1200 && meta.height === 630, `card is 1200×630 (got ${meta.width}×${meta.height})`);
  if (fail === 0) { console.log('✓ build-og-cards --self-test: 13/13 passed'); process.exit(0); }
  console.error(`✗ build-og-cards --self-test: ${fail} failed`); process.exit(1);
}

const RUN_DIRECT = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('build-og-cards.mjs');
if (RUN_DIRECT) {
  if (process.argv.includes('--self-test')) selfTest();
  else run({ check: process.argv.includes('--check') });
}
