import { receiptIdFor } from './build-check-evidence.mjs';

const SHA40 = /^[a-f0-9]{40}$/;
const SHA64 = /^[a-f0-9]{64}$/;
const SHA24 = /^[a-f0-9]{24}$/;
const DEPLOY_ID = /^\d{14}$/;
const SAFE_REMOTE_ROOT = /^\/(?:opt\/studio\/staging|srv|var\/www)\/[A-Za-z0-9._/-]+$/;

export function createStagingDeployReceipt(input) {
  const parity = input.parity || {};
  const receipt = {
    schemaVersion: '1.0',
    generatedAt: input.generatedAt,
    generatedBy: 'scripts/deploy-staging.mjs',
    publicSafe: true,
    state: parity.candidateReady === true ? 'verified' : 'degraded',
    source: {
      commitSha: input.commitSha,
      fingerprint: input.sourceFingerprint,
    },
    candidate: {
      artifactRoot: input.candidateRoot,
      leafCount: input.candidateLeafCount,
    },
    archive: {
      sha256: input.archiveSha256,
      bytes: input.archiveBytes,
    },
    deploy: {
      id: input.deployId,
      manifestFileCount: input.manifestFileCount,
      remoteFileCount: input.remoteFileCount,
      remoteRoot: input.remoteRoot,
      rollbackPath: `${String(input.remoteRoot || '').replace(/\/+$/, '')}/.rollback/${input.deployId}`,
    },
    parity: {
      generatedAt: parity.generatedAt ?? null,
      candidateReady: parity.candidateReady === true,
      findings: Array.isArray(parity.candidateFindings) ? parity.candidateFindings : ['parity-evidence-unavailable'],
      candidateBuildSha: parity.candidateBuildSha ?? null,
      stagingBuildSha: parity.stagingBuildSha ?? null,
      candidateRoot: parity.artifactManifest?.candidateRoot ?? null,
      stagingRoot: parity.artifactManifest?.stagingRoot ?? null,
      matched: parity.artifactManifest?.matched === true,
    },
    remoteVerification: {
      method: 'atomic-install-and-byte-equality',
      verified: input.remoteVerified === true,
    },
  };
  receipt.receiptId = receiptIdFor(receipt);
  return receipt;
}

export function validateStagingDeployReceipt(value, { requireVerifiedRemote = false } = {}) {
  if (!value || value.schemaVersion !== '1.0' || value.publicSafe !== true) throw new Error('schema 1.0 public-safe receipt required');
  if (!['verified', 'degraded'].includes(value.state)) throw new Error('state must be verified or degraded');
  if (typeof value.generatedAt !== 'string' || Number.isNaN(Date.parse(value.generatedAt))) throw new Error('generatedAt must be a valid timestamp');
  if (!SHA40.test(value.source?.commitSha || '')) throw new Error('source commit SHA must be 40 lowercase hex characters');
  if (!SHA24.test(value.source?.fingerprint || '')) throw new Error('source fingerprint must be 24 lowercase hex characters');
  if (!SHA64.test(value.candidate?.artifactRoot || '') || !Number.isInteger(value.candidate?.leafCount) || value.candidate.leafCount <= 0) {
    throw new Error('candidate artifact identity is invalid');
  }
  if (!SHA64.test(value.archive?.sha256 || '') || !Number.isInteger(value.archive?.bytes) || value.archive.bytes <= 0) {
    throw new Error('archive identity is invalid');
  }
  if (!DEPLOY_ID.test(value.deploy?.id || '')) throw new Error('deploy id must be a UTC timestamp');
  if (!Number.isInteger(value.deploy?.manifestFileCount) || value.deploy.manifestFileCount <= 0
    || value.deploy.remoteFileCount !== value.deploy.manifestFileCount) {
    throw new Error('remote file count must equal the bounded manifest count');
  }
  if (!SAFE_REMOTE_ROOT.test(value.deploy?.remoteRoot || '') || String(value.deploy.remoteRoot).includes('..')) {
    throw new Error('remote root is outside the bounded public staging namespace');
  }
  if (value.deploy.rollbackPath !== `${value.deploy.remoteRoot.replace(/\/+$/, '')}/.rollback/${value.deploy.id}`) {
    throw new Error('rollback path is not bound to this deploy');
  }
  if (typeof value.parity?.candidateReady !== 'boolean' || !Array.isArray(value.parity?.findings)) {
    throw new Error('parity verdict is incomplete');
  }
  if (value.parity.candidateBuildSha !== value.source.commitSha) throw new Error('parity candidate SHA is not source-bound');
  if (value.parity.candidateRoot !== value.candidate.artifactRoot) throw new Error('parity candidate root is not receipt-bound');
  if (value.parity.candidateReady) {
    if (value.state !== 'verified' || value.parity.findings.length !== 0
      || value.parity.stagingBuildSha !== value.source.commitSha
      || value.parity.stagingRoot !== value.candidate.artifactRoot
      || value.parity.matched !== true) {
      throw new Error('verified parity facts are internally inconsistent');
    }
  } else if (value.state !== 'degraded') {
    throw new Error('failed parity must remain degraded');
  }
  if (value.remoteVerification?.method !== 'atomic-install-and-byte-equality'
    || typeof value.remoteVerification?.verified !== 'boolean') {
    throw new Error('remote verification contract is invalid');
  }
  if (requireVerifiedRemote && value.remoteVerification.verified !== true) throw new Error('remote byte-equality verification is required');
  const serialized = JSON.stringify(value);
  if (/PRIVATE KEY|BEGIN [A-Z ]+ KEY|(?:token|secret|password|credential)["']?\s*:/i.test(serialized)) {
    throw new Error('receipt contains secret-shaped material');
  }
  if (value.receiptId !== receiptIdFor(value)) throw new Error('receiptId does not match receipt content');
  return value;
}

export function runStagingDeployReceiptSelfTest() {
  const input = {
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
    parity: {
      generatedAt: '2026-07-28T00:00:01.000Z',
      candidateReady: true,
      candidateFindings: [],
      candidateBuildSha: 'a'.repeat(40),
      stagingBuildSha: 'a'.repeat(40),
      artifactManifest: {
        candidateRoot: 'c'.repeat(64),
        stagingRoot: 'c'.repeat(64),
        matched: true,
      },
    },
    remoteVerified: true,
  };
  const good = createStagingDeployReceipt(input);
  const rejects = (candidate, options = {}) => {
    try { validateStagingDeployReceipt(candidate, options); return false; } catch { return true; }
  };
  const degraded = createStagingDeployReceipt({
    ...input,
    parity: { ...input.parity, candidateReady: false, candidateFindings: ['staging-build-sha-mismatch'], stagingBuildSha: 'e'.repeat(40), artifactManifest: { ...input.parity.artifactManifest, matched: false } },
  });
  return [
    ['verified receipt validates', validateStagingDeployReceipt(good, { requireVerifiedRemote: true }) === good],
    ['degraded parity remains valid evidence', validateStagingDeployReceipt(degraded).state === 'degraded'],
    ['remote file-count mismatch fails closed', rejects({ ...good, deploy: { ...good.deploy, remoteFileCount: 41 } })],
    ['rollback replay mismatch fails closed', rejects({ ...good, deploy: { ...good.deploy, rollbackPath: '/opt/studio/staging/website/.rollback/20260727000000' } })],
    ['candidate-root mutation fails integrity', rejects({ ...good, candidate: { ...good.candidate, artifactRoot: 'e'.repeat(64) } })],
    ['unverified remote receipt is inspectable but not release-ready', (() => {
      const pending = createStagingDeployReceipt({ ...input, remoteVerified: false });
      return validateStagingDeployReceipt(pending) === pending && rejects(pending, { requireVerifiedRemote: true });
    })()],
    ['secret-shaped material is rejected', (() => {
      const leaked = { ...good, note: 'token: abc' };
      leaked.receiptId = receiptIdFor(leaked);
      return rejects(leaked);
    })()],
  ];
}
