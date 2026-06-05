#!/usr/bin/env node
/**
 * Service-worker shell coherency gate.
 *
 * Ensures the shell hashes listed as authoritative are also the shell hashes
 * the install step precaches. This catches stale STATIC_ASSETS entries that can
 * keep old ambient/style shells alive in cold-cache field sessions.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SW = path.join(ROOT, 'sw.js');
const args = process.argv.slice(2);
const SELF_TEST = args.includes('--self-test');

function parseArray(source, name) {
  const match = source.match(new RegExp(`const\\s+${name}\\s*=\\s*\\[([\\s\\S]*?)\\];`));
  if (!match) return [];
  return [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

function shellKind(asset) {
  const match = asset.match(/\/assets\/(style|theme-toggle|nav-toggle|shell-health|ambient)\.shell-[a-f0-9]{10}\.(?:css|js)$/);
  return match ? match[1] : null;
}

export function inspectSwShellCoherency(source) {
  const fingerprinted = parseArray(source, 'FINGERPRINTED_SHELL_ASSETS');
  const staticAssets = parseArray(source, 'STATIC_ASSETS');
  const expectedByKind = new Map(fingerprinted.map((asset) => [shellKind(asset), asset]).filter(([kind]) => kind));
  const staticShells = staticAssets.map((asset) => ({ asset, kind: shellKind(asset) })).filter((row) => row.kind);
  const violations = [];
  for (const { asset, kind } of staticShells) {
    const expected = expectedByKind.get(kind);
    if (expected && asset !== expected) {
      violations.push(`${kind}: STATIC_ASSETS has ${asset}, expected ${expected}`);
    }
  }
  for (const [kind, expected] of expectedByKind) {
    if (!staticShells.some((row) => row.asset === expected)) {
      violations.push(`${kind}: STATIC_ASSETS missing ${expected}`);
    }
  }
  return { ok: violations.length === 0, fingerprinted, staticShells: staticShells.map((r) => r.asset), violations };
}

if (SELF_TEST) {
  const good = "const FINGERPRINTED_SHELL_ASSETS = ['/assets/ambient.shell-aaaaaaaaaa.js']; const STATIC_ASSETS = ['/assets/ambient.shell-aaaaaaaaaa.js'];";
  const bad = "const FINGERPRINTED_SHELL_ASSETS = ['/assets/ambient.shell-aaaaaaaaaa.js']; const STATIC_ASSETS = ['/assets/ambient.shell-bbbbbbbbbb.js'];";
  const cases = [
    ['matching shells pass', inspectSwShellCoherency(good).ok],
    ['stale shell fails', !inspectSwShellCoherency(bad).ok],
  ];
  let failed = 0;
  for (const [name, ok] of cases) {
    console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
    if (!ok) failed += 1;
  }
  console.log(`\nself-test: ${cases.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

const result = inspectSwShellCoherency(fs.readFileSync(SW, 'utf8'));
if (!result.ok) {
  console.error('check-sw-shell-coherency: FAIL');
  for (const violation of result.violations) console.error(`- ${violation}`);
  process.exit(1);
}
console.log(`check-sw-shell-coherency: OK (${result.fingerprinted.length} fingerprinted shell asset(s))`);
