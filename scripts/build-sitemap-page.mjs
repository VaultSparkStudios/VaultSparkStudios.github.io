#!/usr/bin/env node
/**
 * build-sitemap-page.mjs — S368 ia-consolidation-v2.
 *
 * /sitemap-page/ was hand-written and drifted: it omitted pages that exist and
 * still linked routes the edge now 301s away. It is now rendered from
 * sitemap.xml — which generate-sitemap.mjs already filters for noindex and for
 * redirected routes — so the human sitemap can only list what crawlers are told
 * is real. Machine-only layers are left out on purpose: the `.ai/` fact sheets
 * (indexed in /.well-known/llms.txt) and individual Desk articles (reachable
 * through the monthly archives, which ARE listed).
 *
 * Usage:
 *   node scripts/build-sitemap-page.mjs            # write sitemap-page/index.html
 *   node scripts/build-sitemap-page.mjs --check    # exit 1 if stale
 *   node scripts/build-sitemap-page.mjs --self-test
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = join(ROOT, 'sitemap-page', 'index.html');
const ORIGIN = 'https://vaultsparkstudios.com';
export const START = '<!-- sitemap-page:start -->';
export const END = '<!-- sitemap-page:end -->';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Section order + which first path segments belong to each. Anything unmatched lands in "More". */
export const GROUPS = [
  ['main', '🏠', 'Studio', ['', 'studio', 'how-we-build', 'roadmap', 'changelog', 'press', 'collaborate', 'contact', 'faq', 'search', 'sitemap-page']],
  ['play', '🎮', 'Games & play', ['games', 'play', 'leaderboards']],
  ['projects', '🛠️', 'Projects', ['projects']],
  ['worlds', '🌌', 'Worlds & stories', ['universe', 'journal', 'vault']],
  ['intel', '📡', 'Live intelligence & evidence', ['evidence', 'studio-pulse', 'ignis', 'status', 'stats', 'api']],
  ['news', '📰', 'The Desk & Dispatch', ['news', 'dispatch']],
  ['community', '👥', 'Community & membership', ['community', 'membership', 'invite', 'pathways', 'social']],
  ['legal', '📜', 'Legal & compliance', ['privacy', 'terms', 'cookies', 'accessibility', 'security', 'data-deletion', 'rights']],
];

export function parseLocs(xml) {
  return [...String(xml).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(ORIGIN, '') || '/');
}

/** Human-sitemap membership: drop machine-only layers, keep everything else. */
export function isHumanRoute(route) {
  if (/\/\.ai\//.test(route)) return false;
  if (/^\/news\/\d{4}-\d{2}-\d{2}\//.test(route)) return false; // articles: reached via monthly archives
  return true;
}

export function titleFor(route, read) {
  const html = read(route);
  const raw = html && (html.match(/<title>([^<]*)<\/title>/i) || [])[1];
  const t = String(raw || '').replace(/\s*[|·—–-]\s*VaultSpark Studios\s*$/i, '').replace(/&amp;/g, '&').trim();
  if (t && !/^VaultSpark Studios$/i.test(t)) return t;
  if (route === '/') return 'Home';
  const last = route.split('/').filter(Boolean).pop() || 'Home';
  return last.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function renderSitemapBody(routes, read) {
  const buckets = new Map(GROUPS.map(([id]) => [id, []]));
  buckets.set('more', []);
  for (const route of routes.filter(isHumanRoute)) {
    const seg = route.split('/')[1] || '';
    const group = GROUPS.find(([, , , segs]) => segs.includes(seg));
    buckets.get(group ? group[0] : 'more').push(route);
  }
  const sections = [...GROUPS, ['more', '🗂️', 'More', []]].filter(([id]) => buckets.get(id).length).map(([id, icon, label]) => {
    const links = buckets.get(id).sort((a, b) => (a.split('/').length - b.split('/').length) || a.localeCompare(b))
      .map((route) => `\n            <a href="${esc(route)}">${esc(titleFor(route, read))} <small>${esc(route)}</small></a>`).join('');
    return `\n          <h2 id="sm-${id}"><span class="sm-icon" aria-hidden="true">${icon}</span> ${esc(label)}</h2>\n          <div class="sitemap-grid">${links}\n          </div>`;
  });
  const total = [...buckets.values()].reduce((n, list) => n + list.length, 0);
  return `\n          <p class="sitemap-meta">${total} pages, rendered from <a href="/sitemap.xml">sitemap.xml</a> — so this list only ever shows pages that are live and indexable. Fact sheets for AI agents are indexed in <a href="/.well-known/llms.txt">llms.txt</a>; every public feed is on the <a href="/api/">developer index</a>.</p>`
    + sections.join('\n          <div class="sitemap-divider"></div>') + '\n        ';
}

export function inject(html, inner) {
  const i = html.indexOf(START);
  const j = i === -1 ? -1 : html.indexOf(END, i);
  if (i === -1 || j === -1) return null;
  return html.slice(0, i + START.length) + inner + html.slice(j);
}

function readRoute(route) {
  const rel = route === '/' ? 'index.html' : route.replace(/^\//, '') + (route.endsWith('/') ? 'index.html' : '');
  const file = join(ROOT, rel);
  return existsSync(file) ? readFileSync(file, 'utf8') : null;
}

function selfTest() {
  const results = [];
  const t = (n, ok) => results.push([n, ok]);
  const xml = `<url><loc>${ORIGIN}/</loc></url><url><loc>${ORIGIN}/games/solara/</loc></url><url><loc>${ORIGIN}/games/solara/.ai/</loc></url><url><loc>${ORIGIN}/news/2026-09-01/a-story/</loc></url><url><loc>${ORIGIN}/news/archive/2026-09/</loc></url><url><loc>${ORIGIN}/zeta/</loc></url>`;
  const routes = parseLocs(xml);
  t('locs parse to site routes', routes[0] === '/' && routes.includes('/games/solara/'));
  const read = (r) => (r === '/games/solara/' ? '<title>Solara | VaultSpark Studios</title>' : null);
  const body = renderSitemapBody(routes, read);
  t('titles come from the page title with the brand suffix removed', body.includes('>Solara <small>/games/solara/</small>'));
  t('.ai fact sheets and dated articles stay out of the human sitemap', !body.includes('/.ai/') && !body.includes('a-story'));
  t('monthly archives stay in', body.includes('/news/archive/2026-09/'));
  t('an unknown segment lands in More rather than vanishing', body.includes('id="sm-more"') && body.includes('/zeta/'));
  t('the count matches the rendered links', body.includes('4 pages') && (body.match(/<a href="\/[^"]*"[^>]*>[^<]*<small>/g) || []).length === 4);
  const page = `<main>${START}${END}</main>`;
  const once = inject(page, body);
  t('inject is idempotent', inject(once, body) === once);
  t('missing markers return null', inject('<main></main>', body) === null);
  for (const [n, ok] of results) console.log(`  ${ok ? '✓' : '✗'} ${n}`);
  const failed = results.filter(([, ok]) => !ok).length;
  console.log(`build-sitemap-page self-test: ${results.length - failed}/${results.length}`);
  return failed === 0;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/build-sitemap-page.mjs');
if (isMain) {
  if (process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);
  const routes = parseLocs(readFileSync(join(ROOT, 'sitemap.xml'), 'utf8'));
  const current = readFileSync(PAGE, 'utf8');
  const next = inject(current, renderSitemapBody(routes, readRoute));
  if (next === null) { console.error('build-sitemap-page: sitemap-page/index.html is missing the sitemap-page markers'); process.exit(1); }
  if (process.argv.includes('--check')) {
    if (next !== current) { console.error('build-sitemap-page --check: sitemap-page/index.html is stale — run node scripts/generate-sitemap.mjs && node scripts/build-sitemap-page.mjs'); process.exit(1); }
    console.log('build-sitemap-page --check: ok');
  } else if (next !== current) { writeFileSync(PAGE, next, 'utf8'); console.log('build-sitemap-page: wrote sitemap-page/index.html'); }
  else console.log('build-sitemap-page: current');
}
