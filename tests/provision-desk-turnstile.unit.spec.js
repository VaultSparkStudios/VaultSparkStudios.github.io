import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseOptions, resolveTarget, provision, productionGate, cloudflareRequest } from '../scripts/provision-desk-turnstile.mjs';

const config = fs.readFileSync(new URL('../cloudflare/wrangler.toml', import.meta.url), 'utf8');
const source = fs.readFileSync(new URL('../assets/turnstile.js', import.meta.url), 'utf8');
const account = '2d737158a4dde61a7a476a9fda51af2f';
function fixture(overrides = {}) {
  const calls = [];
  let applied = false;
  const deps = {
    config, source,
    secret: (name) => ({
      CLOUDFLARE_ACCOUNT_ID: account,
      CLOUDFLARE_API_TOKEN: 'fixture-deploy',
      CLOUDFLARE_STUDIO_TOKEN: 'fixture-studio',
    })[name],
    gate: async () => calls.push({ gate: true }),
    request: async (url, token, init = {}) => {
      calls.push({ url, token, ...init });
      if (url.endsWith('/settings')) return { bindings: [
        { name: 'PUBLIC_ORIGIN', type: 'plain_text', text: url.includes('-staging/') ? 'https://website.staging.vaultsparkstudios.com' : 'https://vaultsparkstudios.com' },
        ...(applied ? [{ name: 'TURNSTILE_SECRET_KEY', type: 'secret_text' }] : []),
      ] };
      if (url.includes('/challenges/widgets/')) return {
        sitekey: '0x4AAAAAACwZy-GkGqvHhc-u', domains: ['vaultsparkstudios.com'], secret: 'fixture-widget-secret',
      };
      if (url.endsWith('/secrets') && init.method === 'PUT') { applied = true; return {}; }
      throw new Error('Unexpected request');
    },
    ...overrides,
  };
  return { calls, deps };
}

test('explicit bounded environment is required for apply', () => {
  assert.deepEqual(parseOptions([]), { env: 'production', apply: false });
  assert.deepEqual(parseOptions(['--apply', '--env=staging']), { env: 'staging', apply: true });
  for (const args of [['--apply'], ['--env=elsewhere'], ['--worker=x'], ['--env=staging', '--env=production']]) {
    assert.throws(() => parseOptions(args));
  }
});

test('real repository source pins account, worker and site key', () => {
  for (const env of ['staging', 'production']) {
    const target = resolveTarget(config, source, env, account);
    assert.equal(target.worker, 'vaultspark-security-headers-' + env);
    assert.equal(target.sitekey, '0x4AAAAAACwZy-GkGqvHhc-u');
  }
  assert.throws(() => resolveTarget(config, source, 'staging', 'other-account'));
  assert.throws(() => resolveTarget(config.replace('[env.staging]', '[env.staging]\nname = "sibling"'), source, 'staging', account));
  assert.throws(() => resolveTarget(config, 'var SITE_KEY = "placeholder";', 'staging', account));
});

test('default read-only returns no secret and cannot PUT', async () => {
  const { calls, deps } = fixture();
  const result = await provision(parseOptions(['--env=staging']), deps);
  assert.equal(result.presentAfter, false);
  assert.ok(calls.every(call => !call.method));
  assert.equal(JSON.stringify(result).includes('fixture-widget-secret'), false);
});

test('staging apply changes only the named secret and reads binding back', async () => {
  const { calls, deps } = fixture();
  const result = await provision({ env: 'staging', apply: true }, deps);
  const writes = calls.filter(call => call.method);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].method, 'PUT');
  assert.equal(writes[0].url, '/accounts/' + account + '/workers/scripts/vaultspark-security-headers-staging/secrets');
  assert.deepEqual(JSON.parse(writes[0].body), { name: 'TURNSTILE_SECRET_KEY', text: 'fixture-widget-secret', type: 'secret_text' });
  assert.equal(writes[0].token, 'fixture-deploy');
  assert.equal(result.presentAfter, true);
  assert.ok(!calls.some(call => call.gate));
});

test('production gate runs before PUT and refusal prevents mutation', async () => {
  const pass = fixture();
  await provision({ env: 'production', apply: true }, pass.deps);
  assert.ok(pass.calls.findIndex(call => call.gate) < pass.calls.findIndex(call => call.method === 'PUT'));
  const blocked = fixture({ gate: async () => { throw new Error('held'); } });
  await assert.rejects(provision({ env: 'production', apply: true }, blocked.deps), /held/);
  assert.ok(blocked.calls.every(call => !call.method));
  const runs = [];
  assert.throws(() => productionGate((...args) => { runs.push(args); return { status: 1 }; }));
  assert.equal(runs.length, 1);
});

test('studio authority fallback is restricted to exact widget read', async () => {
  const { calls, deps } = fixture();
  const original = deps.request;
  deps.request = async (url, token, init) => {
    if (url.includes('/challenges/widgets/') && token === 'fixture-deploy') {
      const error = new Error('denied'); error.permissionDenied = true; throw error;
    }
    return original(url, token, init);
  };
  await provision({ env: 'staging', apply: true }, deps);
  const broad = calls.filter(call => call.token === 'fixture-studio');
  assert.equal(broad.length, 1);
  assert.ok(broad[0].url.endsWith('/challenges/widgets/0x4AAAAAACwZy-GkGqvHhc-u'));
  assert.equal(broad[0].method, undefined);
});

test('wrong worker, widget or missing readback refuses', async () => {
  for (const kind of ['origin', 'sitekey', 'domain', 'readback']) {
    const { calls, deps } = fixture();
    const original = deps.request;
    deps.request = async (...args) => {
      const value = await original(...args);
      if (args[0].endsWith('/settings')) {
        if (kind === 'origin') value.bindings[0].text = 'https://sibling.example';
        if (kind === 'readback') value.bindings = value.bindings.filter(b => b.type !== 'secret_text');
      }
      if (args[0].includes('/challenges/widgets/')) {
        if (kind === 'sitekey') value.sitekey = 'wrong';
        if (kind === 'domain') value.domains = ['sibling.example'];
      }
      return value;
    };
    await assert.rejects(provision({ env: 'staging', apply: true }, deps));
    if (kind !== 'readback') assert.ok(calls.every(call => !call.method));
  }
});

test('API errors do not expose response or transport secret', async () => {
  await assert.rejects(cloudflareRequest('/test', 'fixture-token', {}, async () => ({
    ok: false, status: 403,
    json: async () => ({ success: false, errors: [{ code: 10000, message: 'fixture-sensitive' }] }),
  })), error => error.permissionDenied && !error.message.includes('fixture-sensitive'));
  await assert.rejects(cloudflareRequest('/test', 'fixture-token', {}, async () => {
    throw new Error('fixture-sensitive');
  }), error => !error.message.includes('fixture-sensitive'));
});
