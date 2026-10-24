import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from '../scripts/lib/safe-spawn.mjs';
import { assertArchivePath, assertArchiveSources, compareArchiveInventory, verifyStagingArchive } from '../scripts/lib/staging-archive.mjs';
import { createStagingDeployReceipt, validateStagingDeployReceipt } from '../scripts/lib/staging-deploy-receipt.mjs';

async function fixture(fn) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vs-archive-'));
  try { fs.writeFileSync(path.join(root,'a.txt'),'a');fs.writeFileSync(path.join(root,'b file.txt'),'b');return await fn(root); }
  finally { fs.rmSync(root,{recursive:true,force:true}); }
}
function tar(root,names) {
  fs.writeFileSync(path.join(root,'list'),names.join('\0'));
  const r=spawnSync('tar',['-czf','candidate.tgz','--null','-T','list'],{cwd:root,encoding:'utf8',windowsHide:true});
  assert.equal(r.status,0,r.stderr);
}
test('real tar accepts exact regular files, spaces and long paths; proof is order independent',()=>fixture(async root=>{
  const long='directory-'.repeat(12);fs.mkdirSync(path.join(root,long));fs.writeFileSync(path.join(root,long,'long file.txt'),'long');
  const files=['a.txt','b file.txt',`${long}/long file.txt`];tar(root,files);
  const first=await verifyStagingArchive(root,'candidate.tgz',files);
  assert.equal(first.fileCount,3);assert.equal(first.regularFilesOnly,true);assert.match(first.inventorySha256,/^[a-f0-9]{64}$/);
  assert.deepEqual(await verifyStagingArchive(root,'candidate.tgz',[...files].reverse()),first);
}));
test('actual omitted, substituted and duplicate members fail even when counts match',()=>fixture(async root=>{
  for(const members of [['a.txt'],['a.txt','a.txt'],['b file.txt','b file.txt']]){
    tar(root,members);await assert.rejects(()=>verifyStagingArchive(root,'candidate.tgz',['a.txt','b file.txt']),/inventory|nonregular/);
  }
  fs.writeFileSync(path.join(root,'extra.txt'),'x');tar(root,['a.txt','extra.txt']);
  await assert.rejects(()=>verifyStagingArchive(root,'candidate.tgz',['a.txt','b file.txt']),/inventory/);
}));
test('corrupt and truncated archives fail before upload can be reached',()=>fixture(async root=>{
  for(const corrupt of [Buffer.from('not a gzip archive'),Buffer.from([31,139,8,0])]){
    fs.writeFileSync(path.join(root,'candidate.tgz'),corrupt);let uploaded=false;
    await assert.rejects(async()=>{await verifyStagingArchive(root,'candidate.tgz',['a.txt']);uploaded=true;},/listing failed|gzip integrity failed/);assert.equal(uploaded,false);
  }
  tar(root,['a.txt']);const bytes=fs.readFileSync(path.join(root,'candidate.tgz'));fs.writeFileSync(path.join(root,'candidate.tgz'),bytes.subarray(0,Math.floor(bytes.length/2)));
  await assert.rejects(()=>verifyStagingArchive(root,'candidate.tgz',['a.txt']),/listing failed|gzip integrity failed/);
}));
test('unsafe paths and ambiguous listing output fail closed',()=>{
  for(const name of ['../a','/a','C:/a','-a','a//b','./a','a/../b','a\nb','a\rb','a\\b','a\tb','caf\u00e9',''])assert.throws(()=>assertArchivePath(name));
  for(const names of ['a.txt','a.txt\nextra\n','./a.txt\n','a.txt\na.txt\n'])assert.throws(()=>compareArchiveInventory(['a.txt'],names,'-rw-r--r-- fixture\n'));
  assert.throws(()=>compareArchiveInventory(['a.txt'],'a.txt\n','lrwxrwxrwx fixture\n'),/nonregular/);
  assert.throws(()=>compareArchiveInventory(['a.txt'],'a.txt\n','hrw-r--r-- fixture\n'),/nonregular/);
});
test('source directories, hardlinks and junction parents are refused',()=>fixture(async root=>{
  fs.mkdirSync(path.join(root,'dir'));assert.throws(()=>assertArchiveSources(root,['dir']),/regular/);
  fs.linkSync(path.join(root,'a.txt'),path.join(root,'hard'));assert.throws(()=>assertArchiveSources(root,['a.txt']),/regular/);fs.unlinkSync(path.join(root,'hard'));
  fs.symlinkSync(root,path.join(root,'alias'),process.platform==='win32'?'junction':'dir');assert.throws(()=>assertArchiveSources(root,['alias/a.txt']),/regular/);
}));
test('archive types are checked independently of the source state',()=>fixture(async root=>{
  tar(root,['a.txt']);let calls=0;
  const run=()=>({status:0,stdout:++calls===1?'a.txt\n':'lrwxrwxrwx fixture\n'});
  await assert.rejects(()=>verifyStagingArchive(root,'candidate.tgz',['a.txt'],{run}),/nonregular/);
  const bad=()=>({status:0,error:Error('truncated'),stdout:'a.txt\n'});await assert.rejects(()=>verifyStagingArchive(root,'candidate.tgz',['a.txt'],{run:bad}),/listing failed|gzip integrity failed/);
}));
test('actual directory recursion and archive hardlinks cannot masquerade as regular entries',()=>fixture(async root=>{
  fs.mkdirSync(path.join(root,'dir'));fs.writeFileSync(path.join(root,'dir','child'),'child');tar(root,['dir']);
  await assert.rejects(()=>verifyStagingArchive(root,'candidate.tgz',['a.txt']),/nonregular|Unsupported staging archive path/);
  fs.linkSync(path.join(root,'a.txt'),path.join(root,'alias.txt'));tar(root,['a.txt','alias.txt']);
  fs.unlinkSync(path.join(root,'alias.txt'));fs.writeFileSync(path.join(root,'alias.txt'),'a');
  await assert.rejects(()=>verifyStagingArchive(root,'candidate.tgz',['a.txt','alias.txt']),/nonregular/);
}));
test('both publisher transactions verify inventory before scp',()=>{
  for(const file of ['deploy-staging.mjs','deploy-staging-content.mjs']){
    const text=fs.readFileSync(new URL(`../scripts/${file}`,import.meta.url),'utf8');
    const check=text.indexOf('const archiveInventory = await verifyStagingArchive('),upload=text.indexOf("checked(run('scp',",check);
    assert.ok(check>0&&upload>check);assert.match(text,/assertArchiveSources\(ROOT, (?:manifest|promotable)\)/);
  }
});
test('new inventory is retained and manifest-bound while historical receipts remain readable',()=>{
  const inventory=compareArchiveInventory(['a.txt'],'a.txt\n','-rw-r--r-- fixture\n');
  const input={generatedAt:new Date().toISOString(),commitSha:'a'.repeat(40),sourceFingerprint:'b'.repeat(24),candidateRoot:'c'.repeat(64),candidateLeafCount:1,archiveSha256:'d'.repeat(64),archiveBytes:1,deployId:'20261024000000',manifestFileCount:1,remoteFileCount:1,remoteRoot:'/opt/studio/staging/website',parity:{candidateBuildSha:'a'.repeat(40),artifactManifest:{candidateRoot:'c'.repeat(64)}}};
  validateStagingDeployReceipt(createStagingDeployReceipt(input));
  const receipt=createStagingDeployReceipt({...input,archiveInventory:inventory});
  assert.deepEqual(receipt.archive.inventory,inventory);validateStagingDeployReceipt(receipt);
  for(const mutation of [{fileCount:2},{regularFilesOnly:false},{inventorySha256:'invalid'},{schemaVersion:2}]){
    const changed=structuredClone(receipt);Object.assign(changed.archive.inventory,mutation);assert.throws(()=>validateStagingDeployReceipt(changed),/inventory/);
  }
});

test('gzip CRC corruption is rejected even when installed tar lists it',()=>fixture(async root=>{
  tar(root,['a.txt']);const bytes=fs.readFileSync(path.join(root,'candidate.tgz'));bytes[bytes.length-8]^=255;fs.writeFileSync(path.join(root,'candidate.tgz'),bytes);
  await assert.rejects(()=>verifyStagingArchive(root,'candidate.tgz',['a.txt']),/gzip integrity failed/);
}));
