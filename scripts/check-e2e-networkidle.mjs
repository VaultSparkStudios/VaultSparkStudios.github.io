#!/usr/bin/env node
/**
 * check-e2e-networkidle.mjs — S224 second-order innovation
 *
 * THE CLASS IT PREVENTS: pages with persistent RUM beacon traffic (/oracle/,
 * /, /games/*) never reach networkidle, causing silent 30s timeouts in E2E CI.
 * This class caused 14/14 VR desktop timeouts in S223 (fixed in visual-regression
 * spec to use 'load') and multiple E2E failures (fixed S224, 10 files).
 *
 * WHAT IT SCANS: test spec files for waitUntil: 'networkidle' or
 * waitForLoadState('networkidle') — patterns that reliably flake on any page
 * with background polling. Auth-gated test helpers are exempt (they need
 * networkidle for Supabase session re-establishment).
 *
 * Modes:
 *   (no flag)   report and exit 0/1
 *   --check     gate mode (exit 1 on violation)
 *   --self-test run inline assertions
 *
 * Wired into: smoke-startup-scripts.mjs (advisory, non-blocking build:check)
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TESTS_DIR = join(ROOT, 'tests');
const CHECK = process.argv.includes('--check');
const SELF_TEST = process.argv.includes('--self-test');

// Auth-gated helper files where networkidle is intentional: Supabase auth calls
// complete asynchronously and must settle before proceeding. These files are
// only exercised in CI when explicit Vault credentials are configured.
const EXEMPT_FILES = new Set([
  'authenticated.spec.js',
  'vaultAuth.js',
]);

// Patterns that indicate networkidle usage in test code (not comments)
const NETWORKIDLE_PATTERNS = [
  /waitUntil:\s*['"]networkidle['"]/,
  /waitForLoadState\(['"]networkidle['"]\)/,
];

export function scanFile(src) {
  const lines = src.split('\n');
  const violations = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comment lines
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
    for (const pat of NETWORKIDLE_PATTERNS) {
      if (pat.test(line)) {
        violations.push({ line: i + 1, text: line.trim().slice(0, 100) });
        break;
      }
    }
  }
  return violations;
}

function runSelfTest() {
  const assert = (cond, msg) => { if (!cond) { console.error('✗ ' + msg); process.exit(1); } };

  // Should flag networkidle in goto
  assert(
    scanFile("await page.goto('/', { waitUntil: 'networkidle' });").length === 1,
    'flags waitUntil: networkidle in goto',
  );
  // Should flag waitForLoadState
  assert(
    scanFile("await page.waitForLoadState('networkidle');").length === 1,
    'flags waitForLoadState(networkidle)',
  );
  // Should NOT flag domcontentloaded
  assert(
    scanFile("await page.goto('/', { waitUntil: 'domcontentloaded' });").length === 0,
    'ignores domcontentloaded',
  );
  // Should NOT flag a comment line
  assert(
    scanFile("// Use 'load' not 'networkidle' — pages have background beacon traffic").length === 0,
    'ignores comment lines containing networkidle',
  );
  // Should NOT flag load
  assert(
    scanFile("await page.goto('/', { waitUntil: 'load' });").length === 0,
    'ignores load',
  );

  console.log('✓ check-e2e-networkidle --self-test: 5/5 passed');
  process.exit(0);
}

function main() {
  if (!existsSync(TESTS_DIR)) {
    console.log('check-e2e-networkidle: tests/ not found — skip');
    return;
  }

  const specFiles = readdirSync(TESTS_DIR, { withFileTypes: true })
    .flatMap(entry => {
      if (entry.isDirectory()) {
        const sub = join(TESTS_DIR, entry.name);
        return readdirSync(sub).map(f => join(sub, f));
      }
      return [join(TESTS_DIR, entry.name)];
    })
    .filter(f => f.endsWith('.js') && !f.endsWith('.bundle.js'));

  let totalViolations = 0;
  const findings = [];

  for (const filePath of specFiles) {
    const file = basename(filePath);
    if (EXEMPT_FILES.has(file)) continue;
    const violations = scanFile(readFileSync(filePath, 'utf8'));
    if (violations.length) {
      findings.push({ file, violations });
      totalViolations += violations.length;
    }
  }

  if (totalViolations === 0) {
    console.log(`✓ check-e2e-networkidle: ${specFiles.length - EXEMPT_FILES.size} test files — no networkidle patterns (${EXEMPT_FILES.size} auth files exempt)`);
    return;
  }

  console.error(`✗ check-e2e-networkidle: ${totalViolations} networkidle pattern(s) found in E2E tests (will cause 30s timeouts on beacon-heavy pages):`);
  for (const { file, violations } of findings) {
    for (const v of violations) {
      console.error(`  ${file}:${v.line}  ${v.text}`);
    }
  }
  console.error("  Fix: change to waitUntil: 'load' + a waitForSelector for the element you need.");
  console.error("  For auth flows needing networkidle, add the file to EXEMPT_FILES in this script.");

  if (CHECK) process.exit(1);
}

const isDirect = process.argv[1] && join(dirname(fileURLToPath(import.meta.url)), basename(process.argv[1])) ===
  join(dirname(fileURLToPath(import.meta.url)), 'check-e2e-networkidle.mjs');
if (isDirect || process.argv[1]?.endsWith('check-e2e-networkidle.mjs')) {
  if (SELF_TEST) runSelfTest();
  else main();
}
