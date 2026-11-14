import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {POSTFLIGHT_PATHS,AUTH_INPUT_ROOTS,PREFLIGHT_CHECKS,deriveAuthInputClosure,authInputCutClassification,postflightOutputRoot,postflightHash,validateProductionDeployment,validateProductionPreflight,assertMetadataOnlyDelta,servedInventory,applyMetadataOverlay,readProductionWorker,readProductionInventory,assertProductionWorkerUpload,readProductionPages,authReadbackBudget,pauseAuthReadbackBudget,resumeAuthReadbackBudget} from '../scripts/lib/production-postflight.mjs';
import {assertProductionPostflightResult,runProductionPostflight,deriveProductionJourney,deriveJourney,expectedInvestorAllow} from '../scripts/verify-provider-journey.mjs';
import {WEBSITE_SUPABASE_URL} from '../scripts/lib/website-supabase-probe-credential.mjs';
import {deriveProductionIdentityReceipt} from '../scripts/build-identity-migration-receipt.mjs';
import {projectRolloutAuthorization,deriveProductionPostflightProof} from '../scripts/build-release-proof.mjs';
const G='a'.repeat(40),H='b'.repeat(64),V='11111111-1111-4111-8111-111111111111';
const deployment={sourceCommit:G,workerVersionId:V,workerBundleSha256:H,workerMetadataSha256:H,applicationInventorySha256:H,pagesDeploymentId:V,pagesDeploymentUrl:'https://abcd1234.vaultsparkstudios-website.pages.dev',pagesMetadataSha256:H,authInputClosureSha256:H};
const auth={mode:'affected-auth-stage-verified',sourceCommit:G,sourceTreeSha:'c'.repeat(40),stageSealSha256:H,stageNativeSha256:H,installationPayloadSha256:H,productionNativePending:true,fullReleaseAccepted:false};
const row=(file,value)=>({file,bytes:Buffer.byteLength(value),sha256:postflightHash(value)});
test('run output is fixed to exact G/run/attempt and rejects path injection',()=>{
 assert.equal(postflightOutputRoot('/owned',{sourceCommit:G,runId:42,runAttempt:2}),path.join('/owned','.cache','production-postflight',G,'42-2'));
 for(const bad of [{sourceCommit:'../x',runId:42,runAttempt:1},{sourceCommit:G,runId:0,runAttempt:1},{sourceCommit:G,runId:42,runAttempt:1.1}])assert.throws(()=>postflightOutputRoot('/owned',bad));
});
test('deployment source/version/bundle/config/inventory are all required',()=>{
 assert.equal(validateProductionDeployment(deployment,G),deployment);
 for(const k of Object.keys(deployment)){const v={...deployment};delete v[k];assert.throws(()=>validateProductionDeployment(v,G));}
 assert.throws(()=>validateProductionDeployment({...deployment,sourceCommit:'d'.repeat(40)},G));
 assert.throws(()=>validateProductionDeployment({...deployment,passed:true},G));
});
test('exact three metadata paths may differ; every application/path/count delta fails',()=>{
 const before=[row('index.html','app'),...POSTFLIGHT_PATHS.map(f=>row(f,'old'))],after=[row('index.html','app'),...POSTFLIGHT_PATHS.map(f=>row(f,'new'))];
 assert.equal(assertMetadataOnlyDelta(before,after).changes.length,3);
 assert.throws(()=>assertMetadataOnlyDelta(before,[row('index.html','changed'),...after.slice(1)]));
 assert.throws(()=>assertMetadataOnlyDelta(before,after.slice(1)));
 assert.throws(()=>assertMetadataOnlyDelta(before,[...after.slice(0,-1),row('api/arbitrary.json','new')]));
 assert.throws(()=>assertMetadataOnlyDelta(before,[after[0],after[0],...after.slice(2)]));
});
test('overlay preflights complete fixed readset, then preserves application bytes',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vs-postflight-'));
 try{fs.mkdirSync(path.join(dir,'api'));fs.writeFileSync(path.join(dir,'index.html'),'unchanged application');for(const f of POSTFLIGHT_PATHS)fs.writeFileSync(path.join(dir,f),'old');
 const before=servedInventory(dir),outputs=Object.fromEntries(POSTFLIGHT_PATHS.map(f=>[f,Buffer.from(JSON.stringify({publicSafe:true,observed:'actual'}))]));
 const missing={...outputs};delete missing[POSTFLIGHT_PATHS[0]];assert.throws(()=>applyMetadataOverlay(dir,before,missing));assert.equal(fs.readFileSync(path.join(dir,POSTFLIGHT_PATHS[1]),'utf8'),'old');
 assert.equal(applyMetadataOverlay(dir,before,outputs).changes.length,3);assert.equal(fs.readFileSync(path.join(dir,'index.html'),'utf8'),'unchanged application');
 assert.throws(()=>applyMetadataOverlay(dir,before,outputs));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('JSON copies and caller assertions cannot mint execution/upload brands',()=>{
 assert.throws(()=>assertProductionPostflightResult({allFiveLegsPassed:true,cleanupComplete:true}));assert.throws(()=>assertProductionWorkerUpload({workerUploadAssociated:true}));
});
test('rollout projection preserves production pending and rejects caller completion',()=>{
 const p=projectRolloutAuthorization(auth);assert.equal(p.productionNativePending,true);assert.equal(p.fullReleaseAccepted,false);
 assert.throws(()=>projectRolloutAuthorization({...auth,fullReleaseAccepted:true}));assert.throws(()=>projectRolloutAuthorization({...auth,productionNativePending:false}));assert.throws(()=>projectRolloutAuthorization({...auth,hold:false}));
});
function identity(){return {environment:'production',state:'verified',productionEligible:true,blockers:[],generatedAt:'2026-11-13T00:00:00.000Z',bindings:{worker:{sourceCommit:G,versionId:V}}};}
function promotion(){return {reconciled:true,productionPostflight:{sourceCommit:G,fullRemoteAuthClosureObserved:true,fullInventoryBytesObserved:false,customOriginRoutesHeadersShellVerified:true,workerAssociationVerified:true}};}
test('postflight projection keeps source policy hold and original preflight time',()=>{
 const proof=deriveProductionPostflightProof({preflightProof:{generatedAt:'2026-11-12T00:00:00.000Z',promotion:{hold:true},blockers:['identityMigrationVerified','productionPromotionReady','identity:real-provider-e2e-pending']},identityReceipt:identity(),promotionReceipt:promotion(),journeySha256:H,authorization:auth});
 assert.equal(proof.promotion.hold,true);assert.equal(proof.productionPostflight.sourcePolicyHoldPreserved,true);assert.equal(proof.productionPostflight.metadataPublicationPending,true);assert.equal(proof.productionPostflight.fullReleaseAccepted,false);assert.equal(proof.productionPostflight.originalPreflightGeneratedAt,'2026-11-12T00:00:00.000Z');assert.deepEqual(proof.productionPostflight.remainingBlockers,[]);
});
test('postflight cannot borrow stage identity or unknown readback; unrelated blockers remain',()=>{
 const args={preflightProof:{blockers:['canonicalFavicon']},identityReceipt:identity(),promotionReceipt:promotion(),journeySha256:H,authorization:auth};
 assert.deepEqual(deriveProductionPostflightProof(args).productionPostflight.remainingBlockers,['canonicalFavicon']);
 assert.throws(()=>deriveProductionPostflightProof({...args,identityReceipt:{...identity(),environment:'staging'}}));assert.throws(()=>deriveProductionPostflightProof({...args,promotionReceipt:{reconciled:false}}));assert.throws(()=>deriveProductionPostflightProof({...args,identityReceipt:{...identity(),blockers:['pending']}}));
});
test('pure identity production projection uses actual provider association, never local HEAD',()=>{
 const evidence={migrationId:'test',environment:'staging',runtimeUpdates:{databaseMigration:{deployed:true,verification:'passed'},edgeFunction:{deployed:true,verification:'passed'}},rollback:{worker:'prior-version-available',staticSnapshot:'20261113000000',automaticLivenessRollback:true}};
 const journey={signedInCallback:'passed',compatibilitySession:'passed',roleMatrix:{member:'passed',investor:'passed'},revocation:'passed',verifiedAt:'2026-11-13T00:00:00.000Z'};
 const args={evidence,controlPlane:{overall:'ready',planes:{own:{status:'ready'}}},wranglerSource:'',authSource:"issuer: 'https://issuer.example.com', redirectUri: 'https://vaultsparkstudios.com/auth/callback',",hashes:{migration:H,edgeFunction:H},journey,association:{environment:'production',sourceCommit:G,workerVersionId:V,anonymousHealth:'passed'}};
 const result=deriveProductionIdentityReceipt(args);assert.equal(result.receipt.environment,'production');assert.equal(result.receipt.bindings.worker.sourceCommit,G);assert.equal(evidence.environment,'staging');
 assert.throws(()=>deriveProductionIdentityReceipt({...args,association:{...args.association,environment:'staging'}}));
});
test('fixed provider readback refuses split deployment before content/key scope escape',async()=>{
 const calls=[];await assert.rejects(()=>readProductionWorker(deployment,{getSecret:async()=> 'offline-fixture',fetchImpl:async(u,opts)=>{calls.push([u,opts.method]);return new Response(JSON.stringify({success:true,result:{deployments:[{versions:[{version_id:V,percentage:50},{version_id:'22222222-2222-4222-8222-222222222222',percentage:50}]}]}}));}}));
 assert.equal(calls.length,1);assert.match(calls[0][0],/^https:\/\/api.cloudflare.com\/client\/v4\/accounts\/2d737158a4dde61a7a476a9fda51af2f\/workers\/scripts\/vaultspark-security-headers-production\/deployments$/);assert.equal(calls[0][1],'GET');
});
test('actual multipart module hashes ignore changing transport boundaries and bind source bytes',async()=>{
 const resource={bindings:[{name:'OWN',type:'secret_text'}],script:{etag:H},script_runtime:{compatibility_date:'2026-01-01'}},body='export default {fetch(){return new Response("owned")}};',modules=[row('worker.js',body)];
 const settings={bindings:[{name:'OWN',type:'secret_text'}]},expected={...deployment,workerMetadataSha256:postflightHash(JSON.stringify({settings,versionResources:resource})),workerBundleSha256:postflightHash(JSON.stringify(modules))};
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vs-upload-'));fs.writeFileSync(path.join(dir,'worker.js'),body);
 const getFetch=(changed=false,entry=true)=>async u=>{
 if(u.endsWith('/deployments'))return Response.json({success:true,result:{deployments:[{versions:[{version_id:V,percentage:100}]}]}});
 if(u.endsWith('/versions/'+V))return Response.json({success:true,result:{id:V,resources:resource}});
 if(u.endsWith('/settings'))return Response.json({success:true,result:settings});
 assert.ok(u.endsWith('/content/v2?version='+V));const form=new FormData();form.set('worker.js',new Blob([changed?body+'//changed':body],{type:'application/javascript+module'}),'worker.js');const r=new Response(form);if(entry)r.headers.set('cf-entrypoint','worker.js');return r;
 };
 try{const a=await readProductionWorker(expected,{fetchImpl:getFetch(),getSecret:async()=> 'fixture',bundleDirectory:dir}),b=await readProductionWorker(expected,{fetchImpl:getFetch(),getSecret:async()=> 'fixture',bundleDirectory:dir});assert.deepEqual(a,b);
 await assert.rejects(()=>readProductionWorker(expected,{fetchImpl:getFetch(true),getSecret:async()=> 'fixture',bundleDirectory:dir}));await assert.rejects(()=>readProductionWorker(expected,{fetchImpl:getFetch(false,false),getSecret:async()=> 'fixture'}));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('finite remote closure enforces counts, per-file/total caps, deadline and exact bytes',async()=>{
 const rows=[row('auth/callback.html','callback'),row('assets/identity.js','owned')];let active=0,max=0;
 const r=await readProductionInventory(rows,{fetchImpl:async u=>{active++;max=Math.max(max,active);await new Promise(resolve=>setTimeout(resolve,2));active--;return new Response(u.endsWith('callback.html')?'callback':'owned');}});assert.equal(r.fullInventoryBytesObserved,false);assert.equal(r.fullRemoteAuthClosureObserved,true);assert.ok(max<=8);
 await assert.rejects(()=>readProductionInventory(Array.from({length:129},(_,i)=>row('assets/'+i+'.js','x'))));
 await assert.rejects(()=>readProductionInventory([{...rows[0],bytes:4*1024*1024+1}]));await assert.rejects(()=>readProductionInventory(rows,{deadlineEpochMs:Date.now()-1}));
 await assert.rejects(()=>readProductionInventory(rows,{fetchImpl:async()=>new Response('different')}));
});
test('reviewed auth closure includes real transitive code but cuts cache/manifest-only cosmetic strings',()=>{
 const files=new Map(AUTH_INPUT_ROOTS.map(f=>[f,Buffer.from(f.endsWith('.json')?'{}':'')]));
 files.set('assets/shell-manifest.json',Buffer.from(JSON.stringify({assets:{cosmetic:{path:'assets/cosmetic.js'}}})));files.set('sw.js',Buffer.from("const CACHE=['/assets/cosmetic.js'];"));files.set('assets/cosmetic.js',Buffer.from('cosmetic'));
 files.set('login.html',Buffer.from('<script src="/assets/auth-main.js"></script><link rel="stylesheet" href="/assets/auth.css">'));
 files.set('assets/auth-main.js',Buffer.from("import './auth-child.js';"));files.set('assets/auth-child.js',Buffer.from("export const own=true;"));files.set('assets/auth.css',Buffer.from('@import "./auth-child.css";'));files.set('assets/auth-child.css',Buffer.from('body{}'));
 const rows=deriveAuthInputClosure(files),selected=new Set(rows.map(x=>x.file));for(const f of ['assets/auth-main.js','assets/auth-child.js','assets/auth.css','assets/auth-child.css','sw.js','assets/shell-manifest.json'])assert.ok(selected.has(f));assert.equal(selected.has('assets/cosmetic.js'),false);assert.equal(authInputCutClassification(files,rows).filter(x=>x.path==='assets/cosmetic.js').length,2);
 const missing=new Map(files);missing.delete('auth/callback.html');assert.throws(()=>deriveAuthInputClosure(missing));const missingImport=new Map(files);missingImport.delete('assets/auth-child.js');assert.throws(()=>deriveAuthInputClosure(missingImport));
});
test('Pages association requires exact own project production deployment source and URL',async()=>{
 const d={id:V,url:deployment.pagesDeploymentUrl,environment:'production',deployment_trigger:{metadata:{branch:'main',commit_hash:G}},latest_stage:{status:'success'}};
 const fetchImpl=async()=>Response.json({success:true,result:{name:'vaultsparkstudios-website',production_branch:'main',canonical_deployment:d}});
 assert.equal((await readProductionPages(G,{fetchImpl,getSecret:async()=> 'fixture'})).pagesDeploymentId,V);
 for(const bad of [{...d,url:'https://evil.example.com'},{...d,environment:'preview'},{...d,latest_stage:{status:'building'}},{...d,deployment_trigger:{metadata:{branch:'main',commit_hash:'e'.repeat(40)}}}])await assert.rejects(()=>readProductionPages(G,{fetchImpl:async()=>Response.json({success:true,result:{name:'vaultsparkstudios-website',production_branch:'main',canonical_deployment:bad}}),getSecret:async()=> 'fixture'}));
});
test('production factory refuses injected Page/outcome and unbranded context before any execution',async()=>{
 await assert.rejects(()=>runProductionPostflight({context:{},Page:{},passed:true}));await assert.rejects(()=>runProductionPostflight({context:{}}));
});
test('production positive requires approved allow, owned member row, all five legs and logout',()=>{
 const id='offline-own-user',token=['fixture',Buffer.from(JSON.stringify({sub:id})).toString('base64url'),'fixture'].join('.');
 const obs={me:{ok:true,identity:{provider:'obelisk',sub:'offline-sub',supabaseUserId:id}},session:{ok:true,supabase:{access_token:token,user:{id}}},memberProbe:{status:200,ownedRowObserved:true},investorProbe:{expectedAllow:true,observedAllow:true},logout:{ok:true,providerLogout:{attempted:true,failed:[],revoked:['refresh_token']}},meAfterLogout:{ok:true,identity:null}};
 assert.equal(deriveProductionJourney(obs).roleMatrix.investor,'passed');
 const denied=structuredClone(obs);denied.investorProbe={expectedAllow:false,observedAllow:false};assert.equal(deriveJourney(denied).roleMatrix.investor,'passed');assert.throws(()=>deriveProductionJourney(denied));
 for(const mutate of [x=>x.memberProbe.ownedRowObserved=false,x=>x.meAfterLogout.ok=false,x=>x.investorProbe.expectedAllow=null,x=>x.logout.providerLogout.failed=['failure'],x=>x.session.supabase.user.id='another']){const bad=structuredClone(obs);mutate(bad);assert.throws(()=>deriveProductionJourney(bad));}
});
test('actual runLive body closes its owned browser on a stalled Page at absolute deadline',async()=>{
 const source=fs.readFileSync(new URL('../scripts/verify-provider-journey.mjs',import.meta.url),'utf8'),body=source.slice(source.indexOf('async function runLive('),source.indexOf('\nconst productionExecutions='));
 assert.ok(body.includes("await import('@playwright/test')"));let connected=true,closed=0;
 const page={goto:async()=>{},bringToFront:async()=>{},isClosed:()=>false,evaluate:()=>new Promise(()=>{})};
 const browser={isConnected:()=>connected,close:async()=>{connected=false;closed++;},newContext:async()=>({newPage:async()=>page})};
 const fixture={chromium:{launch:async options=>{assert.equal(options.executablePath,'fixture-pinned-exe');return browser;}}},quiet={log(){}},fakeProcess={stdout:{write(){}},env:{}};
 const factory=new Function('fixture','console','process','SIGNIN_TIMEOUT_MS','POLL_MS',body.replace("await import('@playwright/test')",'fixture')+';return runLive;');
 const run=factory(fixture,quiet,fakeProcess,600000,2500),started=Date.now();await assert.rejects(()=>run({origin:'https://vaultsparkstudios.com',waitMs:1000,postflight:{deadline:Date.now()+25,runtime:{playwright:fixture,browserPin:{executablePath:'fixture-pinned-exe'}}}}));assert.ok(Date.now()-started<500);assert.equal(connected,false);assert.ok(closed>=1);
});
test('postflight truth REST carries deadline abort and refuses oversized JSON',async()=>{
 const getSecret=async name=>({WEBSITE_SUPABASE_URL,WEBSITE_SUPABASE_SERVICE_ROLE_KEY:'sb_secret_offline_owned_fixture'}[name]||null),keepAlive=setTimeout(()=>{},500);let signal;
 try{await assert.rejects(()=>expectedInvestorAllow('fixture',{getSecret,deadlineEpochMs:Date.now()+20,fetchImpl:async(_u,o)=>{signal=o.signal;return new Promise((_resolve,reject)=>o.signal.addEventListener('abort',()=>reject(Error('fixture timeout')),{once:true}));}}));assert.ok(signal.aborted);
 await assert.rejects(()=>expectedInvestorAllow('fixture',{getSecret,deadlineEpochMs:Date.now()+1000,fetchImpl:async()=>new Response(' '.repeat(9000))}));
 }finally{clearTimeout(keepAlive);}
});
test('shared readback budget survives manual pause without resetting requests or bytes',async()=>{
 const budget=authReadbackBudget(Date.now()+1000);await readProductionInventory([row('assets/one.js','one')],{budget,fetchImpl:async()=>new Response('one')});pauseAuthReadbackBudget(budget);const r=budget.requests,b=budget.bytes;await new Promise(resolve=>setTimeout(resolve,2));resumeAuthReadbackBudget(budget);assert.equal(budget.requests,r);assert.equal(budget.bytes,b);
 await readProductionInventory([row('assets/two.js','two')],{budget,fetchImpl:async()=>new Response('two')});assert.equal(budget.requests,2);assert.equal(budget.bytes,6);
 budget.bytes=33554431;let calls=0;await assert.rejects(()=>readProductionInventory([row('assets/large.js','xx')],{budget,fetchImpl:async()=>{calls++;return new Response('xx');}}));assert.equal(calls,0);
});
test('preflight projection preserves exact eighteen current checks and actual eleven-step association',()=>{
 const now=new Date().toISOString(),p={schemaVersion:1,sourceCommit:G,sourceTreeSha:'c'.repeat(40),workflowRunId:42,workflowRunAttempt:1,releaseProofSha256:H,releaseProofGeneratedAt:now,ceremonySha256:H,ceremonyGeneratedAt:now,installationPayloadSha256:H,observationPayloadSha256:H,passedSteps:11,checks:Object.fromEntries(PREFLIGHT_CHECKS.map(k=>[k,true])),blockers:[],productionNativePending:true,fullReleaseAccepted:false};
 assert.equal(validateProductionPreflight(p,G,42,1),p);
 for(const mutate of [x=>delete x.checks.stagingCandidateReady,x=>x.checks.stagingCandidateReady=false,x=>x.passedSteps=10,x=>x.sourceCommit='e'.repeat(40),x=>x.workflowRunAttempt=2,x=>x.fullReleaseAccepted=true,x=>x.checks.callerPassed=true]){const v=structuredClone(p);mutate(v);assert.throws(()=>validateProductionPreflight(v,G,42,1));}
 const held=structuredClone(p);held.checks.identityMigrationVerified=false;held.blockers=['identityMigrationVerified'];assert.equal(validateProductionPreflight(held,G,42,1),held);
});
