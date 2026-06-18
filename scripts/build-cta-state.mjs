#!/usr/bin/env node
/* build-cta-state.mjs — S207 (audit dead-cta-rotation-loop)
 *
 * check-dead-ctas.mjs (S205) only FLAGS dead CTAs; nothing acts on them — the
 * play-next card sat at 18 shown / 0 clicks until the S207 audit looked. This
 * closes the loop: read api/dead-ctas.json and, for every CTA that has a variant
 * registry entry (data/cta-variants.json), pick an active variant index. A CTA
 * currently flagged dead advances to the NEXT variant so the copy self-heals
 * across deploys; a healthy CTA stays on variant 0 (its default). The client
 * (cross-game-play-next.js) reads the emitted data/cta-state.json and applies the
 * active copy, emitting cta:variant:<id>:<n> so rollup can attribute clicks.
 *
 * Deterministic: a CTA's active index is derived purely from how many distinct
 * "dead" deploy-cycles it has survived (persisted in the committed state file),
 * NOT wall-clock — so --check byte-comparison never drifts spuriously.
 *
 * Usage:
 *   node scripts/build-cta-state.mjs            # write data/cta-state.json
 *   node scripts/build-cta-state.mjs --check    # drift gate
 *   node scripts/build-cta-state.mjs --self-test
 *
 * Exit: 0 ok · 1 error/drift.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const VARIANTS = path.join(ROOT, 'data/cta-variants.json');
const DEAD = path.join(ROOT, 'api/dead-ctas.json');
const OUT = path.join(ROOT, 'data/cta-state.json');

const argv = process.argv.slice(2);
const SELF_TEST = argv.includes('--self-test');
const CHECK = argv.includes('--check');
const ADVANCE = argv.includes('--advance');

function readJson(p, fallback) {
  if (!existsSync(p)) return fallback;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return fallback; }
}

// Pure + DETERMINISTIC: activeVariant is a function of the committed deadCycles
// only — the default build never mutates deadCycles, so `build` and `--check`
// are idempotent (avoids the volatile-input --check drift trap). deadCycles
// advances ONLY on an explicit `--advance` run (a deliberate rotation, e.g. at
// closeout when a CTA is confirmed STILL dead after its last change) and only
// for CTAs currently flagged dead. Variant 0 is the current/default copy, so a
// just-changed CTA keeps its new copy until someone deliberately rotates it.
//   activeVariant = deadCycles % pool
function computeState(variantsDoc, deadIds, prior, advance) {
  const ctas = (variantsDoc && variantsDoc.ctas) || {};
  const priorState = (prior && prior.ctas) || {};
  const out = {};
  for (const id of Object.keys(ctas).sort()) {
    const variants = ctas[id].variants || [];
    const pool = variants.length || 1;
    const prevCycles = (priorState[id] && priorState[id].deadCycles) || 0;
    const isDead = deadIds.has(id);
    const deadCycles = (advance && isDead) ? prevCycles + 1 : prevCycles;
    const activeVariant = deadCycles % pool;
    // Denormalize the active copy so the client needs a single cached fetch
    // (no string duplication in JS, no drift — the registry stays the source).
    out[id] = { activeVariant, deadCycles, pool, activeCopy: variants[activeVariant] || '' };
  }
  return { schemaVersion: '1.0', ctas: out };
}

function deadIdSet(deadDoc) {
  const set = new Set();
  for (const d of (deadDoc && deadDoc.dead) || []) if (d && d.id) set.add(d.id);
  return set;
}

function serialize(obj) { return JSON.stringify(obj, null, 2) + '\n'; }

if (SELF_TEST) {
  let passed = 0;
  const assert = (ok, msg) => { if (!ok) { console.error('✗ ' + msg); process.exit(1); } console.log('  ✓ ' + msg); passed++; };
  const registry = { ctas: { 'play-next': { variants: ['a', 'b', 'c'] } } };

  // Default build is IDEMPOTENT — a dead CTA does NOT auto-advance (variant 0).
  const d0 = computeState(registry, new Set(['play-next']), null, false);
  assert(d0.ctas['play-next'].activeVariant === 0 && d0.ctas['play-next'].deadCycles === 0, 'dead CTA without --advance → variant 0 (idempotent)');

  // Re-running default build on its own output is a no-op (the --check drift trap avoided).
  const d0b = computeState(registry, new Set(['play-next']), d0, false);
  assert(d0b.ctas['play-next'].deadCycles === 0, 'default build is idempotent (no drift on re-run)');

  // --advance on a dead CTA rotates to variant 1.
  const a1 = computeState(registry, new Set(['play-next']), d0, true);
  assert(a1.ctas['play-next'].activeVariant === 1 && a1.ctas['play-next'].deadCycles === 1, '--advance on dead CTA → variant 1');

  // Another --advance → variant 2, then wraps to 0.
  const a2 = computeState(registry, new Set(['play-next']), a1, true);
  assert(a2.ctas['play-next'].activeVariant === 2, 'second --advance → variant 2');
  const a3 = computeState(registry, new Set(['play-next']), a2, true);
  assert(a3.ctas['play-next'].activeVariant === 0, 'third --advance wraps modulo pool size');

  // --advance on a HEALTHY CTA does not rotate (keeps its winning variant).
  const healthy = computeState(registry, new Set(), a2, true);
  assert(healthy.ctas['play-next'].activeVariant === 2 && healthy.ctas['play-next'].deadCycles === 2, 'recovered CTA keeps winning variant even on --advance');

  console.log(`\nbuild-cta-state self-test: ${passed} passing`);
  process.exit(0);
}

const state = computeState(readJson(VARIANTS, {}), deadIdSet(readJson(DEAD, {})), readJson(OUT, null), ADVANCE);
const serialized = serialize(state);

if (CHECK) {
  let committed = '';
  try { committed = readFileSync(OUT, 'utf8'); } catch {}
  if (committed !== serialized) {
    console.error('build-cta-state --check: data/cta-state.json drift; run node scripts/build-cta-state.mjs');
    process.exit(1);
  }
  const active = Object.entries(state.ctas).map(([k, v]) => `${k}=v${v.activeVariant}`).join(' ');
  console.log(`build-cta-state --check: ok (${active || 'no ctas'})`);
  process.exit(0);
}

writeFileSync(OUT, serialized);
const active = Object.entries(state.ctas).map(([k, v]) => `${k}=v${v.activeVariant}`).join(' ');
console.log(`build-cta-state → data/cta-state.json (${active || 'no ctas'})`);
