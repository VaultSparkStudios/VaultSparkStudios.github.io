import test from 'node:test';
import assert from 'node:assert/strict';
import { PROJECT_REF, projectRef, parseOptions, assertProject, main } from '../scripts/deploy-desk-dispatch.mjs';

test('project target is pinned regardless of shared URL or caller input', () => {
  assert.equal(PROJECT_REF, 'fjnpzjjyhnpmunfoycrp');
  assert.equal(projectRef('https://sibling.supabase.co'), PROJECT_REF);
});

test('management visibility checks the pinned project and fails closed', async () => {
  let requested;
  assert.deepEqual(await assertProject(async (url) => {
    requested = url;
    return { ok: true, text: '[]' };
  }), []);
  assert.equal(requested, '/projects/fjnpzjjyhnpmunfoycrp/functions');
  for (const response of [
    { ok: false, status: 403, text: 'forbidden' },
    { ok: false, status: 404, text: 'missing' },
    { ok: true, text: 'not json' },
    { ok: true, text: '{}' },
  ]) await assert.rejects(assertProject(async () => response));
});

test('every mode refuses before deployment, secrets or verification when project is unauthorized', async () => {
  for (const mode of ['--secrets', '--deploy', '--verify', '--all']) {
    const calls = [];
    await assert.rejects(main([mode], {
      assertProject: () => { throw new Error('unauthorized project'); },
      setSecrets: () => calls.push('secrets'),
      deploy: () => calls.push('deploy'),
      verify: () => calls.push('verify'),
    }), /unauthorized project/);
    assert.deepEqual(calls, []);
  }
});

test('verify and all default to no send, including backwards-compatible no-live', async () => {
  for (const mode of ['--verify', '--all']) {
    for (const flags of [[], ['--no-live']]) {
      let options;
      const calls = [];
      await main([mode, ...flags], {
        assertProject: async () => calls.push('visibility'),
        setSecrets: async () => { calls.push('secrets'); return true; },
        deploy: async () => { calls.push('deploy'); return true; },
        settle: async () => calls.push('settle'),
        verify: async (value) => { calls.push('verify'); options = value; return true; },
      });
      assert.equal(options.liveEmail, null);
      assert.deepEqual(calls, mode === '--all'
        ? ['visibility', 'secrets', 'deploy', 'settle', 'verify']
        : ['visibility', 'verify']);
    }
  }
});

test('only an explicit valid recipient enables live verification', () => {
  assert.equal(parseOptions(['--verify', '--live-email=QA@Example.com']).liveEmail, 'qa@example.com');
  assert.equal(parseOptions(['--verify', '--live-email=qa+desk@example.com']).liveEmail, 'qa+desk@example.com');
  for (const value of ['', 'broken', 'a@localhost', 'a b@example.com', 'a@example.com\n', 'a@-example.com', 'a..b@example.com', 'a.@example.com']) {
    assert.throws(() => parseOptions(['--verify', '--live-email=' + value]));
  }
  for (const argv of [
    ['--verify', '--live-email=qa@example.com', '--no-live'],
    ['--verify', '--live-email=a@example.com', '--live-email=b@example.com'],
    ['--deploy', '--live-email=qa@example.com'],
    ['--verify', '--live-email'], ['--all', '--deploy'], [],
  ]) assert.throws(() => parseOptions(argv));
});

test('invalid arguments cannot reach any network operation', async () => {
  let called = false;
  await assert.rejects(main(['--all', '--live-email='], {
    assertProject: () => { called = true; },
  }));
  assert.equal(called, false);
});


test('provider evidence must be a new current confirmation, not a historical recipient match', async () => {
  const { currentConfirmation } = await import('../scripts/deploy-desk-dispatch.mjs');
  const at = Date.parse('2026-09-22T21:00:00.123Z');
  const row = { email: 'reader@example.com', messageId: 'new-message', templateId: 1, date: '2026-09-22T21:00:00Z' };
  assert.equal(currentConfirmation([row], row.email, at)?.messageId, 'new-message');
  assert.equal(currentConfirmation([row], row.email, at, ['new-message']), null);
  for (const change of [{ date: '2026-09-21T21:00:00Z' }, { date: 'bad-date' }, { templateId: 2 }, { email: 'other@example.com' }, { messageId: undefined }]) {
    assert.equal(currentConfirmation([{ ...row, ...change }], row.email, at), null);
  }
});
