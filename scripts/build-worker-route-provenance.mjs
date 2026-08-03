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
import { isChallenged, isVantageChallenged } from './lib/vantage-challenge.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'api', 'worker-route-provenance.json');
const WORKER = path.join(ROOT, 'cloudflare', 'security-headers-worker.js');
const PROD = process.env.PROD_ORIGIN || 'https://vaultsparkstudios.com';
const TIMEOUT_MS = 10_000;

export const ROUTE_CONTRACT = Object.freeze([
  { id: 'edge-health', method: 'GET', path: '/_health', status: 200, contentType: 'application/json' },
  { id: 'ambient-identity', method: 'GET', path: '/api/auth/me', status: 200, contentType: 'application/json' },
  { id: 'rum-ingest', method: 'OPTIONS', path: '/v/rum', status: 204 },
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
  const vantageChallenged = isVantageChallenged(observations);
  const routes = ROUTE_CONTRACT.map((expected) => {
    const actual = byId.get(expected.id) || {};
    const contentTypeOk = !expected.contentType || String(actual.contentType || '').toLowerCase().includes(expected.contentType);
    const matched = actual.status === expected.status && contentTypeOk;
    const challenged = vantageChallenged || isChallenged({ status: actual.status, contentType: actual.contentType });
    return {
      id: expected.id,
      method: expected.method,
      path: expected.path,
      expectedStatus: expected.status,
      observedStatus: Number.isInteger(actual.status) ? actual.status : 0,
      ...(expected.contentType ? { expectedContentType: expected.contentType, observedContentType: actual.contentType || null } : {}),
      elapsedMs: Number.isFinite(actual.elapsedMs) ? Math.round(actual.elapsedMs) : null,
      matched,
      ...(challenged ? { challenged: true } : {}),
      ...(actual.error ? { error: String(actual.error).slice(0, 120) } : {}),
    };
  });
  const matched = routes.filter((route) => route.matched).length;
  const reachable = routes.filter((route) => route.observedStatus > 0).length;
  const challengedCount = routes.filter((route) => route.challenged).length;
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
    // Order matters (D-S300.1): a challenged vantage is checked BEFORE mismatch so
    // an interstitial served to the observer can never publish a false incident.
    state: matched === routes.length ? 'matched'
      : reachable === 0 ? 'unreachable'
      : challengedCount > 0 ? 'unverified'
      : 'mismatch',
    ...(challengedCount > 0 && matched !== routes.length ? { stateReason: 'vantage-challenged' } : {}),
    summary: { matched, total: routes.length, reachable, ...(challengedCount > 0 ? { challenged: challengedCount } : {}) },
    routes,
  };
}

async function probeRoute(route) {
  const started = Date.now();
  try {
    const response = await fetch(new URL(route.path, PROD), {
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

function normalizeCommitted(receipt) {
  return (receipt?.routes || []).map((route) => ({
    id: route.id,
    status: route.observedStatus,
    contentType: route.observedContentType,
    elapsedMs: route.elapsedMs,
    ...(route.error ? { error: route.error } : {}),
  }));
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
  const cases = [
    ['healthy routes match', good.state === 'matched' && good.summary.matched === ROUTE_CONTRACT.length],
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
  if (process.argv.includes('--probe')) {
    observations = await Promise.all(ROUTE_CONTRACT.map(probeRoute));
    observedAt = new Date().toISOString();
  } else {
    let committed = null;
    try { committed = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch {}
    observations = normalizeCommitted(committed);
    observedAt = committed?.generatedAt || null;
  }
  const privacyErrors = validatePrivacy(observations);
  if (privacyErrors.length) {
    for (const error of privacyErrors) console.error(`worker-route-provenance: ${error}`);
    process.exit(1);
  }
  const receipt = deriveReceipt({ observations, observedAt, workerSource });
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
  console.log(`worker-route-provenance: ${receipt.state} (${receipt.summary.matched}/${receipt.summary.total} routes)`);
}

if (import.meta.main ?? process.argv[1]?.endsWith('build-worker-route-provenance.mjs')) await main();
