#!/usr/bin/env node
/**
 * smoke-live.mjs — post-deploy liveness gate.
 *
 * Catches the failure class behind the 2026-06-08 outage: a Worker that deploys
 * "successfully" but hangs / self-loops / serves nothing. A green deploy is NOT
 * proof the site is up — this probe is. Fetches real navigation routes with a
 * full browser header set (so the Worker scanner-block doesn't 403 us), asserts
 * 200 + a non-trivial body + a known marker, and retries through edge-propagation
 * before failing. Exit non-zero on any failure so CI goes RED (and notifies).
 *
 * Usage:
 *   node scripts/smoke-live.mjs                       # default base + routes
 *   node scripts/smoke-live.mjs --base=https://vaultsparkstudios.com
 *   node scripts/smoke-live.mjs --routes=/,/membership/ --marker=VaultSpark
 *   node scripts/smoke-live.mjs --self-test
 */

const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const hit = args.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : dflt;
};

const BASE = flag('--base', 'https://vaultsparkstudios.com').replace(/\/$/, '');
const ROUTES = flag('--routes', '/,/membership/,/games/').split(',').filter(Boolean);
const MARKER = flag('--marker', 'VaultSpark');
const MIN_BYTES = Number(flag('--min-bytes', '1000'));
const PER_REQ_TIMEOUT_MS = Number(flag('--timeout-ms', '15000'));
const MAX_ATTEMPTS = Number(flag('--attempts', '5'));
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
  'Upgrade-Insecure-Requests': '1',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function probeOnce(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), PER_REQ_TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS, redirect: 'follow', signal: ctrl.signal });
    const body = await res.text();
    const ms = Date.now() - started;
    if (res.status !== 200) return { ok: false, reason: `HTTP ${res.status}`, ms };
    if (body.length < MIN_BYTES) return { ok: false, reason: `body ${body.length}B < ${MIN_BYTES}B`, ms };
    if (MARKER && !body.includes(MARKER)) return { ok: false, reason: `marker "${MARKER}" absent`, ms };
    return { ok: true, reason: `200 ${body.length}B`, ms };
  } catch (e) {
    return { ok: false, reason: e.name === 'AbortError' ? `hang >${PER_REQ_TIMEOUT_MS}ms` : e.message, ms: Date.now() - started };
  } finally {
    clearTimeout(t);
  }
}

async function probeWithRetry(url) {
  let last;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    last = await probeOnce(url);
    if (last.ok) return { ...last, attempts: attempt };
    if (attempt < MAX_ATTEMPTS) {
      console.log(`  · ${url} attempt ${attempt}/${MAX_ATTEMPTS} failed (${last.reason}) — retrying in ${BACKOFF_MS}ms`);
      await sleep(BACKOFF_MS);
    }
  }
  return { ...last, attempts: MAX_ATTEMPTS };
}

async function main() {
  if (SELF_TEST) return selfTest();
  console.log(`smoke-live: ${BASE} — routes [${ROUTES.join(', ')}] marker "${MARKER}"`);
  const results = [];
  for (const route of ROUTES) {
    const url = `${BASE}${route}`;
    const r = await probeWithRetry(url);
    console.log(`  ${r.ok ? '✅' : '❌'} ${route} — ${r.reason} (${r.ms}ms, ${r.attempts} attempt${r.attempts > 1 ? 's' : ''})`);
    results.push({ route, ...r });
  }
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.error(`\nsmoke-live FAILED: ${failed.length}/${results.length} route(s) unhealthy — ${failed.map((f) => f.route).join(', ')}`);
    process.exit(1);
  }
  console.log(`\nsmoke-live PASSED: ${results.length}/${results.length} routes healthy`);
}

// --- self-test: validates assertion logic without network -------------------
function selfTest() {
  const cases = [
    { body: `<title>VaultSpark</title>${'x'.repeat(2000)}`, status: 200, expectOk: true },
    { body: 'short', status: 200, expectOk: false },
    { body: `${'x'.repeat(2000)}no-marker`, status: 200, expectOk: false },
    { body: `<title>VaultSpark</title>${'x'.repeat(2000)}`, status: 503, expectOk: false },
  ];
  let pass = 0;
  for (const [i, c] of cases.entries()) {
    const ok = c.status === 200 && c.body.length >= MIN_BYTES && (!MARKER || c.body.includes(MARKER));
    const good = ok === c.expectOk;
    console.log(`  ${good ? 'PASS' : 'FAIL'} case ${i + 1}: expected ok=${c.expectOk}, got ok=${ok}`);
    if (good) pass++;
  }
  console.log(`self-test: ${pass}/${cases.length} passed`);
  process.exit(pass === cases.length ? 0 : 1);
}

main().catch((e) => {
  console.error('smoke-live crashed:', e);
  process.exit(1);
});
