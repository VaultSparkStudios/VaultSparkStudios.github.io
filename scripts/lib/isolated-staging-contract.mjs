/** Explicit isolated-staging data contracts. Structural validity is not live admission. */
import crypto from 'node:crypto';
export const STAGING_ORIGIN = 'https://website.staging.vaultsparkstudios.com';
export const REPOSITORY = 'VaultSparkStudios/VaultSparkStudios.github.io';
export const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
export const requireFact = (ok, code) => { if (!ok) throw new Error(`isolated-staging:${code}`); };
export const isHash = (v, length = 64) => typeof v === 'string' && new RegExp(`^[a-f0-9]{${length}}$`).test(v);
export function exactKeys(value, keys, code) {
  requireFact(value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join('\0') === [...keys].sort().join('\0'), code);
}
export function hashFields(value, keys, code) {
  for (const key of keys) requireFact(isHash(value[key]), `${code}-${key}`);
}
export const positiveInteger = v => Number.isSafeInteger(v) && v > 0;
export function parseBoundedJson(raw, expectedHash, maximum = 65536) {
  requireFact((typeof raw === 'string' || Buffer.isBuffer(raw)) && Buffer.byteLength(raw) <= maximum && isHash(expectedHash)
    && sha256(raw) === expectedHash, 'payload-bytes');
  return JSON.parse(String(raw));
}
export function validateVariantReceipt(v) {
  exactKeys(v, ['schemaVersion','mode','generatedAt','generatedBy','publicSafe','state','productionSource','stageVariant',
    'lineage','copiedHistoricalBuildStamp','installationEvidence','predecessor','rollback','deploy','receiptId'], 'receipt-fields');
  requireFact(v.schemaVersion === '1.1' && v.mode === 'isolated-variant' && v.publicSafe === true
    && v.state === 'verified' && v.generatedBy === 'scripts/isolated-staging-evidence.mjs'
    && Number.isFinite(Date.parse(v.generatedAt)), 'receipt-version');
  exactKeys(v.productionSource, ['commitSha','treeSha','fingerprint','rawManifestSha256','artifactRoot','leafCount'], 'production-source');
  const p = v.productionSource;
  requireFact(isHash(p.commitSha,40) && isHash(p.treeSha,40) && isHash(p.fingerprint,24) && positiveInteger(p.leafCount), 'source-identity');
  hashFields(p,['rawManifestSha256','artifactRoot'],'source');
  exactKeys(v.stageVariant, ['sealSha256','archiveSha256','archiveBytes','fullInventorySha256','fileCount','servedInventorySha256',
    'servedFileCount','rawManifestSha256','artifactRoot','leafCount','headersSha256','routeContracts'], 'variant-fields');
  const t = v.stageVariant;
  hashFields(t,['sealSha256','archiveSha256','fullInventorySha256','servedInventorySha256','rawManifestSha256','artifactRoot','headersSha256'],'variant');
  for (const k of ['archiveBytes','fileCount','servedFileCount','leafCount']) requireFact(positiveInteger(t[k]), `variant-${k}`);
  requireFact(t.servedFileCount <= t.fileCount && t.artifactRoot !== p.artifactRoot, 'distinct-variant');
  requireFact(Array.isArray(t.routeContracts) && t.routeContracts.length === 3, 'route-contracts');
  const requiredRoutes=['/','/studio-pulse/','/membership/'];
  t.routeContracts.forEach((row,index)=> {
    exactKeys(row,['route','shellPaths','normalizedCspSha256','headersSha256'],'route-contract-fields');
    requireFact(row.route === requiredRoutes[index] && Array.isArray(row.shellPaths) && row.shellPaths.length>0
      && row.shellPaths.length<=64 && new Set(row.shellPaths).size===row.shellPaths.length
      && row.shellPaths.every(p=>typeof p==='string' && /^assets\/[a-z0-9-]+\.shell-[a-f0-9]{10}\.(?:css|js)$/.test(p))
      && JSON.stringify([...row.shellPaths].sort())===JSON.stringify(row.shellPaths),'route-shell-paths');
    hashFields(row,['normalizedCspSha256','headersSha256'],'route-contract');
  });
  const lineageKeys = ['associationSha256','sourceSnapshotSha256','materializedManifestSha256','deltaReviewSha256',
    'independentReviewSha256','transformContractSha256','producerClosureSha256'];
  exactKeys(v.lineage,lineageKeys,'lineage-fields'); hashFields(v.lineage,lineageKeys,'lineage');
  exactKeys(v.copiedHistoricalBuildStamp,['rawSha256','commitSha','currentSourceIdentity'],'historical-stamp');
  requireFact(isHash(v.copiedHistoricalBuildStamp.rawSha256) && isHash(v.copiedHistoricalBuildStamp.commitSha,40)
    && v.copiedHistoricalBuildStamp.currentSourceIdentity === false, 'historical-not-source');
  const installKeys = ['installReceiptSha256','postReceiptSha256','workerVersionId','workerProofSha256','snapshotSha256',
    'snapshotBindingSha256','snapshotClosureSha256','installObservedAt','postObservedAt'];
  exactKeys(v.installationEvidence,installKeys,'installation-fields');
  hashFields(v.installationEvidence,installKeys.filter(k=>k.endsWith('Sha256')),'installation');
  requireFact(/^[a-f0-9-]{36}$/.test(v.installationEvidence.workerVersionId)
    && Number.isFinite(Date.parse(v.installationEvidence.installObservedAt))
    && Date.parse(v.installationEvidence.postObservedAt) >= Date.parse(v.installationEvidence.installObservedAt)
    && Date.parse(v.generatedAt) >= Date.parse(v.installationEvidence.postObservedAt), 'installation-time');
  exactKeys(v.predecessor,['sealSha256','receiptId','installReceiptSha256','postReceiptSha256'],'predecessor-fields');
  hashFields(v.predecessor,['sealSha256','installReceiptSha256','postReceiptSha256'],'predecessor');
  requireFact(v.predecessor.receiptId === null || isHash(v.predecessor.receiptId,24), 'predecessor-id');
  exactKeys(v.rollback,['model','predecessorAssociationSha256','ownershipVerified','reserveVerified','rollbackComplete'],'rollback-fields');
  requireFact(v.rollback.model === 'immutable-version-root' && isHash(v.rollback.predecessorAssociationSha256)
    && v.rollback.ownershipVerified === true && v.rollback.reserveVerified === true && v.rollback.rollbackComplete === null, 'rollback-nonclaim');
  exactKeys(v.deploy,['id'],'deploy-fields'); requireFact(/^\d{14}$/.test(v.deploy.id), 'deploy-id');
  requireFact(isHash(v.receiptId,24), 'receipt-id');
  return v;
}
export const PRESERVATION_FLAGS = Object.freeze([
  'currentRootReviewedSourceGraphPreserved','reviewedHistoricalTransitionVerified','currentReviewedCandidatePreserved',
  'currentRootReviewedWorkloadsPreserved','currentOwnedFixtureDataPolicyBinaryPreserved','currentRootReviewedSnapshotPreserved',
  'fourOwnedFixturesUnchanged','unrelatedWorkloadsUnchanged','observedAuthIdentityAndApplicationStatePreserved',
  'rlsAclRolesPoliciesCatalogUnchanged','gatewayConfigurationMetadataUnchanged','exactNewStaticInventoryVerified',
]);
export function validatePreservationProjection(p) {
  // These names preserve the actual protected observer's assertions, not invented per-relation observations.
  exactKeys(p,['baselineReceiptSha256','preservationSourceSha256','guardResults','historicalGlobalConfigurationUnchanged',
    'historicalEvidenceBytesPreserved','nativeAcceptance','publicAuthAcceptance'], 'preservation-fields');
  hashFields(p,['baselineReceiptSha256','preservationSourceSha256'],'preservation');
  exactKeys(p.guardResults,PRESERVATION_FLAGS,'preservation-guard-set');
  for (const key of PRESERVATION_FLAGS) requireFact(p.guardResults[key] === true, `guard-${key}`);
  requireFact(p.historicalGlobalConfigurationUnchanged === false && p.historicalEvidenceBytesPreserved === true
    && p.nativeAcceptance === false && p.publicAuthAcceptance === false, 'preservation-nonclaims');
  return p;
}
export function validatePublisherPolicy(policy) {
  exactKeys(policy,['schemaVersion','repository','environment','workflowPaths','publisherCommitmentSha256',
    'requestBotCommitmentSha256','protectedObserver'],'policy-fields');
  requireFact(policy.schemaVersion === 1 && policy.repository === REPOSITORY
    && policy.environment === 'website-isolated-staging'
    && JSON.stringify(policy.workflowPaths) === JSON.stringify(['.github/workflows/pages-deploy.yml','.github/workflows/cloudflare-worker-deploy.yml']), 'policy-scope');
  requireFact(isHash(policy.publisherCommitmentSha256) && isHash(policy.requestBotCommitmentSha256)
    && policy.publisherCommitmentSha256 !== policy.requestBotCommitmentSha256, 'publisher-unresolved');
  requireFact(policy.protectedObserver !== null, 'observer-unresolved');
  return policy;
}
export function publisherCommitment(creator) {
  // Existing authenticated operator authority is retained; only its opaque commitment is persisted.
  // CANON-028 forbids personal identity disclosure, not an authorized User account.
  requireFact(['Bot','User'].includes(creator?.type) && positiveInteger(creator.id), 'publisher-identity-required');
  return sha256(`github-publisher-identity-v1\0${creator.type}\0${creator.id}`);
}
