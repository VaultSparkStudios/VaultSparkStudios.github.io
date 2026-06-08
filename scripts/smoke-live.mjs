#!/usr/bin/env node
/**
 * smoke-live.mjs — post-deploy liveness gate (CI-safe).
 *
 * Guards the failure class behind the 2026-06-08 outage: a Worker that deploys
 * "successfully" but hangs / self-loops and serves nothing, while CI stays green.
 *
 * CI runs from a datacenter IP, where Cloudflare bot-challenges prod HTML *nav*
 * requests with a fast 403 *before they reach the Worker* (see probe-uptime.mjs).
 * So an HTML-200 assertion would false-fail on every CI run. Instead this gate
 * uses two signals that ARE reliable from a datacenter, matching the proven
 * uptime probe:
 *
 *   1. CONTENT  — fetch the unchallenged Pages origin (*.pages.dev). A 200 + a
 *      known marker proves the deploy/build actually serves the site.
 *   2. EDGE     — fetch the production custom domain. The Worker self-loop made
 *      this HANG (no response). A FAST response means the DNS→CF→Worker chain is
 *      alive — even a bot-challenge 403 counts as alive. Only a hang/timeout or a
 *      5xx fails the gate. This is the symptom that distinguishes "down" from the
 *      benign bot-challenge.
 *
 * Exit non-zero on failure so CI goes RED (→ GitHub notifies) instead of
 * green-while-down.
 *
 * Usage:
 *   node scripts/smoke-live.mjs
 *   node scripts/smoke-live.mjs --origin=https://...pages.dev --prod=https://vaultsparkstudios.com
 *   node scripts/smoke-live.mjs --self-test
 */

const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const hit = args.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : dflt;
};

const ORIGIN = flag('--origin', 'https://vaultsparkstudios-website.pages.dev').replace(/\/$/, '');
const PROD = flag('--prod', flag('--base', 'https://vaultsparkstudios.com')).replace(/\/$/, '');
const CONTENT_ROUTES = flag('--content-routes', '/,/membership/').split(',').filter(Boolean);
const EDGE_ROUTES = flag('--edge-routes', '/,/api/founder-presence.json').split(',').filter(Boolean);
const MARKER = flag('--marker', 'VaultSpark');
const MIN_BYTES = Number(flag('--min-bytes', '1000'));
const TIMEOUT_MS = Number(flag('--timeout-ms', '12000'));
const MAX_ATTEMPTS = Number(flag('--attempts', '4'));
const BACKOFF_MS = Number(flag('--backoff-ms', '4000'));
const SELF_TEST = args.includes('--self-test');

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchOnce(url, wantBody) {
  const started = Date.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS, redirect: 'follow', signal: ctrl.signal });
    const body = wantBody ? await res.text() : '';
    return { status: res.status, bytes: body.length, body, ms: Date.now() - started };
  } catch (e) {
    return { status: 0, bytes: 0, body: '', ms: Date.now() - started, error: e.name === 'AbortError' ? `hang >${TIMEOUT_MS}ms` : e.message };
  } finally {
    clearTimeout(t);
  }
}

// CONTENT: strict — 200 + non-trivial body + marker.
function judgeContent(r) {
  if (r.status !== 200) return { ok: false, reason: r.error || `HTTP ${r.status}` };
  if (r.bytes < MIN_BYTES) return { ok: false, reason: `body ${r.bytes}B < ${MIN_BYTES}B` };
  if (MARKER && !r.body.includes(MARKER)) return { ok: false, reason: `marker "${MARKER}" absent` };
  return { ok: true, reason: `200 ${r.bytes}B` };
}

// EDGE: alive iff it RESPONDED fast with status < 500. Hang (0) / 5xx = down.
// A bot-challenge 403 is "alive" — the edge answered. This is the self-loop guard.
function judgeEdge(r) {
  if (r.status === 0) return { ok: false, reason: r.error || 'no response' };
  if (r.status >= 500) return { ok: false, reason: `HTTP ${r.status}` };
  return { ok: true, reason: `edge alive (HTTP ${r.status})` };
}

async function checkWithRetry(label, url, judge, wantBody) {
  let last;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const r = await fetchOnce(url, wantBody);
    last = judge(r);
    last.ms = r.ms;
    if (last.ok) return { ...last, attempts: attempt };
    if (attempt < MAX_ATTEMPTS) {
      console.log(`  · ${label} ${url} attempt ${attempt}/${MAX_ATTEMPTS} failed (${last.reason}) — retry in ${BACKOFF_MS}ms`);
      await sleep(BACKOFF_MS);
    }
  }
  return { ...last, attempts: MAX_ATTEMPTS };
}

async function main() {
  if (SELF_TEST) return selfTest();
  console.log(`smoke-live: content=${ORIGIN} edge=${PROD} marker="${MARKER}"`);
  const results = [];

  for (const route of CONTENT_ROUTES) {
    const r = await checkWithRetry('content', `${ORIGIN}${route}`, judgeContent, true);
    console.log(`  ${r.ok ? '✅' : '❌'} content ${route} — ${r.reason} (${r.ms}ms, ${r.attempts}x)`);
    results.push({ kind: 'content', route, ...r });
  }
  for (const route of EDGE_ROUTES) {
    const r = await checkWithRetry('edge', `${PROD}${route}`, judgeEdge, false);
    console.log(`  ${r.ok ? '✅' : '❌'} edge ${route} — ${r.reason} (${r.ms}ms, ${r.attempts}x)`);
    results.push({ kind: 'edge', route, ...r });
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.error(`\nsmoke-live FAILED: ${failed.map((f) => `${f.kind}${f.route} (${f.reason})`).join(', ')}`);
    process.exit(1);
  }
  console.log(`\nsmoke-live PASSED: ${results.length}/${results.length} signals healthy`);
}

// --- self-test: validates judge logic without network ----------------------
function selfTest() {
  const big = 'x'.repeat(2000);
  const contentCases = [
    { r: { status: 200, bytes: 2000, body: `VaultSpark${big}` }, ok: true },
    { r: { status: 200, bytes: 5, body: 'tiny' }, ok: false },
    { r: { status: 200, bytes: 2000, body: big }, ok: false }, // no marker
    { r: { status: 0, error: 'hang' }, ok: false },
  ];
  const edgeCases = [
    { r: { status: 200 }, ok: true },
    { r: { status: 403 }, ok: true }, // bot-challenge = edge alive
    { r: { status: 503 }, ok: false },
    { r: { status: 0, error: 'hang >12000ms' }, ok: false }, // the self-loop symptom
  ];
  let pass = 0, total = 0;
  for (const [i, c] of contentCases.entries()) { total++; const got = judgeContent(c.r).ok; const good = got === c.ok; if (good) pass++; console.log(`  ${good ? 'PASS' : 'FAIL'} content case ${i + 1}: expected ${c.ok}, got ${got}`); }
  for (const [i, c] of edgeCases.entries()) { total++; const got = judgeEdge(c.r).ok; const good = got === c.ok; if (good) pass++; console.log(`  ${good ? 'PASS' : 'FAIL'} edge case ${i + 1}: expected ${c.ok}, got ${got}`); }
  console.log(`self-test: ${pass}/${total} passed`);
  process.exit(pass === total ? 0 : 1);
}

main().catch((e) => { console.error('smoke-live crashed:', e); process.exit(1); });
