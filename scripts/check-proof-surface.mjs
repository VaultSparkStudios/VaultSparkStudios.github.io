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
 * self-test+live (no bundled proof feed is a hand-seed).
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
console.log('check-proof-surface ✓ security posture + proof-feed provenance verified');
