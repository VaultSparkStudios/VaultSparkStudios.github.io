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

/**
 * Carry per-destination continuity across runs.
 *
 * A single run is a SNAPSHOT: it can say "vaultfront answered 503 twice", which
 * is honest but unreadable — it cannot distinguish a thirty-second blip from a
 * five-day outage, and both render as the same bare `unknown`. Retained
 * evidence is what makes an unknown interpretable, so carry two facts forward:
 * how long this destination has been unknown, and when it was last definitely
 * good.
 *
 * The one rule this must never break: continuity NEVER changes a verdict. A
 * destination unknown for ten straight runs is still `unknown`, not `failed` —
 * accumulating uncertainty is not evidence of death. It only becomes legible.
 */
export function carryContinuity({ slug, verdict, previousResults, nowIso }) {
  const prior = (previousResults || []).find((row) => row?.slug === slug) || null;
  const priorStreak = Number.isInteger(prior?.unknownStreak) ? prior.unknownStreak : 0;
  const priorGood = typeof prior?.lastKnownGoodAt === 'string' ? prior.lastKnownGoodAt : null;

  if (verdict === 'passed') return { unknownStreak: 0, lastKnownGoodAt: nowIso };
  return {
    unknownStreak: verdict === 'unknown' ? priorStreak + 1 : 0,
    lastKnownGoodAt: priorGood,
  };
}

const ageHoursBetween = (fromIso, nowIso) => {
  const from = Date.parse(fromIso || '');
  const to = Date.parse(nowIso || '');
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  return Math.round(((to - from) / 3_600_000) * 10) / 10;
};

export function buildReceipt({ source, observations, now = new Date(), previous = null }) {
  const destinations = canonicalDestinations(source);
  const bySlug = new Map((observations || []).map((row) => [row.slug, row]));
  const nowIso = now.toISOString();
  const previousResults = Array.isArray(previous?.results) ? previous.results : [];
  const results = destinations.map((item) => {
    const attempts = (bySlug.get(item.slug)?.attempts || []).slice(0, 2);
    const verdict = deriveVerdict(attempts);
    const continuity = carryContinuity({
      slug: item.slug,
      verdict: verdict.verdict,
      previousResults,
      nowIso,
    });
    return {
      slug: item.slug,
      destination: item.destination,
      verdict: verdict.verdict,
      reason: verdict.reason,
      attemptCount: attempts.length,
      attempts: attempts.map(publicAttempt),
      unknownStreak: continuity.unknownStreak,
      lastKnownGoodAt: continuity.lastKnownGoodAt,
      lastKnownGoodAgeHours: continuity.lastKnownGoodAt ? ageHoursBetween(continuity.lastKnownGoodAt, nowIso) : null,
    };
  });
  const counts = { passed: 0, failed: 0, unknown: 0 };
  for (const row of results) counts[row.verdict]++;
  const longestUnknown = results.reduce((max, row) => Math.max(max, row.unknownStreak || 0), 0);
  const neverKnownGood = results.filter((row) => row.lastKnownGoodAt === null).length;
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
    counts: {
      total: results.length,
      ...counts,
      longestUnknownStreak: longestUnknown,
      neverKnownGood,
    },
    results,
    note: 'A failed verdict requires two 404/410 responses. Timeouts, access blocks, rate limits, and server errors remain unknown rather than being mislabeled dead. unknownStreak counts consecutive inconclusive runs and lastKnownGoodAt records the last confirmed reach; neither converts an unknown into a pass or a failure.',
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
    // Continuity invariants. These exist so retained evidence can never quietly
    // become a verdict: an unknown that has persisted for ten runs is still an
    // unknown, and a reached destination cannot claim a stale last-known-good.
    if (!Number.isInteger(row.unknownStreak) || row.unknownStreak < 0) errors.push(`invalid unknown streak: ${row.slug}`);
    if (row.verdict !== 'unknown' && row.unknownStreak !== 0) errors.push(`streak must reset on a decided verdict: ${row.slug}`);
    if (row.verdict === 'unknown' && row.unknownStreak < 1) errors.push(`unknown must carry a streak: ${row.slug}`);
    if (row.lastKnownGoodAt !== null && !Number.isFinite(Date.parse(row.lastKnownGoodAt))) errors.push(`invalid last-known-good timestamp: ${row.slug}`);
    if (row.verdict === 'passed' && row.lastKnownGoodAt !== receipt.generatedAt) errors.push(`passed destination must anchor last-known-good to this run: ${row.slug}`);
    if (row.lastKnownGoodAt === null && row.lastKnownGoodAgeHours !== null) errors.push(`age without a known-good anchor: ${row.slug}`);
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

  // S333 · continuity. A snapshot cannot say how long an unknown has lasted.
  const t0 = new Date('2026-08-28T12:00:00.000Z');
  const t1 = new Date('2026-08-29T12:00:00.000Z');
  const t2 = new Date('2026-08-30T12:00:00.000Z');
  const obsGood = [{ slug: 'alpha', attempts: [{ status: 200 }] }, { slug: 'beta', attempts: [{ status: 200 }] }];
  const obsUnknown = [{ slug: 'alpha', attempts: [{ status: 503 }, { status: 503 }] }, { slug: 'beta', attempts: [{ status: 200 }] }];

  const run0 = buildReceipt({ source, observations: obsGood, now: t0 });
  const run1 = buildReceipt({ source, observations: obsUnknown, now: t1, previous: run0 });
  const run2 = buildReceipt({ source, observations: obsUnknown, now: t2, previous: run1 });
  const alpha = (r) => r.results.find((x) => x.slug === 'alpha');
  const recovered = buildReceipt({ source, observations: obsGood, now: t2, previous: run2 });

  checks.push(
    ['a reached destination anchors last-known-good to this run', alpha(run0).lastKnownGoodAt === run0.generatedAt && alpha(run0).unknownStreak === 0],
    ['consecutive inconclusive runs accumulate a streak', alpha(run1).unknownStreak === 1 && alpha(run2).unknownStreak === 2],
    ['an unknown carries the age of its last confirmed reach', alpha(run2).lastKnownGoodAt === run0.generatedAt && alpha(run2).lastKnownGoodAgeHours === 48],
    ['a persistent unknown is still unknown, never a failure', alpha(run2).verdict === 'unknown'],
    ['recovery clears the streak and re-anchors', alpha(recovered).unknownStreak === 0 && alpha(recovered).lastKnownGoodAt === recovered.generatedAt],
    ['a never-reached destination reports no fabricated anchor', (() => {
      const only = buildReceipt({ source, observations: obsUnknown, now: t0 });
      return alpha(only).lastKnownGoodAt === null && alpha(only).lastKnownGoodAgeHours === null;
    })()],
    ['the receipt summarises the longest unknown streak', run2.counts.longestUnknownStreak === 2],
    ['continuity fields validate', validateReceipt(run2, source, new Date('2026-08-30T13:00:00.000Z')).errors.length === 0],
    ['a streak on a decided verdict is rejected', validateReceipt(
      { ...run2, results: run2.results.map((r) => (r.slug === 'beta' ? { ...r, unknownStreak: 3 } : r)) },
      source, new Date('2026-08-30T13:00:00.000Z'),
    ).errors.some((e) => /streak must reset/.test(e))],
    ['an unknown without a streak is rejected', validateReceipt(
      { ...run2, results: run2.results.map((r) => (r.slug === 'alpha' ? { ...r, unknownStreak: 0 } : r)) },
      source, new Date('2026-08-30T13:00:00.000Z'),
    ).errors.some((e) => /unknown must carry a streak/.test(e))],
    ['an age without an anchor is rejected', validateReceipt(
      { ...run2, results: run2.results.map((r) => (r.slug === 'alpha' ? { ...r, lastKnownGoodAt: null, lastKnownGoodAgeHours: 12 } : r)) },
      source, new Date('2026-08-30T13:00:00.000Z'),
    ).errors.some((e) => /age without a known-good anchor/.test(e))],
    ['continuity adds no unsafe diagnostic field', !JSON.stringify(run2).match(/stack|exception|errorMessage|identifier/i)],
  );
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
  // The committed receipt is the only history this probe keeps. Read it before
  // overwriting so an unknown carries its age forward instead of resetting to
  // "first seen" on every run.
  let previous = null;
  try { previous = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { previous = null; }
  const receipt = buildReceipt({ source, observations, previous });
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
