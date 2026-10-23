import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from '../scripts/lib/safe-spawn.mjs';
import { fileURLToPath } from 'node:url';
import { planSnapshots, manifest, archiveSnapshot, assertArchiveVolume, LOCK_COMMANDS, ROLLBACK_PREFLIGHT, ROLLBACK_ARCHIVE } from '../scripts/archive-staging-rollbacks.mjs';

const now=Date.now(), old=now-7200_000;
test('keeps newest three and protects young snapshots independently of ordering',()=>{
 const rows=[1,2,3,4,5].map(n=>({name:`2026102300000${n}`,kind:'directory',mtimeMs:old+n}));
 rows.push({name:'desk-20261023000006',kind:'directory',mtimeMs:now-1000});
 rows.push({name:'foreign',kind:'directory',mtimeMs:old});
 rows.push({name:'20261023000007',kind:'symlink',mtimeMs:old});
 const p=planSnapshots(rows,{now});
 assert.deepEqual(p.preserved,['desk-20261023000006','20261023000005','20261023000004']);
 assert.deepEqual(p.candidates,['20261023000001','20261023000002','20261023000003']);
 assert.deepEqual(p.ignored,['foreign','20261023000007']);
 assert.throws(()=>planSnapshots(rows,{keep:2}),/three/);
});
test('manifest detects content changes and refuses hard-linked entries',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'website-rollback-'));
 try{fs.writeFileSync(path.join(root,'file'),'before');const a=await manifest(root);fs.writeFileSync(path.join(root,'file'),'after');const b=await manifest(root);assert.notEqual(a.digest,b.digest);fs.linkSync(path.join(root,'file'),path.join(root,'alias'));await assert.rejects(manifest(root),/Hard-linked/);}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('archive mount must be measured and independent of root disk',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'website-mount-'));
 try{assert.throws(()=>assertArchiveVolume({root,volume:root,archive:path.join(root,'archive'),run:()=>''}),/unavailable/);assert.throws(()=>assertArchiveVolume({root,volume:root,archive:path.join(root,'archive'),run:()=>root}),/differ/);}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('deployer lock is one fixed named flock',()=>assert.deepEqual(LOCK_COMMANDS,['exec 9>/var/lock/website-staging-rollback.lock','flock -x 9']));
test('wrong archive volume UUID fails before mutation',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'website-uuid-')),volume=path.join(root,'volume');fs.mkdirSync(volume);
 try{assert.throws(()=>assertArchiveVolume({root,volume,archive:path.join(volume,'archive'),stat:p=>({dev:p===volume?2:1}),run:(_,args)=>args.at(-1)==='TARGET'?volume:'foreign-uuid'}),/identity mismatch/);}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('both deploy producer transactions hold the lock through archival',()=>{
 const base=new URL('../scripts/',import.meta.url);
 for(const file of ['deploy-staging.mjs','deploy-staging-content.mjs']){
  const source=fs.readFileSync(new URL(file,base),'utf8');
  const pre=source.indexOf('    ROLLBACK_PREFLIGHT,'),write=source.indexOf("    'mkdir -p \\\"$ROOT",pre);
  assert.ok(pre>0);
  assert.ok(source.indexOf('    ROLLBACK_ARCHIVE,',pre)>pre);
  assert.match(ROLLBACK_PREFLIGHT,/exec 9>.*flock -x 9/);
  assert.match(ROLLBACK_ARCHIVE,/--apply --locked/);
  assert.match(source.slice(pre),/--backup-dir/);
 }
});
test('CLI invoked through installed symlink actually runs',{skip:process.platform!=='linux'},()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'website-cli-link-'));
 try{const link=path.join(root,'archiver.mjs');fs.symlinkSync(fileURLToPath(new URL('../scripts/archive-staging-rollbacks.mjs',import.meta.url)),link);const r=spawnSync(process.execPath,[link,'--help'],{encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/Dry-run by default/);}finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('verified archival preserves original path and all bytes; destination collision retains source',{skip:process.platform!=='linux'},async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'website-archive-'));const root=path.join(temp,'rollback'),archive=path.join(temp,'archive'),name='20261023000100';fs.mkdirSync(root);fs.mkdirSync(archive);fs.mkdirSync(path.join(root,name));fs.writeFileSync(path.join(root,name,'file'),'rollback data');
 try{const before=await manifest(path.join(root,name));const result=await archiveSnapshot(name,{root,archive,log:()=>{}});assert.equal(result.phase,'archived');assert.equal(fs.lstatSync(path.join(root,name)).isSymbolicLink(),true);assert.equal(fs.readFileSync(path.join(root,name,'file'),'utf8'),'rollback data');assert.equal((await manifest(path.join(archive,name))).digest,before.digest);assert.deepEqual(fs.readdirSync(root),[name]);const second='20261023000101';fs.mkdirSync(path.join(root,second));fs.mkdirSync(path.join(archive,second));await assert.rejects(archiveSnapshot(second,{root,archive,log:()=>{}}),/Existing archive/);assert.ok(fs.statSync(path.join(root,second)).isDirectory());}finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('copy corruption never switches or removes original',{skip:process.platform!=='linux'},async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'website-corrupt-'));const root=path.join(temp,'rollback'),archive=path.join(temp,'archive'),name='20261023000200';fs.mkdirSync(root);fs.mkdirSync(archive);fs.mkdirSync(path.join(root,name));fs.writeFileSync(path.join(root,name,'file'),'original');
 try{let exchanged=false;await assert.rejects(archiveSnapshot(name,{root,archive,copy:(_,dest)=>fs.writeFileSync(path.join(dest,'file'),'corrupt'),flush:()=>{},exchange:()=>{exchanged=true;},log:()=>{}}),/verification failed/);assert.equal(exchanged,false);assert.equal(fs.readFileSync(path.join(root,name,'file'),'utf8'),'original');}finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('interrupted copy retry creates no new copy and leaves source unchanged',async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'website-copy-retry-'));const root=path.join(temp,'rollback'),archive=path.join(temp,'archive'),name='20261023000201';fs.mkdirSync(root);fs.mkdirSync(archive);fs.mkdirSync(path.join(root,name));fs.writeFileSync(path.join(root,name,'file'),'original');
 try{
  const before=await manifest(path.join(root,name));let copies=0,exchanges=0,removals=0;
  const options={root,archive,copy:(_,dest)=>{copies++;fs.writeFileSync(path.join(dest,'interrupted'),'partial');throw Error('simulated interrupted copy');},exchange:()=>{exchanges++;},remove:()=>{removals++;},log:()=>{}};
  await assert.rejects(archiveSnapshot(name,options),/simulated interrupted/);
  const afterFirst=fs.readdirSync(archive);
  assert.equal(afterFirst.length,1);assert.ok(afterFirst[0].startsWith(`.copy-${name}-`));
  await assert.rejects(archiveSnapshot(name,options),/Interrupted archive copy requires explicit recovery/);
  assert.equal(copies,1);assert.equal(exchanges,0);assert.equal(removals,0);assert.deepEqual(fs.readdirSync(archive),afterFirst);
  assert.equal((await manifest(path.join(root,name))).digest,before.digest);assert.deepEqual(fs.readdirSync(root),[name]);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('dangling source, destination and same-snapshot partial links refuse copying',{skip:process.platform!=='linux'},async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'website-dangling-'));const root=path.join(temp,'rollback'),archive=path.join(temp,'archive'),name='20261023000202';fs.mkdirSync(root);fs.mkdirSync(archive);
 try{
  let copied=false;const options={root,archive,copy:()=>{copied=true;},log:()=>{}};
  fs.symlinkSync(path.join(temp,'missing-source'),path.join(root,name),'dir');
  await assert.rejects(archiveSnapshot(name,options),/not a real snapshot/);
  fs.unlinkSync(path.join(root,name));fs.mkdirSync(path.join(root,name));fs.writeFileSync(path.join(root,name,'file'),'original');
  fs.symlinkSync(path.join(temp,'missing-destination'),path.join(archive,name),'dir');
  await assert.rejects(archiveSnapshot(name,options),/Existing archive destination/);
  assert.equal(fs.lstatSync(path.join(archive,name)).isSymbolicLink(),true);fs.unlinkSync(path.join(archive,name));
  const partial=`.copy-${name}-00000000-0000-0000-0000-000000000000`;
  fs.symlinkSync(path.join(temp,'missing-partial'),path.join(archive,partial),'dir');
  await assert.rejects(archiveSnapshot(name,options),/Interrupted archive copy/);
  assert.equal(copied,false);assert.deepEqual(fs.readdirSync(archive),[partial]);assert.equal(fs.readFileSync(path.join(root,name,'file'),'utf8'),'original');
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('source changes during copy preserve original; deletion failure retains duplicate',{skip:process.platform!=='linux'},async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'website-interrupt-'));const root=path.join(temp,'rollback'),archive=path.join(temp,'archive');fs.mkdirSync(root);fs.mkdirSync(archive);
 try{
  const changed='20261023000300';fs.mkdirSync(path.join(root,changed));fs.writeFileSync(path.join(root,changed,'file'),'before');
  await assert.rejects(archiveSnapshot(changed,{root,archive,copy:(src,dest)=>{fs.cpSync(src,dest,{recursive:true,preserveTimestamps:true});fs.writeFileSync(path.join(src,'file'),'changed');},flush:()=>{},log:()=>{}}),/changed or archive verification/);
  assert.equal(fs.readFileSync(path.join(root,changed,'file'),'utf8'),'changed');
  const interrupted='20261023000301';fs.mkdirSync(path.join(root,interrupted));fs.writeFileSync(path.join(root,interrupted,'file'),'retained');
  await assert.rejects(archiveSnapshot(interrupted,{root,archive,remove:()=>{throw Error('simulated duplicate removal refusal');},log:()=>{}}),/simulated/);
  assert.equal(fs.readFileSync(path.join(root,interrupted,'file'),'utf8'),'retained');
  assert.equal(fs.readFileSync(path.join(archive,interrupted,'file'),'utf8'),'retained');
  assert.equal(fs.readdirSync(root).filter(n=>n.startsWith('.archiving-')).length,1);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
