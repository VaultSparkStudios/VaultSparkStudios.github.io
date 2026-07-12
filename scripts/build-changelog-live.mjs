#!/usr/bin/env node
/**
 * build-changelog-live.mjs — S275 (audit #5, CLS root-fix).
 *
 * /changelog/ had field CLS p75 0.637 (worst route in RUM): changelog-live.js
 * PREPENDED the consumerChangelog entries above the static timeline after
 * paint, pushing the whole page down. The feed (api/public-intelligence.json
 * → consumerChangelog) is committed and known at build time — so render the
 * entries statically between <!-- cl-live:start/end --> markers, exactly the
 * derive-don't-hardcode injection pattern the hero already uses. The client
 * script now only tops up entries newer than the build (normally zero), so
 * first paint is final layout.
 *
 * Usage:
 *   node scripts/build-changelog-live.mjs            # inject
 *   node scripts/build-changelog-live.mjs --check    # drift gate
 *   node scripts/build-changelog-live.mjs --self-test
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FEED = path.join(ROOT, 'api', 'public-intelligence.json');
const PAGE = path.join(ROOT, 'changelog', 'index.html');

const CHECK = process.argv.includes('--check');
const SELF_TEST = process.argv.includes('--self-test');

export function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Vocabulary currency (check-vocabulary-consistency gate): historical feed
// entries predate renames — surface copy always uses the CURRENT name.
const VOCAB_RENAMES = [[/\bForge\s+Window\b/g, 'Studio Pulse']];
export function currentVocab(s) {
  let out = String(s ?? '');
  for (const [re, to] of VOCAB_RENAMES) out = out.replace(re, to);
  return out;
}

export function formatLabel(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return esc(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

// Mirrors changelog-live.js renderEntry() markup exactly (same classes) so the
// static render is visually identical to what the client used to inject.
export function renderEntries(feed) {
  const sorted = [...feed].sort((a, b) => (a.date < b.date ? 1 : -1));
  return sorted.map((entry) => {
    const items = Array.isArray(entry.highlights) ? entry.highlights : [];
    return [
      `<article class="cl-phase cl-phase--live" data-reveal="fade-up" data-cl-live="1" data-cl-date="${esc(entry.date)}">`,
      '<div class="cl-dot" aria-hidden="true"></div>',
      '<div class="cl-phase-header">',
      '<span class="cl-phase-num">Live</span>',
      `<span class="cl-phase-date">${formatLabel(entry.date)}</span>`,
      `<div class="cl-phase-title">${esc(currentVocab(entry.title || 'Vault update'))}</div>`,
      '</div>',
      `<ul class="cl-items">${items.map((i) => `<li>${esc(currentVocab(i))}</li>`).join('')}</ul>`,
      '</article>',
    ].join('');
  }).join('\n          ');
}

export function inject(html, content) {
  const re = /<!-- cl-live:start -->[\s\S]*?<!-- cl-live:end -->/;
  if (!re.test(html)) throw new Error('cl-live markers not found in changelog/index.html');
  return html.replace(re, `<!-- cl-live:start -->\n          ${content}\n          <!-- cl-live:end -->`);
}

function selfTest() {
  let pass = 0, fail = 0;
  const ok = (c, l) => { if (c) pass++; else { fail++; console.error(`  ✗ ${l}`); } };
  const feed = [
    { date: '2026-05-01', title: 'Older', highlights: ['a'] },
    { date: '2026-06-01', title: 'New <b>bold</b>', highlights: ['x & y'] },
  ];
  const out = renderEntries(feed);
  ok(out.indexOf('2026-06-01') < out.indexOf('2026-05-01'), 'newest entry renders first');
  ok(out.includes('New &lt;b&gt;bold&lt;/b&gt;'), 'HTML in titles is escaped');
  ok(out.includes('x &amp; y'), 'highlights escaped');
  ok(out.includes('data-cl-live="1"'), 'entries carry the live marker for client dedupe');
  const html = '<div><!-- cl-live:start --><!-- cl-live:end --></div>';
  ok(inject(html, 'X').includes('X'), 'marker injection works');
  let threw = false;
  try { inject('<div>no markers</div>', 'X'); } catch { threw = true; }
  ok(threw, 'missing markers throw');
  console.log(`build-changelog-live --self-test: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

function main() {
  if (SELF_TEST) return selfTest();
  const feed = JSON.parse(readFileSync(FEED, 'utf8')).consumerChangelog || [];
  const html = readFileSync(PAGE, 'utf8');
  const next = inject(html, renderEntries(feed));
  if (CHECK) {
    if (next !== html) { console.error('build-changelog-live --check: drift — run node scripts/build-changelog-live.mjs'); process.exit(1); }
    console.log('build-changelog-live --check: ok');
    return;
  }
  if (next !== html) writeFileSync(PAGE, next);
  console.log(`build-changelog-live → ${feed.length} live entr(ies) rendered statically`);
}

main();
