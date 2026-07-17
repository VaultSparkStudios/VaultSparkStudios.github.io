#!/usr/bin/env node
/**
 * build-promotion-receipt.mjs — S287 (audit A2 · FLAGSHIP)
 *
 * The gap: release-proof.json is entirely PRE-promotion (derived from staging-health,
 * shell-manifest, build-sha, the worker workflow, and the favicon). check-pages-deploy
 * reconciles the prod-served SHA vs HEAD but only transiently — a console advisory that
 * is never persisted. So "candidate-green" (staging) and "production-green" (what the
 * apex actually serves) never reconcile in a durable artifact. This is the "landed ≠
 * verified" failure class: CF Pages can build a [skip ci] tip, the Worker can flip CSP
 * to report-only, the promoted artifact can throw console errors — and every prior gate
 * stays green.
 *
 * This emits a DURABLE post-promotion receipt that observes what production actually
 * serves and reconciles it against the promoted build:
 *   • SHA        — prod-served SHA (pages.dev origin, bypasses the apex bot-challenge)
 *                  vs the promoted api/build-sha.json  →  match | ahead | behind | unreachable
 *   • CSP mode   — the enforce Content-Security-Policy header on the apex (Worker-injected;
 *                  pages.dev has none) → enforce | report-only | absent | unverified + nonce
 *   • Browser    — console-error count + public-signal request cardinality, observed by a
 *                  real browser when one is available (--browser), else honest-dark null.
 *
 * HONEST-DARK CONTRACT (feedback_signal_producer_must_exist): any field we could not
 * observe is null + <thing>Observed:false — NEVER a fabricated healthy zero. A field that
 * reads "0 console errors" must have been measured by a browser that actually loaded the
 * page; otherwise it is null.
 *
 * Modes:
 *   --emit            fetch live production, write api/promotion-receipt.json (gated, honest-dark)
 *   --emit --browser  additionally launch Playwright chromium for console + cardinality
 *   --check           validate the COMMITTED receipt's structure + invariants (no re-fetch;
 *                     prod state is volatile so byte-equality would always drift). Hard-fails
 *                     ONLY on malformed structure or an observed CSP security regression
 *                     (report-only / absent while source policy is enforce). Deploy-lag and
 *                     console noise are advisory (exit 0) — they self-heal / belong on the
 *                     trust surface, not blocking a code commit.
 *   --self-test       pure derivePromotionReceipt unit tests (healthy AND degraded branches)
 *
 * Exit: 0 = PASS / advisory / honest-dark · 1 = malformed receipt or CSP security regression.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from './lib/safe-spawn.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'api', 'promotion-receipt.json');
const HISTORY = path.join(ROOT, 'data', 'promotion-history.ndjson');
const PAGES_ORIGIN = 'https://vaultsparkstudios-website.pages.dev';
const APEX_ORIGIN = 'https://vaultsparkstudios.com';

const args = process.argv.slice(2);
const EMIT = args.includes('--emit');
const CHECK = args.includes('--check');
const SELF_TEST = args.includes('--self-test');
const WITH_BROWSER = args.includes('--browser');
const RUN_DIRECT = process.argv[1] &&
  process.argv[1].replace(/\\/g, '/').endsWith('build-promotion-receipt.mjs');

// ── Pure derive (unit-testable; no I/O) ──────────────────────────────────────
/**
 * @param {object} i
 * @param {string|null} i.promotedSha        promoted build sha (api/build-sha.json)
 * @param {string|null} i.productionSha       sha served by the pages.dev origin (null = unreachable)
 * @param {boolean}     i.productionReachable  did the origin answer at all
 * @param {string}      i.ordering             when the two SHAs differ, the git-graph relation of prod
 *                                             vs promoted: 'ahead' (prod newer — benign, an hourly rebuild
 *                                             moved on) · 'behind' (prod older — a stranded/stale deploy) ·
 *                                             'unknown' (unrelated / can't order — honest-dark)
 * @param {object}      i.csp                  { observed, apexReachable, mode, nonce, reportOnlyAlso, headerName }
 * @param {object}      i.browser              { captured, target, consoleErrors, signalCardinality, signalEndpoints }
 * @param {string}      i.sourcePolicyMode     'enforce' | 'report-only' — what the source CSP config declares
 */
export function derivePromotionReceipt(i) {
  const promotedSha = i.promotedSha || null;
  const productionSha = i.productionSha || null;
  const csp = i.csp || { observed: false, apexReachable: false, mode: 'unverified', nonce: false, reportOnlyAlso: false, headerName: null };
  const browser = i.browser || { captured: false, target: null, consoleErrors: null, signalCardinality: null, signalEndpoints: [] };
  const sourcePolicyMode = i.sourcePolicyMode || 'enforce';

  let reconciliation;
  if (!i.productionReachable || !productionSha) reconciliation = 'unreachable';
  else if (productionSha === promotedSha) reconciliation = 'match';
  else if (i.ordering === 'ahead') reconciliation = 'ahead';   // prod moved on to a newer build — benign
  else if (i.ordering === 'behind') reconciliation = 'behind'; // prod serves an OLDER build than promoted — stale/stranded
  else reconciliation = 'unknown';                             // can't order the two SHAs — honest-dark

  const findings = [];

  // Observability gates — can we grade at all? 'unknown'/'unreachable' = honest-dark.
  const shaObservable = reconciliation === 'match' || reconciliation === 'ahead' || reconciliation === 'behind';
  const cspObservable = csp.observed === true;

  // Real regressions (only assertable when actually observed)
  const cspRegression = cspObservable && sourcePolicyMode === 'enforce' &&
    (csp.mode === 'report-only' || csp.mode === 'absent');
  const shaBehind = reconciliation === 'behind'; // prod OLDER than promoted — the stale-deploy failure class
  const consoleDirty = browser.captured === true && Number(browser.consoleErrors) > 0;

  if (cspRegression) findings.push(`production CSP is '${csp.mode}' but source policy is 'enforce' — enforce header missing at the edge`);
  if (shaBehind) findings.push(`production origin serves ${String(productionSha).slice(0, 8)} — OLDER than promoted ${String(promotedSha).slice(0, 8)} — stranded/stale deploy`);
  if (reconciliation === 'ahead') findings.push(`production serves ${String(productionSha).slice(0, 8)}, newer than the recorded promoted ${String(promotedSha).slice(0, 8)} (benign — a later rebuild moved on)`);
  if (consoleDirty) findings.push(`${browser.consoleErrors} console error(s) on the promoted artifact`);

  // reconciled = production is serving the promoted build or newer (not stale), CSP not regressed, no console errors.
  const reconciled = (reconciliation === 'match' || reconciliation === 'ahead')
    && (!cspObservable || (csp.mode !== 'report-only' && csp.mode !== 'absent'))
    && (!browser.captured || Number(browser.consoleErrors) === 0);

  // receiptState:
  //  verified   — we observed the key signals AND they reconcile
  //  degraded   — we observed a real mismatch (regression / behind / console errors)
  //  unverified — honest-dark: could not observe enough to grade (no fabricated pass)
  let receiptState;
  if (cspRegression || shaBehind || consoleDirty) receiptState = 'degraded';
  else if (shaObservable && cspObservable && reconciled) receiptState = 'verified';
  else receiptState = 'unverified';

  return {
    schemaVersion: '1.0',
    generatedBy: 'scripts/build-promotion-receipt.mjs',
    publicSafe: true,
    note: 'Post-promotion receipt. Observes what production actually serves and reconciles it against the promoted build. Honest-dark: any field we could not observe is null + <thing>Observed:false, never a fabricated pass.',
    promoted: { sha: promotedSha, source: 'api/build-sha.json' },
    production: {
      origin: PAGES_ORIGIN,
      sha: productionSha,
      reachable: i.productionReachable === true,
      reconciliation,
    },
    csp: {
      observed: cspObservable,
      apexReachable: csp.apexReachable === true,
      mode: csp.mode || 'unverified',
      nonce: csp.nonce === true,
      reportOnlyAlso: csp.reportOnlyAlso === true,
      headerName: csp.headerName || null,
    },
    browser: {
      captured: browser.captured === true,
      target: browser.target || null,
      consoleErrors: browser.captured === true ? Number(browser.consoleErrors) : null,
      signalCardinality: browser.captured === true ? Number(browser.signalCardinality) : null,
      signalEndpoints: browser.captured === true ? (browser.signalEndpoints || []) : [],
    },
    reconciled,
    receiptState,
    findings,
  };
}

// ── Reconciliation history ledger ────────────────────────────────────────────
// Every other trust signal here keeps an append-only ndjson history (uptime, rum,
// perf). A point-in-time receipt can't answer "does production RELIABLY reconcile,
// or are there recurring stranded-deploy incidents?" This ledger does. Auto-covered
// by check-ndjson-integrity (it enumerates git-tracked *.ndjson).
function historyRecordOf(receipt) {
  return {
    ts: receipt.generatedAt,
    schemaVersion: '1.0',
    promoted: (receipt.promoted?.sha || '').slice(0, 8) || null,
    production: (receipt.production?.sha || '').slice(0, 8) || null,
    reconciliation: receipt.production?.reconciliation ?? 'unknown',
    cspMode: receipt.csp?.mode ?? 'unverified',
    receiptState: receipt.receiptState,
    consoleErrors: receipt.browser?.consoleErrors ?? null,
    signalCardinality: receipt.browser?.signalCardinality ?? null,
  };
}

// Tail-safe append (heals a missing trailing newline so one prior truncated write
// can't glue two records — the S282 glued-record class).
function appendHistory(record) {
  fs.mkdirSync(path.dirname(HISTORY), { recursive: true });
  let prefix = '';
  try {
    const { size } = fs.statSync(HISTORY);
    if (size > 0) {
      const fd = fs.openSync(HISTORY, 'r');
      const tail = Buffer.alloc(1);
      fs.readSync(fd, tail, 0, 1, size - 1);
      fs.closeSync(fd);
      if (tail.toString('utf8') !== '\n') prefix = '\n';
    }
  } catch { /* no file yet */ }
  fs.appendFileSync(HISTORY, prefix + JSON.stringify(record) + '\n', 'utf8');
}

// Pure: summarize the reconciliation streak over the most recent `window` records.
export function summarizeHistory(records, window = 20) {
  const recent = records.slice(-window);
  const gradable = recent.filter((r) => r.receiptState === 'verified' || r.receiptState === 'degraded');
  const reconciled = gradable.filter((r) => r.receiptState === 'verified').length;
  const lastStranded = [...records].reverse().find((r) => r.reconciliation === 'behind');
  return {
    window: recent.length,
    gradable: gradable.length,
    reconciled,
    reconciledPct: gradable.length ? Math.round((reconciled / gradable.length) * 100) : null,
    lastStrandedAt: lastStranded ? lastStranded.ts : null,
  };
}

function readHistory() {
  try {
    return fs.readFileSync(HISTORY, 'utf8').split('\n').filter(Boolean).map((l) => {
      try { return JSON.parse(l); } catch { return null; } // one bad line must not zero the rest (S282)
    }).filter(Boolean);
  } catch { return []; }
}

// ── Live observation (I/O; only under --emit) ────────────────────────────────
async function fetchJson(url, ms = 8000) {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'cache-control': 'no-cache' } });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; } finally { clearTimeout(tid); }
}

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36';

async function observeCsp() {
  // The Worker injects the enforce CSP on the apex only (pages.dev has none). Apex HTML
  // nav can be bot-challenged from a datacenter IP → honest-dark unverified in that case.
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(APEX_ORIGIN + '/', {
      signal: ctrl.signal,
      headers: { 'user-agent': BROWSER_UA, accept: 'text/html,application/xhtml+xml', 'cache-control': 'no-cache' },
    });
    const enforce = res.headers.get('content-security-policy');
    const reportOnly = res.headers.get('content-security-policy-report-only');
    if (!res.ok && res.status === 403 && !enforce) {
      // bot-challenge before the worker CSP — can't observe (CANON: challenge != outage)
      return { observed: false, apexReachable: true, mode: 'unverified', nonce: false, reportOnlyAlso: Boolean(reportOnly), headerName: null };
    }
    let mode = 'absent';
    let headerName = null;
    if (enforce) { mode = 'enforce'; headerName = 'content-security-policy'; }
    else if (reportOnly) { mode = 'report-only'; headerName = 'content-security-policy-report-only'; }
    return {
      observed: true,
      apexReachable: true,
      mode,
      nonce: Boolean(enforce && /'nonce-/.test(enforce)),
      reportOnlyAlso: Boolean(reportOnly),
      headerName,
    };
  } catch {
    return { observed: false, apexReachable: false, mode: 'unverified', nonce: false, reportOnlyAlso: false, headerName: null };
  } finally { clearTimeout(tid); }
}

async function observeBrowser() {
  // Optional: load the promoted artifact (pages.dev, unchallenged) in a real browser and
  // count console errors + distinct public-signal requests. Any failure → honest-dark.
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { return { captured: false, target: null, consoleErrors: null, signalCardinality: null, signalEndpoints: [] }; }
  let browser;
  try {
    browser = await chromium.launch();
    const ctx = await browser.newContext({ userAgent: BROWSER_UA });
    const page = await ctx.newPage();
    let consoleErrors = 0;
    const signalHosts = new Set();
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors++; });
    page.on('pageerror', () => { consoleErrors++; });
    page.on('request', (req) => {
      const u = req.url();
      // public-signal endpoints the page actually pulls
      const m = u.match(/\/(api\/[a-z0-9-]+\.json|v\/[a-z]+|feed\/[a-z0-9-]+\.(?:json|xml)|data\/[a-z0-9-]+\.(?:json|ndjson))/i);
      if (m) signalHosts.add(m[1]);
    });
    await page.goto(PAGES_ORIGIN + '/', { waitUntil: 'load', timeout: 20000 });
    await page.waitForTimeout(2500); // let deferred signal fetches fire
    await browser.close();
    return {
      captured: true,
      target: PAGES_ORIGIN + '/',
      consoleErrors,
      signalCardinality: signalHosts.size,
      signalEndpoints: [...signalHosts].sort(),
    };
  } catch {
    try { if (browser) await browser.close(); } catch {}
    return { captured: false, target: null, consoleErrors: null, signalCardinality: null, signalEndpoints: [] };
  }
}

// Order two commit SHAs against the local git graph. Honest-dark: if either SHA is
// unknown locally (never pulled) or unrelated, return 'unknown' rather than guessing.
function gitOrdering(promoted, production) {
  if (!promoted || !production || promoted === production) return 'same';
  const isAncestor = (a, b) => {
    try { execSync(`git merge-base --is-ancestor ${a} ${b}`, { cwd: ROOT, stdio: 'ignore' }); return true; }
    catch { return false; }
  };
  // No `^{commit}` peel: on Windows cmd.exe (via safe-spawn) `^` is the escape char and mangles the arg.
  const known = (sha) => { try { execSync(`git cat-file -e ${sha}`, { cwd: ROOT, stdio: 'ignore' }); return true; } catch { return false; } };
  // Production often serves a newer hourly commit not yet in the local graph. A best-effort
  // fetch (no working-tree change) lets it order to 'ahead' instead of honest-dark 'unknown'.
  if (!known(production)) { try { execSync('git fetch origin --quiet', { cwd: ROOT, stdio: 'ignore', timeout: 15000 }); } catch { /* offline → stay honest-dark */ } }
  if (!known(promoted) || !known(production)) return 'unknown';
  if (isAncestor(promoted, production)) return 'ahead';   // promoted is an ancestor of prod → prod is newer
  if (isAncestor(production, promoted)) return 'behind';  // prod is an ancestor of promoted → prod is older
  return 'unknown';                                       // diverged
}

async function emit() {
  const buildSha = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'api', 'build-sha.json'), 'utf8')).sha || null; } catch { return null; } })();
  const prodBuild = await fetchJson(`${PAGES_ORIGIN}/api/build-sha.json`);
  const productionSha = prodBuild ? prodBuild.sha || null : null;
  const csp = await observeCsp();
  const browser = WITH_BROWSER ? await observeBrowser() : { captured: false, target: null, consoleErrors: null, signalCardinality: null, signalEndpoints: [] };

  const receipt = derivePromotionReceipt({
    promotedSha: buildSha,
    productionSha,
    productionReachable: Boolean(prodBuild),
    ordering: gitOrdering(buildSha, productionSha),
    csp,
    browser,
    sourcePolicyMode: 'enforce',
  });
  receipt.generatedAt = new Date().toISOString();
  // Append to the history ledger, then embed the streak so /status/ and status-proof
  // both carry "does production RELIABLY reconcile" without a second fetch.
  appendHistory(historyRecordOf(receipt));
  receipt.history = summarizeHistory(readHistory());
  fs.writeFileSync(OUT, JSON.stringify(receipt, null, 2) + '\n', 'utf8');
  console.log(`build-promotion-receipt --emit: ${receipt.receiptState} · sha=${receipt.production.reconciliation} · csp=${receipt.csp.mode} · browser=${receipt.browser.captured ? receipt.browser.consoleErrors + ' err' : 'honest-dark'} · streak=${receipt.history.reconciled}/${receipt.history.gradable}`);
  return receipt;
}

// ── Structure + invariant check (no re-fetch) ────────────────────────────────
const ENUM_RECONCILIATION = new Set(['match', 'ahead', 'behind', 'unreachable', 'unknown']);
const ENUM_CSP_MODE = new Set(['enforce', 'report-only', 'absent', 'unverified']);
const ENUM_STATE = new Set(['verified', 'unverified', 'degraded']);

export function validateReceiptShape(r) {
  const errors = [];
  const security = [];
  if (!r || typeof r !== 'object') return { errors: ['receipt is not an object'], security: [] };
  if (r.schemaVersion !== '1.0') errors.push(`schemaVersion ${r.schemaVersion} != 1.0`);
  if (!r.production || !ENUM_RECONCILIATION.has(r.production.reconciliation)) errors.push('production.reconciliation invalid');
  if (!r.csp || !ENUM_CSP_MODE.has(r.csp.mode)) errors.push('csp.mode invalid');
  if (!ENUM_STATE.has(r.receiptState)) errors.push('receiptState invalid');
  // honest-dark integrity: an un-captured browser MUST hold null, never a fabricated zero
  if (r.browser && r.browser.captured === false && (r.browser.consoleErrors !== null || r.browser.signalCardinality !== null)) {
    errors.push('honest-dark violation: browser.captured=false but numeric fields are non-null');
  }
  // I1 security regression: an OBSERVED report-only/absent enforce CSP in production
  if (r.csp && r.csp.observed === true && (r.csp.mode === 'report-only' || r.csp.mode === 'absent')) {
    security.push(`production CSP observed as '${r.csp.mode}' — enforce policy is not live at the edge`);
  }
  return { errors, security };
}

function check() {
  if (!fs.existsSync(OUT)) {
    console.log('build-promotion-receipt --check: no committed receipt yet (honest-dark) — run --emit at closeout · OK');
    return 0;
  }
  let r;
  try { r = JSON.parse(fs.readFileSync(OUT, 'utf8')); }
  catch { console.error('build-promotion-receipt --check: receipt is not valid JSON'); return 1; }
  const { errors, security } = validateReceiptShape(r);
  if (errors.length) { errors.forEach((e) => console.error('  ✗ ' + e)); console.error('build-promotion-receipt --check: malformed receipt'); return 1; }
  if (security.length) { security.forEach((s) => console.error('  ⛔ ' + s)); console.error('build-promotion-receipt --check: CSP security regression'); return 1; }
  if (r.receiptState === 'degraded') { (r.findings || []).forEach((f) => console.warn('  ⚠ ' + f)); console.log(`build-promotion-receipt --check: ${r.receiptState} (advisory) · OK`); return 0; }
  console.log(`build-promotion-receipt --check: ${r.receiptState} · sha=${r.production.reconciliation} · csp=${r.csp.mode} · OK`);
  return 0;
}

function selfTest() {
  const cases = [];
  const base = {
    promotedSha: 'a'.repeat(40), productionSha: 'a'.repeat(40), productionReachable: true,
    csp: { observed: true, apexReachable: true, mode: 'enforce', nonce: true, reportOnlyAlso: true, headerName: 'content-security-policy' },
    browser: { captured: true, target: 'x', consoleErrors: 0, signalCardinality: 7, signalEndpoints: ['api/uptime.json'] },
    sourcePolicyMode: 'enforce',
  };
  const healthy = derivePromotionReceipt(base);
  cases.push(['fully observed match → verified', healthy.receiptState === 'verified' && healthy.reconciled === true]);

  const behind = derivePromotionReceipt({ ...base, productionSha: 'b'.repeat(40), ordering: 'behind' });
  cases.push(['sha behind (prod older) → degraded', behind.receiptState === 'degraded' && behind.production.reconciliation === 'behind']);

  const ahead = derivePromotionReceipt({ ...base, productionSha: 'c'.repeat(40), ordering: 'ahead' });
  cases.push(['sha ahead (prod newer) → verified, benign', ahead.receiptState === 'verified' && ahead.reconciled === true && ahead.production.reconciliation === 'ahead']);

  const diverged = derivePromotionReceipt({ ...base, productionSha: 'd'.repeat(40), ordering: 'unknown' });
  cases.push(['sha unorderable → unverified honest-dark, not degraded', diverged.receiptState === 'unverified' && diverged.production.reconciliation === 'unknown']);

  const flipped = derivePromotionReceipt({ ...base, csp: { ...base.csp, mode: 'report-only' } });
  cases.push(['CSP flipped to report-only → degraded', flipped.receiptState === 'degraded' && flipped.findings.some((f) => /CSP/.test(f))]);

  const dirty = derivePromotionReceipt({ ...base, browser: { ...base.browser, consoleErrors: 3 } });
  cases.push(['console errors → degraded', dirty.receiptState === 'degraded']);

  const darkProd = derivePromotionReceipt({ ...base, productionSha: null, productionReachable: false });
  cases.push(['unreachable prod → unverified, not fabricated pass', darkProd.receiptState === 'unverified' && darkProd.production.reconciliation === 'unreachable']);

  const darkCsp = derivePromotionReceipt({ ...base, csp: { observed: false, apexReachable: true, mode: 'unverified', nonce: false, reportOnlyAlso: false, headerName: null } });
  cases.push(['unobserved CSP → unverified honest-dark', darkCsp.receiptState === 'unverified']);

  const darkBrowser = derivePromotionReceipt({ ...base, browser: { captured: false, target: null, consoleErrors: null, signalCardinality: null, signalEndpoints: [] } });
  cases.push(['no browser → numeric fields null (honest-dark)', darkBrowser.browser.consoleErrors === null && darkBrowser.browser.signalCardinality === null && darkBrowser.receiptState === 'verified']);

  // validateReceiptShape branches
  const okShape = validateReceiptShape(healthy);
  cases.push(['healthy receipt passes shape', okShape.errors.length === 0 && okShape.security.length === 0]);
  const secShape = validateReceiptShape(flipped);
  cases.push(['observed report-only trips security invariant', secShape.security.length === 1]);
  const fabricated = { ...darkBrowser, browser: { captured: false, consoleErrors: 0, signalCardinality: 0, signalEndpoints: [] } };
  cases.push(['fabricated zero on uncaptured browser is a shape error', validateReceiptShape(fabricated).errors.some((e) => /honest-dark/.test(e))]);

  // history summary branches
  const hist = [
    { ts: 't1', receiptState: 'verified', reconciliation: 'match' },
    { ts: 't2', receiptState: 'degraded', reconciliation: 'behind' },
    { ts: 't3', receiptState: 'verified', reconciliation: 'ahead' },
    { ts: 't4', receiptState: 'unverified', reconciliation: 'unknown' },
  ];
  const sum = summarizeHistory(hist);
  cases.push(['history counts gradable, excludes unverified', sum.gradable === 3 && sum.reconciled === 2 && sum.reconciledPct === 67]);
  cases.push(['history surfaces last stranded incident', sum.lastStrandedAt === 't2']);
  cases.push(['empty history → null pct, no stranded', summarizeHistory([]).reconciledPct === null && summarizeHistory([]).lastStrandedAt === null]);

  let fail = 0;
  cases.forEach(([name, ok]) => { console.log(`  ${ok ? 'ok' : 'FAIL'} ${name}`); if (!ok) fail++; });
  console.log(`build-promotion-receipt --self-test: ${cases.length - fail}/${cases.length} passed`);
  process.exit(fail ? 1 : 0);
}

if (RUN_DIRECT) {
  if (SELF_TEST) selfTest();
  else if (CHECK) process.exit(check());
  else if (EMIT) emit().catch((e) => { console.error('build-promotion-receipt --emit failed:', e.message); process.exit(0); /* honest-dark: never block closeout */ });
  else { console.error('usage: build-promotion-receipt.mjs [--emit [--browser] | --check | --self-test]'); process.exit(2); }
}
