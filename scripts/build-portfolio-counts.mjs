#!/usr/bin/env node
/* build-portfolio-counts.mjs — D-S208.6: derive the press-kit portfolio counts from
 * the catalog instead of hardcoding them. The hardcoded "N sparked · M forge" stat
 * line + the "Six are sparked … fourteen more in active forge" prose drifted (and
 * broke build:check) TWICE in S208 whenever a project's status changed. The homepage
 * hero + studio-pulse already auto-derive from api/public-intelligence.json; this
 * closes the last hand-maintained count surface so the source of truth is singular.
 *
 * Injects (regex, no markers needed) into press/index.html:
 *   - the stat line:  "27 initiatives · 6 sparked · 14 in the forge · 0 vaulted"
 *   - the prose count words: "Six are sparked …" / "… fourteen more in active forge"
 * Project NAMES in the prose are left to the author (not a count, lower churn).
 *
 * Usage: node scripts/build-portfolio-counts.mjs [--check] [--self-test]
 * Exit: 0 ok · 1 drift (--check) / error.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PRESS = join(ROOT, 'press/index.html');
const FEED = join(ROOT, 'api/public-intelligence.json');
const argv = process.argv.slice(2);
const CHECK = argv.includes('--check');
const SELF_TEST = argv.includes('--self-test');

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
// Small-integer → English word (counts here are always < 100). Capitalized variant for sentence-start.
export function toWord(n) {
  n = Number(n);
  if (!Number.isFinite(n) || n < 0) return String(n);
  if (n < 20) return ONES[n];
  if (n < 100) { const t = TENS[Math.floor(n / 10)]; const o = n % 10; return o ? `${t}-${ONES[o]}` : t; }
  return String(n);
}
const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);

// S329: the full-registry total derives from the feed's portfolio.total (single
// authority: generate-public-intelligence.mjs PORTFOLIO_TOTAL) — no local literal.
export function countsFromCatalog(catalog, total) {
  if (!Number.isInteger(total) || total <= 0) throw new Error('countsFromCatalog: total missing or malformed (expected portfolio.total from api/public-intelligence.json)');
  const c = { sparked: 0, forge: 0, vaulted: 0 };
  for (const it of catalog) {
    if (it.status === 'SPARKED') c.sparked++;
    else if (it.status === 'VAULTED') c.vaulted++;
    else c.forge++;
  }
  return { ...c, total };
}

// Pure: rewrite the two count surfaces in the press HTML. Returns { html, changed }.
export function injectCounts(html, counts) {
  let out = html;
  // 1. Stat line (table row).
  out = out.replace(
    /\d+\s+initiatives\s+&middot;\s+\d+\s+sparked\s+&middot;\s+\d+\s+in the forge\s+&middot;\s+\d+\s+vaulted/,
    `${counts.total} initiatives &middot; ${counts.sparked} sparked &middot; ${counts.forge} in the forge &middot; ${counts.vaulted} vaulted`
  );
  // 2. Prose count words: "<Word> are sparked" and "with <word> more in active forge".
  out = out.replace(/\b([A-Z][a-z]+)\s+are sparked\b/, `${cap(toWord(counts.sparked))} are sparked`);
  out = out.replace(/\bwith\s+([a-z][a-z-]+)\s+more in active forge\b/, `with ${toWord(counts.forge)} more in active forge`);
  return { html: out, changed: out !== html };
}

if (SELF_TEST) {
  let fail = 0;
  const a = (c, m) => { if (!c) { console.error('  ✗ ' + m); fail++; } else console.log('  ✓ ' + m); };
  a(toWord(6) === 'six' && toWord(14) === 'fourteen' && toWord(0) === 'zero', 'number→word');
  a(toWord(21) === 'twenty-one', 'compound number→word');
  const cat = [{ status: 'SPARKED' }, { status: 'SPARKED' }, { status: 'FORGE' }, { status: 'VAULTED' }];
  const c = countsFromCatalog(cat, 27);
  a(c.sparked === 2 && c.forge === 1 && c.vaulted === 1 && c.total === 27, 'counts from catalog');
  let threw = false;
  try { countsFromCatalog(cat); } catch { threw = true; }
  a(threw, 'missing total throws (feed-derived, no literal fallback)');
  const html = 'Portfolio</td><td>27 initiatives &middot; 3 sparked &middot; 8 in the forge &middot; 0 vaulted</td> … Six are sparked — X — with eight more in active forge across';
  const r = injectCounts(html, { total: 27, sparked: 2, forge: 1, vaulted: 1 });
  a(r.html.includes('2 sparked &middot; 1 in the forge'), 'stat line rewritten');
  a(r.html.includes('Two are sparked'), 'prose sparked word rewritten');
  a(r.html.includes('with one more in active forge'), 'prose forge word rewritten');
  console.log(`\nbuild-portfolio-counts self-test: ${fail ? '✗ ' + fail + ' failed' : 'all passed'}`);
  process.exit(fail ? 1 : 0);
}

const feed = JSON.parse(readFileSync(FEED, 'utf8'));
const catalog = feed.catalog || [];
const counts = countsFromCatalog(catalog, feed.portfolio?.total);
const html = readFileSync(PRESS, 'utf8');
const { html: next, changed } = injectCounts(html, counts);
if (CHECK) {
  if (changed) { console.error(`✗ build-portfolio-counts: press kit drift — counts not ${counts.sparked} sparked · ${counts.forge} forge · ${counts.vaulted} vaulted. Run node scripts/build-portfolio-counts.mjs`); process.exit(1); }
  console.log(`build-portfolio-counts --check: in sync (${counts.sparked} sparked · ${counts.forge} forge · ${counts.vaulted} vaulted · ${counts.total} total)`);
  process.exit(0);
}
if (changed) { writeFileSync(PRESS, next); console.log(`✓ build-portfolio-counts → press kit (${counts.sparked} sparked · ${counts.forge} forge · ${counts.vaulted} vaulted)`); }
else console.log('build-portfolio-counts: already in sync');
