#!/usr/bin/env node
/* build-hero-portfolio.mjs — S207 hero redesign (fusion of Cinematic Split + Living Portfolio)
 *
 * The hero is the first interface for BOTH humans and agents, so it must be the
 * most machine-legible AND the most visually immersive component on the site.
 * This generator server-renders the hero's living-portfolio showcase from the
 * canonical live feed (api/public-intelligence.json catalog) so the hero is:
 *   • instant (no client fetch — LCP-safe)
 *   • crawlable + agent-readable (real <a> tiles + an ItemList JSON-LD block)
 *   • always truthful (live/forge status + counts derived from real data)
 *
 * It injects, between markers in index.html:
 *   <!-- hero-showcase:start --> … <!-- hero-showcase:end -->
 *       a scoped <style> (per-tile accent + cover, NO inline style= attrs — the
 *       intelligence-style-contract forbids them on index.html), the tile grid,
 *       and an ItemList JSON-LD block.
 *   <!-- hero-stats:start --> … <!-- hero-stats:end -->
 *       the live · forge · total count line.
 *
 * Usage:
 *   node scripts/build-hero-portfolio.mjs            # inject into index.html
 *   node scripts/build-hero-portfolio.mjs --check    # drift gate (no write)
 *   node scripts/build-hero-portfolio.mjs --self-test
 *
 * Exit: 0 ok · 1 drift/error.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const FEED = path.join(ROOT, 'api/public-intelligence.json');
const INDEX = path.join(ROOT, 'index.html');
const TOTAL_PROJECTS = 27; // full registry (catalog is the public subset)
const MAX_TILES = 7;       // featured + 6 in the bento

const argv = process.argv.slice(2);
const SELF_TEST = argv.includes('--self-test');
const CHECK = argv.includes('--check');

// id → bespoke cover art (others fall back to the accent-gradient tile).
const COVERS = {
  'call-of-doodie': 'doodie', 'football-gm': 'footballgm', 'vaultspark-football-gm': 'footballgm',
  'gridiron-gm': 'gridiron', 'mindframe': 'mindframe', 'solara': 'solara',
  'the-exodus': 'the-exodus', 'vaultfront': 'vaultfront',
};

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Resolve a safe link target: prefer an on-disk canonical page, else deployedUrl, else section landing.
function resolveHref(item, fileExists) {
  const id = item.id;
  const isGame = item.type === 'game';
  const candidates = isGame
    ? [`games/${id}/index.html`, `${id}/index.html`]
    : [`projects/${id}/index.html`, `${id}/index.html`];
  for (const rel of candidates) {
    if (fileExists(rel)) return '/' + rel.replace(/index\.html$/, '');
  }
  if (item.deployedUrl) {
    try { const u = new URL(item.deployedUrl); return u.origin.includes('vaultsparkstudios.com') ? u.pathname : item.deployedUrl; }
    catch { /* fall through */ }
  }
  return isGame ? '/games/' : '/projects/';
}

const STATUS_LABEL = { SPARKED: 'Live', FORGE: 'In the forge', VAULTED: 'Vaulted' };

// Pure: build the ordered tile list + counts from the catalog.
export function planPortfolio(catalog) {
  const live = catalog.filter((c) => c.status === 'SPARKED');
  const forge = catalog.filter((c) => c.status === 'FORGE');
  const vaulted = catalog.filter((c) => c.status === 'VAULTED');
  // Order: live first (by progress desc), then forge (by progress desc). Featured = first.
  const byProgress = (a, b) => (b.progress || 0) - (a.progress || 0);
  const ordered = [...live].sort(byProgress).concat([...forge].sort(byProgress)).slice(0, MAX_TILES);
  return {
    tiles: ordered,
    counts: { live: live.length, forge: forge.length, vaulted: vaulted.length, total: TOTAL_PROJECTS },
  };
}

function renderTile(item, fileExists, featured) {
  const href = resolveHref(item, fileExists);
  const coverKey = COVERS[item.id];
  const statusClass = item.status === 'SPARKED' ? 'is-live' : item.status === 'VAULTED' ? 'is-vaulted' : 'is-forge';
  const cls = ['hero-tile', `ht-${item.id}`, statusClass, featured ? 'hero-tile--featured' : '', coverKey ? 'has-cover' : 'no-cover'].filter(Boolean).join(' ');
  const badge = STATUS_LABEL[item.status] || item.status;
  const external = href.startsWith('http');
  const attrs = external ? ' rel="noopener"' : '';
  return [
    `<a class="${cls}" href="${esc(href)}"${attrs} data-track-event="home_hero_tile_click" aria-label="${esc(item.name)} — ${esc(badge)}">`,
    `<span class="hero-tile__cover" aria-hidden="true"></span>`,
    `<span class="hero-tile__veil" aria-hidden="true"></span>`,
    `<span class="hero-tile__badge">${item.status === 'SPARKED' ? '▶ ' : ''}${esc(badge)}</span>`,
    `<span class="hero-tile__body"><span class="hero-tile__name">${esc(item.name)}</span>`,
    featured && item.note ? `<span class="hero-tile__note">${esc(item.note)}</span>` : '',
    `</span>`,
    `</a>`,
  ].join('');
}

function renderTileStyles(tiles) {
  const rules = tiles.map((t) => {
    const accent = t.color || '#ffc400';
    const coverKey = COVERS[t.id];
    const cover = coverKey ? `.ht-${t.id} .hero-tile__cover{background-image:url(/assets/covers/${coverKey}.png)}` : '';
    return `.ht-${t.id}{--tile-accent:${accent}}${cover}`;
  });
  return `<style data-hero-portfolio-style>${rules.join('')}</style>`;
}

function renderJsonLd(tiles, fileExists) {
  const items = tiles.map((t, i) => ({
    '@type': 'ListItem', position: i + 1,
    item: {
      '@type': t.type === 'game' ? 'VideoGame' : 'CreativeWork',
      name: t.name,
      url: 'https://vaultsparkstudios.com' + resolveHref(t, fileExists).replace(/^https?:\/\/[^/]+/, ''),
      creativeWorkStatus: t.status === 'SPARKED' ? 'Published' : 'In development',
    },
  }));
  const ld = { '@context': 'https://schema.org', '@type': 'ItemList', name: 'VaultSpark Studios portfolio', itemListElement: items };
  return `<script type="application/ld+json" data-hero-portfolio-ld>${JSON.stringify(ld)}</script>`;
}

export function renderShowcase(catalog, fileExists) {
  const { tiles } = planPortfolio(catalog);
  const tileHtml = tiles.map((t, i) => renderTile(t, fileExists, i === 0)).join('');
  return [
    renderTileStyles(tiles),
    `<div class="hero-showcase" role="group" aria-label="VaultSpark Studios portfolio — live and in-forge worlds">${tileHtml}</div>`,
    renderJsonLd(tiles, fileExists),
  ].join('');
}

export function renderStats(catalog) {
  const { counts } = planPortfolio(catalog);
  return `<span class="hero-stat-dot" aria-hidden="true"></span><strong>${counts.live}</strong> live<span class="hero-stat-sep">·</span><strong>${counts.forge}</strong> in the forge<span class="hero-stat-sep">·</span><strong>${counts.total}</strong> total`;
}

function injectBlock(html, marker, content) {
  const start = `<!-- ${marker}:start -->`;
  const end = `<!-- ${marker}:end -->`;
  const re = new RegExp(start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!re.test(html)) throw new Error(`marker ${marker} not found in index.html`);
  return html.replace(re, `${start}${content}${end}`);
}

function build({ write }) {
  const catalog = JSON.parse(readFileSync(FEED, 'utf8')).catalog;
  const fileExists = (rel) => existsSync(path.join(ROOT, rel));
  let html = readFileSync(INDEX, 'utf8');
  const next = injectBlock(injectBlock(html, 'hero-showcase', renderShowcase(catalog, fileExists)), 'hero-stats', renderStats(catalog));
  if (CHECK) {
    if (next !== html) { console.error('build-hero-portfolio --check: index.html hero showcase/stats drift; run node scripts/build-hero-portfolio.mjs'); process.exit(1); }
    console.log('build-hero-portfolio --check: ok (hero showcase in sync)');
    return;
  }
  if (write && next !== html) writeFileSync(INDEX, next);
  const { tiles, counts } = planPortfolio(catalog);
  console.log(`build-hero-portfolio → ${tiles.length} tiles · ${counts.live} live · ${counts.forge} forge · ${counts.total} total`);
}

if (SELF_TEST) {
  let passed = 0;
  const assert = (ok, m) => { if (!ok) { console.error('✗ ' + m); process.exit(1); } console.log('  ✓ ' + m); passed++; };
  const cat = [
    { id: 'call-of-doodie', name: 'Call of Doodie', type: 'game', status: 'SPARKED', progress: 85, color: '#ff9478', deployedUrl: 'https://vaultsparkstudios.com/call-of-doodie/' },
    { id: 'football-gm', name: 'VaultSpark Football GM', type: 'game', status: 'SPARKED', progress: 78 },
    { id: 'solara', name: 'Solara', type: 'game', status: 'FORGE', progress: 40 },
    { id: 'voidfall', name: 'Voidfall', type: 'game', status: 'FORGE', progress: 20 },
  ];
  const plan = planPortfolio(cat);
  assert(plan.tiles[0].id === 'call-of-doodie', 'featured = highest-progress live');
  assert(plan.counts.live === 2 && plan.counts.forge === 2, 'counts derived from status');
  const fe = (rel) => rel === 'games/call-of-doodie/index.html';
  const showcase = renderShowcase(cat, fe);
  assert(showcase.includes('hero-tile--featured'), 'featured tile rendered');
  assert(!/ style\s*=\s*["']/.test(showcase), 'NO inline style= attributes (style-contract safe)');
  assert(showcase.includes('/games/call-of-doodie/'), 'on-disk canonical link resolved');
  assert(showcase.includes('application/ld+json'), 'ItemList JSON-LD emitted (agent-readable)');
  assert(renderStats(cat).includes('<strong>2</strong> live'), 'stat line reflects live count');
  console.log(`\nbuild-hero-portfolio self-test: ${passed} passing`);
  process.exit(0);
}

build({ write: true });
