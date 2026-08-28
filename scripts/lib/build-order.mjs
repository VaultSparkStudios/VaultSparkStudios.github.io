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

export const REFRESH_LIVE_DATA_ORDER = [
  { script: 'generate-public-intelligence.mjs', timeout: 30000, why: 'refreshes the portfolio source snapshot' },
  { script: 'build-public-status.mjs', timeout: 30000, why: 'projects public intelligence into public status' },
  { script: 'build-commit-map.mjs', timeout: 30000, why: 'refreshes git-history activity' },
  { script: 'build-proof-aware-projects.mjs', timeout: 30000, why: 'binds playable recommendations to the refreshed commit map' },
  { script: 'build-changelog-narrative.mjs', timeout: 30000, why: 'consumes the refreshed commit map' },
  { script: 'build-ship-receipts.mjs', timeout: 30000, why: 'refreshes shipped evidence' },
  { script: 'build-you-asked-shipped.mjs', timeout: 30000, why: 'renders the refreshed ship receipts' },
  { script: 'build-ignis-search-index.mjs', timeout: 30000, why: 'indexes refreshed public content' },
  { script: 'build-oracle-query-clusters.mjs', timeout: 30000, why: 'projects refreshed search evidence' },
  { script: 'build-intelligence-budget.mjs', timeout: 30000, why: 'summarizes refreshed intelligence surfaces' },
  { script: 'build-news-desk.mjs', args: ['--rebuild'], timeout: 30000, why: 'rebuilds the canonical Desk feed before its rendered consumers' },
  { script: 'build-news-desk-stats.mjs', timeout: 30000, why: 'refreshes Desk statistics from the canonical corpus' },
  { script: 'build-news-desk-engagement.mjs', timeout: 30000, why: 'projects committed engagement history without a network probe' },
  { script: 'build-news-desk-reactions.mjs', timeout: 30000, why: 'projects committed reaction history without a network probe' },
  { script: 'build-news-freshness.mjs', timeout: 30000, why: 'refreshes the Desk cadence contract' },
  { script: 'generate-news-pages.mjs', timeout: 30000, why: 'renders current Desk feeds into public story pages' },
  { script: 'build-news-visual-receipts.mjs', timeout: 30000, why: 'binds story pages and reviewed art to committed visual evidence' },
  { script: 'build-security-posture.mjs', timeout: 30000, why: 'refreshes the public security evidence leaf' },
  { script: 'build-worker-route-history.mjs', timeout: 30000, why: 'projects committed route history into public status evidence' },
  { script: 'build-deploy-currency.mjs', timeout: 30000, why: 'refreshes deploy-currency evidence before release proof' },
  { script: 'build-newsroom-run.mjs', timeout: 30000, why: 'refreshes newsroom scheduler evidence before release proof' },
  { script: 'check-cta-readiness.mjs', timeout: 30000, why: 'regenerates byte-checked CTA readiness from refreshed funnel inputs' },
  { script: 'build-attention-pressure.mjs', timeout: 30000, why: 'regenerates the privacy-thresholded attention receipt before status proof' },
  { script: 'build-home-desk-module.mjs', timeout: 30000, why: 'renders current Desk feeds into the homepage' },
  { script: 'build-candidate-artifact-manifest.mjs', timeout: 30000, why: 'seals refreshed critical bytes' },
  { script: 'build-release-proof.mjs', timeout: 30000, why: 'consumes the refreshed candidate seal' },
  { script: 'build-status-proof.mjs', timeout: 30000, why: 'consumes release and public status evidence' },
  { script: 'build-stats-surface.mjs', timeout: 30000, why: 'projects refreshed public statistics' },
  { script: 'build-intent-map.mjs', timeout: 30000, why: 'refreshes agent intent routing' },
  { script: 'build-citation.mjs', timeout: 30000, why: 'closes the refreshed evidence chain' },
];

export const DERIVED_BUILD_PROFILES = Object.freeze({
  full: DERIVED_BUILD_ORDER,
  'refresh-live-data': REFRESH_LIVE_DATA_ORDER,
});

// Run the derived builds in canonical order. Non-fatal: a single step that exits
// nonzero warns and continues (matches the prior step-3d.7 behavior — the
// downstream build:check is the real gate). Returns a per-step result array.
export function runDerivedBuilds({ root, dry = false, log = console, profile = 'full' } = {}) {
  if (!root) throw new Error('runDerivedBuilds: root is required');
  const order = DERIVED_BUILD_PROFILES[profile];
  if (!order) throw new Error('runDerivedBuilds: unknown profile ' + profile);
  const results = [];
  for (const step of order) {
    const abs = path.join(root, 'scripts', step.script);
    if (!fs.existsSync(abs)) { results.push({ script: step.script, status: 'missing' }); continue; }
    const args = Array.isArray(step.args) ? step.args : [];
    if (dry) { log.log?.(`(dry-run) would run: ${step.script}${args.length ? ` ${args.join(' ')}` : ''}`); results.push({ script: step.script, status: 'dry' }); continue; }
    const r = spawnSync(process.execPath, [abs, ...args], { cwd: root, encoding: 'utf8', stdio: 'inherit', timeout: step.timeout });
    if (r.status !== 0) log.warn?.(`⚠ ${step.script} exited nonzero; continuing.`);
    results.push({ script: step.script, status: r.status === 0 ? 'ok' : 'warn' });
  }
  return results;
}

function selfTest() {
  const names = DERIVED_BUILD_ORDER.map((s) => s.script);
  const refresh = REFRESH_LIVE_DATA_ORDER.map((s) => s.script);
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
    ['every declared step argument list is an array', [...DERIVED_BUILD_ORDER, ...REFRESH_LIVE_DATA_ORDER].every((s) => s.args === undefined || Array.isArray(s.args))],
    ['refresh producer precedes changelog consumer', refresh.indexOf('build-commit-map.mjs') < refresh.indexOf('build-changelog-narrative.mjs')],
    ['refresh commit map precedes proof-aware recommendations', refresh.indexOf('build-commit-map.mjs') < refresh.indexOf('build-proof-aware-projects.mjs')],
    ['refresh ship receipts precede rendered consumer', refresh.indexOf('build-ship-receipts.mjs') < refresh.indexOf('build-you-asked-shipped.mjs')],
    ['refresh news receipts follow page rendering', refresh.indexOf('generate-news-pages.mjs') < refresh.indexOf('build-news-visual-receipts.mjs')],
    ['refresh Desk producer declares rebuild mode', REFRESH_LIVE_DATA_ORDER.find((s) => s.script === 'build-news-desk.mjs')?.args?.includes('--rebuild') === true],
    ['refresh attention receipt precedes status proof', refresh.indexOf('build-attention-pressure.mjs') < refresh.indexOf('build-status-proof.mjs')],
    ['refresh seal follows all rendered sources', refresh.indexOf('build-home-desk-module.mjs') < refresh.indexOf('build-candidate-artifact-manifest.mjs')],
    ['refresh profile excludes shell rotation', !refresh.includes('build-shell-assets.mjs')],
    ['refresh profile has no duplicate steps', new Set(refresh).size === refresh.length],
  ];
  let pass = 0;
  for (const [label, ok] of asserts) { console.log(`${ok ? '✓' : '✗'} ${label}`); if (ok) pass++; }
  const all = pass === asserts.length;
  console.log(`build-order self-test: ${pass}/${asserts.length} ${all ? 'passed' : 'FAILED'}`);
  process.exit(all ? 0 : 1);
}

const RUN_DIRECT = import.meta.main ?? process.argv[1]?.endsWith('build-order.mjs');
if (RUN_DIRECT && process.argv.includes('--self-test')) selfTest();
