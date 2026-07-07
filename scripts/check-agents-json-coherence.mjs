#!/usr/bin/env node
/**
 * check-agents-json-coherence.mjs — S221 (closes the S220 carry, score 84).
 *
 * THE GAP IT CLOSES: agents.json is the AI-agent discovery manifest (CANON-048 dual
 * audience). For each project it advertises ONE `url`. `build-agents-json.mjs` routes
 * by a slug heuristic (`/games/<slug>/` vs `/projects/<slug>/`) and only marks a
 * project "on-site" if THAT guessed dir exists — otherwise it falls back to the
 * external `liveUrl`. So a project whose on-site page lives under the OTHER category
 * (e.g. MindFrame's page is at `games/mindframe/` but the heuristic guesses
 * `projects/mindframe/`) is silently advertised to agents at its EXTERNAL domain,
 * even though a self-declared-canonical on-site page exists. Crawlers get sent
 * off-site; the on-site canonical is orphaned from discovery.
 *
 * This gate surfaces that incoherence deterministically: any agents.json entry whose
 * `url` is EXTERNAL while an on-site `index.html` exists under games/ or projects/.
 *
 * ADVISORY by design (exit 0 with a report, unless --strict): the resolution is a
 * founder/content decision — either the external domain is the intended canonical
 * (accept it) OR the on-site page is canonical (then build-agents-json.mjs must route
 * on-site AND a matching llms-full.txt shard must be generated, or it would advertise
 * a dead shard — the builder's own "never advertise a dead URL" rule). The fix
 * belongs in build-agents-json.mjs, never a hand-edit of the generated file.
 *
 * Modes: (default advisory) · --strict (exit 1 on any finding) · --json · --self-test
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://vaultsparkstudios.com';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const strict = args.includes('--strict');
const selfTest = args.includes('--self-test');

// ── Pure, testable core ─────────────────────────────────────────────────────────
/**
 * findIncoherent(projects, onSiteResolver) — pure.
 * @param {Array<{slug:string,url:string,name?:string}>} projects  agents.json entries
 * @param {(slug:string)=>string|null} onSiteResolver  returns the on-site route if a
 *        canonical page exists on disk for the slug, else null
 * @returns {Array<{slug:string, url:string, onSiteRoute:string}>}
 */
export function findIncoherent(projects, onSiteResolver) {
  const out = [];
  for (const p of projects) {
    if (!p || !p.slug || !p.url) continue;
    const external = !p.url.startsWith(SITE);
    if (!external) continue;                 // already on-site → coherent
    const route = onSiteResolver(p.slug);
    if (route) out.push({ slug: p.slug, url: p.url, onSiteRoute: route });
  }
  return out;
}

/**
 * findDeadShards(projects, shardExists) — pure. An advertised `llmsFull` whose file
 * does not exist is a 404 served to crawlers — an unambiguous lie, not a judgment
 * call, so this FAILS by default (unlike the founder-decision incoherence above).
 * @param {Array<{slug:string,llmsFull?:string}>} projects
 * @param {(url:string)=>boolean} shardExists  true if the shard file is on disk
 * @returns {Array<{slug:string, llmsFull:string}>}
 */
export function findDeadShards(projects, shardExists) {
  const out = [];
  for (const p of projects) {
    if (!p || !p.slug || !p.llmsFull) continue;
    if (!shardExists(p.llmsFull)) out.push({ slug: p.slug, llmsFull: p.llmsFull });
  }
  return out;
}

/**
 * findMissingSparkedShards(catalogEntries, resolveOnSitePath, resolveShardPath) — pure.
 *
 * CANON-048: every SPARKED project with an on-site canonical page MUST have a committed
 * llms-full.txt shard — so AI agents can discover and index it. A SPARKED page without a
 * shard is an AI discovery blind-spot, not a founder judgment call (unlike the
 * external-URL incoherence above). This FAILS unconditionally when violated.
 *
 * @param {Array<{id:string,status:string}>} catalogEntries  items from public-intelligence catalog
 * @param {(id:string)=>string|null}  resolveOnSitePath  returns on-site path if page exists, else null
 * @param {(id:string,onSitePath:string)=>boolean} resolveShardExists  true if shard file is on disk
 * @returns {Array<{id:string, onSitePath:string}>}
 */
export function findMissingSparkedShards(catalogEntries, resolveOnSitePath, resolveShardExists) {
  const out = [];
  for (const entry of catalogEntries) {
    if (!entry || !entry.id || entry.status !== 'SPARKED') continue;
    const onSitePath = resolveOnSitePath(entry.id);
    if (!onSitePath) continue; // no on-site page → not our concern
    if (!resolveShardExists(entry.id, onSitePath)) {
      out.push({ id: entry.id, onSitePath });
    }
  }
  return out;
}

// ── Self-test ────────────────────────────────────────────────────────────────────
if (selfTest) {
  let pass = 0, fail = 0;
  const ok = (c, l) => { if (c) pass++; else { fail++; console.error(`  ✗ ${l}`); } };

  const resolver = slug => (slug === 'mindframe' ? '/games/mindframe/' : null);
  const projects = [
    { slug: 'vaultsparkstudios-website', url: `${SITE}/` },          // on-site, skip
    { slug: 'call-of-doodie', url: `${SITE}/games/call-of-doodie/` }, // on-site, skip
    { slug: 'mindframe', url: 'https://usemindframe.com' },           // EXT + on-site page → flag
    { slug: 'veilos', url: 'https://veilos.io' },                     // EXT, no on-site page → ok
  ];
  const found = findIncoherent(projects, resolver);
  ok(found.length === 1, 'exactly one incoherence found');
  ok(found[0].slug === 'mindframe', 'mindframe flagged (ext url + on-site page)');
  ok(!found.some(f => f.slug === 'veilos'), 'veilos NOT flagged (genuinely external-only)');
  ok(!found.some(f => f.slug === 'call-of-doodie'), 'on-site project not flagged');

  // dead-shard detection
  const withShards = [
    { slug: 'a', llmsFull: `${SITE}/games/a/llms-full.txt` },   // exists
    { slug: 'b', llmsFull: `${SITE}/projects/b/llms-full.txt` }, // missing → dead
    { slug: 'c' },                                               // no shard advertised → skip
  ];
  const dead = findDeadShards(withShards, url => url.includes('/games/a/'));
  ok(dead.length === 1 && dead[0].slug === 'b', 'dead shard (advertised-but-missing) flagged');
  ok(!dead.some(d => d.slug === 'c'), 'no-shard entry not flagged');

  // missing SPARKED shard detection (CANON-048 blind-spot gate)
  const catalog = [
    { id: 'alpha', status: 'SPARKED' },   // SPARKED, on-site page exists, shard missing → flag
    { id: 'beta',  status: 'SPARKED' },   // SPARKED, on-site page exists, shard present → ok
    { id: 'gamma', status: 'FORGE' },     // FORGE, on-site page exists, shard missing → skip (not SPARKED)
    { id: 'delta', status: 'SPARKED' },   // SPARKED, NO on-site page → skip
  ];
  const resolvePage = id => (id === 'alpha' || id === 'beta' || id === 'gamma') ? `/games/${id}/` : null;
  const resolveShard = (id) => id === 'beta'; // only beta has a shard
  const missingSparked = findMissingSparkedShards(catalog, resolvePage, resolveShard);
  ok(missingSparked.length === 1, 'exactly one missing-sparked-shard found');
  ok(missingSparked[0].id === 'alpha', 'alpha flagged (SPARKED + on-site page + no shard)');
  ok(!missingSparked.some(m => m.id === 'beta'), 'beta NOT flagged (shard exists)');
  ok(!missingSparked.some(m => m.id === 'gamma'), 'gamma NOT flagged (FORGE, not SPARKED)');
  ok(!missingSparked.some(m => m.id === 'delta'), 'delta NOT flagged (no on-site page)');

  console.log(`check-agents-json-coherence --self-test: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

// ── Live scan ────────────────────────────────────────────────────────────────────
let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'agents.json'), 'utf8'));
} catch (e) {
  console.error(`check-agents-json-coherence: cannot read agents.json — ${e.message}`);
  process.exit(strict ? 1 : 0);
}

// Resolve on-site presence by real disk: a canonical page is games/<slug>/index.html
// or projects/<slug>/index.html. Slug may carry a `vaultspark-` prefix in the feed.
function onSiteResolver(slug) {
  const candidates = [slug, slug.replace(/^vaultspark-/, '')].filter(Boolean);
  for (const cat of ['games', 'projects']) {
    for (const candidate of candidates) {
      if (fs.existsSync(path.join(ROOT, cat, candidate, 'index.html'))) return `/${cat}/${candidate}/`;
    }
  }
  return null;
}

const shardExists = url => fs.existsSync(path.join(ROOT, url.replace(SITE + '/', '').replace(/\/$/, '')));
const projects = manifest.projects || [];
const findings = findIncoherent(projects, onSiteResolver);
const deadShards = findDeadShards(projects, shardExists);

// CANON-048: load catalog for SPARKED shard coverage check.
let catalogEntries = [];
try {
  const pi = JSON.parse(fs.readFileSync(path.join(ROOT, 'api/public-intelligence.json'), 'utf8'));
  catalogEntries = Object.values(pi.catalog || {});
} catch (_) {
  // public-intelligence.json may not exist in CI before first build; degrade gracefully.
}

const shardExistsForId = (id, onSitePath) => {
  const rel = onSitePath.replace(/^\//, '') + 'llms-full.txt';
  return fs.existsSync(path.join(ROOT, rel));
};
const missingSparked = findMissingSparkedShards(catalogEntries, onSiteResolver, shardExistsForId);

if (asJson) {
  console.log(JSON.stringify({ scanned: projects.length, findings, deadShards, missingSparked }, null, 2));
  process.exit(deadShards.length || missingSparked.length || (findings.length && strict) ? 1 : 0);
}

console.log(`check-agents-json-coherence: scanned ${projects.length} agents.json project(s), ${catalogEntries.length} catalog entries`);

// Dead shards = hard error (a 404 advertised to crawlers — not a judgment call).
if (deadShards.length) {
  console.error(`  ✗ ${deadShards.length} advertised llms-full shard(s) MISSING on disk (404 to crawlers):`);
  for (const d of deadShards) console.error(`      ${d.slug.padEnd(20)} ${d.llmsFull}`);
  console.error('  → regenerate the shard (build-llms-full-shards.mjs) or stop advertising it in build-agents-json.mjs.');
}

// CANON-048: SPARKED on-site pages must have a committed shard — AI discovery gap is a hard fail.
if (missingSparked.length) {
  console.error(`  ✗ ${missingSparked.length} SPARKED on-site page(s) MISSING llms-full.txt shard (AI discovery blind-spot):`);
  for (const m of missingSparked) console.error(`      ${m.id.padEnd(20)} on-site at ${m.onSitePath} — no shard committed`);
  console.error('  → run build-llms-full-shards.mjs (requires IGNIS session) or add shard manually, then commit.');
}

// On-site/external incoherence = advisory (founder/content decision).
if (findings.length) {
  console.log(`  ⚠ ${findings.length} entr(y/ies) point agents EXTERNAL while an on-site canonical page exists:`);
  for (const f of findings) {
    console.log(`      ${f.slug.padEnd(20)} url=${f.url}  ↔  on-site page at ${f.onSiteRoute}`);
  }
  console.log('  → decide canonical in build-agents-json.mjs: keep external (intended product home),');
  console.log('    OR route on-site AND generate the matching llms-full.txt shard (never advertise a dead shard).');
}

if (!deadShards.length && !missingSparked.length && !findings.length) {
  console.log('  ✓ no dead shards; no missing SPARKED shards; no external-url entries shadow an existing on-site canonical page');
}
process.exit(deadShards.length || missingSparked.length || (strict && findings.length) ? 1 : 0);
