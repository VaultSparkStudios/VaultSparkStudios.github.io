#!/usr/bin/env node
/** Emit a public-safe, source-derived release readiness proof. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'api', 'release-proof.json');
const CHECK = process.argv.includes('--check');
const SELF_TEST = process.argv.includes('--self-test');

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'));
}

export function deriveReleaseProof({ staging, shell, build, workerWorkflow, faviconValid, promotionReceipt }) {
  const reasons = [...new Set((staging.routes || []).flatMap((route) => route.reasonCodes || []))].sort();
  const rollbackAutomatic = /Auto-rollback on failed liveness/.test(workerWorkflow)
    && /Verify rollback restored the site/.test(workerWorkflow)
    && /wrangler rollback/.test(workerWorkflow);
  const stagingReachable = (staging.routes || []).length > 0 && staging.routes.every((route) => route.stagingReachable === true);
  const checks = {
    canonicalFavicon: faviconValid === true,
    stagingReachable,
    stagingCandidateReady: staging.candidateReady === true,
    automaticWorkerRollback: rollbackAutomatic,
    shellManifestPresent: Boolean(shell.version),
    deployPointerPresent: /^[0-9a-f]{40}$/i.test(build.sha || ''),
  };
  const blockers = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  const generatedAt = [staging.generatedAt, shell.generatedAt, build.generatedAt]
    .filter(Boolean).sort().at(-1) || null;

  // Post-promotion reconciliation: candidate-green (staging) is only half the proof.
  // The promotion receipt (api/promotion-receipt.json) observes what production ACTUALLY
  // serves. Fold its verdict in so one artifact reconciles candidate↔production.
  // Honest-dark: when no receipt exists or it could not observe, production is null and
  // reconciled is null (unknown) — never a fabricated true.
  let production = null;
  let reconciled = null;
  if (promotionReceipt && typeof promotionReceipt === 'object') {
    production = {
      reconciliation: promotionReceipt.production?.reconciliation ?? 'unknown',
      cspMode: promotionReceipt.csp?.mode ?? 'unverified',
      receiptState: promotionReceipt.receiptState ?? 'unverified',
      reconciled: promotionReceipt.reconciled === true,
      observedAt: promotionReceipt.generatedAt ?? null,
    };
    // candidate-green AND production-green. If the receipt is honest-dark (unverified),
    // leave reconciled null rather than claiming a pass we did not observe.
    reconciled = promotionReceipt.receiptState === 'unverified'
      ? null
      : (staging.candidateReady === true && promotionReceipt.reconciled === true);
  }

  return {
    schemaVersion: '1.0',
    generatedAt,
    generatedBy: 'scripts/build-release-proof.mjs',
    publicSafe: true,
    releaseState: blockers.length ? 'hold' : 'ready',
    build: { sha: build.sha || null, shellVersion: shell.version || null },
    staging: {
      status: staging.status || 'unknown',
      routeCount: (staging.routes || []).length,
      reachable: stagingReachable,
      reasonCodes: reasons,
      candidateReady: staging.candidateReady === true,
      candidateFindings: staging.candidateFindings || [],
      productionParity: staging.status === 'green',
    },
    production,
    reconciled,
    rollback: { automatic: rollbackAutomatic, verifiedByPostDeployLiveness: rollbackAutomatic },
    checks,
    blockers,
  };
}

if (SELF_TEST) {
  const base = {
    staging: { generatedAt: '2026-01-01T00:00:00Z', status: 'green', candidateReady: true, candidateFindings: [], routes: [{ stagingReachable: true }] },
    shell: { generatedAt: '2026-01-01T00:00:01Z', version: 'abc' },
    build: { generatedAt: '2026-01-01', sha: 'a'.repeat(40) },
    workerWorkflow: 'Auto-rollback on failed liveness\nwrangler rollback\nVerify rollback restored the site',
    faviconValid: true,
  };
  const ready = deriveReleaseProof(base);
  const held = deriveReleaseProof({ ...base, staging: { ...base.staging, status: 'yellow', candidateReady: false, candidateFindings: ['/:localShellParity'], routes: [{ stagingReachable: true, reasonCodes: ['shell-mismatch'] }] } });
  const reconciledProof = deriveReleaseProof({ ...base, promotionReceipt: { production: { reconciliation: 'match' }, csp: { mode: 'enforce' }, receiptState: 'verified', reconciled: true, generatedAt: '2026-01-01T00:00:02Z' } });
  const darkProof = deriveReleaseProof({ ...base, promotionReceipt: { production: { reconciliation: 'unknown' }, csp: { mode: 'unverified' }, receiptState: 'unverified', reconciled: false, generatedAt: '2026-01-01T00:00:02Z' } });
  const degradedProof = deriveReleaseProof({ ...base, promotionReceipt: { production: { reconciliation: 'behind' }, csp: { mode: 'enforce' }, receiptState: 'degraded', reconciled: false, generatedAt: '2026-01-01T00:00:02Z' } });
  const cases = [
    ['all source checks produce ready', ready.releaseState === 'ready' && ready.blockers.length === 0],
    ['candidate drift produces honest hold', held.releaseState === 'hold' && held.blockers.includes('stagingCandidateReady')],
    ['reason codes are preserved', held.staging.reasonCodes.includes('shell-mismatch')],
    ['no receipt → production null, reconciled null (honest-dark)', ready.production === null && ready.reconciled === null],
    ['verified receipt → candidate+production reconciled true', reconciledProof.reconciled === true && reconciledProof.production.receiptState === 'verified'],
    ['unverified receipt → reconciled stays null, never fabricated true', darkProof.reconciled === null],
    ['degraded receipt → reconciled false', degradedProof.reconciled === false && degradedProof.production.reconciliation === 'behind'],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  cases.forEach(([name, ok]) => console.log(`  ${ok ? 'ok' : 'fail'} ${name}`));
  process.exit(failed.length ? 1 : 0);
}

const faviconSource = fs.readFileSync(path.join(ROOT, 'assets', 'icon-256.png'));
const favicon = fs.existsSync(path.join(ROOT, 'favicon.ico')) ? fs.readFileSync(path.join(ROOT, 'favicon.ico')) : Buffer.alloc(0);
const faviconValid = favicon.length === faviconSource.length + 22 && favicon.subarray(22).equals(faviconSource);
function readJsonOptional(relative) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8')); } catch { return null; }
}
const proof = deriveReleaseProof({
  staging: readJson('api/staging-health.json'),
  shell: readJson('assets/shell-manifest.json'),
  build: readJson('api/build-sha.json'),
  workerWorkflow: fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'cloudflare-worker-deploy.yml'), 'utf8'),
  faviconValid,
  promotionReceipt: readJsonOptional('api/promotion-receipt.json'),
});
const content = JSON.stringify(proof, null, 2) + '\n';
if (CHECK) {
  const actual = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (actual !== content) {
    console.error('build-release-proof --check: api/release-proof.json drifted');
    process.exit(1);
  }
  console.log(`build-release-proof --check: ${proof.releaseState} (${proof.blockers.length} blocker(s))`);
} else {
  fs.writeFileSync(OUT, content, 'utf8');
  console.log(`build-release-proof: ${proof.releaseState} (${proof.blockers.length} blocker(s))`);
}
