#!/usr/bin/env node
/** Copy the admitted compiled public artifact, including generated shell files; never raw git archive. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {spawnSync} from './lib/safe-spawn.mjs';import {assertArchiveSources} from './lib/staging-archive.mjs';import {isServed} from './lib/served-surface.mjs';
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
async function main(){const args=process.argv.slice(2);if(!args.length||(args.length===1&&args[0]==='--help'))return console.log('package-compiled-production: inert; explicit admitted context required');if(args.length!==2||args[0]!=='--isolated-staging-context'||args[1].split(':').length!==2)throw Error('compiled-dist-explicit-context');const [file,hash]=args[1].split(':');const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),context=await loadRuntimeContext(root,file,hash);assertAdmittedContext(context);verifyFrozenSource(root,context.frozen?.sourceCommit??context.receipt.productionSource.commitSha,{candidateArtifact:'compiled-build'});console.log(JSON.stringify(copyCompiledPublicBuild(root,'/tmp/pages-dist',context.receipt.productionSource)));}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
