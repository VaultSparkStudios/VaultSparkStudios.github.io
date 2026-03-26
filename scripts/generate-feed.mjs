#!/usr/bin/env node
// generate-feed.mjs
// Scans journal post index.html files, extracts metadata, and writes feed.xml.
// Run: node scripts/generate-feed.mjs

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, '..');

const SITE_URL  = 'https://vaultsparkstudios.com';
const FEED_TITLE = 'Signal Log — VaultSpark Studios';
const FEED_DESC  = 'Development journal and studio updates from VaultSpark Studios. Behind-the-scenes dispatches from the vault.';

/** Extract a meta tag's content attribute. */
function getMeta(html, name) {
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'),
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${name}["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1].trim();
  }
  return null;
}

/** Extract <title> tag text. */
function getTitle(html) {
  const m = html.match(/<title>([^<]+)<\/title>/i);
  return m ? m[1].trim() : null;
}

/** Format Date as RFC-822 pubDate. */
function toRfc822(iso) {
  return new Date(iso).toUTCString().replace(/GMT$/, '+0000');
}

/** Escape XML special chars for CDATA-free fields. */
function escXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Discover journal posts — subdirectories of journal/ that have an index.html
const journalDir = join(ROOT, 'journal');
const slugs = readdirSync(journalDir).filter(name => {
  const p = join(journalDir, name);
  return statSync(p).isDirectory() && name !== 'archive';
});

const items = [];

for (const slug of slugs) {
  const htmlPath = join(journalDir, slug, 'index.html');
  let html;
  try { html = readFileSync(htmlPath, 'utf8'); } catch { continue; }

  const pubIso  = getMeta(html, 'article:published_time');
  if (!pubIso) continue; // Skip non-post pages (index, archive)

  const rawTitle = getMeta(html, 'og:title') || getTitle(html) || slug;
  // Strip site suffix like " | VaultSpark Studios"
  const title = rawTitle.replace(/\s*\|.*$/, '').trim();
  const description = getMeta(html, 'description') || '';
  const url = `${SITE_URL}/journal/${slug}/`;

  items.push({ title, description, url, pubDate: new Date(pubIso), slug });
}

// Sort newest first
items.sort((a, b) => b.pubDate - a.pubDate);

const lastBuild = items.length ? toRfc822(items[0].pubDate.toISOString()) : toRfc822(new Date().toISOString());

const itemsXml = items.map(it => `
    <item>
      <title>${escXml(it.title)}</title>
      <link>${it.url}</link>
      <guid isPermaLink="true">${it.url}</guid>
      <pubDate>${toRfc822(it.pubDate.toISOString())}</pubDate>
      <description><![CDATA[${it.description}]]></description>
    </item>`).join('\n');

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escXml(FEED_TITLE)}</title>
    <link>${SITE_URL}/journal/</link>
    <description>${escXml(FEED_DESC)}</description>
    <language>en-us</language>
    <copyright>Copyright ${new Date().getFullYear()} VaultSpark Studios</copyright>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${SITE_URL}/assets/icon-256.png</url>
      <title>${escXml(FEED_TITLE)}</title>
      <link>${SITE_URL}/journal/</link>
    </image>
${itemsXml}
  </channel>
</rss>
`;

const outPath = join(ROOT, 'feed.xml');
writeFileSync(outPath, feed, 'utf8');
console.log(`feed.xml written — ${items.length} item(s)`);
