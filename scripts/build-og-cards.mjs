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

   @check-mode dry-run — --check here REPORTS which pages would change and exits
   0 by design. It is not a drift gate; card coverage is gated by
   build-og-coverage.mjs --check, which IS wired into check-proof-surface.
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
  'franchise-architect/index.html',
  'universe/voidfall/index.html',
  'invite/index.html',
  'projects/vault-member/index.html',
  'ip/index.html',
]);

// Pages where a generic studio card is correct/intended — never bespoke these.
const SKIP_PATH = [
  'vault-member', 'investor-portal', 'studio-hub', 'share/', 'open-source',
  '404.html', 'offline.html', 'google-site-verification',
];

// S238: genuinely public/shareable pages that carry NO og:image today. A shared link
// to any of these currently renders with no card — a conversion leak on the studio's
// highest-intent landing surfaces (audience pathways, the Solara game, the membership
// value calculator, the "you asked / we shipped" feedback loop). These get a bespoke
// crawler card injected once (after <meta name="description">); thereafter the normal
// generic/ours refresh path maintains them. Anything NOT here and still card-less is
// classified intentionally-dark by check-og-images (auth, callbacks, .ai agent pages,
// gated investor portal, internal dashboards) — see OG_INTENTIONALLY_DARK there.
export const PUBLIC_NO_OG = [
  'pathways/index.html', 'pathways/builders/index.html', 'pathways/investors/index.html',
  'pathways/lore/index.html', 'pathways/players/index.html', 'pathways/press/index.html',
  'pathways/supporters/index.html',
  // S334: the Solara world pages moved under /games/solara/ (the old /solara/*
  // route 301'd them into 404s), and solara/index.html + membership-value were
  // retired to edge redirects. Paths follow the pages.
  'games/solara/archive.html', 'games/solara/chronicle.html',
  'feedback/index.html', 'stats/index.html',
  'stats/ecosystem/index.html', 'ask-founders/index.html',
  // S334: /evidence/ is the front door to the studio's live-data surfaces —
  // exactly the kind of link that gets shared into a thread about whether any
  // of this is real, so it must not render as a bare URL.
  'evidence/index.html',
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
      'call-of-doodie': 'sparked', 'franchise-architect': 'sparked',
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
  // S238: public no-og pages promoted to bespoke cards (see PUBLIC_NO_OG).
  if (p.startsWith('pathways/')) return { eyebrow: 'Pathways · VaultSpark Studios', status: 'sparked' };
  if (p.startsWith('solara/')) return { eyebrow: 'Game · VaultSpark Studios', status: 'forge' };
  if (p.startsWith('membership-value/')) return { eyebrow: 'Vault Membership · VaultSpark Studios', status: 'sparked' };
  if (p.startsWith('feedback/')) return { eyebrow: 'Community · VaultSpark Studios', status: 'sparked' };
  if (p.startsWith('stats/')) return { eyebrow: 'Public Analytica · VaultSpark Studios', status: 'sparked' };
  if (p === 'index.html') return { eyebrow: 'Vault · SPARKED', status: 'sparked' };
  return { eyebrow: 'VaultSpark Studios', status: 'sparked' };
}

function ogTitle(html) {
  const m = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
  return m ? m[1] : null;
}

// Best available headline for a card: og:title if present, else the <title> element.
// cleanCardTitle() later strips the redundant "| VaultSpark Studios" brand suffix.
export function pageTitle(html) {
  const og = ogTitle(html);
  if (og) return og;
  const m = html.match(/<title>([^<]+)<\/title>/i);
  return m ? m[1].trim() : null;
}

// Inject og:image + twitter:image immediately after the <meta name="description"> tag
// (the one anchor present on every PUBLIC_NO_OG page). Works on both pretty-printed and
// minified (whole-head-on-one-line) pages, preserving the source's whitespace and
// self-closing style. Idempotent: a no-op if og:image already exists.
export function injectOgImage(html, cardUrl) {
  if (/<meta\s+property="og:image"/i.test(html)) return html;
  // Capture any preceding newline+indent so we can mirror pretty vs minified layout.
  const descRe = /(\n[ \t]*)?(<meta\s+name="description"[^>]*>)/i;
  const m = html.match(descRe);
  if (!m) return html; // no anchor — caller skips (won't happen for PUBLIC_NO_OG)
  const lead = m[1] || '';            // '' when minified (no newline before the tag)
  const selfClose = /\/>\s*$/.test(m[2]) ? ' />' : '>';
  const sep = lead || '';
  const tags =
    `${sep}<meta property="og:image" content="${cardUrl}"${selfClose}` +
    `${sep}<meta name="twitter:image" content="${cardUrl}"${selfClose}`;
  return html.replace(descRe, (full) => full + tags);
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
  let generated = 0, rewritten = 0, scanned = 0, injected = 0;
  const changes = [];

  // S238 pre-pass: PUBLIC_NO_OG pages — render a bespoke card and inject og:image +
  // twitter:image where absent. Once injected, the normal isOurs() refresh path below
  // keeps them current, so this branch is a one-time promotion per page.
  for (const rel of PUBLIC_NO_OG) {
    const full = join(ROOT, rel);
    if (!existsSync(full)) continue;
    let html = readFileSync(full, 'utf8');
    if (/<meta\s+property="og:image"/i.test(html)) continue; // already promoted
    const rawTitle = pageTitle(html);
    if (!rawTitle) continue;
    const title = cleanCardTitle(rawTitle);
    const slug = slugFor(rel);
    const { eyebrow, status } = metaFor(rel);
    const cardRel = `assets/og/og-${slug}.png`;
    const cardUrl = `${PROD}/${cardRel}`;
    changes.push({ rel, slug, title, promoted: true });
    if (!check) {
      const png = await renderCardPng({ title, eyebrow, status });
      writeFileSync(join(ROOT, cardRel), png);
      generated++;
      const next = injectOgImage(html, cardUrl);
      if (next !== html) { writeFileSync(full, next, 'utf8'); injected++; }
    }
  }

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
    console.log(`build-og-cards --check: ${changes.length} page(s) would get a bespoke PNG`);
    changes.slice(0, 60).forEach((c) => console.log(`  • ${c.rel} → og-${c.slug}.png${c.promoted ? ' (no-og → promoted)' : ''}`));
    process.exit(0);
  }
  console.log(`✓ build-og-cards: ${generated} bespoke card(s) rendered · ${rewritten} page(s) rewritten · ${injected} no-og page(s) promoted · ${scanned} scanned`);
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
  // S238: title resolution + og:image injection for PUBLIC_NO_OG pages
  assert(pageTitle('<meta property="og:title" content="Solara: Sunfall"><title>X</title>') === 'Solara: Sunfall', 'pageTitle prefers og:title');
  assert(pageTitle('<title>Vault Pathways | VaultSpark Studios</title>') === 'Vault Pathways | VaultSpark Studios', 'pageTitle falls back to <title>');
  assert(metaFor('pathways/builders/index.html').eyebrow.startsWith('Pathways'), 'pathways eyebrow mapped');
  assert(metaFor('solara/archive.html').status === 'forge', 'solara status forge');
  // self-closing style preserved
  const sc = injectOgImage('  <meta name="description" content="d" />\n', 'https://x/c.png');
  assert(/og:image" content="https:\/\/x\/c\.png" \/>/.test(sc), 'injects self-closing og:image');
  assert(/name="twitter:image"/.test(sc), 'injects twitter:image');
  // bare style preserved
  const bare = injectOgImage('    <meta name="description" content="d">\n', 'https://x/c.png');
  assert(/og:image" content="https:\/\/x\/c\.png">/.test(bare) && !/\/>/.test(bare.split('og:image')[1].split('\n')[0]), 'injects bare-style og:image');
  // idempotent
  const once = injectOgImage('  <meta name="description" content="d" />\n', 'https://x/c.png');
  assert(injectOgImage(once, 'https://x/c.png') === once, 'injectOgImage is idempotent');
  // sharp actually rasterizes the card
  const png = await renderCardPng({ title: 'Self Test', eyebrow: 'Test', status: 'sparked' });
  const meta = await sharp(png).metadata();
  assert(meta.width === 1200 && meta.height === 630, `card is 1200×630 (got ${meta.width}×${meta.height})`);
  if (fail === 0) { console.log('✓ build-og-cards --self-test: 21/21 passed'); process.exit(0); }
  console.error(`✗ build-og-cards --self-test: ${fail} failed`); process.exit(1);
}

const RUN_DIRECT = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('build-og-cards.mjs');
if (RUN_DIRECT) {
  if (process.argv.includes('--self-test')) selfTest();
  else run({ check: process.argv.includes('--check') });
}
