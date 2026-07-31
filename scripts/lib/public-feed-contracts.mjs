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

/**
 * Validation SCOPE — two different questions about the same feed.
 *
 * `consumption` (default) — "may a caller trust these numbers?" Requires complete
 *   coverage and a current plan fingerprint. Correct wherever the data is READ.
 *
 * `discovery` — "is this feed well-formed and safe to point an agent at?"
 *   Structural validity only.
 *
 * S300: conflating them created a build cycle. `agents.json` advertised these
 * feeds only when they passed the CONSUMPTION contract, so its bytes depended on
 * whether the last proof run happened to be complete and whether the build plan
 * had changed since the artifact was written. Adding a single build:check step
 * rotates the plan fingerprint, invalidates the committed diagnostics, flips the
 * advertise/omit decision, and rewrites agents.json — which the candidate
 * manifest digests, which status-proof embeds, which ai-discovery-health reads
 * from agents.json. No build ordering converges; every rebase needed a manual
 * fixed-point iteration.
 *
 * Reproduced deterministically by the real trigger: append one step to
 * `build:check:steps` and the committed diagnostics — still internally valid —
 * fail consumption with `receipt plan fingerprint is stale`, flipping agents.json.
 * (Mutating plannedBlockingCount instead reproduces a DIFFERENT failure, an
 * integrity mismatch, which both scopes correctly still reject. Worth stating
 * because the first fixtures written here made exactly that substitution and
 * passed for the wrong reason.)
 *
 * The S293 honesty property is preserved exactly — a malformed, non-public-safe,
 * or schema-invalid feed is still NEVER advertised. What is dropped from the
 * discovery decision is runtime COVERAGE, which is a property of the last run
 * rather than of the artifact's publishability. Whether an agent can find out
 * where the proof lives should not depend on whether someone's last local run
 * was interrupted. Freshness and completeness remain published inside the feeds
 * themselves and in status-proof, where a consumer reads them.
 *
 * Same class as D-S298.7: break the cycle by narrowing what the discovery
 * artifact depends on, not by weakening the contract.
 */
export const VALIDATION_SCOPES = Object.freeze(['consumption', 'discovery']);

export function validateTypedPublicFeed(relative, value, { root, scope = 'consumption' } = {}) {
  if (!root) throw new Error('feed validation requires a repository root');
  if (!VALIDATION_SCOPES.includes(scope)) throw new Error(`unknown validation scope: ${scope}`);
  const full = scope === 'consumption';

  if (relative === 'api/build-check-diagnostics.json') {
    if (value?.publicSafe !== true) throw new Error('publicSafe must be true');
    return validateBuildCheckEvidence(value, {
      requireComplete: full,
      // Plan identity is a currency claim, not a well-formedness claim.
      ...(full ? { expectedPlanFingerprint: fingerprintCommands(buildPlanCommands(root)) } : {}),
    });
  }
  if (relative === 'api/proof-surface-diagnostics.json') {
    return validateProofDiagnostics(value, { requireComplete: full });
  }
  if (relative === 'api/staging-deploy-receipt.json') {
    // Remote verification is likewise a currency claim about a deploy that
    // happened, not a statement that the receipt is malformed.
    return validateStagingDeployReceipt(value, { requireVerifiedRemote: full });
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

function proofFixture({ plannedBlockingCount = 1 } = {}) {
  const steps = [{ step: 1, command: 'node proof.mjs', enforcement: 'blocking', status: 0, durationMs: 1 }];
  const counts = summarizeProofRows(steps);
  const value = {
    schemaVersion: '2.0',
    generatedAt: '2026-07-28T00:00:00.000Z',
    publicSafe: true,
    ...counts,
    plannedBlockingCount,
    plannedAdvisoryCount: 0,
    // Stays consistent with the arithmetic so a PARTIAL fixture is a currency
    // failure, not an integrity failure — the distinction the scope split turns on.
    coverageComplete: counts.blockingCount === plannedBlockingCount && counts.advisoryCount === 0,
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

    // S300 — scope split that broke the agents.json build cycle (D-S300.8).
    // Currency claims (stale plan / partial coverage / unverified remote) must
    // block CONSUMPTION but must not decide DISCOVERY, or the manifest's bytes
    // depend on whether the last run happened to be complete.
    // A receipt that is internally VALID but was written against a different
    // build plan — exactly what adding a build:check step produces, and the live
    // trigger hit four times in S300. Not a tampered artifact.
    ['THE CYCLE TRIGGER: a stale plan blocks consumption', (() => {
      const otherPlan = buildFixture([...commands, 'node scripts/does-not-matter.mjs']);
      return !inspectTypedPublicFeed('api/build-check-diagnostics.json', otherPlan, { root, scope: 'consumption' }).ok;
    })()],
    ['a stale plan does NOT block discovery', (() => {
      const otherPlan = buildFixture([...commands, 'node scripts/does-not-matter.mjs']);
      return inspectTypedPublicFeed('api/build-check-diagnostics.json', otherPlan, { root, scope: 'discovery' }).ok;
    })()],
    ['partial proof coverage blocks consumption but not discovery', (() => {
      const partial = proofFixture({ plannedBlockingCount: 3 });   // 1 of 3 executed, self-consistent
      return !inspectTypedPublicFeed('api/proof-surface-diagnostics.json', partial, { root, scope: 'consumption' }).ok
          &&  inspectTypedPublicFeed('api/proof-surface-diagnostics.json', partial, { root, scope: 'discovery' }).ok;
    })()],

    // The S293 honesty property must survive the split IN BOTH SCOPES: a
    // malformed, tampered, or non-public-safe feed is never advertised.
    ['integrity tamper is rejected in DISCOVERY too', !inspectTypedPublicFeed('api/build-check-diagnostics.json', { ...build, totalDurationMs: 99 }, { root, scope: 'discovery' }).ok],
    ['proof integrity tamper is rejected in DISCOVERY too', !inspectTypedPublicFeed('api/proof-surface-diagnostics.json', { ...proof, totalDurationMs: 99 }, { root, scope: 'discovery' }).ok],
    ['publicSafe:false is rejected in DISCOVERY too', !inspectTypedPublicFeed('api/build-check-diagnostics.json', { ...build, publicSafe: false }, { root, scope: 'discovery' }).ok],
    ['self-inconsistent coverage is rejected in DISCOVERY too', !inspectTypedPublicFeed('api/proof-surface-diagnostics.json', { ...proof, plannedBlockingCount: proof.plannedBlockingCount + 1 }, { root, scope: 'discovery' }).ok],
    ['consumption remains the DEFAULT for a partial proof', !inspectTypedPublicFeed('api/proof-surface-diagnostics.json', proofFixture({ plannedBlockingCount: 3 }), { root }).ok],
    ['a healthy feed still validates in both scopes', inspectTypedPublicFeed('api/proof-surface-diagnostics.json', proof, { root, scope: 'discovery' }).ok && inspectTypedPublicFeed('api/proof-surface-diagnostics.json', proof, { root, scope: 'consumption' }).ok],
    ['an unknown scope is rejected, never silently widened', (() => {
      try { validateTypedPublicFeed('api/proof-surface-diagnostics.json', proof, { root, scope: 'nonsense' }); return false; }
      catch (e) { return /unknown validation scope/.test(String(e.message)); }
    })()],
    ['consumption remains the DEFAULT scope', !inspectTypedPublicFeed('api/build-check-diagnostics.json', buildFixture([...commands, 'node scripts/does-not-matter.mjs']), { root }).ok],
  ];
}
