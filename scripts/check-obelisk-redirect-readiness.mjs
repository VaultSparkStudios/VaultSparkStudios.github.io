#!/usr/bin/env node
/**
 * Public, privacy-safe relying-party redirect readiness probe.
 *
 * Registration remains Obelisk-owned. This project only proves that its exact
 * callback is accepted while altered tenant/client combinations stay rejected.
 * Response bodies are classified in memory and never written.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'api', 'obelisk-redirect-readiness.json');
const ISSUER = String(process.env.OBELISK_ISSUER || 'https://obeliskgate.com').replace(/\/$/, '');
const CLIENT_ID = process.env.OBELISK_CLIENT_ID || 'vaultsparkstudios-website';
const CALLBACK = process.env.OBELISK_REDIRECT_URI || 'https://website.staging.vaultsparkstudios.com/auth/callback';
const TIMEOUT_MS = 15_000;

const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');

export function authorizeUrl(endpoint, { clientId = CLIENT_ID, callback = CALLBACK } = {}) {
  const target = new URL(endpoint);
  const seed = sha256(`${clientId}|${callback}`).slice(0, 43);
  target.searchParams.set('response_type', 'code');
  target.searchParams.set('client_id', clientId);
  target.searchParams.set('redirect_uri', callback);
  target.searchParams.set('scope', 'openid email profile offline_access');
  target.searchParams.set('state', `readiness-${seed.slice(0, 16)}`);
  target.searchParams.set('nonce', `readiness-${seed.slice(16, 32)}`);
  target.searchParams.set('code_challenge', seed.padEnd(43, 'x'));
  target.searchParams.set('code_challenge_method', 'S256');
  target.searchParams.set('login_hint', 'signin');
  return target;
}

function boundedReason(payload) {
  const value = String(
    payload?.code || payload?.error_description || payload?.error || payload?.reason || ''
  ).toLowerCase();
  if (/tenant-boundary|redirect.*not.registered|redirect_uri/.test(value)) return 'redirect-not-registered';
  if (/unknown.*client|invalid.*client/.test(value)) return 'client-not-registered';
  if (/invalid_request/.test(value)) return 'invalid-request';
  return value ? 'provider-rejected' : 'http-rejected';
}

export function classifyAuthorization({ status, contentType = '', body = '', location = '' }) {
  if ((status >= 200 && status < 300) || (status >= 300 && status < 400 && location)) {
    return { state: 'passed', reason: 'authorization-surface-reached', status };
  }
  if ([401, 403, 429].includes(status) && /text\/html/i.test(contentType)) {
    return { state: 'unverified', reason: 'vantage-challenge', status };
  }
  if (status >= 400 && status < 500) {
    let payload = {};
    if (/json/i.test(contentType)) {
      try { payload = JSON.parse(String(body).slice(0, 4096)); } catch {}
    }
    return { state: 'rejected', reason: boundedReason(payload), status };
  }
  return { state: 'unverified', reason: status >= 500 ? 'provider-unavailable' : 'unexpected-response', status };
}

async function discovery(fetchImpl) {
  const response = await fetchImpl(`${ISSUER}/.well-known/openid-configuration`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`discovery-http-${response.status}`);
  const json = await response.json();
  if (!json.authorization_endpoint) throw new Error('discovery-authorization-endpoint-missing');
  return json.authorization_endpoint;
}

async function observe(endpoint, options, fetchImpl) {
  try {
    const response = await fetchImpl(authorizeUrl(endpoint, options), {
      redirect: 'manual',
      headers: { accept: 'text/html,application/json;q=0.9' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const contentType = response.headers.get('content-type') || '';
    const body = response.status >= 400 ? await response.text() : '';
    return classifyAuthorization({
      status: response.status,
      contentType,
      body,
      location: response.headers.get('location') || '',
    });
  } catch {
    return { state: 'unverified', reason: 'network-error', status: null };
  }
}

export async function probe({ fetchImpl = fetch, observedAt = new Date().toISOString() } = {}) {
  let endpoint;
  try {
    endpoint = await discovery(fetchImpl);
  } catch (error) {
    return receipt({
      observedAt,
      exact: { state: 'unverified', reason: String(error.message || error).slice(0, 80), status: null },
      negatives: [],
    });
  }
  const altered = new URL(CALLBACK);
  altered.hostname = `invalid.${altered.hostname}`;
  const exact = await observe(endpoint, { clientId: CLIENT_ID, callback: CALLBACK }, fetchImpl);
  const negatives = [
    {
      id: 'altered-callback-host',
      ...await observe(endpoint, { clientId: CLIENT_ID, callback: altered.toString() }, fetchImpl),
    },
    {
      id: 'foreign-client',
      ...await observe(endpoint, { clientId: `${CLIENT_ID}-foreign`, callback: CALLBACK }, fetchImpl),
    },
  ];
  return receipt({ observedAt, exact, negatives });
}

function receipt({ observedAt, exact, negatives }) {
  const negativesPassed = negatives.length === 2 && negatives.every((item) => item.state === 'rejected');
  const state = exact.state === 'rejected'
    ? 'rejected'
    : (exact.state === 'passed' && negativesPassed ? 'passed' : 'unverified');
  return {
    schemaVersion: '1.0',
    generatedAt: observedAt,
    generatedBy: 'scripts/check-obelisk-redirect-readiness.mjs',
    publicSafe: true,
    state,
    issuer: ISSUER,
    clientId: CLIENT_ID,
    callback: CALLBACK,
    callbackSha256: sha256(CALLBACK),
    contractSha256: sha256(`${ISSUER}|${CLIENT_ID}|${CALLBACK}|tenant-negative-v1`),
    exact,
    negativeControls: negatives,
    ready: state === 'passed',
    note: state === 'passed'
      ? 'Exact staging redirect accepted; altered tenant/client controls rejected.'
      : (state === 'rejected'
        ? 'Exact staging redirect is not registered to this client.'
        : 'Provider readiness could not be verified from this vantage.'),
  };
}

export function validate(value) {
  const errors = [];
  if (!value || typeof value !== 'object') return ['receipt missing'];
  if (!['passed', 'rejected', 'unverified'].includes(value.state)) errors.push('unknown state');
  if (value.publicSafe !== true) errors.push('publicSafe must be true');
  if (!/^[a-f0-9]{64}$/.test(value.callbackSha256 || '')) errors.push('callback hash missing');
  if (!/^[a-f0-9]{64}$/.test(value.contractSha256 || '')) errors.push('contract hash missing');
  if (!value.exact || !Array.isArray(value.negativeControls)) errors.push('probe controls missing');
  if (JSON.stringify(value).toLowerCase().includes('responsebody')) errors.push('response body surface forbidden');
  if (value.ready !== (value.state === 'passed')) errors.push('ready/state disagreement');
  return errors;
}

function selfTest() {
  const accepted = classifyAuthorization({ status: 200, contentType: 'text/html' });
  const redirected = classifyAuthorization({ status: 302, location: 'https://obeliskgate.com/sign-in' });
  const rejected = classifyAuthorization({
    status: 400,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'invalid_request', code: 'tenant-boundary-redirect-origin-not-registered-to-client' }),
  });
  const challenged = classifyAuthorization({ status: 403, contentType: 'text/html', body: '<html>challenge</html>' });
  const good = receipt({
    observedAt: '2026-08-05T00:00:00.000Z',
    exact: accepted,
    negatives: [{ id: 'a', ...rejected }, { id: 'b', ...rejected }],
  });
  const bad = receipt({
    observedAt: '2026-08-05T00:00:00.000Z',
    exact: rejected,
    negatives: [{ id: 'a', ...rejected }, { id: 'b', ...rejected }],
  });
  const cases = [
    ['200 sign-in surface is accepted', accepted.state === 'passed'],
    ['302 sign-in redirect is accepted', redirected.state === 'passed'],
    ['tenant-boundary JSON is a real rejection', rejected.state === 'rejected' && rejected.reason === 'redirect-not-registered'],
    ['HTML 403 is unverified challenge', challenged.state === 'unverified'],
    ['exact+two negatives passes contract', good.state === 'passed' && good.ready],
    ['exact rejection fails contract', bad.state === 'rejected' && !bad.ready],
    ['receipt validates', validate(good).length === 0],
    ['authorize request enforces PKCE S256', authorizeUrl('https://example.test/auth').searchParams.get('code_challenge_method') === 'S256'],
    ['no response body is retained', !JSON.stringify(good).includes('tenant-boundary')],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
  console.log(`check-obelisk-redirect-readiness --self-test: ${cases.length - failed.length}/${cases.length}`);
  if (failed.length) process.exit(1);
}

async function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has('--self-test')) return selfTest();
  if (args.has('--check')) {
    let value;
    try { value = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch {}
    const errors = validate(value);
    if (errors.length) {
      console.error(`check-obelisk-redirect-readiness --check: ${errors.join('; ')}`);
      process.exit(1);
    }
    console.log(`check-obelisk-redirect-readiness --check: ${value.state} · exact=${value.exact.state} · negatives=${value.negativeControls.length}`);
    return;
  }
  const value = await probe();
  fs.writeFileSync(OUT, JSON.stringify(value, null, 2) + '\n');
  console.log(`check-obelisk-redirect-readiness: ${value.state} · exact=${value.exact.reason} · negatives=${value.negativeControls.map((item) => item.state).join('/') || 'unobserved'}`);
  if (args.has('--require-ready') && !value.ready) process.exit(1);
}

await main();
