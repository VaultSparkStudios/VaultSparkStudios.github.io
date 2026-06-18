#!/usr/bin/env node
/* build-atlas.mjs — S207: the public Atlas (ecosystem map) at /atlas/.
 *
 * Server-renders the full studio ecosystem index into atlas/index.html from the
 * canonical live feed (api/public-intelligence.json catalog), grouped by status
 * (Live · In the Forge · Vaulted). Every project is a hyperlinked row — SPARKED
 * projects link to their live site, others to their studio page (no raw dev URLs).
 * Instant (server-rendered), crawlable, and carries an ItemList JSON-LD for agents.
 *
 * Usage:
 *   node scripts/build-atlas.mjs            # inject into atlas/index.html
 *   node scripts/build-atlas.mjs --check    # drift gate
 *   node scripts/build-atlas.mjs --self-test
 * Exit: 0 ok · 1 drift/error.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const FEED = path.join(ROOT, 'api/public-intelligence.json');
const PAGE = path.join(ROOT, 'atlas/index.html');

const argv = process.argv.slice(2);
const SELF_TEST = argv.includes('--self-test');
const CHECK = argv.includes('--check');

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function pageHref(item, fileExists) {
  const isGame = item.type === 'game';
  const cands = isGame ? [`games/${item.id}/index.html`, `${item.id}/index.html`] : [`projects/${item.id}/index.html`, `${item.id}/index.html`];
  for (const rel of cands) if (fileExists(rel)) return '/' + rel.replace(/index\.html$/, '');
  return isGame ? '/games/' : '/projects/';
}
function liveHref(item) {
  if (!item.deployedUrl) return null;
  try { const u = new URL(item.deployedUrl); return u.origin.includes('vaultsparkstudios.com') ? u.pathname : item.deployedUrl; } catch { return null; }
}
function destination(item, fileExists) {
  const live = liveHref(item);
  const sparkedLive = item.status === 'SPARKED' && live;
  return { href: sparkedLive ? live : pageHref(item, fileExists), external: !!(sparkedLive && live.startsWith('http')) };
}
function goLabel(item, isLive) {
  if (item.status === 'VAULTED') return 'Vaulted';
  if (isLive && item.status === 'SPARKED') return item.type === 'game' ? 'Play →' : 'Open →';
  return 'Explore →';
}

const GROUPS = [
  { status: 'SPARKED', cls: 'is-live', title: 'Live', blurb: 'Playable / usable right now.' },
  { status: 'FORGE', cls: 'is-forge', title: 'In the Forge', blurb: 'Being built in the open.' },
  { status: 'VAULTED', cls: 'is-vaulted', title: 'Vaulted', blurb: 'Sealed — holding their charge.' },
];

export function renderAtlas(catalog, fileExists) {
  const blocks = [];
  const ld = [];
  let pos = 0;
  for (const g of GROUPS) {
    const items = catalog.filter((c) => c.status === g.status);
    if (!items.length) continue;
    const rows = items.map((item) => {
      const { href, external } = destination(item, fileExists);
      const isLive = !!(item.status === 'SPARKED' && liveHref(item));
      const accent = item.color || '#ffc400';
      ld.push({ '@type': 'ListItem', position: ++pos, name: item.name, url: 'https://vaultsparkstudios.com' + (href.startsWith('http') ? '' : href) });
      return [
        `<a class="atlas-row ht-${esc(item.id)}" href="${esc(href)}"${external ? ' rel="noopener"' : ''} style="--row-accent:${esc(accent)}" data-track-event="atlas_row_click" aria-label="${esc(item.name)} — ${esc(item.category || item.type)}">`,
        `<span class="atlas-row__main"><span class="atlas-row__top"><span class="atlas-row__name">${esc(item.name)}</span><span class="atlas-row__cat">${esc(item.category || item.type)}</span></span>`,
        `<span class="atlas-row__note">${esc(item.note || '')}</span></span>`,
        `<span class="atlas-row__go" aria-hidden="true">${goLabel(item, isLive)}</span>`,
        `</a>`,
      ].join('');
    }).join('');
    blocks.push(
      `<div class="atlas-group ${g.cls}">` +
      `<div class="atlas-group__head"><span class="atlas-group__dot" aria-hidden="true"></span>` +
      `<span class="atlas-group__title">${esc(g.title)}</span><span class="atlas-group__count">${items.length}</span></div>` +
      `<p class="section-intro" style="margin-bottom:1rem;">${esc(g.blurb)}</p>` +
      `<div class="atlas-rows">${rows}</div></div>`
    );
  }
  const json = JSON.stringify({ '@context': 'https://schema.org', '@type': 'ItemList', name: 'VaultSpark Studios ecosystem', itemListElement: ld });
  return blocks.join('') + `<script type="application/ld+json" data-atlas-ld>${json}</script>`;
}

function inject(html, content) {
  const re = /<!-- atlas-ecosystem:start -->[\s\S]*?<!-- atlas-ecosystem:end -->/;
  if (!re.test(html)) throw new Error('atlas-ecosystem markers not found in atlas/index.html');
  return html.replace(re, `<!-- atlas-ecosystem:start -->${content}<!-- atlas-ecosystem:end -->`);
}

if (SELF_TEST) {
  let passed = 0;
  const assert = (ok, m) => { if (!ok) { console.error('✗ ' + m); process.exit(1); } console.log('  ✓ ' + m); passed++; };
  const cat = [
    { id: 'call-of-doodie', name: 'Call of Doodie', type: 'game', category: 'Action Comedy', status: 'SPARKED', note: 'Live.', deployedUrl: 'https://vaultsparkstudios.com/call-of-doodie/', color: '#ff9478' },
    { id: 'mindframe', name: 'MindFrame', type: 'tool', category: 'AI Intelligence', status: 'FORGE', note: 'In the forge.', deployedUrl: 'https://ext.example.com', color: '#38bdf8' },
  ];
  const fe = (rel) => rel === 'games/call-of-doodie/index.html';
  const out = renderAtlas(cat, fe);
  assert(out.includes('atlas-group is-live') && out.includes('atlas-group is-forge'), 'groups rendered by status');
  assert(out.includes('/call-of-doodie/') && out.includes('Play →'), 'live project → live site + Play');
  assert(out.includes('/projects/') && !out.includes('ext.example.com'), 'forge → studio page, never raw dev URL');
  assert(out.includes('AI Intelligence'), 'category shown');
  assert(out.includes('application/ld+json'), 'ItemList JSON-LD for agents');
  console.log(`\nbuild-atlas self-test: ${passed} passing`);
  process.exit(0);
}

const catalog = JSON.parse(readFileSync(FEED, 'utf8')).catalog;
const fileExists = (rel) => existsSync(path.join(ROOT, rel));
const html = readFileSync(PAGE, 'utf8');
const next = inject(html, renderAtlas(catalog, fileExists));
if (CHECK) {
  if (next !== html) { console.error('build-atlas --check: atlas/index.html ecosystem drift; run node scripts/build-atlas.mjs'); process.exit(1); }
  console.log('build-atlas --check: ok'); process.exit(0);
}
if (next !== html) writeFileSync(PAGE, next);
console.log(`build-atlas → atlas/index.html (${catalog.length} initiatives mapped)`);
