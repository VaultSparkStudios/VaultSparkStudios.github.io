#!/usr/bin/env node
/**
 * verify-provider-chain.mjs — S321
 *
 * Machine-produced readiness receipt for the EXTERNAL half of the Obelisk identity
 * dependency: the provider routes that `verify-provider-journey.mjs` needs before a
 * real sign-in ceremony can even be attempted.
 *
 * Why this exists
 * ---------------
 * `real-provider-e2e-pending` held production promotion for roughly twenty sessions.
 * For most of that time the recorded reason was that the *provider* had not shipped
 * the routes: D-S302.5 recorded `/auth/revoke` as absent, and S319/S320 recorded
 * `/.well-known/openid-configuration` as answering 200 with HTML (its SPA catch-all
 * shadowing the discovery path), which is what made `authorization_endpoint`
 * undefined and crashed sign-in.
 *
 * Re-probed at the top of S321, every one of those premises had stopped being true.
 * Nothing in the repo noticed, because nothing was watching: the blocker text was
 * prose in `PROJECT_STATUS.json`, refreshed by hand, and a hand-refreshed claim about
 * someone else's service is exactly the claim that goes stale silently. A dependency
 * you are blocked on deserves a probe, not a sentence.
 *
 * What it does NOT do
 * -------------------
 * It writes nothing into `context/IDENTITY_MIGRATION_EVIDENCE.json`. The five
 * `providerJourney` legs have exactly one supported writer —
 * `scripts/verify-provider-journey.mjs` — which observes each leg over the network
 * during a real ceremony. That exclusivity is the reason the receipt can be trusted,
 * and this script deliberately does not weaken it. Provider routes being reachable is
 * necessary for the journey; it is not evidence that the journey passed.
 *
 * The remaining leg is a founder passkey ceremony. That is hardware-key enrollment —
 * one of the few categories CANON-019 genuinely reserves for a human — so it stays
 * founder-owned. What this receipt changes is its CLASSIFICATION: no longer "blocked
 * on another team", now "one founder ceremony away".
 *
 * Honesty rules (CANON-031)
 * -------------------------
 *   - A leg that cannot be probed is `unverified`, never `ok`. Network failure does
 *     not default green.
 *   - `chainReady` is true only when every leg was observed and passed.
 *   - Public-safe: only statuses, booleans, and endpoint paths are written. The
 *     `/login` probe necessarily generates a live `state`/`nonce`/`code_challenge`;
 *     none of them are recorded — only the boolean shape of the redirect.
 *
 * Usage:
 *   node scripts/verify-provider-chain.mjs --self-test
 *   node scripts/verify-provider-chain.mjs --live [--origin=https://vaultsparkstudios.com] [--write]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPT_PATH = path.join(ROOT, 'api', 'provider-chain-readiness.json');
const DEFAULT_ORIGIN = 'https://vaultsparkstudios.com';
const DEFAULT_ISSUER = 'https://obeliskgate.com';
const TIMEOUT_MS = 12_000;

/* ---------------------------------------------------------------------------
   Pure classifiers — every one is self-tested in both directions.
   --------------------------------------------------------------------------- */

const REQUIRED_DISCOVERY_FIELDS = [
  'issuer',
  'authorization_endpoint',
  'token_endpoint',
  'jwks_uri',
];

export function classifyDiscovery({ status, contentType, body }) {
  if (status !== 200) return { ok: false, state: 'failed', detail: `status ${status}` };
  /* The S319 outage shape precisely: 200, but HTML. Content-type alone is not
     enough — a catch-all can serve HTML as JSON — so the required fields decide. */
  if (!/json/i.test(contentType || '')) {
    return { ok: false, state: 'failed', detail: `non-JSON content-type: ${contentType || 'absent'}` };
  }
  let doc;
  try {
    doc = typeof body === 'string' ? JSON.parse(body) : body;
  } catch (_) {
    return { ok: false, state: 'failed', detail: 'body is not parseable JSON (SPA catch-all shape)' };
  }
  const missing = REQUIRED_DISCOVERY_FIELDS.filter((f) => !doc || typeof doc[f] !== 'string' || !doc[f]);
  if (missing.length) {
    return { ok: false, state: 'failed', detail: `missing: ${missing.join(', ')}` };
  }
  return {
    ok: true,
    state: 'passed',
    detail: 'complete OIDC discovery document',
    doc,
    hasRevocation: typeof doc.revocation_endpoint === 'string' && !!doc.revocation_endpoint,
    hasEndSession: typeof doc.end_session_endpoint === 'string' && !!doc.end_session_endpoint,
  };
}

export function classifyJwks({ status, body }) {
  if (status !== 200) return { ok: false, state: 'failed', detail: `status ${status}` };
  let doc;
  try {
    doc = typeof body === 'string' ? JSON.parse(body) : body;
  } catch (_) {
    return { ok: false, state: 'failed', detail: 'body is not parseable JSON' };
  }
  if (!Array.isArray(doc?.keys) || doc.keys.length === 0) {
    return { ok: false, state: 'failed', detail: 'no signing keys published' };
  }
  return { ok: true, state: 'passed', detail: `${doc.keys.length} signing key(s) published` };
}

export function classifyAuthorizeRedirect({ status, location, authorizationEndpoint }) {
  if (status !== 302) return { ok: false, state: 'failed', detail: `status ${status}, expected 302` };
  if (!location) return { ok: false, state: 'failed', detail: 'no Location header' };
  let target;
  try {
    target = new URL(location);
  } catch (_) {
    return { ok: false, state: 'failed', detail: 'Location is not a URL' };
  }
  let expected;
  try {
    expected = new URL(authorizationEndpoint);
  } catch (_) {
    return { ok: false, state: 'failed', detail: 'discovery gave no usable authorization_endpoint' };
  }
  if (target.origin !== expected.origin) {
    return { ok: false, state: 'failed', detail: `redirects to ${target.origin}, not the provider` };
  }
  /* Presence only. The values are live PKCE material and are never recorded. */
  const required = ['response_type', 'client_id', 'redirect_uri', 'state', 'nonce', 'code_challenge'];
  const missing = required.filter((p) => !target.searchParams.get(p));
  if (missing.length) {
    return { ok: false, state: 'failed', detail: `authorize URL missing: ${missing.join(', ')}` };
  }
  if (target.searchParams.get('code_challenge_method') !== 'S256') {
    return { ok: false, state: 'failed', detail: 'PKCE challenge method is not S256' };
  }
  return { ok: true, state: 'passed', detail: 'authorize redirect carries a complete S256 PKCE challenge' };
}

/* An unauthenticated probe MUST NOT be accepted. What distinguishes "implemented"
   from "absent" is whether the route answers as a revocation endpoint at all:
   RFC 7009 clients authenticate, so 400/401/403 means the route exists and rejected
   us — which is the correct, secure answer. 404/405 means it was never shipped
   (the D-S302.5 state). A 200 to an unauthenticated bogus token would be alarming,
   not reassuring, so it is treated as a failure. */
export function classifyRevocationRoute({ status }) {
  if (status === 404 || status === 405) {
    return { ok: false, state: 'failed', detail: `status ${status} — route not implemented` };
  }
  if (status === 200) {
    return { ok: false, state: 'failed', detail: 'accepted an unauthenticated revocation — investigate before trusting' };
  }
  if (status === 400 || status === 401 || status === 403) {
    return { ok: true, state: 'passed', detail: `status ${status} — implemented, correctly rejects an unauthenticated client` };
  }
  return { ok: false, state: 'unverified', detail: `unexpected status ${status}` };
}

export function deriveReceipt({ issuer, origin, legs, generatedAt }) {
  const order = ['discovery', 'jwks', 'authorizeRedirect', 'revocationRoute'];
  const chainReady = order.every((k) => legs[k]?.state === 'passed');
  const blocking = order.filter((k) => legs[k]?.state !== 'passed');
  return {
    schemaVersion: '1.0',
    generatedAt,
    generatedBy: 'scripts/verify-provider-chain.mjs',
    publicSafe: true,
    issuer,
    origin,
    chainReady,
    legs: Object.fromEntries(order.map((k) => [k, legs[k] || { ok: false, state: 'unverified', detail: 'not probed' }])),
    /* Stated even when the chain is ready, because a ready chain is NOT a passed
       journey — that distinction is the whole point of this file. */
    remaining: chainReady
      ? ['real-provider-e2e: one founder passkey ceremony (CANON-019 human-reserved); run scripts/verify-provider-journey.mjs --live']
      : blocking.map((k) => `provider leg not ready: ${k}`),
    note:
      'External provider readiness only. This receipt never writes providerJourney legs — '
      + 'scripts/verify-provider-journey.mjs is their sole writer and observes each leg during a '
      + 'real ceremony. Provider routes being reachable is necessary for the journey, not evidence '
      + 'that it passed. Legs that could not be probed are recorded unverified, never ok.',
  };
}

/* ---------------------------------------------------------------------------
   Live probing
   --------------------------------------------------------------------------- */

async function probe(url, init = {}) {
  try {
    const res = await fetch(url, {
      redirect: 'manual',
      ...init,
      headers: { 'user-agent': 'vaultspark-provider-chain-probe', ...(init.headers || {}) },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return {
      status: res.status,
      contentType: res.headers.get('content-type'),
      location: res.headers.get('location'),
      body: await res.text().catch(() => ''),
    };
  } catch (e) {
    return { status: 0, error: String(e?.message || e).slice(0, 140) };
  }
}

function unverified(detail) {
  return { ok: false, state: 'unverified', detail };
}

async function runLive({ issuer, origin }) {
  const legs = {};

  const disc = await probe(`${issuer}/.well-known/openid-configuration`);
  legs.discovery = disc.status === 0
    ? unverified(`unreachable: ${disc.error}`)
    : classifyDiscovery(disc);
  const doc = legs.discovery.doc;
  delete legs.discovery.doc; // never published

  if (!doc) {
    legs.jwks = unverified('discovery did not yield a jwks_uri');
    legs.authorizeRedirect = unverified('discovery did not yield an authorization_endpoint');
    legs.revocationRoute = unverified('discovery did not yield a revocation_endpoint');
    return legs;
  }

  const jwks = await probe(doc.jwks_uri);
  legs.jwks = jwks.status === 0 ? unverified(`unreachable: ${jwks.error}`) : classifyJwks(jwks);

  const login = await probe(`${origin}/login?intent=signin`);
  legs.authorizeRedirect = login.status === 0
    ? unverified(`unreachable: ${login.error}`)
    : classifyAuthorizeRedirect({ ...login, authorizationEndpoint: doc.authorization_endpoint });

  if (!doc.revocation_endpoint) {
    legs.revocationRoute = { ok: false, state: 'failed', detail: 'discovery advertises no revocation_endpoint' };
  } else {
    const rev = await probe(doc.revocation_endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'token=provider_chain_probe_invalid_token',
    });
    legs.revocationRoute = rev.status === 0
      ? unverified(`unreachable: ${rev.error}`)
      : classifyRevocationRoute(rev);
  }

  return legs;
}

/* ---------------------------------------------------------------------------
   Self-test — both directions on every classifier.
   --------------------------------------------------------------------------- */

function selfTest() {
  const goodDoc = {
    issuer: DEFAULT_ISSUER,
    authorization_endpoint: `${DEFAULT_ISSUER}/auth/authorize`,
    token_endpoint: `${DEFAULT_ISSUER}/auth/token`,
    jwks_uri: `${DEFAULT_ISSUER}/.well-known/jwks.json`,
    revocation_endpoint: `${DEFAULT_ISSUER}/auth/revoke`,
  };
  const authorizeUrl = `${DEFAULT_ISSUER}/auth/authorize?response_type=code&client_id=c&redirect_uri=r`
    + '&state=s&nonce=n&code_challenge=cc&code_challenge_method=S256';

  const cases = [
    // discovery — the exact S319 production shape must fail
    ['discovery: 200 with HTML (the SPA catch-all that crashed sign-in) FAILS',
      classifyDiscovery({ status: 200, contentType: 'text/html', body: '<!doctype html>' }).ok === false],
    ['discovery: JSON content-type but unparseable body FAILS',
      classifyDiscovery({ status: 200, contentType: 'application/json', body: '<!doctype html>' }).ok === false],
    ['discovery: JSON missing authorization_endpoint FAILS',
      classifyDiscovery({ status: 200, contentType: 'application/json', body: JSON.stringify({ issuer: 'x', token_endpoint: 't', jwks_uri: 'j' }) }).ok === false],
    ['discovery: a complete document PASSES',
      classifyDiscovery({ status: 200, contentType: 'application/json', body: JSON.stringify(goodDoc) }).ok === true],
    ['discovery: a non-200 FAILS',
      classifyDiscovery({ status: 503, contentType: 'application/json', body: '{}' }).ok === false],

    // jwks
    ['jwks: an empty key set FAILS',
      classifyJwks({ status: 200, body: JSON.stringify({ keys: [] }) }).ok === false],
    ['jwks: published keys PASS',
      classifyJwks({ status: 200, body: JSON.stringify({ keys: [{ kid: 'a' }] }) }).ok === true],

    // authorize redirect
    ['authorize: a 200 instead of a redirect FAILS',
      classifyAuthorizeRedirect({ status: 200, location: null, authorizationEndpoint: goodDoc.authorization_endpoint }).ok === false],
    ['authorize: a redirect to the wrong origin FAILS',
      classifyAuthorizeRedirect({ status: 302, location: 'https://evil.test/authorize?response_type=code&client_id=c&redirect_uri=r&state=s&nonce=n&code_challenge=cc&code_challenge_method=S256', authorizationEndpoint: goodDoc.authorization_endpoint }).ok === false],
    ['authorize: a redirect missing PKCE FAILS',
      classifyAuthorizeRedirect({ status: 302, location: `${DEFAULT_ISSUER}/auth/authorize?response_type=code&client_id=c&redirect_uri=r&state=s&nonce=n`, authorizationEndpoint: goodDoc.authorization_endpoint }).ok === false],
    ['authorize: plain (non-S256) PKCE FAILS',
      classifyAuthorizeRedirect({ status: 302, location: authorizeUrl.replace('S256', 'plain'), authorizationEndpoint: goodDoc.authorization_endpoint }).ok === false],
    ['authorize: a complete S256 challenge PASSES',
      classifyAuthorizeRedirect({ status: 302, location: authorizeUrl, authorizationEndpoint: goodDoc.authorization_endpoint }).ok === true],

    // revocation route — "implemented" is proven by a correct REJECTION
    ['revocation: 404 (the D-S302.5 absent state) FAILS',
      classifyRevocationRoute({ status: 404 }).ok === false],
    ['revocation: 405 FAILS',
      classifyRevocationRoute({ status: 405 }).ok === false],
    ['revocation: 401 invalid_client PASSES — implemented and correctly rejecting',
      classifyRevocationRoute({ status: 401 }).ok === true],
    ['revocation: accepting an unauthenticated bogus token FAILS rather than reassures',
      classifyRevocationRoute({ status: 200 }).ok === false],

    // receipt derivation
    ['receipt: all legs passed → chainReady',
      deriveReceipt({
        issuer: DEFAULT_ISSUER, origin: DEFAULT_ORIGIN, generatedAt: 'now',
        legs: {
          discovery: { state: 'passed' }, jwks: { state: 'passed' },
          authorizeRedirect: { state: 'passed' }, revocationRoute: { state: 'passed' },
        },
      }).chainReady === true],
    ['receipt: an UNVERIFIED leg never counts as ready (no default-green)',
      deriveReceipt({
        issuer: DEFAULT_ISSUER, origin: DEFAULT_ORIGIN, generatedAt: 'now',
        legs: {
          discovery: { state: 'passed' }, jwks: { state: 'passed' },
          authorizeRedirect: { state: 'passed' }, revocationRoute: { state: 'unverified' },
        },
      }).chainReady === false],
    ['receipt: a ready chain still states the ceremony remains — ready is not passed',
      deriveReceipt({
        issuer: DEFAULT_ISSUER, origin: DEFAULT_ORIGIN, generatedAt: 'now',
        legs: {
          discovery: { state: 'passed' }, jwks: { state: 'passed' },
          authorizeRedirect: { state: 'passed' }, revocationRoute: { state: 'passed' },
        },
      }).remaining.some((r) => /founder passkey ceremony/.test(r))],
    ['receipt: a missing leg is recorded unverified rather than dropped',
      deriveReceipt({ issuer: DEFAULT_ISSUER, origin: DEFAULT_ORIGIN, generatedAt: 'now', legs: {} })
        .legs.discovery.state === 'unverified'],
  ];

  let failed = 0;
  for (const [name, passed] of cases) {
    console.log(`${passed ? '  ✓' : '  ✗'} ${name}`);
    if (!passed) failed += 1;
  }
  console.log(failed === 0
    ? `verify-provider-chain self-test ✓  ${cases.length}/${cases.length} passing`
    : `verify-provider-chain self-test ✗  ${failed}/${cases.length} failing`);
  return failed === 0 ? 0 : 1;
}

/* --------------------------------------------------------------------------- */

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--self-test')) return selfTest();
  if (!argv.includes('--live')) {
    console.error('Usage: --self-test | --live [--origin=https://…] [--write]');
    return 2;
  }
  const origin = (argv.find((a) => a.startsWith('--origin=')) || `--origin=${DEFAULT_ORIGIN}`).split('=').slice(1).join('=');
  const issuer = (argv.find((a) => a.startsWith('--issuer=')) || `--issuer=${DEFAULT_ISSUER}`).split('=').slice(1).join('=');

  const legs = await runLive({ issuer, origin });
  const receipt = deriveReceipt({ issuer, origin, legs, generatedAt: new Date().toISOString() });

  for (const [name, leg] of Object.entries(receipt.legs)) {
    const mark = leg.state === 'passed' ? '✓' : leg.state === 'unverified' ? '?' : '✗';
    console.log(`  ${mark} ${name.padEnd(18)} ${leg.detail}`);
  }
  console.log(receipt.chainReady
    ? '✓ provider chain READY — remaining: ' + receipt.remaining[0]
    : '⛔ provider chain NOT ready');

  if (argv.includes('--write')) {
    fs.writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`);
    console.log(`  → ${path.relative(ROOT, RECEIPT_PATH)}`);
  }
  return receipt.chainReady ? 0 : 1;
}

main().then((code) => process.exit(code));
