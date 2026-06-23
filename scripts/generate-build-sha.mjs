#!/usr/bin/env node
/* generate-build-sha.mjs — S210 #3 post-push build verify (step 1 of 2)
 *
 * Emits api/build-sha.json with the current HEAD SHA so check-pages-deploy.mjs
 * can compare what CF Pages actually deployed to what was pushed.
 *
 * Runs as the LAST step of `npm run build` so the SHA reflects the commit
 * that will be pushed — not a stale build from a prior session.
 *
 * Import-safe: side effects only when invoked directly.
 * Usage:
 *   node scripts/generate-build-sha.mjs           # emit api/build-sha.json
 *   node scripts/generate-build-sha.mjs --check   # exit 1 if file missing/stale
 */
import { execSync } from './lib/safe-spawn.mjs';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'api', 'build-sha.json');
const RUN_DIRECT = process.argv[1] &&
  process.argv[1].replace(/\\/g, '/').endsWith('generate-build-sha.mjs');

export function getBuildSha() {
  try {
    return execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch (_) { return 'unknown'; }
}

export function generate() {
  const sha = getBuildSha();
  const now = new Date();
  const payload = JSON.stringify({ schemaVersion: '1.0', generatedAt: now.toISOString().slice(0, 10), sha, builtAt: now.toISOString() }, null, 2);
  writeFileSync(OUT, payload, 'utf8');
  console.log(`✓ api/build-sha.json — ${sha.slice(0, 8)}`);
}

export function check() {
  if (!existsSync(OUT)) {
    console.error('✗ generate-build-sha --check: api/build-sha.json missing — run npm run build');
    process.exit(1);
  }
  const current = getBuildSha();
  const stored = JSON.parse(readFileSync(OUT, 'utf8')).sha;
  if (stored !== current) {
    console.error(`✗ generate-build-sha --check: stored SHA ${stored.slice(0, 8)} ≠ HEAD ${current.slice(0, 8)} — run npm run build`);
    process.exit(1);
  }
  console.log(`✓ generate-build-sha --check: ok (${current.slice(0, 8)})`);
}

if (RUN_DIRECT) {
  if (process.argv.includes('--check')) check();
  else generate();
}
