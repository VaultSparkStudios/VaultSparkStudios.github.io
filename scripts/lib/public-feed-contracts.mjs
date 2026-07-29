import fs from 'node:fs';
import path from 'node:path';
import {
  fingerprintCommands,
  receiptIdFor,
  validateBuildCheckEvidence,
} from './build-check-evidence.mjs';
import {
  summarizeProofRows,
  validateProofDiagnostics,
} from './proof-diagnostics.mjs';
import { createStagingDeployReceipt, validateStagingDeployReceipt } from './staging-deploy-receipt.mjs';

export const TYPED_PUBLIC_FEEDS = Object.freeze([
  'api/build-check-diagnostics.json',
  'api/proof-surface-diagnostics.json',
  'api/staging-deploy-receipt.json',
]);

export function buildPlanCommands(root) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const script = String(pkg.scripts?.['build:check:steps'] || '');
  const commands = script.split(/\s+&&\s+/).map((command) => command.trim()).filter(Boolean);
  if (!commands.length) throw new Error('build plan is unavailable');
  return commands;
}

export function validateTypedPublicFeed(relative, value, { root } = {}) {
  if (!root) throw new Error('feed validation requires a repository root');
  if (relative === 'api/build-check-diagnostics.json') {
    if (value?.publicSafe !== true) throw new Error('publicSafe must be true');
    return validateBuildCheckEvidence(value, {
      requireComplete: true,
      expectedPlanFingerprint: fingerprintCommands(buildPlanCommands(root)),
    });
  }
  if (relative === 'api/proof-surface-diagnostics.json') {
    return validateProofDiagnostics(value, { requireComplete: true });
  }
  if (relative === 'api/staging-deploy-receipt.json') {
    return validateStagingDeployReceipt(value, { requireVerifiedRemote: true });
  }
  return value;
}

export function inspectTypedPublicFeed(relative, value, options) {
  if (!TYPED_PUBLIC_FEEDS.includes(relative)) return { expected: false, ok: true, reason: null };
  try {
    validateTypedPublicFeed(relative, value, options);
    return { expected: true, ok: true, reason: null };
  } catch (error) {
    return {
      expected: true,
      ok: false,
      reason: `contract-invalid: ${String(error?.message || error)}`,
    };
  }
}

function buildFixture(commands) {
  const steps = commands.map((command, index) => ({
    step: index + 1,
    command,
    status: 0,
    durationMs: 1,
    error: null,
  }));
  const value = {
    schemaVersion: '2.0',
    generatedAt: '2026-07-28T00:00:00.000Z',
    publicSafe: true,
    source: 'fixture',
    commandCount: steps.length,
    plannedCommandCount: steps.length,
    firstStep: 1,
    coverageComplete: true,
    planFingerprint: fingerprintCommands(commands),
    sourceFingerprint: 'a'.repeat(24),
    passed: steps.length,
    failed: 0,
    totalDurationMs: steps.length,
    failures: [],
    steps,
  };
  value.receiptId = receiptIdFor(value);
  return value;
}

function proofFixture() {
  const steps = [{ step: 1, command: 'node proof.mjs', enforcement: 'blocking', status: 0, durationMs: 1 }];
  const counts = summarizeProofRows(steps);
  const value = {
    schemaVersion: '2.0',
    generatedAt: '2026-07-28T00:00:00.000Z',
    publicSafe: true,
    ...counts,
    plannedBlockingCount: 1,
    plannedAdvisoryCount: 0,
    coverageComplete: true,
    failures: [],
    steps,
  };
  value.receiptId = receiptIdFor(value);
  return value;
}

export function runPublicFeedContractSelfTest({ root }) {
  const commands = buildPlanCommands(root);
  const build = buildFixture(commands);
  const proof = proofFixture();
  const staging = createStagingDeployReceipt({
    generatedAt: '2026-07-28T00:00:00.000Z',
    commitSha: 'a'.repeat(40),
    sourceFingerprint: 'b'.repeat(24),
    candidateRoot: 'c'.repeat(64),
    candidateLeafCount: 24,
    archiveSha256: 'd'.repeat(64),
    archiveBytes: 1024,
    deployId: '20260728000000',
    manifestFileCount: 42,
    remoteFileCount: 42,
    remoteRoot: '/opt/studio/staging/website',
    parity: { generatedAt: '2026-07-28T00:00:01.000Z', candidateReady: true, candidateFindings: [], candidateBuildSha: 'a'.repeat(40), stagingBuildSha: 'a'.repeat(40), artifactManifest: { candidateRoot: 'c'.repeat(64), stagingRoot: 'c'.repeat(64), matched: true } },
    remoteVerified: true,
  });
  return [
    ['complete current-plan build receipt validates', inspectTypedPublicFeed('api/build-check-diagnostics.json', build, { root }).ok],
    ['stale build plan is omitted', !inspectTypedPublicFeed('api/build-check-diagnostics.json', { ...build, planFingerprint: '0'.repeat(24) }, { root }).ok],
    ['partial build coverage is omitted', !inspectTypedPublicFeed('api/build-check-diagnostics.json', { ...build, firstStep: 2, coverageComplete: false }, { root }).ok],
    ['integrity-mutated build receipt is omitted', !inspectTypedPublicFeed('api/build-check-diagnostics.json', { ...build, totalDurationMs: 99 }, { root }).ok],
    ['complete proof receipt validates', inspectTypedPublicFeed('api/proof-surface-diagnostics.json', proof, { root }).ok],
    ['partial proof coverage is omitted', !inspectTypedPublicFeed('api/proof-surface-diagnostics.json', { ...proof, plannedBlockingCount: 2, coverageComplete: false }, { root }).ok],
    ['integrity-mutated proof receipt is omitted', !inspectTypedPublicFeed('api/proof-surface-diagnostics.json', { ...proof, totalDurationMs: 99 }, { root }).ok],
    ['verified staging deploy receipt validates', inspectTypedPublicFeed('api/staging-deploy-receipt.json', staging, { root }).ok],
    ['unverified staging deploy receipt is omitted', (() => { const pending = { ...staging, remoteVerification: { ...staging.remoteVerification, verified: false } }; pending.receiptId = receiptIdFor(pending); return !inspectTypedPublicFeed('api/staging-deploy-receipt.json', pending, { root }).ok; })()],
    ['untyped feeds remain eligible', inspectTypedPublicFeed('api/public-status.json', {}, { root }).ok],
  ];
}
