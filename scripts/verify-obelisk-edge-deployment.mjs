#!/usr/bin/env node
/**
 * Live verifier for the Obelisk relying-party edge deployment.
 *
 * Companion to `verify-supabase-runtime.mjs`. Same rule: the identity evidence
 * file is written only from facts re-read from the provider, never typed. This
 * one owns `environment` + `edgeDeployment`, which `build-identity-migration-
 * receipt.mjs` turns into the PUBLIC `bindings.worker` block.
 *
 * Why it re-checks claims a previous session already made
 * ------------------------------------------------------
 * S300 recorded that production `/login` redirects with PKCE and that a forged
 * callback grants no session. A recorded claim is a claim; this re-derives it
 * from the live edge every run, so the receipt cannot outlive the behaviour it
 * describes.
 *
 * Anonymous only. No credential is ever sent, the forged-callback probe uses a
 * random state that cannot correspond to any real flow, and no response body is
 * retained — only status, header shape, and the presence/absence of Set-Cookie.
 *
 * A Cloudflare bot challenge is NOT a failure. A challenged vantage cannot see
 * the origin, so the verdict is `challenged` → `unverified`, never `failed`:
 * an unreadable probe must not be able to say the edge is broken any more than
 * it may say the edge is healthy.
 *
 * Usage:
 *   node scripts/verify-obelisk-edge-deployment.mjs --self-test
 *   node scripts/verify-obelisk-edge-deployment.mjs --probe
 *   node scripts/verify-obelisk-edge-deployment.mjs --probe --write-evidence
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EVIDENCE_PATH = path.join(ROOT, 'context', 'IDENTITY_MIGRATION_EVIDENCE.json');
const WRANGLER_PATH = path.join(ROOT, 'cloudflare', 'wrangler.toml');
const PRODUCTION_ORIGIN = 'https://vaultsparkstudios.com';
const PRODUCTION_WORKER = 'vaultspark-security-headers-production';
const CF_ACCOUNT_ID = '2d737158a4dde61a7a476a9fda51af2f';
const ISSUER_HOST = 'obeliskgate.com';
const TIMEOUT_MS = 15_000;

/* ------------------------------------------------------------------ *
 * Pure derivation — self-tested, no network.
 * ------------------------------------------------------------------ */

/** A Cloudflare interstitial: a 403/503 HTML body where JSON or a 302 was due. */
export function isChallenged({ status, contentType }) {
  return (status === 403 || status === 503) && /text\/html/i.test(String(contentType || ''));
}

/**
 * The authorize redirect must carry a per-request PKCE challenge. Checking that
 * the parameters merely EXIST would pass a worker that pinned one constant
 * challenge forever, so callers pass two independent observations and the
 * per-request values are required to differ.
 */
export function classifyLoginRedirect(first, second) {
  const parse = (observation) => {
    if (!observation || observation.status !== 302 || !observation.location) return null;
    try { return new URL(observation.location); } catch { return null; }
  };
  const a = parse(first);
  const b = parse(second);
  if (!a || !b) return { ok: false, reason: 'login did not answer with a parseable 302' };

  const checks = [
    ['redirects-to-issuer', a.hostname === ISSUER_HOST],
    ['authorization-code-flow', a.searchParams.get('response_type') === 'code'],
    ['pkce-s256', a.searchParams.get('code_challenge_method') === 'S256'
      && (a.searchParams.get('code_challenge') || '').length >= 43],
    ['state-present', (a.searchParams.get('state') || '').length >= 16],
    ['nonce-present', (a.searchParams.get('nonce') || '').length >= 16],
    ['state-is-per-request', a.searchParams.get('state') !== b.searchParams.get('state')],
    ['nonce-is-per-request', a.searchParams.get('nonce') !== b.searchParams.get('nonce')],
    ['challenge-is-per-request', a.searchParams.get('code_challenge') !== b.searchParams.get('code_challenge')],
  ];
  const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
  return { ok: failed.length === 0, failed, checks: checks.map(([name, ok]) => ({ name, ok })) };
}

/**
 * A forged callback must be rejected without granting anything. The decisive
 * signal is the ABSENCE of a session cookie — a redirect carrying an error
 * parameter while also setting a session would still be a full compromise.
 */
export function classifyForgedCallback(observation) {
  if (!observation) return { ok: false, failed: ['no observation'] };
  const setCookies = observation.setCookies || [];
  const grantsSession = setCookies.some((value) => /vs_portal_session=[^;\s]/.test(value));
  const location = String(observation.location || '');
  const checks = [
    ['no-session-granted', !grantsSession],
    ['rejected', observation.status === 302 ? /auth_error=/.test(location) : observation.status >= 400],
  ];
  const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
  return { ok: failed.length === 0, failed, checks: checks.map(([name, ok]) => ({ name, ok })) };
}

/** Ambient identity is a public projection: anonymous is a successful null. */
export function classifyAmbientIdentity(observation) {
  const ok = observation?.status === 200 && observation?.json?.ok === true && observation?.json?.identity === null;
  return { ok, failed: ok ? [] : ['ambient-identity-not-anonymous-null'] };
}

export function classifyEdge({ login, forged, ambient, challenged }) {
  if (challenged) {
    return { state: 'challenged', anonymousHealth: 'unverified', checks: [], reason: 'vantage received a Cloudflare interstitial' };
  }
  const groups = [
    ['login-pkce', login],
    ['forged-callback-rejected', forged],
    ['ambient-identity-anonymous', ambient],
  ];
  const checks = groups.map(([name, result]) => ({ name, ok: Boolean(result?.ok), failed: result?.failed || [] }));
  const ok = checks.every((c) => c.ok);
  return { state: ok ? 'verified' : 'failed', anonymousHealth: ok ? 'passed' : 'failed', checks };
}

/**
 * Resolve `OBELISK_REDIRECT_URI` for ONE named environment. The receipt used to
 * take the first match anywhere in wrangler.toml, which is `[env.staging]`'s —
 * so a production receipt advertised a staging callback host. Production defines
 * no OBELISK_* vars at all and inherits the worker's DEFAULTS, so an absent
 * override is a legitimate answer that the caller resolves, not an error here.
 */
export function redirectUriForEnvironment(wranglerSource, environment) {
  const section = new RegExp(`\\[env\\.${environment}\\.vars\\]([\\s\\S]*?)(?=\\n\\[|$)`);
  const match = String(wranglerSource || '').match(section);
  if (!match) return null;
  const uri = match[1].match(/OBELISK_REDIRECT_URI\s*=\s*"([^"]+)"/);
  return uri ? uri[1] : null;
}

export function mergeEdgeEvidence(evidence, facts) {
  const next = JSON.parse(JSON.stringify(evidence || {}));
  next.environment = facts.environment;
  next.edgeDeployment = {
    workerName: facts.workerName,
    versionId: facts.versionId,
    sourceCommit: facts.sourceCommit,
    anonymousHealth: facts.anonymousHealth,
    deployedAt: facts.deployedAt,
    verifiedBy: 'scripts/verify-obelisk-edge-deployment.mjs',
    verifiedAt: facts.observedAt,
    evidence: { origin: facts.origin, state: facts.state, checks: facts.checks },
  };
  next.updatedAt = facts.observedAt;
  return next;
}

/* ------------------------------------------------------------------ *
 * Live probes.
 * ------------------------------------------------------------------ */

async function observe(url, { redirect = 'manual', json = false } = {}) {
  try {
    const response = await fetch(url, {
      redirect,
      headers: { Accept: json ? 'application/json' : 'text/html', 'User-Agent': 'vaultspark-identity-verifier' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const contentType = response.headers.get('content-type');
    const observation = {
      status: response.status,
      contentType,
      location: response.headers.get('location'),
      setCookies: typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [],
    };
    if (json && /application\/json/i.test(String(contentType || ''))) {
      observation.json = await response.json().catch(() => null);
    } else {
      await response.body?.cancel().catch(() => {});
    }
    return observation;
  } catch (error) {
    return { status: 0, error: error.name === 'TimeoutError' ? 'timeout' : 'unreachable' };
  }
}

async function productionWorkerDeployment() {
  const { getSecret } = await import('./lib/secrets.mjs');
  const token = await getSecret('CLOUDFLARE_API_TOKEN', 'cloudflare.deploy');
  if (!token) return { versionId: null, deployedAt: null, reason: 'CLOUDFLARE_API_TOKEN absent from the gateway' };
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/workers/scripts/${PRODUCTION_WORKER}/deployments`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) },
  );
  if (!response.ok) return { versionId: null, deployedAt: null, reason: `cloudflare ${response.status}` };
  const body = await response.json();
  const deployment = body?.result?.deployments?.[0];
  const active = (deployment?.versions || []).find((v) => Number(v.percentage) === 100) || deployment?.versions?.[0];
  return { versionId: active?.version_id || null, deployedAt: deployment?.created_on || null, reason: null };
}

function sourceCommit() {
  try {
    return fs.readFileSync(path.join(ROOT, '.git', 'HEAD'), 'utf8').trim().startsWith('ref:')
      ? fs.readFileSync(path.join(ROOT, '.git',
        fs.readFileSync(path.join(ROOT, '.git', 'HEAD'), 'utf8').trim().slice(5)), 'utf8').trim()
      : fs.readFileSync(path.join(ROOT, '.git', 'HEAD'), 'utf8').trim();
  } catch {
    return null;
  }
}

async function probe() {
  const loginA = await observe(`${PRODUCTION_ORIGIN}/login`);
  const loginB = await observe(`${PRODUCTION_ORIGIN}/login`);
  const forgedState = crypto.randomBytes(24).toString('base64url');
  const forged = await observe(`${PRODUCTION_ORIGIN}/auth/callback?code=forged-not-a-real-code&state=${forgedState}`);
  const ambient = await observe(`${PRODUCTION_ORIGIN}/api/auth/me`, { json: true });

  const challenged = [loginA, forged, ambient].some(isChallenged);
  const verdict = classifyEdge({
    login: classifyLoginRedirect(loginA, loginB),
    forged: classifyForgedCallback(forged),
    ambient: classifyAmbientIdentity(ambient),
    challenged,
  });
  return { verdict, detail: { login: classifyLoginRedirect(loginA, loginB), forged: classifyForgedCallback(forged), ambient: classifyAmbientIdentity(ambient) } };
}

/* ------------------------------------------------------------------ */

function selfTest() {
  const authorize = (state, nonce, challenge) =>
    `https://obeliskgate.com/auth/authorize?response_type=code&client_id=x&state=${state}&nonce=${nonce}&code_challenge=${challenge}&code_challenge_method=S256`;
  const long = (seed) => `${seed}`.padEnd(48, 'x');
  const okA = { status: 302, location: authorize(long('s1'), long('n1'), long('c1')) };
  const okB = { status: 302, location: authorize(long('s2'), long('n2'), long('c2')) };
  const pinnedB = { status: 302, location: authorize(long('s1'), long('n1'), long('c1')) };

  const cases = [
    ['a 403 HTML body is a challenge, not a verdict', isChallenged({ status: 403, contentType: 'text/html; charset=UTF-8' }) === true],
    ['a JSON 403 is a real rejection, not a challenge', isChallenged({ status: 403, contentType: 'application/json' }) === false],
    ['a healthy login redirect passes', classifyLoginRedirect(okA, okB).ok === true],
    ['a pinned PKCE challenge fails the per-request rule',
      classifyLoginRedirect(okA, pinnedB).failed.includes('challenge-is-per-request')],
    ['a redirect to a host other than the issuer fails',
      classifyLoginRedirect({ status: 302, location: 'https://evil.example/auth/authorize?response_type=code&code_challenge_method=S256' }, okB)
        .failed.includes('redirects-to-issuer')],
    ['plain PKCE is rejected — only S256 counts',
      classifyLoginRedirect({ status: 302, location: authorize(long('s1'), long('n1'), long('c1')).replace('S256', 'plain') }, okB)
        .failed.includes('pkce-s256')],
    ['a non-302 login is not a redirect at all', classifyLoginRedirect({ status: 200 }, okB).ok === false],
    ['a forged callback rejected without a cookie passes',
      classifyForgedCallback({ status: 302, location: '/vault-member/?auth_error=state_invalid', setCookies: [] }).ok === true],
    ['clearing the flow cookie is not granting a session',
      classifyForgedCallback({ status: 302, location: '/vault-member/?auth_error=state_invalid', setCookies: ['vs_obelisk_flow=; Max-Age=0'] }).ok === true],
    ['an error redirect that STILL sets a session is a failure',
      classifyForgedCallback({ status: 302, location: '/vault-member/?auth_error=state_invalid', setCookies: ['vs_portal_session=abc; HttpOnly'] })
        .failed.includes('no-session-granted')],
    ['a forged callback that is simply accepted fails',
      classifyForgedCallback({ status: 302, location: '/vault-member/', setCookies: [] }).failed.includes('rejected')],
    ['anonymous ambient identity is a successful null',
      classifyAmbientIdentity({ status: 200, json: { ok: true, identity: null } }).ok === true],
    ['ambient identity returning a subject to an anonymous caller fails',
      classifyAmbientIdentity({ status: 200, json: { ok: true, identity: { sub: 'leaked' } } }).ok === false],
    ['a challenged vantage reports unverified, never failed', (() => {
      const v = classifyEdge({ login: { ok: false }, forged: { ok: false }, ambient: { ok: false }, challenged: true });
      return v.state === 'challenged' && v.anonymousHealth === 'unverified';
    })()],
    ['an unchallenged failure is reported as failed',
      classifyEdge({ login: { ok: true }, forged: { ok: false, failed: ['no-session-granted'] }, ambient: { ok: true }, challenged: false })
        .anonymousHealth === 'failed'],
    ['all probes green is passed',
      classifyEdge({ login: { ok: true }, forged: { ok: true }, ambient: { ok: true }, challenged: false }).anonymousHealth === 'passed'],
    ['redirect URI resolves per environment, not first-match', (() => {
      const toml = '[env.production]\n[env.production.vars]\nPUBLIC_ORIGIN = "https://p.example"\n\n[env.staging]\n[env.staging.vars]\nOBELISK_REDIRECT_URI = "https://staging.example/auth/callback"\n';
      return redirectUriForEnvironment(toml, 'staging') === 'https://staging.example/auth/callback'
        && redirectUriForEnvironment(toml, 'production') === null;
    })()],
    ['an environment with no vars block resolves null, not a neighbour\'s value',
      redirectUriForEnvironment('[env.staging.vars]\nOBELISK_REDIRECT_URI = "https://s/auth/callback"\n', 'production') === null],
    ['edge evidence merge does not mutate its input', (() => {
      const before = { environment: 'staging' };
      mergeEdgeEvidence(before, { environment: 'production', observedAt: 'x', checks: [] });
      return before.environment === 'staging';
    })()],
  ];

  const failed = cases.filter(([, ok]) => !ok);
  cases.forEach(([label, ok]) => console.log(`  ${ok ? 'ok' : 'fail'} ${label}`));
  console.log(`verify-obelisk-edge-deployment self-test: ${cases.length - failed.length}/${cases.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

async function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has('--self-test')) return selfTest();

  const { verdict, detail } = await probe();
  const deployment = await productionWorkerDeployment();

  console.log('obelisk edge deployment');
  console.log(`  origin      ${PRODUCTION_ORIGIN}`);
  console.log(`  worker      ${PRODUCTION_WORKER} @ ${deployment.versionId || `unresolved (${deployment.reason})`}`);
  console.log(`  state       ${verdict.state} · anonymousHealth ${verdict.anonymousHealth}`);
  for (const check of verdict.checks) {
    console.log(`      · ${check.name}: ${check.ok ? 'ok' : `FAIL (${check.failed.join(', ')})`}`);
  }
  if (verdict.state === 'challenged') console.log(`      · ${verdict.reason}`);
  for (const [group, result] of Object.entries(detail)) {
    for (const check of result.checks || []) if (!check.ok) console.log(`      · ${group}/${check.name}: FAIL`);
  }

  const redirectOverride = redirectUriForEnvironment(fs.readFileSync(WRANGLER_PATH, 'utf8'), 'production');
  console.log(`  callback    ${redirectOverride || 'inherits worker DEFAULTS (no production override)'}`);

  if (args.has('--write-evidence')) {
    if (!deployment.versionId) {
      console.error('  refusing to write evidence: the production worker version could not be resolved');
      process.exit(1);
    }
    const evidence = JSON.parse(fs.readFileSync(EVIDENCE_PATH, 'utf8'));
    const next = mergeEdgeEvidence(evidence, {
      environment: 'production',
      workerName: PRODUCTION_WORKER,
      versionId: deployment.versionId,
      deployedAt: deployment.deployedAt,
      sourceCommit: sourceCommit(),
      anonymousHealth: verdict.anonymousHealth,
      state: verdict.state,
      checks: verdict.checks,
      origin: PRODUCTION_ORIGIN,
      observedAt: new Date().toISOString(),
    });
    fs.writeFileSync(EVIDENCE_PATH, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    console.log('  evidence written → context/IDENTITY_MIGRATION_EVIDENCE.json');
  }

  if (args.has('--require-verified') && verdict.state !== 'verified') process.exit(1);
}

main().catch((error) => {
  console.error(`verify-obelisk-edge-deployment: ${error.message}`);
  process.exit(1);
});
