#!/usr/bin/env node
/**
 * Publish the public-safe deploy-history continuity summary.
 *
 * Derives entirely from the committed head receipt + committed chronology
 * ledger, so it is byte-stable across rebuilds and CI-reproducible. The served
 * comparison is a runtime concern owned by `check-staging-deploy-receipt.mjs`;
 * this producer only publishes the reproducible anchor.
 *
 * Cycle guard: asserts the artifact is NOT one of the candidate manifest's
 * CORE_PATHS, so publishing it can never move `candidateRoot`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeJsonAtomic } from './lib/evidence-io.mjs';
import { CORE_PATHS } from './build-candidate-artifact-manifest.mjs';
import {
  CONTINUITY_ARTIFACT_PATH,
  buildContinuitySummary,
  runStagingDeployContinuitySelfTest,
  validateContinuitySummary,
} from './lib/staging-deploy-continuity.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPT = path.join(ROOT, 'api', 'staging-deploy-receipt.json');
const HISTORY = path.join(ROOT, 'data', 'staging-deploy-history.ndjson');
const OUT = path.join(ROOT, CONTINUITY_ARTIFACT_PATH);

function assertOutsideCandidateManifest() {
  if (CORE_PATHS.includes(CONTINUITY_ARTIFACT_PATH)) {
    throw new Error(`${CONTINUITY_ARTIFACT_PATH} is in candidate CORE_PATHS — publishing it would create a receipt/manifest cycle`);
  }
}

function buildFromRepo() {
  if (!fs.existsSync(RECEIPT) || !fs.existsSync(HISTORY)) {
    throw new Error('receipt or history unavailable; run `node scripts/deploy-staging.mjs`');
  }
  const receipt = JSON.parse(fs.readFileSync(RECEIPT, 'utf8'));
  const historyText = fs.readFileSync(HISTORY, 'utf8');
  return buildContinuitySummary(historyText, receipt);
}

function selfTest() {
  assertOutsideCandidateManifest();
  const receipt = JSON.parse(fs.readFileSync(RECEIPT, 'utf8'));
  const cases = [
    ['artifact excluded from candidate CORE_PATHS', !CORE_PATHS.includes(CONTINUITY_ARTIFACT_PATH)],
    ...runStagingDeployContinuitySelfTest(receipt),
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
  console.log(`build-staging-deploy-continuity --self-test: ${cases.length - failed.length}/${cases.length}`);
  process.exit(failed.length ? 1 : 0);
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  assertOutsideCandidateManifest();
  const summary = validateContinuitySummary(buildFromRepo());
  const content = JSON.stringify(summary, null, 2) + '\n';
  if (process.argv.includes('--check')) {
    const actual = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (actual !== content) {
      console.error('build-staging-deploy-continuity: drifted; rebuild the continuity summary');
      process.exit(1);
    }
    console.log(`build-staging-deploy-continuity --check: ok (depth ${summary.ledger.depth} · head ${summary.ledger.head.receiptId})`);
    return;
  }
  writeJsonAtomic(OUT, summary);
  console.log(`build-staging-deploy-continuity: depth ${summary.ledger.depth} · head ${summary.ledger.head.receiptId} · ${summary.bytes.sha256.slice(0, 12)}`);
}

if (import.meta.main ?? process.argv[1]?.endsWith('build-staging-deploy-continuity.mjs')) main();
