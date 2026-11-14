import test from 'node:test';
import assert from 'node:assert/strict';
import {validateIsolatedStagingWorkflowInputs as validate} from '../scripts/validate-isolated-staging-workflow-inputs.mjs';
import {spawnSync} from '../scripts/lib/safe-spawn.mjs';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {currentCeremonyHashes} from '../scripts/run-release-ceremony.mjs';
import {CONTRACT_FILES} from '../scripts/lib/isolated-staging-evidence.mjs';
import {promotionMode, nativeHoldEligible} from '../scripts/check-production-promotion-gate.mjs';

const good = {event: 'workflow_dispatch', confirmProduction: 'true', installationId: '123456789', installationHash: 'a'.repeat(64)};
test('legacy dispatch, push and content paths without isolated inputs retain their existing gate', () => {
  for (const event of ['push', 'schedule', 'workflow_dispatch']) {
    for (const confirmProduction of ['', 'false', 'true']) assert.deepEqual(validate({event, confirmProduction, confirmContent: 'true'}), {configured: false});
  }
});
test('only a complete confirmed full-promotion reference enables isolated evidence', () => {
  assert.deepEqual(validate(good), {configured: true});
  for (const key of ['installationId', 'installationHash']) assert.throws(() => validate({...good, [key]: ''}));
  for (const event of ['push', 'schedule', 'pull_request', '', undefined]) assert.throws(() => validate({...good, event}));
  for (const confirmProduction of ['false', '', true, false, undefined]) assert.throws(() => validate({...good, confirmProduction}));
});
test('untrusted deployment references refuse shell text, rounding, whitespace and incomplete hashes', () => {
  for (const installationId of ['0', '01', '-1', '1e2', '9007199254740992', '123\n456', '12;echo bad', '$(echo bad)', 123]) {
    assert.throws(() => validate({...good, installationId}));
  }
  for (const installationHash of ['A'.repeat(64), 'a'.repeat(63), 'a'.repeat(64)+'\n', 'a'.repeat(64)+';echo bad', 123]) {
    assert.throws(() => validate({...good, installationHash}));
  }
});
test('isolated evidence cannot be combined with content, hotfix, or Desk lanes', () => {
  for (const key of ['confirmContent', 'confirmHotfix', 'confirmDesk']) {
    for (const value of ['true', true, 'unexpected']) assert.throws(() => validate({...good, [key]: value}));
    for (const value of ['', 'false', undefined]) assert.deepEqual(validate({...good, [key]: value}), {configured: true});
  }
  assert.throws(() => validate({...good, arbitraryObserver: 'unreviewed'}));
});
test('Worker-upload pair is optional for legacy/Worker-first and strict when present for Pages',()=>{
 const pair={workerUploadId:'987654321',workerUploadHash:'b'.repeat(64)};
 assert.deepEqual(validate({...good,...pair}),{configured:true});assert.deepEqual(validate({...good,workerUploadId:'',workerUploadHash:''}),{configured:true});
 for(const key of ['workerUploadId','workerUploadHash'])for(const value of['',undefined,null,true,123])assert.throws(()=>validate({...good,...pair,[key]:value}));
 for(const workerUploadId of ['0','01','1e2','1;echo bad','$(bad)','1\n2','9007199254740992'])assert.throws(()=>validate({...good,...pair,workerUploadId}));
 for(const workerUploadHash of ['A'.repeat(64),'b'.repeat(63),'b'.repeat(64)+'\n'])assert.throws(()=>validate({...good,...pair,workerUploadHash}));
 assert.throws(()=>validate({...pair,event:'workflow_dispatch',confirmProduction:'true'}));
 for(const event of['push','schedule',''])assert.throws(()=>validate({...good,...pair,event}));
 for(const key of['confirmContent','confirmHotfix','confirmDesk'])assert.throws(()=>validate({...good,...pair,[key]:'true'}));
});
test('actual CLI refuses invalid references without echoing payload and remains inert by default', () => {
  const args = ['scripts/validate-isolated-staging-workflow-inputs.mjs'];
  const env = {...process.env, GITHUB_EVENT_NAME: 'workflow_dispatch', PRODUCTION_CONFIRM: 'true', INSTALLATION_DEPLOYMENT_ID: '123;INVALID_MARKER', INSTALLATION_PAYLOAD_SHA256: 'a'.repeat(64)};
  const bad = spawnSync(process.execPath, [...args, '--emit-github-output'], {encoding: 'utf8', env});
  assert.equal(bad.status, 2); assert.equal(bad.stdout, ''); assert.ok(!bad.stderr.includes('INVALID_MARKER'));
  const inert = spawnSync(process.execPath, args, {encoding: 'utf8', env});
  assert.equal(inert.status, 0); assert.equal(JSON.parse(inert.stdout).executed, false);
  const valid = spawnSync(process.execPath, [...args, '--emit-github-output'], {encoding: 'utf8', env: {...env, INSTALLATION_DEPLOYMENT_ID: '123'}});
  assert.equal(valid.status, 0); assert.equal(valid.stdout.trim(), 'configured=true');
});

const promotion = {schemaVersion:'1.0',hold:true,releaseState:'hold',reasons:['real-provider-e2e-pending'],
  promotionContract:{requiresWorkflowDispatch:true,requiresExplicitConfirmation:true,stagingFirst:true},
  blastRadius:{'real-provider-e2e-pending':['auth/**','surface:identity','worker:identity']}};
const dependencies = {identityReceipt:{schemaVersion:'1.0',publicSafe:true,state:'honest-dark',productionEligible:false,blockers:['real-provider-e2e-pending']},
  controlPlane:{schemaVersion:'1.0',publicSafe:true,overall:'ready'},candidateLeaves:[{path:'index.html'}]};
test('full archive and Worker cannot borrow coarse content-manifest disjointness',()=>{
  assert.equal(promotionMode(promotion,'workflow_dispatch','true',{...dependencies,footprint:'full'}),'blocked');
  assert.equal(promotionMode(promotion,'workflow_dispatch','true',dependencies),'blocked');
  assert.equal(promotionMode(promotion,'workflow_dispatch','true',{...dependencies,footprint:'content'}),'scoped');
  assert.equal(promotionMode(promotion,'push','true',dependencies),'blocked');
  assert.equal(promotionMode(promotion,'workflow_dispatch','false',dependencies),'blocked');
});
test('native-looking JSON and copied acceptance booleans never authorize the full footprint',()=>{
  for(const isolatedContext of [{stageNative:{state:'passed'}},{mode:'isolated-variant',installation:{schemaVersion:2,stageNative:{state:'passed'}}},
    {mode:'affected-auth-stage-verified',productionNativePending:true,fullReleaseAccepted:false}]){
    assert.equal(promotionMode(promotion,'workflow_dispatch','true',{...dependencies,footprint:'full',isolatedContext}),'blocked');
  }
  assert(nativeHoldEligible(promotion,dependencies));
  assert(!nativeHoldEligible({...promotion,reasons:[...promotion.reasons,'other-blocker']},dependencies));
  assert(!nativeHoldEligible(promotion,{...dependencies,controlPlane:{overall:'partial'}}));
});
test('legacy genuinely clear promotion retains all verified dependency requirements',()=>{
  const clear={...promotion,hold:false,releaseState:'ready',reasons:[]};
  const ready={...dependencies,footprint:'full',identityReceipt:{...dependencies.identityReceipt,state:'verified',productionEligible:true,blockers:[]}};
  assert.equal(promotionMode(clear,'workflow_dispatch','true',ready),'clear');
  assert.equal(promotionMode(clear,'workflow_dispatch','true',{...ready,identityReceipt:dependencies.identityReceipt}),'blocked');
  assert.equal(promotionMode(clear,'workflow_dispatch','true',{...ready,controlPlane:{...ready.controlPlane,overall:'partial'}}),'blocked');
});
test('actual production gate grammar refuses fake native mode and partial or duplicate contexts before credentials',()=>{
  for(const args of [['--require-allowed','--stage-native=true'],['--require-allowed','--isolated-staging-context=.cache/context.json'],
    ['--require-allowed','--isolated-staging-context=.cache/context.json','--isolated-staging-context=.cache/other.json','--isolated-staging-context-sha256='+'a'.repeat(64)]]){
    const r=spawnSync(process.execPath,['scripts/check-production-promotion-gate.mjs',...args],{encoding:'utf8',windowsHide:true,timeout:10000});
    assert.notEqual(r.status,0);assert.equal(r.stdout,'');assert.match(r.stderr,/admission refused/);
  }
});
test('both actual workflows keep INSTALL eligibility separate from final observed deployment authority',()=>{
  for(const name of ['pages-deploy','cloudflare-worker-deploy']){
    const source=fs.readFileSync(new URL('../.github/workflows/'+name+'.yml',import.meta.url),'utf8');
    const early=source.indexOf('id: promotion-preflight'),receive=source.indexOf('- name: Receive run-bound isolated staging observation'),
      final=source.indexOf('id: promotion-gate'),ceremony=source.indexOf('- name: Run canonical release ceremony');
    assert(early>=0&&receive>early&&final>receive&&ceremony>final);
    const block=source.slice(source.lastIndexOf('- name:',final),ceremony);
    assert(block.includes('steps.isolated-staging.outputs.context_file'));
    assert(block.includes('--isolated-staging-context-sha256=$ISOLATED_CONTEXT_SHA256'));
    assert(block.includes('check-production-promotion-gate.mjs --emit-github-output "${ARGS[@]}"'));
    const deployment=source.slice(source.indexOf(name==='pages-deploy'?'- name: Deploy to Cloudflare Pages':'- name: Deploy Worker (npm run deploy)'));
    assert(deployment.split('\n').slice(0,3).join('\n').includes("steps.promotion-gate.outputs.allowed == 'true'"));
    assert(!deployment.split('\n').slice(0,3).join('\n').includes('promotion-preflight'));
  }
});
test('actual Worker preflight forwards the paired context to both gate and exact eleven-step ceremony',()=>{
  const source=fs.readFileSync(new URL('../scripts/deploy-worker.mjs',import.meta.url),'utf8');
  const start=source.indexOf('export function productionPreflightPlan('),end=source.indexOf('\nif (args.includes',start);
  const scope={};vm.createContext(scope);vm.runInContext(source.slice(start,end).replace('export function','function'),scope);
  const pair=['--isolated-staging-context=.cache/run.json','--isolated-staging-context-sha256='+'a'.repeat(64)];
  for(const ci of [true,false])for(const step of scope.productionPreflightPlan({ci,isolatedCli:pair}))assert.deepEqual(Array.from(step.args.slice(-2)),pair);
  assert(source.includes("...(bundleDirectory?['--outdir',bundleDirectory]:[])"));
  assert(!source.includes('dry-run'));
});
test('actual eleven-step receipt validator rejects native relabeling, altered digest and premature production success',()=>{
  const source=fs.readFileSync(new URL('../scripts/run-release-ceremony.mjs',import.meta.url),'utf8');
  const start=source.indexOf('const EXPECTED_STEP_IDS ='),end=source.indexOf('\nfunction selfTest()',start);
  const scope={CANONICAL_STAGING:'https://website.staging.vaultsparkstudios.com'};vm.createContext(scope);
  vm.runInContext(source.slice(start,end)+'\nthis.ids=EXPECTED_STEP_IDS;',scope);
  const native={mode:'affected-auth-stage-verified',stageNativeSha256:'d'.repeat(64)};
  const receipt={state:'passed',publicSafe:true,stagingOrigin:scope.CANONICAL_STAGING,evidenceSha256:'a'.repeat(64),contractSha256:'b'.repeat(64),
    promotionMode:native.mode,productionNativePending:true,fullReleaseAccepted:false,
    steps:Array.from(scope.ids,id=>({id,state:'passed',...(id==='promotion-ready'?{promotionMode:native.mode,productionNativePending:true,stageNativeSha256:native.stageNativeSha256}:{})}))};
  assert.equal(scope.validateReceipt(receipt,native).length,0);
  assert(scope.validateReceipt(receipt).length>0);
  assert(scope.validateReceipt({...receipt,fullReleaseAccepted:true},native).length>0);
  const altered=JSON.parse(JSON.stringify(receipt));altered.steps.find(s=>s.id==='promotion-ready').stageNativeSha256='f'.repeat(64);
  assert(scope.validateReceipt(altered,native).length>0);
  assert(scope.validateReceipt({...receipt,steps:receipt.steps.slice(1)},native).length>0);
});


test('actual ceremony hash export preserves original exact evidence and full contract inputs',()=>{
  const hash=paths=>createHash('sha256').update(paths.map(file=>{let body;try{body=fs.readFileSync(file,'utf8');}catch{body='missing';}return `${file}\0${body}`;}).join('\n')).digest('hex');
  const evidence=['api/obelisk-redirect-readiness.json','api/staging-deploy-receipt.json','api/staging-deploy-continuity.json','api/staging-release-browser.json','api/staging-attention-browser.json','context/PRODUCTION_PROMOTION.json','context/PROJECT_STATUS.json'];
  const contract=['scripts/run-release-ceremony.mjs','scripts/run-staging-release-gate.mjs','tests/staging-release.spec.js','tests/lib/tt-report-only.js','scripts/run-attention-release-gate.mjs','tests/attention-surfaces.spec.js','scripts/check-production-promotion-gate.mjs'];
  const original='.cache/isolated-staging/context.json';
  assert.deepEqual(currentCeremonyHashes(),{evidenceSha256:hash(evidence),contractSha256:hash(contract)});
  assert.deepEqual(currentCeremonyHashes(original),{evidenceSha256:hash([...evidence,original]),contractSha256:hash([...contract,...CONTRACT_FILES])});
});

test('actual Pages workflow validates Worker association before mutation and retains its own postflight context',()=>{
  const source=fs.readFileSync(new URL('../.github/workflows/pages-deploy.yml',import.meta.url),'utf8');
  const workerCheck=source.indexOf('--check-worker-upload'),deploy=source.indexOf('- name: Deploy to Cloudflare Pages');
  assert(workerCheck>0&&workerCheck<deploy);
  for(const name of ['Validate isolated staging inputs','Receive run-bound isolated staging observation']){
    const start=source.indexOf('- name: '+name);assert(start>=0);
    const block=source.slice(start,source.indexOf('\n      - name:',start+1));
    assert(block.includes('WORKER_UPLOAD_DEPLOYMENT_ID:'));assert(block.includes('WORKER_UPLOAD_PAYLOAD_SHA256:'));
  }
  const request=source.indexOf('- name: Request actual production native postflight'),receive=source.indexOf('- name: Receive actual production native postflight'),apply=source.indexOf('- name: Apply exact production observation metadata'),publish=source.indexOf('- name: Publish exact production observation metadata'),verify=source.indexOf('- name: Verify actual production metadata finalization');
  assert(deploy<request&&request<receive&&receive<apply&&apply<publish&&publish<verify);
  assert(source.slice(request,receive).includes('steps.isolated-staging.outputs.context_file'));
  assert(source.slice(receive,apply).includes('--output=.cache/isolated-staging/production-postflight-context.json'));
  for(const start of [apply,verify])assert(source.slice(start,source.indexOf('\n      - name:',start+1)>0?source.indexOf('\n      - name:',start+1):undefined).includes('steps.production-postflight.outputs.context_file'));
  assert(source.slice(publish,verify).includes('wrangler@4 pages deploy /tmp/pages-dist --project-name vaultsparkstudios-website --branch main --commit-dirty=true'));
  assert(source.slice(verify).includes('--publish-finalization'));
  assert(source.slice(verify).includes('--source-commit=$GITHUB_SHA'));
  assert(!source.includes('--verify-metadata-finalization'));
  assert(!source.includes('CF_WORKER_API_TOKEN'));
});

test('actual Worker rollout rechecks authenticated original Worker before upload and rollback names that version',()=>{
  const source=fs.readFileSync(new URL('../scripts/deploy-worker.mjs',import.meta.url),'utf8');
  const authorized=source.indexOf('isolated.productionRollbackAuthorization(context)'),recheck=source.indexOf('await assertCurrentWorkerRollback(ROOT,context,rollback)'),upload=source.indexOf("[wrangler, 'deploy'");
  assert(authorized>0&&authorized<recheck&&recheck<upload);
  const workflow=fs.readFileSync(new URL('../.github/workflows/cloudflare-worker-deploy.yml',import.meta.url),'utf8');
  assert(workflow.indexOf('--publish-worker-upload')>workflow.indexOf('- name: Deploy Worker (npm run deploy)'));
  assert(workflow.includes('steps.deploy.outputs.production_rollback_worker_version'));
  assert(workflow.includes('wrangler rollback "$WORKER_ROLLBACK_VERSION"'));
  const verification=workflow.slice(workflow.indexOf('- name: Verify rollback restored the site'));
  assert(verification.includes('assertCurrentWorkerRollback(root,context,productionRollbackAuthorization(context))'));
  assert(verification.indexOf('assertCurrentWorkerRollback(root')<verification.indexOf('scripts/smoke-live.mjs'));
  assert(!workflow.includes('--publish-production-rollback'));
  assert(!workflow.includes('WORKER_UPLOAD_DEPLOYMENT_ID:'));
});
