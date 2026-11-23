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
  // Historical immutable receipts retain Pulse; new candidates serve its content
  // from Studio. Require one complete tuple, never a mixed or arbitrary route.
  const requiredRoutes=t.routeContracts[1]?.route==='/studio/'
    ? ['/','/studio/','/membership/'] : ['/','/studio-pulse/','/membership/'];
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
    'requestBotCommitmentSha256','protectedObserver',...(['nativeProducer','productionPostflightProducer','nativeSuccessor','protectedSuccessor'].filter(k=>Object.hasOwn(policy,k)))],'policy-fields');
  requireFact(policy.schemaVersion === 1 && policy.repository === REPOSITORY
    && policy.environment === 'website-isolated-staging'
    && JSON.stringify(policy.workflowPaths) === JSON.stringify(['.github/workflows/pages-deploy.yml','.github/workflows/cloudflare-worker-deploy.yml']), 'policy-scope');
  requireFact(isHash(policy.publisherCommitmentSha256) && isHash(policy.requestBotCommitmentSha256)
    && policy.publisherCommitmentSha256 !== policy.requestBotCommitmentSha256, 'publisher-unresolved');
  requireFact(policy.protectedObserver !== null, 'observer-unresolved');
  if(Object.hasOwn(policy,'nativeSuccessor'))validateNativeSuccessorRecord(policy.nativeSuccessor);
  if(Object.hasOwn(policy,'protectedSuccessor'))validateProtectedSuccessorShape(policy.protectedSuccessor);
  return policy;
}
/** Separate stage observations; never maps to production providerJourney statuses. */
export function validateStageNative(v, installation, frozen, descriptor) {
  if(v?.scope===NATIVE_S418_SCOPE)return validateStageNativeS418(v,installation,frozen,descriptor);
  requireFact(Buffer.byteLength(JSON.stringify(v)) <= 8192,'stage-native-bound');
  exactKeys(v,['schemaVersion','scope','repository','environment','session','sourceCommit','sourceTreeSha','verifierContractSha256',
    'stageSealSha256','installReceiptSha256','postReceiptSha256','stageManifestSha256','workerVersion','workerBindingsSha256',
    'appInputClosureSha256','executionDescriptorSha256','startedAt','finishedAt','sameSubjectVerified','cleanupComplete','cases',
    'productionNativePending','productionIdentityVerified','fullReleaseAccepted','wholeHistoricalDatabaseBaselinePreservedClaimed',
    'signatureCryptographicallyVerifiedByHarness','nativeIssuanceServerRequestsObserved'],'stage-native-fields');
  requireFact(v.schemaVersion===1&&v.scope==='selected-native-stage-pair-v4'&&v.repository===REPOSITORY
    &&v.environment==='staging'&&v.session===416,'stage-native-scope');
  for(const key of ['sourceCommit','sourceTreeSha','verifierContractSha256'])requireFact(v[key]===frozen[key],'stage-native-source');
  const receipt=installation.receipt;
  requireFact(v.stageSealSha256===receipt.stageVariant.sealSha256&&v.stageManifestSha256===receipt.stageVariant.rawManifestSha256
    &&v.installReceiptSha256===receipt.installationEvidence.installReceiptSha256&&v.postReceiptSha256===receipt.installationEvidence.postReceiptSha256
    &&v.workerVersion===receipt.installationEvidence.workerVersionId&&v.workerVersion==='d9bdd239-3fb7-43a3-9630-a7fe8d39922e','stage-native-installation');
  hashFields(v,['stageSealSha256','installReceiptSha256','postReceiptSha256','stageManifestSha256','workerBindingsSha256',
    'appInputClosureSha256','executionDescriptorSha256'],'stage-native');
  requireFact(descriptor&&descriptor.scope==='selected-native-pair-factory-v4'&&v.executionDescriptorSha256===sha256(JSON.stringify(descriptor))
    &&v.workerBindingsSha256===descriptor.workerBindingsSha256&&v.workerVersion===descriptor.workerVersionId,'stage-native-execution-source');
  const time=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s;
  requireFact(time(v.startedAt)&&time(v.finishedAt)&&Date.parse(v.startedAt)>=Date.parse(receipt.installationEvidence.postObservedAt)
    &&Date.parse(v.finishedAt)>=Date.parse(v.startedAt)&&Date.parse(v.finishedAt)<=Date.now(),'stage-native-times');
  requireFact(Array.isArray(v.cases)&&v.cases.length===2,'stage-native-cases');
  let prior=Date.parse(v.startedAt);
  for(const [index,row]of v.cases.entries()){
    exactKeys(row,['audience','intent','startedAt','finishedAt','receiptSha256','safeOutcomeSha256','positiveUiPassed','ordinaryLogoutVerified','callbackBoundariesVerified'],'stage-native-case-fields');
    requireFact(row.audience===['member','investor'][index]&&row.intent==='signin'&&time(row.startedAt)&&time(row.finishedAt)
      &&Date.parse(row.startedAt)>=prior&&Date.parse(row.finishedAt)>=Date.parse(row.startedAt)&&Date.parse(row.finishedAt)<=Date.parse(v.finishedAt),'stage-native-case-identity-time');
    hashFields(row,['receiptSha256','safeOutcomeSha256'],'stage-native-case');
    requireFact(row.positiveUiPassed===true&&row.ordinaryLogoutVerified===true&&row.callbackBoundariesVerified===true,'stage-native-case-outcome');
    prior=Date.parse(row.finishedAt);
  }
  requireFact(v.cases[0].receiptSha256!==v.cases[1].receiptSha256&&v.cases[0].safeOutcomeSha256!==v.cases[1].safeOutcomeSha256,'stage-native-distinct-cases');
  requireFact(v.sameSubjectVerified===true&&v.cleanupComplete===true&&v.productionNativePending===true&&v.productionIdentityVerified===false
    &&v.fullReleaseAccepted===false&&v.wholeHistoricalDatabaseBaselinePreservedClaimed===false
    &&v.signatureCryptographicallyVerifiedByHarness===false&&v.nativeIssuanceServerRequestsObserved===false,'stage-native-nonclaims');
  return v;
}
export function publisherCommitment(creator) {
  // Existing authenticated operator authority is retained; only its opaque commitment is persisted.
  // CANON-028 forbids personal identity disclosure, not an authorized User account.
  requireFact(['Bot','User'].includes(creator?.type) && positiveInteger(creator.id), 'publisher-identity-required');
  return sha256(`github-publisher-identity-v1\0${creator.type}\0${creator.id}`);
}

/** S418 website-profile proof: separate from shared Studio identity signup. */
export const NATIVE_S418_SCOPE='s418-new-website-profile-pair-v1';
export const NATIVE_S418_PREFIX='.cache/S418/native-acceptance-successor/';
export const NATIVE_S418_REQUIRED=Object.freeze([
  ...['paired-factory.mjs','profile-completion.mjs','selected-journey.mjs','run-selected-journey.mjs','runtime-binding.mjs','source-admission.mjs','callback-boundaries.mjs','runtime-provenance.mjs','native-contract.mjs','SOURCE_BINDINGS.json'].map(p=>NATIVE_S418_PREFIX+p),
  'scripts/lib/isolated-staging-evidence.mjs','scripts/lib/isolated-staging-contract.mjs',
  'supabase/functions/account-data/index.ts','supabase/functions/account-data/core.mjs','supabase/functions/account-data/adapters.mjs',
  'supabase/functions/account-data/kit-marketing.mjs','supabase/functions/_shared/boundedBody.mjs',
  'supabase/migrations/20261123042000_website_account_data.sql','supabase/migrations/20261123043000_website_project_waitlists.sql',
]);
export function validateNativeSuccessorRecord(record) {
  exactKeys(record,['scope','descriptorSha256','descriptor'],'s418-policy-fields');
  const d=record.descriptor;
  requireFact(record.scope===NATIVE_S418_SCOPE&&isHash(record.descriptorSha256)
    &&sha256(JSON.stringify(d))===record.descriptorSha256,'s418-policy-exact-descriptor');
  exactKeys(d,['schemaVersion','scope','file','sha256','exportName','assertExportName','dependencyRows','workerBindingsSha256','workerVersionId'],'s418-descriptor-fields');
  requireFact(d.schemaVersion===1&&d.scope===NATIVE_S418_SCOPE&&d.file===NATIVE_S418_PREFIX+'paired-factory.mjs'
    &&d.exportName==='executeNativePair'&&d.assertExportName==='consumeNativePair'
    &&isHash(d.sha256)&&isHash(d.workerBindingsSha256)
    &&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(d.workerVersionId),'s418-descriptor-fixed');
  requireFact(Array.isArray(d.dependencyRows)&&d.dependencyRows.length>0&&d.dependencyRows.length<=512,'s418-closure-bound');
  const seen=new Set();
  for(const row of d.dependencyRows){
    exactKeys(row,['file','sha256'],'s418-closure-row');
    const prefix='../vaultspark-studio-ops/scripts/';
    const file=typeof row.file==='string'&&row.file.startsWith(prefix)?row.file.slice('../vaultspark-studio-ops/'.length):row.file;
    requireFact(typeof file==='string'&&!file.includes('\\')&&!file.startsWith('/')&&!/^[a-z]:/i.test(file)
      &&file.split('/').every(p=>p&&p!=='.'&&p!=='..')&&!seen.has(row.file)&&isHash(row.sha256),'s418-closure-path-hash');
    seen.add(row.file);
  }
  for(const file of NATIVE_S418_REQUIRED)requireFact(seen.has(file),'s418-required-source-closure');
  requireFact(d.dependencyRows.some(r=>r.file===d.file&&r.sha256===d.sha256),'s418-factory-whole-body');
  return d;
}
export function nativeDescriptorFor(policy,stageNative) {
  if(stageNative?.scope===NATIVE_S418_SCOPE)return validateNativeSuccessorRecord(policy?.nativeSuccessor);
  // The historical branch remains exact in validateStageNative.
  return policy?.nativeProducer;
}
export function validateStageNativeS418(v,installation,frozen,descriptor) {
  requireFact(Buffer.byteLength(JSON.stringify(v))<=8192,'s418-native-bound');
  exactKeys(v,['schemaVersion','scope','repository','environment','session','sourceCommit','sourceTreeSha','verifierContractSha256',
    'stageSealSha256','installReceiptSha256','postReceiptSha256','stageManifestSha256','workerVersion','workerBindingsSha256',
    'accountStatusInstallSha256','appInputClosureSha256','executionDescriptorSha256','startedAt','finishedAt','sameSubjectVerified','cleanupComplete','cases',
    'newWebsiteProfileVerified','sharedIdentitySignupVerified','nativePreservationSha256','preservationRelationCount','preservationManifestSha256','productionNativePending','productionIdentityVerified','fullReleaseAccepted'],'s418-native-fields');
  requireFact(v.schemaVersion===1&&v.scope===NATIVE_S418_SCOPE&&v.repository===REPOSITORY&&v.environment==='staging'&&v.session===418,'s418-native-scope');
  for(const key of ['sourceCommit','sourceTreeSha','verifierContractSha256'])requireFact(v[key]===frozen[key]&&installation[key]===frozen[key],'s418-native-source');
  const receipt=installation.receipt;
  requireFact(v.stageSealSha256===receipt.stageVariant.sealSha256&&v.stageManifestSha256===receipt.stageVariant.rawManifestSha256
    &&v.installReceiptSha256===receipt.installationEvidence.installReceiptSha256&&v.postReceiptSha256===receipt.installationEvidence.postReceiptSha256
    &&v.workerVersion===receipt.installationEvidence.workerVersionId,'s418-native-original-installation');
  hashFields(v,['stageSealSha256','installReceiptSha256','postReceiptSha256','stageManifestSha256','workerBindingsSha256','accountStatusInstallSha256','appInputClosureSha256','executionDescriptorSha256'],'s418-native');
  const d=validateNativeSuccessorRecord({scope:NATIVE_S418_SCOPE,descriptorSha256:v.executionDescriptorSha256,descriptor});
  requireFact(v.workerVersion===d.workerVersionId&&v.workerBindingsSha256===d.workerBindingsSha256,'s418-native-pinned-worker');
  const time=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s;
  const start=Date.parse(v.startedAt),end=Date.parse(v.finishedAt);
  requireFact(time(v.startedAt)&&time(v.finishedAt)&&start>=Date.parse(receipt.installationEvidence.postObservedAt)
    &&end>=start&&end<=Date.now()&&end-start<=1800000,'s418-native-times');
  requireFact(Array.isArray(v.cases)&&v.cases.length===2,'s418-native-pair');let prior=start;
  for(const [index,row]of v.cases.entries()){
    exactKeys(row,['audience','intent','caseName','sharedIdentitySignupVerified','startedAt','finishedAt','receiptSha256','safeOutcomeSha256','positiveUiPassed','ordinaryLogoutVerified','callbackBoundariesVerified'],'s418-native-case-fields');
    requireFact(row.audience===['member','investor'][index]&&row.intent==='signin'
      &&row.caseName===['new-website-profile','approved-investor'][index]&&row.sharedIdentitySignupVerified===false
      &&time(row.startedAt)&&time(row.finishedAt)&&Date.parse(row.startedAt)>=prior&&Date.parse(row.finishedAt)>=Date.parse(row.startedAt)
      &&Date.parse(row.finishedAt)<=end,'s418-native-case-label-time');
    hashFields(row,['receiptSha256','safeOutcomeSha256'],'s418-native-case');
    requireFact(row.positiveUiPassed===true&&row.ordinaryLogoutVerified===true&&row.callbackBoundariesVerified===true,'s418-native-case-outcome');
    prior=Date.parse(row.finishedAt);
  }
  requireFact(v.cases[0].receiptSha256!==v.cases[1].receiptSha256&&v.cases[0].safeOutcomeSha256!==v.cases[1].safeOutcomeSha256,'s418-native-distinct-cases');
  requireFact(isHash(v.nativePreservationSha256)&&isHash(v.preservationManifestSha256)&&Number.isSafeInteger(v.preservationRelationCount)&&v.preservationRelationCount>0&&v.preservationRelationCount<=512,'s418-native-preservation');
  requireFact(v.sameSubjectVerified===true&&v.cleanupComplete===true&&v.newWebsiteProfileVerified===true&&v.sharedIdentitySignupVerified===false
    &&v.productionNativePending===true&&v.productionIdentityVerified===false&&v.fullReleaseAccepted===false,'s418-native-nonclaims');
  return v;
}

/** Exact S418 producer admission; existing protectedObserver remains historical. */
export function validateProtectedSuccessorShape(d) {
  exactKeys(d,['file','sha256','payloadFile','payloadSha256','dependencyRows','scope','protocol','workerVersionId','workerBindingsSha256','workerModuleInventorySha256','hostContractSha256','backendSourceClosureSha256','nativeDeltaContractSha256','actualRelationManifestSha256','actualRelationCount'],'s418-protected-fields');
  requireFact(d.scope==='s418-protected-install-observer-v1'&&d.protocol==='isolated-staging-protected-observer-s418-v1'
    &&d.file==='.cache/S418/protected-install-successor-v1/observer.mjs'
    &&d.payloadFile==='.cache/S418/protected-install-successor-v1/host-readback.payload.py','s418-protected-fixed');
  hashFields(d,['sha256','payloadSha256','workerBindingsSha256','workerModuleInventorySha256','hostContractSha256','backendSourceClosureSha256','nativeDeltaContractSha256','actualRelationManifestSha256'],'s418-protected');
  requireFact(Number.isSafeInteger(d.actualRelationCount)&&d.actualRelationCount>0&&d.actualRelationCount<=512,'s418-actual-post-backend-relation-count');
  requireFact(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(d.workerVersionId)&&Array.isArray(d.dependencyRows)&&d.dependencyRows.length>0&&d.dependencyRows.length<=512,'s418-protected-worker-closure');
  const seen=new Set();for(const row of d.dependencyRows){exactKeys(row,['file','sha256'],'s418-protected-row');requireFact(typeof row.file==='string'&&isHash(row.sha256)&&!seen.has(row.file),'s418-protected-row-hash');seen.add(row.file);}
  return d;
}
