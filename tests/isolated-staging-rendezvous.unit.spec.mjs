import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {runWorkflowRendezvous, CONTEXT_FILE} from '../scripts/run-isolated-staging-rendezvous.mjs';
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const env = {GITHUB_EVENT_NAME: 'workflow_dispatch', PRODUCTION_CONFIRM: 'true', GITHUB_SHA: 'b'.repeat(40), INSTALLATION_DEPLOYMENT_ID: '123', INSTALLATION_PAYLOAD_SHA256: 'a'.repeat(64)};
const context = Buffer.from(JSON.stringify({schemaVersion:1,sourceCommit:env.GITHUB_SHA,transport:{installationId:123,installationHash:'a'.repeat(64),requestId:456,requestHash:'c'.repeat(64),observationId:789,observationHash:'d'.repeat(64),runId:11,runAttempt:2}}));
function fixture({request = {requestDeploymentId: 456, requestPayloadSha256: 'c'.repeat(64)}, result = {file: CONTEXT_FILE, sha256: sha(context)}, bytes = context} = {}) {
  const calls = [], logs = [];
  return {calls, logs, deps: {invoke: async args => {calls.push(args); return JSON.stringify(calls.length === 1 ? request : result);},
    readContext: async file => {assert.equal(file, CONTEXT_FILE); return bytes;}, log: value => logs.push(value)}};
}
test('legacy input never starts a metadata operation', async () => {
  const f = fixture(); assert.deepEqual(await runWorkflowRendezvous({}, f.deps), {configured: false}); assert.equal(f.calls.length, 0);
});
test('actual request/receive sequence binds fixed source, parent, returned request and readback', async () => {
  const f = fixture(), result = await runWorkflowRendezvous(env, f.deps);
  assert.deepEqual(result, {configured: true, contextFile: CONTEXT_FILE, contextSha256: sha(context)});
  assert.equal(f.calls.length, 2); assert.equal(f.calls[0][0], '--request'); assert.equal(f.calls[1][0], '--receive');
  for (const call of f.calls) {assert.ok(call.includes('--source-commit=' + env.GITHUB_SHA)); assert.ok(call.includes('--installation-deployment-id=123'));}
  assert.ok(f.calls[1].includes('--request-deployment-id=456')); assert.ok(f.calls[1].includes('--output=' + CONTEXT_FILE));
  assert.deepEqual(f.logs, [{requestDeploymentId: 456, requestPayloadSha256: 'c'.repeat(64)}]);
});
test('invalid first response cannot start receive or expose ready outputs', async () => {
  for (const request of [{requestDeploymentId: '456', requestPayloadSha256: 'c'.repeat(64)}, {requestDeploymentId: 456, requestPayloadSha256: 'bad'}]) {
    const f = fixture({request}); await assert.rejects(runWorkflowRendezvous(env, f.deps)); assert.equal(f.calls.length, 1);
  }
  const f = fixture(); f.deps.invoke = async () => 'not-json'; await assert.rejects(runWorkflowRendezvous(env, f.deps));
});
test('context cannot redirect output, change bytes, or bind another source', async () => {
  for (const result of [{file: '/tmp/other.json', sha256: sha(context)}, {file: CONTEXT_FILE, sha256: 'f'.repeat(64)}]) {
    await assert.rejects(runWorkflowRendezvous(env, fixture({result}).deps));
  }
  const other = Buffer.from(JSON.stringify({sourceCommit: 'd'.repeat(40)}));
  await assert.rejects(runWorkflowRendezvous(env, fixture({bytes: other, result: {file: CONTEXT_FILE, sha256: sha(other)}}).deps));
});
test('unconfirmed or injected inputs fail before any child operation', async () => {
  for (const change of [{PRODUCTION_CONFIRM: 'false'}, {GITHUB_SHA: 'bad'}, {INSTALLATION_DEPLOYMENT_ID: '1;echo bad'}, {CONFIRM_CONTENT: 'true'}]) {
    const f = fixture(); await assert.rejects(runWorkflowRendezvous({...env, ...change}, f.deps)); assert.equal(f.calls.length, 0);
  }
});
test('child errors stop the protocol without a manufactured context', async () => {
  const f = fixture(); f.deps.invoke = async () => {throw Error('child failure');};
  await assert.rejects(runWorkflowRendezvous(env, f.deps)); assert.equal(f.logs.length, 0);
});
test('Pages Worker pair forwards exactly to REQUEST, with receiver bound to returned request and original INSTALL',async()=>{
 const f=fixture(),e={...env,GITHUB_ACTIONS:'true',GITHUB_RUN_ID:'11',GITHUB_RUN_ATTEMPT:'2',WORKER_UPLOAD_DEPLOYMENT_ID:'987',WORKER_UPLOAD_PAYLOAD_SHA256:'e'.repeat(64)};
 await runWorkflowRendezvous(e,f.deps);
 assert(f.calls[0].includes('--worker-upload-deployment-id=987'));assert(f.calls[0].includes('--worker-upload-payload-sha256='+'e'.repeat(64)));
 assert.equal(f.calls[1].some(a=>a.startsWith('--worker-upload-')),false);
});
test('malformed/partial Worker inputs never start a child operation',async()=>{
 for(const fields of[{WORKER_UPLOAD_DEPLOYMENT_ID:'987'},{WORKER_UPLOAD_PAYLOAD_SHA256:'e'.repeat(64)},{WORKER_UPLOAD_DEPLOYMENT_ID:'',WORKER_UPLOAD_PAYLOAD_SHA256:'e'.repeat(64)},
  {WORKER_UPLOAD_DEPLOYMENT_ID:'9;echo bad',WORKER_UPLOAD_PAYLOAD_SHA256:'e'.repeat(64)},{WORKER_UPLOAD_DEPLOYMENT_ID:'987',WORKER_UPLOAD_PAYLOAD_SHA256:'E'.repeat(64)}]){
   const f=fixture();await assert.rejects(runWorkflowRendezvous({...env,...fields},f.deps));assert.equal(f.calls.length,0);
 }
});
test('unexpected response fields and another parent/run in context refuse',async()=>{
 const x=JSON.parse(context);for(const mutate of[v=>v.transport.installationId=999,v=>v.transport.requestHash='e'.repeat(64),v=>v.transport.runAttempt=3,v=>v.schemaVersion=2]){
  const v=structuredClone(x);mutate(v);const b=Buffer.from(JSON.stringify(v)),f=fixture({bytes:b,result:{file:CONTEXT_FILE,sha256:sha(b)}});
  await assert.rejects(runWorkflowRendezvous({...env,GITHUB_ACTIONS:'true',GITHUB_RUN_ID:'11',GITHUB_RUN_ATTEMPT:'2'},f.deps));
 }
 await assert.rejects(runWorkflowRendezvous(env,fixture({request:{requestDeploymentId:456,requestPayloadSha256:'c'.repeat(64),passed:true}}).deps));
 await assert.rejects(runWorkflowRendezvous(env,fixture({result:{file:CONTEXT_FILE,sha256:sha(context),passed:true}}).deps));
});
