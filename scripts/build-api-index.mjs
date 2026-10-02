#!/usr/bin/env node
/**
 * build-api-index.mjs — S368 new-pages-wave.
 *
 * Renders the developer index at /api/ from the SAME curated feed catalog that
 * agents.json publishes (scripts/build-agents-json.mjs → agents.json `feeds`),
 * plus the discovery files every agent looks for first. One source: a feed added
 * to or removed from agents.json reaches this page on the next run, and --check
 * fails while the page disagrees.
 *
 * Usage:
 *   node scripts/build-api-index.mjs            # write api/index.html
 *   node scripts/build-api-index.mjs --check    # exit 1 if stale
 *   node scripts/build-api-index.mjs --self-test
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = join(ROOT, 'api', 'index.html');
const SITE = 'https://vaultsparkstudios.com';
export const START = '<!-- api-index:start -->';
export const END = '<!-- api-index:end -->';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const local = (url) => String(url || '').replace(SITE, '') || '/';

/** Discovery files: [path, title, description]. Only files that exist on disk are listed. */
export const DISCOVERY = [
  ['/agents.json', 'agents.json', 'Machine-readable manifest of the site: public endpoints, feeds, authenticated actions and the project catalog.'],
  ['/.well-known/llms.txt', 'llms.txt', 'Plain-text index written for language models, pointing at a fact sheet for every project.'],
  ['/llms-full.txt', 'llms-full.txt', 'The long-form companion to llms.txt — the studio and its projects in one file.'],
  ['/sitemap.xml', 'sitemap.xml', 'Every indexable page with its last content date.'],
  ['/robots.txt', 'robots.txt', 'Crawler policy: search and answer agents allowed, training crawlers blocked.'],
  ['/.well-known/entity-graph.json', 'Entity graph', 'The studio, its projects and their relationships as linked data.'],
  ['/feed.xml', 'RSS feed', 'Site updates as an RSS (Really Simple Syndication) feed.'],
  ['/api/news-desk-feed.json', 'The Desk JSON Feed', 'Newsroom editions in JSON Feed format.'],
];

export function renderIndex(manifest, exists = (p) => existsSync(join(ROOT, p.replace(/^\//, '')))) {
  const discovery = DISCOVERY.filter(([path]) => exists(path));
  const feeds = (manifest.feeds || []).filter((f) => f && f.url && f.url.startsWith(SITE));
  const disc = discovery.map(([path, title, desc]) => `
          <li><a href="${esc(path)}"><code>${esc(path)}</code><strong>${esc(title)}</strong><span>${esc(desc)}</span></a></li>`).join('');
  const rows = feeds.map((f) => `
          <li class="api-feed"><h3>${esc(f.title)}</h3><div><a href="${esc(local(f.url))}"><code>${esc(local(f.url))}</code></a><p>${esc(f.description)}</p></div></li>`).join('');
  return `
    <section class="np-section" aria-labelledby="api-discovery-heading">
      <h2 id="api-discovery-heading">Start here</h2>
      <p>The files any crawler, assistant or integration should read first.</p>
      <ul class="api-discovery">${disc}
      </ul>
    </section>
    <section class="np-section" aria-labelledby="api-feeds-heading">
      <h2 id="api-feeds-heading">Public JSON feeds <small class="api-count">(${feeds.length})</small></h2>
      <p>The same curated catalog agents.json advertises. Every feed is public, privacy-safe and stamped with the time it was generated.</p>
      <ul class="api-feeds">${rows}
      </ul>
      <p class="np-note">Want to check these claims rather than read them? The <a href="/evidence/">Evidence</a> page re-computes the deploy ledger in your browser. Questions or a feed you need: <a href="/contact/">contact the studio</a>.</p>
    </section>
    `;
}

export function inject(html, inner) {
  const i = html.indexOf(START);
  const j = i === -1 ? -1 : html.indexOf(END, i);
  if (i === -1 || j === -1) return null;
  return html.slice(0, i + START.length) + inner + html.slice(j);
}

function selfTest() {
  const results = [];
  const t = (name, ok) => results.push([name, ok]);
  const manifest = { feeds: [
    { title: 'A <feed>', url: `${SITE}/api/a.json`, description: 'Alpha.' },
    { title: 'Elsewhere', url: 'https://other.example/x.json', description: 'Off-site.' },
  ] };
  const out = renderIndex(manifest, (p) => p === '/agents.json');
  t('feeds render with site-relative links', out.includes('href="/api/a.json"'));
  t('feed titles are escaped', out.includes('A &lt;feed&gt;'));
  t('off-site URLs never render', !out.includes('other.example'));
  t('discovery lists only files that exist', out.includes('/agents.json') && !out.includes('/sitemap.xml'));
  t('the feed count matches the rows', out.includes('(1)') && (out.match(/class="api-feed"/g) || []).length === 1);
  const page = `<main>${START}${END}</main>`;
  const once = inject(page, out);
  t('inject is idempotent', inject(once, out) === once);
  t('missing markers are reported (null), never silently skipped', inject('<main></main>', out) === null);
  for (const [n, ok] of results) console.log(`  ${ok ? '✓' : '✗'} ${n}`);
  const failed = results.filter(([, ok]) => !ok).length;
  console.log(`build-api-index self-test: ${results.length - failed}/${results.length}`);
  return failed === 0;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/build-api-index.mjs');
if (isMain) {
  if (process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);
  const manifest = JSON.parse(readFileSync(join(ROOT, 'agents.json'), 'utf8'));
  const current = readFileSync(PAGE, 'utf8');
  const next = inject(current, renderIndex(manifest));
  if (next === null) { console.error('build-api-index: api/index.html is missing the api-index markers'); process.exit(1); }
  if (process.argv.includes('--check')) {
    if (next !== current) { console.error('build-api-index --check: api/index.html is stale — run node scripts/build-api-index.mjs'); process.exit(1); }
    console.log('build-api-index --check: ok');
  } else if (next !== current) {
    writeFileSync(PAGE, next, 'utf8');
    console.log('build-api-index: wrote api/index.html');
  } else console.log('build-api-index: api/index.html current');
}
