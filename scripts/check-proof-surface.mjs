#!/usr/bin/env node
/**
 * check-proof-surface.mjs (S192)
 *
 * Single orchestrator for the S192 proof-surface honesty gates, kept as ONE
 * build:check entry on purpose: build:check is invoked by npm through cmd.exe on
 * Windows, which caps the command line at 8191 chars — the chain was already at
 * the edge, so four more `&&` segments overflowed it locally (CI on bash is
 * unaffected). Collapsing them here keeps the gate intact without lengthening the
 * npm script. Each sub-check runs in its own process; any non-zero fails the gate.
 *
 * Runs (in order): build-public-status self-test+check · build-security-posture
 * self-test+check · build-status-proof --check · check-proof-feed-generators
 * self-test+live (no bundled proof feed is a hand-seed) · check-og-images
 * self-test+live (S194 — no crawler-facing share card is a blank SVG/missing PNG).
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

// Ordering preserved from the prior inline build:check chain: derive/verify the
// posture feeds first, then the manifest that bundles them, then the gate that
// proves none of them is a hand-seed.
const STEPS = [
  ['build-public-status.mjs', ['--self-test']],
  ['build-public-status.mjs', ['--check']],
  ['build-security-posture.mjs', ['--self-test']],
  ['build-security-posture.mjs', ['--check']],
  ['build-status-proof.mjs', ['--check']],
  ['check-proof-feed-generators.mjs', ['--self-test']],
  ['check-proof-feed-generators.mjs', []],
  // S194: social-card integrity — an SVG/_og or missing-asset og:image renders a
  // blank share card on every platform, a silent conversion leak on shared links.
  ['check-og-images.mjs', ['--self-test']],
  ['check-og-images.mjs', []],
  // S196: per-title share cards — the generator that rasterizes the OG SVG to real
  // PNGs (via sharp) for every page still on a generic card. Its --self-test guards
  // the slug/generic-detection/raster logic so the bespoke-card pipeline can't drift.
  ['build-og-cards.mjs', ['--self-test']],
  // S196: collection structured-data — the journal/archive/dispatches/changelog listing
  // pages must carry CollectionPage schema (journal+archive enumerate every post). The
  // --check fails if a new journal post isn't reflected in the ItemList (drift guard).
  ['inject-collection-jsonld.mjs', ['--self-test']],
  ['inject-collection-jsonld.mjs', ['--check']],
  // S194: schema honesty — no VideoGame page may carry a fabricated aggregateRating
  // (S193 removed three; this keeps invented review stars from silently returning).
  ['check-videogame-schema.mjs', ['--self-test']],
  ['check-videogame-schema.mjs', []],
  // S197: SPARKED↔playable coherence — a live game's page must not contradict its
  // own status with a stale "Demo Coming Soon" / [GAME_EMBED_URL] placeholder, and
  // must expose a real play link. Closes the self-contradicting-surface class on
  // the studio's prime conversion surface without lengthening the build:check chain.
  ['check-game-playability-coherence.mjs', ['--self-test']],
  ['check-game-playability-coherence.mjs', []],
  // S195: structured-data coverage — every indexable public page must carry a
  // BreadcrumbList so breadcrumb rich-results never silently regress (folded into
  // this orchestrator rather than extending the cmd.exe-bounded build:check chain).
  ['inject-breadcrumb-jsonld.mjs', ['--check']],
  // S198: oracle velocity series — public git-derived cadence feed must be
  // non-empty and schema-valid so the oracle chart never silently shows empty.
  ['build-velocity-series.mjs', ['--self-test']],
  ['build-velocity-series.mjs', ['--check']],
  // S199: game-registry coherence — nav and index HTML must reflect the registry;
  // derive scripts fail --check when any page's games nav is out of sync or any
  // card's data-status drifts from the canonical game-registry.json entry.
  ['derive-game-nav.mjs', ['--self-test']],
  ['derive-game-nav.mjs', ['--check']],
  ['derive-game-index.mjs', ['--self-test']],
  ['derive-game-index.mjs', ['--check']],
  // S199: stale shell cleanup — guard that no unreferenced *.shell-*.js asset
  // accumulates; exits 1 if stale files are found (run --apply to clean).
  ['clean-stale-shells.mjs', ['--check']],
  // S205: vault momentum — rolling score from 3 public feeds; gating ensures
  // api/vault-momentum.json stays in sync with source feeds at build time.
  ['build-vault-momentum.mjs', ['--self-test']],
  ['build-vault-momentum.mjs', ['--check']],
];

let failed = 0;
for (const [script, args] of STEPS) {
  const r = spawnSync(process.execPath, [path.join(__dirname, script), ...args], { stdio: 'inherit' });
  if (r.status !== 0) { failed++; break; }
}
if (failed) {
  console.error('check-proof-surface: a proof-surface honesty gate failed (see above).');
  process.exit(1);
}

// S205: mission-coherence advisory — WARN only (does not fail the build gate),
// but surfaces retired framing before it reaches prod. Exit 1 → advisory printed
// above; this outer check never propagates the non-zero status.
const mc = spawnSync(process.execPath, [path.join(__dirname, 'check-mission-statement-coherence.mjs')], { stdio: 'inherit' });
if (mc.status !== 0) {
  console.warn('  ⚠  check-mission-statement-coherence: retired framing detected (advisory — see above)');
}

// S205: dead-CTA advisory — verifies api/dead-ctas.json is in sync with funnel-summary.
// Non-fatal: dead CTAs are an attention signal, not a build blocker.
const dc = spawnSync(process.execPath, [path.join(__dirname, 'check-dead-ctas.mjs'), '--check'], { stdio: 'inherit' });
if (dc.status !== 0) {
  console.warn('  ⚠  check-dead-ctas: dead-ctas.json drift (run node scripts/check-dead-ctas.mjs)');
}

// S206: public-note freshness — ERROR on session codes or dev jargon in visitor-facing
// PROJECT_STATUS fields (publicNote, publicNextStep). Advisory only.
const pn = spawnSync(process.execPath, [path.join(__dirname, 'check-public-note-freshness.mjs')], { stdio: 'inherit' });
if (pn.status !== 0) {
  console.warn('  ⚠  check-public-note-freshness: dev jargon in public copy (update context/PROJECT_STATUS.json)');
}

console.log('check-proof-surface ✓ security posture + proof-feed provenance verified');
