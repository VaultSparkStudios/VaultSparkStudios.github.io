/** Offline contract regression: no credentials, network, capture or real acceptance. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {shellPaths} from '../lib/shell-parity.mjs';
import {createStagingDeployReceipt,validateStagingDeployReceipt} from '../lib/staging-deploy-receipt.mjs';
import {historyRowFor,renderStagingDeployHistory,validateStagingDeployHistory} from '../lib/staging-deploy-history.mjs';
import {buildContinuitySummary} from '../lib/staging-deploy-continuity.mjs';
import {sha256,publisherCommitment,PRESERVATION_FLAGS,validatePublisherPolicy} from '../lib/isolated-staging-contract.mjs';
import {createVariantReceipt,validateInstallation,validateRequest,validateObservation,admitRuntime,findObservation,
  assertCurrentStageManifest,variantReadiness,evaluateVariantRoutes,assertAdmittedContext,canonical,runtimeContextArgs,
  githubApi,encodeMetadataPayload,decodeMetadataPayload,makeRequest,publishMetadata,observationFromProtected,findRequest,
  readBoundedResponse,verifierSourceClosure,CONTRACT_FILES,runtimeArtifactPath} from '../lib/isolated-staging-evidence.mjs';
const h=character=>character.repeat(64), clone=value=>JSON.parse(JSON.stringify(value));
const results=[];
async function test(name,body){await body();results.push(name);}
const now=Date.now(), G='a'.repeat(40), tree='b'.repeat(40), manifest={root:h('c'),leafCount:79};
const stageManifestRaw=JSON.stringify({root:h('d'),leafCount:79});
const frozen={sourceCommit:G,sourceTreeSha:tree,verifierContractSha256:h('e')};
const policy={schemaVersion:1,repository:'VaultSparkStudios/VaultSparkStudios.github.io',environment:'website-isolated-staging',
  workflowPaths:['.github/workflows/pages-deploy.yml','.github/workflows/cloudflare-worker-deploy.yml'],publisherCommitmentSha256:publisherCommitment({type:'Bot',id:1000000001}),
  requestBotCommitmentSha256:publisherCommitment({type:'Bot',id:1000000002}),
  protectedObserver:{sha256:h('f'),dependencyRows:[{file:'offline-fixture.mjs',sha256:h('a')}]}};
const productionSource={commitSha:G,treeSha:tree,fingerprint:'c'.repeat(24),rawManifestSha256:sha256(JSON.stringify(manifest)),artifactRoot:manifest.root,leafCount:79};
const headers={csp:"default-src 'self';",hsts:'max-age=31536000',xcto:'nosniff',referrer:'strict-origin-when-cross-origin'};
const routeContracts=['/','/studio-pulse/','/membership/'].map(route=>({route,shellPaths:['assets/test.shell-aaaaaaaaaa.js'],normalizedCspSha256:sha256(headers.csp),headersSha256:sha256(canonical(headers))}));
const facts={generatedAt:new Date(now-1000).toISOString(),productionSource,
  stageVariant:{sealSha256:h('a'),archiveSha256:h('b'),archiveBytes:1024,fullInventorySha256:h('c'),fileCount:4227,
    servedInventorySha256:h('d'),servedFileCount:4000,rawManifestSha256:sha256(stageManifestRaw),artifactRoot:h('d'),leafCount:79,headersSha256:h('e'),routeContracts},
  lineage:Object.fromEntries(['associationSha256','sourceSnapshotSha256','materializedManifestSha256','deltaReviewSha256','independentReviewSha256','transformContractSha256','producerClosureSha256'].map(k=>[k,h('f')])),
  copiedHistoricalBuildStamp:{rawSha256:h('a'),commitSha:'c'.repeat(40),currentSourceIdentity:false},
  installationEvidence:{installReceiptSha256:h('b'),postReceiptSha256:h('c'),workerVersionId:'d9bdd239-3fb7-43a3-9630-a7fe8d39922e',workerProofSha256:h('d'),snapshotSha256:h('e'),snapshotBindingSha256:h('f'),snapshotClosureSha256:h('a'),installObservedAt:new Date(now-3000).toISOString(),postObservedAt:new Date(now-2000).toISOString()},
  predecessor:{sealSha256:h('b'),receiptId:null,installReceiptSha256:h('c'),postReceiptSha256:h('d')},
  rollback:{model:'immutable-version-root',predecessorAssociationSha256:h('e'),ownershipVerified:true,reserveVerified:true,rollbackComplete:null},deploy:{id:'20261113000000'}};
const receipt=createVariantReceipt(facts),row=historyRowFor(receipt),historyText=renderStagingDeployHistory([row]);
const installation={schemaVersion:1,kind:'isolated-staging-install-envelope',repository:policy.repository,...frozen,receipt,
  historyAppend:{baseLedgerSha256:sha256(''),baseHeadRowId:null,row},continuity:buildContinuitySummary(historyText,receipt),publicSafe:true};
const installationHash=sha256(canonical(installation));
const request={schemaVersion:1,kind:'isolated-staging-observation-request',repository:policy.repository,...frozen,
  installationDeploymentId:1,installationPayloadSha256:installationHash,workflowRunId:11,workflowRunAttempt:2,workflowPath:policy.workflowPaths[0],
  nonce:h('a'),requestedAtEpochMs:now-20000,deadlineEpochMs:now+880000,publicSafe:true};
const requestHash=sha256(canonical(request));
const observation={schemaVersion:1,kind:'isolated-staging-run-observation',repository:policy.repository,...frozen,
  requestDeploymentId:2,requestPayloadSha256:requestHash,nonce:request.nonce,workflowRunId:11,workflowRunAttempt:2,
  installationDeploymentId:1,installationPayloadSha256:installationHash,observerContractSha256:policy.protectedObserver.sha256,
  observerClosureSha256:sha256(canonical(policy.protectedObserver.dependencyRows)),installReceiptSha256:h('b'),postReceiptSha256:h('c'),
  observedAtEpochMs:now-100,captureStartedAtEpochMs:now-30000,captureExpiresAtEpochMs:now+1770000,effectiveExpiresAtEpochMs:now+590000,
  workerProofObservedAtEpochMs:now-10000,workerProofExpiresAtEpochMs:now+590000,
  postAdmissionStartedAtEpochMs:now-5000,
  stageManifestSha256:sha256(stageManifestRaw),fullInventorySha256:h('c'),stableBracketSha256:h('d'),
  opaquePreservation:{relationCount:21,beforeProjectionSha256:h('e'),afterProjectionSha256:h('e')},
  preservationProjection:{baselineReceiptSha256:h('f'),preservationSourceSha256:h('a'),guardResults:Object.fromEntries(PRESERVATION_FLAGS.map(k=>[k,true])),
    historicalGlobalConfigurationUnchanged:false,historicalEvidenceBytesPreserved:true,nativeAcceptance:false,publicAuthAcceptance:false},publicSafe:true};
const observationHash=sha256(canonical(observation));
const makeRecord=(id,payload,observer=true)=>({id,sha:G,ref:G,environment:policy.environment,payload:encodeMetadataPayload(payload),creator:{type:'Bot',id:observer?1000000001:1000000002}});
const records=new Map([[1,makeRecord(1,installation)],[2,makeRecord(2,request,false)],[3,makeRecord(3,observation)]]);
const api=async(method,suffix)=>{assert.equal(method,'GET');if(suffix==='/actions/runs/11')return{id:11,run_attempt:2,head_sha:G,path:policy.workflowPaths[0],event:'workflow_dispatch'};
 if(suffix.startsWith('/deployments?'))return[...records.values()];const id=Number(suffix.split('/').at(-1));return clone(records.get(id));};
const admit=options=>admitRuntime({api,policy,frozen,installationId:1,installationHash,requestId:2,requestHash,observationId:3,observationHash,baseHistoryText:'',now,runId:11,runAttempt:2,...options});
await test('legacy receipt, ledger and continuity golden bytes unchanged',()=>{
 const v=createStagingDeployReceipt({generatedAt:'2026-01-01T00:00:00.000Z',commitSha:'a'.repeat(40),sourceFingerprint:'b'.repeat(24),candidateRoot:'c'.repeat(64),candidateLeafCount:2,archiveSha256:'d'.repeat(64),archiveBytes:10,deployId:'20260101000000',manifestFileCount:2,remoteFileCount:2,remoteRoot:'/opt/studio/staging/website',remoteVerified:true,parity:{generatedAt:'2026-01-01T00:00:01.000Z',candidateReady:true,candidateFindings:[],candidateBuildSha:'a'.repeat(40),stagingBuildSha:'a'.repeat(40),artifactManifest:{candidateRoot:'c'.repeat(64),stagingRoot:'c'.repeat(64),matched:true}}});
 const text=renderStagingDeployHistory([historyRowFor(v)]);
 assert.equal(sha256(JSON.stringify(v)),'53146a9930c0dd5347231b55b7895928cec0b403730f678d27f880aac83dff47');
 assert.equal(sha256(text),'8c2c2c41bbc261e7d24e4184b9e95ee2910e32bfb30c4722fa452338cbc2ae97');
 assert.equal(sha256(JSON.stringify(buildContinuitySummary(text,v))),'35848b8a021224ca3146c675e47ceec1b8049f9c15a56cdde8bcd239392c9551');
 const body={receipt:v,legacyLedgerBytes:text},wire=encodeMetadataPayload(body);
 const reordered=Object.fromEntries(Object.entries(wire).reverse());
 const decoded=decodeMetadataPayload(reordered),roundtrip=JSON.parse(decoded.raw);
 assert.equal(decoded.raw.toString(),JSON.stringify(body));assert.equal(roundtrip.receipt.receiptId,v.receiptId);
 assert.equal(JSON.stringify(roundtrip.receipt),JSON.stringify(v));assert.equal(roundtrip.legacyLedgerBytes,text);
});
for(const [name,mutate]of [
 ['noncanonical base64 padding',v=>{v.body+='=';}],['invalid base64 alphabet',v=>{v.body='@'+v.body;}],
 ['truncated encoded body',v=>{v.body=v.body.slice(0,-2);}],['wrong payload digest',v=>{v.sha256=h('0');}],
 ['unknown wire field',v=>{v.archive='unpermitted';}],['encoded wire byte cap',v=>{v.body='A'.repeat(90000);}],
])await test(`carrier ${name} refuses`,()=>{const wire=encodeMetadataPayload({schemaVersion:1,kind:'offline-fixture'});mutate(wire);assert.throws(()=>decodeMetadataPayload(wire));});
await test('decoded payload byte cap refuses',()=>assert.throws(()=>encodeMetadataPayload({oversize:'x'.repeat(49152)})));
await test('caller projection and altered branded request cannot publish',async()=>{
 let calls=0;const write=async()=>{calls++;throw Error('must not publish');};
 await assert.rejects(()=>publishMetadata(write,policy,frozen,clone(observation)));
 const req=makeRequest(frozen,policy,{id:11,run_attempt:2,head_sha:G,path:policy.workflowPaths[0],event:'workflow_dispatch'},{id:1,sha256:installationHash},now);
 req.workflowRunId=12;await assert.rejects(()=>publishMetadata(write,policy,frozen,req));assert.equal(calls,0);
 assert.throws(()=>observationFromProtected({},request,2,requestHash,installation,policy.protectedObserver,now));
});
await test('explicit variant structure and separate roots',()=>{assert.equal(validateStagingDeployReceipt(receipt),receipt);assert.notEqual(receipt.productionSource.artifactRoot,receipt.stageVariant.artifactRoot);});
await test('runtime installation prefix and continuity exact',()=>assert.equal(validateInstallation(installation,frozen,'').historyText,historyText));
await test('legacy prefix plus variant append retains old rows',()=>{
 const legacy=createStagingDeployReceipt({generatedAt:new Date(now-5000).toISOString(),commitSha:G,sourceFingerprint:'a'.repeat(24),candidateRoot:h('a'),candidateLeafCount:2,archiveSha256:h('b'),archiveBytes:10,deployId:'20261112000000',manifestFileCount:2,remoteFileCount:2,remoteRoot:'/opt/studio/staging/website',remoteVerified:true,parity:{candidateReady:true,candidateFindings:[],candidateBuildSha:G,stagingBuildSha:G,artifactManifest:{candidateRoot:h('a'),stagingRoot:h('a'),matched:true}}});
 const first=historyRowFor(legacy),second=historyRowFor(receipt,legacy.receiptId);assert.equal(validateStagingDeployHistory([first,second],{latestReceipt:receipt}).length,2);
 assert.equal(renderStagingDeployHistory([first,second]).split('\n')[0],JSON.stringify(first));
});
await test('positive authenticated metadata runtime path',async()=>{const context=await admit();assertCurrentStageManifest(stageManifestRaw,context);assert.equal(variantReadiness(context,manifest,G).currentStageObserved,true);});
await test('Worker workflow own run and nonce admits same INSTALL',async()=>{
 const req={...request,workflowPath:policy.workflowPaths[1],workflowRunId:12,nonce:h('b')},rh=sha256(canonical(req));
 const obs={...observation,workflowRunId:12,nonce:req.nonce,requestPayloadSha256:rh},oh=sha256(canonical(obs));
 const workerApi=async(m,p)=>p==='/actions/runs/12'?{id:12,run_attempt:2,head_sha:G,path:policy.workflowPaths[1],event:'workflow_dispatch'}
  :p==='/deployments/2'?makeRecord(2,req,false):p==='/deployments/3'?makeRecord(3,obs):api(m,p);
 const context=await admit({api:workerApi,requestHash:rh,observationHash:oh,runId:12});assert.equal(context.request.workflowPath,policy.workflowPaths[1]);
 const borrowed=async(m,p)=>p==='/actions/runs/12'?{id:12,run_attempt:2,head_sha:G,path:policy.workflowPaths[0],event:'workflow_dispatch'}:workerApi(m,p);
 await assert.rejects(()=>admit({api:borrowed,requestHash:rh,observationHash:oh,runId:12}));
});
await test('only two explicit workflow paths eligible',()=>assert.throws(()=>validatePublisherPolicy({...policy,workflowPaths:[...policy.workflowPaths,'.github/workflows/other.yml']})));
await test('900 second rendezvous is not evidence lifetime',()=>{
 const req={...request,requestedAtEpochMs:now-800000,deadlineEpochMs:now+100000};validateRequest(req,frozen,policy,now);
 validateObservation(observation,req,installation,now);
 const expired=clone(observation);expired.workerProofObservedAtEpochMs=now-700000;expired.workerProofExpiresAtEpochMs=now-100000;expired.effectiveExpiresAtEpochMs=now-100000;
 assert.throws(()=>validateObservation(expired,req,installation,now));
});
await test('unbranded caller context cannot assert acceptance',()=>assert.throws(()=>assertAdmittedContext({observation})));
await test('mutating an admitted context invalidates its binding',async()=>{const context=await admit();context.observation.stableBracketSha256=h('0');assert.throws(()=>assertAdmittedContext(context));});
await test('marker-only input cannot assert acceptance',()=>assert.throws(()=>assertCurrentStageManifest(stageManifestRaw,{})));
await test('copied historical stamp cannot be relabeled',()=>{const f=clone(facts);f.copiedHistoricalBuildStamp.currentSourceIdentity=true;assert.throws(()=>createVariantReceipt(f));});
for(const key of ['schemaVersion','mode','source','parity'])await test(`mixed legacy or variant field ${key} refuses`,()=>{const v=clone(receipt);if(key==='schemaVersion')v[key]='1.0';else if(key==='mode')delete v[key];else v[key]={};assert.throws(()=>validateStagingDeployReceipt(v));});
for(const key of ['nonce','workflowRunId','workflowRunAttempt','installationDeploymentId','installationPayloadSha256','sourceCommit','sourceTreeSha','verifierContractSha256','requestPayloadSha256','requestDeploymentId'])await test(`replay correlation ${key} refuses`,async()=>{
 const bad=clone(observation);bad[key]=typeof bad[key]==='number'?999:h('0');const badHash=sha256(canonical(bad));const custom=async(m,p)=>p==='/deployments/3'?makeRecord(3,bad):api(m,p);await assert.rejects(()=>admit({api:custom,observationHash:badHash}));
});
for(const [name,alter]of [
 ['exact expiry',v=>{v.effectiveExpiresAtEpochMs=now;}],['future observation',v=>{v.observedAtEpochMs=now+1;}],
 ['TTL extension',v=>{v.captureExpiresAtEpochMs++;}],['before request',v=>{v.observedAtEpochMs=request.requestedAtEpochMs-1;}],
 ['missing relation',v=>{v.opaquePreservation.relationCount=20;}],['unequal aggregates',v=>{v.opaquePreservation.afterProjectionSha256=h('f');}],
 ['marker mismatch',v=>{v.stageManifestSha256=h('0');}],['inventory mismatch',v=>{v.fullInventorySha256=h('0');}],
 ['invented native acceptance',v=>{v.preservationProjection.nativeAcceptance=true;}],['generic passed flag',v=>{v.passed=true;}],
 ['private arbitrary field',v=>{v.privatePath='/private/example';}],['historical global unchanged',v=>{v.preservationProjection.historicalGlobalConfigurationUnchanged=true;}],
])await test(`${name} refuses`,()=>{const v=clone(observation);alter(v);assert.throws(()=>validateObservation(v,request,installation,now));});
for(const flag of PRESERVATION_FLAGS)await test(`missing actual guard ${flag} refuses`,()=>{const v=clone(observation);delete v.preservationProjection.guardResults[flag];assert.throws(()=>validateObservation(v,request,installation,now));});
await test('insufficient reserved lifetime refuses',()=>assert.throws(()=>validateObservation(observation,request,installation,now,600)));
await test('request deadline is not evidence expiry',()=>{const v=clone(observation);v.effectiveExpiresAtEpochMs=now;assert.throws(()=>validateObservation(v,request,installation,now));});
await test('publisher unresolved, request bot distinct, existing User allowed opaquely',()=>{assert.throws(()=>validatePublisherPolicy({...policy,publisherCommitmentSha256:null}));assert.throws(()=>validatePublisherPolicy({...policy,publisherCommitmentSha256:policy.requestBotCommitmentSha256}));assert.match(publisherCommitment({type:'User',id:1000000003}),/^[a-f0-9]{64}$/);assert.throws(()=>publisherCommitment({type:'User',id:0}));});
await test('CI request bot cannot satisfy observer role',async()=>{const custom=async(m,p)=>p==='/deployments/3'?makeRecord(3,observation,false):api(m,p);await assert.rejects(()=>admit({api:custom}));});
await test('foreign source metadata refuses',async()=>{const custom=async(m,p)=>p==='/deployments/3'?{...makeRecord(3,observation),sha:'f'.repeat(40)}:api(m,p);await assert.rejects(()=>admit({api:custom}));});
await test('wrong metadata digest refuses',()=>assert.rejects(()=>admit({observationHash:h('0')})));
await test('duplicate responding records refuse',()=>assert.rejects(()=>findObservation(async()=>[makeRecord(3,observation),makeRecord(4,observation)],policy,frozen,2,requestHash,request)));
await test('bounded exact request discovery and duplicate refusal',async()=>{
 const selector={workflowRunId:11,workflowRunAttempt:2,workflowPath:policy.workflowPaths[0],installationDeploymentId:1,installationPayloadSha256:installationHash};
 assert.deepEqual(await findRequest(api,policy,frozen,selector,now),{requestDeploymentId:2,requestPayloadSha256:requestHash});
 const duplicate=async(m,p)=>p.startsWith('/deployments?')?[makeRecord(2,request,false),makeRecord(4,request,false)]:api(m,p);
 await assert.rejects(()=>findRequest(duplicate,policy,frozen,selector,now));
 await assert.rejects(()=>findRequest(api,policy,frozen,{...selector,workflowPath:policy.workflowPaths[1]},now));
 await assert.rejects(()=>findRequest(async(m,p)=>p.startsWith('/deployments?')?[]:api(m,p),policy,frozen,selector,now));
});
await test('truncated metadata list refuses',()=>assert.rejects(()=>findObservation(async()=>Array.from({length:100},(_,i)=>makeRecord(i+20,request,false)),policy,frozen,2,requestHash,request)));
await test('valid routes retained and wrong header/shell refuse',async()=>{const context=await admit();const routes=routeContracts.map(r=>({route:r.route,stagingReachable:true,stagingStatus:200,stagingStaticCspSafe:true,stagingSecurityHeaders:true,stagingShell:r.shellPaths,stagingHeaders:headers}));assert.deepEqual(evaluateVariantRoutes(context,routes),[]);const wrong=clone(routes);wrong[1].stagingShell=['/assets/other.js'];assert.notEqual(evaluateVariantRoutes(context,wrong).length,0);});
await test('partial context CLI refuses',()=>{assert.throws(()=>runtimeContextArgs(['--isolated-staging-context=x']));assert.throws(()=>runtimeContextArgs(['--isolated-staging-context=x','--isolated-staging-context=y']));});
for(const flags of [
 ['--isolated-staging-context'],['--isolated-staging-context-sha256'],['--isolated-staging-context='],
 ['--isolated-staging-context=','--isolated-staging-context-sha256='],
 ['--isolated-staging-context','.cache/x.json','--isolated-staging-context-sha256='+h('a')],
 ['--isolated-staging-context=.cache/x.json','--isolated-staging-context-sha256='],
 ['--isolated-staging-context=.cache/x.json','--isolated-staging-context-sha256'],
 ['--isolated-staging-context=.cache/x.json','--isolated-staging-context-sha256='+h('a'),'--isolated-staging-context'],
 ['--isolated-staging-context-sha256='+h('a'),'--isolated-staging-context-sha256='+h('a')],
 ['--isolated-staging-context-other=value'],
])await test(`explicit malformed context cannot fall back: ${flags.join(' ')}`,()=>assert.throws(()=>runtimeContextArgs(flags)));
await test('absent context stays legacy; valid paired context selected explicitly',()=>{assert.equal(runtimeContextArgs(['--check']),null);assert.deepEqual(runtimeContextArgs(['--isolated-staging-context=.cache/x.json','--isolated-staging-context-sha256='+h('a')]),{file:'.cache/x.json',hash:h('a')});});
await test('GitHub adapter forbids arbitrary URL and write target without fetch',async()=>{let calls=0;const client=githubApi('offline-fixture',async()=>{calls++;throw Error('not reached');});await assert.rejects(()=>client('GET','https://example.invalid'));await assert.rejects(()=>client('POST','/actions/runs/11',{}));assert.equal(calls,0);});
// Exact pure function extraction prevents the producer entrypoints from writing artifacts during these fixtures.
const proofSource=fs.readFileSync(new URL('../build-release-proof.mjs',import.meta.url),'utf8');
const proofVm={createStagingDeployReceipt,validateStagingDeployReceipt,historyRowFor,validateStagingDeployHistory,variantReadiness,evaluateVariantRoutes};
vm.createContext(proofVm);
vm.runInContext(proofSource.slice(proofSource.indexOf('export function deriveReleaseProof'),proofSource.indexOf('if (SELF_TEST)')).replace('export function ','function '),proofVm);
const fixtureStart=proofSource.indexOf('  const base =',proofSource.indexOf('if (SELF_TEST)'));
const fixtureEnd=proofSource.indexOf('  const ready =',fixtureStart);
vm.runInContext(proofSource.slice(fixtureStart,fixtureEnd)+'\nthis.fixture=base;',proofVm);
await test('legacy public proof golden bytes ready and honest-dark unchanged',()=>{
 assert.equal(sha256(JSON.stringify(proofVm.deriveReleaseProof(proofVm.fixture))),'9e9cf37e556de48095bcb0f17a6f4027501390a39358327509ad1ed459953dc2');
 const dark={...proofVm.fixture,identityMigration:{...proofVm.fixture.identityMigration,state:'honest-dark',productionEligible:false,blockers:['real-provider-e2e-pending']}};
 assert.equal(sha256(JSON.stringify(proofVm.deriveReleaseProof(dark))),'1d96aa93bbacf4e8702498a3a1dac2c88da2788a7a72b1ad2855b471a260b8d4');
});
const paritySource=fs.readFileSync(new URL('../check-staging-parity.mjs',import.meta.url),'utf8');
const parityVm={variantReadiness,evaluateVariantRoutes};vm.createContext(parityVm);
vm.runInContext(paritySource.slice(paritySource.indexOf('export function evaluateReleaseArtifact'),paritySource.indexOf('if (SELF_TEST)')).replace('export function ','function '),parityVm);
await test('actual parity and release-proof functions accept only related variant facts and retain native hold',async()=>{
 const context=await admit();assertCurrentStageManifest(stageManifestRaw,context);
 const readiness=variantReadiness(context,manifest,G);
 const routes=routeContracts.map(r=>({route:r.route,stagingReachable:true,stagingStatus:200,stagingStaticCspSafe:true,stagingSecurityHeaders:true,stagingShell:r.shellPaths,stagingHeaders:headers,reasonCodes:[]}));
 const staging={schemaVersion:'1.1',mode:'isolated-variant',publicSafe:true,generatedAt:new Date(observation.observedAtEpochMs).toISOString(),
  candidateReady:true,candidateFindings:[],candidateBuildSha:G,stagingBuildSha:receipt.copiedHistoricalBuildStamp.commitSha,
  artifactManifest:{candidateRoot:manifest.root,candidateLeafCount:79,stagingRoot:receipt.stageVariant.artifactRoot,stagingLeafCount:79,matched:false},
  surfaceParity:{state:'matched'},isolatedStaging:readiness,routes,status:'yellow'};
 assert.equal(parityVm.evaluateReleaseArtifact(staging,Date.now(),12,{},G,manifest,context).ok,true);
 const wrong=clone(staging);wrong.artifactManifest.stagingRoot=manifest.root;
 assert.equal(parityVm.evaluateReleaseArtifact(wrong,Date.now(),12,{},G,manifest,context).ok,false);
 assert.equal(parityVm.evaluateReleaseArtifact(staging,Date.now(),12,{},G,manifest).ok,false);
 const input={...proofVm.fixture,staging,candidateManifest:manifest,stagingDeployReceipt:receipt,stagingDeployHistory:[row],isolatedContext:context,
  identityMigration:{...proofVm.fixture.identityMigration,state:'honest-dark',productionEligible:false,blockers:['real-provider-e2e-pending']},
  productionPromotion:{...proofVm.fixture.productionPromotion,hold:true,releaseState:'hold',reasons:['real-provider-e2e-pending']}};
 const proof=proofVm.deriveReleaseProof(input);
 assert.equal(proof.mode,'isolated-variant');assert.equal(proof.checks.installedVariantBound,true);
 assert.equal(proof.checks.stagingDeployAttested,true);assert.equal(proof.checks.stagingDeployHistoryBound,true);
 assert.equal(proof.staging.artifactManifest.matched,false);assert.equal(proof.releaseState,'hold');
 assert.equal(proof.checks.identityMigrationVerified,false);assert.equal(proof.checks.productionPromotionReady,false);
 assert(proof.blockers.includes('identity:real-provider-e2e-pending'));
 assert.throws(()=>proofVm.deriveReleaseProof({...input,staging:wrong}));
 assert.throws(()=>proofVm.deriveReleaseProof({...input,isolatedContext:null}));
});
await test('actual ceremony validator retains exactly eleven required checks',()=>{
 const source=fs.readFileSync(new URL('../run-release-ceremony.mjs',import.meta.url),'utf8');
 const expected=['redirect-readiness-probe','redirect-readiness','staging-deploy-lineage','lane-held-asset-drift','staging-browser',
  'staging-browser-receipt','attention-browser','attention-browser-receipt','promotion-contract','promotion-ready','doctor'];
 const declared=source.match(/const EXPECTED_STEP_IDS = (\[[^\]]+\]);/);assert(declared);
 assert.deepEqual(Array.from(vm.runInNewContext(declared[1])),expected);
 const context={EXPECTED_STEP_IDS:expected,CANONICAL_STAGING:'https://website.staging.vaultsparkstudios.com'};vm.createContext(context);
 const start=source.indexOf('function validateReceipt(receipt)'),end=source.indexOf('function selfTest()',start);
 vm.runInContext(source.slice(start,end),context);
 const receipt={state:'passed',publicSafe:true,stagingOrigin:context.CANONICAL_STAGING,
  steps:expected.map(id=>({id,state:'passed'})),evidenceSha256:h('a'),contractSha256:h('b')};
 assert.equal(context.validateReceipt(receipt).length,0);
 assert.notEqual(context.validateReceipt({...receipt,steps:receipt.steps.slice(1)}).length,0);
 assert.notEqual(context.validateReceipt({...receipt,stagingMode:'isolated-variant'}).length,0);
 const variant={...receipt,stagingMode:'isolated-variant',installationPayloadSha256:installationHash,observationPayloadSha256:observationHash};
 assert.equal(context.validateReceipt(variant).length,0);
 assert.notEqual(context.validateReceipt({...variant,steps:variant.steps.map(s=>s.id==='promotion-ready'?{...s,state:'rejected'}:s)}).length,0);
});
await test('exact runtime loader performs mandatory raw HTTPS marker verification',async()=>{
 const source=fs.readFileSync(new URL('../lib/isolated-staging-evidence.mjs',import.meta.url),'utf8');
 const start=source.indexOf('export async function loadRuntimeContext'),end=source.indexOf('export async function readBoundedResponse',start);
 const references={schemaVersion:1,sourceCommit:G,transport:{installationId:1,installationHash,requestId:2,requestHash,observationId:3,observationHash,runId:11,runAttempt:2}};
 const raw=JSON.stringify(references),files={'context.json':raw,'config/isolated-staging-admission.json':JSON.stringify(policy),
  'data/staging-deploy-history.ndjson':'','api/candidate-artifact-manifest.json':JSON.stringify(manifest)};
 let marker=stageManifestRaw,reads=0;
 const context={parseBoundedJson:(bytes,hash)=>{assert.equal(sha256(bytes),hash);return JSON.parse(bytes);},readOwned:(_root,file)=>Buffer.from(files[file]),
  exactKeys:(value,keys)=>assert.deepEqual(Object.keys(value).sort(),Array.from(keys).sort()),
  need:(value,code)=>{if(!value)throw Error(code);},verifyFrozenSource:()=>frozen,validatePublisherPolicy,admitRuntime,
  sha256,STAGING_ORIGIN:'https://website.staging.vaultsparkstudios.com',AbortSignal,readBoundedResponse,assertCurrentStageManifest,
  fetch:async(url,options)=>{reads++;assert.equal(url,'https://website.staging.vaultsparkstudios.com/api/candidate-artifact-manifest.json');assert.equal(options.redirect,'error');return new Response(marker,{status:200});}};
 vm.createContext(context);vm.runInContext(source.slice(start,end).replace('export async function ','async function '),context);
 await context.loadRuntimeContext('/offline-root','context.json',sha256(raw),{api,now});assert.equal(reads,1);
 marker=JSON.stringify({root:manifest.root,leafCount:79});
 await assert.rejects(()=>context.loadRuntimeContext('/offline-root','context.json',sha256(raw),{api,now}));assert.equal(reads,2);
});
await test('raw G closure binds direct and transitive executed helper bytes',()=>{
 const blobs=new Map();const rows=verifierSourceClosure(file=>{const b=fs.readFileSync(new URL('../../'+file,import.meta.url));blobs.set(file,b);return b;});
 for(const file of ['scripts/lib/safe-spawn.mjs','scripts/lib/fast-node.mjs','scripts/lib/git-window-guard.mjs','scripts/lib/windows-hide-shim.cjs','scripts/lib/cli-contract.mjs',
  'scripts/check-production-promotion-gate.mjs','scripts/run-staging-release-gate.mjs','scripts/run-attention-release-gate.mjs','tests/staging-release.spec.js','playwright.config.js'])assert(rows.some(r=>r.file===file));
 assert(!CONTRACT_FILES.includes('package-lock.json'));
 const source=fs.readFileSync(new URL('../lib/isolated-staging-evidence.mjs',import.meta.url),'utf8');
 const start=source.indexOf('export function verifyFrozenSource'),end=source.indexOf('/** Relative imports',start);
 const local=new Map(blobs);
 const context={isHash:(v,n)=>new RegExp(`^[a-f0-9]{${n}}$`).test(v),need:(v,c)=>{if(!v)throw Error(c);},sha256,canonical,
  verifierSourceClosure,readOwned:(_root,file)=>local.get(file),process,
  spawnSync:(cmd,args)=>{assert.equal(cmd,'git');return{status:0,stdout:args[0]==='rev-parse'?Buffer.from(args[1]==='HEAD'?G+'\n':tree+'\n'):blobs.get(args[2].slice(41))};}};
 vm.createContext(context);vm.runInContext(source.slice(start,end).replace('export function ','function '),context);
 assert.equal(context.verifyFrozenSource('/offline',G).sourceTreeSha,tree);
 local.set('scripts/lib/safe-spawn.mjs',Buffer.concat([local.get('scripts/lib/safe-spawn.mjs'),Buffer.from('\n// later source\n')]));
 assert.throws(()=>context.verifyFrozenSource('/offline',G),/later-verifier-source/);
 local.set('scripts/lib/safe-spawn.mjs',blobs.get('scripts/lib/safe-spawn.mjs'));
 local.set('scripts/check-production-promotion-gate.mjs',Buffer.concat([local.get('scripts/check-production-promotion-gate.mjs'),Buffer.from('\n// later spawned gate\n')]));
 assert.throws(()=>context.verifyFrozenSource('/offline',G),/later-verifier-source/);
});
await test('actual variant --require-green entrypoint refreshes before consuming fresh per-run health',async()=>{
 const context=await admit();assertCurrentStageManifest(stageManifestRaw,context);
 const html='<script src="/assets/test.shell-aaaaaaaaaa.js"></script>',root='/offline';
 const files=new Map([[path.join(root,'api/build-sha.json'),JSON.stringify({sha:receipt.copiedHistoricalBuildStamp.commitSha})],
  [path.join(root,'api/candidate-artifact-manifest.json'),JSON.stringify(manifest)],
  ...['index.html','studio-pulse/index.html','membership/index.html'].map(f=>[path.join(root,f),html])]);
 const writes=new Map(),events=[];
 const source=paritySource.replace(/^#![^\n]*\n/,'').replace(/^import .*;\r?\n/gm,'').replaceAll('export function ','function ');
 const fakeFs={existsSync:file=>files.has(file)||writes.has(file),readFileSync:(file,encoding)=>{
   const text=files.get(file)??writes.get(file);assert.notEqual(text,undefined,`unexpected fixture read ${file}`);return encoding?text:Buffer.from(text);},
  mkdirSync:()=>{},writeFileSync:(file,text)=>{events.push('write-health');writes.set(file,String(text));}};
 const runtime={fs:fakeFs,path,shellPaths,PAGE_CSP:headers.csp,WORKER_CSP:headers.csp,runtimeContextArgs,
  loadRuntimeContext:async()=>context,runtimeArtifactPath,variantReadiness,evaluateVariantRoutes,AbortSignal,URL,
  console:{log:()=>{},warn:()=>{},error:()=>{}},
  process:{cwd:()=>root,argv:['node','check-staging-parity.mjs','--require-green','--isolated-staging-context=.cache/ctx.json','--isolated-staging-context-sha256='+h('a')],
   exit:status=>{throw{fixtureExit:true,status};}},
  fetch:async url=>{events.push('anonymous-get');const u=new URL(url);
   if(u.pathname==='/sitemap.xml')return new Response('<loc>https://vaultsparkstudios.com/</loc>',{status:200});
   if(u.pathname==='/api/build-sha.json')return new Response(JSON.stringify({sha:receipt.copiedHistoricalBuildStamp.commitSha}),{status:200});
   if(u.pathname==='/api/candidate-artifact-manifest.json')return new Response(stageManifestRaw,{status:200});
   return new Response(html,{status:200,headers:{'content-security-policy':headers.csp,'strict-transport-security':headers.hsts,
    'x-content-type-options':headers.xcto,'referrer-policy':headers.referrer}});
  }};
 vm.createContext(runtime);
 try{await vm.runInContext('(async()=>{'+source+'\n})()',runtime);assert.fail('entrypoint did not exit');}catch(error){if(!error.fixtureExit)throw error;assert.equal(error.status,0);}
 assert(events.indexOf('anonymous-get')>=0);assert(events.indexOf('write-health')>events.indexOf('anonymous-get'));
 assert.equal(writes.size,1);const [file,text]=[...writes][0];assert(file.includes('.cache'));assert.equal(JSON.parse(text).candidateReady,true);
 assert.equal(JSON.parse(text).mode,'isolated-variant');assert.equal(JSON.parse(text).stagingBuildSha,receipt.copiedHistoricalBuildStamp.commitSha);
});
await test('actual Doctor variant staleness exemption requires current observation and both browser receipts',async()=>{
 const source=fs.readFileSync(new URL('../run-release-ceremony.mjs',import.meta.url),'utf8');
 const start=source.indexOf('function evaluateDoctorStep('),end=source.indexOf('\n/**',start);
 const context={assertAdmittedContext};vm.createContext(context);vm.runInContext(source.slice(start,end),context);
 const admitted=await admit();assertCurrentStageManifest(stageManifestRaw,admitted);
 const score={blockingFailing:1,checks:[{id:'deploy-currency-live',blocking:true,pass:false}]};
 const evidence={releaseProof:{mode:'isolated-variant',isolatedStaging:{observationSha256:observationHash},staging:{candidateReady:true,candidateBuildSha:G,
  artifactManifest:{candidateRoot:manifest.root},deployReceipt:{state:'verified',attested:true,receiptId:receipt.receiptId}}},
  browserReceipt:{state:'passed',skipped:0,observedTests:6,expectedTests:6},
  attentionReceipt:{state:'passed',skipped:0,failed:0,flaky:0,observedTests:15,expectedTests:15}};
 assert.equal(context.evaluateDoctorStep(score,{state:'stale'},evidence,0,admitted).state,'passed');
 const wrong=clone(evidence);wrong.releaseProof.isolatedStaging.observationSha256=h('0');
 assert.equal(context.evaluateDoctorStep(score,{state:'stale'},wrong,0,admitted).state,'rejected');
 assert.equal(context.evaluateDoctorStep({...score,checks:[{id:'other-blocker',blocking:true,pass:false}]},{state:'stale'},evidence,0,admitted).state,'rejected');
 assert.equal(context.evaluateDoctorStep(score,{state:'stale'},{...evidence,attentionReceipt:null},0,admitted).state,'rejected');
 admitted.observation.effectiveExpiresAtEpochMs=now-1;
 assert.equal(context.evaluateDoctorStep(score,{state:'stale'},evidence,0,admitted).state,'rejected');
});
console.log(JSON.stringify({scope:'offline-isolated-staging-contract',passed:results.length,failed:0,network:false,credentials:false,nativeAcceptance:false}));
