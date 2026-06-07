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
const SENT = path.join(ROOT, '.cache', 'uptime-alerts-sent.json');
const DRY = process.argv.includes('--dry-run');
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

export function summarize(routes, liveness) {
  const contentDown = routes.filter((r) => !r.ok).length;
  let overall;
  if (!liveness.ok && contentDown === routes.length) overall = 'down';
  else if (!liveness.ok) overall = 'edge-degraded';      // origin serves content, prod chain does not
  else if (contentDown === routes.length) overall = 'down';
  else if (contentDown > 0) overall = 'degraded';
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
      'the per-route `edge` field is informational only. Availability is judged by origin ' +
      'content (Pages, unchallenged) + edge liveness (a JSON path on the production domain).',
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
  return signals.filter((s) => now - (sent[s.key] || 0) >= ALERT_WINDOW_MS);
}

async function sendAlert(due) {
  let key = null;
  try {
    const { getSecret } = await import('./lib/secrets.mjs');
    key = getSecret('RESEND_API_KEY', 'resend.email');
  } catch { /* gateway unavailable */ }
  if (!key) key = process.env.RESEND_API_KEY || null;
  if (!key) { console.error('  ⚠ RESEND_API_KEY unavailable — alert not sent'); return false; }
  const lines = due.map((d) => `  ${d.label} → ${d.status === 0 ? `FETCH FAIL (${d.error || 'no response'})` : `HTTP ${d.status}`} after ${d.ms}ms`);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: 'VaultSpark Sentinel <sentinel@vaultsparkstudios.com>',
      to: [TO],
      subject: `Uptime: ${due.length} real failure(s) on vaultsparkstudios.com`,
      text:
        `First-party uptime probe — REAL failures (${new Date().toISOString()}):\n\n${lines.join('\n')}\n\n` +
        `These are content-origin or edge-liveness failures, not the expected bot-challenge on HTML nav.\n` +
        `Dashboard: ${PROD}/status/\n` +
        `Worker DR layer serves stale HTML on double-5xx — check wrangler tail if sustained.`,
    }),
  });
  return res.ok;
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
  ];
  let pass = 0;
  for (const [name, ok] of cases) { if (ok) pass += 1; else console.error(`  ✗ ${name}`); }
  console.log(`probe-uptime self-test: ${pass}/${cases.length} passing`);
  process.exit(pass === cases.length ? 0 : 1);
}

if (process.argv.includes('--self-test')) selfTest();

// Live probe ---------------------------------------------------------------
const routeResults = [];
for (const route of ROUTES) {
  const origin = await probeReal(`${ORIGIN}${route}`, 'text/html', ORIGIN_TIMEOUT_MS);
  // Informational only: the production-domain HTML request (bot-challenged from CI).
  const edgeRaw = await probeOnce(`${PROD}${route}`, 'text/html', EDGE_INFO_TIMEOUT_MS);
  const edge = {
    status: edgeRaw.status,
    ms: edgeRaw.ms,
    note: edgeRaw.ok ? 'served' : 'edge-challenged-or-down (informational; real browsers pass)',
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

if (DRY) {
  console.log(`dry-run · overall=${summary.overall}`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(summary, null, 2) + '\n');
console.log(`probe-uptime → api/uptime.json (overall=${summary.overall})`);

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
