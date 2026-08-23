// build-order.mjs (S186 · closeout-build-order-module)
//
// Canonical ordering for the derived-on-derived artifact rebuild that runs after
// contract regeneration (closeout-autopilot step 3d.7 + any other refresher).
//
// Why a module: the ordering is load-bearing. Each step reads outputs the prior
// step writes, so a careless reorder silently produces stale derived feeds that
// only surface as a `build:check --check` drift failure later. Extracting it into
// ONE importable source of truth (with a self-test that asserts the dependency
// invariants) makes the ordering a contract instead of an inline convention.
//
// Import-safe: spawning happens only inside runDerivedBuilds(); the self-test is
// gated on direct invocation so importing this file fires no side effects.

import { spawnSync } from './safe-spawn.mjs';
import fs from 'node:fs';
import path from 'node:path';

// ORDER MATTERS — do not reorder without updating the invariants in selfTest().
//   oracle sanitizer  → writes ignis/output/ecosystem-state.json
//   shards            → READ ecosystem-state.json (must come after oracle)
//   ambient ledger    → structural ledger of ambient sources
//   nervous-system    → reads api/ outputs refreshed above
//   ignis search idx  → indexes content refreshed above
//   analytics summary → reads RUM/event data
//   intelligence budget → reads the api/ surfaces refreshed above
//   agents manifest → reads refreshed public intelligence and shards
//   AI discovery health → validates the refreshed agent surface
//   candidate manifest → seals every critical artifact after all prior mutations
//   release/status       → consume the new seal; neither is a Merkle leaf
//   stats surface        → reads refreshed analytics, public status, and status proof
//   citation             → consumes the final status proof chain (last)
export const DERIVED_BUILD_ORDER = [
  { script: 'sanitize-public-oracle-feed.mjs', timeout: 30000, why: 'writes ecosystem-state.json (source for shards)' },
  { script: 'build-llms-full-shards.mjs',      timeout: 60000, why: 'reads ecosystem-state.json' },
  { script: 'build-ambient-ledger.mjs',        timeout: 30000, why: 'ambient source ledger' },
  { script: 'build-nervous-system.mjs',        timeout: 30000, why: 'reads api/ outputs refreshed above' },
  { script: 'build-ignis-search-index.mjs',    timeout: 30000, why: 'indexes content refreshed above' },
  { script: 'build-analytics-summary.mjs',     timeout: 30000, why: 'reads RUM/event data' },
  { script: 'build-intelligence-budget.mjs',   timeout: 30000, why: 'reads api/ surfaces refreshed above' },
  { script: 'build-newsroom-run.mjs',          timeout: 30000, why: 'derives scheduler evidence before public proof surfaces' },
  { script: 'build-agents-json.mjs',           timeout: 30000, why: 'reads refreshed public intelligence and discovery shards' },
  { script: 'build-ai-discovery-health.mjs',   timeout: 30000, why: 'validates the refreshed agent discovery surface' },
  { script: 'build-candidate-artifact-manifest.mjs', timeout: 30000, why: 'seals critical artifacts after every leaf mutation' },
  { script: 'build-release-proof.mjs',       timeout: 30000, why: 'consumes the refreshed candidate seal' },
  { script: 'build-status-proof.mjs',        timeout: 30000, why: 'consumes refreshed release and staging proof' },
  { script: 'build-stats-surface.mjs',       timeout: 30000, why: 'consumes refreshed analytics, public status, and status proof' },
  { script: 'build-citation.mjs',            timeout: 30000, why: 'consumes the final release and status proof chain (last)' },
];

// Run the derived builds in canonical order. Non-fatal: a single step that exits
// nonzero warns and continues (matches the prior step-3d.7 behavior — the
// downstream build:check is the real gate). Returns a per-step result array.
export function runDerivedBuilds({ root, dry = false, log = console } = {}) {
  if (!root) throw new Error('runDerivedBuilds: root is required');
  const results = [];
  for (const step of DERIVED_BUILD_ORDER) {
    const abs = path.join(root, 'scripts', step.script);
    if (!fs.existsSync(abs)) { results.push({ script: step.script, status: 'missing' }); continue; }
    if (dry) { log.log?.(`(dry-run) would run: ${step.script}`); results.push({ script: step.script, status: 'dry' }); continue; }
    const r = spawnSync(process.execPath, [abs], { cwd: root, encoding: 'utf8', stdio: 'inherit', timeout: step.timeout });
    if (r.status !== 0) log.warn?.(`⚠ ${step.script} exited nonzero; continuing.`);
    results.push({ script: step.script, status: r.status === 0 ? 'ok' : 'warn' });
  }
  return results;
}

function selfTest() {
  const names = DERIVED_BUILD_ORDER.map((s) => s.script);
  const idx = (n) => names.indexOf(n);
  const asserts = [
    ['oracle before shards', idx('sanitize-public-oracle-feed.mjs') < idx('build-llms-full-shards.mjs')],
    ['intelligence-budget before candidate seal', idx('build-intelligence-budget.mjs') < idx('build-candidate-artifact-manifest.mjs')],
    ['newsroom receipt before status proof', idx('build-newsroom-run.mjs') < idx('build-status-proof.mjs')],
    ['agents before AI discovery health', idx('build-agents-json.mjs') < idx('build-ai-discovery-health.mjs')],
    ['AI discovery health before candidate seal', idx('build-ai-discovery-health.mjs') < idx('build-candidate-artifact-manifest.mjs')],
    ['candidate before release proof', idx('build-candidate-artifact-manifest.mjs') < idx('build-release-proof.mjs')],
    ['release before status proof', idx('build-release-proof.mjs') < idx('build-status-proof.mjs')],
    ['analytics before stats surface', idx('build-analytics-summary.mjs') < idx('build-stats-surface.mjs')],
    ['status before stats surface', idx('build-status-proof.mjs') < idx('build-stats-surface.mjs')],
    ['stats surface before citation', idx('build-stats-surface.mjs') < idx('build-citation.mjs')],
    ['status before citation', idx('build-status-proof.mjs') < idx('build-citation.mjs')],
    ['citation is last', idx('build-citation.mjs') === names.length - 1],
    ['no duplicate steps', new Set(names).size === names.length],
    ['every step has a why', DERIVED_BUILD_ORDER.every((s) => s.why && s.why.length > 4)],
    ['every step has a positive timeout', DERIVED_BUILD_ORDER.every((s) => s.timeout > 0)],
  ];
  let pass = 0;
  for (const [label, ok] of asserts) { console.log(`${ok ? '✓' : '✗'} ${label}`); if (ok) pass++; }
  const all = pass === asserts.length;
  console.log(`build-order self-test: ${pass}/${asserts.length} ${all ? 'passed' : 'FAILED'}`);
  process.exit(all ? 0 : 1);
}

const RUN_DIRECT = import.meta.main ?? process.argv[1]?.endsWith('build-order.mjs');
if (RUN_DIRECT && process.argv.includes('--self-test')) selfTest();
