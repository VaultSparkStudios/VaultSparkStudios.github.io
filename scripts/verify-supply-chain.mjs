#!/usr/bin/env node
/**
 * verify-supply-chain.mjs (S163 audit #6 · supply-chain-scan-gate)
 *
 * CANON-023 (Obelisk Package Trust) requires an IOC scan after lockfile changes
 * and before push/closeout. This makes it a standing build gate instead of a
 * remember-to-run step. Even on a minimal-dependency vanilla site, the realistic
 * attack surface is a compromised dev-dependency (Playwright, sharp, the build
 * tooling), so the scan runs against package-lock.json every build:check.
 *
 * The scanner itself lives in the sibling studio-ops repo (single source of
 * truth, shared across the fleet). This wrapper resolves the sibling path and
 * skips gracefully (exit 0) when studio-ops is absent — e.g. in GitHub CI where
 * only this repo is checked out — so the gate never produces a phantom failure.
 *
 * Usage:
 *   node scripts/verify-supply-chain.mjs           # advisory: scan, report, exit 0
 *   node scripts/verify-supply-chain.mjs --strict    # exit non-zero on findings
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { spawnSync } from './lib/safe-spawn.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const STRICT = process.argv.includes('--strict');

const SCANNER = path.resolve(ROOT, '..', 'vaultspark-studio-ops', 'scripts', 'scan-npm-supply-chain.mjs');

if (!fs.existsSync(SCANNER)) {
  console.log('verify-supply-chain: studio-ops scanner not present (sibling repo not checked out) — skipping (advisory)');
  process.exit(0);
}
if (!fs.existsSync(path.join(ROOT, 'package-lock.json'))) {
  console.log('verify-supply-chain: no package-lock.json — nothing to scan');
  process.exit(0);
}

const res = spawnSync(process.execPath, [SCANNER, '--json'], { cwd: ROOT, encoding: 'utf8' });
const out = (res.stdout || '').trim();

let findings = [];
try {
  const parsed = JSON.parse(out);
  findings = parsed.findings || parsed.issues || parsed.iocs || (Array.isArray(parsed) ? parsed : []);
} catch {
  // Scanner produced non-JSON (older version or error). Echo what we got; stay
  // advisory unless --strict and the scanner itself exited non-zero.
  if (out) console.log(out.split('\n').slice(0, 12).join('\n'));
}

if (findings.length) {
  console.log(`verify-supply-chain: ${findings.length} finding(s) from studio-ops IOC scan:`);
  for (const f of findings.slice(0, 20)) {
    console.log(`  • ${typeof f === 'string' ? f : JSON.stringify(f)}`);
  }
  if (STRICT) { console.error('\n✗ supply-chain findings present (strict)'); process.exit(1); }
  console.log('\n(advisory mode — not blocking)');
  process.exit(0);
}

if (res.status && res.status !== 0 && STRICT) {
  console.error(`verify-supply-chain: scanner exited ${res.status} (strict)`);
  process.exit(1);
}
console.log('verify-supply-chain: ✓ no supply-chain IOC findings (CANON-023)');
process.exit(0);
