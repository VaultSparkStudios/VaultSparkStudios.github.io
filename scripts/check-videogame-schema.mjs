#!/usr/bin/env node
/* check-videogame-schema.mjs — S194 schema-honesty gate.

   S193 removed a fabricated `aggregateRating: 4.5 / ratingCount: 1` from three
   game pages — a Google structured-data-spam risk and a CANON-008 honesty
   violation with no review backend behind it. Nothing structural stopped it
   coming back the next time a page is hand-edited or copied as a template.

   This gate locks the door:
     • any VideoGame (or game-bearing) JSON-LD with aggregateRating / ratingValue /
       ratingCount / reviewCount but no real, sourced review dataset → ERROR
     • a VideoGame page missing the honest enrichment S193 added (offers,
       applicationCategory, operatingSystem) → WARN

   A review star the studio can't substantiate poisons rich-results eligibility
   and the honesty posture; this keeps invented ratings from silently returning.

   Import-safe: side effects run only when invoked directly.
   Usage:
     node scripts/check-videogame-schema.mjs            # scan game JSON-LD
     node scripts/check-videogame-schema.mjs --self-test
*/
import { readFileSync } from 'node:fs';
import { execSync } from './lib/safe-spawn.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const RATING_KEYS = ['aggregateRating', 'ratingValue', 'ratingCount', 'reviewCount', 'reviewRating'];
const HONEST_ENRICHMENT = ['offers', 'applicationCategory', 'operatingSystem'];

// Extract the raw text of every <script type="application/ld+json"> block.
export function jsonLdBlocks(html) {
  const out = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) out.push(m[1].trim());
  return out;
}

// Flatten a JSON-LD value (object or @graph array) into a list of node objects.
function flattenNodes(parsed) {
  const nodes = [];
  const visit = (v) => {
    if (Array.isArray(v)) { v.forEach(visit); return; }
    if (v && typeof v === 'object') {
      nodes.push(v);
      if (Array.isArray(v['@graph'])) v['@graph'].forEach(visit);
    }
  };
  visit(parsed);
  return nodes;
}

function isVideoGame(node) {
  const t = node['@type'];
  if (!t) return false;
  return Array.isArray(t) ? t.includes('VideoGame') : t === 'VideoGame';
}

// Analyze one page's JSON-LD. Returns { errors:[], warns:[], sawVideoGame }.
export function analyzePage(html) {
  const errors = [];
  const warns = [];
  let sawVideoGame = false;
  for (const block of jsonLdBlocks(html)) {
    let parsed;
    try { parsed = JSON.parse(block); } catch { continue; } // non-JSON block — skip
    for (const node of flattenNodes(parsed)) {
      if (!isVideoGame(node)) continue;
      sawVideoGame = true;
      // Fabricated-rating check: any rating key present is an ERROR unless a real
      // review dataset is attached (we have no review backend → none is legitimate).
      for (const key of RATING_KEYS) {
        if (key in node) {
          errors.push(`VideoGame JSON-LD carries "${key}" with no review backend — fabricated rating (CANON-008 / structured-data-spam). Remove it.`);
        }
      }
      // Honest enrichment present?
      for (const key of HONEST_ENRICHMENT) {
        if (!(key in node)) warns.push(`VideoGame JSON-LD missing honest field "${key}" (S193 enrichment)`);
      }
    }
  }
  return { errors, warns, sawVideoGame };
}

function gameHtmlFiles() {
  return execSync('git ls-files "games/*.html" "vaultspark-football-gm/*.html"', { cwd: ROOT, encoding: 'utf8' })
    .split('\n').filter(Boolean);
}

function runSelfTest() {
  let fail = 0;
  const assert = (c, m) => { if (!c) { console.error('  ✗ ' + m); fail++; } };

  const fabricated = `<script type="application/ld+json">${JSON.stringify({
    '@type': 'VideoGame', name: 'X', aggregateRating: { ratingValue: 4.5, ratingCount: 1 },
  })}</script>`;
  let r = analyzePage(fabricated);
  assert(r.sawVideoGame && r.errors.some((e) => /aggregateRating/.test(e)), 'flags fabricated aggregateRating');

  const honest = `<script type="application/ld+json">${JSON.stringify({
    '@type': 'VideoGame', name: 'X', offers: { '@type': 'Offer', price: '0' },
    applicationCategory: 'GameApplication', operatingSystem: 'Web',
  })}</script>`;
  r = analyzePage(honest);
  assert(r.sawVideoGame && r.errors.length === 0 && r.warns.length === 0, 'honest enriched VideoGame is clean');

  // @graph wrapping is unwrapped.
  const graph = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@graph': [{ '@type': 'VideoGame', name: 'Y', ratingValue: 5 }],
  })}</script>`;
  r = analyzePage(graph);
  assert(r.errors.some((e) => /ratingValue/.test(e)), 'unwraps @graph and flags rating inside');

  // Non-VideoGame rating (e.g. a legit Product elsewhere) is not our concern here.
  const other = `<script type="application/ld+json">${JSON.stringify({ '@type': 'Organization', name: 'Z' })}</script>`;
  r = analyzePage(other);
  assert(!r.sawVideoGame && r.errors.length === 0, 'ignores non-VideoGame nodes');

  // Malformed JSON-LD block does not throw.
  r = analyzePage('<script type="application/ld+json">{ not json }</script>');
  assert(r.errors.length === 0, 'malformed block skipped, no throw');

  if (fail === 0) { console.log('✓ check-videogame-schema --self-test: 5/5 passed'); process.exit(0); }
  console.error('✗ check-videogame-schema --self-test: ' + fail + ' failed'); process.exit(1);
}

function runScan() {
  const files = gameHtmlFiles();
  let errors = 0, warns = 0, games = 0;
  for (const f of files) {
    const r = analyzePage(readFileSync(join(ROOT, f), 'utf8'));
    if (r.sawVideoGame) games++;
    for (const e of r.errors) { console.error(`✗ ${f}: ${e}`); errors++; }
    for (const w of r.warns) { console.warn(`⚠ ${f}: ${w}`); warns++; }
  }
  if (errors) {
    console.error(`✗ check-videogame-schema: ${errors} fabricated-rating finding(s) — remove before push`);
    process.exit(1);
  }
  console.log(`✓ check-videogame-schema: ${games} VideoGame page(s) clean · no unsourced ratings` + (warns ? ` (${warns} enrichment warning)` : ''));
  process.exit(0);
}

const invokedDirectly = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('check-videogame-schema.mjs');
if (invokedDirectly) {
  if (process.argv.includes('--self-test')) runSelfTest();
  else runScan();
}
