#!/usr/bin/env node
/** Stamp PROJECT_STATUS test truth from the measured build-check receipt. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyBuildCheckEvidence, runBuildCheckEvidenceSelfTest } from './lib/build-check-evidence.mjs';
import { writeJsonAtomic } from './lib/evidence-io.mjs';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SCRIPT_PATH), '..');
const STATUS_PATH = path.join(ROOT, 'context', 'PROJECT_STATUS.json');
const DIAGNOSTICS_PATH = path.join(ROOT, 'api', 'build-check-diagnostics.json');

function selfTest() {
  const cases = runBuildCheckEvidenceSelfTest();
  for (const [name, ok] of cases) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  const failed = cases.filter(([, ok]) => !ok);
  console.log(`update-test-signal self-test: ${cases.length - failed.length}/${cases.length} passing`);
  if (failed.length) process.exit(1);
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  if (!process.argv.includes('--from-diagnostics')) {
    console.error('update-test-signal: pass --from-diagnostics (hand-entered green/failed modes are unsupported)');
    process.exit(2);
  }
  const evidence = JSON.parse(fs.readFileSync(DIAGNOSTICS_PATH, 'utf8'));
  const status = JSON.parse(fs.readFileSync(STATUS_PATH, 'utf8'));
  const next = applyBuildCheckEvidence(status, evidence);
  const changed = JSON.stringify(next) !== JSON.stringify(status);
  if (changed) writeJsonAtomic(STATUS_PATH, next);
  console.log(`update-test-signal: ${next.testsPassing}/${next.testsTotal} measured step(s), ${next.testsFailed} failed · ${next.testsLastRun} · ${changed ? 'UPDATED' : 'UNCHANGED'}`);
}

if (path.resolve(process.argv[1] || '') === path.resolve(SCRIPT_PATH)) main();