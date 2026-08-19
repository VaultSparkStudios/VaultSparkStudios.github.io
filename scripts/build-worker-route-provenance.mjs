#!/usr/bin/env node
/**
 * Privacy-safe production Worker route provenance.
 *
 * `--probe` performs only bounded GET/OPTIONS requests and records no bodies,
 * cookies, identifiers, response headers beyond content type, or redirects.
 * Normal builds re-derive the verdict against the current Worker source hash
 * from the committed observations; they never require network access.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isChallenged, isVantageChallenged, isMissingRoute, hasClearControl } from './lib/vantage-challenge.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'api', 'worker-route-provenance.json');
const WORKER = path.join(ROOT, 'cloudflare', 'security-headers-worker.js');
const PROD = process.env.PROD_ORIGIN || 'https://vaultsparkstudios.com';
// S321/S322 — the production origin is bot-challenged for datacenter clients
// (api/uptime.json records this), so CI can never produce the primary receipt
// above; it stays a locally-run probe. This second, unchallenged vantage lets
// CI corroborate that the CURRENT BUILD is route-correct. It intentionally
// cannot satisfy check-content-capability-slice.mjs, which still requires
// `observedOrigin === PROD` — a build attestation is not a production route
// binding, and the two must never be allowed to stand in for one another.
const BUILD_VANTAGE = process.env.BUILD_VANTAGE_ORIGIN
  || 'https://vaultspark-security-headers-staging.founder-d73.workers.dev';
const TIMEOUT_MS = 10_000;

export const ROUTE_CONTRACT = Object.freeze([
  { id: 'edge-health', method: 'GET', path: '/_health', status: 200, contentType: 'application/json' },
  { id: 'ambient-identity', method: 'GET', path: '/api/auth/me', status: 200, contentType: 'application/json' },
  { id: 'rum-ingest', method: 'OPTIONS', path: '/v/rum', status: 204 },
  { id: 'desk-reaction', method: 'OPTIONS', path: '/v/desk-reaction', status: 204 },
  { id: 'desk-presence', method: 'OPTIONS', path: '/v/desk-presence', status: 204 },
  { id: 'trusted-types-intake', method: 'OPTIONS', path: '/v/tt-report', status: 204 },
  { id: 'csp-intake', method: 'OPTIONS', path: '/v/csp-report', status: 204 },
]);

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

export function validatePrivacy(observations) {
  const forbidden = ['body', 'headers', 'cookie', 'setCookie', 'url', 'requestId', 'ip'];
  const errors = [];
  for (const [index, observation] of (observations || []).entries()) {
    for (const key of forbidden) if (Object.hasOwn(observation, key)) errors.push(`observation ${index} contains forbidden field ${key}`);
    if (!ROUTE_CONTRACT.some((route) => route.id === observation.id)) errors.push(`observation ${index} has unknown route id`);
    if (typeof observation.error === 'string' && observation.error.length > 120) errors.push(`observation ${index} error exceeds 120 chars`);
  }
  return errors;
}

export function deriveReceipt({ observations = [], observedAt = null, workerSource = '', origin = PROD }) {
  const byId = new Map(observations.map((observation) => [observation.id, observation]));
  // S317 — decide contract matching BEFORE asking whether the vantage was
  // challenged, so an exactly-matching route can serve as a clear control.
  // Without this ordering one missing route condemned the whole receipt.
  const contractMatch = (expected, actual) => {
    const contentTypeOk = !expected.contentType || String(actual.contentType || '').toLowerCase().includes(expected.contentType);
    return actual.status === expected.status && contentTypeOk;
  };
  const marked = ROUTE_CONTRACT.map((expected) => {
    const actual = byId.get(expected.id) || {};
    return { ...actual, id: expected.id, contractMatched: contractMatch(expected, actual) };
  });
  const vantageChallenged = isVantageChallenged(marked);
  const vantageClear = !vantageChallenged && marked.some((o) => o.contractMatched);
  const routes = ROUTE_CONTRACT.map((expected) => {
    const actual = byId.get(expected.id) || {};
    const matched = contractMatch(expected, actual);
    const missing = isMissingRoute({ status: actual.status, contentType: actual.contentType }, { vantageClear });
    const challenged = !missing && (vantageChallenged || isChallenged({ status: actual.status, contentType: actual.contentType }));
    return {
      id: expected.id,
      method: expected.method,
      path: expected.path,
      expectedStatus: expected.status,
      observedStatus: Number.isInteger(actual.status) ? actual.status : 0,
      ...(expected.contentType ? { expectedContentType: expected.contentType, observedContentType: actual.contentType || null } : {}),
      elapsedMs: Number.isFinite(actual.elapsedMs) ? Math.round(actual.elapsedMs) : null,
      matched,
      ...(missing ? { missing: true } : {}),
      ...(challenged ? { challenged: true } : {}),
      ...(actual.error ? { error: String(actual.error).slice(0, 120) } : {}),
    };
  });
  const matched = routes.filter((route) => route.matched).length;
  const reachable = routes.filter((route) => route.observedStatus > 0).length;
  const challengedCount = routes.filter((route) => route.challenged).length;
  const missingRoutes = routes.filter((route) => route.missing);
  return {
    schemaVersion: '1.0',
    generatedBy: 'scripts/build-worker-route-provenance.mjs',
    generatedAt: observedAt,
    observedOrigin: new URL(origin).origin,
    publicSafe: true,
    privacy: {
      responseBodiesRecorded: false,
      identifiersRecorded: false,
      credentialsSent: false,
      methods: ['GET', 'OPTIONS'],
      timeoutMs: TIMEOUT_MS,
    },
    sourceContract: {
      path: 'cloudflare/security-headers-worker.js',
      sha256: sha256(workerSource),
      expectedRoutes: ROUTE_CONTRACT.length,
    },
    // Order matters. `missing` is checked BEFORE `unverified` because a route
    // that 404s while a sibling answers its contract exactly is a fact about
    // the DEPLOYMENT, not about the observer — the distinction the old ordering
    // collapsed. A genuinely challenged vantage (no clear control) still wins
    // over mismatch, preserving D-S300.1.
    state: matched === routes.length ? 'matched'
      : reachable === 0 ? 'unreachable'
      : missingRoutes.length > 0 ? 'missing'
      : challengedCount > 0 ? 'unverified'
      : 'mismatch',
    ...(missingRoutes.length > 0
      ? { stateReason: 'routes-absent-from-deployed-worker', missingRoutes: missingRoutes.map((route) => route.path) }
      : challengedCount > 0 && matched !== routes.length ? { stateReason: 'vantage-challenged' } : {}),
    summary: {
      matched, total: routes.length, reachable,
      ...(missingRoutes.length > 0 ? { missing: missingRoutes.length } : {}),
      ...(challengedCount > 0 ? { challenged: challengedCount } : {}),
    },
    routes,
  };
}

async function probeRoute(route, origin = PROD) {
  const started = Date.now();
  try {
    const response = await fetch(new URL(route.path, origin), {
      method: route.method,
      headers: { accept: route.contentType || '*/*', 'user-agent': 'VaultSparkWorkerProvenance/1.0' },
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      credentials: 'omit',
    });
    return {
      id: route.id,
      status: response.status,
      contentType: response.headers.get('content-type'),
      elapsedMs: Date.now() - started,
    };
  } catch (error) {
    return { id: route.id, status: 0, elapsedMs: Date.now() - started, error: String(error?.message || error).slice(0, 120) };
  }
}

function normalizeCommitted(routes) {
  return (routes || []).map((route) => ({
    id: route.id,
    status: route.observedStatus,
    contentType: route.observedContentType,
    elapsedMs: route.elapsedMs,
    ...(route.error ? { error: route.error } : {}),
  }));
}

// buildVantage attests only that the CURRENT BUILD answers its own route
// contract from an unchallenged origin — never production route provenance.
// Deliberately a thin projection (state/summary/observedOrigin/generatedAt),
// not a second full `routes` array, so nothing downstream can mistake it for
// the primary receipt shape check-content-capability-slice.mjs reads.
export function deriveBuildVantage({ observations = [], observedAt = null, workerSource = '', origin = BUILD_VANTAGE }) {
  const receipt = deriveReceipt({ observations, observedAt, workerSource, origin });
  return {
    generatedAt: receipt.generatedAt,
    observedOrigin: receipt.observedOrigin,
    attests: 'build',
    sourceSha256: receipt.sourceContract.sha256,
    state: receipt.state,
    ...(receipt.stateReason ? { stateReason: receipt.stateReason } : {}),
    summary: receipt.summary,
  };
}

function selfTest() {
  const source = 'worker-source';
  const healthy = ROUTE_CONTRACT.map((route) => ({ id: route.id, status: route.status, contentType: route.contentType || null, elapsedMs: 12 }));
  const good = deriveReceipt({ observations: healthy, observedAt: '2026-07-25T00:00:00Z', workerSource: source });
  const mismatch = deriveReceipt({ observations: healthy.map((row) => row.id === 'rum-ingest' ? { ...row, status: 405 } : row), observedAt: 'x', workerSource: source });
  const dark = deriveReceipt({ observations: [], observedAt: 'x', workerSource: source });
  // Replica of the 2026-08-01 live false incident: CF interstitial answers every
  // route with 403 (HTML on GET routes, bodyless on OPTIONS routes).
  const challengedObs = ROUTE_CONTRACT.map((route) => ({
    id: route.id,
    status: 403,
    contentType: route.method === 'GET' ? 'text/html; charset=UTF-8' : null,
    elapsedMs: 40,
  }));
  const challenged = deriveReceipt({ observations: challengedObs, observedAt: 'x', workerSource: source });
  const jsonReject = deriveReceipt({
    observations: healthy.map((row) => row.id === 'ambient-identity' ? { ...row, status: 403, contentType: 'application/json' } : row),
    observedAt: 'x',
    workerSource: source,
  });
  // S317 — THE LIVE CASE this receipt got wrong for days. The deployed Worker
  // predated the desk handlers, so the static origin answered /v/desk-reaction
  // and /v/desk-presence with 403/HTML while /_health returned 200 JSON from
  // the SAME probe. The old logic called that a challenged vantage.
  const deskAbsentObs = ROUTE_CONTRACT.map((route) => (
    route.id === 'desk-reaction' || route.id === 'desk-presence'
      ? { id: route.id, status: 403, contentType: 'text/html; charset=utf-8', elapsedMs: 30 }
      : { id: route.id, status: route.status, contentType: route.contentType || null, elapsedMs: 12 }
  ));
  const deskAbsent = deriveReceipt({ observations: deskAbsentObs, observedAt: 'x', workerSource: source });
  const notFoundObs = healthy.map((row) => row.id === 'desk-reaction' ? { ...row, status: 404, contentType: 'text/html' } : row);
  const notFound = deriveReceipt({ observations: notFoundObs, observedAt: 'x', workerSource: source });
  const buildHealthy = deriveBuildVantage({ observations: healthy, observedAt: '2026-07-25T00:00:00Z', workerSource: source });
  const buildChallenged = deriveBuildVantage({ observations: challengedObs, observedAt: 'x', workerSource: source });
  const cases = [
    ['healthy routes match', good.state === 'matched' && good.summary.matched === ROUTE_CONTRACT.length],
    ['buildVantage is a thin projection, not a routes array', buildHealthy.routes === undefined && buildHealthy.attests === 'build'],
    ['buildVantage matches independently of the production receipt', buildHealthy.state === 'matched'],
    ['buildVantage can be challenged independently of production', buildChallenged.state === 'unverified' && buildChallenged.stateReason === 'vantage-challenged'],
    ['buildVantage carries the same source hash as the primary receipt', buildHealthy.sourceSha256 === good.sourceContract.sha256],
    ['buildVantage never claims to observe production', buildHealthy.observedOrigin === new URL(BUILD_VANTAGE).origin && buildHealthy.observedOrigin !== new URL(PROD).origin],
    ['THE LIVE CASE: absent desk routes are MISSING, not vantage-challenged',
      deskAbsent.state === 'missing' && deskAbsent.stateReason === 'routes-absent-from-deployed-worker'],
    ['a missing route names itself so the receipt cannot hide which one',
      deskAbsent.missingRoutes.includes('/v/desk-reaction') && deskAbsent.missingRoutes.includes('/v/desk-presence')],
    ['a missing route is not ALSO labelled challenged',
      deskAbsent.routes.find((r) => r.id === 'desk-reaction').challenged === undefined],
    ['a clear control disproves a challenged vantage',
      hasClearControl(deskAbsentObs.map((o, i) => ({ ...o, contractMatched: i === 0 }))) === true],
    ['a 404 beside a passing control is missing too', notFound.state === 'missing'],
    ['stale Worker route mismatches', mismatch.state === 'mismatch' && mismatch.routes.find((route) => route.id === 'rum-ingest').matched === false],
    ['unreachable remains honest-dark', dark.state === 'unreachable' && dark.summary.reachable === 0],
    ['receipt excludes response bodies', validatePrivacy(healthy).length === 0 && JSON.stringify(good).includes('worker-source') === false],
    ['privacy validator rejects a body', validatePrivacy([{ ...healthy[0], body: 'secret' }]).length === 1],
    ['source contract is SHA-256 bound', good.sourceContract.sha256 === sha256(source)],
    ['a CF interstitial vantage is unverified, never mismatch', challenged.state === 'unverified' && challenged.stateReason === 'vantage-challenged'],
    ['challenged receipt exposes the challenged count', challenged.summary.challenged === ROUTE_CONTRACT.length && challenged.routes.every((route) => route.challenged === true)],
    ['a JSON 403 is a real mismatch, not a challenge', jsonReject.state === 'mismatch' && jsonReject.routes.find((route) => route.id === 'ambient-identity').challenged === undefined],
  ];
  for (const [name, ok] of cases) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (cases.some(([, ok]) => !ok)) process.exit(1);
  console.log(`worker-route-provenance self-test: ${cases.length}/${cases.length}`);
}

async function main() {
  const workerSource = fs.readFileSync(WORKER, 'utf8');
  if (process.argv.includes('--self-test')) return selfTest();
  let observations;
  let observedAt;
  let buildVantage;
  if (process.argv.includes('--probe')) {
    observations = await Promise.all(ROUTE_CONTRACT.map((route) => probeRoute(route, PROD)));
    observedAt = new Date().toISOString();
    const buildObservations = await Promise.all(ROUTE_CONTRACT.map((route) => probeRoute(route, BUILD_VANTAGE)));
    const buildErrors = validatePrivacy(buildObservations);
    if (buildErrors.length) {
      for (const error of buildErrors) console.error(`worker-route-provenance(buildVantage): ${error}`);
      process.exit(1);
    }
    buildVantage = deriveBuildVantage({ observations: buildObservations, observedAt: new Date().toISOString(), workerSource });
  } else {
    let committed = null;
    try { committed = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch {}
    observations = normalizeCommitted(committed?.routes);
    observedAt = committed?.generatedAt || null;
    buildVantage = committed?.buildVantage || null;
  }
  const privacyErrors = validatePrivacy(observations);
  if (privacyErrors.length) {
    for (const error of privacyErrors) console.error(`worker-route-provenance: ${error}`);
    process.exit(1);
  }
  const receipt = deriveReceipt({ observations, observedAt, workerSource });
  if (buildVantage) receipt.buildVantage = buildVantage;
  const content = JSON.stringify(receipt, null, 2) + '\n';
  if (process.argv.includes('--check')) {
    const actual = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (actual !== content) {
      console.error('worker-route-provenance: receipt drifted; run --probe for live evidence or without --check to rebind source');
      process.exit(1);
    }
  } else {
    fs.writeFileSync(OUT, content);
  }
  console.log(`worker-route-provenance: ${receipt.state} (${receipt.summary.matched}/${receipt.summary.total} routes)`
    + (receipt.buildVantage ? ` · buildVantage: ${receipt.buildVantage.state} (${receipt.buildVantage.summary.matched}/${receipt.buildVantage.summary.total})` : ''));
}

if (import.meta.main ?? process.argv[1]?.endsWith('build-worker-route-provenance.mjs')) await main();
