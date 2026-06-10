#!/usr/bin/env node
/**
 * probe-uptime.mjs (S176 #6 · uptime-probe-firstparty · S177 real-availability rewrite)
 *
 * First-party availability monitoring. The founder's 2026-06-07 503s on
 * /games/ + /vault-member/ were invisible to us — failed page loads never
 * beacon RUM, and the uptimerobot credential is MISSING (free-build bias:
 * build it first-party).
 *
 * S177 — why this was rewritten. The S176 version fetched HTML pages on the
 * production custom domain and treated any non-200 as an outage. But
 * vaultsparkstudios.com HTML *navigation* is bot-challenged at the Cloudflare
 * edge: a real residential browser solves the JS clearance transparently, while
 * a datacenter/CI client (this probe, on GitHub Actions) cannot, so it hangs or
 * 403s *before the request ever reaches the Worker* (verified via wrangler tail).
 * The S176 probe's first and only run therefore false-paged the founder while
 * the site was fully up. A probe that 100% false-positives is worse than none.
 *
 * The fix: measure what real users actually get, by the two signals a datacenter
 * client *can* read truthfully:
 *   1. CONTENT  — fetch each route from the Pages origin (vaultsparkstudios-website
 *      .pages.dev). The origin is unchallenged, so a 200 there means the built
 *      HTML for that route is being served. Catches build/deploy/content outages.
 *   2. LIVENESS — fetch a JSON endpoint on the production custom domain. JSON/API
 *      paths are not bot-challenged, so a 200 proves the DNS + Cloudflare + Worker
 *      chain is alive on the real domain. Catches DNS/edge/worker outages.
 * The custom-domain HTML request is still probed, but only as an INFORMATIONAL
 * signal (the bot-challenge state) that never pages anyone.
 *
 * Coverage gap (documented, accepted): a Worker bug that breaks ONLY custom-domain
 * HTML processing (not the origin, not JSON) is invisible here, because we can't
 * pass the challenge to test it. That path is guarded pre-deploy by build:check +
 * the ambient-integrity specs; the nonce HTMLRewriter is stable.
 *
 * A GH Actions cron runs this every 30 minutes, writes api/uptime.json, and emails
 * the founder via Resend on any *real* failure (content route down OR edge liveness
 * down). Dedup: .cache/uptime-alerts-sent.json — one alert per signal per 6h window.
 *
 * Usage:
 *   node scripts/probe-uptime.mjs               # probe + write + alert
 *   node scripts/probe-uptime.mjs --dry-run     # probe + print, no write/send
 *   node scripts/probe-uptime.mjs --self-test   # pure-logic checks
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'api', 'uptime.json');
const HISTORY = path.join(ROOT, 'data', 'uptime-history.ndjson');
const COMMIT_FLAG = path.join(ROOT, '.cache', 'uptime-commit');
const SENT = path.join(ROOT, '.cache', 'uptime-alerts-sent.json');
const HISTORY_CAP = 1488; // ~31 days of hourly rows + incident rows
const DRY = process.argv.includes('--dry-run');
const COLO_PROBE = process.argv.includes('--colo-probe');
const COLO_SUPPLEMENT = path.join(ROOT, '.cache', 'probe-colo-supplement.ndjson');
const TO = 'founder@vaultsparkstudios.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 VSUptimeProbe/2.0';
const ALERT_WINDOW_MS = 6 * 60 * 60 * 1000;

// Unchallenged content origin (Pages) — true build/content availability.
const ORIGIN = process.env.PAGES_ORIGIN || 'https://vaultsparkstudios-website.pages.dev';
// Production custom domain — used for the edge-liveness signal + informational HTML probe.
const PROD = process.env.PROD_ORIGIN || 'https://vaultsparkstudios.com';
// JSON path on PROD that is NOT bot-challenged → proves DNS+CF+Worker chain is live.
const LIVENESS_PATH = process.env.LIVENESS_PATH || '/api/founder-presence.json';

const ROUTES = ['/', '/games/', '/vault-member/', '/membership/', '/status/'];

// Timeouts: origin/liveness are real signals (generous); the informational edge
// HTML probe is short because it is expected to hang on the bot-challenge from CI.
const ORIGIN_TIMEOUT_MS = 15000;
const LIVENESS_TIMEOUT_MS = 12000;
const EDGE_INFO_TIMEOUT_MS = 6000;

async function probeOnce(target, accept, timeoutMs) {
  const t0 = Date.now();
  try {
    const res = await fetch(target, {
      headers: { 'user-agent': UA, accept },
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    });
    return { status: res.status, ms: Date.now() - t0, ok: res.status === 200 };
  } catch (e) {
    return { status: 0, ms: Date.now() - t0, ok: false, error: String(e.message || e).slice(0, 120) };
  }
}

// S183 (audit #10) — edge HTML failure-shape probe. The plain edge probe only
// recorded status; it could not tell a (harmless, expected) Cloudflare bot
// challenge apart from a (page-worthy) Worker/origin error on the apex HTML
// path — the exact blind spot that nearly hid the S179 self-loop outage. This
// reads a small body snippet so classifyEdge() can disambiguate by content.
async function probeEdgeHtml(target, timeoutMs) {
  const t0 = Date.now();
  try {
    const res = await fetch(target, {
      headers: { 'user-agent': UA, accept: 'text/html' },
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    });
    let body = '';
    try { body = (await res.text()).slice(0, 4096); } catch { /* body unreadable */ }
    return { status: res.status, ms: Date.now() - t0, body };
  } catch (e) {
    return { status: 0, ms: Date.now() - t0, body: '', error: String(e.message || e).slice(0, 120) };
  }
}

// One retry on network-level failure (status 0) for the real signals — a flapping
// local network must not page the founder; a real outage fails both attempts.
async function probeReal(target, accept, timeoutMs) {
  const first = await probeOnce(target, accept, timeoutMs);
  if (first.ok || first.status !== 0) return first;
  return probeOnce(target, accept, timeoutMs);
}

// ---------------------------------------------------------------------------
// Pure logic (unit-tested) — classification + alert gating.
// A route's health is defined by CONTENT availability (origin). The edge HTML
// status is informational and never affects `ok` or alerts.
// ---------------------------------------------------------------------------

// S183 (audit #10) — classify an edge-HTML response by SHAPE, not just status,
// so a Cloudflare bot challenge (expected from CI; site is up) is never confused
// with a real Worker/origin error on the apex HTML path (page-worthy). Cloudflare
// challenges can themselves return 403 OR 503, so status alone is ambiguous —
// the body markers are what disambiguate. Returns:
//   'served'      — real VaultSpark HTML reached (definitively up)
//   'challenged'  — CF bot/JS challenge interstitial (expected from datacenter)
//   'error'       — a genuine 5xx from the Worker/origin (NOT a challenge)
//   'unreachable' — no response (status 0): a CI challenge-hang or a real down;
//                   ambiguous from datacenter, so treated as informational
//   'other'       — anything else (e.g. 3xx/4xx that isn't a challenge)
const CHALLENGE_MARKERS = /just a moment|cf[-_]chl|challenge[-_]platform|__cf_chl|cf-mitigated|attention required|enable javascript and cookies|cdn-cgi\/challenge/i;
const VS_CONTENT_MARKERS = /vaultspark|vsx-|data-vs-|forge-letter|site-header/i;

export function classifyEdge(status, body = '') {
  if (status === 0) return 'unreachable';
  if (CHALLENGE_MARKERS.test(body)) return 'challenged';
  if (status === 403) return 'challenged';            // CF challenge with empty/unreadable body
  if (status >= 500) return 'error';                  // real 5xx without challenge markers
  if (status === 200) return VS_CONTENT_MARKERS.test(body) ? 'served' : 'challenged';
  return 'other';
}

// True only for the narrow blind-spot the apex HTML probe exists to catch: the
// edge HTML path returns a genuine error while origin content AND edge liveness
// (the same Worker's JSON path) are both healthy — i.e. the Worker's HTML
// processing alone is broken (the S179 shape). A challenge/unreachable never
// trips this, so datacenter false-positives can't reach the founder.
export function edgeHtmlBroken(routes, liveness) {
  if (!liveness.ok) return false;                     // a dead prod chain is already 'edge-degraded'
  if (routes.some((r) => !r.ok)) return false;        // content problems are already 'degraded'/'down'
  return routes.some((r) => r.edge && r.edge.shape === 'error');
}

export function summarize(routes, liveness) {
  const contentDown = routes.filter((r) => !r.ok).length;
  const htmlBroken = edgeHtmlBroken(routes, liveness);
  let overall;
  if (!liveness.ok && contentDown === routes.length) overall = 'down';
  else if (!liveness.ok) overall = 'edge-degraded';      // origin serves content, prod chain does not
  else if (contentDown === routes.length) overall = 'down';
  else if (contentDown > 0) overall = 'degraded';
  else if (htmlBroken) overall = 'edge-degraded';        // S183: API+content alive, apex HTML 5xxing
  else overall = 'up';
  return {
    schemaVersion: '2.0',
    generatedAt: new Date().toISOString(),
    generatedBy: 'scripts/probe-uptime.mjs',
    overall,
    liveness,
    routes,
    note:
      'Edge HTML nav on the production domain is bot-challenged for datacenter/CI clients; ' +
      'a per-route `edge.shape` of `challenged`/`unreachable` is informational only. A `served` ' +
      'shape confirms real content; an `error` shape (genuine 5xx, not a challenge) while content ' +
      '+ liveness are healthy is the one apex-HTML failure the probe now pages on (S179 shape). ' +
      'Availability is judged by origin content (Pages, unchallenged) + edge liveness (a JSON path).',
  };
}

// Rolling availability stats from the committed history (unit-tested). `up` is the
// only green state; degraded/edge-degraded/down all count against availability so
// the public number never overstates. Drives the /status/ uptime tile.
export function rollup(rows) {
  const checks = rows.length;
  if (!checks) return { checks: 0, upPct: null, lastIncidentAt: null, lastIncidentState: null };
  const up = rows.filter((r) => r.overall === 'up').length;
  const incidents = rows.filter((r) => r.overall !== 'up');
  const last = incidents[incidents.length - 1] || null;
  return {
    checks,
    upPct: Math.round((up / checks) * 1000) / 10,
    lastIncidentAt: last ? last.t || null : null,
    lastIncidentState: last ? last.overall : null,
  };
}

// Real, page-worthy failures only: a content route that is down, or edge liveness down.
// The informational edge-HTML challenge state is deliberately excluded.
export function dueAlerts(routes, liveness, sent, now = Date.now()) {
  const signals = [];
  if (!liveness.ok) signals.push({ key: `liveness:${liveness.status}`, label: `edge liveness ${LIVENESS_PATH}`, status: liveness.status, ms: liveness.ms, error: liveness.error });
  for (const r of routes) {
    if (r.ok) continue;
    signals.push({ key: `origin:${r.route}:${r.status}`, label: `content ${r.route}`, status: r.status, ms: r.ms, error: r.origin?.error });
  }
  // S183 (audit #10): the apex HTML path is broken (genuine 5xx, not a challenge)
  // while content + liveness are healthy — the S179 self-loop shape that the
  // origin/liveness signals alone could not see. Page on it.
  if (edgeHtmlBroken(routes, liveness)) {
    for (const r of routes) {
      if (r.edge && r.edge.shape === 'error') {
        signals.push({ key: `edge-html:${r.route}:${r.edge.status}`, label: `apex HTML ${r.route} (Worker HTML path)`, status: r.edge.status, ms: r.edge.ms, error: 'edge 5xx while content+liveness healthy' });
      }
    }
  }
  return signals.filter((s) => now - (sent[s.key] || 0) >= ALERT_WINDOW_MS);
}

// Pure formatting (unit-tested) — turn due signals into the exact email we'd send.
// Exposed so the alert path can be proven (`--simulate-failure`) without sending.
export function formatAlert(due, now = new Date()) {
  const lines = due.map((d) => `  ${d.label} → ${d.status === 0 ? `FETCH FAIL (${d.error || 'no response'})` : `HTTP ${d.status}`} after ${d.ms}ms`);
  return {
    from: 'VaultSpark Sentinel <sentinel@vaultsparkstudios.com>',
    to: [TO],
    subject: `Uptime: ${due.length} real failure(s) on vaultsparkstudios.com`,
    text:
      `First-party uptime probe — REAL failures (${now.toISOString()}):\n\n${lines.join('\n')}\n\n` +
      `These are content-origin or edge-liveness failures, not the expected bot-challenge on HTML nav.\n` +
      `Dashboard: ${PROD}/status/\n` +
      `Worker DR layer serves stale HTML on double-5xx — check wrangler tail if sustained.`,
  };
}

async function sendAlert(due) {
  let key = null;
  try {
    const { getSecret } = await import('./lib/secrets.mjs');
    key = getSecret('RESEND_API_KEY', 'resend.email');
  } catch { /* gateway unavailable */ }
  if (!key) key = process.env.RESEND_API_KEY || null;
  if (!key) { console.error('  ⚠ RESEND_API_KEY unavailable — alert not sent'); return false; }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify(formatAlert(due)),
  });
  return res.ok;
}

// --simulate-failure: prove the alert path end-to-end without paging the founder.
// Injects a synthetic outage (one content route down + edge liveness down), runs
// the real dueAlerts gate + formatAlert, and prints the exact email that WOULD
// send. Never sends, never writes the dedup ledger. The down path becomes evidence
// instead of an act of faith.
export function simulateFailure() {
  const routes = [
    { route: '/', status: 200, ms: 110, ok: true, edge: { status: 0, ms: 50, note: 'edge-challenged' } },
    { route: '/games/', status: 503, ms: 90, ok: false, origin: { error: 'HTTP 503' }, edge: { status: 0, ms: 50, note: 'edge-challenged' } },
  ];
  const liveness = { endpoint: LIVENESS_PATH, status: 0, ms: 12000, ok: false, error: 'timeout' };
  const summary = summarize(routes, liveness);
  const due = dueAlerts(routes, liveness, {}, Date.now());
  const email = formatAlert(due);
  console.log('── SIMULATED FAILURE (no email sent) ─────────────────────────');
  console.log(`overall: ${summary.overall}`);
  console.log(`due signals: ${due.length}`);
  console.log(`subject: ${email.subject}`);
  console.log(`to: ${email.to.join(', ')}\n`);
  console.log(email.text);
  console.log('──────────────────────────────────────────────────────────────');
  const ok = due.length === 2 && summary.overall !== 'up' && /503/.test(email.text);
  console.log(`alert-path proof: ${ok ? 'PASS' : 'FAIL'} — ${summary.overall} state produced ${due.length} due signal(s) + a formatted email`);
  process.exit(ok ? 0 : 1);
}

function selfTest() {
  const up = (route) => ({ route, status: 200, ms: 100, ok: true, edge: { status: 0, ms: 50, note: 'edge-challenged' } });
  const downR = (route) => ({ route, status: 503, ms: 80, ok: false, edge: { status: 0, ms: 50, note: 'edge-challenged' } });
  const liveOk = { endpoint: LIVENESS_PATH, status: 200, ms: 90, ok: true };
  const liveBad = { endpoint: LIVENESS_PATH, status: 0, ms: 12000, ok: false, error: 'timeout' };
  const now = Date.now();

  const allUp = [up('/'), up('/games/')];
  const oneDown = [up('/'), downR('/games/')];
  const allDown = [downR('/'), downR('/games/')];

  const cases = [
    ['up when content + liveness ok (edge challenge ignored)', summarize(allUp, liveOk).overall === 'up'],
    ['degraded when one content route down', summarize(oneDown, liveOk).overall === 'degraded'],
    ['down when all content down + liveness down', summarize(allDown, liveBad).overall === 'down'],
    ['edge-degraded when content ok but liveness down', summarize(allUp, liveBad).overall === 'edge-degraded'],
    ['edge challenge alone never changes route.ok', summarize(allUp, liveOk).routes.every((r) => r.ok)],
    ['alert due for down content route when never sent', dueAlerts(oneDown, liveOk, {}, now).length === 1],
    ['alert due for liveness failure', dueAlerts(allUp, liveBad, {}, now).length === 1],
    ['no alert when everything healthy (challenge excluded)', dueAlerts(allUp, liveOk, {}, now).length === 0],
    ['alert deduped inside 6h window', dueAlerts(oneDown, liveOk, { 'origin:/games/:503': now - 1000 }, now).length === 0],
    ['alert re-fires after window', dueAlerts(oneDown, liveOk, { 'origin:/games/:503': now - ALERT_WINDOW_MS - 1 }, now).length === 1],
    ['formatAlert builds subject + body from due signals', (() => { const e = formatAlert(dueAlerts(oneDown, liveBad, {}, now)); return e.to[0] === TO && /failure/.test(e.subject) && /503/.test(e.text); })()],
    ['rollup computes uptime % from history rows', (() => { const r = rollup([{ overall: 'up' }, { overall: 'up' }, { overall: 'degraded' }, { overall: 'up' }]); return r.checks === 4 && r.upPct === 75; })()],
    ['rollup is 100% with no incidents', rollup([{ overall: 'up' }, { overall: 'up' }]).upPct === 100],
    ['rollup handles empty history', rollup([]).checks === 0 && rollup([]).upPct === null],
    // S183 (audit #10) — edge-shape classification + apex-HTML blind-spot.
    ['classifyEdge: CF challenge body → challenged', classifyEdge(403, '<title>Just a moment...</title>') === 'challenged'],
    ['classifyEdge: 503 with challenge body → challenged (not error)', classifyEdge(503, 'cf-mitigated challenge-platform') === 'challenged'],
    ['classifyEdge: genuine 5xx without challenge → error', classifyEdge(502, 'origin unavailable') === 'error'],
    ['classifyEdge: 200 with VaultSpark content → served', classifyEdge(200, '<header class="site-header">VaultSpark</header>') === 'served'],
    ['classifyEdge: 200 without content markers → challenged (interstitial 200)', classifyEdge(200, '<html>nothing familiar</html>') === 'challenged'],
    ['classifyEdge: no response → unreachable', classifyEdge(0, '') === 'unreachable'],
    ['edgeHtmlBroken: true only when content+liveness ok but edge errors', edgeHtmlBroken([{ ok: true, edge: { shape: 'error' } }], liveOk) === true],
    ['edgeHtmlBroken: false when edge merely challenged', edgeHtmlBroken([{ ok: true, edge: { shape: 'challenged' } }], liveOk) === false],
    ['edgeHtmlBroken: false when liveness down (already edge-degraded)', edgeHtmlBroken([{ ok: true, edge: { shape: 'error' } }], liveBad) === false],
    ['edgeHtmlBroken: false when content also down (already degraded)', edgeHtmlBroken([{ ok: false, edge: { shape: 'error' } }], liveOk) === false],
    ['summarize: apex HTML error (content+liveness ok) → edge-degraded', summarize([{ route: '/', ok: true, edge: { shape: 'error' } }], liveOk).overall === 'edge-degraded'],
    ['summarize: edge challenge alone stays up', summarize([up('/'), up('/games/')].map((r) => ({ ...r, edge: { shape: 'challenged' } })), liveOk).overall === 'up'],
    ['dueAlerts: apex HTML error pages the founder', dueAlerts([{ route: '/', ok: true, edge: { shape: 'error', status: 502, ms: 90 } }], liveOk, {}, now).length === 1],
    ['dueAlerts: apex HTML challenge never pages', dueAlerts([{ route: '/', ok: true, edge: { shape: 'challenged', status: 403, ms: 90 } }], liveOk, {}, now).length === 0],
  ];
  let pass = 0;
  for (const [name, ok] of cases) { if (ok) pass += 1; else console.error(`  ✗ ${name}`); }
  console.log(`probe-uptime self-test: ${pass}/${cases.length} passing`);
  process.exit(pass === cases.length ? 0 : 1);
}

// Importable: CLI dispatches + the live probe only run when this file is executed
// directly, so gates/tests can `import { summarize, rollup, formatAlert }` (even
// while passing their OWN --self-test flag) without firing the probe's self-test,
// a real network probe, or an alert. Node 24 exposes import.meta.main.
const RUN_DIRECT = import.meta.main ?? process.argv[1]?.endsWith('probe-uptime.mjs');
if (RUN_DIRECT && process.argv.includes('--self-test')) selfTest();
if (RUN_DIRECT && process.argv.includes('--simulate-failure')) simulateFailure();

// Colo probe — measure TTFB from this runner to the CF edge; record colo + country
// so build-geo-vitals.mjs can supplement thin EU samples.
if (RUN_DIRECT && COLO_PROBE) {
  const CF_TRACE = 'https://speed.cloudflare.com/cdn-cgi/trace';
  const t0 = Date.now();
  try {
    const res = await fetch(CF_TRACE, { signal: AbortSignal.timeout(8000) });
    const ttfb = Date.now() - t0;
    const text = await res.text();
    const colo = (text.match(/colo=([A-Z]+)/) || [])[1] || 'UNK';
    const loc = (text.match(/loc=([A-Z]+)/) || [])[1] || 'US';
    const row = JSON.stringify({ ts: new Date().toISOString(), colo, country: loc, ttfb, source: 'colo-probe', synthetic: true });
    fs.mkdirSync(path.dirname(COLO_SUPPLEMENT), { recursive: true });
    const prev = fs.existsSync(COLO_SUPPLEMENT) ? fs.readFileSync(COLO_SUPPLEMENT, 'utf8').split('\n').filter(Boolean).slice(-48) : [];
    fs.writeFileSync(COLO_SUPPLEMENT, [...prev, row].join('\n') + '\n');
    console.log(`colo-probe: colo=${colo} country=${loc} ttfb=${ttfb}ms → .cache/probe-colo-supplement.ndjson`);
  } catch (e) {
    console.error('colo-probe failed:', e.message);
  }
  process.exit(0);
}

if (RUN_DIRECT) {
// Live probe ---------------------------------------------------------------
const routeResults = [];
for (const route of ROUTES) {
  const origin = await probeReal(`${ORIGIN}${route}`, 'text/html', ORIGIN_TIMEOUT_MS);
  // The production-domain HTML request, now shape-classified (S183 audit #10):
  // challenge/unreachable stay informational; a genuine 5xx becomes page-worthy.
  const edgeRaw = await probeEdgeHtml(`${PROD}${route}`, EDGE_INFO_TIMEOUT_MS);
  const shape = classifyEdge(edgeRaw.status, edgeRaw.body);
  const edge = {
    status: edgeRaw.status,
    ms: edgeRaw.ms,
    shape,
    note:
      shape === 'served' ? 'served (real content reached)'
      : shape === 'error' ? 'edge 5xx — genuine Worker/origin error (page-worthy)'
      : shape === 'challenged' ? 'edge-challenged (informational; real browsers pass)'
      : shape === 'unreachable' ? 'no response (challenge-hang or down; informational)'
      : 'other (informational)',
  };
  routeResults.push({ route, status: origin.status, ms: origin.ms, ok: origin.ok, origin, edge });
}

const liveRaw = await probeReal(`${PROD}${LIVENESS_PATH}`, 'application/json', LIVENESS_TIMEOUT_MS);
const liveness = { endpoint: LIVENESS_PATH, status: liveRaw.status, ms: liveRaw.ms, ok: liveRaw.ok, ...(liveRaw.error ? { error: liveRaw.error } : {}) };

const summary = summarize(routeResults, liveness);
for (const r of routeResults) {
  console.log(`  ${r.ok ? '✓' : '✗'} content ${r.route} ${r.status} ${r.ms}ms  ·  edge ${r.edge.status} (${r.edge.note.split(' ')[0]})`);
}
console.log(`  ${liveness.ok ? '✓' : '✗'} liveness ${liveness.endpoint} ${liveness.status} ${liveness.ms}ms`);

// History: append a compact row so /status/ can show a real availability number.
// Low-churn rule — only record (and therefore commit) when something worth showing
// changed: a new hour bucket, a state change, or any non-`up` incident. A healthy
// site inside the same hour produces no new row, so the cron does not spam git.
const prevHistory = (() => {
  try { return fs.readFileSync(HISTORY, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); }
  catch { return []; }
})();
const last = prevHistory[prevHistory.length - 1] || null;
const hourBucket = summary.generatedAt.slice(0, 13); // YYYY-MM-DDTHH
const newHourBucket = !last || (last.t || '').slice(0, 13) !== hourBucket;
const stateChanged = !last || last.overall !== summary.overall;
const isIncident = summary.overall !== 'up';
const shouldRecord = newHourBucket || stateChanged || isIncident;

let history = prevHistory;
if (shouldRecord) {
  const row = {
    t: summary.generatedAt,
    overall: summary.overall,
    livenessMs: liveness.ms,
    down: routeResults.filter((r) => !r.ok).length,
  };
  history = [...prevHistory, row].slice(-HISTORY_CAP);
}
summary.rollup = rollup(history);

if (DRY) {
  console.log(`dry-run · overall=${summary.overall} · upPct(30d)=${summary.rollup.upPct ?? 'n/a'} · record=${shouldRecord}`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(summary, null, 2) + '\n');
console.log(`probe-uptime → api/uptime.json (overall=${summary.overall} · upPct30d=${summary.rollup.upPct ?? 'n/a'})`);

if (shouldRecord) {
  fs.mkdirSync(path.dirname(HISTORY), { recursive: true });
  fs.writeFileSync(HISTORY, history.map((r) => JSON.stringify(r)).join('\n') + '\n');
  console.log(`  + history row (${history.length} total) — commit-worthy`);
}
// Signal to the workflow whether a commit is worthwhile (keeps git history clean).
fs.mkdirSync(path.dirname(COMMIT_FLAG), { recursive: true });
fs.writeFileSync(COMMIT_FLAG, shouldRecord ? '1' : '0');

const sent = (() => { try { return JSON.parse(fs.readFileSync(SENT, 'utf8')); } catch { return {}; } })();
const due = dueAlerts(routeResults, liveness, sent);
if (due.length) {
  const ok = await sendAlert(due);
  if (ok) {
    for (const d of due) sent[d.key] = Date.now();
    fs.mkdirSync(path.dirname(SENT), { recursive: true });
    fs.writeFileSync(SENT, JSON.stringify(sent, null, 2) + '\n');
    console.log(`  ✉ alerted founder on ${due.length} real failure(s)`);
  }
}
// Exit non-zero on any real availability problem so the run history reflects it.
// `up` is the only green state. `degraded`/`edge-degraded`/`down` are all real
// failures (content route or prod-chain). The bot-challenge can never reach here
// because it is informational and excluded from `overall`.
process.exit(summary.overall === 'up' ? 0 : 1);
}
