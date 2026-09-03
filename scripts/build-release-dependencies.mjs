#!/usr/bin/env node
/** Build a public-safe, signature-aware release dependency handshake. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STUDIO_ROOT = resolve(ROOT, '..', 'vaultspark-studio-ops');
const CONFIG_PATH = join(ROOT, 'config', 'release-dependencies.json');
const OUT = join(ROOT, 'api', 'release-dependencies.json');
const PROBE_PATH = join(ROOT, '.cache', 'obelisk-registration-probe.json');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const stable = (value) => JSON.stringify(value, Object.keys(value).sort());


// ── S342: verify the SUBSTANCE, not just the conversation ────────────────────
//
// `deriveDependency` returns `missing` when it cannot find the request cargo.
// That tracks an Ark CONVERSATION, and a conversation can be lost while the
// thing it asked for is long since done. Observed live: cargo 01JV7U… (a May
// ULID) had aged out of the 168-hour Ark window, so this receipt published
// `obelisk-staging-registration: missing` and `state: rejected` on a PUBLIC
// trust surface — while the relying party sat `active` in the Obelisk registry
// with both callbacks registered, and the live authorize endpoint accepted them.
// A blocker sentence is a claim with an expiry; nothing here ever re-probed it.
//
// The four requestedChecks are all directly observable at the IdP, so observe
// them. Reading the sibling repo's RELYING_PARTIES.json would not do: it is
// absent on CI, and a file is a declaration where the authorize endpoint is
// behaviour.
//
// FAILS CLOSED. Only an `accepted`/`rejected` pair that matches the contract in
// BOTH directions upgrades anything. Unreachable stays unreachable and never
// upgrades a status — a probe that cannot see the provider must not vouch for it.
const AUTHORIZE_CONTROL_URI = 'https://cross-client-control.invalid/auth/callback';

// The authorize endpoint requires a syntactically valid PKCE challenge, but this
// probe never exchanges a code, so the value is inert. DERIVED rather than
// pasted: a hardcoded challenge is a 43-char high-entropy literal that the
// secret scanner flags as an AWS/Cloudflare token, and allowlisting it would
// teach the next reader to wave scanner hits through. This is the RFC 7636
// Appendix B example verifier — a published spec test vector, not a credential.
const PROBE_CODE_VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const PROBE_CODE_CHALLENGE = createHash('sha256').update(PROBE_CODE_VERIFIER).digest('base64url');

export function classifyProbe(observations) {
  const by = (name) => observations.find((o) => o.check === name);
  const accepted = (o) => o && o.status >= 300 && o.status < 400;
  const rejected = (o) => o && o.status >= 400 && o.status < 500;
  const checks = {
    'production-callback-retained': accepted(by('production-callback-retained')),
    'staging-callback-exact-match-accepted': accepted(by('staging-callback-exact-match-accepted')),
    // The control is the half that makes the other three mean something: if an
    // unregistered redirect were ALSO accepted, acceptance would prove nothing.
    'cross-client-redirect-denied': rejected(by('cross-client-redirect-denied')),
    'live-authorize-tenant-boundary-clear': accepted(by('production-callback-retained'))
      && /\/auth\?screen=signin/.test(by('production-callback-retained')?.location || ''),
  };
  const unreachable = observations.some((o) => o.status === 0);
  const verdict = unreachable ? 'unreachable'
    : (Object.values(checks).every(Boolean) ? 'verified' : 'refuted');
  return { verdict, checks };
}

async function observeAuthorize(issuer, clientId, redirectUri, check) {
  const url = `${issuer}/auth/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}`
    + `&scope=openid&state=probe&nonce=probe`
    + `&code_challenge=${PROBE_CODE_CHALLENGE}&code_challenge_method=S256`
    + `&redirect_uri=${encodeURIComponent(redirectUri)}`;
  try {
    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
    const observation = { check, status: res.status, location: res.headers.get('location') || '' };
    // Drain the body. An unconsumed response keeps undici's socket open, which
    // both delays exit and makes a process.exit() abort on a live handle.
    await res.body?.cancel().catch(() => {});
    return observation;
  } catch {
    // Never throw: an unreachable provider is an observation, not a crash.
    return { check, status: 0, location: '' };
  }
}

export async function probeRegistration({ issuer, clientId, productionCallback, stagingCallback }) {
  const observations = await Promise.all([
    observeAuthorize(issuer, clientId, productionCallback, 'production-callback-retained'),
    observeAuthorize(issuer, clientId, stagingCallback, 'staging-callback-exact-match-accepted'),
    observeAuthorize(issuer, clientId, AUTHORIZE_CONTROL_URI, 'cross-client-redirect-denied'),
  ]);
  const { verdict, checks } = classifyProbe(observations);
  return {
    schemaVersion: 1,
    probedAt: new Date().toISOString(),
    method: 'authorize-endpoint-observation',
    issuer,
    clientId,
    verdict,
    checks,
    // Statuses only — never a location body, code, state or nonce.
    observed: observations.map((o) => ({ check: o.check, status: o.status })),
  };
}

function readProbe() {
  try { return JSON.parse(readFileSync(PROBE_PATH, 'utf8')); } catch { return null; }
}

function linkedCargoId(cargo) {
  const payload = cargo?.payload || {};
  const ids = [payload.origCargoId, ...(payload.origCargoIds || []), payload.replyToCargoId, payload.requestCargoId];
  return ids.filter(Boolean);
}


// A live probe settles a dependency only when its verdict is `verified` AND it
// covers every requestedCheck the contract names. A probe that checks three of
// four proves three of four; the fourth is still unknown, and unknown is not done.
// A committed probe is a SNAPSHOT, and a snapshot vouches forever unless you
// give it a clock. A relying-party registration can be revoked upstream at any
// time, so an observation past this bound stops settling anything and the
// dependency falls honestly back to `missing` until it is re-probed.
export const PROBE_MAX_AGE_DAYS = 14;

export function probeAgeDays(probe, now = new Date()) {
  const t = Date.parse(probe?.probedAt || '');
  return Number.isFinite(t) ? (now.getTime() - t) / 86400000 : Infinity;
}

export function liveSettles(config, probe, now = new Date()) {
  if (!probe || probe.verdict !== 'verified') return false;
  if (probeAgeDays(probe, now) > PROBE_MAX_AGE_DAYS) return false;
  const covered = Object.entries(probe.checks || {}).filter(([, ok]) => ok).map(([name]) => name);
  return (config.requestedChecks || []).every((check) => covered.includes(check));
}

export function liveSummary(config, probe, now = new Date()) {
  const ageDays = probeAgeDays(probe, now);
  return {
    verdict: probe.verdict,
    ageDays: Number.isFinite(ageDays) ? Math.round(ageDays * 10) / 10 : null,
    maxAgeDays: PROBE_MAX_AGE_DAYS,
    stale: ageDays > PROBE_MAX_AGE_DAYS,
    method: probe.method,
    probedAt: probe.probedAt,
    issuer: probe.issuer,
    settles: liveSettles(config, probe),
    checks: probe.checks,
  };
}

export function deriveDependency({ config, cargo, receipts = [], replies = [], signatureState = 'unverified', now = new Date(), probe = null }) {
  const contractSha256 = sha256(JSON.stringify({
    id: config.id,
    cargoId: config.cargoId,
    ownerSlug: config.ownerSlug,
    requesterSlug: config.requesterSlug,
    type: config.type,
    requestedChecks: config.requestedChecks,
    expectedAcceptance: config.expectedAcceptance,
  }));
  if (!cargo) {
    // S342: the cargo is gone, which says nothing about whether the work is done.
    // A live probe that verifies EVERY requestedCheck is stronger evidence than
    // the message that requested them, so it settles the dependency — but only
    // when it covers all of them and only on a `verified` verdict.
    const live = liveSettles(config, probe);
    return {
      id: config.id,
      cargoId: config.cargoId,
      ownerSlug: config.ownerSlug,
      contractSha256,
      status: live ? 'completed' : 'missing',
      signatureState,
      requestedChecks: config.requestedChecks,
      ...(probe ? { liveVerification: liveSummary(config, probe) } : {}),
    };
  }
  const exact = cargo.id === config.cargoId
    && cargo.from === config.requesterSlug
    && cargo.to === config.ownerSlug
    && cargo.type === config.type
    && JSON.stringify(cargo.payload?.acceptance || []) === JSON.stringify(config.expectedAcceptance);
  const expiresAt = new Date(new Date(cargo.shippedAt).getTime() + Number(cargo.ttlHours || 0) * 3600_000).toISOString();
  const ack = receipts
    .filter((item) => item.from === config.ownerSlug && linkedCargoId(item).includes(config.cargoId))
    .sort((a, b) => String(a.shippedAt).localeCompare(String(b.shippedAt))).at(-1) || null;
  const completion = replies
    .filter((item) => item.from === config.ownerSlug && linkedCargoId(item).includes(config.cargoId))
    .sort((a, b) => String(a.shippedAt).localeCompare(String(b.shippedAt))).at(-1) || null;
  let status = 'sent';
  if (!exact || signatureState !== 'verified') status = 'invalid';
  else if (completion) status = 'completed';
  else if (now.getTime() > new Date(expiresAt).getTime()) status = 'expired';
  else if (ack) status = 'acknowledged';
  return {
    id: config.id,
    cargoId: config.cargoId,
    ownerSlug: config.ownerSlug,
    requesterSlug: config.requesterSlug,
    contractSha256,
    cargoSignatureSha256: /^[a-f0-9]{64}$/.test(cargo.sig || '') ? sha256(cargo.sig) : null,
    signatureState,
    status,
    requestedChecks: config.requestedChecks,
    sentAt: cargo.shippedAt,
    acknowledgedAt: ack?.shippedAt || null,
    completedAt: completion?.shippedAt || null,
    expiresAt,
    ttlHours: cargo.ttlHours,
  };
}

export function validateReceipt(receipt) {
  const errors = [];
  if (receipt?.schemaVersion !== 1 || receipt?.publicSafe !== true) errors.push('receipt envelope invalid');
  if (!['completed', 'pending', 'rejected'].includes(receipt?.state)) errors.push('unknown aggregate state');
  if (!Array.isArray(receipt?.dependencies) || receipt.dependencies.length === 0) errors.push('dependencies missing');
  for (const dep of receipt?.dependencies || []) {
    if (!/^[a-f0-9]{64}$/.test(dep.contractSha256 || '')) errors.push(`${dep.id}: contract hash missing`);
    if (!['missing', 'invalid', 'sent', 'acknowledged', 'expired', 'completed'].includes(dep.status)) errors.push(`${dep.id}: status invalid`);
    if (!Array.isArray(dep.requestedChecks) || dep.requestedChecks.length === 0) errors.push(`${dep.id}: checks missing`);
  }
  const allDone = receipt?.dependencies?.every((dep) => dep.status === 'completed');
  if ((receipt?.state === 'completed') !== Boolean(allDone)) errors.push('aggregate/dependency disagreement');
  if (/"payload"\s*:/.test(JSON.stringify(receipt))) errors.push('payload bodies are forbidden');
  return errors;
}

// S324: the --check exit code as a pure function, so the self-test can prove it
// fails in the exact direction the old branch never could (a well-formed
// `rejected` receipt). Returns 0 = pass · 1 = hold.
export function receiptCheckExit(receipt) {
  if (validateReceipt(receipt).length) return 1;
  return receipt.state === 'rejected' ? 1 : 0;
}

function selfTest() {
  const config = {
    id: 'dep', cargoId: '01TEST', ownerSlug: 'owner', requesterSlug: 'requester', type: 'repo-question',
    requestedChecks: ['one'], expectedAcceptance: ['one'],
  };
  const cargo = { id: '01TEST', from: 'requester', to: 'owner', type: 'repo-question', shippedAt: '2026-01-01T00:00:00.000Z', ttlHours: 72, payload: { acceptance: ['one'] }, sig: 'a'.repeat(64) };
  const sent = deriveDependency({ config, cargo, signatureState: 'verified', now: new Date('2026-01-02T00:00:00Z') });
  const ackCargo = { from: 'owner', shippedAt: '2026-01-02T01:00:00Z', payload: { origCargoIds: ['01TEST'] } };
  const ack = deriveDependency({ config, cargo, receipts: [ackCargo], signatureState: 'verified', now: new Date('2026-01-02T02:00:00Z') });
  const expired = deriveDependency({ config, cargo, signatureState: 'verified', now: new Date('2026-01-05T02:00:00Z') });
  const completed = deriveDependency({ config, cargo, replies: [{ ...ackCargo, payload: { replyToCargoId: '01TEST' } }], signatureState: 'verified', now: new Date('2026-01-02T02:00:00Z') });
  const invalid = deriveDependency({ config, cargo: { ...cargo, to: 'other' }, signatureState: 'verified', now: new Date('2026-01-02T00:00:00Z') });
  const cases = [
    ['sent', sent.status === 'sent'], ['acknowledged', ack.status === 'acknowledged'],
    ['expired', expired.status === 'expired'], ['completed', completed.status === 'completed'],
    ['mismatch rejected', invalid.status === 'invalid'], ['payload excluded', !JSON.stringify(sent).includes('payload')],
  ];

  // S324 · --check exit-code contract, both directions. The pre-S324 branch
  // returned 0 for every one of these, including the rejected one.
  const envelope = (state, status) => ({
    schemaVersion: 1, publicSafe: true, state,
    dependencies: [{ id: 'dep', contractSha256: 'a'.repeat(64), status, requestedChecks: ['one'] }],
  });
  cases.push(['check holds on a well-formed rejected receipt', receiptCheckExit(envelope('rejected', 'missing')) === 1]);
  cases.push(['check holds on an expired dependency', receiptCheckExit(envelope('rejected', 'expired')) === 1]);
  cases.push(['check passes a completed receipt', receiptCheckExit(envelope('completed', 'completed')) === 0]);
  cases.push(['check passes an in-flight pending receipt', receiptCheckExit(envelope('pending', 'sent')) === 0]);
  cases.push(['check holds on a malformed receipt', receiptCheckExit({ schemaVersion: 1, publicSafe: true, state: 'pending', dependencies: [] }) === 1]);
  // ── S342 live-probe settlement, proven in BOTH directions ─────────────────
  const fourChecks = ['production-callback-retained', 'staging-callback-exact-match-accepted',
    'cross-client-redirect-denied', 'live-authorize-tenant-boundary-clear'];
  const cfg4 = { ...config, requestedChecks: fourChecks };
  const obs = (prod, staging, control, loc = '/auth?screen=signin') => ([
    { check: 'production-callback-retained', status: prod, location: loc },
    { check: 'staging-callback-exact-match-accepted', status: staging, location: '' },
    { check: 'cross-client-redirect-denied', status: control, location: '' },
  ]);
  const verified = classifyProbe(obs(302, 302, 400));
  const fresh = { ...verified, probedAt: new Date().toISOString(), method: 'm', issuer: 'i' };
  const old15 = { ...verified, probedAt: new Date(Date.now() - 15 * 86400000).toISOString(), method: 'm', issuer: 'i' };
  const staleStaging = classifyProbe(obs(302, 400, 400));
  const openRedirect = classifyProbe(obs(302, 302, 302));
  const offline = classifyProbe(obs(0, 0, 0));
  const tenantErr = classifyProbe(obs(302, 302, 400, '/auth/error?e=tenant_boundary'));
  cases.push(['probe verified when prod+staging accepted and control denied', verified.verdict === 'verified']);
  cases.push(['probe refuted when the staging callback is rejected', staleStaging.verdict === 'refuted']);
  cases.push(['probe refuted when an UNREGISTERED redirect is also accepted', openRedirect.verdict === 'refuted']);
  cases.push(['probe unreachable when the provider cannot be reached', offline.verdict === 'unreachable']);
  cases.push(['probe refuted when authorize returns a tenant-boundary error', tenantErr.verdict === 'refuted']);

  const withProbe = (probe) => deriveDependency({ config: cfg4, cargo: null, signatureState: 'unverified', probe });
  cases.push(['missing cargo + verified probe settles the dependency', withProbe(fresh).status === 'completed']);
  cases.push(['missing cargo + NO probe stays missing', withProbe(null).status === 'missing']);
  cases.push(['missing cargo + unreachable probe stays missing', withProbe({ ...offline, probedAt: 'x', method: 'm', issuer: 'i' }).status === 'missing']);
  cases.push(['missing cargo + refuted probe stays missing', withProbe({ ...staleStaging, probedAt: 'x', method: 'm', issuer: 'i' }).status === 'missing']);
  // Coverage, not just verdict: a probe that verifies fewer checks than the
  // contract names must NOT settle it.
  cases.push(['a fresh verified probe settles', liveSettles(cfg4, fresh)]);
  cases.push(['a 15-day-old verified probe does NOT settle (past the 14d bound)', !liveSettles(cfg4, old15)]);
  cases.push(['a probe with no timestamp does NOT settle', !liveSettles(cfg4, { ...verified, method: 'm', issuer: 'i' })]);
  cases.push(['staleness is disclosed on the receipt', liveSummary(cfg4, old15).stale === true]);
  const partial = { verdict: 'verified', checks: { 'production-callback-retained': true }, probedAt: new Date().toISOString(), method: 'm', issuer: 'i' };
  cases.push(['a verified probe that covers only SOME requestedChecks does not settle', !liveSettles(cfg4, partial)]);
  cases.push(['live verification is disclosed on the receipt', !!withProbe(fresh).liveVerification]);
  cases.push(['probe record carries no location bodies', !JSON.stringify(withProbe(fresh)).includes('screen=signin')]);

  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
  console.log(`build-release-dependencies --self-test: ${cases.length - failed.length}/${cases.length}`);
  process.exit(failed.length ? 1 : 0);
}

export async function buildReleaseDependencies() {
  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  let cargo = [];
  let posture = { ok: false, activeFailures: [], disposed: [], retired: [] };
  try {
    const ark = await import(pathToFileURL(join(STUDIO_ROOT, 'scripts', 'lib', 'ark.mjs')).href);
    cargo = ark.listCargo({ sinceHours: 168, studioOpsRoot: STUDIO_ROOT });
    posture = ark.inspectCargoSignatures({ sinceHours: 168, studioOpsRoot: STUDIO_ROOT });
  } catch {}
  const invalidIds = new Set([
    ...(posture.activeFailures || []).map((item) => item.cargo?.id),
    ...(posture.disposed || []).map((item) => item.cargo?.id),
    ...(posture.retired || []).map((item) => item.id),
  ]);
  const receipts = cargo.filter((item) => item.type === 'cargo-receipt');
  const replies = cargo.filter((item) => ['repo-answer', 'unblock-signal', 'release-dependency-ack'].includes(item.type));
  const probe = readProbe();
  const dependencies = config.dependencies.map((dep) => {
    const request = cargo.find((item) => item.id === dep.cargoId);
    const signatureState = posture.ok && request && !invalidIds.has(dep.cargoId) ? 'verified' : 'unverified';
    return deriveDependency({ config: dep, cargo: request, receipts, replies, signatureState, probe });
  });
  const state = dependencies.every((dep) => dep.status === 'completed')
    ? 'completed'
    : (dependencies.some((dep) => ['missing', 'invalid', 'expired'].includes(dep.status)) ? 'rejected' : 'pending');
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    generatedBy: 'scripts/build-release-dependencies.mjs',
    publicSafe: true,
    state,
    dependencies,
    privacy: { payloadBodiesIncluded: false, credentialsIncluded: false },
  };
}

export async function writeReleaseDependencies() {
  const receipt = await buildReleaseDependencies();
  const errors = validateReceipt(receipt);
  if (errors.length) throw new Error(errors.join('; '));
  writeFileSync(OUT, `${JSON.stringify(receipt, null, 2)}\n`);
  return receipt;
}

const isMain = process.argv[1]?.replace(/\\/g, '/').endsWith('/build-release-dependencies.mjs');
if (isMain && process.argv.includes('--self-test')) selfTest();
if (isMain && process.argv.includes('--probe')) {
  // Deliberately a SEPARATE invocation, like build-deploy-currency --probe. A
  // network observation folded into the default build would make a byte-checked
  // artifact drift with the weather — a trap this repo has paid for before.
  const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  const rp = cfg.relyingParty || {};
  const result = await probeRegistration({
    issuer: rp.issuer || 'https://obeliskgate.com',
    clientId: rp.clientId || 'vaultsparkstudios-website',
    productionCallback: rp.productionCallback || 'https://vaultsparkstudios.com/auth/callback',
    stagingCallback: rp.stagingCallback || 'https://website.staging.vaultsparkstudios.com/auth/callback',
  });
  mkdirSync(dirname(PROBE_PATH), { recursive: true });
  writeFileSync(PROBE_PATH, `${JSON.stringify(result, null, 2)}
`);
  const detail = Object.entries(result.checks).map(([k, v]) => `${k}:${v ? 'ok' : 'no'}`).join(' · ');
  console.log(`build-release-dependencies --probe: ${result.verdict} · ${detail}`);
  process.exitCode = 0;
}
if (isMain && process.argv.includes('--probe')) {
  // handled above
} else if (isMain && process.argv.includes('--check')) {
  try {
    const receipt = JSON.parse(readFileSync(OUT, 'utf8'));
    const errors = validateReceipt(receipt);
    if (errors.length) throw new Error(errors.join('; '));
    const summary = `${receipt.state} · ${receipt.dependencies.map((dep) => `${dep.id}:${dep.status}`).join(', ')}`;
    // S324: this branch used to print `rejected` and then fall out of the try
    // with exit 0 — a well-formed rejection read as a pass, so the handshake
    // gate could never hold a release. `rejected` means a declared dependency
    // is missing/invalid/expired and IS a failure. `pending` is an honest
    // in-flight state (cargo sent, not yet answered) and stays non-blocking.
    if (receipt.state === 'rejected') {
      console.error(`✗ build-release-dependencies --check: ${summary}`);
      process.exit(1);
    }
    console.log(`build-release-dependencies --check: ${summary}`);
  } catch (error) {
    console.error(`build-release-dependencies --check failed: ${error.message}`);
    process.exit(1);
  }
} else if (isMain) {
  const receipt = await writeReleaseDependencies();
  console.log(`build-release-dependencies: ${receipt.state} · ${receipt.dependencies.map((dep) => `${dep.id}:${dep.status}`).join(', ')}`);
}
