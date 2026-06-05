#!/usr/bin/env node
/**
 * build-forge-feed.mjs (S163 audit #11 · forge-ledger-rss)
 *
 * The Forge Ledger (api/commit-map.json, S162) is a public timeline of the
 * studio's creative labor — but it only lived on /studio-pulse/. This emits it
 * as a subscribable feed so followers, the Hub, and AI crawlers can watch the
 * vault's build cadence without polling a page:
 *   • feed/forge-ledger.json — JSON Feed 1.1
 *   • feed/forge-ledger.xml  — RSS 2.0
 *
 * Build-time + free (CANON-029): pure transform of an artifact that already
 * builds every session. No runtime, no API, no cost. Brand-on: the studio
 * narrates its own forge.
 *
 * Usage:
 *   node scripts/build-forge-feed.mjs            # write both feeds
 *   node scripts/build-forge-feed.mjs --check     # present + parseable
 *   node scripts/build-forge-feed.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const COMMIT_MAP = path.join(ROOT, 'api', 'commit-map.json');
const FEED_DIR = path.join(ROOT, 'feed');
const JSON_OUT = path.join(FEED_DIR, 'forge-ledger.json');
const XML_OUT = path.join(FEED_DIR, 'forge-ledger.xml');
const SITE = 'https://vaultsparkstudios.com';
const CHECK = process.argv.includes('--check');
const SELF_TEST = process.argv.includes('--self-test');

function xmlEscape(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]
  ));
}

/** Pure: shape a commit-map entry into a feed item. */
function toItem(e) {
  const title = `${e.move || 'Shipped'}: ${e.summary || ''}`.trim();
  const date = e.ts ? new Date(e.ts) : null;
  const iso = date && !isNaN(date.getTime()) ? date.toISOString() : null;
  return {
    id: `${SITE}/studio-pulse/#${e.sha || ''}`,
    title,
    sha: e.sha || '',
    scope: e.scope || null,
    move: e.move || 'Shipped',
    summary: e.summary || '',
    date_published: iso,
    rfc822: iso ? new Date(iso).toUTCString() : null,
    url: `${SITE}/studio-pulse/`,
  };
}

function buildJsonFeed(items) {
  return {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'VaultSpark Studios — The Forge Ledger',
    home_page_url: `${SITE}/studio-pulse/`,
    feed_url: `${SITE}/feed/forge-ledger.json`,
    description: 'Recent moves in the forge — what the studio shipped, fixed, and refined. Built from the public commit history.',
    language: 'en',
    items: items.map((it) => ({
      id: it.id,
      title: it.title,
      content_text: it.summary + (it.scope ? ` (${it.scope})` : ''),
      url: it.url,
      ...(it.date_published ? { date_published: it.date_published } : {}),
      tags: [it.move, ...(it.scope ? [it.scope] : [])],
    })),
  };
}

function buildRss(items) {
  const lastBuild = new Date().toUTCString();
  const body = items.map((it) => [
    '    <item>',
    `      <title>${xmlEscape(it.title)}</title>`,
    `      <link>${xmlEscape(it.url)}</link>`,
    `      <guid isPermaLink="false">${xmlEscape(it.id)}</guid>`,
    it.rfc822 ? `      <pubDate>${it.rfc822}</pubDate>` : '',
    `      <description>${xmlEscape(it.summary + (it.scope ? ` (${it.scope})` : ''))}</description>`,
    `      <category>${xmlEscape(it.move)}</category>`,
    '    </item>',
  ].filter(Boolean).join('\n')).join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '  <channel>',
    '    <title>VaultSpark Studios — The Forge Ledger</title>',
    `    <link>${SITE}/studio-pulse/</link>`,
    '    <description>Recent moves in the forge — what the studio shipped, fixed, and refined.</description>',
    '    <language>en</language>',
    `    <lastBuildDate>${lastBuild}</lastBuildDate>`,
    `    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${SITE}/feed/forge-ledger.xml" rel="self" type="application/rss+xml" />`,
    body,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}

if (SELF_TEST) {
  const sample = [
    { sha: 'abc1234', move: 'Shipped', scope: 'S163', summary: 'RUM field-LCP gate', ts: '2026-05-25T01:00:00.000Z' },
    { sha: 'def5678', move: 'Fixed', summary: 'mobile drawer & <ampersand> test', ts: 'not-a-date' },
  ].map(toItem);
  const json = buildJsonFeed(sample);
  const rss = buildRss(sample);
  const cases = [
    ['json feed version is 1.1', json.version === 'https://jsonfeed.org/version/1.1'],
    ['json item title includes move', json.items[0].title.startsWith('Shipped:')],
    ['valid date emitted', !!json.items[0].date_published],
    ['invalid date omitted (no date_published key)', !('date_published' in json.items[1])],
    ['rss escapes ampersand/angle', rss.includes('&lt;ampersand&gt;') && !rss.includes('<ampersand>')],
    ['rss has channel + items', rss.includes('<channel>') && (rss.match(/<item>/g) || []).length === 2],
    ['json parseable round-trip', (() => { try { JSON.parse(JSON.stringify(json)); return true; } catch { return false; } })()],
  ];
  let pass = 0, fail = 0;
  for (const [name, ok] of cases) { console.log(`  ${ok ? '✓' : '✗'} ${name}`); ok ? pass++ : fail++; }
  console.log(`\nself-test: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

if (!fs.existsSync(COMMIT_MAP)) {
  console.error('build-forge-feed: api/commit-map.json missing — run build-commit-map.mjs first');
  process.exit(CHECK ? 1 : 0);
}

const map = JSON.parse(fs.readFileSync(COMMIT_MAP, 'utf8'));
const items = (Array.isArray(map.entries) ? map.entries : []).map(toItem);

if (CHECK) {
  let ok = true;
  for (const [f, kind] of [[JSON_OUT, 'json'], [XML_OUT, 'xml']]) {
    if (!fs.existsSync(f)) { console.error(`build-forge-feed --check: ${path.relative(ROOT, f)} missing`); ok = false; continue; }
    if (kind === 'json') { try { JSON.parse(fs.readFileSync(f, 'utf8')); } catch { console.error('build-forge-feed --check: forge-ledger.json invalid'); ok = false; } }
  }
  if (!ok) process.exit(1);
  console.log(`build-forge-feed --check: ok (${items.length} items)`);
  process.exit(0);
}

fs.mkdirSync(FEED_DIR, { recursive: true });
fs.writeFileSync(JSON_OUT, `${JSON.stringify(buildJsonFeed(items), null, 2)}\n`);
fs.writeFileSync(XML_OUT, buildRss(items));
console.log(`build-forge-feed → feed/forge-ledger.json + feed/forge-ledger.xml (${items.length} items)`);
