/** Exact pre-upload inventory admission using the same installed tar as the producer.
 * Listing is deliberately fail-closed: unsupported/escaped names are not guessed.
 * This proves names/types, not a frozen source snapshot or per-member byte parity.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createGunzip, gunzipSync } from 'node:zlib';
import { isServed } from './served-surface.mjs';
import { buildManifest, CORE_PATHS, OBSERVED_PATHS } from '../build-candidate-artifact-manifest.mjs';
import { Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { spawnSync } from './safe-spawn.mjs';

export function assertArchivePath(name) {
  if (typeof name !== 'string' || !name || /[^\x20-\x7e]/.test(name)
    || name.includes('\\') || name.startsWith('-') || path.posix.isAbsolute(name)
    || name.includes(':') || name.split('/').some(part => !part || part === '.' || part === '..')) {
    throw Error('Unsupported staging archive path');
  }
}

export function assertArchiveSources(root, files) {
  if (!files.length || new Set(files).size !== files.length) throw Error('Empty or duplicate staging manifest');
  const base = path.resolve(root);
  if (!fs.lstatSync(base).isDirectory() || fs.lstatSync(base).isSymbolicLink()) throw Error('Unsafe archive root');
  for (const name of files) {
    assertArchivePath(name);
    const parts = name.split('/');
    let current = base;
    for (const [index, part] of parts.entries()) {
      current = path.join(current, part);
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink() || (index < parts.length - 1 ? !stat.isDirectory() : !stat.isFile() || stat.nlink !== 1)) {
        throw Error('Staging archive sources must be regular files with real directory parents');
      }
    }
  }
}

export function compareArchiveInventory(files, namesOutput, typesOutput) {
  const lines = output => {
    if (typeof output !== 'string' || !output.endsWith('\n')) throw Error('Incomplete archive listing');
    return output.replace(/\r\n/g, '\n').slice(0, -1).split('\n');
  };
  const expected = [...files].sort();
  expected.forEach(assertArchivePath);
  if (!expected.length || new Set(expected).size !== expected.length) throw Error('Empty or duplicate staging manifest');
  const names = lines(namesOutput);
  names.forEach(assertArchivePath);
  const types = lines(typesOutput);
  if (types.length !== expected.length || types.some(line => !line.startsWith('-'))) throw Error('Archive contains nonregular entries or incomplete type listing');
  if (names.length !== expected.length || new Set(names).size !== names.length
    || names.sort().some((name, index) => name !== expected[index])) throw Error('Archive inventory differs from staging manifest');
  return { schemaVersion: 1, fileCount: names.length, regularFilesOnly: true,
    inventorySha256: crypto.createHash('sha256').update(expected.join('\0') + '\0').digest('hex') };
}

export async function verifyStagingArchive(root, archive, files, { run = spawnSync } = {}) {
  assertArchiveSources(root, files);
  // bsdtar can list a gzip whose CRC is invalid. Drain Node's checked decoder
  // without buffering the multi-gigabyte uncompressed release in memory.
  try {
    await pipeline(fs.createReadStream(path.resolve(root, archive)), createGunzip(),
      new Writable({ write(_chunk, _encoding, done) { done(); } }));
  } catch { throw Error('Staging archive gzip integrity failed'); }
  const listing = flag => {
    const result = run('tar', [flag, archive], { cwd: root, encoding: 'utf8', windowsHide: true,
      timeout: 900_000, maxBuffer: 16 * 1024 * 1024 });
    if (result.error || result.status !== 0 || result.signal) throw Error('Staging archive listing failed');
    return result.stdout;
  };
  const proof = compareArchiveInventory(files, listing('-tzf'), listing('-tvzf'));
  // Recheck types after tar read; link substitutions during packaging stay nonpassing.
  assertArchiveSources(root, files);
  return proof;
}

// The original-production archive is data, never an installer or source-code override.
export const ORIGINAL_SOURCE_MEMBER = '__vaultspark_source_snapshot.json';
export const ORIGINAL_ARCHIVE_LIMITS = Object.freeze({compressed:536870912, expanded:570425344, files:20000, member:67108864, publicBytes:536870912});
const originalHash=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const originalNeed=(ok,code)=>{if(!ok)throw Error('original-public-archive:'+code);};
const originalAdmissions=new WeakMap();
export function originalArchiveObjectName(file){assertArchivePath(file);return 'objects/'+originalHash(Buffer.from(file,'utf8'));}
export function unpackOriginalPublicArchive(raw,expectedSha256,expectedBytes){
 const L=ORIGINAL_ARCHIVE_LIMITS;
 originalNeed(Buffer.isBuffer(raw)&&/^[a-f0-9]{64}$/.test(expectedSha256)&&Number.isSafeInteger(expectedBytes)&&expectedBytes>0&&expectedBytes<=L.compressed,'expected-archive');
 originalNeed(raw.length===expectedBytes&&originalHash(raw)===expectedSha256,'archive-bytes');
 let tar;try{tar=gunzipSync(raw,{maxOutputLength:L.expanded});}catch{throw Error('original-public-archive:gzip-integrity-or-bound');}
 const files=new Map();let offset=0,total=0,ended=false;
 const octal=b=>{const s=b.toString('ascii').replace(/\0.*$/s,'').trim();originalNeed(/^[0-7]+$/.test(s),'tar-number');const n=parseInt(s,8);originalNeed(Number.isSafeInteger(n),'tar-number-bound');return n;};
 const name=b=>{const n=b.indexOf(0),used=n<0?b:b.subarray(0,n);if(n>=0)originalNeed(b.subarray(n).every(x=>x===0),'tar-name-padding');originalNeed(used.every(x=>x>=32&&x<=126),'tar-name-ascii');return used.toString('ascii');};
 while(offset+512<=tar.length){const header=tar.subarray(offset,offset+512);if(header.every(x=>x===0)){originalNeed(offset+1024<=tar.length&&tar.subarray(offset+512).every(x=>x===0),'tar-end-or-trailing');ended=true;break;}
  originalNeed(header.subarray(257,263).equals(Buffer.from('ustar\0'))&&header.subarray(263,265).toString()==='00','ustar-only');
  let checksum=0;for(let i=0;i<512;i++)checksum+=i>=148&&i<156?32:header[i];originalNeed(checksum===octal(header.subarray(148,156)),'tar-checksum');
  originalNeed(header[156]===0||header[156]===48,'regular-members-only');originalNeed(header.subarray(157,257).every(x=>x===0),'no-link-target');
  const prefix=name(header.subarray(345,500)),base=name(header.subarray(0,100)),file=prefix?prefix+'/'+base:base;assertArchivePath(file);
  originalNeed(!files.has(file)&&files.size<L.files+1,'duplicate-or-count');const size=octal(header.subarray(124,136));originalNeed(size<=L.member,'member-bound');
  const start=offset+512,end=start+size,next=start+Math.ceil(size/512)*512;originalNeed(next<=tar.length&&tar.subarray(end,next).every(x=>x===0),'member-body-or-padding');
  total+=size;originalNeed(total<=L.publicBytes+L.member,'expanded-member-bound');files.set(file,Buffer.from(tar.subarray(start,end)));offset=next;
 }
 originalNeed(ended&&files.size>0,'complete-tar');
 // Reuse the existing strict inventory contract as well as the binary type check.
 compareArchiveInventory([...files.keys()],[...files.keys()].join('\n')+'\n',[...files.keys()].map(f=>'- '+f).join('\n')+'\n');
 return files;
}

/** Pure complete reconstruction: all byte authority is existing signed lineage/production facts. */
export function admitOriginalPublicArchive(files,{frozen,receipt,policy,currentInputs,readLocal,rawSourceRows}){
 originalNeed(files instanceof Map&&files.has(ORIGINAL_SOURCE_MEMBER),'source-metadata');
 const snapshotRaw=files.get(ORIGINAL_SOURCE_MEMBER);originalNeed(snapshotRaw.length<=16777216&&originalHash(snapshotRaw)===receipt.lineage.sourceSnapshotSha256,'signed-source-snapshot');
 const snapshot=JSON.parse(snapshotRaw);originalNeed(snapshot.schemaVersion===1&&snapshot.session===418&&snapshot.scope==='s418-current-materializer-snapshot-v1','snapshot-owner');for(const k of ['sourceCommit','sourceTreeSha','verifierContractSha256'])originalNeed(snapshot[k]===frozen[k],'snapshot-source');
 originalNeed(Array.isArray(snapshot.rows)&&snapshot.rows.length>0&&snapshot.rows.length<=32768,'snapshot-rows');const expected=new Map();let prior='';
 for(const r of snapshot.rows){assertArchivePath(r.file);originalNeed(r.file>prior&&Number.isSafeInteger(r.bytes)&&r.bytes>=0&&/^[a-f0-9]{64}$/.test(r.sha256),'exact-sorted-row');prior=r.file;expected.set(r.file,r);}
 const declared=snapshot.productionManifest;originalNeed(declared&&Array.isArray(declared.leaves),'snapshot-production-manifest');
 const names=new Set([...snapshot.rows.filter(r=>isServed(r.file,policy)).map(r=>r.file),...CORE_PATHS,...OBSERVED_PATHS,...declared.leaves.map(r=>r.path),...(declared.observedLeaves||[]).map(r=>r.path)].filter(f=>isServed(f,policy)));
 const encoded=[...names].map(originalArchiveObjectName);originalNeed(new Set(encoded).size===encoded.length&&files.size===names.size+1&&encoded.every(f=>files.has(f)),'exact-encoded-public-members');
 const publicFiles=new Map([...names].map(f=>[f,files.get(originalArchiveObjectName(f))]));originalNeed(publicFiles.size<=ORIGINAL_ARCHIVE_LIMITS.files,'public-count');let publicBytes=0;
 for(const [f,b]of publicFiles){assertArchivePath(f);originalNeed(isServed(f,policy)&&!/(^|\/)(?:\.git|\.cache|node_modules|secrets?)(?:\/|$)|^(?:scripts|config)(?:\/|$)|(?:^|\/)\.env(?:\.|$)|\.(?:exe|dll|key|pem|p12)$/i.test(f),'positive-public-member');publicBytes+=b.length;}
 originalNeed(publicBytes<=ORIGINAL_ARCHIVE_LIMITS.publicBytes,'public-bytes');
 const manifestRaw=publicFiles.get('api/candidate-artifact-manifest.json'),stampRaw=publicFiles.get('api/build-sha.json');
 originalNeed(manifestRaw&&originalHash(manifestRaw)===receipt.productionSource.rawManifestSha256&&snapshot.productionManifestSha256===receipt.productionSource.rawManifestSha256,'signed-raw-manifest');
 const manifest=JSON.parse(manifestRaw),stamp=JSON.parse(stampRaw||'null');originalNeed(JSON.stringify(manifest)===JSON.stringify(snapshot.productionManifest)&&manifest.candidateSha===frozen.sourceCommit&&manifest.root===receipt.productionSource.artifactRoot&&manifest.leafCount===receipt.productionSource.leafCount,'snapshot-manifest');
 originalNeed(stampRaw&&originalHash(stampRaw)===receipt.copiedHistoricalBuildStamp.rawSha256&&originalHash(stampRaw)===snapshot.buildStampSha256&&stamp?.sha===frozen.sourceCommit,'original-build-stamp');
 const leaves=new Map(manifest.leaves.map(r=>[r.path,r]));
 originalNeed(JSON.stringify(declared)===JSON.stringify(manifest),'exact-original-public-projection');
 for(const[f,b]of publicFiles){const r=expected.get(f);if(r){originalNeed(b.length===r.bytes&&originalHash(b)===r.sha256,'snapshot-member:'+f);}else{const leaf=leaves.get(f);originalNeed(/^assets\/[A-Za-z0-9._/-]+\.shell-[a-f0-9]{10}\.(?:js|css)$/.test(f)&&leaf&&!Object.hasOwn(leaf,'volatileFieldsStripped')&&!Object.hasOwn(leaf,'observedFieldsExtracted')&&b.length===leaf.bytes&&originalHash(b)===leaf.sha256,'unstripped-shell-authority:'+f);}}
 const sourceMap=new Map(manifest.leaves.map(r=>[r.path,publicFiles.get(r.path)])),observed=new Map((manifest.observedLeaves||[]).map(r=>[r.path,publicFiles.get(r.path)]));
 const replay=Buffer.from(JSON.stringify(buildManifest(sourceMap,frozen.sourceCommit,stamp.generatedAt,observed),null,2)+'\n');originalNeed(replay.equals(manifestRaw),'canonical-original-manifest');
 originalNeed(Array.isArray(currentInputs)&&currentInputs.length===snapshot.rows.length&&currentInputs.every((r,i)=>r.file===snapshot.rows[i].file),'complete-current-membership');
 const projected=currentInputs.map(r=>{const b=publicFiles.get(r.file)||readLocal(r.file);const row={file:r.file,bytes:b.length,sha256:originalHash(b)};const e=expected.get(r.file);originalNeed(row.bytes===e.bytes&&row.sha256===e.sha256,'complete-source-row:'+r.file);return row;});
 originalNeed(originalHash(JSON.stringify(projected)).slice(0,24)===receipt.productionSource.fingerprint,'full-production-input-fingerprint');
 for(const r of rawSourceRows){if(r.file==='api/candidate-artifact-manifest.json')continue;const b=publicFiles.get(r.file)||readLocal(r.file);originalNeed(originalHash(b)===r.sha256,'raw-source-preserved:'+r.file);}
 const admitted={snapshot,publicFiles,projected,beforeInputs:structuredClone(currentInputs),publicInventory:[...publicFiles].map(([file,b])=>({file,bytes:b.length,sha256:originalHash(b)})).sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0),sourceSnapshotSha256:originalHash(snapshotRaw)};
 originalAdmissions.set(admitted,originalHash(JSON.stringify({snapshot,projected,beforeInputs:admitted.beforeInputs,inventory:admitted.publicInventory})));return admitted;
}

export function assertOriginalArchiveAdmission(v){
 originalNeed(originalAdmissions.get(v)===originalHash(JSON.stringify({snapshot:v?.snapshot,projected:v?.projected,beforeInputs:v?.beforeInputs,inventory:v?.publicInventory})),'admission-required');
 originalNeed(v.publicFiles.size===v.publicInventory.length&&v.publicInventory.every(r=>{const b=v.publicFiles.get(r.file);return b&&b.length===r.bytes&&originalHash(b)===r.sha256;}),'admitted-data-drift');return v;
}

/** Public artifact bytes only, after complete pure admission. No archive member is executed. */
export function installOriginalPublicFiles(root,v,{proofDirectory,preApplyCheck,finalCheck}={}){
 assertOriginalArchiveAdmission(v);originalNeed(/^\.cache\/isolated-staging\/run-[1-9]\d*-[1-9]\d*\/original-public$/.test(proofDirectory)&&typeof preApplyCheck==='function'&&typeof finalCheck==='function'&&preApplyCheck.constructor.name!=='AsyncFunction'&&finalCheck.constructor.name!=='AsyncFunction','fixed-proof-and-sync-checks');
 const syncCheck=fn=>{const value=fn();if(value&&typeof value.then==='function'){value.catch?.(()=>{});throw Error('original-public-archive:async-postcondition-refused');}originalNeed(value!==false,'failed-postcondition');};
 const base=path.resolve(root);originalNeed(fs.lstatSync(base).isDirectory()&&!fs.lstatSync(base).isSymbolicLink(),'real-install-root');
 const safe=(file,missing=false)=>{assertArchivePath(file);let full=base;const parts=file.split('/');for(const[i,part]of parts.entries()){full=path.join(full,part);if(fs.existsSync(full)){const st=fs.lstatSync(full);originalNeed(!st.isSymbolicLink()&&(i===parts.length-1||st.isDirectory()),'linked-or-nondirectory-target');}}if(fs.existsSync(full)){const s=fs.lstatSync(full);originalNeed(s.isFile()&&s.nlink===1&&s.size<=ORIGINAL_ARCHIVE_LIMITS.member,'regular-target');}else originalNeed(missing,'missing-target');return full;};
 let directory=base;for(const part of proofDirectory.split('/')){directory=path.join(directory,part);if(fs.existsSync(directory))originalNeed(fs.lstatSync(directory).isDirectory()&&!fs.lstatSync(directory).isSymbolicLink(),'linked-proof');}originalNeed(!fs.existsSync(directory),'exclusive-proof-directory');
 syncCheck(preApplyCheck);let beforeBytes=0;const allRows=v.publicInventory.map(r=>{const file=safe(r.file,true),before=fs.existsSync(file)?fs.readFileSync(file):null,unchanged=!!before&&before.length===r.bytes&&originalHash(before)===r.sha256;if(!unchanged)beforeBytes+=before?.length||0;originalNeed(beforeBytes<=ORIGINAL_ARCHIVE_LIMITS.publicBytes,'preimage-byte-bound');return {...r,before:unchanged?null:before,unchanged};}),rows=allRows.filter(r=>!r.unchanged);
 fs.mkdirSync(directory,{recursive:true,mode:0o700});const save=(file,data)=>fs.writeFileSync(path.join(directory,file),Buffer.isBuffer(data)?data:Buffer.from(JSON.stringify(data,null,2)+'\n'),{flag:'wx',mode:0o600});
 save('PREIMAGES.json',rows.map(({before,...r},i)=>({...r,beforeSha256:before?originalHash(before):null,preimage:before?i+'.before':null})));rows.forEach((r,i)=>{if(r.before)save(i+'.before',r.before);});
 const state={scope:'Original PUBLIC artifact byte installation only',files:allRows.length,changedCount:rows.length,unchangedCount:allRows.length-rows.length,attempted:[],completed:false,inspectFirst:false,codeExecuted:false};
 try{assertOriginalArchiveAdmission(v);syncCheck(preApplyCheck);for(const[i,r]of rows.entries()){const target=safe(r.file,true),exists=fs.existsSync(target);originalNeed(r.before?exists&&fs.readFileSync(target).equals(r.before):!exists,'public-target-CAS');save(i+'.attempt.json',{file:r.file,beforeSha256:r.before?originalHash(r.before):null,targetSha256:r.sha256});state.attempted.push(r.file);let p=base;for(const part of r.file.split('/').slice(0,-1)){p=path.join(p,part);if(!fs.existsSync(p))fs.mkdirSync(p,{mode:0o700});originalNeed(fs.lstatSync(p).isDirectory()&&!fs.lstatSync(p).isSymbolicLink(),'public-target-parent');}const bytes=v.publicFiles.get(r.file);if(r.before){const prior=fs.lstatSync(target),fd=fs.openSync(target,'r+');try{const s=fs.fstatSync(fd);originalNeed(s.dev===prior.dev&&s.ino===prior.ino&&s.nlink===1&&fs.readFileSync(fd).equals(r.before),'public-open-CAS');fs.ftruncateSync(fd,0);let n=0;while(n<bytes.length){const k=fs.writeSync(fd,bytes,n,bytes.length-n,n);originalNeed(k>0,'public-short-write');n+=k;}fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}else fs.writeFileSync(target,bytes,{flag:'wx',mode:0o600});originalNeed(originalHash(fs.readFileSync(safe(r.file)))===r.sha256,'public-install-readback');}
  for(const r of allRows)originalNeed(originalHash(fs.readFileSync(safe(r.file)))===r.sha256,'public-final-byte-check');syncCheck(finalCheck);state.completed=true;
 }catch(e){state.error=String(e?.message||e);state.inspectFirst=true;state.partialStateUnknown=true;state.automaticRollbackAttempted=false;}
 save('RESULT.json',state);if(!state.completed)throw Error('original-public-archive:install-failed-inspect-first');return {proofFile:proofDirectory+'/RESULT.json',publicInventorySha256:originalHash(JSON.stringify(v.publicInventory)),files:allRows.length,changedCount:rows.length,unchangedCount:allRows.length-rows.length,codeExecuted:false};
}

export async function fetchOriginalArchiveAsset(transport,{token,sourceCommit,probe=false,fetchImpl=fetch}={}){
 originalNeed(transport&&Object.keys(transport).sort().join(',')==='assetId,bytes,sha256','transport-fields');
 const {assetId,sha256}=transport,bytes=Number(transport.bytes);originalNeed(typeof assetId==='string'&&/^[1-9]\d{0,15}$/.test(assetId)&&Number.isSafeInteger(Number(assetId))&&/^[a-f0-9]{64}$/.test(sha256)&&/^[1-9]\d*$/.test(String(transport.bytes))&&Number.isSafeInteger(bytes)&&bytes<=ORIGINAL_ARCHIVE_LIMITS.compressed,'transport-reference');
 originalNeed(typeof token==='string'&&token.length>0&&(probe||/^[a-f0-9]{40}$/.test(sourceCommit)),'read-capability-and-source');
 const endpoint='https://api.github.com/repos/VaultSparkStudios/VaultSparkStudios.github.io/releases/assets/'+assetId;
 const headers={authorization:'Bearer '+token,'user-agent':'VaultSpark-original-public-artifact','x-github-api-version':'2022-11-28'};
 const readBounded=async(response,max)=>{originalNeed(!response.headers.get('content-length')||Number(response.headers.get('content-length'))<=max,'response-length');const reader=response.body?.getReader();originalNeed(reader,'response-body');const chunks=[];let total=0,timer;const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('original-public-archive:body-timeout')),30000);});try{for(;;){const p=await Promise.race([reader.read(),deadline]);if(p.done)break;total+=p.value.length;originalNeed(total<=max,'response-body-bound');chunks.push(Buffer.from(p.value));}return Buffer.concat(chunks,total);}finally{clearTimeout(timer);reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}};
 const metaResponse=await fetchImpl(endpoint,{method:'GET',redirect:'error',headers:{...headers,accept:'application/vnd.github+json'},signal:AbortSignal.timeout(15000)});originalNeed(metaResponse.status===200,'asset-metadata-unavailable');const meta=JSON.parse(await readBounded(metaResponse,65536));
 originalNeed(meta.id===Number(assetId)&&meta.state==='uploaded'&&meta.size===bytes&&meta.digest==='sha256:'+sha256,'immutable-asset-metadata');
 originalNeed(probe?/^s418-original-public-probe-[a-z0-9-]+\.tgz$/.test(meta.name):meta.name==='production-original-'+sourceCommit+'.tgz','asset-name');
 if(probe){
  // This mode deliberately cannot read an archive body. Download trust admission is separate.
  const head=await fetchImpl(endpoint,{method:'HEAD',redirect:'manual',headers:{...headers,accept:'application/octet-stream'},signal:AbortSignal.timeout(15000)});
  originalNeed([200,302,405,501].includes(head.status),'asset-head-unavailable');let redirectHost=null;
  if(head.status===302){const location=new URL(head.headers.get('location')||'');originalNeed(location.protocol==='https:'&&location.hostname==='release-assets.githubusercontent.com'&&!location.username&&!location.password&&!location.port,'fixed-asset-head-redirect');redirectHost=location.hostname;}
  head.body?.cancel().catch(()=>{});return {raw:null,asset:{id:Number(assetId),name:meta.name,sha256,bytes},metadataReadVerified:true,headStatus:head.status,headSupported:![405,501].includes(head.status),redirectHost,binaryReadVerified:false};
 }
 let response=await fetchImpl(endpoint,{method:'GET',redirect:'manual',headers:{...headers,accept:'application/octet-stream'},signal:AbortSignal.timeout(15000)});
 if(response.status===302){const location=new URL(response.headers.get('location')||'');originalNeed(location.protocol==='https:'&&location.hostname==='release-assets.githubusercontent.com'&&!location.username&&!location.password&&!location.port,'fixed-asset-redirect');response.body?.cancel().catch(()=>{});response=await fetchImpl(location.href,{method:'GET',redirect:'error',headers:{accept:'application/octet-stream'},signal:AbortSignal.timeout(15000)});}
 originalNeed(response.status===200,'asset-download-unavailable');const raw=await readBounded(response,bytes);originalNeed(raw.length===bytes&&originalHash(raw)===sha256,'downloaded-archive-bytes');return {raw,asset:{id:Number(assetId),name:meta.name,sha256,bytes}};
}
