/** Bounded public metadata transport and run admission; imports perform no IO. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from './safe-spawn.mjs';
import { randomBytes } from 'node:crypto';
import {pathToFileURL} from 'node:url';
import { receiptIdFor } from './build-check-evidence.mjs';
import { validateStagingDeployReceipt } from './staging-deploy-receipt.mjs';
import { parseStagingDeployHistory, historyRowFor, renderStagingDeployHistory } from './staging-deploy-history.mjs';
import { buildContinuitySummary } from './staging-deploy-continuity.mjs';
import { REPOSITORY, STAGING_ORIGIN, sha256, requireFact as need, exactKeys, hashFields, isHash,
  positiveInteger, parseBoundedJson, validatePublisherPolicy, publisherCommitment, validatePreservationProjection, validateStageNative } from './isolated-staging-contract.mjs';

export const CONTRACT_FILES = Object.freeze([
  'config/isolated-staging-admission.json','scripts/lib/isolated-staging-contract.mjs',
  'scripts/lib/isolated-staging-evidence.mjs','scripts/isolated-staging-evidence.mjs',
  'scripts/lib/staging-deploy-receipt.mjs','scripts/lib/staging-deploy-history.mjs','scripts/lib/staging-deploy-continuity.mjs',
  'scripts/check-staging-deploy-receipt.mjs','scripts/check-staging-parity.mjs','scripts/build-release-proof.mjs',
  'scripts/run-release-ceremony.mjs',
  'scripts/build-staging-deploy-continuity.mjs','scripts/lib/build-check-evidence.mjs',
  'scripts/lib/shell-parity.mjs','config/csp-policy.mjs','scripts/lib/secrets.mjs',
  'api/candidate-artifact-manifest.json',
  '.github/workflows/pages-deploy.yml','.github/workflows/cloudflare-worker-deploy.yml',
  'scripts/validate-isolated-staging-workflow-inputs.mjs','scripts/run-isolated-staging-rendezvous.mjs',
  'scripts/lib/safe-spawn.mjs','scripts/lib/git-window-guard.mjs','scripts/lib/fast-node.mjs',
  'scripts/lib/windows-hide-shim.cjs','scripts/lib/cli-contract.mjs','package.json',
  'scripts/check-production-promotion-gate.mjs','scripts/run-staging-release-gate.mjs',
  'scripts/run-attention-release-gate.mjs','scripts/check-obelisk-redirect-readiness.mjs',
  'scripts/check-lane-held-asset-drift.mjs','tests/staging-release.spec.js','tests/attention-surfaces.spec.js',
  'tests/lib/tt-report-only.js','playwright.config.js','context/PRODUCTION_PROMOTION.json',
  'scripts/deploy-worker.mjs','cloudflare/security-headers-worker.js','cloudflare/wrangler.toml',
  'scripts/prune-served-surface.mjs','config/served-surface.json','sitemap.xml','agents.json','.well-known/llms.txt',
  'scripts/build-content-release-receipt.mjs','scripts/check-live-news-release.mjs',
  'scripts/production-postflight.mjs','scripts/lib/production-postflight.mjs',
]);
export const canonical = value => JSON.stringify(value);
export const REQUEST_WAIT_MS = 900000;
export function encodeMetadataPayload(value) {
  const raw=canonical(value);need(Buffer.byteLength(raw)<=49152,'metadata-public-bound');
  const payload={schemaVersion:1,kind:'isolated-staging-transport',encoding:'base64url-json',body:Buffer.from(raw).toString('base64url'),sha256:sha256(raw)};
  need(Buffer.byteLength(canonical(payload))<=65536,'metadata-wire-bound');return payload;
}
export function decodeMetadataPayload(value) {
  need(value && typeof value==='object' && Buffer.byteLength(canonical(value))<=65536,'metadata-wire-shape');
  exactKeys(value,['schemaVersion','kind','encoding','body','sha256'],'metadata-wire-fields');
  need(value.schemaVersion===1 && value.kind==='isolated-staging-transport' && value.encoding==='base64url-json'
    && typeof value.body==='string' && /^[A-Za-z0-9_-]+$/.test(value.body) && isHash(value.sha256),'metadata-wire-encoding');
  const raw=Buffer.from(value.body,'base64url');need(raw.length<=49152 && raw.toString('base64url')===value.body
    && sha256(raw)===value.sha256,'metadata-wire-bytes');
  return{raw,sha256:value.sha256};
}
const branded = new WeakMap();
const markerChecked = new WeakSet();
const protectedResults = new WeakMap();
const publishable = new WeakMap();
const nativeDescriptors = new WeakMap();
const nativeInstallPreflights = new WeakMap();
const productionContexts = new WeakMap();
const productionAuthorizations = new WeakMap();
const productionCompletions = new WeakMap();
const rollbackCaptureContexts = new WeakMap();
export function assertAdmittedContext(context, now = Date.now(), minimumSeconds = 0) {
  need(branded.has(context) && branded.get(context)===sha256(canonical(context)), 'runtime-context-not-admitted');
  validateObservation(context.observation, context.request, context.installation, now, minimumSeconds);
  return context;
}
export function readOwned(root, file, maximum = 16 * 1024 * 1024) {
  need(typeof file === 'string' && !file.includes('\\') && !path.isAbsolute(file)
    && file.split('/').every(s=>s && s !== '.' && s !== '..'), 'owned-path');
  let cursor = root;
  for (const part of file.split('/')) { cursor = path.join(cursor,part); need(!fs.lstatSync(cursor).isSymbolicLink(), 'linked-input'); }
  const stat = fs.lstatSync(cursor);
  need(stat.isFile() && stat.nlink === 1 && stat.size <= maximum, 'regular-bounded-input');
  return fs.readFileSync(cursor);
}
export function verifyFrozenSource(root, sourceCommit) {
  need(isHash(sourceCommit,40), 'git-source');
  const run = args => {
    const result = spawnSync('git', args, {cwd:root,windowsHide:true,encoding:null,maxBuffer:16*1024*1024,
      env:{...process.env,GIT_TERMINAL_PROMPT:'0',GIT_PAGER:'cat'}});
    need(result.status === 0, 'git-source-read'); return result.stdout;
  };
  need(String(run(['rev-parse','HEAD'])).trim() === sourceCommit, 'source-ref-mismatch');
  const rows=verifierSourceClosure(file=>run(['cat-file','blob',`${sourceCommit}:${file}`]));
  for(const row of rows)need(row.sha256===sha256(readOwned(root,row.file)),'later-verifier-source');
  return {sourceCommit,sourceTreeSha:String(run(['rev-parse',`${sourceCommit}^{tree}`])).trim(),verifierContractSha256:sha256(canonical(rows))};
}
/** Relative imports are resolved from raw G; local changed import text cannot prune the closure. */
export function verifierSourceClosure(readBlob) {
  const seen=new Map();
  function visit(file) {
    need(typeof file==='string'&&!file.includes('\\')&&!path.posix.isAbsolute(file)&&!file.split('/').includes('..'),'verifier-closure-path');
    if(seen.has(file))return;need(seen.size<256,'verifier-closure-bound');
    const raw=readBlob(file);need(Buffer.isBuffer(raw)&&raw.length<=16*1024*1024,'verifier-source-bound');
    seen.set(file,{file,sha256:sha256(raw)});
    const importText=raw.toString().replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
    if(/\.(?:mjs|js|cjs)$/.test(file))for(const match of importText.matchAll(/(?:from\s*|import\s*\(?\s*|require\s*\(\s*)['"](\.[^'"]+)['"]/g)) {
      visit(path.posix.normalize(path.posix.join(path.posix.dirname(file),match[1])));
    }
  }
  CONTRACT_FILES.forEach(visit);
  return [...seen.values()].sort((a,b)=>a.file.localeCompare(b.file,'en'));
}
export function validateInstallation(v, frozen, baseHistoryText, policy = null) {
  exactKeys(v,['schemaVersion','kind','repository','sourceCommit','sourceTreeSha','verifierContractSha256',
    'receipt','historyAppend','continuity','publicSafe',...(v.schemaVersion===2?['stageNative']:[])],'install-envelope-fields');
  need([1,2].includes(v.schemaVersion) && v.kind === 'isolated-staging-install-envelope' && v.repository === REPOSITORY
    && v.publicSafe === true, 'install-envelope-kind');
  for (const key of ['sourceCommit','sourceTreeSha','verifierContractSha256']) need(v[key] === frozen[key], `install-${key}`);
  const receipt = validateStagingDeployReceipt(v.receipt,{requireVerifiedRemote:true});
  need(receipt.schemaVersion === '1.1' && receipt.productionSource.commitSha === frozen.sourceCommit
    && receipt.productionSource.treeSha === frozen.sourceTreeSha, 'install-receipt-source');
  exactKeys(v.historyAppend,['baseLedgerSha256','baseHeadRowId','row'],'append-fields');
  need(v.historyAppend.baseLedgerSha256 === sha256(baseHistoryText), 'history-prefix');
  const rows = parseStagingDeployHistory(baseHistoryText), head = rows.at(-1);
  need(v.historyAppend.baseHeadRowId === (head?.rowId ?? null), 'history-predecessor');
  const expected = historyRowFor(receipt,head?.receiptId ?? null);
  need(canonical(v.historyAppend.row) === canonical(expected), 'history-row');
  need(receipt.predecessor.receiptId === (head?.receiptId ?? null), 'receipt-predecessor');
  const historyText = renderStagingDeployHistory([...rows,expected]);
  need(canonical(buildContinuitySummary(historyText,receipt)) === canonical(v.continuity), 'continuity-projection');
  if(v.schemaVersion===2)validateStageNative(v.stageNative,v,frozen,policy?.nativeProducer);
  return {receipt,historyText};
}
const REQUEST_KEYS = ['schemaVersion','kind','repository','sourceCommit','sourceTreeSha','verifierContractSha256',
  'installationDeploymentId','installationPayloadSha256','workflowRunId','workflowRunAttempt','workflowPath',
  'nonce','requestedAtEpochMs','deadlineEpochMs','publicSafe'];
export function validateRequest(v, frozen, policy, now) {
  const extra=v.schemaVersion===2?(v.phase==='staging-preflight'?['phase','workerUploadReference']:v.phase==='worker-upload-association'?['phase','stageObservation','productionRollback','productionRollbackSha256','workerUpload']:['phase','stageObservation','workerUploadReference','productionDeployment','preflightProjection']):[];
  exactKeys(v,[...REQUEST_KEYS,...extra],'request-fields');
  need([1,2].includes(v.schemaVersion) && v.kind === 'isolated-staging-observation-request' && v.publicSafe === true
    && v.repository === REPOSITORY && policy.workflowPaths.includes(v.workflowPath), 'request-scope');
  for (const key of ['sourceCommit','sourceTreeSha','verifierContractSha256']) need(v[key] === frozen[key], `request-${key}`);
  for (const key of ['installationDeploymentId','workflowRunId','workflowRunAttempt']) need(positiveInteger(v[key]), `request-${key}`);
  need(isHash(v.installationPayloadSha256) && isHash(v.nonce), 'request-hash');
  need(Number.isSafeInteger(now) && positiveInteger(v.requestedAtEpochMs) && v.requestedAtEpochMs <= now
    && v.deadlineEpochMs > now && v.deadlineEpochMs - v.requestedAtEpochMs === REQUEST_WAIT_MS, 'request-deadline');
  if(v.schemaVersion===2){
    need(['staging-preflight','worker-upload-association','production-postflight'].includes(v.phase),'request-phase');
    if(v.phase!=='staging-preflight'){exactKeys(v.stageObservation,['requestId','requestHash','observationId','observationHash'],'phase-stage-reference');
    need(positiveInteger(v.stageObservation.requestId)&&positiveInteger(v.stageObservation.observationId)&&isHash(v.stageObservation.requestHash)&&isHash(v.stageObservation.observationHash),'phase-stage-reference-values');}
    if(v.phase==='worker-upload-association'){
      need(v.workflowPath==='.github/workflows/cloudflare-worker-deploy.yml','worker-upload-workflow');
      validateWorkerUpload(v.workerUpload,v);validateRollback(v.productionRollback,v);need(v.productionRollbackSha256===sha256(canonical(v.productionRollback)),'worker-original-rollback-sha');
    }else{
      need(v.workflowPath==='.github/workflows/pages-deploy.yml','production-postflight-workflow');
      exactKeys(v.workerUploadReference,['deploymentId','payloadSha256'],'worker-upload-reference');
      need(positiveInteger(v.workerUploadReference.deploymentId)&&isHash(v.workerUploadReference.payloadSha256),'worker-upload-reference-values');
      if(v.phase==='production-postflight'){validateProductionDeploymentShape(v.productionDeployment,v.sourceCommit);validatePreflightProjection(v.preflightProjection,v);}
    }
  }
  return v;
}
function validatePreflightProjection(v,request){
 exactKeys(v,['schemaVersion','sourceCommit','sourceTreeSha','workflowRunId','workflowRunAttempt','releaseProofSha256','releaseProofGeneratedAt','ceremonySha256','ceremonyGeneratedAt','installationPayloadSha256','observationPayloadSha256','passedSteps','checks','blockers','productionNativePending','fullReleaseAccepted'],'preflight-projection-fields');
 need(v.schemaVersion===1&&v.sourceCommit===request.sourceCommit&&v.sourceTreeSha===request.sourceTreeSha&&v.workflowRunId===request.workflowRunId&&v.workflowRunAttempt===request.workflowRunAttempt&&v.installationPayloadSha256===request.installationPayloadSha256&&v.observationPayloadSha256===request.stageObservation.observationHash&&v.passedSteps===11&&v.productionNativePending===true&&v.fullReleaseAccepted===false,'preflight-projection-source');
 hashFields(v,['releaseProofSha256','ceremonySha256','installationPayloadSha256','observationPayloadSha256'],'preflight-projection');
 need(Number.isFinite(Date.parse(v.releaseProofGeneratedAt))&&Date.parse(v.releaseProofGeneratedAt)<=Date.parse(v.ceremonyGeneratedAt)&&Date.parse(v.ceremonyGeneratedAt)<=request.requestedAtEpochMs
  &&v.checks&&typeof v.checks==='object'&&!Array.isArray(v.checks)&&Object.keys(v.checks).length<=32&&Object.values(v.checks).every(x=>typeof x==='boolean')&&Array.isArray(v.blockers)&&v.blockers.length<=64&&v.blockers.every(x=>typeof x==='string'&&/^[a-zA-Z0-9:_-]{1,128}$/.test(x)),'preflight-projection-values');return v;
}
function validateRollback(v,request,requestHash=null){
 exactKeys(v,['schemaVersion','phase','sourceCommit','installationPayloadSha256','workflowRunId','workflowRunAttempt','requestNonce','requestPayloadSha256','capturedAt','worker','pages','observedPriorPair'],'rollback-fields');
 exactKeys(v.worker,['workerVersionId','workerMetadataSha256','workerBundleSha256'],'rollback-worker-fields');
 exactKeys(v.pages,['pagesDeploymentId','pagesDeploymentUrl','pagesMetadataSha256','observedSourceCommit'],'rollback-pages-fields');
 need(v.schemaVersion===1&&v.phase==='production-rollback-before-worker'&&v.sourceCommit===request.sourceCommit&&v.installationPayloadSha256===request.installationPayloadSha256&&v.observedPriorPair===true,'rollback-source');
 need(positiveInteger(v.workflowRunId)&&positiveInteger(v.workflowRunAttempt)&&isHash(v.requestNonce)&&isHash(v.requestPayloadSha256),'rollback-capture-binding');
 if(requestHash!==null)need(v.workflowRunId===request.workflowRunId&&v.workflowRunAttempt===request.workflowRunAttempt&&v.requestNonce===request.nonce&&v.requestPayloadSha256===requestHash,'rollback-current-request');
 need(/^[a-f0-9-]{36}$/.test(v.worker.workerVersionId)&&/^[a-f0-9-]{36}$/.test(v.pages.pagesDeploymentId)&&/^https:\/\/[a-f0-9]{8,32}\.vaultsparkstudios-website\.pages\.dev$/.test(v.pages.pagesDeploymentUrl)&&isHash(v.pages.observedSourceCommit,40),'rollback-targets');
 hashFields(v.worker,['workerMetadataSha256','workerBundleSha256'],'rollback-worker');hashFields(v.pages,['pagesMetadataSha256'],'rollback-pages');
 need(typeof v.capturedAt==='string'&&Number.isFinite(Date.parse(v.capturedAt))&&new Date(v.capturedAt).toISOString()===v.capturedAt,'rollback-time');return v;
}
function isStagingRequest(v){return v.schemaVersion===1&&!Object.hasOwn(v,'phase')||v.schemaVersion===2&&v.phase==='staging-preflight';}
function validateWorkerUpload(v,request){
 exactKeys(v,['schemaVersion','phase','environment','sourceCommit','sourceTreeSha','runId','runAttempt','installationPayloadSha256',
  'workerVersionId','workerMetadataSha256','workerBundleSha256','observedAt','workerUploadAssociated'],'worker-upload-fields');
 need(v.schemaVersion===1&&v.phase==='production-worker-upload'&&v.environment==='production'&&v.workerUploadAssociated===true
  &&v.sourceCommit===request.sourceCommit&&v.sourceTreeSha===request.sourceTreeSha&&v.runId===request.workflowRunId&&v.runAttempt===request.workflowRunAttempt
  &&v.installationPayloadSha256===request.installationPayloadSha256&&/^[a-f0-9-]{36}$/.test(v.workerVersionId),'worker-upload-association');
 hashFields(v,['workerMetadataSha256','workerBundleSha256'],'worker-upload');
 need(typeof v.observedAt==='string'&&Number.isFinite(Date.parse(v.observedAt))&&new Date(v.observedAt).toISOString()===v.observedAt
  &&Date.parse(v.observedAt)<=request.requestedAtEpochMs,'worker-upload-time');return v;
}
function validateProductionDeploymentShape(v,G){
 exactKeys(v,['sourceCommit','workerVersionId','workerBundleSha256','workerMetadataSha256','applicationInventorySha256',
  'pagesDeploymentId','pagesDeploymentUrl','pagesMetadataSha256','authInputClosureSha256'],'production-deployment-fields');
 need(v.sourceCommit===G&&/^[a-f0-9-]{36}$/.test(v.workerVersionId)&&typeof v.pagesDeploymentId==='string'&&/^[a-f0-9-]{36}$/.test(v.pagesDeploymentId)
  &&typeof v.pagesDeploymentUrl==='string'&&/^https:\/\/[a-f0-9]{8,32}\.vaultsparkstudios-website\.pages\.dev$/.test(v.pagesDeploymentUrl),'production-deployment-source');
 hashFields(v,['workerBundleSha256','workerMetadataSha256','applicationInventorySha256','pagesMetadataSha256','authInputClosureSha256'],'production-deployment');return v;
}
export function makeRequest(frozen, policy, run, parent, now) {
  validatePublisherPolicy(policy);
  need(run.head_sha === frozen.sourceCommit && policy.workflowPaths.includes(run.path) && run.event === 'workflow_dispatch'
    && positiveInteger(run.id) && positiveInteger(run.run_attempt), 'workflow-context');
  const request=validateRequest({schemaVersion:1,kind:'isolated-staging-observation-request',repository:REPOSITORY,...frozen,
    installationDeploymentId:parent.id,installationPayloadSha256:parent.sha256,workflowRunId:run.id,workflowRunAttempt:run.run_attempt,
    workflowPath:run.path,nonce:randomBytes(32).toString('hex'),requestedAtEpochMs:now,deadlineEpochMs:now+REQUEST_WAIT_MS,publicSafe:true},frozen,policy,now);
  publishable.set(request,sha256(canonical(request)));return request;
}
export async function makeStagingRequest(root,api,frozen,policy,run,parent,installation,workerUploadReference,now=Date.now()){
 const basic=makeRequest(frozen,policy,run,parent,now);
 if(installation.schemaVersion!==2||run.path!=='.github/workflows/pages-deploy.yml'){
  need(workerUploadReference===null,'staging-unexpected-worker-reference');return basic;
 }
 need(workerUploadReference,'native-pages-worker-reference-required');
 await validateWorkerUploadRecord({api,policy,frozen,installationId:parent.id,installationHash:parent.sha256,workerUploadReference,baseHistoryText:String(readOwned(root,'data/staging-deploy-history.ndjson'))});
 const request={...basic,schemaVersion:2,phase:'staging-preflight',workerUploadReference};validateRequest(request,frozen,policy,now);publishable.set(request,sha256(canonical(request)));return request;
}
const OBSERVATION_KEYS = ['schemaVersion','kind','repository','sourceCommit','sourceTreeSha','verifierContractSha256',
  'requestDeploymentId','requestPayloadSha256','nonce','workflowRunId','workflowRunAttempt','installationDeploymentId',
  'installationPayloadSha256','observerContractSha256','observerClosureSha256','installReceiptSha256','postReceiptSha256',
  'observedAtEpochMs','captureStartedAtEpochMs','captureExpiresAtEpochMs','effectiveExpiresAtEpochMs','stageManifestSha256',
  'workerProofObservedAtEpochMs','workerProofExpiresAtEpochMs',
  'postAdmissionStartedAtEpochMs',
  'fullInventorySha256','stableBracketSha256','opaquePreservation','preservationProjection','publicSafe'];
function validateStageObservationFacts(v, request, installation, now, minimumSeconds = 0) {
  exactKeys(v,[...OBSERVATION_KEYS,...(v.schemaVersion===2?['phase','productionRollback','productionRollbackParent','envelopeCompletedAtEpochMs']:[])],'observation-fields');
  need([1,2].includes(v.schemaVersion) && v.kind === 'isolated-staging-run-observation' && v.publicSafe === true && v.repository === REPOSITORY,'observation-scope');
  if(v.schemaVersion===2)need(v.phase==='staging-preflight','observation-stage-phase');
  for (const key of ['sourceCommit','sourceTreeSha','verifierContractSha256','nonce','workflowRunId','workflowRunAttempt',
    'installationDeploymentId','installationPayloadSha256']) need(v[key] === request[key], `observation-${key}`);
  hashFields(v,['requestPayloadSha256','observerContractSha256','observerClosureSha256','installReceiptSha256',
    'postReceiptSha256','stageManifestSha256','fullInventorySha256','stableBracketSha256'],'observation');
  need(positiveInteger(v.requestDeploymentId), 'observation-request-id');
  need(Number.isFinite(minimumSeconds) && minimumSeconds >= 0 && Number.isSafeInteger(now), 'observation-clock');
  for (const key of ['observedAtEpochMs','captureStartedAtEpochMs','captureExpiresAtEpochMs','effectiveExpiresAtEpochMs','workerProofObservedAtEpochMs','workerProofExpiresAtEpochMs','postAdmissionStartedAtEpochMs']) need(positiveInteger(v[key]), `observation-${key}`);
  need(v.captureExpiresAtEpochMs === v.captureStartedAtEpochMs+1800000
    && v.captureStartedAtEpochMs <= v.observedAtEpochMs && v.observedAtEpochMs >= request.requestedAtEpochMs
    && v.observedAtEpochMs <= request.deadlineEpochMs && v.observedAtEpochMs <= now
    && v.workerProofExpiresAtEpochMs === v.workerProofObservedAtEpochMs+600000
    && v.workerProofObservedAtEpochMs>=request.requestedAtEpochMs && v.workerProofObservedAtEpochMs<=v.observedAtEpochMs
    && v.postAdmissionStartedAtEpochMs>=v.workerProofObservedAtEpochMs && v.postAdmissionStartedAtEpochMs<=v.observedAtEpochMs
    && v.captureExpiresAtEpochMs-v.postAdmissionStartedAtEpochMs>=300000
    && v.workerProofExpiresAtEpochMs-v.postAdmissionStartedAtEpochMs>=300000
    && v.effectiveExpiresAtEpochMs === Math.min(v.captureExpiresAtEpochMs,v.workerProofExpiresAtEpochMs) && v.effectiveExpiresAtEpochMs > now
    && v.effectiveExpiresAtEpochMs-now >= minimumSeconds*1000, 'observation-lifetime');
  const r = installation.receipt;
  if(installation.schemaVersion===2)need(v.captureStartedAtEpochMs>=Date.parse(installation.stageNative.finishedAt),'native-current-capture-after-journeys');
  need(v.installReceiptSha256 === r.installationEvidence.installReceiptSha256 && v.postReceiptSha256 === r.installationEvidence.postReceiptSha256
    && v.stageManifestSha256 === r.stageVariant.rawManifestSha256 && v.fullInventorySha256 === r.stageVariant.fullInventorySha256, 'observation-installed-association');
  exactKeys(v.opaquePreservation,['relationCount','beforeProjectionSha256','afterProjectionSha256'],'opaque-preservation-fields');
  need(v.opaquePreservation.relationCount === 21 && isHash(v.opaquePreservation.beforeProjectionSha256)
    && v.opaquePreservation.beforeProjectionSha256 === v.opaquePreservation.afterProjectionSha256, 'opaque-21-preservation');
  validatePreservationProjection(v.preservationProjection);
  return v;
}
export function validateObservation(v,request,installation,now,minimumSeconds=0){
 validateStageObservationFacts(v,request,installation,now,minimumSeconds);
 if(installation.schemaVersion===2){
  need(v.schemaVersion===2&&v.phase==='staging-preflight','native-prepromotion-observation2-required');
  const worker=request.workflowPath==='.github/workflows/cloudflare-worker-deploy.yml';
  validateRollback(v.productionRollback,request,worker?v.requestPayloadSha256:null);
  need(positiveInteger(v.envelopeCompletedAtEpochMs)&&v.envelopeCompletedAtEpochMs>=v.observedAtEpochMs&&v.envelopeCompletedAtEpochMs<=request.deadlineEpochMs&&v.envelopeCompletedAtEpochMs<=now
    &&v.envelopeCompletedAtEpochMs<v.effectiveExpiresAtEpochMs&&Date.parse(v.productionRollback.capturedAt)<=v.envelopeCompletedAtEpochMs,'rollback-envelope-time');
  if(worker){need(v.productionRollbackParent===null&&Date.parse(v.productionRollback.capturedAt)>=request.requestedAtEpochMs,'rollback-original-worker-capture');}
  else{
   exactKeys(v.productionRollbackParent,['workerUploadDeploymentId','workerUploadPayloadSha256','originalObservationId','originalObservationHash'],'rollback-inherited-parent');
   const p=v.productionRollbackParent;need(request.schemaVersion===2&&request.phase==='staging-preflight'&&p.workerUploadDeploymentId===request.workerUploadReference.deploymentId&&p.workerUploadPayloadSha256===request.workerUploadReference.payloadSha256&&positiveInteger(p.originalObservationId)&&isHash(p.originalObservationHash),'rollback-pages-parent');
  }
 }
 return v;
}
export function validateDeployment(record, policy, role, expectedId, expectedHash, frozen) {
  need(record?.id === expectedId && record.sha === frozen.sourceCommit && record.ref === frozen.sourceCommit
    && record.environment === policy.environment, 'metadata-association');
  const expectedPublisher = ['request','finalization'].includes(role) ? policy.requestBotCommitmentSha256 : policy.publisherCommitmentSha256;
  need(publisherCommitment(record.creator) === expectedPublisher, 'metadata-publisher');
  const payload=decodeMetadataPayload(record.payload);
  return parseBoundedJson(payload.raw,expectedHash,49152);
}
/** HTTP adapter is injected for fixtures; runtime adapter never follows arbitrary URLs. */
export function githubApi(token, fetchImpl = fetch) {
  need(typeof token === 'string' && token.length > 0, 'github-capability-missing');
  return async (method, suffix, body) => {
    need(['GET','POST'].includes(method) && (/^\/deployments(?:\?sha=[a-f0-9]{40}&environment=website-isolated-staging&per_page=100&page=[1-5])?$/.test(suffix)
      || /^\/deployments\/[1-9][0-9]*$/.test(suffix) || /^\/actions\/runs\/[1-9][0-9]*$/.test(suffix)), 'github-api-scope');
    need(method === 'GET' || suffix === '/deployments', 'github-write-scope');
    const response = await fetchImpl(`https://api.github.com/repos/${REPOSITORY}${suffix}`,{method,redirect:'error',
      headers:{accept:'application/vnd.github+json','content-type':'application/json',authorization:`Bearer ${token}`,'user-agent':'VaultSpark-isolated-staging'},
      ...(body ? {body:JSON.stringify(body)} : {}),signal:AbortSignal.timeout(15000)});
    need(response.ok, 'github-api-refused');
    const bytes = await readBoundedResponse(response,1024*1024);
    return JSON.parse(bytes);
  };
}
export async function publishMetadata(api, policy, frozen, payload) {
  need(publishable.get(payload)===sha256(canonical(payload)),'publication-producer-required');
  const wire = encodeMetadataPayload(payload),text=canonical(payload);
  const record = await api('POST','/deployments',{ref:frozen.sourceCommit,environment:policy.environment,
    auto_merge:false,required_contexts:[],transient_environment:true,production_environment:false,payload:wire});
  const role = payload.kind === 'isolated-staging-observation-request' ? 'request' : payload.phase==='production-finalization'?'finalization':'observer';
  validateDeployment(record,policy,role,record.id,sha256(text),frozen);
  return {id:record.id,sha256:sha256(text)};
}
export async function admitRuntime({api, policy, frozen, installationId, installationHash, requestId, requestHash,
  observationId, observationHash, baseHistoryText, now = Date.now(), minimumSeconds = 0, runId, runAttempt}) {
  validatePublisherPolicy(policy);
  const get = (id,hash,role) => api('GET',`/deployments/${id}`).then(r=>validateDeployment(r,policy,role,id,hash,frozen));
  const installation = await get(installationId,installationHash,'observer');
  const ledger = validateInstallation(installation,frozen,baseHistoryText,policy);
  const request = await get(requestId,requestHash,'request');
  need(isStagingRequest(request),'runtime-staging-phase-required');
  // Deadline constrains creation, not transport: an already made response may be validated after deadline if evidence is still fresh.
  validateRequest(request,frozen,policy,request.requestedAtEpochMs);
  need(request.installationDeploymentId === installationId && request.installationPayloadSha256 === installationHash
    && request.workflowRunId === runId && request.workflowRunAttempt === runAttempt, 'runtime-run-parent');
  const run = await api('GET',`/actions/runs/${runId}`);
  need(run.id === runId && run.run_attempt === runAttempt && run.head_sha === frozen.sourceCommit
    && run.path === request.workflowPath && policy.workflowPaths.includes(run.path) && run.event === 'workflow_dispatch', 'runtime-workflow');
  const observation = await get(observationId,observationHash,'observer');
  need(observation.requestDeploymentId === requestId && observation.requestPayloadSha256 === requestHash
    && observation.observerContractSha256 === policy.protectedObserver.sha256
    && observation.observerClosureSha256 === sha256(canonical(policy.protectedObserver.dependencyRows)), 'runtime-observer-contract');
  validateObservation(observation,request,installation,now,minimumSeconds);
  if(installation.schemaVersion===2&&request.workflowPath==='.github/workflows/pages-deploy.yml'){
    const worker=await validateWorkerUploadRecord({api,policy,frozen,installationId,installationHash,workerUploadReference:request.workerUploadReference,baseHistoryText});
    const parent={workerUploadDeploymentId:request.workerUploadReference.deploymentId,workerUploadPayloadSha256:request.workerUploadReference.payloadSha256,originalObservationId:worker.stageObservation.observationId,originalObservationHash:worker.stageObservation.observationHash};
    need(canonical(observation.productionRollback)===canonical(worker.productionRollback)&&canonical(observation.productionRollbackParent)===canonical(parent),'native-pages-original-worker-rollback');
  }
  const context = {mode:'isolated-variant',installation,request,observation,...ledger,
    transport:{installationId,installationHash,requestId,requestHash,observationId,observationHash,runId,runAttempt}};
  if(installation.schemaVersion===2)nativeDescriptors.set(context,policy.nativeProducer);
  branded.set(context,sha256(canonical(context))); return context;
}
function nativeAuthorizationFacts(installation, installationHash) {
  need(installation.schemaVersion===2,'stage-native-installation-required');
  return {mode:'affected-auth-stage-verified',sourceCommit:installation.sourceCommit,sourceTreeSha:installation.sourceTreeSha,
    stageSealSha256:installation.receipt.stageVariant.sealSha256,stageNativeSha256:sha256(canonical(installation.stageNative)),
    installationPayloadSha256:installationHash,productionNativePending:true,fullReleaseAccepted:false};
}
export function assertProductionPostflightContext(context,now=Date.now()) {
  need(productionContexts.get(context)===sha256(canonical(context)),'production-postflight-context-not-admitted');
  need(context.request.schemaVersion===2&&context.request.phase==='production-postflight'&&now<context.request.deadlineEpochMs,'production-postflight-request-expired');
  return context;
}
export function productionPostflightAuthorization(context) {
  if(productionCompletions.get(context)!==sha256(canonical(context)))assertProductionPostflightContext(context);
  const authorization=productionAuthorizations.get(context);need(authorization,'production-postflight-historical-authorization');
  return Object.freeze({...authorization});
}
async function historicalStageAdmission(api,policy,frozen,installationId,installationHash,stageObservation,runId,runAttempt,baseHistoryText){
  const record=await api('GET',`/deployments/${stageObservation.observationId}`);
  const observed=validateDeployment(record,policy,'observer',stageObservation.observationId,stageObservation.observationHash,frozen);
  need(positiveInteger(observed.observedAtEpochMs)&&observed.observedAtEpochMs<=Date.now(),'historical-stage-time');
  // This checks the original evidence at its actual observation time only. It grants no current stage authority.
  const admittedAt=observed.schemaVersion===2?observed.envelopeCompletedAtEpochMs:observed.observedAtEpochMs;
  need(positiveInteger(admittedAt)&&admittedAt<=Date.now(),'historical-stage-envelope-time');
  const original=await admitRuntime({api,policy,frozen,installationId,installationHash,...stageObservation,baseHistoryText,now:admittedAt,runId,runAttempt});
  need(original.installation.schemaVersion===2,'historical-native-installation');
  return original;
}
export async function admitProductionPhaseRequest({api,policy,frozen,installationId,installationHash,requestId,requestHash,baseHistoryText,now=Date.now(),runId,runAttempt}){
 validatePublisherPolicy(policy);
 const request=validateDeployment(await api('GET',`/deployments/${requestId}`),policy,'request',requestId,requestHash,frozen);
 validateRequest(request,frozen,policy,now);
 need(request.schemaVersion===2&&request.phase==='production-postflight'&&request.installationDeploymentId===installationId&&request.installationPayloadSha256===installationHash
  &&request.workflowRunId===runId&&request.workflowRunAttempt===runAttempt,'production-postflight-request-parent');
 const original=await historicalStageAdmission(api,policy,frozen,installationId,installationHash,request.stageObservation,runId,runAttempt,baseHistoryText);
 need(original.observation.observedAtEpochMs<=request.requestedAtEpochMs,'production-postflight-original-stage-order');
 const workerRef=request.workerUploadReference;
 const workerRecord=validateDeployment(await api('GET',`/deployments/${workerRef.deploymentId}`),policy,'request',workerRef.deploymentId,workerRef.payloadSha256,frozen);
 validateRequest(workerRecord,frozen,policy,workerRecord.requestedAtEpochMs);
 need(workerRecord.schemaVersion===2&&workerRecord.phase==='worker-upload-association'&&workerRecord.installationDeploymentId===installationId&&workerRecord.installationPayloadSha256===installationHash
  &&workerRecord.requestedAtEpochMs<=request.requestedAtEpochMs,'production-postflight-worker-parent');
 const workerStage=await historicalStageAdmission(api,policy,frozen,installationId,installationHash,workerRecord.stageObservation,workerRecord.workflowRunId,workerRecord.workflowRunAttempt,baseHistoryText);
 need(workerStage.observation.observedAtEpochMs<=Date.parse(workerRecord.workerUpload.observedAt),'worker-upload-stage-order');
 const workerRun=await api('GET',`/actions/runs/${workerRecord.workflowRunId}`);
 need(workerRun.id===workerRecord.workflowRunId&&workerRun.run_attempt===workerRecord.workflowRunAttempt&&workerRun.head_sha===frozen.sourceCommit
  &&workerRun.path==='.github/workflows/cloudflare-worker-deploy.yml'&&workerRun.event==='workflow_dispatch','worker-upload-owning-workflow');
 for(const key of['workerVersionId','workerBundleSha256','workerMetadataSha256'])need(request.productionDeployment[key]===workerRecord.workerUpload[key],'production-postflight-worker-deployment');
 need(canonical(workerStage.observation.productionRollback)===canonical(workerRecord.productionRollback)&&workerRecord.productionRollbackSha256===sha256(canonical(workerRecord.productionRollback)),'postflight-original-rollback-association');
 const{validateProductionDeployment,validateProductionPreflight}=await import('./production-postflight.mjs');validateProductionDeployment(request.productionDeployment,frozen.sourceCommit);validateProductionPreflight(request.preflightProjection,frozen.sourceCommit,runId,runAttempt);
 const context={mode:'production-postflight',installation:original.installation,receipt:original.receipt,request,
  historicalStagePreflight:{observationId:request.stageObservation.observationId,observationHash:request.stageObservation.observationHash,observedAtEpochMs:original.observation.observedAtEpochMs,effectiveExpiresAtEpochMs:original.observation.effectiveExpiresAtEpochMs,currentEvidenceRenewed:false},
  workerUpload:workerRecord.workerUpload,productionRollback:workerRecord.productionRollback,transport:{installationId,installationHash,requestId,requestHash,runId,runAttempt}};
 productionContexts.set(context,sha256(canonical(context)));productionAuthorizations.set(context,nativeAuthorizationFacts(original.installation,installationHash));return context;
}
function stageReference(context){return{requestId:context.transport.requestId,requestHash:context.transport.requestHash,observationId:context.transport.observationId,observationHash:context.transport.observationHash};}
function phaseRequest(frozen,policy,run,parent,phase,stageObservation,fields,now){
 const basic=makeRequest(frozen,policy,run,parent,now),request={...basic,schemaVersion:2,phase,stageObservation,...fields};
 validateRequest(request,frozen,policy,now);publishable.set(request,sha256(canonical(request)));return request;
}
export async function makeWorkerUploadRequest(root,policy,frozen,context){
 assertAdmittedContext(context);stageNativeAuthorization(context);
 need(context.request.workflowPath==='.github/workflows/cloudflare-worker-deploy.yml'&&context.installation.sourceCommit===frozen.sourceCommit,'worker-upload-owning-context');
 const{captureProductionWorkerUpload,assertProductionWorkerUpload}=await import('./production-postflight.mjs');
 const productionRollback=productionRollbackAuthorization(context);
 const workerUpload=assertProductionWorkerUpload(await captureProductionWorkerUpload(root,context));
 need(Date.parse(productionRollback.capturedAt)<=Date.parse(workerUpload.observedAt),'rollback-before-worker-upload');
 return phaseRequest(frozen,policy,{id:context.request.workflowRunId,run_attempt:context.request.workflowRunAttempt,head_sha:frozen.sourceCommit,path:context.request.workflowPath,event:'workflow_dispatch'},
  {id:context.transport.installationId,sha256:context.transport.installationHash},'worker-upload-association',stageReference(context),{productionRollback,productionRollbackSha256:sha256(canonical(productionRollback)),workerUpload},Date.now());
}
export async function makeProductionPostflightRequest(root,api,policy,frozen,original,workerUploadReference){
 // original is historically admitted from its actual metadata, never an imported passed receipt.
 need(branded.get(original)===sha256(canonical(original))&&original.installation.schemaVersion===2&&original.request.workflowPath==='.github/workflows/pages-deploy.yml','postflight-original-stage-context');
 const ref=workerUploadReference;exactKeys(ref,['deploymentId','payloadSha256'],'worker-upload-reference');
 const workerRecord=await validateWorkerUploadRecord({api,policy,frozen,installationId:original.transport.installationId,installationHash:original.transport.installationHash,workerUploadReference:ref,baseHistoryText:String(readOwned(root,'data/staging-deploy-history.ndjson'))});
 need(workerRecord.schemaVersion===2&&workerRecord.phase==='worker-upload-association'&&workerRecord.installationDeploymentId===original.transport.installationId&&workerRecord.installationPayloadSha256===original.transport.installationHash,'postflight-worker-original-install');
 const{captureProductionPagesDeployment,assertProductionPagesDeployment,captureProductionPreflight,assertProductionPreflight}=await import('./production-postflight.mjs');
 const preflightProjection=assertProductionPreflight(await captureProductionPreflight(root,original));
 const productionDeployment=assertProductionPagesDeployment(await captureProductionPagesDeployment(root,original,workerRecord.workerUpload));
 return phaseRequest(frozen,policy,{id:original.request.workflowRunId,run_attempt:original.request.workflowRunAttempt,head_sha:frozen.sourceCommit,path:original.request.workflowPath,event:'workflow_dispatch'},
  {id:original.transport.installationId,sha256:original.transport.installationHash},'production-postflight',stageReference(original),{workerUploadReference:ref,productionDeployment,preflightProjection},Date.now());
}
export async function validateWorkerUploadRecord({api,policy,frozen,installationId,installationHash,workerUploadReference,baseHistoryText}){
 exactKeys(workerUploadReference,['deploymentId','payloadSha256'],'worker-upload-reference');
 const r=validateDeployment(await api('GET',`/deployments/${workerUploadReference.deploymentId}`),policy,'request',workerUploadReference.deploymentId,workerUploadReference.payloadSha256,frozen);
 validateRequest(r,frozen,policy,r.requestedAtEpochMs);
 need(r.schemaVersion===2&&r.phase==='worker-upload-association'&&r.installationDeploymentId===installationId&&r.installationPayloadSha256===installationHash,'worker-upload-fixed-parent');
 const original=await historicalStageAdmission(api,policy,frozen,installationId,installationHash,r.stageObservation,r.workflowRunId,r.workflowRunAttempt,baseHistoryText);
 need(canonical(original.observation.productionRollback)===canonical(r.productionRollback)&&r.productionRollbackSha256===sha256(canonical(r.productionRollback)),'worker-upload-original-rollback');
 need(Date.parse(r.productionRollback.capturedAt)<=Date.parse(r.workerUpload.observedAt),'worker-upload-after-original-rollback');
 return r;
}
export async function checkProductionWorkerUpload(root,api,policy,frozen,parent,ref){
 const r=await validateWorkerUploadRecord({api,policy,frozen,installationId:parent.id,installationHash:parent.sha256,workerUploadReference:ref,baseHistoryText:String(readOwned(root,'data/staging-deploy-history.ndjson'))});
 const{readProductionWorker}=await import('./production-postflight.mjs');const actual=await readProductionWorker(r.workerUpload);
 return{sourceCommit:frozen.sourceCommit,workerUploadDeploymentId:ref.deploymentId,workerUploadPayloadSha256:ref.payloadSha256,...actual,providerReadbackVerified:true,observedAt:new Date().toISOString(),nativeProductionVerified:false};
}
export async function loadHistoricalStageContext(root,file,expectedHash,api,policy,frozen){
 const refs=parseBoundedJson(readOwned(root,file,65536),expectedHash);
 exactKeys(refs,['schemaVersion','sourceCommit','transport'],'runtime-reference-fields');
 need(refs.schemaVersion===1&&refs.sourceCommit===frozen.sourceCommit,'historical-stage-reference-source');
 exactKeys(refs.transport,['installationId','installationHash','requestId','requestHash','observationId','observationHash','runId','runAttempt'],'runtime-reference-transport');
 const t=refs.transport;
 return historicalStageAdmission(api,policy,frozen,t.installationId,t.installationHash,{requestId:t.requestId,requestHash:t.requestHash,observationId:t.observationId,observationHash:t.observationHash},t.runId,t.runAttempt,String(readOwned(root,'data/staging-deploy-history.ndjson')));
}
const POSTFLIGHT_OUTPUTS=Object.freeze(['api/identity-migration-receipt.json','api/promotion-receipt.json','api/release-proof.json']);
function validateProductionResult(v,request){
 exactKeys(v,['schemaVersion','environment','sourceCommit','sourceTreeSha','runId','runAttempt','installationPayloadSha256','startedAt','finishedAt',
  'journeySha256','identityReceiptSha256','releaseProofSha256','promotionReceiptSha256','associationSha256','applicationInventorySha256','overlayPathSetSha256',
  'allFiveLegsPassed','approvedInvestorObserved','cleanupComplete','metadataPublicationPending','fullReleaseAccepted'],'production-result-fields');
 need(v.schemaVersion===1&&v.environment==='production'&&v.sourceCommit===request.sourceCommit&&v.sourceTreeSha===request.sourceTreeSha
  &&v.runId===request.workflowRunId&&v.runAttempt===request.workflowRunAttempt&&v.installationPayloadSha256===request.installationPayloadSha256,'production-result-source');
 hashFields(v,['journeySha256','identityReceiptSha256','releaseProofSha256','promotionReceiptSha256','associationSha256','applicationInventorySha256','overlayPathSetSha256'],'production-result');
 need(v.associationSha256===sha256(canonical(request.productionDeployment))&&v.applicationInventorySha256===request.productionDeployment.applicationInventorySha256
  &&v.overlayPathSetSha256===sha256(canonical(POSTFLIGHT_OUTPUTS)),'production-result-association');
 need(Number.isFinite(Date.parse(v.startedAt))&&Date.parse(v.startedAt)>=request.requestedAtEpochMs&&Date.parse(v.finishedAt)>=Date.parse(v.startedAt)
  &&Date.parse(v.finishedAt)<=request.deadlineEpochMs,'production-result-time');
 need(v.allFiveLegsPassed===true&&v.approvedInvestorObserved===true&&v.cleanupComplete===true&&v.metadataPublicationPending===true&&v.fullReleaseAccepted===false,'production-result-prepared-only');return v;
}
function decodeProductionOutputs(rows,result){
 need(Array.isArray(rows)&&rows.length===3&&rows.map(r=>r.file).join('\0')===POSTFLIGHT_OUTPUTS.join('\0'),'production-output-paths');
 const hashes={'api/identity-migration-receipt.json':result.identityReceiptSha256,'api/promotion-receipt.json':result.promotionReceiptSha256,'api/release-proof.json':result.releaseProofSha256};
 return rows.map(r=>{exactKeys(r,['file','encoding','body','sha256'],'production-output-row');need(r.encoding==='base64url-json'&&typeof r.body==='string'&&/^[A-Za-z0-9_-]+$/.test(r.body)&&r.sha256===hashes[r.file],'production-output-encoding');
  const raw=Buffer.from(r.body,'base64url');need(raw.length>0&&raw.length<=32768&&raw.toString('base64url')===r.body&&sha256(raw)===r.sha256,'production-output-raw');
  const json=parseBoundedJson(raw,r.sha256,32768);need(json.publicSafe===true,'production-output-public-safe');return{file:r.file,bytes:raw,sha256:r.sha256};});
}
function validatePostflightObservation(v,request,requestId,requestHash,policy,now=Date.now()){
 exactKeys(v,['schemaVersion','kind','repository','sourceCommit','sourceTreeSha','verifierContractSha256','phase','requestDeploymentId','requestPayloadSha256',
  'nonce','workflowRunId','workflowRunAttempt','installationDeploymentId','installationPayloadSha256','producerContractSha256','producerClosureSha256','observedAtEpochMs','productionPostflight','productionOutputs','publicSafe'],'production-observation-fields');
 need(v.schemaVersion===2&&v.kind==='isolated-staging-run-observation'&&v.repository===REPOSITORY&&v.phase==='production-postflight'&&v.publicSafe===true
  &&v.requestDeploymentId===requestId&&v.requestPayloadSha256===requestHash,'production-observation-kind');
 for(const k of['sourceCommit','sourceTreeSha','verifierContractSha256','nonce','workflowRunId','workflowRunAttempt','installationDeploymentId','installationPayloadSha256'])need(v[k]===request[k],'production-observation-request');
 const d=policy.productionPostflightProducer;need(d&&v.producerContractSha256===d.sha256&&v.producerClosureSha256===sha256(canonical(d.dependencyRows)),'production-observation-producer');
 need(positiveInteger(v.observedAtEpochMs)&&v.observedAtEpochMs>=request.requestedAtEpochMs&&v.observedAtEpochMs<=request.deadlineEpochMs&&v.observedAtEpochMs<=now,'production-observation-time');
 validateProductionResult(v.productionPostflight,request);need(Date.parse(v.productionPostflight.finishedAt)<=v.observedAtEpochMs,'production-observation-finish');decodeProductionOutputs(v.productionOutputs,v.productionPostflight);return v;
}
export function validateProductionProducerDescriptor(root,d){
 exactKeys(d,['schemaVersion','scope','file','sha256','exportName','assertExportName','dependencyRows'],'production-producer-descriptor');
 need(d.schemaVersion===1&&d.scope==='production-native-postflight-factory-v1'&&d.file==='scripts/verify-provider-journey.mjs'
  &&d.exportName==='runProductionPostflight'&&d.assertExportName==='assertProductionPostflightResult','production-producer-fixed');
 need(Array.isArray(d.dependencyRows)&&d.dependencyRows.length>0&&d.dependencyRows.length<=512,'production-producer-dependencies');
 const seen=new Set();for(const r of d.dependencyRows){exactKeys(r,['file','sha256'],'production-producer-row');
  const prefix='../vaultspark-studio-ops/';
  const raw=r.file.startsWith(prefix+'scripts/')?readOwned(path.resolve(root,prefix),r.file.slice(prefix.length)):readOwned(root,r.file);
  need(!seen.has(r.file)&&isHash(r.sha256)&&sha256(raw)===r.sha256,'production-producer-row-bytes');seen.add(r.file);}
 need(d.dependencyRows.some(r=>r.file===d.file&&r.sha256===d.sha256),'production-producer-body');return d;
}
export async function invokeProductionPostflight(root,policy,context,channel){
 assertProductionPostflightContext(context);const d=validateProductionProducerDescriptor(root,policy.productionPostflightProducer);
 const factory=await import(pathToFileURL(path.resolve(root,d.file)).href);
 const result=factory.assertProductionPostflightResult(await factory.runProductionPostflight({context,channel}));validateProductionResult(result,context.request);
 const prefix=`.cache/production-postflight/${context.request.sourceCommit}/${context.request.workflowRunId}-${context.request.workflowRunAttempt}/native-live/`;
 const rows=POSTFLIGHT_OUTPUTS.map(file=>{const raw=readOwned(root,prefix+file,32768);return{file,encoding:'base64url-json',body:raw.toString('base64url'),sha256:sha256(raw)};});decodeProductionOutputs(rows,result);
 const request=context.request,v={schemaVersion:2,kind:'isolated-staging-run-observation',repository:REPOSITORY,sourceCommit:request.sourceCommit,sourceTreeSha:request.sourceTreeSha,verifierContractSha256:request.verifierContractSha256,
  phase:'production-postflight',requestDeploymentId:context.transport.requestId,requestPayloadSha256:context.transport.requestHash,nonce:request.nonce,workflowRunId:request.workflowRunId,workflowRunAttempt:request.workflowRunAttempt,
  installationDeploymentId:request.installationDeploymentId,installationPayloadSha256:request.installationPayloadSha256,producerContractSha256:d.sha256,producerClosureSha256:sha256(canonical(d.dependencyRows)),observedAtEpochMs:Date.now(),productionPostflight:result,productionOutputs:rows,publicSafe:true};
 validatePostflightObservation(v,request,context.transport.requestId,context.transport.requestHash,policy);need(Buffer.byteLength(canonical(v))<=49152,'metadata-public-bound');publishable.set(v,sha256(canonical(v)));return v;
}
export async function admitProductionPostflightObservation(options){
 const {api,policy,frozen,observationId,observationHash,now=Date.now()}=options;
 const observation=validateDeployment(await api('GET',`/deployments/${observationId}`),policy,'observer',observationId,observationHash,frozen);
 // Observation was produced within the bounded request window; later transport does not renew any stage/provider proof.
 const request=validateDeployment(await api('GET',`/deployments/${options.requestId}`),policy,'request',options.requestId,options.requestHash,frozen);
 validatePostflightObservation(observation,request,options.requestId,options.requestHash,policy,now);
 const pending=await admitProductionPhaseRequest({...options,now:observation.observedAtEpochMs});
 const completed={...pending,observation,transport:{...pending.transport,observationId,observationHash}};
 productionCompletions.set(completed,sha256(canonical(completed)));productionAuthorizations.set(completed,productionAuthorizations.get(pending));return completed;
}
export function assertProductionPostflightCompletion(context){need(productionCompletions.get(context)===sha256(canonical(context)),'production-postflight-completion-not-admitted');return context;}
export function productionPostflightOutputs(context){assertProductionPostflightCompletion(context);return decodeProductionOutputs(context.observation.productionOutputs,context.observation.productionPostflight);}
function validateFinalizationResult(v,context){
 exactKeys(v,['schemaVersion','publicSafe','environment','phase','sourceCommit','sourceTreeSha','runId','runAttempt','nativeObservationSha256','nativeFiveLegsReobserved',
  'changes','unchangedApplicationSha256','beforeInventorySha256','afterInventorySha256','productionReadbackVerified','fullInventoryBytesObserved','wholeDistPreserved','fullRemoteAuthClosureObserved',
  'worker','pages','observedAt','composite','workerRedeployed','readbackBudget','metadataPublicationPending','fullReleaseAccepted'],'finalization-result-fields');
 const r=context.request;
 need(v.schemaVersion===1&&v.publicSafe===true&&v.environment==='production'&&v.phase==='production-metadata-finalization'&&v.sourceCommit===r.sourceCommit&&v.sourceTreeSha===r.sourceTreeSha&&v.runId===r.workflowRunId&&v.runAttempt===r.workflowRunAttempt&&v.nativeObservationSha256===context.transport.observationHash,'finalization-result-source');
 need(v.nativeFiveLegsReobserved===false&&v.productionReadbackVerified===true&&v.fullInventoryBytesObserved===false&&v.wholeDistPreserved===true&&v.fullRemoteAuthClosureObserved===true&&v.workerRedeployed===false&&v.metadataPublicationPending===false&&v.fullReleaseAccepted===true&&v.composite==='source-G-plus-three-production-observation-JSON-rows','finalization-result-facts');
 hashFields(v,['unchangedApplicationSha256','beforeInventorySha256','afterInventorySha256','nativeObservationSha256'],'finalization-result');
 need(v.beforeInventorySha256===r.productionDeployment.applicationInventorySha256&&Array.isArray(v.changes)&&v.changes.length<=3&&new Set(v.changes.map(x=>x.file)).size===v.changes.length,'finalization-inventory');
 for(const row of v.changes){exactKeys(row,['file','beforeSha256','afterSha256'],'finalization-delta-fields');need(POSTFLIGHT_OUTPUTS.includes(row.file),'finalization-delta-path');hashFields(row,['beforeSha256','afterSha256'],'finalization-delta');}
 exactKeys(v.worker,['workerVersionId','workerMetadataSha256','workerBundleSha256'],'finalization-worker');
 for(const k of Object.keys(v.worker))need(v.worker[k]===r.productionDeployment[k],'finalization-worker-association');
 exactKeys(v.pages,['pagesDeploymentId','pagesDeploymentUrl','pagesMetadataSha256'],'finalization-pages');
 need(/^[a-f0-9-]{36}$/.test(v.pages.pagesDeploymentId)&&/^https:\/\/[a-f0-9]{8,32}\.vaultsparkstudios-website\.pages\.dev$/.test(v.pages.pagesDeploymentUrl)&&isHash(v.pages.pagesMetadataSha256),'finalization-pages-values');
 exactKeys(v.readbackBudget,['requests','bytes','activeElapsedMs','maxRequests','maxBytes','maxActiveElapsedMs'],'finalization-readback-budget');
 need(v.readbackBudget.maxRequests===128&&v.readbackBudget.maxBytes===33554432&&v.readbackBudget.maxActiveElapsedMs===120000
  &&['requests','bytes','activeElapsedMs'].every(k=>Number.isSafeInteger(v.readbackBudget[k])&&v.readbackBudget[k]>=0)
  &&v.readbackBudget.requests<=128&&v.readbackBudget.bytes<=33554432&&v.readbackBudget.activeElapsedMs<=120000,'finalization-readback-budget-values');
 need(Number.isFinite(Date.parse(v.observedAt))&&Date.parse(v.observedAt)>=context.observation.observedAtEpochMs&&Date.parse(v.observedAt)<=Date.now(),'finalization-observed-time');return v;
}
export async function makeProductionFinalizationObservation(root,context){
 assertProductionPostflightCompletion(context);
 const{finalizeProductionMetadata,assertProductionMetadataFinalization}=await import('./production-postflight.mjs');
 const result=assertProductionMetadataFinalization(await finalizeProductionMetadata(root,context));validateFinalizationResult(result,context);
 const r=context.request,value={schemaVersion:2,kind:'isolated-staging-run-observation',repository:REPOSITORY,sourceCommit:r.sourceCommit,sourceTreeSha:r.sourceTreeSha,verifierContractSha256:r.verifierContractSha256,
  phase:'production-finalization',requestDeploymentId:context.transport.requestId,requestPayloadSha256:context.transport.requestHash,nonce:r.nonce,workflowRunId:r.workflowRunId,workflowRunAttempt:r.workflowRunAttempt,
  installationDeploymentId:r.installationDeploymentId,installationPayloadSha256:r.installationPayloadSha256,parentObservationId:context.transport.observationId,parentObservationSha256:context.transport.observationHash,
  observedAtEpochMs:Date.now(),finalization:result,publicSafe:true};
 need(Buffer.byteLength(canonical(value))<=49152,'metadata-public-bound');publishable.set(value,sha256(canonical(value)));return value;
}
export function validateProductionFinalization(record,policy,frozen,id,hash,context,now=Date.now()){
 assertProductionPostflightCompletion(context);const v=validateDeployment(record,policy,'finalization',id,hash,frozen),r=context.request;
 exactKeys(v,['schemaVersion','kind','repository','sourceCommit','sourceTreeSha','verifierContractSha256','phase','requestDeploymentId','requestPayloadSha256','nonce','workflowRunId','workflowRunAttempt','installationDeploymentId','installationPayloadSha256','parentObservationId','parentObservationSha256','observedAtEpochMs','finalization','publicSafe'],'finalization-observation-fields');
 need(v.schemaVersion===2&&v.kind==='isolated-staging-run-observation'&&v.repository===REPOSITORY&&v.phase==='production-finalization'&&v.publicSafe===true&&v.parentObservationId===context.transport.observationId&&v.parentObservationSha256===context.transport.observationHash&&v.requestDeploymentId===context.transport.requestId&&v.requestPayloadSha256===context.transport.requestHash,'finalization-observation-parent');
 for(const k of['sourceCommit','sourceTreeSha','verifierContractSha256','nonce','workflowRunId','workflowRunAttempt','installationDeploymentId','installationPayloadSha256'])need(v[k]===r[k],'finalization-observation-source');
 validateFinalizationResult(v.finalization,context);need(positiveInteger(v.observedAtEpochMs)&&v.observedAtEpochMs>=Date.parse(v.finalization.observedAt)&&v.observedAtEpochMs<=now,'finalization-observation-time');return v;
}
export async function loadProductionPostflightContext(root,file,expectedHash,{api,now=Date.now()}={}){
 const refs=parseBoundedJson(readOwned(root,file,65536),expectedHash);
 exactKeys(refs,['schemaVersion','phase','sourceCommit','transport'],'production-context-reference');
 need(refs.schemaVersion===2&&refs.phase==='production-postflight','production-context-reference-phase');
 exactKeys(refs.transport,['installationId','installationHash','requestId','requestHash','observationId','observationHash','runId','runAttempt'],'production-context-transport');
 const frozen=verifyFrozenSource(root,refs.sourceCommit),policy=validatePublisherPolicy(JSON.parse(readOwned(root,'config/isolated-staging-admission.json')));
 const admit=client=>admitProductionPostflightObservation({api:client,policy,frozen,...refs.transport,baseHistoryText:String(readOwned(root,'data/staging-deploy-history.ndjson')),now});
 if(api)return admit(api);
 if(process.env.GITHUB_ACTIONS==='true'){
  need(process.env.GITHUB_SHA===frozen.sourceCommit&&Number(process.env.GITHUB_RUN_ID)===refs.transport.runId&&Number(process.env.GITHUB_RUN_ATTEMPT)===refs.transport.runAttempt,'ci-execution-context');
  const{getSecret}=await import('./secrets.mjs');return admit(githubApi(getSecret('GITHUB_TOKEN','github.api')));
 }
 validateObserverDescriptor(root,policy.protectedObserver);
 need(policy.protectedObserver.dependencyRows.some(r=>r.file==='../vaultspark-studio-ops/scripts/lib/github-broker.mjs'),'github-broker-not-pinned');
 const{withGithubToken}=await import(pathToFileURL(path.resolve(root,'../vaultspark-studio-ops/scripts/lib/github-broker.mjs')).href);
 return withGithubToken('isolated-staging-production-postflight-read',token=>admit(githubApi(token)),{params:{repository:REPOSITORY,sourceCommit:frozen.sourceCommit}});
}
export function stageNativeAuthorization(context) {
  assertAdmittedContext(context);need(markerChecked.has(context),'stage-native-current-marker-required');
  need(isStagingRequest(context.request),'stage-native-preflight-phase-required');
  validateStageNative(context.installation.stageNative,context.installation,context.installation,nativeDescriptors.get(context));
  productionRollbackAuthorization(context);
  return Object.freeze(nativeAuthorizationFacts(context.installation,context.transport.installationHash));
}
export function productionRollbackAuthorization(context){
 assertAdmittedContext(context);need(markerChecked.has(context)&&context.installation.schemaVersion===2&&context.observation.schemaVersion===2,'current-native-original-rollback-required');
 return structuredClone(context.observation.productionRollback);
}
export function assertProductionRollbackCaptureContext(context){need(rollbackCaptureContexts.get(context)===sha256(canonical(context)),'rollback-owned-capture-seed-required');return context;}
export function productionRollbackCaptureAuthorization(context){
 assertProductionRollbackCaptureContext(context);const r=context.request;
 return{sourceCommit:r.sourceCommit,installationPayloadSha256:r.installationPayloadSha256,workflowRunId:r.workflowRunId,workflowRunAttempt:r.workflowRunAttempt,requestNonce:r.nonce,requestPayloadSha256:context.transport.requestHash};
}
/** Read-only post-deployment association, not current stage admission or permission to deploy. */
export function historicalStagePreflightAuthorization(context) {
  need(branded.get(context)===sha256(canonical(context))&&isStagingRequest(context.request),'historical-stage-preflight-required');
  validateStageNative(context.installation.stageNative,context.installation,context.installation,nativeDescriptors.get(context));
  validateObservation(context.observation,context.request,context.installation,context.observation.schemaVersion===2?context.observation.envelopeCompletedAtEpochMs:context.observation.observedAtEpochMs);
  return Object.freeze(nativeAuthorizationFacts(context.installation,context.transport.installationHash));
}
export function stageNativeInstallationAuthorization(preflight) {
  need(nativeInstallPreflights.get(preflight)===sha256(canonical(preflight)),'stage-native-install-preflight-required');
  return Object.freeze({...nativeAuthorizationFacts(preflight.installation,preflight.installationHash),earlyEligibleOnly:true,currentObservationRequired:true});
}
export async function admitNativeInstallation({api,policy,frozen,installationId,installationHash,baseHistoryText,runId,runAttempt}) {
  validatePublisherPolicy(policy);need(positiveInteger(installationId)&&isHash(installationHash),'native-install-reference');
  const installation=validateDeployment(await api('GET',`/deployments/${installationId}`),policy,'observer',installationId,installationHash,frozen);
  validateInstallation(installation,frozen,baseHistoryText,policy);need(installation.schemaVersion===2,'stage-native-installation-required');
  need(positiveInteger(runId)&&positiveInteger(runAttempt),'native-install-run');
  const run=await api('GET',`/actions/runs/${runId}`);
  need(run.id===runId&&run.run_attempt===runAttempt&&run.head_sha===frozen.sourceCommit&&policy.workflowPaths.includes(run.path)&&run.event==='workflow_dispatch','native-install-workflow');
  const result={mode:'native-install-preflight',installation,installationId,installationHash};
  nativeInstallPreflights.set(result,sha256(canonical(result)));return result;
}
export async function loadNativeInstallationPreflight(root,id,hash,{api}={}) {
  need(positiveInteger(id)&&isHash(hash),'native-install-reference');
  const head=spawnSync('git',['rev-parse','HEAD'],{cwd:root,windowsHide:true,encoding:'utf8',maxBuffer:1024});
  need(head.status===0,'native-install-head');const frozen=verifyFrozenSource(root,head.stdout.trim());
  const policy=validatePublisherPolicy(JSON.parse(readOwned(root,'config/isolated-staging-admission.json')));
  need(policy.nativeProducer,'native-producer-unresolved');
  const runId=Number(process.env.GITHUB_RUN_ID),runAttempt=Number(process.env.GITHUB_RUN_ATTEMPT);
  const admit=client=>admitNativeInstallation({api:client,policy,frozen,installationId:id,installationHash:hash,
    baseHistoryText:String(readOwned(root,'data/staging-deploy-history.ndjson')),runId,runAttempt});
  if(api)return admit(api);
  if(process.env.GITHUB_ACTIONS==='true'){
    need(process.env.GITHUB_SHA===frozen.sourceCommit&&positiveInteger(Number(process.env.GITHUB_RUN_ID))&&positiveInteger(Number(process.env.GITHUB_RUN_ATTEMPT)),'ci-execution-context');
    const{getSecret}=await import('./secrets.mjs');return admit(githubApi(getSecret('GITHUB_TOKEN','github.api')));
  }
  validateObserverDescriptor(root,policy.protectedObserver);
  need(policy.protectedObserver.dependencyRows.some(r=>r.file==='../vaultspark-studio-ops/scripts/lib/github-broker.mjs'),'github-broker-not-pinned');
  const{withGithubToken}=await import(pathToFileURL(path.resolve(root,'../vaultspark-studio-ops/scripts/lib/github-broker.mjs')).href);
  return withGithubToken('isolated-staging-native-install-preflight',token=>admit(githubApi(token)),{params:{repository:REPOSITORY,sourceCommit:frozen.sourceCommit}});
}
export async function findObservation(api, policy, frozen, requestId, requestHash, request) {
  const matches = [];
  for (let page=1;page<=5;page++) {
    const rows = await api('GET',`/deployments?sha=${frozen.sourceCommit}&environment=${policy.environment}&per_page=100&page=${page}`);
    need(Array.isArray(rows) && rows.length <= 100, 'metadata-list-bound');
    for (const row of rows) {
      let p,hash; try {const decoded=decodeMetadataPayload(row.payload);p=JSON.parse(decoded.raw);hash=decoded.sha256;} catch {continue;}
      if (p.kind !== 'isolated-staging-run-observation' || p.requestDeploymentId !== requestId) continue;
      if(isStagingRequest(request)?!(p.schemaVersion===1&&!Object.hasOwn(p,'phase')||p.schemaVersion===2&&p.phase==='staging-preflight'):p.phase!==request.phase)continue;
      validateDeployment(row,policy,'observer',row.id,hash,frozen);
      need(p.requestPayloadSha256 === requestHash && p.nonce === request.nonce, 'rendezvous-correlation');
      matches.push({id:row.id,sha256:hash});
    }
    if (rows.length < 100) { need(matches.length <= 1,'duplicate-observation'); return matches[0] ?? null; }
  }
  throw new Error('isolated-staging:metadata-list-truncated');
}
export async function findRequest(api, policy, frozen, selector, now=Date.now()) {
  exactKeys(selector,['workflowRunId','workflowRunAttempt','workflowPath','installationDeploymentId','installationPayloadSha256',...(Object.hasOwn(selector,'phase')?['phase']:[])],'request-selector-fields');
  if(Object.hasOwn(selector,'phase'))need(['production-postflight','worker-upload-association'].includes(selector.phase),'request-selector-phase');
  need(positiveInteger(selector.workflowRunId)&&positiveInteger(selector.workflowRunAttempt)&&positiveInteger(selector.installationDeploymentId)
    && isHash(selector.installationPayloadSha256)&&policy.workflowPaths.includes(selector.workflowPath),'request-selector');
  const run=await api('GET',`/actions/runs/${selector.workflowRunId}`);
  need(run.id===selector.workflowRunId&&run.run_attempt===selector.workflowRunAttempt&&run.head_sha===frozen.sourceCommit
    && run.path===selector.workflowPath&&run.event==='workflow_dispatch','request-selector-run');
  const matches=[];
  for(let page=1;page<=5;page++) {
    const rows=await api('GET',`/deployments?sha=${frozen.sourceCommit}&environment=${policy.environment}&per_page=100&page=${page}`);
    need(Array.isArray(rows)&&rows.length<=100,'metadata-list-bound');
    for(const row of rows) {
      let p,hash;try{const decoded=decodeMetadataPayload(row.payload);p=JSON.parse(decoded.raw);hash=decoded.sha256;}catch{continue;}
      if(p.kind!=='isolated-staging-observation-request'||p.workflowRunId!==selector.workflowRunId||p.workflowRunAttempt!==selector.workflowRunAttempt)continue;
      if(selector.phase?p.phase!==selector.phase:!isStagingRequest(p))continue;
      const request=validateDeployment(row,policy,'request',row.id,hash,frozen);
      need(request.requestedAtEpochMs<=now,'request-selector-future');
      validateRequest(request,frozen,policy,selector.phase==='worker-upload-association'?request.requestedAtEpochMs:now);
      for(const key of Object.keys(selector))need(request[key]===selector[key],'request-selector-association');
      matches.push({requestDeploymentId:row.id,requestPayloadSha256:hash});
    }
    if(rows.length<100){need(matches.length===1,matches.length?'duplicate-request':'request-unavailable');return matches[0];}
  }
  throw new Error('isolated-staging:metadata-list-truncated');
}
export function assertCurrentStageManifest(raw, context) {
  assertAdmittedContext(context);
  need(Buffer.byteLength(raw) <= 1024*1024 && sha256(raw) === context.receipt.stageVariant.rawManifestSha256,'served-manifest-bytes');
  const manifest = JSON.parse(String(raw));
  need(manifest.root === context.receipt.stageVariant.artifactRoot && manifest.leafCount === context.receipt.stageVariant.leafCount,'served-manifest-identity');
  markerChecked.add(context);
}
export function variantReadiness(context, productionManifest, sourceCommit, now = Date.now()) {
  assertAdmittedContext(context,now);
  need(markerChecked.has(context),'stage-marker-not-observed');
  const p=context.receipt.productionSource;
  need(p.commitSha === sourceCommit && p.artifactRoot === productionManifest?.root && p.leafCount === productionManifest?.leafCount,'production-manifest-association');
  return {mode:'isolated-variant',productionSourceBound:true,transformationBound:true,installedVariantBound:true,currentStageObserved:true,
    sourceCommit:p.commitSha,productionRoot:p.artifactRoot,stageVariantRoot:context.receipt.stageVariant.artifactRoot,
    observationSha256:context.transport.observationHash,expiresAtEpochMs:context.observation.effectiveExpiresAtEpochMs};
}
export function createVariantReceipt(facts) {
  const value = {schemaVersion:'1.1',mode:'isolated-variant',generatedAt:facts.generatedAt,
    generatedBy:'scripts/isolated-staging-evidence.mjs',publicSafe:true,state:'verified',
    productionSource:facts.productionSource,stageVariant:facts.stageVariant,lineage:facts.lineage,
    copiedHistoricalBuildStamp:facts.copiedHistoricalBuildStamp,installationEvidence:facts.installationEvidence,
    predecessor:facts.predecessor,rollback:facts.rollback,deploy:facts.deploy};
  value.receiptId=receiptIdFor(value); validateStagingDeployReceipt(value); return value;
}
export function validateObserverDescriptor(root, descriptor) {
  exactKeys(descriptor,['file','sha256','payloadFile','payloadSha256','dependencyRows','scope','protocol'],'observer-descriptor');
  need(descriptor.protocol === 'isolated-staging-protected-observer-v1' && /^[a-z0-9-]{1,100}$/.test(descriptor.scope), 'observer-protocol');
  need(isHash(descriptor.sha256) && isHash(descriptor.payloadSha256)
    && sha256(readOwned(root,descriptor.file)) === descriptor.sha256
    && sha256(readOwned(root,descriptor.payloadFile)) === descriptor.payloadSha256, 'observer-body');
  need(Array.isArray(descriptor.dependencyRows) && descriptor.dependencyRows.length > 0 && descriptor.dependencyRows.length <= 512,'observer-closure-bound');
  const files = new Set();
  for (const row of descriptor.dependencyRows) {
    exactKeys(row,['file','sha256'],'observer-dependency');
    const prefix='../vaultspark-studio-ops/';
    const bytes=row.file.startsWith(prefix+'scripts/') ? readOwned(path.resolve(root,prefix),row.file.slice(prefix.length)) : readOwned(root,row.file);
    need(!files.has(row.file) && isHash(row.sha256) && sha256(bytes) === row.sha256,'observer-dependency-bytes');
    files.add(row.file);
  }
  need(files.has(descriptor.file) && files.has(descriptor.payloadFile),'observer-closure-bodies');
}
export function validateNativeProducerDescriptor(root,descriptor) {
  exactKeys(descriptor,['schemaVersion','scope','file','sha256','exportName','assertExportName','dependencyRows','workerBindingsSha256','workerVersionId'],'native-producer-descriptor');
  need(descriptor.schemaVersion===1&&descriptor.scope==='selected-native-pair-factory-v4'
    &&descriptor.file==='.cache/S416/native-selected-journey-v4/paired-factory.mjs'
    &&descriptor.exportName==='executeNativePair'&&descriptor.assertExportName==='consumeNativePair'
    &&descriptor.workerVersionId==='d9bdd239-3fb7-43a3-9630-a7fe8d39922e'&&isHash(descriptor.workerBindingsSha256),'native-producer-fixed');
  need(Array.isArray(descriptor.dependencyRows)&&descriptor.dependencyRows.length>0&&descriptor.dependencyRows.length<=512,'native-producer-closure');
  const files=new Set();
  for(const r of [{file:descriptor.file,sha256:descriptor.sha256},...descriptor.dependencyRows]){
    exactKeys(r,['file','sha256'],'native-producer-row');need(isHash(r.sha256),'native-producer-row-sha');
    const prefix='../vaultspark-studio-ops/';
    const b=r.file.startsWith(prefix+'scripts/')?readOwned(path.resolve(root,prefix),r.file.slice(prefix.length)):readOwned(root,r.file);
    need(sha256(b)===r.sha256,'native-producer-source');
    if(r.file!==descriptor.file)need(!files.has(r.file),'native-producer-duplicate');files.add(r.file);
  }
  need(descriptor.dependencyRows.some(r=>r.file===descriptor.file&&r.sha256===descriptor.sha256),'native-producer-whole-body');
  return descriptor;
}
/** Base original install projection is made before the manual flows or snapshot rotation. */
export async function invokeNativeInstallProjection(root,policy,frozen,runtimeBindings,nativeRuntimeRef,channel,actorReadiness) {
  need(['chrome','msedge'].includes(channel)&&actorReadiness==='existing-authorized-actor','native-pair-readiness');
  const descriptor=validateNativeProducerDescriptor(root,policy.nativeProducer);
  exactKeys(nativeRuntimeRef,['file','sha256'],'native-pair-runtime-reference');
  need(nativeRuntimeRef.file==='.cache/S416/native-selected-journey-v4/runtime/RUNTIME_BINDING.json'&&isHash(nativeRuntimeRef.sha256),'native-pair-runtime-fixed');
  parseBoundedJson(readOwned(root,nativeRuntimeRef.file,65536),nativeRuntimeRef.sha256);
  const envelope=invokeInstallProjection(root,policy,frozen,runtimeBindings);
  const producer=await import(pathToFileURL(path.resolve(root,descriptor.file)).href);
  const execution=await producer.executeNativePair({installation:envelope,frozen,nativeDescriptor:descriptor,runtimeBinding:nativeRuntimeRef,channel,actorReadiness});
  const stageNative=producer.consumeNativePair(execution);
  validateStageNative(stageNative,envelope,frozen,descriptor);
  const combined={...envelope,schemaVersion:2,stageNative};
  validateInstallation(combined,frozen,String(readOwned(root,'data/staging-deploy-history.ndjson')),policy);
  need(Buffer.byteLength(canonical(combined))<=49152,'metadata-public-bound');
  publishable.set(combined,sha256(canonical(combined)));return combined;
}
export function validateRuntimeBindings(root, bindings) {
  exactKeys(bindings,['snapshot','sourceClosure','snapshotBinding','installationReceipt','transaction'],'runtime-binding-fields');
  const prefix='.cache/S416/parametric-staging-guards-v1/runtime/';
  const fixed={transaction:prefix+'TRANSACTION_BINDING.json',installationReceipt:prefix+'INSTALLATION_RECEIPT.json',
    snapshot:prefix+'snapshot/CURRENT_SNAPSHOT.json',sourceClosure:prefix+'snapshot/SOURCE_CLOSURE.json',
    snapshotBinding:prefix+'snapshot/CURRENT_SNAPSHOT_BINDING.json'};
  for(const key of Object.keys(fixed))need(bindings[key].file===fixed[key],'runtime-binding-fixed-path');
  for (const row of Object.values(bindings)) {
    exactKeys(row,['file','sha256'],'runtime-binding');
    need(row.file.startsWith('.cache/') && row.file.endsWith('.json') && isHash(row.sha256)
      && sha256(readOwned(root,row.file,1024*1024)) === row.sha256,'runtime-binding-bytes');
  }
}
export function invokeInstallProjection(root, policy, frozen, runtimeBindings, execute=spawnSync) {
  validatePublisherPolicy(policy);validateObserverDescriptor(root,policy.protectedObserver);validateRuntimeBindings(root,runtimeBindings);
  for (const key of ['NODE_OPTIONS','NODE_PATH','VAULTSPARK_FAST_NODE','VAULTSPARK_SECRETS_DIR_OVERRIDE','STUDIO_OPS_SECRETS_DIR']) need(!process.env[key],'observer-runtime-override');
  const result=execute(process.execPath,[path.join(root,policy.protectedObserver.file),'--canonical-install-envelope-stdin-v1'],{
    cwd:root,windowsHide:true,encoding:'utf8',timeout:330000,maxBuffer:65536,
    input:JSON.stringify({schemaVersion:1,...frozen,runtimeBindings}),env:{...process.env}});
  need(result.status===0 && typeof result.stdout==='string' && Buffer.byteLength(result.stdout)<=65536,'protected-install-projection-failed');
  const envelope=JSON.parse(result.stdout);
  validateInstallation(envelope,frozen,String(readOwned(root,'data/staging-deploy-history.ndjson')));
  need(envelope.receipt.installationEvidence.installReceiptSha256===runtimeBindings.installationReceipt.sha256,'projected-raw-install-association');
  publishable.set(envelope,sha256(canonical(envelope)));
  return envelope;
}
/** Only this invocation's actual pinned protected process can produce an observation. */
export function invokeProtectedObserver(root, policy, frozen, request, installation, runtimeBindings, execute = spawnSync) {
  validatePublisherPolicy(policy); validateObserverDescriptor(root,policy.protectedObserver);
  validateRuntimeBindings(root,runtimeBindings);
  need(runtimeBindings.installationReceipt.sha256 === installation.receipt.installationEvidence.installReceiptSha256, 'private-installation-bytes');
  for (const key of ['NODE_OPTIONS','NODE_PATH','VAULTSPARK_FAST_NODE','VAULTSPARK_SECRETS_DIR_OVERRIDE','STUDIO_OPS_SECRETS_DIR']) need(!process.env[key], 'observer-runtime-override');
  const input = {schemaVersion:1,request,installationReceipt:installation.receipt,...frozen,runtimeBindings};
  const started = Date.now();
  const result = execute(process.execPath,[path.join(root,policy.protectedObserver.file),'--canonical-observation-stdin-v1'],{
    cwd:root,encoding:'utf8',input:JSON.stringify(input),timeout:330000,maxBuffer:65536,windowsHide:true,
    env:{...process.env}});
  // Never retain or forward raw stdout/stderr on a failed process.
  need(result.status === 0 && typeof result.stdout === 'string' && Buffer.byteLength(result.stdout) <= 65536,'protected-observer-failed');
  const raw = JSON.parse(result.stdout);
  exactKeys(raw,['schemaVersion','scope','readOnly','sourceCommit','sourceTreeSha','verifierContractSha256','requestSha256',
    'installReceiptSha256','postReceiptSha256','observerClosureSha256','observedAtEpochMs','captureStartedAtEpochMs',
    'captureExpiresAtEpochMs','effectiveExpiresAtEpochMs','stageManifestSha256','fullInventorySha256','stableBracketSha256',
    'workerProofObservedAtEpochMs','workerProofExpiresAtEpochMs',
    'postAdmissionStartedAtEpochMs',
    'opaquePreservation','preservationProjection'],'protected-result-fields');
  need(raw.schemaVersion === 1 && raw.scope === policy.protectedObserver.scope && raw.readOnly === true
    && raw.requestSha256 === sha256(canonical(request)) && raw.observedAtEpochMs >= started, 'protected-result-invocation');
  for (const key of ['sourceCommit','sourceTreeSha','verifierContractSha256']) need(raw[key] === frozen[key], 'protected-result-source');
  need(raw.observerClosureSha256 === sha256(canonical(policy.protectedObserver.dependencyRows)), 'protected-result-closure');
  protectedResults.set(raw,{rawSha256:sha256(canonical(raw)),requestSha256:sha256(canonical(request)),installationSha256:sha256(canonical(installation))});
  return raw;
}
function protectedObservationBody(raw, request, requestId, requestHash, descriptor,installation) {
  const execution=protectedResults.get(raw);
  need(execution&&execution.rawSha256===sha256(canonical(raw))&&execution.requestSha256===sha256(canonical(request))&&execution.installationSha256===sha256(canonical(installation)),'protected-invocation-required');
  const {schemaVersion:_schema,scope:_scope,readOnly:_read,requestSha256:_request,...facts}=raw;
  const result={schemaVersion:1,kind:'isolated-staging-run-observation',repository:REPOSITORY,...facts,
    requestDeploymentId:requestId,requestPayloadSha256:requestHash,nonce:request.nonce,workflowRunId:request.workflowRunId,
    workflowRunAttempt:request.workflowRunAttempt,installationDeploymentId:request.installationDeploymentId,
    installationPayloadSha256:request.installationPayloadSha256,observerContractSha256:descriptor.sha256,publicSafe:true};
  return result;
}
export function observationFromProtected(raw,request,requestId,requestHash,installation,descriptor,now=Date.now()){const result=protectedObservationBody(raw,request,requestId,requestHash,descriptor,installation);validateObservation(result,request,installation,now);publishable.set(result,sha256(canonical(result)));return result;}
export async function nativeObservationFromProtected(root,api,raw,request,requestId,requestHash,installation,policy){
 need(installation.schemaVersion===2,'native-observation-installation-required');
 const base=protectedObservationBody(raw,request,requestId,requestHash,policy.protectedObserver,installation);
 validateStageObservationFacts(base,request,installation,Date.now());
 const seed={installation,request,observation:base,transport:{requestId,requestHash}};
 let productionRollback,productionRollbackParent=null;
 if(request.workflowPath==='.github/workflows/cloudflare-worker-deploy.yml'){
  rollbackCaptureContexts.set(seed,sha256(canonical(seed)));
  try{
   const{captureProductionRollback,assertProductionRollbackPair}=await import('./production-postflight.mjs');
   productionRollback=assertProductionRollbackPair(await captureProductionRollback(root,seed));
  }finally{rollbackCaptureContexts.delete(seed);}
 }else{
  need(request.schemaVersion===2&&request.phase==='staging-preflight','native-pages-staging-request2');
  const frozen={sourceCommit:request.sourceCommit,sourceTreeSha:request.sourceTreeSha,verifierContractSha256:request.verifierContractSha256},ref=request.workerUploadReference;
  const worker=await validateWorkerUploadRecord({api,policy,frozen,installationId:request.installationDeploymentId,installationHash:request.installationPayloadSha256,workerUploadReference:ref,baseHistoryText:String(readOwned(root,'data/staging-deploy-history.ndjson'))});
  productionRollback=worker.productionRollback;productionRollbackParent={workerUploadDeploymentId:ref.deploymentId,workerUploadPayloadSha256:ref.payloadSha256,originalObservationId:worker.stageObservation.observationId,originalObservationHash:worker.stageObservation.observationHash};
 }
 const result={...base,schemaVersion:2,phase:'staging-preflight',productionRollback,productionRollbackParent,envelopeCompletedAtEpochMs:Date.now()};
 validateObservation(result,request,installation,Date.now());publishable.set(result,sha256(canonical(result)));return result;
}
export async function loadRuntimeContext(root, file, expectedHash, {api, now = Date.now(), minimumSeconds = 0} = {}) {
  const references=parseBoundedJson(readOwned(root,file,65536),expectedHash);
  if(references.schemaVersion===2)return loadProductionPostflightContext(root,file,expectedHash,{api,now});
  exactKeys(references,['schemaVersion','sourceCommit','transport'],'runtime-reference-fields');
  need(references.schemaVersion === 1,'runtime-reference-schema');
  exactKeys(references.transport,['installationId','installationHash','requestId','requestHash','observationId','observationHash','runId','runAttempt'],'runtime-reference-transport');
  const frozen=verifyFrozenSource(root,references.sourceCommit);
  const policy=validatePublisherPolicy(JSON.parse(readOwned(root,'config/isolated-staging-admission.json')));
  const admit=api=>admitRuntime({api,policy,frozen,...references.transport,baseHistoryText:String(readOwned(root,'data/staging-deploy-history.ndjson')),now,minimumSeconds});
  let context;
  if(api)context=await admit(api);
  else if(process.env.GITHUB_ACTIONS==='true') {
    need(process.env.GITHUB_SHA===frozen.sourceCommit && Number(process.env.GITHUB_RUN_ID)===references.transport.runId
      && Number(process.env.GITHUB_RUN_ATTEMPT)===references.transport.runAttempt,'ci-execution-context');
    const {getSecret}=await import('./secrets.mjs');
    context=await admit(githubApi(getSecret('GITHUB_TOKEN','github.api')));
  } else {
    validateObserverDescriptor(root,policy.protectedObserver);
    need(policy.protectedObserver.dependencyRows.some(r=>r.file==='../vaultspark-studio-ops/scripts/lib/github-broker.mjs'),'github-broker-not-pinned');
    const {withGithubToken}=await import(pathToFileURL(path.resolve(root,'../vaultspark-studio-ops/scripts/lib/github-broker.mjs')).href);
    context=await withGithubToken('isolated-staging-evidence-read',token=>admit(githubApi(token)),{params:{repository:REPOSITORY,sourceCommit:frozen.sourceCommit}});
  }
  need(sha256(readOwned(root,'api/candidate-artifact-manifest.json'))===context.receipt.productionSource.rawManifestSha256,'production-raw-manifest-bytes');
  const response=await fetch(`${STAGING_ORIGIN}/api/candidate-artifact-manifest.json`,{redirect:'error',
    headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(15000)});
  need(response.ok,'stage-marker-http');
  const bytes=await readBoundedResponse(response,1024*1024);
  assertCurrentStageManifest(bytes,context); return context;
}
export async function readBoundedResponse(response, maximum) {
  const reader=response.body.getReader(); const chunks=[]; let size=0;
  try {
    while(true) {const {value,done}=await reader.read();if(done)break;size+=value.byteLength;
      need(size<=maximum,'response-body-bound');chunks.push(Buffer.from(value));}
  } finally {await reader.cancel().catch(()=>{});}
  return Buffer.concat(chunks);
}
export function runtimeContextArgs(args) {
  const names=['--isolated-staging-context','--isolated-staging-context-sha256'];
  for(const arg of args)if(typeof arg==='string'&&arg.startsWith('--isolated-staging-context'))
    need(names.some(name=>arg===name||arg.startsWith(`${name}=`)),'unknown-context-argument');
  const value = name => {
    const entries=args.filter(a=>a===name||a.startsWith(`${name}=`));need(entries.length<=1,'duplicate-context-argument');
    if(!entries.length)return undefined;
    need(entries[0].startsWith(`${name}=`)&&entries[0].length>name.length+1,'malformed-context-argument');
    return entries[0].slice(name.length+1);
  };
  const file=value('--isolated-staging-context'),hash=value('--isolated-staging-context-sha256');
  need(Boolean(file)===Boolean(hash),'partial-runtime-context');
  if(file)need(/^\.cache\/[A-Za-z0-9_./-]+[.]json$/.test(file)&&!file.split('/').includes('..')&&isHash(hash),'invalid-runtime-context-reference');
  return file ? {file,hash} : null;
}
export function runtimeArtifactPath(root, context, kind) {
  assertAdmittedContext(context);
  need(['staging-health','release-proof','release-ceremony','staging-deploy-continuity'].includes(kind),'runtime-artifact-kind');
  return path.join(root,'.cache','isolated-staging',`run-${context.request.workflowRunId}-${context.request.workflowRunAttempt}`,`${kind}.json`);
}
export function evaluateVariantRoutes(context, routes) {
  assertAdmittedContext(context); const findings=[];
  const expected=context.receipt.stageVariant.routeContracts;
  if (!Array.isArray(routes) || routes.length!==expected.length) return ['variant-route-set'];
  expected.forEach((contract,index)=> {
    const row=routes[index];
    if (row?.route!==contract.route || row.stagingReachable!==true || row.stagingStatus<200 || row.stagingStatus>=300
      || row.stagingStaticCspSafe!==true || row.stagingSecurityHeaders!==true
      || canonical(row.stagingShell)!==canonical(contract.shellPaths)
      || sha256(canonical(row.stagingHeaders))!==contract.headersSha256
      || sha256(row.stagingHeaders?.csp || '')!==contract.normalizedCspSha256) findings.push(`variant-route-${index}`);
  });
  return findings;
}
