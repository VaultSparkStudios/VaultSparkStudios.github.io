#!/usr/bin/env node
/* check-pages-deploy.mjs — S210 #3 post-push build verify (step 2 of 2)
 *
 * The problem: closeout-autopilot verifies that `git push` advanced origin/main.
 * But CF Pages builds on the TIP commit — if that tip is [skip ci] or the build
 * failed, production silently lags. No prior gate confirmed the live site served
 * the pushed SHA (S183/S184 class regression).
 *
 * This script:
 *   1. Reads the local HEAD SHA (what was just pushed)
 *   2. Fetches https://vaultsparkstudios-website.pages.dev/api/build-sha.json
 *      (the CF Pages origin — bypasses the bot-challenge on the prod domain)
 *   3. Compares — MATCH: build deployed; MISMATCH: writes context/.deploy-pending
 *      with the expected SHA and prints an advisory (non-blocking by default)
 *
 * Import-safe: side effects only when invoked directly.
 * Usage:
 *   node scripts/check-pages-deploy.mjs              # advisory (exit 0 always)
 *   node scripts/check-pages-deploy.mjs --strict     # exit 1 if mismatch
 *   node scripts/check-pages-deploy.mjs --self-test
 */
import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PENDING_PATH = join(ROOT, 'context', '.deploy-pending');
const PAGES_ORIGIN = 'https://vaultsparkstudios-website.pages.dev';
const BUILD_SHA_URL = `${PAGES_ORIGIN}/api/build-sha.json`;
const RUN_DIRECT = process.argv[1] &&
  process.argv[1].replace(/\\/g, '/').endsWith('check-pages-deploy.mjs');

function localSha() {
  try {
    return execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch (_) { return null; }
}

function selfTest() {
  let fail = 0;
  const assert = (c, m) => { if (!c) { console.error('  ✗ ' + m); fail++; } };
  // Just verify the module exports and the PAGES_ORIGIN constant are sane.
  assert(typeof localSha === 'function', 'localSha is a function');
  assert(PAGES_ORIGIN.startsWith('https://'), 'PAGES_ORIGIN is https');
  assert(BUILD_SHA_URL.endsWith('/api/build-sha.json'), 'BUILD_SHA_URL ends correctly');
  if (fail === 0) { console.log('✓ check-pages-deploy --self-test: 3/3 passed'); process.exit(0); }
  console.error('✗ check-pages-deploy --self-test: ' + fail + ' failed'); process.exit(1);
}

async function run(strict) {
  const head = localSha();
  if (!head) {
    console.warn('  ⚠ check-pages-deploy: could not determine local HEAD SHA');
    if (strict) process.exit(1);
    return;
  }

  let deployed = null;
  let deployedAt = null;
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(BUILD_SHA_URL, { signal: ctrl.signal });
    clearTimeout(tid);
    if (res.ok) {
      const j = await res.json();
      deployed = j.sha || null;
      deployedAt = j.builtAt || null;
    }
  } catch (_) {
    console.warn('  ⚠ check-pages-deploy: CF Pages origin unreachable — verify deployment manually');
    if (strict) process.exit(1);
    return;
  }

  if (!deployed) {
    console.warn('  ⚠ check-pages-deploy: api/build-sha.json not yet deployed — site may be on an older build');
    if (strict) process.exit(1);
    return;
  }

  if (deployed === head) {
    // Clear pending marker if one existed.
    if (existsSync(PENDING_PATH)) {
      try { require('node:fs').unlinkSync(PENDING_PATH); } catch (_) {}
    }
    console.log(`  ✓ check-pages-deploy: CF Pages serving ${head.slice(0, 8)} — matches HEAD`);
    return;
  }

  // Mismatch — CF Pages has not yet deployed the pushed SHA.
  const msg = `CF Pages origin: ${deployed.slice(0, 8)} · expected: ${head.slice(0, 8)}`;
  writeFileSync(PENDING_PATH, JSON.stringify({ expected: head, actual: deployed, checkedAt: new Date().toISOString() }), 'utf8');
  console.warn(`  ⚠ check-pages-deploy: build PENDING — ${msg}`);
  if (deployedAt) console.warn(`     Pages origin built at ${deployedAt}`);
  console.warn('     CF Pages usually deploys within 60-90s. Re-run to confirm.');
  if (strict) process.exit(1);
}

if (RUN_DIRECT) {
  if (process.argv.includes('--self-test')) selfTest();
  else run(process.argv.includes('--strict')).catch((e) => { console.error(e); process.exit(1); });
}
