#!/usr/bin/env node
/**
 * check-ignis-spend — read today's IGNIS spend from Supabase ignis_spend_today view.
 *
 * Output (one line, suitable for the brief SIGNALS block):
 *   $0.42 today · $1.18 MTD · 12% of cap · ok | warn | capped | paused
 *
 * Modes:
 *   --json      machine-readable
 *   --terse     one-line for SIGNALS (default)
 *   --table     full per-function breakdown
 *
 * Fail-soft: if Supabase is unreachable, prints "spend ?" and exits 0 so
 * render-startup-brief never breaks on this check.
 */

import process from 'node:process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MODE = process.argv.includes('--json') ? 'json'
           : process.argv.includes('--table') ? 'table' : 'terse';

function loadEnv() {
  const env = {};
  for (const path of [resolve(process.cwd(), '.env.local'), resolve(process.cwd(), '.env')]) {
    try {
      const text = readFileSync(path, 'utf8');
      for (const line of text.split('\n')) {
        const m = line.match(/^([A-Z_]+)\s*=\s*"?([^"\n]+)"?$/);
        if (m) env[m[1]] = m[2].trim();
      }
    } catch { /* not present */ }
  }
  return env;
}

const env = loadEnv();
let SUPABASE_URL = process.env.SUPABASE_URL || env.SUPABASE_URL;
let SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

// CANON-012: fall back to the Studio secrets gateway (supabase.admin) so a
// missing local .env doesn't leave the brief perpetually "unmeasured".
if (!SUPABASE_URL || !SERVICE_ROLE) {
  try {
    const { getSecret } = await import('./lib/secrets.mjs');
    SUPABASE_URL = SUPABASE_URL || getSecret('SUPABASE_URL', 'supabase.admin');
    SERVICE_ROLE = SERVICE_ROLE || getSecret('SUPABASE_SERVICE_ROLE_KEY', 'supabase.admin');
  } catch { /* gateway unavailable — fail-soft below */ }
}

function fail(msg) {
  // Honest-dark: always leave a cache snapshot so render-startup-brief shows an
  // honest status ("gateway-unreachable · last checked …") instead of a
  // perpetual "unmeasured — run: …" that misreports an unreachable gateway as
  // never-measured.
  try {
    mkdirSync(resolve(process.cwd(), '.cache'), { recursive: true });
    writeFileSync(
      resolve(process.cwd(), '.cache', 'ignis-spend.json'),
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        status: 'gateway-unreachable',
        reason: msg,
        today_usd: null, cap_usd: null, pct: null,
        overall: 'unmeasured',
        by_function: [],
      }, null, 2)
    );
  } catch { /* non-fatal */ }
  if (MODE === 'json') {
    console.log(JSON.stringify({ ok: false, error: msg, spend: null }));
  } else {
    console.log(`IGNIS spend  ?  (gateway-unreachable: ${msg})`);
  }
  process.exit(0);
}

if (!SUPABASE_URL || !SERVICE_ROLE) { fail('no-creds'); }

let rows;
try {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/ignis_spend_today?select=*`, {
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
  });
  if (!res.ok) { fail(`http-${res.status}`); }
  rows = await res.json();
} catch (err) {
  fail(err.message || 'fetch-failed');
}

if (!Array.isArray(rows)) { fail('bad-shape'); }

const totalToday = rows.reduce((s, r) => s + Number(r.usd_today || 0), 0);
const totalCap = rows.reduce((s, r) => s + Number(r.cap_usd_daily || 0), 0);
const overall = rows.find(r => r.status === 'capped') ? 'capped'
              : rows.find(r => r.status === 'warn')   ? 'warn'
              : rows.find(r => !r.enabled)            ? 'partial'
              : 'ok';
const pct = totalCap ? Math.round((totalToday / totalCap) * 100) : 0;

// Always write a snapshot to .cache/ignis-spend.json so render-startup-brief.mjs
// can pick it up without a network call. Fail-soft if the dir doesn't exist.
try {
  const { mkdirSync, writeFileSync } = await import('node:fs');
  mkdirSync(resolve(process.cwd(), '.cache'), { recursive: true });
  writeFileSync(
    resolve(process.cwd(), '.cache', 'ignis-spend.json'),
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      today_usd: Number(totalToday.toFixed(4)),
      cap_usd: Number(totalCap.toFixed(2)),
      pct,
      overall,
      by_function: rows,
    }, null, 2)
  );
} catch { /* non-fatal */ }

if (MODE === 'json') {
  console.log(JSON.stringify({
    ok: true,
    today_usd: Number(totalToday.toFixed(4)),
    cap_usd: Number(totalCap.toFixed(2)),
    pct,
    overall,
    by_function: rows,
  }, null, 2));
} else if (MODE === 'table') {
  console.log('function                         today    cap     pct   status');
  console.log('────────────────────────────── ─────── ─────── ─────── ──────');
  for (const r of rows) {
    const fn = r.function_name.padEnd(30);
    const today = `$${Number(r.usd_today).toFixed(3)}`.padStart(7);
    const cap = `$${Number(r.cap_usd_daily).toFixed(2)}`.padStart(7);
    const p = `${r.pct_of_cap || 0}%`.padStart(6);
    console.log(`${fn} ${today} ${cap} ${p}  ${r.status}`);
  }
  console.log('────────────────────────────── ─────── ─────── ─────── ──────');
  console.log(`TOTAL                          ${('$' + totalToday.toFixed(3)).padStart(7)} ${('$' + totalCap.toFixed(2)).padStart(7)} ${(pct + '%').padStart(6)}  ${overall}`);
} else {
  // terse: one line for SIGNALS
  const tag = overall === 'ok' ? '✓'
            : overall === 'warn' ? '⚠'
            : overall === 'capped' ? '⛔'
            : '~';
  console.log(`${tag}  IGNIS spend     $${totalToday.toFixed(2)} / $${totalCap.toFixed(2)}  (${pct}%)  ${overall}`);
}
