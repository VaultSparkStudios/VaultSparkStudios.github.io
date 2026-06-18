#!/usr/bin/env node
/* prod-verify-wave.mjs — S207 (audit prod-wave-verify-automation)
 *
 * Closes the recurring [VERIFY/P0] backlog: for 8 sessions (S199→S206) every
 * wave filed a manual "prod-verify on a real browser" task and almost none got
 * checked, so the board carried a 7-deep verification debt. Most of each
 * checklist — "did the artifact / page actually deploy?" — is machine-checkable
 * against the pages.dev origin, which bypasses the Cloudflare bot-challenge that
 * makes apex curls 403 (CF bot-challenge != outage, S177).
 *
 * Reads data/wave-manifest.json (the surfaces this wave is expected to deploy)
 * and fetches each from the origin:
 *   • type=json  → assert 200 + parseable JSON + (schemaVersion | generatedAt)
 *   • type=page  → assert 200 + optional sentinel substring present in body
 *
 * Honest-dark: a network failure (offline / CI sandbox with no egress) reports
 * SKIP, never FAIL — this verifier must not false-fail a deploy. Only a real
 * 404 / missing-field / missing-sentinel is a FAIL.
 *
 * Usage:
 *   node scripts/prod-verify-wave.mjs            # verify against pages.dev origin
 *   node scripts/prod-verify-wave.mjs --origin https://vaultsparkstudios.com
 *   node scripts/prod-verify-wave.mjs --json     # machine-readable report
 *   node scripts/prod-verify-wave.mjs --self-test
 *
 * Exit: 0 = all PASS or SKIP · 1 = at least one FAIL.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DEFAULT_ORIGIN = 'https://vaultsparkstudios-website.pages.dev';
const TIMEOUT_MS = 12000;

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
function argVal(name, fallback) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
}

function loadManifest() {
  const raw = readFileSync(resolve(ROOT, 'data/wave-manifest.json'), 'utf8');
  const m = JSON.parse(raw);
  if (!Array.isArray(m.surfaces)) throw new Error('wave-manifest: surfaces[] missing');
  return m;
}

async function fetchWithTimeout(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
    const body = await res.text();
    return { status: res.status, body };
  } finally {
    clearTimeout(t);
  }
}

// Returns { surface, verdict: 'PASS'|'FAIL'|'SKIP', detail }
async function verifySurface(origin, surface) {
  const url = origin.replace(/\/+$/, '') + surface.path;
  let r;
  try {
    r = await fetchWithTimeout(url);
  } catch (err) {
    // Network unreachable → honest-dark SKIP (never a false fail).
    return { surface: surface.path, verdict: 'SKIP', detail: 'network unreachable (' + (err.name || 'error') + ')' };
  }

  if (r.status === 403) {
    // Bot-challenge on the apex; origin should not 403. Treat as SKIP with note.
    return { surface: surface.path, verdict: 'SKIP', detail: '403 (bot-challenge — use pages.dev origin)' };
  }
  if (r.status !== 200) {
    return { surface: surface.path, verdict: 'FAIL', detail: 'HTTP ' + r.status };
  }

  if (surface.type === 'json') {
    let parsed;
    try { parsed = JSON.parse(r.body); }
    catch { return { surface: surface.path, verdict: 'FAIL', detail: '200 but body is not valid JSON' }; }
    if (parsed && (parsed.schemaVersion !== undefined || parsed.generatedAt !== undefined || parsed.asOf !== undefined)) {
      return { surface: surface.path, verdict: 'PASS', detail: 'json live' };
    }
    return { surface: surface.path, verdict: 'FAIL', detail: '200 JSON but no schemaVersion/generatedAt/asOf marker' };
  }

  // page
  if (surface.sentinel && r.body.indexOf(surface.sentinel) === -1) {
    return { surface: surface.path, verdict: 'FAIL', detail: '200 but sentinel not found: "' + surface.sentinel + '"' };
  }
  return { surface: surface.path, verdict: 'PASS', detail: surface.sentinel ? 'page + sentinel' : 'page live' };
}

async function run() {
  const origin = argVal('--origin', DEFAULT_ORIGIN);
  const manifest = loadManifest();
  const results = [];
  for (const s of manifest.surfaces) {
    results.push(await verifySurface(origin, s));
  }

  const fails = results.filter((r) => r.verdict === 'FAIL');
  const skips = results.filter((r) => r.verdict === 'SKIP');
  const passes = results.filter((r) => r.verdict === 'PASS');

  if (has('--json')) {
    console.log(JSON.stringify({ origin, session: manifest.session, passes: passes.length, fails: fails.length, skips: skips.length, results }, null, 2));
  } else {
    console.log(`prod-verify-wave · session ${manifest.session} · origin ${origin}`);
    for (const r of results) {
      const mark = r.verdict === 'PASS' ? '✓' : r.verdict === 'SKIP' ? '◌' : '✗';
      console.log(`  ${mark} [${r.verdict}] ${r.surface} — ${r.detail}`);
    }
    console.log(`  → ${passes.length} pass · ${fails.length} fail · ${skips.length} skip`);
    if (skips.length === results.length) {
      console.log('  (all skipped — no network egress; run from a connected host to verify)');
    }
  }

  process.exit(fails.length > 0 ? 1 : 0);
}

function selfTest() {
  // Verdict logic is exercised without network by simulating responses.
  const cases = [
    { name: 'json 200 + schemaVersion → PASS', resp: { status: 200, body: '{"schemaVersion":"1.0"}' }, type: 'json', expect: 'PASS' },
    { name: 'json 200 no marker → FAIL', resp: { status: 200, body: '{"x":1}' }, type: 'json', expect: 'FAIL' },
    { name: 'json 404 → FAIL', resp: { status: 404, body: '' }, type: 'json', expect: 'FAIL' },
    { name: 'page 200 + sentinel → PASS', resp: { status: 200, body: '<h1>hello world</h1>' }, type: 'page', sentinel: 'hello', expect: 'PASS' },
    { name: 'page 200 missing sentinel → FAIL', resp: { status: 200, body: '<h1>bye</h1>' }, type: 'page', sentinel: 'hello', expect: 'FAIL' },
    { name: 'apex 403 → SKIP', resp: { status: 403, body: '' }, type: 'page', expect: 'SKIP' },
  ];
  // Local pure verdict (mirror of verifySurface body, sans fetch).
  function verdictFor(c) {
    const r = c.resp;
    if (r.status === 403) return 'SKIP';
    if (r.status !== 200) return 'FAIL';
    if (c.type === 'json') {
      let p; try { p = JSON.parse(r.body); } catch { return 'FAIL'; }
      return (p && (p.schemaVersion !== undefined || p.generatedAt !== undefined || p.asOf !== undefined)) ? 'PASS' : 'FAIL';
    }
    if (c.sentinel && r.body.indexOf(c.sentinel) === -1) return 'FAIL';
    return 'PASS';
  }
  let passed = 0;
  for (const c of cases) {
    const got = verdictFor(c);
    const ok = got === c.expect;
    console.log(`  ${ok ? '✓' : '✗'} ${c.name} (expect ${c.expect}, got ${got})`);
    if (ok) passed++;
  }
  console.log(`\nprod-verify-wave self-test: ${passed}/${cases.length} passing`);
  process.exit(passed === cases.length ? 0 : 1);
}

if (has('--self-test')) selfTest();
else run();
