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
  positiveInteger, parseBoundedJson, validatePublisherPolicy, publisherCommitment, validatePreservationProjection } from './isolated-staging-contract.mjs';

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
export function validateInstallation(v, frozen, baseHistoryText) {
  exactKeys(v,['schemaVersion','kind','repository','sourceCommit','sourceTreeSha','verifierContractSha256',
    'receipt','historyAppend','continuity','publicSafe'],'install-envelope-fields');
  need(v.schemaVersion === 1 && v.kind === 'isolated-staging-install-envelope' && v.repository === REPOSITORY
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
  return {receipt,historyText};
}
const REQUEST_KEYS = ['schemaVersion','kind','repository','sourceCommit','sourceTreeSha','verifierContractSha256',
  'installationDeploymentId','installationPayloadSha256','workflowRunId','workflowRunAttempt','workflowPath',
  'nonce','requestedAtEpochMs','deadlineEpochMs','publicSafe'];
export function validateRequest(v, frozen, policy, now) {
  exactKeys(v,REQUEST_KEYS,'request-fields');
  need(v.schemaVersion === 1 && v.kind === 'isolated-staging-observation-request' && v.publicSafe === true
    && v.repository === REPOSITORY && policy.workflowPaths.includes(v.workflowPath), 'request-scope');
  for (const key of ['sourceCommit','sourceTreeSha','verifierContractSha256']) need(v[key] === frozen[key], `request-${key}`);
  for (const key of ['installationDeploymentId','workflowRunId','workflowRunAttempt']) need(positiveInteger(v[key]), `request-${key}`);
  need(isHash(v.installationPayloadSha256) && isHash(v.nonce), 'request-hash');
  need(Number.isSafeInteger(now) && positiveInteger(v.requestedAtEpochMs) && v.requestedAtEpochMs <= now
    && v.deadlineEpochMs > now && v.deadlineEpochMs - v.requestedAtEpochMs === REQUEST_WAIT_MS, 'request-deadline');
  return v;
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
const OBSERVATION_KEYS = ['schemaVersion','kind','repository','sourceCommit','sourceTreeSha','verifierContractSha256',
  'requestDeploymentId','requestPayloadSha256','nonce','workflowRunId','workflowRunAttempt','installationDeploymentId',
  'installationPayloadSha256','observerContractSha256','observerClosureSha256','installReceiptSha256','postReceiptSha256',
  'observedAtEpochMs','captureStartedAtEpochMs','captureExpiresAtEpochMs','effectiveExpiresAtEpochMs','stageManifestSha256',
  'workerProofObservedAtEpochMs','workerProofExpiresAtEpochMs',
  'postAdmissionStartedAtEpochMs',
  'fullInventorySha256','stableBracketSha256','opaquePreservation','preservationProjection','publicSafe'];
export function validateObservation(v, request, installation, now, minimumSeconds = 0) {
  exactKeys(v,OBSERVATION_KEYS,'observation-fields');
  need(v.schemaVersion === 1 && v.kind === 'isolated-staging-run-observation' && v.publicSafe === true && v.repository === REPOSITORY,'observation-scope');
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
  need(v.installReceiptSha256 === r.installationEvidence.installReceiptSha256 && v.postReceiptSha256 === r.installationEvidence.postReceiptSha256
    && v.stageManifestSha256 === r.stageVariant.rawManifestSha256 && v.fullInventorySha256 === r.stageVariant.fullInventorySha256, 'observation-installed-association');
  exactKeys(v.opaquePreservation,['relationCount','beforeProjectionSha256','afterProjectionSha256'],'opaque-preservation-fields');
  need(v.opaquePreservation.relationCount === 21 && isHash(v.opaquePreservation.beforeProjectionSha256)
    && v.opaquePreservation.beforeProjectionSha256 === v.opaquePreservation.afterProjectionSha256, 'opaque-21-preservation');
  validatePreservationProjection(v.preservationProjection);
  return v;
}
export function validateDeployment(record, policy, role, expectedId, expectedHash, frozen) {
  need(record?.id === expectedId && record.sha === frozen.sourceCommit && record.ref === frozen.sourceCommit
    && record.environment === policy.environment, 'metadata-association');
  const expectedPublisher = role === 'request' ? policy.requestBotCommitmentSha256 : policy.publisherCommitmentSha256;
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
  const role = payload.kind === 'isolated-staging-observation-request' ? 'request' : 'observer';
  validateDeployment(record,policy,role,record.id,sha256(text),frozen);
  return {id:record.id,sha256:sha256(text)};
}
export async function admitRuntime({api, policy, frozen, installationId, installationHash, requestId, requestHash,
  observationId, observationHash, baseHistoryText, now = Date.now(), minimumSeconds = 0, runId, runAttempt}) {
  validatePublisherPolicy(policy);
  const get = (id,hash,role) => api('GET',`/deployments/${id}`).then(r=>validateDeployment(r,policy,role,id,hash,frozen));
  const installation = await get(installationId,installationHash,'observer');
  const ledger = validateInstallation(installation,frozen,baseHistoryText);
  const request = await get(requestId,requestHash,'request');
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
  const context = {mode:'isolated-variant',installation,request,observation,...ledger,
    transport:{installationId,installationHash,requestId,requestHash,observationId,observationHash,runId,runAttempt}};
  branded.set(context,sha256(canonical(context))); return context;
}
export async function findObservation(api, policy, frozen, requestId, requestHash, request) {
  const matches = [];
  for (let page=1;page<=5;page++) {
    const rows = await api('GET',`/deployments?sha=${frozen.sourceCommit}&environment=${policy.environment}&per_page=100&page=${page}`);
    need(Array.isArray(rows) && rows.length <= 100, 'metadata-list-bound');
    for (const row of rows) {
      let p,hash; try {const decoded=decodeMetadataPayload(row.payload);p=JSON.parse(decoded.raw);hash=decoded.sha256;} catch {continue;}
      if (p.kind !== 'isolated-staging-run-observation' || p.requestDeploymentId !== requestId) continue;
      validateDeployment(row,policy,'observer',row.id,hash,frozen);
      need(p.requestPayloadSha256 === requestHash && p.nonce === request.nonce, 'rendezvous-correlation');
      matches.push({id:row.id,sha256:hash});
    }
    if (rows.length < 100) { need(matches.length <= 1,'duplicate-observation'); return matches[0] ?? null; }
  }
  throw new Error('isolated-staging:metadata-list-truncated');
}
export async function findRequest(api, policy, frozen, selector, now=Date.now()) {
  exactKeys(selector,['workflowRunId','workflowRunAttempt','workflowPath','installationDeploymentId','installationPayloadSha256'],'request-selector-fields');
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
      const request=validateDeployment(row,policy,'request',row.id,hash,frozen);
      validateRequest(request,frozen,policy,now);
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
  protectedResults.set(raw,sha256(canonical(raw)));
  return raw;
}
export function observationFromProtected(raw, request, requestId, requestHash, installation, descriptor, now = Date.now()) {
  need(protectedResults.get(raw)===sha256(canonical(raw)),'protected-invocation-required');
  const {schemaVersion:_schema,scope:_scope,readOnly:_read,requestSha256:_request,...facts}=raw;
  const result={schemaVersion:1,kind:'isolated-staging-run-observation',repository:REPOSITORY,...facts,
    requestDeploymentId:requestId,requestPayloadSha256:requestHash,nonce:request.nonce,workflowRunId:request.workflowRunId,
    workflowRunAttempt:request.workflowRunAttempt,installationDeploymentId:request.installationDeploymentId,
    installationPayloadSha256:request.installationPayloadSha256,observerContractSha256:descriptor.sha256,publicSafe:true};
  validateObservation(result,request,installation,now);publishable.set(result,sha256(canonical(result)));return result;
}
export async function loadRuntimeContext(root, file, expectedHash, {api, now = Date.now(), minimumSeconds = 0} = {}) {
  const references=parseBoundedJson(readOwned(root,file,65536),expectedHash);
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
