#!/usr/bin/env node
// @verification-scope scheduled-assurance
// Daily, read-only check of the served Pages origin. The edge may challenge CI
// clients, so route/content assertions use Pages while smoke-live checks the edge.
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { deriveNewsReleaseContract } from './lib/news-release-contract.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => args.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1) ?? fallback;
const origin = option('--origin', 'https://vaultsparkstudios-website.pages.dev').replace(/\/$/, '');
const concurrency = Number(option('--concurrency', '8'));
const maxAgeDays = Number(option('--max-age-days', '1'));
const minRoutes = Number(option('--min-routes', '180'));
const jsonOut = option('--json-out', '');
const REQUIRED_ROUTES = ['/', '/games/', '/projects/', '/news/', '/community/', '/membership/', '/contact/', '/privacy/', '/terms/', '/journal/', '/studio/', '/status/', '/universe/'];
const FILE_SURFACES = [
  ['/agents.json', 'json'], ['/manifest.json', 'json'], ['/api/public-status.json', 'json'],
  ['/api/heartbeat.json', 'json'], ['/api/site-health.json', 'json'],
  ['/.well-known/llms.txt', 'text'], ['/robots.txt', 'text'], ['/sw.js', 'text'],
];
const headers = { 'user-agent': 'VaultSpark-Surface-Assurance/1.0', accept: 'text/html,application/json,application/xml,*/*' };

export function sitemapRoutes(xml, minimum = minRoutes) {
  const routes = [...String(xml).matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((match) => {
    const url = new URL(match[1]);
    if (url.hostname !== 'vaultsparkstudios.com' || url.search || url.hash) throw new Error(`noncanonical sitemap URL: ${match[1]}`);
    return url.pathname;
  });
  if (routes.length < minimum) throw new Error(`sitemap has ${routes.length} routes; expected at least ${minimum}`);
  if (new Set(routes).size !== routes.length) throw new Error('sitemap contains duplicate routes');
  for (const route of REQUIRED_ROUTES) if (!routes.includes(route)) throw new Error(`sitemap lacks ${route}`);
  return routes;
}

export function inspectPage(route, result) {
  if (result.status !== 200) return `${route}: HTTP ${result.status}`;
  if (result.path !== route) return `${route}: redirected to ${result.path}`;
  if (!/text\/html/i.test(result.type)) return `${route}: unexpected content type ${result.type}`;
  if (!/<html\b/i.test(result.body) || !/<title>[^<]+<\/title>/i.test(result.body)) return `${route}: missing HTML document or title`;
  return null;
}

export function inspectFileSurface(route, kind, result) {
  if (result.status !== 200) return `${route}: HTTP ${result.status}`;
  if (result.body.length < 20) return `${route}: empty response`;
  if (kind === 'json') {
    try { const value = JSON.parse(result.body); if (!value || typeof value !== 'object' || !Object.keys(value).length) return `${route}: empty JSON`; }
    catch { return `${route}: invalid JSON`; }
  }
  return null;
}

export function inspectDesk({ feed, claimsText, freshness, home, news, article, artStatus, now = new Date(), allowedAge = maxAgeDays }) {
  const contract = deriveNewsReleaseContract(feed, claimsText);
  const age = Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - Date.parse(`${contract.date}T00:00:00Z`)) / 86400000);
  if (age < 0 || age > allowedAge) throw new Error(`Desk newest edition ${contract.date} is ${age} UTC day(s) old`);
  if (freshness?.latestEditionDate !== contract.date || freshness?.state !== 'daily') throw new Error('Desk freshness feed disagrees with the live edition');
  if (!home.includes(`href="${contract.route}"`)) throw new Error(`homepage does not link to newest Desk story ${contract.route}`);
  if (!news.includes(`href="${contract.route}"`)) throw new Error(`News index does not link to newest Desk story ${contract.route}`);
  const rows = claimsText.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const story = contract.route.split('/').filter(Boolean).at(-1);
  const storyFacts = rows.filter((row) => row.type === 'fact' && row.date === contract.date && row.story === story);
  if (!storyFacts.length) throw new Error(`claim ledger has no fact row for newest Desk story ${contract.route}`);
  for (const fact of storyFacts) {
    if (!article.includes(`id="${fact.id}"`) || !article.includes(`data-fact-hash="${fact.hash}"`)) {
      throw new Error(`newest Desk article lacks fact receipt ${fact.id}`);
    }
  }
  if (!/<title>[^<]+<\/title>/i.test(article)) throw new Error('newest Desk article has no title');
  if (artStatus !== 200) throw new Error(`newest Desk artwork returned HTTP ${artStatus}`);
  return { ...contract, ageDays: age };
}

async function get(path, { attempts = 2 } = {}) {
  let last;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetch(`${origin}${path}`, { headers, cache: 'no-store', signal: AbortSignal.timeout(15_000) });
      const body = await response.text();
      const result = { status: response.status, path: new URL(response.url).pathname, type: response.headers.get('content-type') || '', body };
      if (![429, 500, 502, 503, 504].includes(response.status) || attempt === attempts - 1) return result;
      last = new Error(`${path}: HTTP ${response.status}`);
    } catch (error) { last = error; }
    await new Promise((done) => setTimeout(done, 500));
  }
  throw last;
}

async function sweep(routes, width) {
  const failures = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(width, routes.length) }, async () => {
    while (cursor < routes.length) {
      const route = routes[cursor++];
      try {
        const result = await get(route);
        const error = inspectPage(route, result);
        if (error) failures.push(error);
      } catch (error) { failures.push(`${route}: ${error.message}`); }
    }
  });
  await Promise.all(workers);
  return failures.sort();
}

function selfTest() {
  const feed = { items: [{ url: 'https://vaultsparkstudios.com/news/2026-09-30/test/', title: 'Test', date_published: '2026-09-30T00:00:00Z' }] };
  const claims = '{"type":"fact","date":"2026-09-30","story":"test","id":"fact-1","hash":"abc"}\n{"type":"stance","date":"2026-09-30","story":"test"}\n{"type":"fact","date":"2026-09-30","story":"other","id":"fact-other","hash":"def"}\n';
  const input = { feed, claimsText: claims, freshness: { latestEditionDate: '2026-09-30', state: 'daily' }, home: 'href="/news/2026-09-30/test/"', news: 'href="/news/2026-09-30/test/"', article: '<title>Test</title><li id="fact-1" data-fact-hash="abc">', artStatus: 200, now: new Date('2026-10-01T09:00:00Z'), allowedAge: 1 };
  const reject = (change, pattern) => { try { inspectDesk({ ...input, ...change }); return false; } catch (error) { return pattern.test(error.message); } };
  const cases = [
    ['valid Desk chain', inspectDesk(input).ageDays === 1],
    ['same-day facts from another story do not belong in the newest article', inspectDesk(input).factCount === 2],
    ['stale Desk fails', reject({ now: new Date('2026-10-02T09:00:00Z') }, /old/)],
    ['missing homepage link fails', reject({ home: '' }, /homepage/)],
    ['missing fact receipt fails', reject({ article: '<title>Test</title>' }, /fact receipt/)],
    ['missing art fails', reject({ artStatus: 404 }, /artwork/)],
    ['page document passes', inspectPage('/', { status: 200, path: '/', type: 'text/html', body: '<html><title>Home</title>' }) === null],
    ['redirected route fails', /redirected/.test(inspectPage('/games/', { status: 200, path: '/', type: 'text/html', body: '<html><title>Home</title>' }))],
    ['invalid public JSON fails', /invalid JSON/.test(inspectFileSurface('/agents.json', 'json', { status: 200, body: '{broken-json-response' }))],
    ['short sitemap fails', (() => { try { sitemapRoutes('<loc>https://vaultsparkstudios.com/</loc>', 180); return false; } catch { return true; } })()],
  ];
  for (const [name, ok] of cases) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (cases.some(([, ok]) => !ok)) throw new Error('surface matrix self-test failed');
  console.log(`check-live-surface-matrix --self-test: ${cases.length}/${cases.length} passed`);
}

async function main() {
  if (args.includes('--self-test')) return selfTest();
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 20) throw new Error('concurrency must be 1..20');
  if (!Number.isInteger(maxAgeDays) || maxAgeDays < 0 || maxAgeDays > 7) throw new Error('max-age-days must be 0..7');
  const sitemap = await get('/sitemap.xml');
  if (sitemap.status !== 200) throw new Error(`sitemap returned HTTP ${sitemap.status}`);
  const routes = sitemapRoutes(sitemap.body);
  const failures = await sweep(routes, concurrency);
  const fileResults = await Promise.all(FILE_SURFACES.map(async ([route, kind]) => {
    try { return inspectFileSurface(route, kind, await get(route)); }
    catch (error) { return `${route}: ${error.message}`; }
  }));
  failures.push(...fileResults.filter(Boolean));
  const [feedRes, claimsRes, freshnessRes, homeRes, newsRes] = await Promise.all([
    get('/api/news-desk-feed.json'), get('/api/news-desk-claims.ndjson'), get('/api/news-desk-freshness.json'), get('/'), get('/news/'),
  ]);
  for (const [name, result] of [['feed', feedRes], ['claims', claimsRes], ['freshness', freshnessRes], ['home', homeRes], ['news', newsRes]]) {
    if (result.status !== 200) failures.push(`${name}: HTTP ${result.status}`);
  }
  let desk = null;
  if (!failures.some((error) => /^(feed|claims|freshness|home|news):/.test(error))) {
    try {
      const feed = JSON.parse(feedRes.body);
      const claimsText = claimsRes.body;
      const freshness = JSON.parse(freshnessRes.body);
      const contract = deriveNewsReleaseContract(feed, claimsText);
      const image = new URL(feed.items.find((item) => new URL(item.url).pathname === contract.route)?.image || 'https://vaultsparkstudios.com/missing').pathname;
      const [article, art] = await Promise.all([get(contract.route), get(image)]);
      if (article.status !== 200) throw new Error(`newest article returned HTTP ${article.status}`);
      desk = inspectDesk({ feed, claimsText, freshness, home: homeRes.body, news: newsRes.body, article: article.body, artStatus: art.status });
    } catch (error) { failures.push(`Desk: ${error.message}`); }
  }
  const report = { checkedAt: new Date().toISOString(), origin, routes: routes.length, fileSurfaces: FILE_SURFACES.length, failures: failures.length, desk, errors: failures };
  if (jsonOut) await writeFile(resolve(jsonOut), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`live surface matrix: ${routes.length} sitemap routes · ${FILE_SURFACES.length} public files · Desk ${desk ? `${desk.date} (${desk.factCount} facts, ${desk.stanceCount} stances)` : 'FAILED'} · ${failures.length} failure(s)`);
  for (const error of failures.slice(0, 30)) console.error(`  ✗ ${error}`);
  if (failures.length > 30) console.error(`  … ${failures.length - 30} more failure(s)`);
  if (failures.length) process.exitCode = 1;
}

const direct = process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename);
if (direct) main().catch((error) => { console.error(`live surface matrix failed: ${error.message}`); process.exitCode = 1; });
