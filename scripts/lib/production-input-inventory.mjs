/** Exact source-selection grammar shared with the reviewed isolated materializer. */
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from './safe-spawn.mjs';import {isServed} from './served-surface.mjs';import {assertArchivePath,assertArchiveSources} from './staging-archive.mjs';import {sha256} from './isolated-staging-contract.mjs';
export const PRODUCTION_INPUT_PRODUCERS=Object.freeze(['scripts/build-ambient-bundle.mjs','scripts/build-shell-assets.mjs','scripts/build-early-hints-headers.mjs','scripts/build-candidate-artifact-manifest.mjs']);
const sensitive=p=>/(^|\/)(?:\.git|node_modules|\.env(?:\..*)?|secrets?)(?:\/|$)|\.(?:pem|key|p12|pfx)$/i.test(p);
export function productionInputRows(root,buildView={}){
 if(Object.keys(buildView).some(k=>!['candidateManifest','buildStamp'].includes(k))||Object.values(buildView).some(v=>!Buffer.isBuffer(v)))throw Error('production-input-view');
 const bytes=file=>{assertArchivePath(file);if(sensitive(file))throw Error('production-input-sensitive');assertArchiveSources(root,[file]);const stat=fs.statSync(path.join(root,file));if(stat.size>67108864)throw Error('production-input-bound');return fs.readFileSync(path.join(root,file));};
 const r=spawnSync('git',['ls-files','-co','--exclude-standard','-z'],{cwd:root,windowsHide:true,encoding:'utf8',timeout:120000,maxBuffer:33554432});if(r.status!==0||r.signal||r.error)throw Error('production-input-Git');
 const policy=JSON.parse(bytes('config/served-surface.json')),all=[...new Set(r.stdout.split('\0').filter(Boolean))].sort(),selected=new Set(all.filter(f=>!sensitive(f)&&fs.existsSync(path.join(root,f))&&(isServed(f,policy)||/^cloudflare\/[A-Za-z0-9_./-]+\.(?:js|mjs|toml)$/.test(f)||/^config\/[A-Za-z0-9_./-]+\.(?:json|mjs)$/.test(f)||['package.json','package-lock.json'].includes(f))));
 const visited=new Set();function imports(file){if(visited.has(file))return;visited.add(file);selected.add(file);for(const m of bytes(file).toString().matchAll(/(?:from\s*|import\s*\(?\s*)['"](\.[^'"]+)['"]/g)){const dep=path.posix.normalize(path.posix.join(path.posix.dirname(file),m[1]));if(!/^(scripts|config)\//.test(dep))throw Error('production-input-producer-root');imports(dep);}}
 for(const file of PRODUCTION_INPUT_PRODUCERS)imports(file);
 return [...selected].sort().map(file=>{const b=file==='api/candidate-artifact-manifest.json'&&buildView.candidateManifest!==undefined?buildView.candidateManifest:file==='api/build-sha.json'&&buildView.buildStamp!==undefined?buildView.buildStamp:bytes(file);return {file,bytes:b.length,sha256:sha256(b)};});
}
export const productionInputFingerprint=rows=>sha256(Buffer.from(JSON.stringify(rows))).slice(0,24);
