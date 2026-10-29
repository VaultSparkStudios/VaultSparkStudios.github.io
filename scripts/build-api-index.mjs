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
const isSiteUrl = (url) => { try { return new URL(url).origin === SITE; } catch { return false; } };
const readSource = (p) => { try { return readFileSync(join(ROOT, p.replace(/^\//, '')), 'utf8'); } catch { return ''; } };

/** Source publication dates, never the clock of this page build. */
export function latestPublication(text, format) {
  let dates = [];
  try {
    dates = format === 'json'
      ? JSON.parse(text).items.map((item) => item.date_published)
      : [...text.matchAll(/<pubDate>([^<]+)<\/pubDate>/g)].map((match) => match[1]);
  } catch { return null; }
  const valid = dates.map((date) => Date.parse(date || '')).filter(Number.isFinite);
  return valid.length ? new Date(Math.max(...valid)).toISOString() : null;
}

const SUBSCRIPTIONS = [
  { title: 'The Desk', description: 'Source-bound AI news, named arguments and a public prediction record.', source: '/api/news-desk-feed.json', format: 'json', home: '/news/', links: [['JSON Feed', '/api/news-desk-feed.json']] },
  { title: 'Forge Ledger', description: 'Public build activity: what the studio shipped, fixed and refined.', source: '/feed/forge-ledger.json', format: 'json', home: '/studio-pulse/', links: [['RSS', '/feed/forge-ledger.xml'], ['JSON Feed', '/feed/forge-ledger.json']] },
  { title: 'Daily Dispatches', description: 'AI-authored studio dispatches from the forge. Read the archive before subscribing.', source: '/journal/dispatches/feed.xml', format: 'xml', home: '/journal/dispatches/', links: [['RSS', '/journal/dispatches/feed.xml']] },
  { title: 'Signal Log archive', description: 'Historical journal posts. This archive is separate from current Desk news and build activity.', source: '/feed.xml', format: 'xml', home: '/journal/', links: [['Archive RSS', '/feed.xml']] },
];

export function feedGroup(feed) {
  const path = local(feed.url);
  if (/news-desk|newsroom-run/.test(path)) return 'news';
  if (/public-intelligence|public-status|nervous-system|velocity-series|membership-tiers|intent-map|oracle/.test(path)) return 'explore';
  if (/diagnostics|worker-route|deploy-currency|identity-migration|supabase-control/.test(path)) return 'operations';
  return 'evidence';
}

function renderActions(actions = []) {
  return actions.map((action) => {
    const { name, title, description, method, url, ...contract } = action;
    const auth = typeof action.auth === 'object'
      ? `${action.auth.authority}: ${action.auth.scope}`
      : action.auth === 'none' ? 'Public; no account token required' : 'Read the contract below';
    return `<li class="api-action"><h3>${esc(title || name)}</h3><p>${esc(description)}</p>
      <p><code>${esc(method)} ${esc(url)}</code></p><p class="np-note">${esc(auth)}</p>
      <details><summary>Request, consent and response contract</summary><pre><code>${esc(JSON.stringify(contract, null, 2))}</code></pre></details></li>`;
  }).join('\n');
}

/** Discovery files: [path, title, description]. Only files that exist on disk are listed. */
export const DISCOVERY = [
  ['/agents.json', 'agents.json', 'Machine-readable manifest of the site: public endpoints, feeds, authenticated actions and the project catalog.'],
  ['/.well-known/llms.txt', 'llms.txt', 'Plain-text index written for language models, pointing at a fact sheet for every project.'],
  ['/llms-full.txt', 'llms-full.txt', 'The long-form companion to llms.txt — the studio and its projects in one file.'],
  ['/sitemap.xml', 'sitemap.xml', 'Every indexable page with its last content date.'],
  ['/robots.txt', 'robots.txt', 'Crawler policy: search and answer agents allowed, training crawlers blocked.'],
  ['/.well-known/entity-graph.json', 'Entity graph', 'The studio, its projects and their relationships as linked data.'],
];

export function renderIndex(manifest, exists = (p) => existsSync(join(ROOT, p.replace(/^\//, ''))), read = readSource) {
  const discovery = DISCOVERY.filter(([path]) => exists(path));
  const feeds = (manifest.feeds || []).filter((f) => f && isSiteUrl(f.url));
  const disc = discovery.map(([path, title, desc]) => `
          <li><a href="${esc(path)}"><code>${esc(path)}</code><strong>${esc(title)}</strong><span>${esc(desc)}</span></a></li>`).join('');
  const rows = (group) => feeds.filter((f) => feedGroup(f) === group).map((f) => `
          <li class="api-feed"><h3>${esc(f.title)}</h3><div><a href="${esc(local(f.url))}"><code>${esc(local(f.url))}</code></a><p>${esc(f.description)}</p></div></li>`).join('');
  return `
    <section class="np-section" aria-labelledby="api-follow-heading">
      <h2 id="api-follow-heading">Choose what reaches your reader</h2>
      <p>Follow the news, the builds or the studio dispatches. JSON Feed and RSS (Really Simple Syndication) links are public reads; email subscriptions use a separate confirmation step.</p>
      <div class="api-subscriptions">${SUBSCRIPTIONS.filter((s) => exists(s.source)).map((s) => {
        const date = latestPublication(read(s.source), s.format);
        return `<article class="api-subscription"><span class="api-label">${s.title.includes('archive') ? 'Historical archive' : 'Follow this publication'}</span><h3><a href="${s.home}">${s.title}</a></h3><p>${s.description}</p><p class="api-publication-date">Latest item: ${date ? `<time datetime="${date}">${date.slice(0, 10)} UTC</time>` : 'Publication date unavailable'}</p><div class="api-links">${s.links.map(([label, href]) => `<a href="${href}">${label} ↗</a>`).join('')}</div></article>`;
      }).join('\n')}</div>
      <div class="api-next"><a href="/news/">Read the latest Desk edition →</a><a href="/news/#desk-dispatch">Get the Desk by email →</a><a href="/membership/#benefits">Explore Vault membership →</a></div>
    </section>
    <section class="np-section" aria-labelledby="api-quickstart-heading">
      <h2 id="api-quickstart-heading">Your first public read</h2>
      <p>Copy either command into a terminal. These examples only GET public files: they do not subscribe anyone, create an account or invoke a model.</p>
      <div class="api-examples"><article><h3>Read the latest Desk feed</h3><pre><code>curl --fail --silent --show-error '${SITE}/api/news-desk-feed.json'</code></pre><p class="np-note">JSON Feed returns <code>items</code> with article titles, URLs and publication dates. Follow each article URL for its full story and evidence.</p></article>
      <article><h3>Read the project catalog</h3><pre><code>curl --fail --silent --show-error '${SITE}/api/public-intelligence.json'</code></pre><p class="np-note">Use the catalog's source timestamp and project records. A generated timestamp is not a promise that every underlying measurement is current.</p></article></div>
      <p class="np-note">Use server-side requests for integrations; these examples make no cross-origin browser access promise. Cache responses and inspect the published timestamps and measurement states. No availability guarantee or new reuse license is implied; see <a href="/rights/">Technology &amp; Rights</a>.</p>
    </section>
    <section class="np-section" aria-labelledby="api-discovery-heading">
      <h2 id="api-discovery-heading">Start here</h2>
      <p>The files any crawler, assistant or integration should read first.</p>
      <ul class="api-discovery">${disc}
      </ul>
    </section>
    <section class="np-section" aria-labelledby="api-feeds-heading">
      <h2 id="api-feeds-heading">Public JSON catalog <small class="api-count">(${feeds.length})</small></h2>
      <p>The complete curated feed catalog from agents.json, grouped by what you want to do. Inspect each feed's timestamps and measurement limits before using its claims.</p>
      ${[['news', 'Read The Desk'], ['explore', 'Explore projects and the Vault'], ['evidence', 'Verify the claims'], ['operations', 'Inspect operational evidence']].map(([id, title]) => `<div class="api-group"><h3>${title}</h3><ul class="api-feeds">${rows(id)}</ul></div>`).join('\n')}
      <p class="np-note">Want to check these claims rather than read them? The <a href="/evidence/">Evidence</a> page re-computes the deploy ledger in your browser. Questions or a feed you need: <a href="/contact/">contact the studio</a>.</p>
    </section>
    <section class="np-section" aria-labelledby="api-actions-heading">
      <h2 id="api-actions-heading">Actions and integration contracts</h2>
      <p>These are the actions already advertised in <a href="/agents.json">agents.json</a>. Reading public files is separate from submitting a request. No action runs from this reference page.</p>
      <p class="np-note">Desk email signup requires the existing anti-forgery token and inbox confirmation. Pending is not subscribed. Authenticated feedback requires the declared Obelisk scope and idempotency key. Existing access rules apply.</p>
      <ul class="api-actions">${renderActions(manifest.actions)}</ul>
      <div class="api-next"><a href="/news/#desk-dispatch">Use the email signup form →</a><a href="/contact/?topic=collaborate">Discuss an integration →</a></div>
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
    { title: 'Lookalike', url: `${SITE}.example/x.json`, description: 'Off-site.' },
  ], actions: [{ name: 'dispatch.subscribe', method: 'POST', url: `${SITE}/desk/dispatch/subscribe`, description: 'Pending is not subscribed.', csrf: { header: 'X-CSRF-Token' }, auth: 'none' }] };
  const out = renderIndex(manifest, (p) => p === '/agents.json');
  t('feeds render with site-relative links', out.includes('href="/api/a.json"'));
  t('feed titles are escaped', out.includes('A &lt;feed&gt;'));
  t('off-site and lookalike URLs never render', !out.includes('other.example') && !out.includes(`${SITE}.example`));
  t('discovery lists only files that exist', out.includes('/agents.json') && !out.includes('/sitemap.xml'));
  t('the feed count matches the rows', out.includes('(1)') && (out.match(/class="api-feed"/g) || []).length === 1);
  const page = `<main>${START}${END}</main>`;
  const once = inject(page, out);
  t('inject is idempotent', inject(once, out) === once);
  t('missing markers are reported (null), never silently skipped', inject('<main></main>', out) === null);
  t('latest item date is source-derived, not generatedAt', latestPublication(JSON.stringify({ generatedAt: '2030-01-01', items: [{ date_published: '2026-03-22' }, { date_published: '2026-10-28' }, { date_published: 'invalid' }] }), 'json') === '2026-10-28T00:00:00.000Z');
  t('RSS date is source-derived', latestPublication('<rss><pubDate>Sun, 22 Mar 2026 00:00:00 +0000</pubDate></rss>', 'xml') === '2026-03-22T00:00:00.000Z');
  t('absent publication dates stay unknown', latestPublication('{"items":[]}', 'json') === null && latestPublication('<rss/>', 'xml') === null);
  t('actions preserve consent contract without automatic writes', out.includes('X-CSRF-Token') && out.includes('Pending is not subscribed.') && !/<form|<script|fetch\(/.test(out));
  const chooser = renderIndex({ feeds: [] }, () => true, (p) => p === '/feed.xml' ? '<pubDate>Sun, 22 Mar 2026 00:00:00 +0000</pubDate>' : '{"items":[]}');
  t('all existing subscription families are discoverable and archive labelled', ['Forge Ledger', 'Daily Dispatches', 'Signal Log archive', 'The Desk', '2026-03-22 UTC'].every((label) => chooser.includes(label)));
  const grouped = ['news-desk-engagement', 'public-intelligence', 'citation', 'build-check-diagnostics'].map((name) => ({ title: name, description: '', url: `${SITE}/api/${name}.json` }));
  t('grouping preserves each catalog entry exactly once', grouped.every((feed) => (renderIndex({ feeds: grouped }, () => false).match(new RegExp(`href="${local(feed.url)}"`, 'g')) || []).length === 1) && new Set(grouped.map(feedGroup)).size === 4);
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
