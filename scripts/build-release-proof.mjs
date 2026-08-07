#!/usr/bin/env node
/** Emit a public-safe, source-derived release readiness proof. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStagingDeployReceipt, validateStagingDeployReceipt } from './lib/staging-deploy-receipt.mjs';
import { historyRowFor, parseStagingDeployHistory, validateStagingDeployHistory } from './lib/staging-deploy-history.mjs';
import { writeReleaseDependencies } from './build-release-dependencies.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'api', 'release-proof.json');
const CHECK = process.argv.includes('--check');
const SELF_TEST = process.argv.includes('--self-test');

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'));
}

export function deriveReleaseProof({ staging, shell, build, workerWorkflow, workerRouteProvenance, deployCurrency, candidateManifest, stagingDeployReceipt, stagingDeployHistory, faviconValid, promotionReceipt, productionPromotion, identityMigration, supabaseControlPlane, releaseDependencies }) {
  const reasons = [...new Set((staging.routes || []).flatMap((route) => route.reasonCodes || []))].sort();
  const rollbackAutomatic = /Auto-rollback on failed liveness/.test(workerWorkflow)
    && /Verify rollback restored the site/.test(workerWorkflow)
    && /wrangler rollback/.test(workerWorkflow);
  const stagingReachable = (staging.routes || []).length > 0 && staging.routes.every((route) => route.stagingReachable === true);
  const stagingCandidateShaBound = /^[0-9a-f]{40}$/i.test(staging.candidateBuildSha || '')
    && staging.candidateBuildSha === staging.stagingBuildSha;
  const stagingArtifactManifestBound = /^[0-9a-f]{64}$/i.test(staging.artifactManifest?.candidateRoot || '')
    && staging.artifactManifest?.candidateRoot === staging.artifactManifest?.stagingRoot
    && staging.artifactManifest?.candidateLeafCount === staging.artifactManifest?.stagingLeafCount
    && staging.artifactManifest?.candidateRoot === candidateManifest?.root
    && staging.artifactManifest?.candidateLeafCount === candidateManifest?.leafCount;
  let stagingDeployAttested = false;
  let stagingDeployHistoryBound = false;
  let stagingDeployReceiptReason = null;
  let stagingDeployHistoryReason = null;
  try {
    const deployReceipt = validateStagingDeployReceipt(stagingDeployReceipt, { requireVerifiedRemote: true });
    stagingDeployAttested = deployReceipt.state === 'verified'
      && deployReceipt.source.commitSha === staging.candidateBuildSha
      && deployReceipt.candidate.artifactRoot === candidateManifest?.root
      && deployReceipt.candidate.leafCount === candidateManifest?.leafCount
      && deployReceipt.parity.candidateBuildSha === staging.candidateBuildSha
      && deployReceipt.parity.stagingBuildSha === staging.stagingBuildSha
      && deployReceipt.parity.candidateRoot === staging.artifactManifest?.candidateRoot
      && deployReceipt.parity.stagingRoot === staging.artifactManifest?.stagingRoot
      && deployReceipt.parity.candidateReady === staging.candidateReady;
    if (!stagingDeployAttested) stagingDeployReceiptReason = 'receipt facts do not match current staging evidence';
  } catch (error) {
    stagingDeployReceiptReason = String(error?.message || error);
  }
  try {
    const rows = validateStagingDeployHistory(stagingDeployHistory, { latestReceipt: stagingDeployReceipt });
    stagingDeployHistoryBound = rows.length > 0;
  } catch (error) {
    stagingDeployHistoryReason = String(error?.message || error);
  }
  const checks = {
    canonicalFavicon: faviconValid === true,
    stagingReachable,
    stagingCandidateReady: staging.candidateReady === true,
    stagingCandidateShaBound,
    stagingArtifactManifestBound,
    stagingDeployAttested,
    stagingDeployHistoryBound,
    automaticWorkerRollback: rollbackAutomatic,
    productionWorkerRoutesMatched: workerRouteProvenance?.state === 'matched'
      && workerRouteProvenance?.summary?.matched === workerRouteProvenance?.summary?.total,
    productionShellParityMatched: deployCurrency?.shellParity?.state === 'matched',
    shellManifestPresent: Boolean(shell.version),
    deployPointerPresent: /^[0-9a-f]{40}$/i.test(build.sha || ''),
    identityMigrationVerified: identityMigration?.state === 'verified'
      && identityMigration?.productionEligible === true
      && (identityMigration?.blockers || []).length === 0,
    supabaseControlPlaneReady: supabaseControlPlane?.overall === 'ready',
    productionPromotionReady: productionPromotion?.hold === false
      && productionPromotion?.releaseState === 'ready',
    releaseDependenciesSatisfied: releaseDependencies?.state === 'completed'
      && (releaseDependencies?.dependencies || []).every((dependency) => dependency.status === 'completed'),
  };
  const blockers = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  if (productionPromotion?.hold === true) {
    blockers.push(...(productionPromotion.reasons || []).map((reason) => `promotion:${reason}`));
  }
  blockers.push(...(identityMigration?.blockers || []).map((reason) => `identity:${reason}`));
  blockers.push(...(supabaseControlPlane?.blockers || []).map((reason) => `control-plane:${reason}`));
  blockers.push(...(releaseDependencies?.dependencies || [])
    .filter((dependency) => dependency.status !== 'completed')
    .map((dependency) => `dependency:${dependency.id}:${dependency.status}`));
  const generatedAt = [staging.generatedAt, stagingDeployReceipt?.generatedAt, shell.generatedAt, build.generatedAt, deployCurrency?.generatedAt]
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
      candidateBuildSha: staging.candidateBuildSha ?? null,
      deployedBuildSha: staging.stagingBuildSha ?? null,
      candidateShaBound: stagingCandidateShaBound,
      artifactManifest: staging.artifactManifest ?? null,
      productionParity: staging.status === 'green',
      deployReceipt: stagingDeployReceipt ? {
        receiptId: stagingDeployReceipt.receiptId ?? null,
        state: stagingDeployReceipt.state ?? 'invalid',
        deployId: stagingDeployReceipt.deploy?.id ?? null,
        manifestFileCount: stagingDeployReceipt.deploy?.manifestFileCount ?? null,
        remoteFileCount: stagingDeployReceipt.deploy?.remoteFileCount ?? null,
        rollbackPath: stagingDeployReceipt.deploy?.rollbackPath ?? null,
        sourceFingerprint: stagingDeployReceipt.source?.fingerprint ?? null,
        archiveSha256: stagingDeployReceipt.archive?.sha256 ?? null,
        remoteVerified: stagingDeployReceipt.remoteVerification?.verified === true,
        attested: stagingDeployAttested,
        reason: stagingDeployReceiptReason,
      } : {
        receiptId: null,
        state: 'unavailable',
        attested: false,
        reason: stagingDeployReceiptReason,
      },
      deployHistory: {
        depth: Array.isArray(stagingDeployHistory) ? stagingDeployHistory.length : 0,
        headReceiptId: Array.isArray(stagingDeployHistory) ? stagingDeployHistory.at(-1)?.receiptId ?? null : null,
        previousReceiptId: Array.isArray(stagingDeployHistory) ? stagingDeployHistory.at(-1)?.previousReceiptId ?? null : null,
        bound: stagingDeployHistoryBound,
        reason: stagingDeployHistoryReason,
      },
    },
    production,
    productionWorkerRoutes: {
      state: workerRouteProvenance?.state ?? 'unavailable',
      matched: workerRouteProvenance?.summary?.matched ?? 0,
      total: workerRouteProvenance?.summary?.total ?? 0,
      observedAt: workerRouteProvenance?.generatedAt ?? null,
      sourceContractSha256: workerRouteProvenance?.sourceContract?.sha256 ?? null,
    },
    productionDeploy: {
      state: deployCurrency?.state ?? 'unobserved',
      commitsBehind: deployCurrency?.commitsBehind ?? null,
      ageHours: deployCurrency?.ageHours ?? null,
      observedAt: deployCurrency?.observedAt ?? null,
      shellParity: deployCurrency?.shellParity ?? { state: 'unobserved', missing: [], unexpected: [] },
    },
    promotion: {
      releaseState: productionPromotion?.releaseState ?? 'unknown',
      hold: productionPromotion?.hold !== false,
      reasons: productionPromotion?.reasons ?? ['promotion-state-unavailable'],
      requiresWorkflowDispatch: productionPromotion?.promotionContract?.requiresWorkflowDispatch === true,
      requiresExplicitConfirmation: productionPromotion?.promotionContract?.requiresExplicitConfirmation === true,
    },
    identityMigration: {
      state: identityMigration?.state ?? 'unavailable',
      productionEligible: identityMigration?.productionEligible === true,
      environment: identityMigration?.environment ?? null,
      workerVersion: identityMigration?.bindings?.worker?.versionId ?? null,
      blockers: identityMigration?.blockers ?? ['identity-receipt-unavailable'],
    },
    supabaseControlPlane: {
      overall: supabaseControlPlane?.overall ?? 'unavailable',
      readyPlanes: Object.values(supabaseControlPlane?.planes || {}).filter((plane) => plane.status === 'ready').length,
      totalPlanes: Object.keys(supabaseControlPlane?.planes || {}).length,
      blockers: supabaseControlPlane?.blockers ?? ['control-plane-receipt-unavailable'],
    },
    releaseDependencies: {
      state: releaseDependencies?.state ?? 'unavailable',
      dependencies: (releaseDependencies?.dependencies || []).map((dependency) => ({
        id: dependency.id,
        ownerSlug: dependency.ownerSlug,
        status: dependency.status,
        cargoId: dependency.cargoId,
        contractSha256: dependency.contractSha256,
        sentAt: dependency.sentAt ?? null,
        acknowledgedAt: dependency.acknowledgedAt ?? null,
        completedAt: dependency.completedAt ?? null,
        expiresAt: dependency.expiresAt ?? null,
      })),
    },
    reconciled,
    rollback: { automatic: rollbackAutomatic, verifiedByPostDeployLiveness: rollbackAutomatic },
    checks,
    blockers,
  };
}

if (SELF_TEST) {
  const base = {
    staging: { generatedAt: '2026-01-01T00:00:00Z', status: 'green', candidateReady: true, candidateFindings: [], candidateBuildSha: 'a'.repeat(40), stagingBuildSha: 'a'.repeat(40), artifactManifest: { candidateRoot: 'c'.repeat(64), stagingRoot: 'c'.repeat(64), candidateLeafCount: 24, stagingLeafCount: 24, matched: true }, routes: [{ stagingReachable: true }] },
    shell: { generatedAt: '2026-01-01T00:00:01Z', version: 'abc' },
    build: { generatedAt: '2026-01-01', sha: 'a'.repeat(40) },
    workerWorkflow: 'Auto-rollback on failed liveness\nwrangler rollback\nVerify rollback restored the site',
    workerRouteProvenance: { state: 'matched', generatedAt: '2026-01-01T00:00:01Z', summary: { matched: 5, total: 5 }, sourceContract: { sha256: 'c'.repeat(64) } },
    deployCurrency: { state: 'current', generatedAt: '2026-01-01T00:00:01Z', commitsBehind: 0, ageHours: 0, shellParity: { state: 'matched', route: '/', observedAt: '2026-01-01T00:00:01Z', missing: [], unexpected: [] } },
    candidateManifest: { root: 'c'.repeat(64), leafCount: 24 },
    stagingDeployReceipt: createStagingDeployReceipt({
      generatedAt: '2026-01-01T00:00:01Z',
      commitSha: 'a'.repeat(40),
      sourceFingerprint: 'b'.repeat(24),
      candidateRoot: 'c'.repeat(64),
      candidateLeafCount: 24,
      archiveSha256: 'd'.repeat(64),
      archiveBytes: 1024,
      deployId: '20260101000000',
      manifestFileCount: 42,
      remoteFileCount: 42,
      remoteRoot: '/opt/studio/staging/website',
      parity: { generatedAt: '2026-01-01T00:00:01Z', candidateReady: true, candidateFindings: [], candidateBuildSha: 'a'.repeat(40), stagingBuildSha: 'a'.repeat(40), artifactManifest: { candidateRoot: 'c'.repeat(64), stagingRoot: 'c'.repeat(64), matched: true } },
      remoteVerified: true,
    }),
    faviconValid: true,
    productionPromotion: {
      releaseState: 'ready',
      hold: false,
      reasons: [],
      promotionContract: { requiresWorkflowDispatch: true, requiresExplicitConfirmation: true },
    },
    identityMigration: { state: 'verified', productionEligible: true, environment: 'staging', bindings: { worker: { versionId: '11111111-1111-4111-8111-111111111111' } }, blockers: [] },
    supabaseControlPlane: { overall: 'ready', planes: { dataRest: { status: 'ready' }, managementApi: { status: 'ready' }, sqlMigration: { status: 'ready' }, edgeFunctions: { status: 'ready' } }, blockers: [] },
    releaseDependencies: { state: 'completed', dependencies: [{ id: 'dep', ownerSlug: 'owner', cargoId: '01TEST', status: 'completed', contractSha256: 'f'.repeat(64) }] },
  };
  base.stagingDeployHistory = [historyRowFor(base.stagingDeployReceipt)];
  const ready = deriveReleaseProof(base);
  const held = deriveReleaseProof({ ...base, staging: { ...base.staging, status: 'yellow', candidateReady: false, candidateFindings: ['/:localShellParity'], routes: [{ stagingReachable: true, reasonCodes: ['shell-mismatch'] }] } });
  const reconciledProof = deriveReleaseProof({ ...base, promotionReceipt: { production: { reconciliation: 'match' }, csp: { mode: 'enforce' }, receiptState: 'verified', reconciled: true, generatedAt: '2026-01-01T00:00:02Z' } });
  const darkProof = deriveReleaseProof({ ...base, promotionReceipt: { production: { reconciliation: 'unknown' }, csp: { mode: 'unverified' }, receiptState: 'unverified', reconciled: false, generatedAt: '2026-01-01T00:00:02Z' } });
  const degradedProof = deriveReleaseProof({ ...base, promotionReceipt: { production: { reconciliation: 'behind' }, csp: { mode: 'enforce' }, receiptState: 'degraded', reconciled: false, generatedAt: '2026-01-01T00:00:02Z' } });
  const promotionHeld = deriveReleaseProof({
    ...base,
    productionPromotion: {
      ...base.productionPromotion,
      releaseState: 'hold',
      hold: true,
      reasons: ['provider-e2e-pending'],
    },
  });
  const identityHeld = deriveReleaseProof({
    ...base,
    identityMigration: { ...base.identityMigration, state: 'honest-dark', productionEligible: false, blockers: ['provider-e2e-pending'] },
  });
  const dependencyHeld = deriveReleaseProof({ ...base, releaseDependencies: { state: 'pending', dependencies: [{ ...base.releaseDependencies.dependencies[0], status: 'sent' }] } });
  const staleStagingSha = deriveReleaseProof({
    ...base,
    staging: { ...base.staging, stagingBuildSha: 'b'.repeat(40) },
  });
  const staleWorker = deriveReleaseProof({ ...base, workerRouteProvenance: { ...base.workerRouteProvenance, state: 'mismatch', summary: { matched: 0, total: 5 } } });
  const staleShell = deriveReleaseProof({ ...base, deployCurrency: { ...base.deployCurrency, shellParity: { ...base.deployCurrency.shellParity, state: 'drift', missing: ['assets/app.shell-aaaaaaaaaa.js'] } } });
  const staleManifest = deriveReleaseProof({ ...base, staging: { ...base.staging, artifactManifest: { ...base.staging.artifactManifest, stagingRoot: 'd'.repeat(64), matched: false } } });
  const cases = [
    ['all source checks produce ready', ready.releaseState === 'ready' && ready.blockers.length === 0],
    ['candidate drift produces honest hold', held.releaseState === 'hold' && held.blockers.includes('stagingCandidateReady')],
    ['reason codes are preserved', held.staging.reasonCodes.includes('shell-mismatch')],
    ['no receipt → production null, reconciled null (honest-dark)', ready.production === null && ready.reconciled === null],
    ['verified receipt → candidate+production reconciled true', reconciledProof.reconciled === true && reconciledProof.production.receiptState === 'verified'],
    ['unverified receipt → reconciled stays null, never fabricated true', darkProof.reconciled === null],
    ['degraded receipt → reconciled false', degradedProof.reconciled === false && degradedProof.production.reconciliation === 'behind'],
    ['explicit production hold overrides candidate readiness', promotionHeld.releaseState === 'hold' && promotionHeld.blockers.includes('promotion:provider-e2e-pending')],
    ['dark identity receipt overrides candidate readiness', identityHeld.releaseState === 'hold' && identityHeld.blockers.includes('identity:provider-e2e-pending')],
    ['unacknowledged owner dependency is an explicit hold', dependencyHeld.releaseState === 'hold' && dependencyHeld.blockers.includes('dependency:dep:sent')],
    ['stale staging SHA cannot inherit candidate-green', staleStagingSha.releaseState === 'hold' && staleStagingSha.blockers.includes('stagingCandidateShaBound')],
    ['production Worker route mismatch is an explicit hold', staleWorker.releaseState === 'hold' && staleWorker.blockers.includes('productionWorkerRoutesMatched')],
    ['production route-shell drift is an explicit hold', staleShell.releaseState === 'hold' && staleShell.blockers.includes('productionShellParityMatched')],
    ['staging critical-byte drift is an explicit hold', staleManifest.releaseState === 'hold' && staleManifest.blockers.includes('stagingArtifactManifestBound')],
    ['verified staging deploy receipt is release-bound', ready.checks.stagingDeployAttested && ready.staging.deployReceipt.attested],
    ['hash-chained staging history is release-bound', ready.checks.stagingDeployHistoryBound && ready.staging.deployHistory.depth === 1],
    ['missing staging deploy receipt is an explicit hold', (() => { const proof = deriveReleaseProof({ ...base, stagingDeployReceipt: null }); return proof.releaseState === 'hold' && proof.blockers.includes('stagingDeployAttested') && proof.staging.deployReceipt.state === 'unavailable'; })()],
    ['receipt replay against another candidate is rejected', (() => { const proof = deriveReleaseProof({ ...base, stagingDeployReceipt: { ...base.stagingDeployReceipt, source: { ...base.stagingDeployReceipt.source, commitSha: 'e'.repeat(40) } } }); return proof.releaseState === 'hold' && !proof.checks.stagingDeployAttested; })()],
    ['detached staging history is an explicit hold', (() => { const proof = deriveReleaseProof({ ...base, stagingDeployHistory: [] }); return proof.releaseState === 'hold' && proof.blockers.includes('stagingDeployHistoryBound'); })()],
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
function readHistoryOptional(relative) {
  try { return parseStagingDeployHistory(fs.readFileSync(path.join(ROOT, relative), 'utf8')); } catch { return null; }
}
if (!CHECK) await writeReleaseDependencies();
const proof = deriveReleaseProof({
  staging: readJson('api/staging-health.json'),
  shell: readJson('assets/shell-manifest.json'),
  build: readJson('api/build-sha.json'),
  workerWorkflow: fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'cloudflare-worker-deploy.yml'), 'utf8'),
  workerRouteProvenance: readJson('api/worker-route-provenance.json'),
  deployCurrency: readJson('api/deploy-currency.json'),
  candidateManifest: readJson('api/candidate-artifact-manifest.json'),
  stagingDeployReceipt: readJsonOptional('api/staging-deploy-receipt.json'),
  stagingDeployHistory: readHistoryOptional('data/staging-deploy-history.ndjson'),
  faviconValid,
  promotionReceipt: readJsonOptional('api/promotion-receipt.json'),
  productionPromotion: readJson('context/PRODUCTION_PROMOTION.json'),
  identityMigration: readJson('api/identity-migration-receipt.json'),
  supabaseControlPlane: readJson('api/supabase-control-plane.json'),
  releaseDependencies: readJsonOptional('api/release-dependencies.json'),
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
