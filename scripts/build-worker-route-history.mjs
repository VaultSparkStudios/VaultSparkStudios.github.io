#!/usr/bin/env node
/**
 * Append-only semantic history for production Worker route provenance.
 *
 * Why this exists: `build-worker-route-provenance.mjs` emits a point-in-time
 * receipt. A snapshot reads identically on day 1 and day 23, so an incident has
 * no measurable duration — it cannot be ranked, escalated, or honestly reported
 * on a public trust surface. This module gives the incident a clock.
 *
 * Design rules (all load-bearing):
 *   1. APPEND ONLY SEMANTIC CHANGES. A row is written only when the meaning of
 *      the receipt changes (per-route observed status / matched verdict, or the
 *      overall state). Probe-to-probe timing jitter is explicitly NOT a change,
 *      so the ledger stays small and every row means something.
 *   2. NO RESPONSE BODIES. Rows carry route ids, status codes, and verdicts.
 *      The forbidden-field contract is enforced deeply, not assumed.
 *   3. DETERMINISTIC DERIVATION. Durations are measured against the LAST
 *      OBSERVATION, never `Date.now()` — otherwise `--check` byte-equality
 *      would drift every second and the gate would be noise.
 *   4. OBSERVATION-BOUNDED HONESTY. An incident may have begun before the first
 *      observation. The feed says so, and corroborates onset against the
 *      independent (coarser) uptime ledger rather than inventing a start time.
 *
 * Usage:
 *   node scripts/build-worker-route-history.mjs             # append-if-changed, then derive
 *   node scripts/build-worker-route-history.mjs --check     # derive + byte-compare (no append)
 *   node scripts/build-worker-route-history.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROUTE_CONTRACT } from './build-worker-route-provenance.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPT = path.join(ROOT, 'api', 'worker-route-provenance.json');
const LEDGER = path.join(ROOT, 'data', 'worker-route-history.ndjson');
const UPTIME = path.join(ROOT, 'data', 'uptime-history.ndjson');
const OUT = path.join(ROOT, 'api', 'worker-route-history.json');

const FORBIDDEN = ['body', 'headers', 'cookie', 'setCookie', 'url', 'requestId', 'ip', 'userAgent'];
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

const byId = new Map(ROUTE_CONTRACT.map((route) => [route.id, route]));

/** Parse an ndjson buffer line-by-line. One bad line must never erase the rest. */
export function parseNdjson(raw) {
  const rows = [];
  const bad = [];
  const lines = String(raw || '').split('\n');
  for (const [index, line] of lines.entries()) {
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line));
    } catch {
      bad.push(index + 1);
    }
  }
  return { rows, bad };
}

/** Semantic view of a receipt: what the edge MEANS, with timing noise removed. */
export function routeSemantics(receipt) {
  const out = {};
  for (const route of receipt?.routes || []) {
    out[route.id] = { observed: Number.isInteger(route.observedStatus) ? route.observedStatus : 0, matched: route.matched === true };
  }
  return out;
}

/** Stable signature used for change detection. Excludes elapsedMs and generatedAt by construction. */
export function semanticSignature(semantics, state) {
  const parts = Object.keys(semantics).sort().map((id) => `${id}:${semantics[id].observed}:${semantics[id].matched ? 1 : 0}`);
  return `${state}|${parts.join(',')}`;
}

export function rowSignature(row) {
  return semanticSignature(row?.routes || {}, row?.state);
}

/** Deep forbidden-field sweep. A ledger row must never carry response content. */
export function validateLedgerPrivacy(rows) {
  const errors = [];
  const walk = (value, trail, index) => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (FORBIDDEN.includes(key)) errors.push(`row ${index} contains forbidden field ${[...trail, key].join('.')}`);
      walk(child, [...trail, key], index);
    }
  };
  for (const [index, row] of (rows || []).entries()) {
    walk(row, [], index);
    for (const id of Object.keys(row?.routes || {})) {
      if (!byId.has(id)) errors.push(`row ${index} references unknown route id ${id}`);
    }
  }
  return errors;
}

/**
 * A uniform challenge status across EVERY route is the edge refusing to talk to
 * this observer, not a change in what the edge serves.
 *
 * Observed live: a GitHub Actions runner probe returned 403 on all five routes
 * within an hour of a local probe returning 404/404/405/405/405. Nothing at the
 * edge changed — the vantage point did (Cloudflare bot-challenge on the runner
 * IP). Recording that as a semantic transition would fabricate an incident
 * change every time CI and local probes alternate, and would corrupt the very
 * durations this ledger exists to measure.
 *
 * Deliberately narrow: it requires EVERY route to report the same challenge
 * status. A genuine route-level regression does not uniformly flip two GETs and
 * three OPTIONS to the identical code.
 */
export const CHALLENGE_STATUSES = Object.freeze([401, 403, 429]);

export function isVantageChallenge(semantics) {
  const values = Object.values(semantics || {});
  if (values.length !== ROUTE_CONTRACT.length) return false;
  const first = values[0].observed;
  return CHALLENGE_STATUSES.includes(first) && values.every((route) => route.observed === first);
}

/** Append a row only when the receipt's meaning differs from the newest row. Idempotent. */
export function appendIfChanged(rows, receipt) {
  if (!receipt?.generatedAt || !(receipt.routes || []).length) return { rows, appended: null, reason: 'no observation' };
  const semantics = routeSemantics(receipt);
  if (isVantageChallenge(semantics)) return { rows, appended: null, reason: 'vantage challenge' };
  const signature = semanticSignature(semantics, receipt.state);
  const previous = rows.at(-1);
  if (previous && rowSignature(previous) === signature) return { rows, appended: null, reason: 'unchanged' };
  if (previous && Date.parse(receipt.generatedAt) <= Date.parse(previous.observedAt)) {
    return { rows, appended: null, reason: 'stale observation' };
  }
  const changed = previous
    ? Object.keys(semantics).sort().filter((id) => {
      const before = previous.routes?.[id];
      return !before || before.observed !== semantics[id].observed || before.matched !== semantics[id].matched;
    })
    : [];
  const row = {
    observedAt: receipt.generatedAt,
    origin: receipt.observedOrigin,
    state: receipt.state,
    contractSha256: receipt.sourceContract?.sha256 || null,
    transition: previous ? 'change' : 'genesis',
    changed,
    routes: semantics,
  };
  return { rows: [...rows, row], appended: row, reason: previous ? 'semantic change' : 'genesis' };
}

/** Onset bound from the independent, coarser uptime probe. Corroboration, never a substitute. */
export function coarseEdgeOnset(uptimeRows) {
  let onset = null;
  let previous = null;
  for (const row of uptimeRows || []) {
    const degraded = typeof row?.overall === 'string' && row.overall !== 'up';
    if (degraded && previous !== true) onset = row.t || null;
    if (!degraded) onset = null;
    previous = degraded;
  }
  return previous === true && onset ? onset : null;
}

/** Walk the ledger into per-route incidents. Durations close at the last observation. */
export function buildIncidents(rows) {
  const open = new Map();
  const incidents = [];
  const last = rows.at(-1);
  const lastAt = last?.observedAt || null;
  for (const row of rows) {
    for (const [id, semantics] of Object.entries(row.routes || {})) {
      const active = open.get(id);
      if (!semantics.matched && !active) {
        open.set(id, { routeId: id, openedAt: row.observedAt, observedStatus: semantics.observed, onsetBound: row.transition === 'genesis' ? 'first-observation' : 'observed-transition' });
      } else if (!semantics.matched && active) {
        active.observedStatus = semantics.observed;
      } else if (semantics.matched && active) {
        incidents.push({ ...active, closedAt: row.observedAt });
        open.delete(id);
      }
    }
  }
  for (const active of open.values()) incidents.push({ ...active, closedAt: null });
  return incidents
    .map((incident) => {
      const contract = byId.get(incident.routeId);
      const endAt = incident.closedAt || lastAt;
      const durationMs = endAt && incident.openedAt ? Math.max(0, Date.parse(endAt) - Date.parse(incident.openedAt)) : 0;
      return {
        routeId: incident.routeId,
        path: contract?.path || null,
        method: contract?.method || null,
        expectedStatus: contract?.status ?? null,
        observedStatus: incident.observedStatus,
        openedAt: incident.openedAt,
        closedAt: incident.closedAt,
        open: incident.closedAt === null,
        onsetBound: incident.onsetBound,
        durationMs,
        durationHours: Math.round((durationMs / HOUR_MS) * 10) / 10,
      };
    })
    .sort((a, b) => (a.openedAt < b.openedAt ? -1 : a.openedAt > b.openedAt ? 1 : a.routeId.localeCompare(b.routeId)));
}

export function deriveHistory({ rows = [], coarseOnsetAt = null, vantageChallengeAt = null } = {}) {
  const first = rows[0];
  const last = rows.at(-1);
  const incidents = buildIncidents(rows);
  const openIncidents = incidents.filter((incident) => incident.open);
  const routeOnset = openIncidents.length ? openIncidents.map((incident) => incident.openedAt).sort()[0] : null;
  const bounds = [routeOnset, coarseOnsetAt].filter(Boolean).sort();
  const onsetNotLaterThan = bounds[0] || null;
  const asOf = last?.observedAt || null;
  const degradedMs = onsetNotLaterThan && asOf ? Math.max(0, Date.parse(asOf) - Date.parse(onsetNotLaterThan)) : 0;
  return {
    schemaVersion: '1.0',
    generatedBy: 'scripts/build-worker-route-history.mjs',
    generatedAt: asOf,
    publicSafe: true,
    privacy: {
      responseBodiesRecorded: false,
      identifiersRecorded: false,
      semanticChangesOnly: true,
      forbiddenFields: FORBIDDEN,
    },
    state: last?.state || 'unobserved',
    asOf,
    observationWindow: {
      firstObservedAt: first?.observedAt || null,
      lastObservedAt: asOf,
      semanticChanges: rows.length,
    },
    honesty: {
      observationBounded: true,
      note: 'Durations are bounded by observation. An incident may have begun before the first recorded observation; onsetNotLaterThan is an upper bound on the true start, never a claimed start time.',
      corroboration: coarseOnsetAt
        ? {
          source: 'data/uptime-history.ndjson',
          resolution: 'coarse (whole-edge, not per-route)',
          edgeDegradedSince: coarseOnsetAt,
        }
        : null,
      // Surfaced rather than silently dropped: the newest receipt could not be
      // used because the edge challenged the observer, so the timeline below is
      // older than the newest probe attempt.
      vantageChallengeAt,
    },
    current: {
      openIncidents: openIncidents.length,
      totalRoutes: ROUTE_CONTRACT.length,
      onsetNotLaterThan,
      degradedForMs: degradedMs,
      degradedForHours: Math.round((degradedMs / HOUR_MS) * 10) / 10,
      degradedForDays: Math.round((degradedMs / DAY_MS) * 10) / 10,
    },
    incidents,
    timeline: rows.map((row) => ({
      observedAt: row.observedAt,
      state: row.state,
      transition: row.transition,
      changed: row.changed || [],
    })),
  };
}

/** A derived feed that predates the newest receipt is the strander class. Fail the gate on it. */
export function receiptIsIngested(rows, receipt) {
  if (!receipt?.generatedAt || !(receipt.routes || []).length) return true;
  // A challenged observation is never ingested by design, so it must not be
  // treated as a strand.
  if (isVantageChallenge(routeSemantics(receipt))) return true;
  const last = rows.at(-1);
  if (!last) return false;
  if (Date.parse(last.observedAt) >= Date.parse(receipt.generatedAt)) return true;
  return rowSignature(last) === semanticSignature(routeSemantics(receipt), receipt.state);
}

function readLedger() {
  if (!fs.existsSync(LEDGER)) return { rows: [], bad: [] };
  return parseNdjson(fs.readFileSync(LEDGER, 'utf8'));
}

function serializeLedger(rows) {
  return rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : '');
}

function readCoarseOnset() {
  if (!fs.existsSync(UPTIME)) return null;
  const { rows } = parseNdjson(fs.readFileSync(UPTIME, 'utf8'));
  return coarseEdgeOnset(rows);
}

function selfTest() {
  const receiptOf = (overrides) => ({
    generatedAt: '2026-01-02T00:00:00.000Z',
    observedOrigin: 'https://example.test',
    state: 'mismatch',
    sourceContract: { sha256: 'abc' },
    routes: ROUTE_CONTRACT.map((route) => ({
      id: route.id,
      observedStatus: route.status,
      matched: true,
      elapsedMs: 10,
    })),
    ...overrides,
  });
  const healthy = receiptOf({ state: 'matched' });
  const genesis = appendIfChanged([], healthy);
  const idempotent = appendIfChanged(genesis.rows, healthy);
  const jitter = appendIfChanged(genesis.rows, { ...healthy, generatedAt: '2026-01-03T00:00:00.000Z', routes: healthy.routes.map((r) => ({ ...r, elapsedMs: 999 })) });
  const brokenReceipt = {
    ...healthy,
    generatedAt: '2026-01-03T00:00:00.000Z',
    state: 'mismatch',
    routes: healthy.routes.map((r) => (r.id === 'rum-ingest' ? { ...r, observedStatus: 405, matched: false } : r)),
  };
  const broke = appendIfChanged(genesis.rows, brokenReceipt);
  const repaired = appendIfChanged(broke.rows, { ...healthy, generatedAt: '2026-01-05T00:00:00.000Z' });
  const reBroke = appendIfChanged(repaired.rows, { ...brokenReceipt, generatedAt: '2026-01-06T00:00:00.000Z' });
  const challengeReceipt = {
    ...healthy,
    generatedAt: '2026-01-07T00:00:00.000Z',
    state: 'mismatch',
    routes: healthy.routes.map((route) => ({ ...route, observedStatus: 403, matched: false })),
  };

  const openFeed = deriveHistory({ rows: broke.rows });
  const closedFeed = deriveHistory({ rows: repaired.rows });
  const reopenFeed = deriveHistory({ rows: reBroke.rows });
  const darkFeed = deriveHistory({ rows: [] });
  const corroborated = deriveHistory({ rows: broke.rows, coarseOnsetAt: '2026-01-01T00:00:00.000Z' });

  const uptimeUp = [{ t: 'a', overall: 'up' }, { t: 'b', overall: 'up' }];
  const uptimeDegraded = [{ t: 'a', overall: 'up' }, { t: 'b', overall: 'edge-degraded' }, { t: 'c', overall: 'edge-degraded' }];
  const uptimeRecovered = [...uptimeDegraded, { t: 'd', overall: 'up' }];

  const { rows: parsedRows, bad } = parseNdjson('{"a":1}\nnot json\n{"b":2}\n');

  const openIncident = openFeed.incidents.find((incident) => incident.routeId === 'rum-ingest');
  const closedIncident = closedFeed.incidents.find((incident) => incident.routeId === 'rum-ingest');

  const cases = [
    ['genesis row is appended', genesis.appended?.transition === 'genesis' && genesis.rows.length === 1],
    ['identical receipt does not append', idempotent.appended === null && idempotent.reason === 'unchanged'],
    ['timing jitter alone is not a semantic change', jitter.appended === null && jitter.rows.length === 1],
    ['semantic change appends exactly one row', broke.rows.length === 2 && broke.appended.transition === 'change'],
    ['changed[] names only the flipped route', broke.appended.changed.length === 1 && broke.appended.changed[0] === 'rum-ingest'],
    ['stale observation is rejected', appendIfChanged(broke.rows, { ...healthy, generatedAt: '2025-01-01T00:00:00.000Z' }).reason === 'stale observation'],
    ['open incident duration runs to the last observation', openIncident?.open === true && openIncident.durationMs === 0],
    ['closed incident measures the real span', closedIncident?.open === false && closedIncident.durationMs === 2 * DAY_MS],
    ['a recurrence opens a second incident', reopenFeed.incidents.filter((incident) => incident.routeId === 'rum-ingest').length === 2],
    ['empty ledger stays honest-dark', darkFeed.state === 'unobserved' && darkFeed.incidents.length === 0 && darkFeed.current.onsetNotLaterThan === null],
    ['coarse probe tightens the onset bound', corroborated.current.onsetNotLaterThan === '2026-01-01T00:00:00.000Z' && corroborated.current.degradedForMs === 2 * DAY_MS],
    ['corroboration is labelled, never merged into route evidence', corroborated.honesty.corroboration.resolution.startsWith('coarse')],
    ['coarse onset is null while the edge is up', coarseEdgeOnset(uptimeUp) === null],
    ['coarse onset is the transition, not the newest row', coarseEdgeOnset(uptimeDegraded) === 'b'],
    ['recovery clears the coarse onset', coarseEdgeOnset(uptimeRecovered) === null],
    ['privacy validator rejects a nested body', validateLedgerPrivacy([{ routes: { 'rum-ingest': { observed: 405, body: 'secret' } } }]).length === 1],
    ['privacy validator rejects an unknown route id', validateLedgerPrivacy([{ routes: { 'not-a-route': { observed: 200 } } }]).length === 1],
    ['clean rows pass the privacy validator', validateLedgerPrivacy(broke.rows).length === 0],
    ['derived feed carries no response content', FORBIDDEN.every((key) => !JSON.stringify(openFeed.incidents).includes(`"${key}":`))],
    ['derivation is deterministic', JSON.stringify(deriveHistory({ rows: broke.rows })) === JSON.stringify(openFeed)],
    ['generatedAt is the last observation, not wall clock', openFeed.generatedAt === '2026-01-03T00:00:00.000Z'],
    ['one bad ndjson line never erases the rest', parsedRows.length === 2 && bad.length === 1 && bad[0] === 2],
    ['a receipt newer than the ledger is not ingested', receiptIsIngested(genesis.rows, brokenReceipt) === false],
    ['an ingested receipt passes the strand check', receiptIsIngested(broke.rows, brokenReceipt) === true],
    // Vantage challenge — the live S293 case: a CI runner saw a uniform 403 on
    // every route within an hour of a local probe seeing 404/404/405/405/405.
    ['THE LIVE CASE: a uniform 403 across every route is a vantage challenge', isVantageChallenge(routeSemantics(challengeReceipt)) === true],
    ['a challenged receipt is never appended', appendIfChanged(broke.rows, challengeReceipt).appended === null && appendIfChanged(broke.rows, challengeReceipt).reason === 'vantage challenge'],
    ['a challenged receipt is not treated as a strand', receiptIsIngested(broke.rows, challengeReceipt) === true],
    ['a challenge is surfaced, not silently dropped', deriveHistory({ rows: broke.rows, vantageChallengeAt: 'now' }).honesty.vantageChallengeAt === 'now'],
    ['a genuine mixed-status failure is NOT a vantage challenge', isVantageChallenge(routeSemantics(brokenReceipt)) === false],
    ['a single 403 among healthy routes is NOT a vantage challenge', isVantageChallenge(routeSemantics({ ...healthy, routes: healthy.routes.map((r) => r.id === 'rum-ingest' ? { ...r, observedStatus: 403, matched: false } : r) })) === false],
    ['a uniform NON-challenge status is still a real change', isVantageChallenge(routeSemantics({ ...healthy, routes: healthy.routes.map((r) => ({ ...r, observedStatus: 404, matched: false })) })) === false],
    ['a uniform 429 also reads as a vantage challenge', isVantageChallenge(routeSemantics({ ...healthy, routes: healthy.routes.map((r) => ({ ...r, observedStatus: 429, matched: false })) })) === true],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (failed.length) {
    console.error(`build-worker-route-history --self-test: ${failed.length} failure(s)`);
    process.exit(1);
  }
  console.log(`build-worker-route-history --self-test: ${cases.length}/${cases.length} passed`);
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const check = process.argv.includes('--check');

  const { rows: ledgerRows, bad } = readLedger();
  if (bad.length) {
    console.error(`build-worker-route-history: unparseable ledger line(s) ${bad.join(', ')} in data/worker-route-history.ndjson`);
    process.exit(1);
  }
  const privacyErrors = validateLedgerPrivacy(ledgerRows);
  if (privacyErrors.length) {
    for (const error of privacyErrors) console.error(`build-worker-route-history: ${error}`);
    process.exit(1);
  }

  const receipt = fs.existsSync(RECEIPT) ? JSON.parse(fs.readFileSync(RECEIPT, 'utf8')) : null;
  let rows = ledgerRows;

  if (!check) {
    const result = appendIfChanged(rows, receipt);
    rows = result.rows;
    if (result.appended) {
      fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
      fs.writeFileSync(LEDGER, serializeLedger(rows));
      console.log(`build-worker-route-history: appended ${result.reason} at ${result.appended.observedAt}`);
    }
  } else if (!receiptIsIngested(rows, receipt)) {
    console.error('build-worker-route-history: receipt is newer than the ledger; run without --check to append the observation');
    process.exit(1);
  }

  const challenged = receipt && isVantageChallenge(routeSemantics(receipt));
  const content = JSON.stringify(deriveHistory({
    rows,
    coarseOnsetAt: readCoarseOnset(),
    vantageChallengeAt: challenged ? receipt.generatedAt : null,
  }), null, 2) + '\n';
  if (check) {
    const actual = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (actual !== content) {
      console.error('build-worker-route-history: derived history drifted; run without --check to rebuild');
      process.exit(1);
    }
  } else {
    fs.writeFileSync(OUT, content);
  }
  const feed = JSON.parse(content);
  if (challenged) console.log(`build-worker-route-history: newest receipt (${receipt.generatedAt}) was a vantage challenge — not an observation, not recorded`);
  console.log(`build-worker-route-history: ${feed.state} · ${feed.current.openIncidents} open incident(s) · degraded ${feed.current.degradedForDays}d (observation-bounded) · ${feed.observationWindow.semanticChanges} semantic change(s)`);
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirect) main();
