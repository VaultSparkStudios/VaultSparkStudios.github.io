#!/usr/bin/env node
/**
 * Live verifier for the five real-provider-e2e journey legs that
 * `api/identity-migration-receipt.json` demands before production promotion:
 *
 *   signedInCallback · compatibilitySession · roleMatrix.member ·
 *   roleMatrix.investor · revocation
 *
 * Why this exists
 * ---------------
 * These fields sat `unverified` in `context/IDENTITY_MIGRATION_EVIDENCE.json`
 * because nothing could produce them: a real sign-in needs a human passkey
 * ceremony, and the revocation leg needed a provider route Obelisk had not
 * shipped (D-S302.5). This script is the only supported writer of the
 * `providerJourney` fields, and — like its siblings `verify-supabase-runtime.mjs`
 * and `verify-obelisk-edge-deployment.mjs` — it writes exclusively from facts it
 * observed live. There is no flag that asserts success without observing it.
 *
 * How --live works
 * ----------------
 * A headed Chromium opens `/login` on the target origin. The FOUNDER completes
 * the Obelisk ceremony (passkey/authenticator — the script never sees or wants
 * the credential). A second same-origin tab polls `/api/auth/me`; once the edge
 * session exists the script observes every leg itself over the network:
 *
 *   signedInCallback     /api/auth/me → identity.provider === 'obelisk' with a
 *                        subject + linked Supabase UUID (the callback, ES256
 *                        verification, and UUID bridge all sit upstream of it)
 *   compatibilitySession /api/auth/session → Supabase compat tokens whose JWT
 *                        `sub` equals the linked UUID
 *   roleMatrix.member    authenticated own-row REST read on `vault_members`
 *                        accepted (HTTP 200) with the compat token
 *   roleMatrix.investor  `investor_updates` read with the same token must match
 *                        the service-role truth about approval: a non-approved
 *                        identity sees ZERO rows (fail-closed), an approved one
 *                        sees rows. Observed ≠ expected fails the leg.
 *   revocation           POST /api/auth/logout → providerLogout.attempted,
 *                        nothing failed, refresh grant revoked at the provider
 *                        (requires Obelisk W240 live), then /api/auth/me is
 *                        anonymous again.
 *
 * Privacy: the evidence file and the receipt it feeds are PUBLIC. Only leg
 * statuses, booleans, and 12-hex digests are ever written — never a subject,
 * email, UUID, or token. A guard refuses to write otherwise.
 *
 * Usage:
 *   node scripts/verify-provider-journey.mjs --self-test
 *   node scripts/verify-provider-journey.mjs --live [--origin=https://vaultsparkstudios.com]
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EVIDENCE_PATH = path.join(ROOT, 'context', 'IDENTITY_MIGRATION_EVIDENCE.json');
const SUPABASE_URL = 'https://fjnpzjjyhnpmunfoycrp.supabase.co';
const SIGNIN_TIMEOUT_MS = 10 * 60 * 1000;
const POLL_MS = 2500;

/* ------------------------------------------------------------------ *
 * Pure derivation — no network, no filesystem. All of this is self-tested.
 * ------------------------------------------------------------------ */

const digest = (value) => crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 12);

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const EMAIL_RE = /[^\s@"]+@[^\s@"]+\.[^\s@"]+/;
const JWT_RE = /eyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]+/;

/** True when serialized text carries no identifier-shaped content. */
export function isPrivacySafe(text) {
  const s = String(text);
  return !UUID_RE.test(s) && !EMAIL_RE.test(s) && !JWT_RE.test(s);
}

export function decodeJwtSub(token) {
  try {
    const payload = JSON.parse(Buffer.from(String(token).split('.')[1], 'base64url').toString('utf8'));
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * Derive the five journey legs from raw observations. A missing observation is
 * 'unverified', never 'passed' — absence of evidence stays absence.
 */
export function deriveJourney(obs, { now = () => new Date().toISOString() } = {}) {
  const leg = (ok) => (ok === true ? 'passed' : ok === false ? 'failed' : 'unverified');

  const me = obs.me || null;
  const callbackOk = me
    ? me.ok === true
      && me.identity?.provider === 'obelisk'
      && typeof me.identity?.sub === 'string' && me.identity.sub.length > 0
      && typeof me.identity?.supabaseUserId === 'string' && me.identity.supabaseUserId.length > 0
    : null;

  const session = obs.session || null;
  const compatOk = session
    ? session.ok === true
      && typeof session.supabase?.access_token === 'string'
      && typeof session.supabase?.user?.id === 'string'
      && decodeJwtSub(session.supabase.access_token) === session.supabase.user.id
      && (me ? session.supabase.user.id === me.identity?.supabaseUserId : true)
    : null;

  const memberOk = obs.memberProbe ? obs.memberProbe.status === 200 : null;

  const investor = obs.investorProbe || null;
  const investorOk = investor && typeof investor.expectedAllow === 'boolean'
    ? investor.observedAllow === investor.expectedAllow
    : null;

  const logout = obs.logout || null;
  const meAfter = obs.meAfterLogout || null;
  const revocationOk = logout && meAfter
    ? logout.ok === true
      && logout.providerLogout?.attempted === true
      && (logout.providerLogout?.failed || ['sentinel']).length === 0
      && (logout.providerLogout?.revoked || []).includes('refresh_token')
      && logout.providerLogout?.reason !== 'not_implemented'
      && meAfter.identity === null
    : null;

  return {
    signedInCallback: leg(callbackOk),
    compatibilitySession: leg(compatOk),
    roleMatrix: { member: leg(memberOk), investor: leg(investorOk) },
    revocation: leg(revocationOk),
    verifiedBy: 'scripts/verify-provider-journey.mjs',
    verifiedAt: now(),
    subjectDigest: me?.identity?.sub ? digest(me.identity.sub) : null,
  };
}

export function journeyPassed(journey) {
  return journey.signedInCallback === 'passed'
    && journey.compatibilitySession === 'passed'
    && journey.roleMatrix?.member === 'passed'
    && journey.roleMatrix?.investor === 'passed'
    && journey.revocation === 'passed';
}

/* ------------------------------------------------------------------ *
 * Live journey (--live)
 * ------------------------------------------------------------------ */

async function serviceRoleKey() {
  try {
    const { getSecret } = await import('./lib/secrets.mjs');
    try {
      const key = await getSecret('SUPABASE_SERVICE_ROLE_KEY', 'supabase.admin');
      if (key) return key;
    } catch { /* gateway has no service-role capability */ }
  } catch { /* gateway unavailable */ }
  return null;
}

async function expectedInvestorAllow(userId) {
  const key = await serviceRoleKey();
  if (!key) return { expectedAllow: null, source: 'service-role-unavailable' };
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/investor_requests?select=id&user_id=eq.${encodeURIComponent(userId)}&status=eq.approved&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!res.ok) return { expectedAllow: null, source: `truth-read-http-${res.status}` };
  const rows = await res.json();
  return { expectedAllow: Array.isArray(rows) && rows.length > 0, source: 'service-role' };
}

async function runLive({ origin }) {
  const { chromium } = await import('@playwright/test');
  console.log(`\nverify-provider-journey --live against ${origin}`);
  console.log('A browser window will open. Complete the Obelisk sign-in there;');
  console.log('the verifier observes every leg itself and writes the evidence.\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const founderPage = await context.newPage();
  const probePage = await context.newPage();
  await probePage.goto(`${origin}/`, { waitUntil: 'load' });
  await founderPage.bringToFront();
  await founderPage.goto(`${origin}/login?intent=signin&return=/vault-member/`, { waitUntil: 'load' });

  const fetchJson = (page, url, init = null) =>
    page.evaluate(async ([u, i]) => {
      const r = await fetch(u, { credentials: 'same-origin', ...(i || {}) });
      let body = null;
      try { body = await r.json(); } catch { body = null; }
      return { status: r.status, body };
    }, [url, init]);

  const obs = {};
  const deadline = Date.now() + SIGNIN_TIMEOUT_MS;
  process.stdout.write('waiting for the founder sign-in ');
  for (;;) {
    if (Date.now() > deadline) {
      await browser.close();
      throw new Error('sign-in was not completed within the window — nothing was written');
    }
    const me = await fetchJson(probePage, '/api/auth/me');
    if (me.body?.identity) { obs.me = me.body; break; }
    process.stdout.write('.');
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  console.log(' ✓ signed in');

  const session = await fetchJson(probePage, '/api/auth/session');
  obs.session = session.body;
  const compatToken = session.body?.supabase?.access_token || '';
  const userId = session.body?.supabase?.user?.id || '';

  const anonKeyMatch = fs.readFileSync(path.join(ROOT, 'assets', 'supabase-client.js'), 'utf8')
    .match(/SUPABASE_ANON_KEY\s*=\s*'([^']+)'/);
  const anonKey = anonKeyMatch ? anonKeyMatch[1] : '';
  const rest = (table, query, bearer) => fetchJson(probePage, `${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${bearer}` },
  });

  const member = await rest('vault_members', `select=user_id&user_id=eq.${encodeURIComponent(userId)}&limit=1`, compatToken);
  obs.memberProbe = { status: member.status };
  console.log(`member-plane read: HTTP ${member.status}`);

  const investorObserved = await rest('investor_updates', 'select=id&limit=1', compatToken);
  const observedAllow = investorObserved.status === 200 && Array.isArray(investorObserved.body) && investorObserved.body.length > 0;
  const truth = await expectedInvestorAllow(userId);
  obs.investorProbe = { observedAllow, expectedAllow: truth.expectedAllow, source: truth.source };
  console.log(`investor surface: observed=${observedAllow ? 'allow' : 'deny'} expected=${truth.expectedAllow === null ? 'UNKNOWN' : truth.expectedAllow ? 'allow' : 'deny'} (${truth.source})`);

  console.log('signing out (this exercises live provider revocation)…');
  const logout = await fetchJson(probePage, '/api/auth/logout', { method: 'POST' });
  obs.logout = logout.body;
  obs.meAfterLogout = (await fetchJson(probePage, '/api/auth/me')).body;
  console.log(`providerLogout: attempted=${logout.body?.providerLogout?.attempted} revoked=[${(logout.body?.providerLogout?.revoked || []).join(',')}] failed=[${(logout.body?.providerLogout?.failed || []).join(',')}] reason=${logout.body?.providerLogout?.reason ?? '—'}`);

  await browser.close();

  const journey = deriveJourney(obs);
  const serialized = JSON.stringify(journey);
  if (!isPrivacySafe(serialized)) {
    throw new Error('derived journey carries identifier-shaped content — refusing to write');
  }

  const evidence = JSON.parse(fs.readFileSync(EVIDENCE_PATH, 'utf8'));
  evidence.providerJourney = journey;
  evidence.updatedAt = new Date().toISOString();
  fs.writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');

  // Re-read after the write, then rebuild the receipt from the file on disk —
  // the receipt is the consumer that must agree, not this process's memory.
  const reread = JSON.parse(fs.readFileSync(EVIDENCE_PATH, 'utf8'));
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build-identity-migration-receipt.mjs')], { stdio: 'inherit' });
  const receipt = JSON.parse(fs.readFileSync(path.join(ROOT, 'api', 'identity-migration-receipt.json'), 'utf8'));

  console.log(`\nproviderJourney: ${JSON.stringify(reread.providerJourney, null, 2)}`);
  console.log(`receipt state: ${receipt.state} · blockers: [${receipt.blockers.join(', ') || 'none'}]`);
  if (!journeyPassed(reread.providerJourney)) {
    process.exitCode = 1;
    console.error('\n✗ journey did NOT fully pass — evidence written honestly, promotion stays held');
  } else {
    console.log('\n✓ all five journey legs passed and are recorded');
  }
}

/* ------------------------------------------------------------------ *
 * Self-test (hermetic)
 * ------------------------------------------------------------------ */

function selfTest() {
  const goodObs = {
    me: { ok: true, identity: { provider: 'obelisk', sub: 'obk_9f2', email: 'f@x.com', supabaseUserId: '2b0f8c1d-1111-4222-8333-a4b5c6d7e8f9' } },
    session: {
      ok: true,
      supabase: {
        access_token: `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: '2b0f8c1d-1111-4222-8333-a4b5c6d7e8f9' })).toString('base64url')}.sig-aaaaaaaa`,
        user: { id: '2b0f8c1d-1111-4222-8333-a4b5c6d7e8f9' },
      },
    },
    memberProbe: { status: 200 },
    investorProbe: { observedAllow: false, expectedAllow: false, source: 'service-role' },
    logout: { ok: true, providerLogout: { attempted: true, revoked: ['refresh_token', 'access_token'], failed: [], reason: undefined } },
    meAfterLogout: { ok: true, identity: null },
  };

  const cases = [];
  const journey = deriveJourney(goodObs, { now: () => 't' });
  cases.push([journeyPassed(journey), 'complete good observations pass all five legs']);
  cases.push([isPrivacySafe(JSON.stringify(journey)), 'derived journey leaks no email/UUID/JWT even when observations carry all three']);
  cases.push([journey.subjectDigest === digest('obk_9f2'), 'subject is digested, never raw']);

  for (const missing of ['me', 'session', 'memberProbe', 'investorProbe', 'logout']) {
    const j = deriveJourney({ ...goodObs, [missing]: null });
    cases.push([!journeyPassed(j), `missing ${missing} observation can never pass`]);
    cases.push([JSON.stringify(j).includes('unverified'), `missing ${missing} reads unverified, not failed`]);
  }

  const mismatchedSub = structuredClone(goodObs);
  mismatchedSub.session.supabase.user.id = 'ffffffff-2222-4222-8333-a4b5c6d7e8f9';
  cases.push([deriveJourney(mismatchedSub).compatibilitySession === 'failed', 'compat JWT sub must equal the session user id']);

  const investorLeak = structuredClone(goodObs);
  investorLeak.investorProbe = { observedAllow: true, expectedAllow: false, source: 'service-role' };
  cases.push([deriveJourney(investorLeak).roleMatrix.investor === 'failed', 'investor allow against a deny-truth fails the leg']);

  const investorUnknown = structuredClone(goodObs);
  investorUnknown.investorProbe = { observedAllow: false, expectedAllow: null, source: 'service-role-unavailable' };
  cases.push([deriveJourney(investorUnknown).roleMatrix.investor === 'unverified', 'unknown approval truth is unverified, never passed']);

  const notImplemented = structuredClone(goodObs);
  notImplemented.logout.providerLogout = { attempted: false, revoked: [], failed: [], reason: 'not_implemented' };
  cases.push([deriveJourney(notImplemented).revocation === 'failed', 'provider without a revocation route fails the leg (D-S302.5)']);

  const revokeFailed = structuredClone(goodObs);
  revokeFailed.logout.providerLogout = { attempted: true, revoked: ['access_token'], failed: ['refresh_token'], reason: undefined };
  cases.push([deriveJourney(revokeFailed).revocation === 'failed', 'a failed refresh-token revocation fails the leg']);

  const sessionSurvived = structuredClone(goodObs);
  sessionSurvived.meAfterLogout = { ok: true, identity: { provider: 'obelisk', sub: 'x', supabaseUserId: 'y' } };
  cases.push([deriveJourney(sessionSurvived).revocation === 'failed', 'an edge session that survives logout fails the leg']);

  cases.push([decodeJwtSub('garbage') === null, 'jwt decoding never throws on garbage']);
  cases.push([!isPrivacySafe('user f@x.com signed in'), 'privacy guard catches emails']);
  cases.push([!isPrivacySafe('id 2b0f8c1d-1111-4222-8333-a4b5c6d7e8f9'), 'privacy guard catches UUIDs']);

  let failed = 0;
  for (const [ok, label] of cases) {
    if (!ok) { failed += 1; console.error(`✗ ${label}`); }
  }
  console.log(`verify-provider-journey self-test: ${cases.length - failed}/${cases.length} passed`);
  if (failed) process.exit(1);
}

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, fallback) => args.find((a) => a.startsWith(`${name}=`))?.split('=').slice(1).join('=') || fallback;

if (flag('--self-test')) {
  selfTest();
} else if (flag('--live')) {
  runLive({ origin: opt('--origin', 'https://vaultsparkstudios.com') }).catch((error) => {
    console.error(`\n✗ ${error.message}`);
    process.exit(1);
  });
} else {
  console.error('Usage: --self-test | --live [--origin=https://…]');
  process.exitCode = 2;
}
