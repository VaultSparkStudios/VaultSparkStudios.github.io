#!/usr/bin/env node
/**
 * check-hero-spotlight-coherence.mjs (S248)
 *
 * The homepage hero showcase is now editorially curated: catalog items in
 * api/public-intelligence.json carry an integer `spotlight` rank (set from the
 * HERO_SPOTLIGHT list in generate-public-intelligence.mjs), and
 * build-hero-portfolio.mjs orders the hero tiles by it. That curation is the first
 * thing every human AND agent sees, so a silent break there is expensive: a typo'd
 * id vanishes from the showcase, a duplicate rank makes tile order nondeterministic,
 * a VAULTED id would surface a dead project, and a spotlight the renderer dropped
 * (e.g. because its page can't resolve) means the founder's curation didn't take.
 *
 * This gate proves the loop end-to-end against SOURCE OF TRUTH (the generated feed +
 * the rendered index.html), not against a hand-copied list:
 *   1. spotlight ranks are unique + contiguous 0..n-1 (deterministic order)
 *   2. every spotlit id exists in the catalog and is NOT VAULTED
 *   3. the rendered hero-showcase in index.html contains each spotlit id, in the
 *      curated order, among its leading tiles (curation actually took effect)
 *
 * Usage:
 *   node scripts/check-hero-spotlight-coherence.mjs            # live gate
 *   node scripts/check-hero-spotlight-coherence.mjs --self-test
 *
 * Exit: 0 ok · 1 incoherent/error.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const FEED = path.join(ROOT, 'api/public-intelligence.json');
const INDEX = path.join(ROOT, 'index.html');

const SELF_TEST = process.argv.includes('--self-test');

// Pure: validate the spotlight curation against the catalog + the rendered hero id
// order. Returns { ok, errors[] }. `heroTileIds` is the ordered list of ht-<id>
// tile ids parsed from the hero-showcase block (leading tiles the renderer emitted).
export function checkSpotlight(catalog, heroTileIds) {
  const errors = [];
  const spot = catalog
    .filter((c) => Number.isInteger(c.spotlight))
    .sort((a, b) => a.spotlight - b.spotlight);

  if (!spot.length) {
    // No curation is a valid state (pure auto-rank). Nothing to prove.
    return { ok: true, errors };
  }

  // 1. ranks unique + contiguous 0..n-1
  const ranks = spot.map((c) => c.spotlight);
  if (new Set(ranks).size !== ranks.length) errors.push(`duplicate spotlight rank(s): [${ranks.join(', ')}]`);
  ranks.forEach((r, i) => { if (r !== i) errors.push(`spotlight ranks not contiguous from 0: expected ${i}, got ${r} (id=${spot[i].id})`); });

  // 2. no VAULTED item is spotlit (would surface a dead project as a flagship)
  for (const c of spot) {
    if (c.status === 'VAULTED') errors.push(`VAULTED project '${c.id}' is spotlit — vaulted projects must not be hero flagships`);
  }

  // 3. curation actually took effect: each spotlit id appears in the rendered hero,
  //    in curated order, among the leading tiles. (Non-VAULTED spotlights only —
  //    a VAULTED one is already an error above and is dropped by the renderer.)
  const curated = spot.filter((c) => c.status !== 'VAULTED').map((c) => c.id);
  const leading = heroTileIds.slice(0, curated.length);
  if (curated.join(',') !== leading.join(',')) {
    errors.push(`rendered hero tile order [${leading.join(', ') || '∅'}] does not match spotlight curation [${curated.join(', ')}] — run: node scripts/build-hero-portfolio.mjs`);
  }

  return { ok: errors.length === 0, errors };
}

// Parse the ordered ht-<id> tile ids from the hero-showcase block of index.html.
export function parseHeroTileIds(html) {
  const m = html.match(/<!-- hero-showcase:start -->([\s\S]*?)<!-- hero-showcase:end -->/);
  if (!m) return [];
  const seen = new Set();
  const ids = [];
  for (const mm of m[1].matchAll(/\bht-([a-z0-9-]+)\b/g)) {
    const id = mm[1];
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

if (SELF_TEST) {
  let passed = 0;
  const ok = (cond, msg) => { if (!cond) { console.error('✗ ' + msg); process.exit(1); } console.log('  ✓ ' + msg); passed++; };

  const good = [
    { id: 'call-of-doodie', status: 'SPARKED', spotlight: 0 },
    { id: 'mindframe', status: 'FORGE', spotlight: 1 },
    { id: 'veilos', status: 'SPARKED', spotlight: 2 },
    { id: 'football-gm', status: 'SPARKED' },
  ];
  const goodTiles = ['call-of-doodie', 'mindframe', 'veilos', 'football-gm'];
  ok(checkSpotlight(good, goodTiles).ok, 'coherent curation passes');
  ok(checkSpotlight([{ id: 'a', status: 'SPARKED' }], ['a']).ok, 'no spotlight (pure auto-rank) passes');

  const dup = [{ id: 'a', status: 'SPARKED', spotlight: 0 }, { id: 'b', status: 'SPARKED', spotlight: 0 }];
  ok(!checkSpotlight(dup, ['a', 'b']).ok, 'duplicate rank fails');

  const gap = [{ id: 'a', status: 'SPARKED', spotlight: 0 }, { id: 'b', status: 'SPARKED', spotlight: 2 }];
  ok(!checkSpotlight(gap, ['a', 'b']).ok, 'non-contiguous rank fails');

  const vault = [{ id: 'a', status: 'VAULTED', spotlight: 0 }, { id: 'b', status: 'SPARKED', spotlight: 1 }];
  ok(!checkSpotlight(vault, ['b']).ok, 'VAULTED spotlight fails');

  // Curation didn't take effect (renderer emitted a different leading order).
  ok(!checkSpotlight(good, ['mindframe', 'call-of-doodie', 'veilos', 'football-gm']).ok,
    'rendered order mismatch fails');

  ok(parseHeroTileIds('<!-- hero-showcase:start --><a class="hero-tile ht-foo is-live">x</a><a class="hero-tile ht-bar">y</a><!-- hero-showcase:end -->').join(',') === 'foo,bar',
    'parseHeroTileIds extracts ordered unique tile ids');

  console.log(`\ncheck-hero-spotlight-coherence self-test: ${passed} passing`);
  process.exit(0);
}

const catalog = JSON.parse(readFileSync(FEED, 'utf8')).catalog || [];
const heroTileIds = parseHeroTileIds(readFileSync(INDEX, 'utf8'));
const { ok, errors } = checkSpotlight(catalog, heroTileIds);
if (!ok) {
  console.error('check-hero-spotlight-coherence: FAIL');
  for (const e of errors) console.error('  · ' + e);
  process.exit(1);
}
const n = catalog.filter((c) => Number.isInteger(c.spotlight)).length;
console.log(`check-hero-spotlight-coherence: ok (${n} spotlit · hero leading tiles match curation)`);
