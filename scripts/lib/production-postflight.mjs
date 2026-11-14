/** Fixed production observation metadata; no generic content overlay or outcome import. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {isServed} from './served-surface.mjs';
import {execFileSync} from './safe-spawn.mjs';
import {compareShellHtml} from './shell-parity.mjs';
import {fileURLToPath} from 'node:url';
export const PRODUCTION_ORIGIN='https://vaultsparkstudios.com';
export const POSTFLIGHT_PATHS=Object.freeze(['api/identity-migration-receipt.json','api/promotion-receipt.json','api/release-proof.json']);
const ACCOUNT='2d737158a4dde61a7a476a9fda51af2f',WORKER='vaultspark-security-headers-production';
export const postflightHash=b=>crypto.createHash('sha256').update(b).digest('hex');
const need=(v,c)=>{if(!v)throw Error('production-postflight-'+c);};
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const keys=(v,w,c)=>need(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join('|')===[...w].sort().join('|'),c);
const canonical=v=>JSON.stringify(v);
function stable(value){if(Array.isArray(value))return value.map(stable);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));return value;}
const SERVED_MANIFEST=JSON.parse(fs.readFileSync(new URL('../../config/served-surface.json',import.meta.url),'utf8'));
export function postflightOutputRoot(root,association){
 need(/^[a-f0-9]{40}$/.test(association?.sourceCommit)&&Number.isSafeInteger(association.runId)&&association.runId>0&&Number.isSafeInteger(association.runAttempt)&&association.runAttempt>0,'run-association');
 return path.join(root,'.cache','production-postflight',association.sourceCommit,`${association.runId}-${association.runAttempt}`);
}
export function validateProductionDeployment(v,sourceCommit){
 keys(v,['sourceCommit','workerVersionId','workerBundleSha256','workerMetadataSha256','applicationInventorySha256','pagesDeploymentId','pagesDeploymentUrl','pagesMetadataSha256','authInputClosureSha256'],'deployment-fields');
 need(v.sourceCommit===sourceCommit&&/^[a-f0-9]{40}$/.test(sourceCommit)&&/^[a-f0-9-]{36}$/.test(v.workerVersionId)&&/^[a-f0-9-]{36}$/.test(v.pagesDeploymentId)&&/^https:\/\/[a-f0-9]{8,32}\.vaultsparkstudios-website\.pages\.dev$/.test(v.pagesDeploymentUrl)&&[v.workerBundleSha256,v.workerMetadataSha256,v.applicationInventorySha256,v.pagesMetadataSha256,v.authInputClosureSha256].every(hash),'deployment-values');return v;
}
export function servedInventory(directory){
 const rows=[];function walk(base,relative=''){for(const entry of fs.readdirSync(base,{withFileTypes:true})){const file=relative?relative+'/'+entry.name:entry.name,full=path.join(base,entry.name),st=fs.lstatSync(full);need(!st.isSymbolicLink()&&!(st.fileAttributes&1024),'linked-dist');if(st.isDirectory())walk(full,file);else{need(st.isFile()&&st.nlink===1&&st.size<=16*1024*1024,'dist-file');if(isServed(file,SERVED_MANIFEST)){const b=fs.readFileSync(full);rows.push({file,bytes:b.length,sha256:postflightHash(b)});}}}}walk(directory);rows.sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);need(rows.length>0&&rows.length<=10000,'inventory-bound');return rows;
}
export function assertMetadataOnlyDelta(before,after){
 need(Array.isArray(before)&&Array.isArray(after)&&before.length===after.length&&before.length<=10000,'inventory-count');
 const previous=new Map(before.map(r=>[r.file,r]));need(previous.size===before.length&&new Set(after.map(r=>r.file)).size===after.length,'inventory-duplicates');const changes=[];
 for(const row of after){const old=previous.get(row.file);need(old,'inventory-pathset');if(canonical(old)!==canonical(row)){need(POSTFLIGHT_PATHS.includes(row.file),'application-byte-change');changes.push({file:row.file,beforeSha256:old.sha256,afterSha256:row.sha256});}}
 return {changes,unchangedApplicationSha256:postflightHash(canonical(after.filter(r=>!POSTFLIGHT_PATHS.includes(r.file)))),beforeInventorySha256:postflightHash(canonical(before)),afterInventorySha256:postflightHash(canonical(after))};
}
async function bounded(response,max,budget=null){need(response.ok,'readback-http');const declared=response.headers.get('content-length');if(declared!==null){need(/^(?:0|[1-9][0-9]*)$/.test(declared)&&Number.isSafeInteger(Number(declared))&&Number(declared)<=max&&(!budget||Number(declared)<=32*1024*1024-budget.bytes),'readback-declared-cap');}const chunks=[];let n=0;const reader=response.body.getReader();try{for(;;){const{done,value}=await reader.read();if(done)break;n+=value.byteLength;if(budget){budget.bytes+=value.byteLength;need(budget.bytes<=32*1024*1024&&Date.now()<=budget.deadline,'readback-budget');}need(n<=max,'readback-cap');chunks.push(Buffer.from(value));}}finally{await reader.cancel().catch(()=>{});}return Buffer.concat(chunks);}
function consumeRequest(budget){if(budget)need(++budget.requests<=128&&Date.now()<budget.deadline,'readback-request-budget');}
function requestSignal(budget){return AbortSignal.timeout(Math.max(1,Math.min(15000,budget?budget.deadline-Date.now():15000)));}
export async function readProductionWorker(expected,{fetchImpl=fetch,getSecret,bundleDirectory=null,observePriorVersion=false,budget=null}={}){
 if(!getSecret)({getSecret}=await import('./secrets.mjs'));
 const token=await getSecret('CLOUDFLARE_API_TOKEN','cloudflare.deploy');need(typeof token==='string'&&token.length>0,'provider-credential');
 const base=`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/${WORKER}`;
 const get=async suffix=>{consumeRequest(budget);return bounded(await fetchImpl(base+suffix,{method:'GET',redirect:'error',headers:{Authorization:`Bearer ${token}`,Accept:'application/json'},signal:requestSignal(budget)}),4*1024*1024,budget);};
 let versionId=expected.workerVersionId;
 const deployments=async()=>{const j=JSON.parse(await get('/deployments')),d=j.result?.deployments?.[0];need(j.success===true&&d?.versions?.length===1&&d.versions[0].percentage===100&&/^[a-f0-9-]{36}$/.test(d.versions[0].version_id),'production-version');if(versionId)need(d.versions[0].version_id===versionId,'production-version');else versionId=d.versions[0].version_id;};
 await deployments();const version=JSON.parse(await get('/versions/'+versionId));need(version.success===true&&version.result?.id===versionId&&version.result.resources?.bindings,'version-metadata');
 const settingsResponse=JSON.parse(await get('/settings')),settings=settingsResponse.result;need(settingsResponse.success===true&&Array.isArray(settings?.bindings)&&settings.bindings.length>0&&settings.bindings.length<=256&&settings.bindings.every(b=>typeof b.name==='string'&&typeof b.type==='string')&&new Set(settings.bindings.map(b=>b.name)).size===settings.bindings.length,'full-worker-binding-metadata');
 const completeMetadata={versionResources:version.result.resources,settings:{...settings,bindings:[...settings.bindings].sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)}};
 const metadataSha256=postflightHash(canonical(stable(completeMetadata)));if(expected.workerMetadataSha256)need(metadataSha256===expected.workerMetadataSha256,'production-config');
 consumeRequest(budget);const response=await fetchImpl(base+'/content/v2?version='+versionId,{method:'GET',redirect:'error',headers:{Authorization:`Bearer ${token}`},signal:requestSignal(budget)});
 const body=await bounded(response,4*1024*1024,budget),type=response.headers.get('content-type')||'';let modules;
 if(type.startsWith('multipart/form-data;')){const data=await new Response(body,{headers:{'content-type':type}}).formData();modules=[];for(const[name,value]of data){need(typeof value!=='string'&&typeof value.arrayBuffer==='function','bundle-part');const bytes=Buffer.from(await value.arrayBuffer());modules.push({file:name,bytes:bytes.length,sha256:postflightHash(bytes)});}modules.sort((a,b)=>a.file<b.file?-1:1);need(modules.length>0&&modules.length<=128&&new Set(modules.map(x=>x.file)).size===modules.length&&modules.some(m=>m.file===response.headers.get('cf-entrypoint')),'bundle-modules');}
 else{need(/^(application\/javascript|text\/javascript)/.test(type),'bundle-content-type');modules=[{file:'index.js',bytes:body.length,sha256:postflightHash(body)}];}
 if(bundleDirectory){for(const m of modules){need(/^[A-Za-z0-9_.\/-]+$/.test(m.file)&&!m.file.split('/').includes('..'),'bundle-path');const full=path.join(bundleDirectory,m.file),st=fs.lstatSync(full);need(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1&&st.size===m.bytes&&postflightHash(fs.readFileSync(full))===m.sha256,'uploaded-bundle-source');}}
 const bundleSha256=postflightHash(canonical(modules));if(expected.workerBundleSha256)need(bundleSha256===expected.workerBundleSha256,'production-bundle');else need(bundleDirectory||observePriorVersion===true,'unassociated-bundle');await deployments();
 return {workerVersionId:versionId,workerMetadataSha256:metadataSha256,workerBundleSha256:bundleSha256};
}

export const AUTH_INPUT_ROOTS=Object.freeze(['login.html','auth/callback.html','vault-member/index.html','investor-portal/index.html','investor-portal/login/index.html','membership/index.html','assets/identity.js','assets/membership-access.js','assets/supabase-client.js','assets/investor-auth.js','assets/investor-ui.js','vault-member/portal-auth.js','vault-member/portal-core.js','vault-member/portal-cache.js','sw.js','manifest.json','assets/shell-manifest.json']);
export function deriveAuthInputClosure(files){
 need(files instanceof Map,'auth-source-map');const selected=new Set(),pending=[...AUTH_INPUT_ROOTS];
 const add=(relative,from)=>{if(/^(https?:|data:|\/\/)/.test(relative))return;const value=relative.split(/[?#]/)[0];if(!/\.(?:js|css)$/.test(value))return;const resolved=path.posix.normalize(value.startsWith('/')?value.slice(1):path.posix.join(path.posix.dirname(from),value));need(!resolved.startsWith('../')&&files.has(resolved),'auth-dependency-path');pending.push(resolved);};
 while(pending.length){const file=pending.shift();if(selected.has(file))continue;need(files.has(file),'auth-required-root');selected.add(file);need(selected.size<=120,'auth-closure-cap');const raw=files.get(file);need(Buffer.isBuffer(raw)&&raw.length<=4*1024*1024,'auth-input-cap');
 if(file.endsWith('.json'))continue;
 const text=new TextDecoder('utf-8',{fatal:true}).decode(raw);
 if(file.endsWith('.html'))for(const tag of text.matchAll(/<(script|link)\b[^>]*>/gi)){const t=tag[0],script=tag[1].toLowerCase()==='script';if(!script&&!/\brel\s*=\s*["']stylesheet["']/i.test(t))continue;const assignments=t.match(script?/\bsrc\s*=/gi:/\bhref\s*=/gi)||[];need(assignments.length<=1,'ambiguous-auth-html-reference');const a=t.match(script?/\bsrc\s*=\s*["']([^"']+)["']/i:/\bhref\s*=\s*["']([^"']+)["']/i);need(!assignments.length||a,'unresolved-auth-html-reference');if(a)add(a[1],file);}
 // Executable import edges only. Cache lists and cosmetic feature URL strings are not imports.
 for(const re of [/\b(?:import|export)\s+(?:[^;'"\n]*?\s+from\s*)?["']([^"']+)["']/g,/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,/@import\s+(?:url\(\s*)?["']([^"']+)["']/g,/@import\s+url\(\s*([^\s"'()]+)\s*\)/g])for(const m of text.matchAll(re))add(m[1],file);
 for(const m of text.matchAll(/\bimportScripts\s*\(([^)]*)\)/g)){need(/^\s*["'][^"']+["'](?:\s*,\s*["'][^"']+["'])*\s*$/.test(m[1]),'unresolved-auth-importscripts');for(const a of m[1].matchAll(/["']([^"']+)["']/g))add(a[1],file);}
 need(!/\b(?:import|importScripts)\s*\((?!\s*["'])/.test(text),'unresolved-auth-dynamic-import');
 for(const re of [/\.(?:src|href)\s*=\s*["']([^"']+)["']/g,/\b(?:var|const|let)\s+(?:SRC|SENTRY_SRC)\s*=\s*["']([^"']+)["']/g])for(const m of text.matchAll(re))add(m[1],file);
 // Reviewed loader tables: auth-named ambient features and the entire member idle table.
 if(/(?:ambient-loader|ambient-core(?:\.bundle|\.shell-[a-f0-9]{10})?)\.js$/.test(file))for(const m of text.matchAll(/\bsrc\s*:\s*["']([^"']+)["']/g))if(/(?:auth|identity|supabase|member|investor)/i.test(m[1]))add(m[1],file);
 if(/membership-idle-loader(?:\.shell-[a-f0-9]{10})?\.js$/.test(file)){const table=text.match(/const scripts\s*=\s*\[([\s\S]*?)\];/);need(table,'member-loader-table');const literal=table[1].replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');need(/^\s*(?:["']\/assets\/[A-Za-z0-9_.\/-]+\.js["']\s*,\s*)*(?:["']\/assets\/[A-Za-z0-9_.\/-]+\.js["']\s*,?\s*)?$/.test(literal),'unresolved-member-loader-table');const entries=[...literal.matchAll(/["']([^"']+\.js)["']/g)];need(entries.length>0&&entries.length<=32,'member-loader-count');for(const m of entries)add(m[1],file);}
 if(/createElement\(['"]script['"]\)/.test(text)&&/\.src\s*=\s*[^\s"'=]/.test(text))need(/(?:ambient-core(?:\.bundle|\.shell-[a-f0-9]{10})?|membership-idle-loader(?:\.shell-[a-f0-9]{10})?|sentry-init(?:\.shell-[a-f0-9]{10})?|turnstile(?:\.shell-[a-f0-9]{10})?|obelisk-seal-entry(?:\.shell-[a-f0-9]{10})?)\.js$/.test(file)||file==='assets/vendor/sentry-browser-7.99.0.870e7f88.js','unreviewed-dynamic-auth-loader');
 }
 return [...selected].sort().map(file=>({file,bytes:files.get(file).length,sha256:postflightHash(files.get(file))}));
}
export function authInputCutClassification(files,selectedRows){
 const selected=new Set(selectedRows.map(r=>r.file)),cuts=[];const manifest=JSON.parse(files.get('assets/shell-manifest.json'));
 for(const asset of Object.values(manifest.assets))if(!selected.has(asset.path))cuts.push({source:'assets/shell-manifest.json',path:asset.path,classification:'integrity-manifest-entry-not-executable-auth-import',rawManifestBytesRemainObserved:true});
 for(const source of ['sw.js',...selectedRows.map(r=>r.file).filter(f=>/ambient-core\.shell-[a-f0-9]{10}\.js$/.test(f))])if(files.has(source))for(const m of files.get(source).toString('utf8').matchAll(/["'](\/?assets\/[A-Za-z0-9_.\/-]+\.(?:js|css))["']/g)){const file=m[1].replace(/^\//,'');if(!selected.has(file))cuts.push({source,path:file,classification:source==='sw.js'?'cached-asset-string-not-auth-code-import':'non-auth-conditional-feature-url',rawSourceBytesRemainObserved:selected.has(source)});}
 return cuts;
}
/** Complete fixed auth/input closure from raw G; no mutable checkout or omitted caller paths. */
export async function productionAuthInputReport(root,sourceCommit){
 need(/^[a-f0-9]{40}$/.test(sourceCommit),'source-G');
 const listing=execFileSync('git',['ls-tree','-rz','--full-tree',sourceCommit],{cwd:root,maxBuffer:8*1024*1024}).toString('utf8').split('\0').filter(Boolean),files=new Map();
 const selected=[];for(const line of listing){const m=line.match(/^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/);if(!m){need(!line.includes('\t'),'source-tree-kind');continue;}if(isServed(m[3],SERVED_MANIFEST)&&(/\.(js|css)$/.test(m[3])||AUTH_INPUT_ROOTS.includes(m[3])))selected.push({id:m[2],file:m[3]});}
 need(selected.length>0&&selected.length<=10000,'source-selected');const batch=execFileSync('git',['cat-file','--batch'],{cwd:root,input:selected.map(x=>x.id+'\n').join(''),maxBuffer:256*1024*1024});let offset=0;
 for(const s of selected){const end=batch.indexOf(10,offset);need(end>offset,'source-batch-header');const parts=batch.subarray(offset,end).toString('ascii').split(' '),size=Number(parts[2]);need(parts[0]===s.id&&parts[1]==='blob'&&Number.isSafeInteger(size)&&size>=0&&size<=16*1024*1024,'source-blob');offset=end+1;const b=batch.subarray(offset,offset+size);need(b.length===size&&batch[offset+size]===10,'source-batch-body');offset+=size+1;files.set(s.file,b);}need(offset===batch.length,'source-batch-trailing');
 const rows=deriveAuthInputClosure(files);return {sourceCommit,scope:'auth-control-input-and-integrity-manifest',rows,cuts:authInputCutClassification(files,rows)};
}
export async function productionSourceInventory(root,sourceCommit){return (await productionAuthInputReport(root,sourceCommit)).rows;}
export function authReadbackBudget(deadlineEpochMs=Date.now()+120000){need(Number.isSafeInteger(deadlineEpochMs)&&deadlineEpochMs>Date.now(),'readback-deadline');const now=Date.now();return {deadline:Math.min(deadlineEpochMs,now+120000),absoluteDeadline:deadlineEpochMs,activeStartedAt:now,activeElapsedMs:0,paused:false,requests:0,bytes:0};}
export function pauseAuthReadbackBudget(b){need(!b.paused,'readback-already-paused');b.activeElapsedMs+=Date.now()-b.activeStartedAt;need(b.activeElapsedMs<=120000,'readback-active-time');b.paused=true;}
export function resumeAuthReadbackBudget(b){need(b.paused&&Date.now()<b.absoluteDeadline,'readback-resume-deadline');b.activeStartedAt=Date.now();b.deadline=Math.min(b.absoluteDeadline,Date.now()+120000-b.activeElapsedMs);b.paused=false;}
export async function readProductionInventory(expectedRows,{fetchImpl=fetch,deadlineEpochMs=Date.now()+120000,immutableOrigin=null,budget=authReadbackBudget(deadlineEpochMs)}={}){
 need(immutableOrigin===null||/^https:\/\/[a-f0-9]{8,32}\.vaultsparkstudios-website\.pages\.dev$/.test(immutableOrigin),'readback-owned-origin');const origin=immutableOrigin||PRODUCTION_ORIGIN;
 need(Array.isArray(expectedRows)&&expectedRows.length>0&&expectedRows.length<=128&&new Set(expectedRows.map(x=>x.file)).size===expectedRows.length,'readback-inventory');
 need(Number.isSafeInteger(deadlineEpochMs)&&deadlineEpochMs>Date.now(),'readback-deadline');const deadline=Math.min(deadlineEpochMs,Date.now()+120000);
 for(const row of expectedRows)need(typeof row.file==='string'&&row.file.length<=512&&/^[a-zA-Z0-9_.\/-]+$/.test(row.file)&&!row.file.split('/').includes('..')&&hash(row.sha256)&&Number.isSafeInteger(row.bytes)&&row.bytes>=0&&row.bytes<=4*1024*1024,'readback-path');
 need(expectedRows.reduce((n,r)=>n+r.bytes,0)<=32*1024*1024-budget.bytes,'readback-total');const rows=new Array(expectedRows.length);let next=0,actualBytes=0;
 await Promise.all(Array.from({length:Math.min(8,expectedRows.length)},async()=>{for(;;){const i=next++;if(i>=expectedRows.length)return;need(Date.now()<deadline,'readback-deadline');const row=expectedRows[i];
 need(++budget.requests<=128&&Date.now()<budget.deadline,'readback-request-budget');const response=await fetchImpl(origin+'/'+row.file,{redirect:'error',headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(Math.max(1,Math.min(15000,deadline-Date.now(),budget.deadline-Date.now())))});
 const b=await bounded(response,row.bytes,budget);actualBytes+=b.length;need(actualBytes<=32*1024*1024&&Date.now()<=deadline&&Date.now()<=budget.deadline,'readback-budget');need(b.length===row.bytes&&postflightHash(b)===row.sha256,'served-byte-mismatch');rows[i]={...row};}}));
 return {rows,authInputClosureSha256:postflightHash(canonical(rows)),fullRemoteAuthClosureObserved:true,fullInventoryBytesObserved:false,observedBytes:actualBytes,rawByteAuthority:immutableOrigin?'raw-immutable-pages-deployment-origin':'custom-production-origin'};
}
export async function readProductionRouteParity(root,sourceCommit,{fetchImpl=fetch,budget=authReadbackBudget()}={}){
 const rows=[];for(const [route,file]of [['/','index.html'],['/studio-pulse/','studio-pulse/index.html'],['/membership/','membership/index.html']]){
 need(++budget.requests<=128&&Date.now()<budget.deadline,'route-budget');const r=await fetchImpl(PRODUCTION_ORIGIN+route,{redirect:'error',headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(Math.max(1,Math.min(15000,budget.deadline-Date.now())))}),b=await bounded(r,4*1024*1024,budget);need(Date.now()<=budget.deadline,'route-budget');
 const csp=r.headers.get('content-security-policy')||'';need(csp.includes("default-src 'self'")&&csp.includes('script-src')&&!/(?:^|;)\s*(?:script-src|default-src)[^;]*\s\*(?:\s|;|$)/.test(csp)&&r.headers.get('x-content-type-options')==='nosniff'&&/^max-age=31536000/.test(r.headers.get('strict-transport-security')||'')&&r.headers.get('referrer-policy')==='strict-origin-when-cross-origin','route-security-headers');
 const expected=execFileSync('git',['cat-file','blob',sourceCommit+':'+file],{cwd:root,maxBuffer:4*1024*1024}).toString('utf8');need(compareShellHtml(expected,b.toString('utf8')).ok,'route-shell-parity');rows.push({route,securityHeadersVerified:true,shellParityVerified:true,rawWorkerHtmlEqualityClaimed:false});}return rows;
}
/** Exact three files only, same accepted distribution. Caller must retain its initial inventory. */
export function applyMetadataOverlay(directory,before,outputs){
 keys(outputs,POSTFLIGHT_PATHS,'overlay-paths');need(canonical(servedInventory(directory))===canonical(before),'dist-before-drift');
 for(const file of POSTFLIGHT_PATHS){const b=outputs[file];need(Buffer.isBuffer(b)&&b.length<=262144,'overlay-file-cap');const j=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b));need(j.publicSafe===true,'overlay-privacy');}
 // All targets and inputs are preflighted before any overwrite; no path additions.
 for(const file of POSTFLIGHT_PATHS){const st=fs.lstatSync(path.join(directory,file));need(st.isFile()&&st.nlink===1&&!st.isSymbolicLink(),'overlay-target');}
 for(const file of POSTFLIGHT_PATHS)fs.writeFileSync(path.join(directory,file),outputs[file]);
 return assertMetadataOnlyDelta(before,servedInventory(directory));
}
export async function verifyMetadataFinalization({directory,before,expectedDeployment},{fetchImpl=fetch,getSecret}={}){
 const after=servedInventory(directory),delta=assertMetadataOnlyDelta(before,after);validateProductionDeployment(expectedDeployment,expectedDeployment.sourceCommit);
 const budget=authReadbackBudget(),workerBefore=await readProductionWorker(expectedDeployment,{fetchImpl,getSecret,budget}),pagesBefore=await readProductionPages(expectedDeployment.sourceCommit,{fetchImpl,getSecret,budget}),root=fileURLToPath(new URL('../..',import.meta.url)),auth=await productionSourceInventory(root,expectedDeployment.sourceCommit),byPath=new Map(after.map(x=>[x.file,x]));
 need(auth.every(r=>canonical(byPath.get(r.file))===canonical(r))&&postflightHash(canonical(auth))===expectedDeployment.authInputClosureSha256,'final-auth-source');
 await readProductionInventory([...auth,...POSTFLIGHT_PATHS.map(f=>byPath.get(f))],{fetchImpl,immutableOrigin:pagesBefore.pagesDeploymentUrl,budget});await readProductionInventory(POSTFLIGHT_PATHS.map(f=>byPath.get(f)),{fetchImpl,budget});await readProductionRouteParity(root,expectedDeployment.sourceCommit,{fetchImpl,budget});
 const workerAfter=await readProductionWorker(expectedDeployment,{fetchImpl,getSecret,budget}),pagesAfter=await readProductionPages(expectedDeployment.sourceCommit,{fetchImpl,getSecret,budget});need(canonical(workerBefore)===canonical(workerAfter)&&canonical(pagesBefore)===canonical(pagesAfter),'final-provider-bracket');
 pauseAuthReadbackBudget(budget);return {...delta,productionReadbackVerified:true,fullInventoryBytesObserved:false,wholeDistPreserved:true,fullRemoteAuthClosureObserved:true,sourceCommit:expectedDeployment.sourceCommit,worker:workerAfter,pages:pagesAfter,observedAt:new Date().toISOString(),composite:'source-G-plus-three-production-observation-JSON-rows',workerRedeployed:false,readbackBudget:{requests:budget.requests,bytes:budget.bytes,activeElapsedMs:budget.activeElapsedMs,maxRequests:128,maxBytes:33554432,maxActiveElapsedMs:120000}};
}

const finalizations=new WeakMap();
export function assertProductionMetadataFinalization(result){need(finalizations.get(result)===postflightHash(canonical(result)),'unowned-metadata-finalization');return result;}
export function validateProductionMetadataFinalization(v,request,nativeObservationSha256){
 keys(v,['schemaVersion','publicSafe','environment','phase','sourceCommit','sourceTreeSha','runId','runAttempt','nativeObservationSha256','nativeFiveLegsReobserved','changes','unchangedApplicationSha256','beforeInventorySha256','afterInventorySha256','productionReadbackVerified','fullInventoryBytesObserved','wholeDistPreserved','fullRemoteAuthClosureObserved','worker','pages','observedAt','composite','workerRedeployed','readbackBudget','metadataPublicationPending','fullReleaseAccepted'],'finalization-fields');
 need(v.schemaVersion===1&&v.publicSafe===true&&v.environment==='production'&&v.phase==='production-metadata-finalization'&&v.sourceCommit===request.sourceCommit&&v.sourceTreeSha===request.sourceTreeSha&&v.runId===request.workflowRunId&&v.runAttempt===request.workflowRunAttempt&&v.nativeObservationSha256===nativeObservationSha256&&hash(nativeObservationSha256),'finalization-parent');
 need(v.nativeFiveLegsReobserved===false&&v.productionReadbackVerified===true&&v.fullInventoryBytesObserved===false&&v.wholeDistPreserved===true&&v.fullRemoteAuthClosureObserved===true&&v.workerRedeployed===false&&v.metadataPublicationPending===false&&v.fullReleaseAccepted===true&&v.composite==='source-G-plus-three-production-observation-JSON-rows'&&Number.isFinite(Date.parse(v.observedAt))&&Date.parse(v.observedAt)<=Date.now(),'finalization-facts');
 need(['unchangedApplicationSha256','beforeInventorySha256','afterInventorySha256'].every(k=>hash(v[k]))&&v.beforeInventorySha256===request.productionDeployment.applicationInventorySha256,'finalization-inventory');
 need(Array.isArray(v.changes)&&v.changes.length<=3&&new Set(v.changes.map(r=>r.file)).size===v.changes.length,'finalization-change-count');for(const r of v.changes){keys(r,['file','beforeSha256','afterSha256'],'finalization-change-row');need(POSTFLIGHT_PATHS.includes(r.file)&&hash(r.beforeSha256)&&hash(r.afterSha256),'finalization-change');}
 keys(v.worker,['workerVersionId','workerMetadataSha256','workerBundleSha256'],'finalization-worker');need(Object.keys(v.worker).every(k=>v.worker[k]===request.productionDeployment[k]),'finalization-worker-association');
 keys(v.pages,['pagesDeploymentId','pagesDeploymentUrl','pagesMetadataSha256'],'finalization-pages');need(/^[a-f0-9-]{36}$/.test(v.pages.pagesDeploymentId)&&/^https:\/\/[a-f0-9]{8,32}\.vaultsparkstudios-website\.pages\.dev$/.test(v.pages.pagesDeploymentUrl)&&hash(v.pages.pagesMetadataSha256),'finalization-pages-association');
 keys(v.readbackBudget,['requests','bytes','activeElapsedMs','maxRequests','maxBytes','maxActiveElapsedMs'],'finalization-budget');need(v.readbackBudget.maxRequests===128&&v.readbackBudget.maxBytes===33554432&&v.readbackBudget.maxActiveElapsedMs===120000&&['requests','bytes','activeElapsedMs'].every(k=>Number.isSafeInteger(v.readbackBudget[k])&&v.readbackBudget[k]>=0)&&v.readbackBudget.requests<=128&&v.readbackBudget.bytes<=33554432&&v.readbackBudget.activeElapsedMs<=120000,'finalization-budget-values');return v;
}
async function finalizationInputs(root,context){
 const e=await import('./isolated-staging-evidence.mjs');e.assertProductionPostflightCompletion(context);need(typeof e.productionPostflightOutputs==='function','native-output-consumer-unavailable');
 const authorization=e.productionPostflightAuthorization(context),frozen=e.verifyFrozenSource(root,authorization.sourceCommit),expected=validateProductionDeployment(context.request.productionDeployment,authorization.sourceCommit);
 need(process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_SHA===authorization.sourceCommit&&Number(process.env.GITHUB_RUN_ID)===context.request.workflowRunId&&Number(process.env.GITHUB_RUN_ATTEMPT)===context.request.workflowRunAttempt,'finalization-job-owner');
 const output=postflightOutputRoot(root,{sourceCommit:authorization.sourceCommit,runId:context.request.workflowRunId,runAttempt:context.request.workflowRunAttempt}),before=JSON.parse(fs.readFileSync(path.join(output,'PAGES_INITIAL_INVENTORY.json'),'utf8'));
 need(postflightHash(canonical(before))===expected.applicationInventorySha256,'original-job-dist-inventory');
 const rows=e.productionPostflightOutputs(context);need(Array.isArray(rows)&&rows.length===3&&new Set(rows.map(r=>r.file)).size===3,'authenticated-native-output-rows');const outputs=Object.fromEntries(rows.map(r=>[r.file,r.bytes]));keys(outputs,POSTFLIGHT_PATHS,'authenticated-native-output-paths');need(Object.values(outputs).every(Buffer.isBuffer),'authenticated-native-output-buffers');
 return {authorization,frozen,expected,output,before,outputs};
}
/** Fixed owning CI distribution only; no free path or metadata import argument. */
export async function applyProductionMetadata(root,context){
 const p=await finalizationInputs(root,context),target=path.join(p.output,'METADATA_OVERLAY.json');need(!fs.existsSync(target),'exclusive-overlay-attempt');
 const result=applyMetadataOverlay('/tmp/pages-dist',p.before,p.outputs);fs.writeFileSync(target,canonical(result)+'\n',{flag:'wx',mode:0o600});return {...result,metadataPublicationPending:true,fullReleaseAccepted:false};
}
/** Run only after the existing same-dist Pages redeploy completed. */
export async function finalizeProductionMetadata(root,context){
 const p=await finalizationInputs(root,context),expectedDisk=JSON.parse(fs.readFileSync(path.join(p.output,'METADATA_OVERLAY.json'),'utf8'));
 need(postflightHash(canonical(servedInventory('/tmp/pages-dist')))===expectedDisk.afterInventorySha256,'final-dist-bytes');
 for(const file of POSTFLIGHT_PATHS)need(fs.readFileSync(path.join('/tmp/pages-dist',file)).equals(p.outputs[file]),'final-overlay-row');
 const actual=await verifyMetadataFinalization({directory:'/tmp/pages-dist',before:p.before,expectedDeployment:p.expected});
 const result={schemaVersion:1,publicSafe:true,environment:'production',phase:'production-metadata-finalization',sourceCommit:p.authorization.sourceCommit,sourceTreeSha:p.frozen.sourceTreeSha,runId:context.request.workflowRunId,runAttempt:context.request.workflowRunAttempt,nativeObservationSha256:context.transport.observationHash,nativeFiveLegsReobserved:false,...actual,metadataPublicationPending:false,fullReleaseAccepted:true};
 validateProductionMetadataFinalization(result,context.request,context.transport.observationHash);
 fs.writeFileSync(path.join(p.output,'FINALIZATION.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});finalizations.set(result,postflightHash(canonical(result)));return result;
}

const uploads=new WeakMap();
const pages=new WeakMap();
const rollbackPairs=new WeakMap();
const preflights=new WeakMap();
export const PREFLIGHT_CHECKS=Object.freeze(['canonicalFavicon','stagingReachable','stagingCandidateReady','productionSourceBound','transformationBound','installedVariantBound','currentStageObserved','stagingDeployAttested','stagingDeployHistoryBound','automaticWorkerRollback','productionWorkerRoutesMatched','productionShellParityMatched','shellManifestPresent','deployPointerPresent','identityMigrationVerified','supabaseControlPlaneReady','productionPromotionReady','releaseDependenciesSatisfied']);
export function assertProductionPreflight(value){need(preflights.get(value)===postflightHash(canonical(value)),'unowned-production-preflight');return value;}
export function validateProductionPreflight(value,sourceCommit,runId,runAttempt){
 keys(value,['schemaVersion','sourceCommit','sourceTreeSha','workflowRunId','workflowRunAttempt','releaseProofSha256','releaseProofGeneratedAt','ceremonySha256','ceremonyGeneratedAt','installationPayloadSha256','observationPayloadSha256','passedSteps','checks','blockers','productionNativePending','fullReleaseAccepted'],'production-preflight-fields');
 need(value.schemaVersion===1&&value.sourceCommit===sourceCommit&&/^[a-f0-9]{40}$/.test(value.sourceTreeSha)&&value.workflowRunId===runId&&value.workflowRunAttempt===runAttempt&&value.passedSteps===11&&value.productionNativePending===true&&value.fullReleaseAccepted===false&&['releaseProofSha256','ceremonySha256','installationPayloadSha256','observationPayloadSha256'].every(k=>hash(value[k])),'production-preflight-source');
 need(Number.isFinite(Date.parse(value.releaseProofGeneratedAt))&&Date.parse(value.releaseProofGeneratedAt)<=Date.parse(value.ceremonyGeneratedAt)&&Date.parse(value.ceremonyGeneratedAt)<=Date.now()&&value.checks&&Object.values(value.checks).every(x=>typeof x==='boolean')&&Array.isArray(value.blockers)&&value.blockers.length<=64&&value.blockers.every(x=>typeof x==='string'&&/^[a-zA-Z0-9:_-]{1,128}$/.test(x)),'production-preflight-values');
 keys(value.checks,PREFLIGHT_CHECKS,'production-preflight-check-fields');const pending=new Set(['identityMigrationVerified','productionPromotionReady','productionShellParityMatched']);need(Object.entries(value.checks).every(([k,v])=>v===true||pending.has(k)&&value.blockers.includes(k)),'production-preflight-required-check');return value;
}
/** Read actual fixed run outputs after all eleven existing steps; never public raw-G snapshots. */
export async function captureProductionPreflight(root,context){
 const e=await import('./isolated-staging-evidence.mjs'),a=e.historicalStagePreflightAuthorization(context);e.verifyFrozenSource(root,a.sourceCommit);
 const {validateReceipt,EXPECTED_STEP_IDS,currentCeremonyHashes}=await import('../run-release-ceremony.mjs');need(typeof currentCeremonyHashes==='function','ceremony-hash-producer-unavailable');
 const prefix=`.cache/isolated-staging/run-${context.request.workflowRunId}-${context.request.workflowRunAttempt}/`,proofRaw=e.readOwned(root,prefix+'release-proof.json',131072),ceremonyRaw=e.readOwned(root,prefix+'release-ceremony.json',131072),proof=JSON.parse(proofRaw),ceremony=JSON.parse(ceremonyRaw),refs=JSON.parse(e.readOwned(root,'.cache/isolated-staging/context.json',65536));
 need(refs.sourceCommit===a.sourceCommit&&Object.keys(refs.transport).length===Object.keys(context.transport).length&&Object.keys(context.transport).every(k=>refs.transport[k]===context.transport[k]),'original-preflight-context');
 need(validateReceipt(ceremony,a).length===0&&ceremony.state==='passed'&&EXPECTED_STEP_IDS.length===11&&ceremony.installationPayloadSha256===context.transport.installationHash&&ceremony.observationPayloadSha256===context.transport.observationHash,'actual-eleven-step-preflight');
 const current=currentCeremonyHashes('.cache/isolated-staging/context.json');need(ceremony.evidenceSha256===current.evidenceSha256&&ceremony.contractSha256===current.contractSha256,'actual-preflight-contract-evidence');
 need(proof.mode==='isolated-variant'&&proof.staging?.candidateBuildSha===a.sourceCommit&&proof.isolatedStaging?.observationSha256===context.transport.observationHash&&proof.rolloutAuthorization&&Object.keys(a).every(k=>proof.rolloutAuthorization[k]===a[k]),'actual-run-release-proof');
 const value={schemaVersion:1,sourceCommit:a.sourceCommit,sourceTreeSha:a.sourceTreeSha,workflowRunId:context.request.workflowRunId,workflowRunAttempt:context.request.workflowRunAttempt,releaseProofSha256:postflightHash(proofRaw),releaseProofGeneratedAt:proof.generatedAt,ceremonySha256:postflightHash(ceremonyRaw),ceremonyGeneratedAt:ceremony.generatedAt,installationPayloadSha256:context.transport.installationHash,observationPayloadSha256:context.transport.observationHash,passedSteps:11,checks:proof.checks,blockers:proof.blockers,productionNativePending:true,fullReleaseAccepted:false};validateProductionPreflight(value,a.sourceCommit,context.request.workflowRunId,context.request.workflowRunAttempt);preflights.set(value,postflightHash(canonical(value)));return value;
}
export function assertProductionRollbackPair(value){need(rollbackPairs.get(value)===postflightHash(canonical(value)),'unowned-rollback-pair');return value;}
export function assertProductionPagesDeployment(value){need(pages.get(value)===postflightHash(canonical(value)),'unowned-pages-deployment');return value;}
export async function readProductionPages(sourceCommit,{fetchImpl=fetch,getSecret,budget=null}={}){
 if(!getSecret)({getSecret}=await import('./secrets.mjs'));const token=await getSecret('CLOUDFLARE_API_TOKEN','cloudflare.deploy');need(token,'pages-provider-credential');
 consumeRequest(budget);const r=await fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/pages/projects/vaultsparkstudios-website`,{method:'GET',redirect:'error',headers:{Authorization:`Bearer ${token}`},signal:requestSignal(budget)}),j=JSON.parse(await bounded(r,1024*1024,budget)),p=j.result,d=p?.canonical_deployment;
 need(j.success===true&&p.name==='vaultsparkstudios-website'&&p.production_branch==='main'&&d?.environment==='production'&&d.deployment_trigger?.metadata?.branch==='main'&&/^[a-f0-9]{40}$/.test(d.deployment_trigger.metadata.commit_hash)&&(sourceCommit===null||d.deployment_trigger.metadata.commit_hash===sourceCommit)&&d.latest_stage?.status==='success'&&/^[a-f0-9-]{36}$/.test(d.id)&&/^https:\/\/[a-f0-9]{8,32}\.vaultsparkstudios-website\.pages\.dev$/.test(d.url),'pages-production-association');
 return {pagesDeploymentId:d.id,pagesDeploymentUrl:d.url,pagesMetadataSha256:postflightHash(canonical({id:d.id,url:d.url,environment:d.environment,deployment_trigger:d.deployment_trigger,latest_stage:d.latest_stage})),...(sourceCommit===null?{observedSourceCommit:d.deployment_trigger.metadata.commit_hash}:{})};
}
/** Actual prior provider pair, captured before the FIRST Worker mutation, never relabelled G. */
export async function captureProductionRollback(root,context){
 const e=await import('./isolated-staging-evidence.mjs');need(typeof e.assertProductionRollbackCaptureContext==='function'&&typeof e.productionRollbackCaptureAuthorization==='function','rollback-capture-capability-unavailable');e.assertProductionRollbackCaptureContext(context);const a=e.productionRollbackCaptureAuthorization(context);e.verifyFrozenSource(root,a.sourceCommit);
 const budget=authReadbackBudget(),worker=await readProductionWorker({},{observePriorVersion:true,budget}),provider=await readProductionPages(null,{budget}),after=await readProductionWorker(worker,{budget}),pagesAfter=await readProductionPages(null,{budget});need(canonical(worker)===canonical(after)&&canonical(provider)===canonical(pagesAfter),'rollback-pair-bracket');
 const value={schemaVersion:1,phase:'production-rollback-before-worker',sourceCommit:a.sourceCommit,installationPayloadSha256:a.installationPayloadSha256,workflowRunId:a.workflowRunId,workflowRunAttempt:a.workflowRunAttempt,requestNonce:a.requestNonce,requestPayloadSha256:a.requestPayloadSha256,capturedAt:new Date().toISOString(),worker,pages:provider,observedPriorPair:true};rollbackPairs.set(value,postflightHash(canonical(value)));return value;
}
export async function assertProductionRollbackCurrent(root,context,value,{workerOnly=false}={}){
 const e=await import('./isolated-staging-evidence.mjs');e.assertAdmittedContext(context);const a=e.stageNativeAuthorization(context);e.verifyFrozenSource(root,a.sourceCommit);
 need(canonical(value)===canonical(e.productionRollbackAuthorization(context)),'rollback-not-authenticated-root-record');
 keys(value,['schemaVersion','phase','sourceCommit','installationPayloadSha256','workflowRunId','workflowRunAttempt','requestNonce','requestPayloadSha256','capturedAt','worker','pages','observedPriorPair'],'rollback-fields');need(value.schemaVersion===1&&value.phase==='production-rollback-before-worker'&&value.sourceCommit===a.sourceCommit&&value.installationPayloadSha256===a.installationPayloadSha256&&value.workflowRunId===context.request.workflowRunId&&value.workflowRunAttempt===context.request.workflowRunAttempt&&value.requestNonce===context.request.nonce&&value.requestPayloadSha256===context.transport.requestHash&&value.observedPriorPair===true&&Number.isFinite(Date.parse(value.capturedAt))&&Date.parse(value.capturedAt)<=Date.now()&&Date.now()-Date.parse(value.capturedAt)<=600000,'rollback-association');
 const worker=await readProductionWorker(value.worker);need(canonical(worker)===canonical(value.worker),'prior-production-worker-moved');if(!workerOnly){const provider=await readProductionPages(null);need(canonical(provider)===canonical(value.pages),'prior-production-pages-moved');}return value;
}
export async function assertCurrentWorkerRollback(root,context,value){return assertProductionRollbackCurrent(root,context,value,{workerOnly:true});}
/** Actual owning Pages job distribution, including its existing News/stamp finalization. */
export async function captureProductionPagesDeployment(root,context,workerUpload){
 const {historicalStagePreflightAuthorization,verifyFrozenSource}=await import('./isolated-staging-evidence.mjs');const a=historicalStagePreflightAuthorization(context);verifyFrozenSource(root,a.sourceCommit);
 need(process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_SHA===a.sourceCommit&&Number(process.env.GITHUB_RUN_ID)===context.request.workflowRunId&&Number(process.env.GITHUB_RUN_ATTEMPT)===context.request.workflowRunAttempt,'pages-job-owner');
 need(workerUpload?.sourceCommit===a.sourceCommit,'worker-upload-source');const budget=authReadbackBudget(),worker=await readProductionWorker(workerUpload,{budget}),provider=await readProductionPages(a.sourceCommit,{budget}),directory='/tmp/pages-dist',whole=servedInventory(directory),auth=await productionSourceInventory(root,a.sourceCommit),byPath=new Map(whole.map(x=>[x.file,x]));
 need(auth.every(r=>canonical(byPath.get(r.file))===canonical(r)),'pages-auth-inputs-source');
 const value={sourceCommit:a.sourceCommit,...worker,applicationInventorySha256:postflightHash(canonical(whole)),...provider,authInputClosureSha256:postflightHash(canonical(auth))};validateProductionDeployment(value,a.sourceCommit);
 await readProductionInventory(auth,{immutableOrigin:provider.pagesDeploymentUrl,budget});const after=await readProductionPages(a.sourceCommit,{budget});need(canonical(after)===canonical(provider),'pages-provider-bracket');
 const out=postflightOutputRoot(root,{sourceCommit:a.sourceCommit,runId:context.request.workflowRunId,runAttempt:context.request.workflowRunAttempt});fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'PAGES_INITIAL_INVENTORY.json'),canonical(whole)+'\n',{flag:'wx',mode:0o600});fs.writeFileSync(path.join(out,'PAGES_AUTH_INPUTS.json'),canonical(auth)+'\n',{flag:'wx',mode:0o600});
 pages.set(value,postflightHash(canonical(value)));return value;
}
export function assertProductionWorkerUpload(value){need(uploads.get(value)===postflightHash(canonical(value)),'unowned-worker-upload');return value;}
/** Called immediately after the existing actual Wrangler upload with its fixed --outdir. */
export async function captureProductionWorkerUpload(root,context){
 const {historicalStagePreflightAuthorization,verifyFrozenSource}=await import('./isolated-staging-evidence.mjs');
 const a=historicalStagePreflightAuthorization(context),frozen=verifyFrozenSource(root,a.sourceCommit),run={sourceCommit:a.sourceCommit,runId:context.request.workflowRunId,runAttempt:context.request.workflowRunAttempt};
 const directory=postflightOutputRoot(root,run),bundleDirectory=path.join(directory,'worker-build');
 const worker=await readProductionWorker({},{bundleDirectory});
 const value={schemaVersion:1,phase:'production-worker-upload',environment:'production',sourceCommit:a.sourceCommit,sourceTreeSha:frozen.sourceTreeSha,runId:run.runId,runAttempt:run.runAttempt,installationPayloadSha256:a.installationPayloadSha256,...worker,observedAt:new Date().toISOString(),workerUploadAssociated:true};
 fs.writeFileSync(path.join(directory,'WORKER_UPLOAD.json'),JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});uploads.set(value,postflightHash(canonical(value)));return value;
}
