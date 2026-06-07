#!/usr/bin/env node
/**
 * probe-uptime.mjs (S176 #6 · uptime-probe-firstparty)
 *
 * First-party availability monitoring. The founder's 2026-06-07 503s on
 * /games/ + /vault-member/ were invisible to us — failed page loads never
 * beacon RUM, and the uptimerobot credential is MISSING (free-build bias:
 * build it first-party). A GH Actions cron runs this every 30 minutes with a
 * browser UA (curl-class UAs get the CF bot challenge), writes
 * api/uptime.json, and emails the founder via Resend on any non-200.
 *
 * Dedup: .cache/uptime-alerts-sent.json — one alert per route+status per
 * 6h window so a sustained outage doesn't spam.
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
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 VSUptimeProbe/1.0';
const ALERT_WINDOW_MS = 6 * 60 * 60 * 1000;

const ROUTES = [
  '/',
  '/games/',
  '/vault-member/',
  '/membership/',
  '/status/',
  '/api/founder-presence.json',
];

export function summarize(results) {
  const failing = results.filter((r) => !r.ok);
  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    generatedBy: 'scripts/probe-uptime.mjs',
    overall: failing.length === 0 ? 'up' : (failing.length === results.length ? 'down' : 'degraded'),
    routes: results,
  };
}

export function dueAlerts(results, sent, now = Date.now()) {
  const due = [];
  for (const r of results) {
    if (r.ok) continue;
    const key = `${r.route}:${r.status}`;
    const last = sent[key] || 0;
    if (now - last >= ALERT_WINDOW_MS) due.push({ key, ...r });
  }
  return due;
}

async function probeOnce(route, timeoutMs) {
  const target = `https://vaultsparkstudios.com${route}`;
  const t0 = Date.now();
  try {
    const res = await fetch(target, {
      headers: { 'user-agent': UA, accept: route.endsWith('.json') ? 'application/json' : 'text/html' },
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    });
    return { route, status: res.status, ms: Date.now() - t0, ok: res.status === 200 };
  } catch (e) {
    return { route, status: 0, ms: Date.now() - t0, ok: false, error: String(e.message || e).slice(0, 120) };
  }
}

// One retry on network-level failure (status 0) — a flapping local network
// must not page the founder; a real outage fails both attempts.
async function probe(route) {
  const first = await probeOnce(route, 30000);
  if (first.ok || first.status !== 0) return first;
  const second = await probeOnce(route, 30000);
  return second.ok ? second : { ...second, retried: true };
}

async function sendAlert(due) {
  let key = null;
  try {
    const { getSecret } = await import('./lib/secrets.mjs');
    key = getSecret('RESEND_API_KEY', 'resend.email');
  } catch { /* gateway unavailable */ }
  if (!key) key = process.env.RESEND_API_KEY || null;
  if (!key) { console.error('  ⚠ RESEND_API_KEY unavailable — alert not sent'); return false; }
  const lines = due.map((d) => `  ${d.route} → ${d.status === 0 ? `FETCH FAIL (${d.error})` : `HTTP ${d.status}`} after ${d.ms}ms`);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: 'VaultSpark Sentinel <sentinel@vaultsparkstudios.com>',
      to: [TO],
      subject: `Uptime probe: ${due.length} route(s) failing on vaultsparkstudios.com`,
      text: `First-party uptime probe failures (${new Date().toISOString()}):\n\n${lines.join('\n')}\n\nDashboard: https://vaultsparkstudios.com/status/\nWorker DR layer serves stale HTML on double-5xx — check wrangler tail if sustained.`,
    }),
  });
  return res.ok;
}

function selfTest() {
  const results = [
    { route: '/', status: 200, ms: 100, ok: true },
    { route: '/games/', status: 503, ms: 80, ok: false },
  ];
  const s = summarize(results);
  const now = Date.now();
  const cases = [
    ['degraded when one fails', s.overall === 'degraded'],
    ['up when all pass', summarize([results[0]]).overall === 'up'],
    ['down when all fail', summarize([results[1]]).overall === 'down'],
    ['alert due when never sent', dueAlerts(results, {}, now).length === 1],
    ['alert deduped inside window', dueAlerts(results, { '/games/:503': now - 1000 }, now).length === 0],
    ['alert re-fires after window', dueAlerts(results, { '/games/:503': now - ALERT_WINDOW_MS - 1 }, now).length === 1],
  ];
  let pass = 0;
  for (const [name, ok] of cases) { if (ok) pass += 1; else console.error(`  ✗ ${name}`); }
  console.log(`probe-uptime self-test: ${pass}/${cases.length} passing`);
  process.exit(pass === cases.length ? 0 : 1);
}

if (process.argv.includes('--self-test')) selfTest();

const results = [];
for (const route of ROUTES) results.push(await probe(route));
const summary = summarize(results);
for (const r of results) console.log(`  ${r.ok ? '✓' : '✗'} ${r.route} ${r.status} ${r.ms}ms${r.error ? ' · ' + r.error : ''}`);

if (DRY) {
  console.log(`dry-run · overall=${summary.overall}`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(summary, null, 2) + '\n');
console.log(`probe-uptime → api/uptime.json (overall=${summary.overall})`);

const sent = (() => { try { return JSON.parse(fs.readFileSync(SENT, 'utf8')); } catch { return {}; } })();
const due = dueAlerts(results, sent);
if (due.length) {
  const ok = await sendAlert(due);
  if (ok) {
    for (const d of due) sent[d.key] = Date.now();
    fs.mkdirSync(path.dirname(SENT), { recursive: true });
    fs.writeFileSync(SENT, JSON.stringify(sent, null, 2) + '\n');
    console.log(`  ✉ alerted founder on ${due.length} failing route(s)`);
  }
}
process.exit(summary.overall === 'up' ? 0 : 1);
