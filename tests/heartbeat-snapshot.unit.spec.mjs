import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from '../scripts/lib/safe-spawn.mjs';
import {heartbeatSnapshot,checkHeartbeatSnapshot,heartbeatCheckTime} from '../scripts/generate-heartbeat.mjs';

const day=86400000, asOf=Date.parse('2026-10-23T17:49:13.000Z');
const registry=[{id:'website',name:'Website',vaultStatus:'sparked'}];
const events=[{slug:'website',ts:new Date(asOf-7*day+1000).toISOString()},
  {slug:'website',ts:new Date(asOf-30*day+1000).toISOString()}];

test('unchanged snapshots remain source-consistent across both rolling-window boundaries',()=>{
 const snapshot=heartbeatSnapshot(registry,events,asOf);
 assert.equal(snapshot.projects[0].pulses7d,1);assert.equal(snapshot.projects[0].pulses30d,2);
 assert.equal(heartbeatSnapshot(registry,events,asOf+2000).projects[0].pulses30d,1);
 assert.equal(heartbeatSnapshot(registry,events,asOf+2000).projects[0].pulses7d,0);
 assert.equal(checkHeartbeatSnapshot(snapshot,registry,events,asOf+2000),true);
});
test('changed sources and tampered counts fail snapshot consistency',()=>{
 const snapshot=heartbeatSnapshot(registry,events,asOf);
 assert.equal(checkHeartbeatSnapshot(snapshot,registry,events.slice(1),asOf+2000),false);
 assert.equal(checkHeartbeatSnapshot(snapshot,registry,[...events,{slug:'website',ts:new Date(asOf).toISOString()}],asOf+2000),false);
 const altered=structuredClone(snapshot);altered.projects[0].pulses7d++;
 assert.equal(checkHeartbeatSnapshot(altered,registry,events,asOf+2000),false);
});
test('missing malformed noncanonical and future snapshot times are rejected',()=>{
 for(const generatedAt of [undefined,'bad','2026-10-23','2026-10-23T17:49:13Z',new Date(asOf+1).toISOString()]){
  assert.throws(()=>heartbeatCheckTime({generatedAt},asOf));
 }
});
test('real check mode preserves the committed artifact bytes',()=>{
 const path=new URL('../api/heartbeat.json',import.meta.url),before=fs.readFileSync(path);
 execFileSync(process.execPath,['scripts/generate-heartbeat.mjs','--check'],{windowsHide:true,stdio:'pipe'});
 assert.deepEqual(fs.readFileSync(path),before);
});
