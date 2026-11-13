import test from 'node:test';
import assert from 'node:assert/strict';
import {validateIsolatedStagingWorkflowInputs as validate} from '../scripts/validate-isolated-staging-workflow-inputs.mjs';
import {spawnSync} from '../scripts/lib/safe-spawn.mjs';

const good = {event: 'workflow_dispatch', confirmProduction: 'true', installationId: '123456789', installationHash: 'a'.repeat(64)};
test('legacy dispatch, push and content paths without isolated inputs retain their existing gate', () => {
  for (const event of ['push', 'schedule', 'workflow_dispatch']) {
    for (const confirmProduction of ['', 'false', 'true']) assert.deepEqual(validate({event, confirmProduction, confirmContent: 'true'}), {configured: false});
  }
});
test('only a complete confirmed full-promotion reference enables isolated evidence', () => {
  assert.deepEqual(validate(good), {configured: true});
  for (const key of ['installationId', 'installationHash']) assert.throws(() => validate({...good, [key]: ''}));
  for (const event of ['push', 'schedule', 'pull_request', '', undefined]) assert.throws(() => validate({...good, event}));
  for (const confirmProduction of ['false', '', true, false, undefined]) assert.throws(() => validate({...good, confirmProduction}));
});
test('untrusted deployment references refuse shell text, rounding, whitespace and incomplete hashes', () => {
  for (const installationId of ['0', '01', '-1', '1e2', '9007199254740992', '123\n456', '12;echo bad', '$(echo bad)', 123]) {
    assert.throws(() => validate({...good, installationId}));
  }
  for (const installationHash of ['A'.repeat(64), 'a'.repeat(63), 'a'.repeat(64)+'\n', 'a'.repeat(64)+';echo bad', 123]) {
    assert.throws(() => validate({...good, installationHash}));
  }
});
test('isolated evidence cannot be combined with content, hotfix, or Desk lanes', () => {
  for (const key of ['confirmContent', 'confirmHotfix', 'confirmDesk']) {
    for (const value of ['true', true, 'unexpected']) assert.throws(() => validate({...good, [key]: value}));
    for (const value of ['', 'false', undefined]) assert.deepEqual(validate({...good, [key]: value}), {configured: true});
  }
  assert.throws(() => validate({...good, arbitraryObserver: 'unreviewed'}));
});
test('actual CLI refuses invalid references without echoing payload and remains inert by default', () => {
  const args = ['scripts/validate-isolated-staging-workflow-inputs.mjs'];
  const env = {...process.env, GITHUB_EVENT_NAME: 'workflow_dispatch', PRODUCTION_CONFIRM: 'true', INSTALLATION_DEPLOYMENT_ID: '123;INVALID_MARKER', INSTALLATION_PAYLOAD_SHA256: 'a'.repeat(64)};
  const bad = spawnSync(process.execPath, [...args, '--emit-github-output'], {encoding: 'utf8', env});
  assert.equal(bad.status, 2); assert.equal(bad.stdout, ''); assert.ok(!bad.stderr.includes('INVALID_MARKER'));
  const inert = spawnSync(process.execPath, args, {encoding: 'utf8', env});
  assert.equal(inert.status, 0); assert.equal(JSON.parse(inert.stdout).executed, false);
  const valid = spawnSync(process.execPath, [...args, '--emit-github-output'], {encoding: 'utf8', env: {...env, INSTALLATION_DEPLOYMENT_ID: '123'}});
  assert.equal(valid.status, 0); assert.equal(valid.stdout.trim(), 'configured=true');
});
