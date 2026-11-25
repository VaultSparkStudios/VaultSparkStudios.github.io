#!/usr/bin/env node
/** Copy the admitted compiled public artifact, including generated shell files; never raw git archive. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {spawnSync} from './lib/safe-spawn.mjs';import {assertArchiveSources,ORIGINAL_SOURCE_MEMBER,originalArchiveObjectName,unpackOriginalPublicArchive,admitOriginalPublicArchive,fetchOriginalArchiveAsset} from './lib/staging-archive.mjs';import {isServed} from './lib/served-surface.mjs';
import {readOwned,verifyFrozenSource,loadRuntimeContext,assertAdmittedContext} from './lib/isolated-staging-evidence.mjs';
import {sha256} from './lib/isolated-staging-contract.mjs';
import {productionInputRows,productionInputFingerprint} from './lib/production-input-inventory.mjs';
import {CORE_PATHS,OBSERVED_PATHS,shellPaths} from './build-candidate-artifact-manifest.mjs';
function exactDestinationRows(target){
 const files=[];let directories=0;function visit(dir=''){if(++directories>20000)throw Error('compiled-dist-destination-bound');for(const entry of fs.readdirSync(path.join(target,dir),{withFileTypes:true})){const file=dir?dir+'/'+entry.name:entry.name,st=fs.lstatSync(path.join(target,file));if(st.isSymbolicLink()||(st.fileAttributes&1024))throw Error('compiled-dist-destination-linked');if(st.isDirectory())visit(file);else{if(!st.isFile()||st.nlink!==1||st.size>67108864||files.length>=20000)throw Error('compiled-dist-destination-file');files.push(file);}}}visit();files.sort();assertArchiveSources(target,files);let total=0;return files.map(file=>{const raw=readOwned(target,file,67108864);total+=raw.length;if(total>536870912)throw Error('compiled-dist-destination-bytes');return {file,bytes:raw.length,sha256:sha256(raw)};});
}
export function copyCompiledPublicBuild(root,dist,productionSource){
 const expectedManifestSha256=productionSource.rawManifestSha256,beforeInputs=productionInputRows(root);if(productionInputFingerprint(beforeInputs)!==productionSource.fingerprint)throw Error('compiled-dist-full-input-fingerprint');
 const run=spawnSync('git',['ls-files','-co','--exclude-standard','-z'],{cwd:root,windowsHide:true,encoding:'utf8',maxBuffer:16777216});if(run.status!==0)throw Error('compiled-dist-Git');
 const policy=JSON.parse(readOwned(root,'config/served-surface.json'));
 // Reuse the positive deployment classifier; shellPaths adds current generated assets even if Git-ignored.
 const names=[...new Set([...run.stdout.split('\0').filter(Boolean),...CORE_PATHS,...OBSERVED_PATHS,...shellPaths(root)])].filter(f=>isServed(f,policy)).sort();
 if(!names.length||names.length>20000||names.some(f=>/(?:^|\/)(?:\.env(?:\.|$)|secrets(?:\/|$))|\.(?:pem|key|p12)$/i.test(f)))throw Error('compiled-dist-public-scope');
 assertArchiveSources(root,names);const rows=names.map(file=>{const raw=readOwned(root,file,67108864);return {file,bytes:raw.length,sha256:sha256(raw)};});
 if(rows.reduce((sum,r)=>sum+r.bytes,0)>536870912)throw Error('compiled-dist-byte-bound');
 if(sha256(readOwned(root,'api/candidate-artifact-manifest.json'))!==expectedManifestSha256)throw Error('compiled-dist-admitted-artifact');
 const target=path.resolve(dist);if(fs.existsSync(target))throw Error('compiled-dist-target-exists');fs.mkdirSync(target,{recursive:true});if(fs.lstatSync(target).isSymbolicLink())throw Error('compiled-dist-linked-target');
 for(const row of rows){const raw=readOwned(root,row.file,67108864);if(sha256(raw)!==row.sha256)throw Error('compiled-dist-source-drift');const full=path.resolve(target,row.file);if(!full.startsWith(target+path.sep))throw Error('compiled-dist-path');fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,raw,{flag:'wx'});}
 for(const row of rows)if(sha256(readOwned(root,row.file,67108864))!==row.sha256||sha256(readOwned(target,row.file,67108864))!==row.sha256)throw Error('compiled-dist-copy-drift');
 if(JSON.stringify(exactDestinationRows(target))!==JSON.stringify(rows))throw Error('compiled-dist-destination-inventory');
 if(JSON.stringify(productionInputRows(root))!==JSON.stringify(beforeInputs))throw Error('compiled-dist-full-input-drift');
 return {fileCount:rows.length,inventorySha256:sha256(JSON.stringify(rows)),candidateManifestSha256:expectedManifestSha256};
}

/** Freeze the real original PUBLIC bytes before the stage-only backend transformation. */
function ownedOriginalOutput(root,file){const base=path.resolve(root),full=path.resolve(file),prefix=path.join(base,'.cache/S418/original-public-archive')+path.sep;if(!full.startsWith(prefix))throw Error('original-owned-output');let p=base;for(const part of path.relative(base,full).split(path.sep)){p=path.join(p,part);if(fs.existsSync(p)){const s=fs.lstatSync(p);if(s.isSymbolicLink()||!s.isDirectory())throw Error('original-output-parent');}}if(fs.existsSync(full))throw Error('original-output-exists');return full;}
export function prepareOriginalPublicDist(root,dist){
 const target=ownedOriginalOutput(root,dist);
 const rows=productionInputRows(root),manifestRaw=readOwned(root,'api/candidate-artifact-manifest.json'),manifest=JSON.parse(manifestRaw);
 const productionSource={fingerprint:productionInputFingerprint(rows),rawManifestSha256:sha256(manifestRaw)};
 return {...copyCompiledPublicBuild(root,target,productionSource),sourceCommit:manifest.candidateSha,productionSource,scope:'Original PUBLIC byte freeze only; not native/install or release acceptance'};
}

/** Pack only the frozen public dist plus authenticated-later source metadata; never a variant archive. */
export function packOriginalPublicDist(root,dist,snapshotRaw,{tarFile,tarSha256,archiveFile,run=spawnSync}={}){
 const prefix=path.resolve(root,'.cache/S418/original-public-archive')+path.sep,base=path.resolve(dist),archive=path.resolve(archiveFile||'');
 if(!base.startsWith(prefix)||!archive.startsWith(prefix)||fs.existsSync(archive)||!Buffer.isBuffer(snapshotRaw)||snapshotRaw.length>16777216)throw Error('original-pack-owned-paths');
 const snapshot=JSON.parse(snapshotRaw),G=snapshot.sourceCommit;if(!/^[a-f0-9]{40}$/.test(G)||path.basename(archive)!=='production-original-'+G+'.tgz')throw Error('original-pack-source');
 ownedOriginalOutput(root,archive);const encodedDirectory=ownedOriginalOutput(root,archive+'.objects');ownedOriginalOutput(root,archive+'.files');
 const rows=exactDestinationRows(base),policy=JSON.parse(readOwned(root,'config/served-surface.json')),files=new Map(rows.map(r=>[originalArchiveObjectName(r.file),readOwned(base,r.file,67108864)]));files.set(ORIGINAL_SOURCE_MEMBER,snapshotRaw);
 const receipt={lineage:{sourceSnapshotSha256:sha256(snapshotRaw)},productionSource:{fingerprint:productionInputFingerprint(snapshot.rows),rawManifestSha256:snapshot.productionManifestSha256,artifactRoot:snapshot.productionManifest.root,leafCount:snapshot.productionManifest.leafCount},copiedHistoricalBuildStamp:{rawSha256:snapshot.buildStampSha256}};
 const frozen=Object.fromEntries(['sourceCommit','sourceTreeSha','verifierContractSha256'].map(k=>[k,snapshot[k]]));
 const admitted=admitOriginalPublicArchive(files,{frozen,receipt,policy,currentInputs:snapshot.rows,readLocal:f=>readOwned(root,f,67108864),rawSourceRows:[]});
 if(!path.isAbsolute(tarFile||'')||!/^[a-f0-9]{64}$/.test(tarSha256||'')||fs.lstatSync(tarFile).isSymbolicLink()||!fs.lstatSync(tarFile).isFile()||sha256(fs.readFileSync(tarFile))!==tarSha256)throw Error('original-pack-pinned-tar');
 fs.mkdirSync(path.join(encodedDirectory,'objects'),{recursive:true,mode:0o700});for(const[file,raw]of files)fs.writeFileSync(path.join(encodedDirectory,file),raw,{flag:'wx',mode:0o600});
 const names=[...files.keys()].sort();assertArchiveSources(encodedDirectory,names);
 const list=archive+'.files';fs.writeFileSync(list,Buffer.from(names.join('\0')+'\0'),{flag:'wx',mode:0o600});
 const result=run(tarFile,['-czf',archive,'--format=ustar','--null','-T',list],{cwd:encodedDirectory,windowsHide:true,encoding:'utf8',timeout:180000,maxBuffer:16777216});if(result.status!==0||result.signal||result.error)throw Error('original-pack-tar-failed');
 if(fs.statSync(archive).size>536870912)throw Error('original-pack-archive-bound');const raw=fs.readFileSync(archive),parsed=unpackOriginalPublicArchive(raw,sha256(raw),raw.length);
 for(const[f,b]of files)if(!parsed.get(f)?.equals(b))throw Error('original-pack-member-drift');if(parsed.size!==files.size||sha256(fs.readFileSync(tarFile))!==tarSha256)throw Error('original-pack-inventory-or-runtime-drift');
 return {file:archive,sha256:sha256(raw),bytes:raw.length,sourceCommit:G,sourceSnapshotSha256:sha256(snapshotRaw),publicInventorySha256:sha256(JSON.stringify(admitted.publicInventory)),scope:'Data-only original PUBLIC archive; existing signed installation association remains required'};
}

export async function probeOriginalPublicArchive(transport,{token,fetchImpl=fetch}={}){
 const observation=await fetchOriginalArchiveAsset(transport,{token,fetchImpl,probe:true});
 return {scope:'Read-only draft asset metadata and optional HEAD routing only',...observation,productionAccepted:false,nativeAccepted:false,workspaceWritten:false};
}
async function main(){
 const args=process.argv.slice(2);if(!args.length||(args.length===1&&args[0]==='--help'))return console.log('package-compiled-production: inert; admitted context or explicit read-only original-public probe required');
 if(args[0]==='--probe-original-public-archive'){
  if(args.length!==4||process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_EVENT_NAME!=='workflow_dispatch')throw Error('original-public-probe-explicit-ci-only');
  const flags={};for(const x of args.slice(1)){const m=x.match(/^--(asset-id|archive-sha256|archive-bytes)=([a-z0-9]+)$/);if(!m||flags[m[1]])throw Error('original-public-probe-flags');flags[m[1]]=m[2];}
  if(Object.keys(flags).length!==3)throw Error('original-public-probe-complete-flags');const {getSecret}=await import('./lib/secrets.mjs');
  console.log(JSON.stringify(await probeOriginalPublicArchive({assetId:flags['asset-id'],sha256:flags['archive-sha256'],bytes:flags['archive-bytes']},{token:await getSecret('GITHUB_TOKEN','github.api')})));return;
 }
 if(args.length!==2||args[0]!=='--isolated-staging-context'||args[1].split(':').length!==2)throw Error('compiled-dist-explicit-context');
 const [file,hash]=args[1].split(':'),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),context=await loadRuntimeContext(root,file,hash);assertAdmittedContext(context);verifyFrozenSource(root,context.frozen?.sourceCommit??context.receipt.productionSource.commitSha,{candidateArtifact:'compiled-build'});console.log(JSON.stringify(copyCompiledPublicBuild(root,'/tmp/pages-dist',context.receipt.productionSource)));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
