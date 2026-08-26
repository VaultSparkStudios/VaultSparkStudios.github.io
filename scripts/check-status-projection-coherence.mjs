#!/usr/bin/env node
/** Receipt-bound PROJECT_STATUS projection and coherence gate. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validateBuildCheckEvidence, applyBuildCheckEvidence, verificationSurfaceFingerprint, fingerprintCommands } from './lib/build-check-evidence.mjs';
import { latestSilEntry } from './lib/sil-ledger.mjs';
import { deriveSummaryFromSil, extractSessionId } from './check-last-session-summary.mjs';
import { validateProjectStatusShape } from './lib/project-status-contract.mjs';
import { sumV3Categories, validateV3Categories } from './lib/sil-categories.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATUS = path.join(ROOT, 'context', 'PROJECT_STATUS.json');
const RECEIPT = path.join(ROOT, 'api', 'build-check-diagnostics.json');
const SIL = path.join(ROOT, 'context', 'SELF_IMPROVEMENT_LOOP.md');
const CATEGORY_KEYS = {
  'Dev Health': 'devHealth', 'Creative Alignment': 'creativeAlignment', Momentum: 'momentum', Engagement: 'engagement',
  'Process Quality': 'processQuality', 'Cross-Repo Coherence': 'crossRepoCoherence', 'Security Posture': 'securityPosture',
  'Ecosystem Integration': 'ecosystemIntegration', 'Capital Efficiency': 'capitalEfficiency', 'Automation Coverage': 'automationCoverage',
};

export function projectStatusProjection(status, receipt, silText, { repoRoot = ROOT, bindCurrentSource = true } = {}) {
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  const plannedCommands = String(packageJson.scripts?.['build:check:steps'] || '').split(/\s+&&\s+/).filter(Boolean);
  const valid = validateBuildCheckEvidence(receipt, {
    requireComplete: true,
    expectedPlanFingerprint: bindCurrentSource ? fingerprintCommands(plannedCommands) : null,
    expectedSourceFingerprint: bindCurrentSource ? verificationSurfaceFingerprint(repoRoot) : null,
  });
  const sil = latestSilEntry(silText, { requireScore: true });
  if (!sil) throw new Error('latest scored SIL receipt missing');
  const categories = Object.fromEntries(Object.entries(sil.categories || {})
    .filter(([label]) => CATEGORY_KEYS[label]).map(([label, score]) => [CATEGORY_KEYS[label], score]));
  const projected = applyBuildCheckEvidence(status, valid);
  delete projected.sil;
  delete projected.silScoreLegacy500;
  projected.currentSession = sil.session;
  projected.silLastSession = sil.session;
  projected.silScore = sil.totalNormalized ?? sil.total;
  if (Object.keys(categories).length === 10) {
    projected.silCategoriesV3 = categories;
    projected.silCategoriesUpdatedSession = sil.session;
  }
  projected.lastSessionSummary = deriveSummaryFromSil(silText);
  return projected;
}

export function evaluateProjection(status, receipt, silText, repoRoot = ROOT, options = {}) {
  const errors = [];
  let expected;
  try { expected = projectStatusProjection(status, receipt, silText, { repoRoot, ...options }); }
  catch (error) { return [`projection unavailable: ${error.message}`]; }
  errors.push(...validateProjectStatusShape(status, repoRoot).errors);
  for (const key of ['testsTotal', 'testsPassing', 'testsFailed', 'testsLastRun', 'testsEvidence', 'testsPlanFingerprint', 'testsSourceFingerprint', 'currentSession', 'silLastSession', 'silScore', 'silCategoriesUpdatedSession']) {
    if (status[key] !== expected[key]) errors.push(`${key}=${JSON.stringify(status[key])} but receipt projection requires ${JSON.stringify(expected[key])}`);
  }
  if (JSON.stringify(status.silCategoriesV3) !== JSON.stringify(expected.silCategoriesV3)) errors.push('silCategoriesV3 differs from latest SIL receipt');
  errors.push(...validateV3Categories(status.silCategoriesV3));
  const total = sumV3Categories(status.silCategoriesV3);
  if (status.silScore !== total) errors.push(`silScore ${status.silScore} != category sum ${total}`);
  const session = expected.currentSession;
  if (extractSessionId(status.currentFocus) !== session) errors.push(`currentFocus does not name authoritative S${session}`);
  if (extractSessionId(status.lastSessionSummary) !== session) errors.push(`lastSessionSummary does not name authoritative S${session}`);
  return errors;
}

function selfTest() {
  const cats = ['Dev Health','Creative Alignment','Momentum','Engagement','Process Quality','Cross-Repo Coherence','Security Posture','Ecosystem Integration','Capital Efficiency','Automation Coverage'];
  const sil = `## Session 9 — 2026-08-16\n**Total:** 900/1000\n${cats.map((name) => `| ${name} | 90 |`).join('\n')}\n**Win:** Receipt truth.`;
  const commands = ['node a.mjs'];
  const bare = { schemaVersion: '1.0', slug: 'x', name: 'X', status: 'live', health: 'green', currentFocus: 'S9 done', lastUpdated: '2026-08-16', silMax: 1000 };
  const receipt = { schemaVersion: '2.0', generatedAt: '2026-08-16T00:00:00Z', commandCount: 1, plannedCommandCount: 1, firstStep: 1, coverageComplete: true, planFingerprint: 'a'.repeat(24), sourceFingerprint: 'b'.repeat(24), passed: 1, failed: 0, steps: [{ command: commands[0], status: 0 }] };
  receipt.receiptId = crypto.createHash('sha256').update(JSON.stringify(receipt)).digest('hex').slice(0, 24);
  const projected = projectStatusProjection(bare, receipt, sil, { bindCurrentSource: false });
  const clean = evaluateProjection(projected, receipt, sil, ROOT, { bindCurrentSource: false }).filter((e) => !/schema/.test(e));
  const stale = evaluateProjection({ ...projected, testsPassing: 99, testsPassed: 99 }, receipt, sil, ROOT, { bindCurrentSource: false });
  const polluted = evaluateProjection({ ...projected, silCategoriesV3: { ...projected.silCategoriesV3, updatedSession: 9 } }, receipt, sil, ROOT, { bindCurrentSource: false });
  const cases = [
    ['receipt projection is coherent', clean.length === 0],
    ['stale counter and alias fail', stale.some((e) => /testsPassing/.test(e)) && stale.some((e) => /testsPassed/.test(e))],
    ['metadata cannot become an eleventh category', polluted.some((e) => /unknown key.*updatedSession/.test(e))],
  ];
  cases.forEach(([name, ok]) => console.log(`  ${ok ? 'ok' : 'FAIL'} ${name}`));
  if (cases.some(([, ok]) => !ok)) process.exit(1);
  console.log(`check-status-projection-coherence --self-test: ${cases.length}/${cases.length} passed`);
}

async function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  let status = JSON.parse(fs.readFileSync(STATUS, 'utf8'));
  const receipt = JSON.parse(fs.readFileSync(RECEIPT, 'utf8'));
  const silText = fs.readFileSync(SIL, 'utf8');
  if (process.argv.includes('--fix')) {
    status = projectStatusProjection(status, receipt, silText);
    fs.writeFileSync(STATUS, `${JSON.stringify(status, null, 2)}\n`, 'utf8');
  }
  const errors = evaluateProjection(status, receipt, silText);
  if (errors.length) {
    errors.forEach((error) => console.error(`✗ ${error}`));
    console.error('repair from receipts: node scripts/check-status-projection-coherence.mjs --fix');
    process.exit(1);
  }
  console.log(`status projection coherent: ${status.testsPassing}/${status.testsTotal} tests · SIL ${status.silScore}/${status.silMax} · S${status.currentSession}`);
}

main();
