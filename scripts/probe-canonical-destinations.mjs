#!/usr/bin/env node
/**
 * Bounded reachability sampler for canonical external product destinations.
 *
 * The destination set comes only from api/ecosystem-state.json, the existing
 * public-safe projection of Studio registry truth. Network I/O is explicit:
 *   default      probe twice where needed and write the public receipt
 *   --check      validate the committed receipt without touching the network
 *   --self-test  exercise pure classification and privacy contracts
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'api', 'ecosystem-state.json');
const OUT = path.join(ROOT, 'api', 'canonical-destination-reachability.json');
const MAX_DESTINATIONS = 12;
const MAX_AGE_HOURS = 36;
const TIMEOUT_MS = 8000;

function cleanUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    url.hash = '';
    url.search = '';
    return url.toString();
  } catch {
    return null;
  }
}

export function canonicalDestinations(source) {
  if (source?.publicSafe !== true || source?.generatedBy !== 'scripts/build-public-ecosystem.mjs') return [];
  const rows = [];
  const seen = new Set();
  for (const project of source.projects || []) {
    if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(String(project?.slug || ''))) continue;
    const destination = cleanUrl(project?.liveUrl);
    if (!destination) continue;
    const url = new URL(destination);
    if (url.hostname === 'vaultsparkstudios.com' || seen.has(url.hostname)) continue;
    seen.add(url.hostname);
    rows.push({ slug: project.slug, destination });
  }
  return rows.sort((a, b) => a.slug.localeCompare(b.slug)).slice(0, MAX_DESTINATIONS);
}

export function destinationDigest(destinations) {
  return crypto.createHash('sha256').update(JSON.stringify(destinations)).digest('hex');
}

function attemptKind(attempt) {
  const status = Number(attempt?.status);
  if (status >= 200 && status < 400) return 'reachable';
  if (status === 404 || status === 410) return 'not-found';
  return 'unknown';
}

export function deriveVerdict(attempts) {
  const safe = (attempts || []).slice(0, 2);
  const reachable = safe.find((attempt) => attemptKind(attempt) === 'reachable');
  if (reachable) {
    return { verdict: 'passed', reason: reachable.redirected ? 'redirect-reached' : 'response-reached' };
  }
  if (safe.length === 2 && safe.every((attempt) => attemptKind(attempt) === 'not-found')) {
    return { verdict: 'failed', reason: 'confirmed-not-found' };
  }
  return { verdict: 'unknown', reason: 'transient-or-blocked' };
}

export function isTransientDestinationError(error) {
  return error?.name === 'AbortError'
    || error instanceof TypeError
    || [429, 500, 502, 503, 504].includes(Number(error?.status));
}

function publicAttempt(attempt) {
  return {
    status: Number.isInteger(attempt?.status) ? attempt.status : null,
    redirected: attempt?.redirected === true,
    outcome: attemptKind(attempt),
  };
}

export function buildReceipt({ source, observations, now = new Date() }) {
  const destinations = canonicalDestinations(source);
  const bySlug = new Map((observations || []).map((row) => [row.slug, row]));
  const results = destinations.map((item) => {
    const attempts = (bySlug.get(item.slug)?.attempts || []).slice(0, 2);
    const verdict = deriveVerdict(attempts);
    return {
      slug: item.slug,
      destination: item.destination,
      verdict: verdict.verdict,
      reason: verdict.reason,
      attemptCount: attempts.length,
      attempts: attempts.map(publicAttempt),
    };
  });
  const counts = { passed: 0, failed: 0, unknown: 0 };
  for (const row of results) counts[row.verdict]++;
  return {
    schemaVersion: '1.0',
    generatedAt: now.toISOString(),
    generatedBy: 'scripts/probe-canonical-destinations.mjs',
    publicSafe: true,
    source: {
      path: 'api/ecosystem-state.json',
      generatedBy: source?.generatedBy || null,
      digest: destinationDigest(destinations),
    },
    sampling: {
      deterministic: true,
      maximumDestinations: MAX_DESTINATIONS,
      maximumAttemptsPerDestination: 2,
      timeoutMs: TIMEOUT_MS,
      deadVerdictRequiresRepeatedNotFound: true,
    },
    counts: { total: results.length, ...counts },
    results,
    note: 'A failed verdict requires two 404/410 responses. Timeouts, access blocks, rate limits, and server errors remain unknown rather than being mislabeled dead.',
  };
}

export function validateReceipt(receipt, source, now = new Date()) {
  const errors = [];
  const destinations = canonicalDestinations(source);
  if (receipt?.schemaVersion !== '1.0' || receipt?.publicSafe !== true) errors.push('invalid schema/publicSafe contract');
  if (receipt?.source?.digest !== destinationDigest(destinations)) errors.push('source destination digest drift');
  if (!Array.isArray(receipt?.results) || receipt.results.length !== destinations.length) errors.push('result cardinality mismatch');
  const generated = Date.parse(receipt?.generatedAt || '');
  const ageHours = Number.isFinite(generated) ? (now.getTime() - generated) / 3_600_000 : Infinity;
  if (ageHours < -1 || ageHours > MAX_AGE_HOURS) errors.push('receipt stale or future-dated');
  for (const row of receipt?.results || []) {
    if (!destinations.some((item) => item.slug === row.slug && item.destination === row.destination)) errors.push(`unrecognized destination: ${row.slug}`);
    if (!['passed', 'failed', 'unknown'].includes(row.verdict)) errors.push(`invalid verdict: ${row.slug}`);
    if (row.verdict === 'failed' && !(row.attempts?.length === 2 && row.attempts.every((attempt) => attempt.outcome === 'not-found'))) errors.push(`unconfirmed failure: ${row.slug}`);
    if (row.attempts?.length > 2) errors.push(`attempt limit exceeded: ${row.slug}`);
    if (JSON.stringify(row).match(/error|message|stack|route|identifier/i)) errors.push(`unsafe diagnostic field: ${row.slug}`);
  }
  return { errors, ageHours };
}

async function runAttempt(destination) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(destination, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        accept: 'text/html,application/json;q=0.9,*/*;q=0.1',
        range: 'bytes=0-0',
        'user-agent': 'VaultSpark canonical-destination sampler/1.0',
      },
    });
    response.body?.cancel().catch(() => {});
    return { status: response.status, redirected: response.redirected };
  } catch (error) {
    // Fetch throws only for abort/network failures here. Those are explicit
    // unknown observations, never a red publisher or a fabricated pass.
    if (!isTransientDestinationError(error)) throw error;
    return { status: null, redirected: false };
  } finally {
    clearTimeout(timer);
  }
}

async function probe(destinations) {
  const observations = [];
  for (const item of destinations) {
    const attempts = [];
    attempts.push(await runAttempt(item.destination));
    if (attemptKind(attempts[0]) !== 'reachable') attempts.push(await runAttempt(item.destination));
    observations.push({ slug: item.slug, attempts });
  }
  return observations;
}

function fixtureSource() {
  return {
    publicSafe: true,
    generatedBy: 'scripts/build-public-ecosystem.mjs',
    projects: [
      { slug: 'alpha', liveUrl: 'https://alpha.example/path?private=no#x' },
      { slug: 'beta', liveUrl: 'https://beta.example/' },
      { slug: 'internal', liveUrl: 'http://internal.example/' },
      { slug: 'vaultsparkstudios-website', liveUrl: 'https://vaultsparkstudios.com/' },
    ],
  };
}

function selfTest() {
  const source = fixtureSource();
  const destinations = canonicalDestinations(source);
  const redirected = deriveVerdict([{ status: 301, redirected: true }]);
  const timeoutThenOk = deriveVerdict([{ status: null }, { status: 200 }]);
  const transient5xx = deriveVerdict([{ status: 503 }, { status: 502 }]);
  const dead = deriveVerdict([{ status: 404 }, { status: 410 }]);
  const receipt = buildReceipt({
    source,
    now: new Date('2026-08-28T12:00:00.000Z'),
    observations: [
      { slug: 'alpha', attempts: [{ status: 404 }, { status: 410 }] },
      { slug: 'beta', attempts: [{ status: 503 }, { status: 200, redirected: true }] },
    ],
  });
  const checks = [
    ['source is HTTPS, external, query-free, and deterministic', destinations.length === 2 && destinations[0].destination === 'https://alpha.example/path'],
    ['redirect is reachable', redirected.verdict === 'passed' && redirected.reason === 'redirect-reached'],
    ['timeout can recover', timeoutThenOk.verdict === 'passed'],
    ['transient 5xx remains unknown', transient5xx.verdict === 'unknown'],
    ['dead requires two deterministic failures', dead.verdict === 'failed'],
    ['receipt counts all verdicts', receipt.counts.failed === 1 && receipt.counts.passed === 1 && receipt.counts.unknown === 0],
    ['receipt exposes no raw diagnostic strings', !JSON.stringify(receipt).match(/stack|exception|errorMessage|identifier/i)],
    ['fresh receipt validates', validateReceipt(receipt, source, new Date('2026-08-28T13:00:00.000Z')).errors.length === 0],
    ['stale receipt fails closed', validateReceipt(receipt, source, new Date('2026-08-30T13:00:00.000Z')).errors.includes('receipt stale or future-dated')],
    ['abort/network/provider weather is transient', isTransientDestinationError(Object.assign(new Error('timeout'), { name: 'AbortError' })) && isTransientDestinationError(new TypeError('network')) && isTransientDestinationError({ status: 503 })],
    ['configuration errors remain hard failures', !isTransientDestinationError(new Error('invalid source'))],
  ];
  let passed = 0;
  for (const [label, ok] of checks) {
    console.log(`${ok ? '✓' : '✗'} ${label}`);
    if (ok) passed++;
  }
  console.log(`probe-canonical-destinations --self-test: ${passed}/${checks.length}`);
  if (passed !== checks.length) process.exit(1);
}

async function main() {
  const source = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
  if (process.argv.includes('--self-test')) return selfTest();
  if (process.argv.includes('--check')) {
    const receipt = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    const verdict = validateReceipt(receipt, source);
    if (verdict.errors.length) {
      console.error('probe-canonical-destinations --check: ' + verdict.errors.join('; '));
      process.exit(1);
    }
    console.log(`probe-canonical-destinations --check: current (${receipt.counts.passed}/${receipt.counts.total} passed, ${receipt.counts.failed} failed, ${receipt.counts.unknown} unknown)`);
    return;
  }
  const destinations = canonicalDestinations(source);
  const observations = await probe(destinations);
  const receipt = buildReceipt({ source, observations });
  fs.writeFileSync(OUT, JSON.stringify(receipt, null, 2) + '\n');
  console.log(`probe-canonical-destinations: ${receipt.counts.passed}/${receipt.counts.total} passed · ${receipt.counts.failed} failed · ${receipt.counts.unknown} unknown`);
}

const RUN_DIRECT = import.meta.main ?? process.argv[1]?.endsWith('probe-canonical-destinations.mjs');
if (RUN_DIRECT) main().catch((error) => {
  if (isTransientDestinationError(error)) {
    console.warn('probe-canonical-destinations: transient upstream failure; preserving last-known-good receipt');
    process.exit(0);
  }
  console.error('probe-canonical-destinations: unexpected failure');
  process.exit(1);
});
