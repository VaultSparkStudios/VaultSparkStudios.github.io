#!/usr/bin/env node
import { readFileSync } from 'node:fs';

function fail(message) {
  console.error(`verify-journal-feed: ${message}`);
  process.exit(1);
}

const index = readFileSync('journal/index.html', 'utf8');
const feed = JSON.parse(readFileSync('data/journal-feed.json', 'utf8'));
const renderer = readFileSync('assets/journal-feed.js', 'utf8');

const posts = Array.isArray(feed.posts) ? feed.posts : [];
if (posts.length < 7) fail(`expected at least 7 feed posts, found ${posts.length}`);

const slugs = posts.map((post) => post.slug).filter(Boolean);
if (new Set(slugs).size !== slugs.length) fail('duplicate post slugs in data/journal-feed.json');

const staticEntryMatches = index.match(/<article class="entry" id="/g) || [];
if (staticEntryMatches.length !== 3) {
  fail(`expected exactly 3 static journal entries in journal/index.html, found ${staticEntryMatches.length}`);
}

for (const slug of slugs) {
  if (index.includes(`id="${slug}"`)) {
    fail(`dynamic feed slug ${slug} is still inlined in journal/index.html`);
  }
  if (!index.includes(`'${slug}'`)) {
    fail(`reaction slug ${slug} missing from journal/index.html SLUGS list`);
  }
}

if (!index.includes('data-journal-feed') || !index.includes('/assets/journal-feed.js')) {
  fail('journal feed mount or renderer script is missing from journal/index.html');
}

if (!renderer.includes('window.loadJournalReactions')) {
  fail('assets/journal-feed.js does not reload reaction counts after rendering');
}

console.log(`verify-journal-feed: ok (${staticEntryMatches.length} inline · ${posts.length} feed posts)`);
