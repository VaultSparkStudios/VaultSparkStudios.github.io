#!/usr/bin/env node
/**
 * Prevents deploy-parity evidence from silently collapsing back into a local
 * self-comparison. The production command must name the canonical public URL,
 * every parity producer must use the shared generic fingerprint parser, and
 * production callers may never pass --local.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const read = (file) => readFileSync(resolve(ROOT, file), 'utf8');

export function evaluateContract({ packageJson, deployCheck, stagingCheck, perfSampler }) {
  const pkg = JSON.parse(packageJson);
  const command = pkg.scripts?.['verify:deploy-parity'] || '';
  const findings = [];

  if (!/--base=https:\/\/vaultsparkstudios\.com\/?(?:\s|$)/.test(command)) {
    findings.push('verify:deploy-parity must probe the canonical production origin');
  }
  if (/\s--local(?:\s|$)/.test(command)) {
    findings.push('verify:deploy-parity must not use --local');
  }
  if (!deployCheck.includes("./lib/shell-parity.mjs")) {
    findings.push('deploy parity checker must use the shared shell parser');
  }
  if (!stagingCheck.includes("./lib/shell-parity.mjs")) {
    findings.push('staging parity checker must use the shared shell parser');
  }
  if (/check-deploy-parity\.mjs[^\n'\"]*--local/.test(perfSampler)) {
    findings.push('production performance sampling must not self-compare with --local');
  }
  return findings;
}

function fixtures() {
  const shared = "import './lib/shell-parity.mjs';";
  const goodPkg = JSON.stringify({ scripts: { 'verify:deploy-parity': 'node scripts/check-deploy-parity.mjs --base=https://vaultsparkstudios.com/' } });
  const cases = [
    ['healthy contract', evaluateContract({ packageJson: goodPkg, deployCheck: shared, stagingCheck: shared, perfSampler: 'verify:deploy-parity' }).length === 0],
    ['local production command rejected', evaluateContract({ packageJson: JSON.stringify({ scripts: { 'verify:deploy-parity': 'node scripts/check-deploy-parity.mjs --local' } }), deployCheck: shared, stagingCheck: shared, perfSampler: '' }).some((f) => f.includes('canonical'))],
    ['duplicated staging parser rejected', evaluateContract({ packageJson: goodPkg, deployCheck: shared, stagingCheck: 'const regex = /shell/;', perfSampler: '' }).some((f) => f.includes('staging'))],
    ['local perf preflight rejected', evaluateContract({ packageJson: goodPkg, deployCheck: shared, stagingCheck: shared, perfSampler: 'node scripts/check-deploy-parity.mjs --local' }).some((f) => f.includes('performance'))],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  console.log(`check-shell-parity-contract --self-test: ${cases.length - failed.length}/${cases.length}`);
  if (failed.length) process.exitCode = 1;
}

if (process.argv.includes('--self-test')) {
  fixtures();
} else {
  const findings = evaluateContract({
    packageJson: read('package.json'),
    deployCheck: read('scripts/check-deploy-parity.mjs'),
    stagingCheck: read('scripts/check-staging-parity.mjs'),
    perfSampler: read('scripts/sample-prod-perf.mjs'),
  });
  if (findings.length) {
    findings.forEach((finding) => console.error(`check-shell-parity-contract: ${finding}`));
    process.exitCode = 1;
  } else {
    console.log('check-shell-parity-contract: production evidence remains route-local, remote, and parser-shared');
  }
}
