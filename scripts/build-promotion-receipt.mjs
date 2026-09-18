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

// ── Shell parity evidence ────────────────────────────────────────────────────
// The SAME evidence build-deploy-currency requires before it will call a served
// baseline sha "content-current" (classify → shellParityState === 'matched').
// Produced by that script's shell-parity probe and published in
// api/deploy-currency.json → shellParity. Read here, never re-derived: a lane
// head alone cannot tell a promoted content release from a stranded shell.
export const SHELL_PARITY_STATES = new Set(['matched', 'drift', 'challenged', 'unobserved']);
// Mirrors build-deploy-currency OBSERVATION_MAX_AGE_HOURS: a retained parity
// reading that has aged out cannot certify production either.
export const SHELL_PARITY_MAX_AGE_HOURS = 12;

/** Normalize + age-bound a shell-parity reading. Honest-dark: unknown → unobserved + stale. */
export function normalizeShellParity(input, { now = Date.now(), maxAgeHours = SHELL_PARITY_MAX_AGE_HOURS } = {}) {
  const state = SHELL_PARITY_STATES.has(input?.state) ? input.state : 'unobserved';
  const observedAt = typeof input?.observedAt === 'string' && input.observedAt ? input.observedAt : null;
  const ts = observedAt ? Date.parse(observedAt) : NaN;
  const ageHours = Number.isFinite(ts) ? Math.max(0, (now - ts) / 3_600_000) : null;
  return {
    state,
    observedAt,
    ageHours: ageHours === null ? null : Number(ageHours.toFixed(1)),
    stale: ageHours === null || ageHours > maxAgeHours,
    maxAgeHours,
    source: input?.source || null,
  };
}

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

  // Content-lane promotions keep the served build-sha `sha` at the baseline while
  // `contentLaneHead` advances (see build-deploy-currency classify → content-current).
  // A served lane head that equals or descends from the promoted sha IS the promoted
  // content, so a sha-only comparison must not call it 'behind'.
  const contentLaneHead = /^[0-9a-f]{7,40}$/i.test(String(i.productionContentLaneHead || ''))
    ? String(i.productionContentLaneHead).toLowerCase() : null;
  const laneEqualsPromoted = Boolean(contentLaneHead && promotedSha) &&
    (String(promotedSha).toLowerCase().startsWith(contentLaneHead) || contentLaneHead.startsWith(String(promotedSha).toLowerCase()));
  const contentLaneCurrent = Boolean(contentLaneHead) && (laneEqualsPromoted || i.contentLaneOrdering === 'ahead');

  // A served lane head is only HALF the evidence. build-deploy-currency grants
  // `content-current` on exactly this lane geometry ONLY when shell parity is
  // ALSO observed as `matched`, because a stranded shell/Worker change hides
  // behind an advanced lane head: the content shipped, the shell did not.
  // Granting content-lane-match from the lane head alone recorded such a deploy
  // as 'verified', which reset the behind-streak so the CI beacon never alerted.
  // Unobserved/stale parity is honest-dark ('unknown'), never a pass; observed
  // `drift` is positive evidence of a stranded shell and falls through to the
  // sha ordering, where 'behind' grades degraded.
  const shellParity = normalizeShellParity(i.shellParity, { now: i.now ?? Date.now() });
  const parityMatched = shellParity.state === 'matched' && shellParity.stale === false;
  const parityDrift = shellParity.state === 'drift' && shellParity.stale === false;

  let reconciliation;
  if (!i.productionReachable || !productionSha) reconciliation = 'unreachable';
  else if (productionSha === promotedSha) reconciliation = 'match';
  else if (contentLaneCurrent && parityMatched) reconciliation = 'content-lane-match'; // lane head at/after promoted AND shell parity matched
  else if (contentLaneCurrent && !parityDrift) reconciliation = 'unknown'; // lane looks current but parity unobserved → honest-dark, never a pass
  else if (i.ordering === 'ahead') reconciliation = 'ahead';   // prod moved on to a newer build — benign
  else if (i.ordering === 'behind') reconciliation = 'behind'; // prod serves an OLDER build than promoted — stale/stranded
  else reconciliation = 'unknown';                             // can't order the two SHAs — honest-dark

  const findings = [];

  // Observability gates — can we grade at all? 'unknown'/'unreachable' = honest-dark.
  const shaObservable = reconciliation === 'match' || reconciliation === 'content-lane-match' || reconciliation === 'ahead' || reconciliation === 'behind';
  const cspObservable = csp.observed === true;

  // Real regressions (only assertable when actually observed)
  const cspRegression = cspObservable && sourcePolicyMode === 'enforce' &&
    (csp.mode === 'report-only' || csp.mode === 'absent');
  const shaBehind = reconciliation === 'behind'; // prod OLDER than promoted — the stale-deploy failure class
  const consoleDirty = browser.captured === true && Number(browser.consoleErrors) > 0;

  if (cspRegression) findings.push(`production CSP is '${csp.mode}' but source policy is 'enforce' — enforce header missing at the edge`);
  // S357 — "stranded" is a strong word and it was being applied to a normal
  // state. `promotedSha` is read from the repo's CURRENT api/build-sha.json, not
  // from what was actually promoted, so once publishers advance the repo past the
  // last promotion this finding fires on a perfectly healthy production. The two
  // cases need different words because they need different responses: a served
  // shell that no longer matches is a stranded deploy; a repo that has simply
  // moved on is a promotion backlog. Shell parity is what separates them.
  if (shaBehind && parityDrift) findings.push(`production origin serves ${String(productionSha).slice(0, 8)} — OLDER than promoted ${String(promotedSha).slice(0, 8)} — stranded/stale deploy (shell parity observed as drift)`);
  else if (shaBehind) findings.push(`the repo has advanced past the last promotion: production serves ${String(productionSha).slice(0, 8)}, repo build-sha is ${String(promotedSha).slice(0, 8)} — a promotion backlog, not a stranded deploy (shell parity is '${shellParity.state}', not drift)`);
  if (reconciliation === 'ahead') findings.push(`production serves ${String(productionSha).slice(0, 8)}, newer than the recorded promoted ${String(promotedSha).slice(0, 8)} (benign — a later rebuild moved on)`);
  if (reconciliation === 'content-lane-match') findings.push(`production build sha ${String(productionSha).slice(0, 8)} is the content-lane baseline; served contentLaneHead ${String(contentLaneHead).slice(0, 8)} is at/after promoted ${String(promotedSha).slice(0, 8)} and shell parity was observed 'matched' at ${shellParity.observedAt} (current)`);
  if (contentLaneCurrent && !parityMatched && !parityDrift) findings.push(`served contentLaneHead ${String(contentLaneHead).slice(0, 8)} is at/after promoted ${String(promotedSha).slice(0, 8)}, but shell parity was not observed as matched (state '${shellParity.state}'${shellParity.observedAt ? `, observed ${shellParity.ageHours}h ago, max ${shellParity.maxAgeHours}h` : ', never observed'}) — not graded as current (honest-dark)`);
  if (contentLaneCurrent && parityDrift) findings.push(`shell parity observed as 'drift' at ${shellParity.observedAt} — the served shell does not match the promoted build, so the advanced contentLaneHead does not make production current`);
  if (consoleDirty) {
    const vantage = Number(browser.workerRouteErrors || 0);
    findings.push(vantage > 0
      ? `${browser.consoleErrors} console error(s) on the promoted artifact — ${vantage} from Worker-only route(s) this Pages vantage cannot serve, ${browser.consoleErrors - vantage} unexplained`
      : `${browser.consoleErrors} console error(s) on the promoted artifact`);
  }

  // reconciled = production is serving the promoted build or newer (not stale), CSP not regressed, no console errors.
  const reconciled = (reconciliation === 'match' || reconciliation === 'content-lane-match' || reconciliation === 'ahead')
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
      contentLaneHead,
      reachable: i.productionReachable === true,
      reconciliation,
      // The second half of the content-lane evidence, disclosed alongside the
      // verdict it gates (same signal build-deploy-currency classifies on).
      shellParity,
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
      // How many of those are explained by the vantage rather than by the
      // artifact: the Pages origin has no Worker, so a Worker-only route cannot
      // succeed here. Published so a reader can see the residual, and so the
      // headline count never silently absorbs an unfixable class.
      workerRouteErrors: browser.captured === true ? Number(browser.workerRouteErrors || 0) : null,
      signalCardinality: browser.captured === true ? Number(browser.signalCardinality) : null,
      signalEndpoints: browser.captured === true ? (browser.signalEndpoints || []) : [],
      routes: Array.isArray(browser.routes) ? browser.routes : [],
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
// Freshness bound: the ledger is appended only when a receipt is emitted (closeout),
// so its tail can describe production days ago. If the newest GRADABLE record is
// older than `maxAgeHours` (or its ts is unparseable) the streak is reported but
// the ledger is `stale` and can never raise a stranded alert — old evidence is
// "unobserved now", not "stranded now".
export const HISTORY_MAX_AGE_HOURS = 48;
export function summarizeHistory(records, window = 20, { now = Date.now(), maxAgeHours = HISTORY_MAX_AGE_HOURS } = {}) {
  const recent = records.slice(-window);
  const gradable = recent.filter((r) => r.receiptState === 'verified' || r.receiptState === 'degraded');
  const reconciled = gradable.filter((r) => r.receiptState === 'verified').length;
  const lastStranded = [...records].reverse().find((r) => r.reconciliation === 'behind');
  let currentBehindStreak = 0;
  for (let index = records.length - 1; index >= 0; index -= 1) {
    if (records[index].reconciliation !== 'behind') break;
    currentBehindStreak += 1;
  }
  const newestGradable = [...records].reverse().find((r) => r.receiptState === 'verified' || r.receiptState === 'degraded');
  const newestTs = newestGradable ? Date.parse(newestGradable.ts || '') : NaN;
  const newestAgeHours = Number.isFinite(newestTs) ? Math.max(0, (now - newestTs) / 3_600_000) : null;
  const stale = newestAgeHours === null || newestAgeHours > maxAgeHours;
  const strandedAlertThreshold = 2;
  return {
    window: recent.length,
    gradable: gradable.length,
    reconciled,
    reconciledPct: gradable.length ? Math.round((reconciled / gradable.length) * 100) : null,
    lastStrandedAt: lastStranded ? lastStranded.ts : null,
    currentBehindStreak,
    newestGradableAt: newestGradable ? newestGradable.ts ?? null : null,
    newestAgeHours: newestAgeHours === null ? null : Number(newestAgeHours.toFixed(1)),
    maxAgeHours,
    stale,
    strandedAlert: !stale && currentBehindStreak >= strandedAlertThreshold,
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

/**
 * Routes served only by the apex Worker. The Pages origin necessarily 404s them,
 * so a failure here is a vantage property, never an artifact defect. Kept in one
 * place so the list is auditable rather than scattered through the counter.
 */
const WORKER_ONLY_ROUTE = /^\/(?:v\/|api\/auth\/|api\/newsletter\/unsubscribe$|_health$)/;

async function observeBrowser() {
  // Observe a deterministic critical-route matrix. Route failures remain honest-dark
  // per route; healthy routes are never allowed to conceal an unobserved one.
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch {
    try { ({ chromium } = await import('@playwright/test')); }
    catch { return { captured: false, target: null, consoleErrors: null, signalCardinality: null, signalEndpoints: [], routes: [] }; }
  }
  let browser;
  try {
    browser = await chromium.launch();
    const ctx = await browser.newContext({ userAgent: BROWSER_UA });
    const routes = [];
    for (const route of ['/', '/vault-member/', '/games/franchise-architect/']) {
      const page = await ctx.newPage();
      let consoleErrors = 0;
      let workerRouteErrors = 0;
      const signalEndpoints = new Set();
      page.on('console', (message) => { if (message.type() === 'error') consoleErrors += 1; });
      page.on('pageerror', () => { consoleErrors += 1; });
      // S357 — this vantage is the PAGES origin, which has no Worker in front, so
      // a Worker-served route CANNOT succeed here and its failure is a property of
      // the vantage, not a defect in the artifact. Measured live:
      //   /api/auth/me  apex 200 · pages.dev 404
      //   /v/rum        apex 405 · pages.dev 404
      // Counting those made the metric structurally unable to reach zero, so the
      // receipt reported "7 console error(s)" on an artifact whose apex console
      // was clean. They are now counted separately instead of silently dropped —
      // a real regression on these routes still shows up, just in its own bucket.
      page.on('response', (response) => {
        if (response.status() < 400) return;
        if (WORKER_ONLY_ROUTE.test(new URL(response.url()).pathname)) workerRouteErrors += 1;
      });
      page.on('request', (request) => {
        const match = request.url().match(/\/(api\/[a-z0-9-]+\.json|v\/[a-z]+|feed\/[a-z0-9-]+\.(?:json|xml)|data\/[a-z0-9-]+\.(?:json|ndjson))/i);
        if (match) signalEndpoints.add(match[1]);
      });
      try {
        await page.goto(PAGES_ORIGIN + route, { waitUntil: 'load', timeout: 20000 });
        await page.waitForTimeout(2500);
        routes.push({
          route,
          target: PAGES_ORIGIN + route,
          captured: true,
          consoleErrors,
          workerRouteErrors,
          signalCardinality: signalEndpoints.size,
          signalEndpoints: [...signalEndpoints].sort(),
        });
      } catch {
        routes.push({ route, target: PAGES_ORIGIN + route, captured: false, consoleErrors: null, signalCardinality: null, signalEndpoints: [] });
      } finally {
        await page.close();
      }
    }
    await browser.close();
    const captured = routes.filter((route) => route.captured);
    if (!captured.length) return { captured: false, target: PAGES_ORIGIN, consoleErrors: null, signalCardinality: null, signalEndpoints: [], routes };
    const signalEndpoints = [...new Set(captured.flatMap((route) => route.signalEndpoints))].sort();
    return {
      captured: true,
      target: PAGES_ORIGIN,
      consoleErrors: captured.reduce((sum, route) => sum + route.consoleErrors, 0),
      workerRouteErrors: captured.reduce((sum, route) => sum + (route.workerRouteErrors || 0), 0),
      signalCardinality: signalEndpoints.length,
      signalEndpoints,
      routes,
    };
  } catch {
    try { if (browser) await browser.close(); } catch {}
    return { captured: false, target: null, consoleErrors: null, signalCardinality: null, signalEndpoints: [], routes: [] };
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

// Shell parity is observed by build-deploy-currency's probe (it compares the
// fingerprinted shell asset paths of the served `/` against the local shell).
// We read its published observation rather than inventing a second probe, so the
// promotion receipt and the deploy-currency feed grade content lanes on ONE
// piece of evidence. Absent/unreadable → honest-dark 'unobserved', never a pass.
function readShellParityEvidence() {
  const rel = 'api/deploy-currency.json';
  try {
    const feed = JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
    const parity = feed?.shellParity;
    if (!parity || typeof parity !== 'object') return { state: 'unobserved', observedAt: null, source: `${rel} (no shellParity)` };
    return {
      state: parity.state || 'unobserved',
      // A retained/challenged reading keeps its ORIGINAL observedAt, so the age
      // bound below is what stops a stale carry from certifying production.
      observedAt: parity.observedAt || null,
      source: `${rel} → shellParity`,
    };
  } catch {
    return { state: 'unobserved', observedAt: null, source: `${rel} (absent or unreadable)` };
  }
}

async function emit() {
  const buildSha = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'api', 'build-sha.json'), 'utf8')).sha || null; } catch { return null; } })();
  const prodBuild = await fetchJson(`${PAGES_ORIGIN}/api/build-sha.json`);
  const productionSha = prodBuild ? prodBuild.sha || null : null;
  const laneHeadRaw = prodBuild && typeof prodBuild.contentLaneHead === 'string' ? prodBuild.contentLaneHead.trim() : '';
  const productionContentLaneHead = /^[0-9a-f]{7,40}$/i.test(laneHeadRaw) ? laneHeadRaw.toLowerCase() : null;
  const csp = await observeCsp();
  const browser = WITH_BROWSER ? await observeBrowser() : { captured: false, target: null, consoleErrors: null, signalCardinality: null, signalEndpoints: [] };
  const shellParity = readShellParityEvidence();

  const receipt = derivePromotionReceipt({
    promotedSha: buildSha,
    productionSha,
    productionReachable: Boolean(prodBuild),
    ordering: gitOrdering(buildSha, productionSha),
    productionContentLaneHead,
    contentLaneOrdering: productionContentLaneHead && productionSha !== buildSha ? gitOrdering(buildSha, productionContentLaneHead) : 'unknown',
    csp,
    browser,
    shellParity,
    now: Date.now(),
    sourcePolicyMode: 'enforce',
  });
  receipt.generatedAt = new Date().toISOString();
  // Append to the history ledger, then embed the streak so /status/ and status-proof
  // both carry "does production RELIABLY reconcile" without a second fetch.
  appendHistory(historyRecordOf(receipt));
  receipt.history = summarizeHistory(readHistory());
  fs.writeFileSync(OUT, JSON.stringify(receipt, null, 2) + '\n', 'utf8');
  const parity = receipt.production.shellParity;
  console.log(`build-promotion-receipt --emit: ${receipt.receiptState} · sha=${receipt.production.reconciliation} · shell=${parity.state}${parity.stale ? '(stale)' : ''} · csp=${receipt.csp.mode} · browser=${receipt.browser.captured ? receipt.browser.consoleErrors + ' err' : 'honest-dark'} · streak=${receipt.history.reconciled}/${receipt.history.gradable}`);
  return receipt;
}

// ── Structure + invariant check (no re-fetch) ────────────────────────────────
const ENUM_RECONCILIATION = new Set(['match', 'content-lane-match', 'ahead', 'behind', 'unreachable', 'unknown']);
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
  const routeKeys = new Set();
  for (const route of r.browser?.routes || []) {
    if (!route.route || routeKeys.has(route.route)) errors.push('browser.routes must use unique non-empty route keys');
    routeKeys.add(route.route);
    if (route.captured === false && (route.consoleErrors !== null || route.signalCardinality !== null)) {
      errors.push(`honest-dark violation: route ${route.route} captured=false but numeric fields are non-null`);
    }
  }
  // Content-lane reconciliation must carry BOTH halves of its evidence. A receipt
  // claiming content-lane-match without a fresh `matched` shell parity is exactly
  // the stranded-shell false-green this field exists to prevent.
  const parity = r.production?.shellParity;
  if (parity !== undefined && parity !== null) {
    if (!SHELL_PARITY_STATES.has(parity.state)) errors.push('production.shellParity.state invalid');
    if (parity.observedAt === null && (parity.ageHours !== null || parity.stale !== true)) {
      errors.push('honest-dark violation: shellParity has no observedAt but reports an age/freshness');
    }
  }
  if (r.production?.reconciliation === 'content-lane-match' && !(parity && parity.state === 'matched' && parity.stale === false)) {
    errors.push("content-lane-match requires shell parity observed as 'matched' and fresh — the same evidence build-deploy-currency requires for content-current");
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
  const NOW = Date.parse('2026-09-14T12:00:00Z');
  const hoursAgo = (h) => new Date(NOW - h * 3_600_000).toISOString();
  const base = {
    promotedSha: 'a'.repeat(40), productionSha: 'a'.repeat(40), productionReachable: true,
    csp: { observed: true, apexReachable: true, mode: 'enforce', nonce: true, reportOnlyAlso: true, headerName: 'content-security-policy' },
    browser: { captured: true, target: 'x', consoleErrors: 0, signalCardinality: 7, signalEndpoints: ['api/uptime.json'] },
    shellParity: { state: 'matched', observedAt: hoursAgo(1), source: 'api/deploy-currency.json → shellParity' },
    now: NOW,
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
  const fabricatedRoute = { ...healthy, browser: { ...healthy.browser, routes: [
    { route: '/vault-member/', captured: false, consoleErrors: 0, signalCardinality: 0, signalEndpoints: [] },
  ] } };
  cases.push(['route matrix enforces honest-dark per route', validateReceiptShape(fabricatedRoute).errors.some((e) => /route \/vault-member\//.test(e))]);

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
  const stranded = summarizeHistory([
    { ts: hoursAgo(6), receiptState: 'degraded', reconciliation: 'behind' },
    { ts: hoursAgo(2), receiptState: 'degraded', reconciliation: 'behind' },
  ], 20, { now: NOW });
  cases.push(['fresh two consecutive behind records raise stranded alert', stranded.currentBehindStreak === 2 && stranded.strandedAlert && stranded.stale === false]);
  // THE LIVE CASE (S356): a 9-long behind tail whose newest record is ~90h old.
  const staleTail = summarizeHistory(Array.from({ length: 9 }, (_, n) => (
    { ts: hoursAgo(90 + (8 - n)), receiptState: 'degraded', reconciliation: 'behind' }
  )), 20, { now: NOW });
  cases.push(['stale behind streak (newest >48h) → stale, NO stranded alert', staleTail.stale === true && staleTail.strandedAlert === false && staleTail.currentBehindStreak === 9 && staleTail.newestAgeHours === 90]);
  const edge = summarizeHistory([
    { ts: hoursAgo(49), receiptState: 'degraded', reconciliation: 'behind' },
    { ts: hoursAgo(47), receiptState: 'degraded', reconciliation: 'behind' },
  ], 20, { now: NOW });
  cases.push(['freshness is judged on the NEWEST gradable record (47h → fresh)', edge.stale === false && edge.strandedAlert === true]);
  const unparseable = summarizeHistory([
    { ts: 't1', receiptState: 'degraded', reconciliation: 'behind' },
    { ts: 't2', receiptState: 'degraded', reconciliation: 'behind' },
  ], 20, { now: NOW });
  cases.push(['unparseable timestamps cannot prove freshness → stale, no alert', unparseable.stale === true && unparseable.strandedAlert === false]);
  const ungradableTail = summarizeHistory([
    { ts: hoursAgo(100), receiptState: 'degraded', reconciliation: 'behind' },
    { ts: hoursAgo(1), receiptState: 'unverified', reconciliation: 'behind' },
  ], 20, { now: NOW });
  cases.push(['a fresh UNVERIFIED record does not refresh a stale ledger', ungradableTail.stale === true && ungradableTail.strandedAlert === false]);

  // content-lane reconciliation (served sha = baseline, contentLaneHead advanced)
  const laneEq = derivePromotionReceipt({ ...base, productionSha: 'e'.repeat(40), ordering: 'behind', productionContentLaneHead: 'a'.repeat(40), contentLaneOrdering: 'same' });
  cases.push(['content-lane head == promoted → content-lane-match, reconciled, not degraded', laneEq.production.reconciliation === 'content-lane-match' && laneEq.reconciled === true && laneEq.receiptState === 'verified' && laneEq.production.contentLaneHead === 'a'.repeat(40)]);
  const laneShort = derivePromotionReceipt({ ...base, productionSha: 'e'.repeat(40), ordering: 'behind', productionContentLaneHead: 'a'.repeat(12), contentLaneOrdering: 'unknown' });
  cases.push(['short content-lane head prefix of promoted → content-lane-match', laneShort.production.reconciliation === 'content-lane-match' && laneShort.reconciled === true]);
  const laneAhead = derivePromotionReceipt({ ...base, productionSha: 'e'.repeat(40), ordering: 'behind', productionContentLaneHead: 'f'.repeat(40), contentLaneOrdering: 'ahead' });
  cases.push(['content-lane head descends from promoted → content-lane-match', laneAhead.production.reconciliation === 'content-lane-match' && laneAhead.reconciled === true]);
  const laneBehind = derivePromotionReceipt({ ...base, productionSha: 'e'.repeat(40), ordering: 'behind', productionContentLaneHead: '9'.repeat(40), contentLaneOrdering: 'behind' });
  cases.push(['content-lane head OLDER than promoted stays behind/degraded', laneBehind.production.reconciliation === 'behind' && laneBehind.receiptState === 'degraded']);
  const laneMalformed = derivePromotionReceipt({ ...base, productionSha: 'e'.repeat(40), ordering: 'behind', productionContentLaneHead: 'not-a-sha', contentLaneOrdering: 'ahead' });
  cases.push(['malformed content-lane head is ignored (no false reconcile)', laneMalformed.production.reconciliation === 'behind' && laneMalformed.production.contentLaneHead === null]);
  cases.push(['content-lane-match receipt passes shape validation', validateReceiptShape(laneEq).errors.length === 0]);

  // The stranded-shell false-green: a lane-head match is NOT enough on its own.
  const laneNoParity = derivePromotionReceipt({ ...base, productionSha: 'e'.repeat(40), ordering: 'behind', productionContentLaneHead: 'a'.repeat(40), contentLaneOrdering: 'same', shellParity: { state: 'unobserved', observedAt: null } });
  cases.push(['lane-head match WITHOUT matched shell parity does not reconcile (honest-dark unknown)',
    laneNoParity.production.reconciliation === 'unknown' && laneNoParity.reconciled === false && laneNoParity.receiptState === 'unverified'
    && laneNoParity.findings.some((f) => /shell parity was not observed as matched/.test(f))]);
  const laneStaleParity = derivePromotionReceipt({ ...base, productionSha: 'e'.repeat(40), ordering: 'behind', productionContentLaneHead: 'a'.repeat(40), contentLaneOrdering: 'same', shellParity: { state: 'matched', observedAt: hoursAgo(48) } });
  cases.push(['a STALE matched parity cannot certify a content lane either',
    laneStaleParity.production.reconciliation === 'unknown' && laneStaleParity.production.shellParity.stale === true && laneStaleParity.receiptState === 'unverified']);
  const laneDrift = derivePromotionReceipt({ ...base, productionSha: 'e'.repeat(40), ordering: 'behind', productionContentLaneHead: 'a'.repeat(40), contentLaneOrdering: 'same', shellParity: { state: 'drift', observedAt: hoursAgo(1) } });
  cases.push(['observed shell DRIFT is evidence of a stranded deploy → behind + degraded',
    laneDrift.production.reconciliation === 'behind' && laneDrift.receiptState === 'degraded' && laneDrift.findings.some((f) => /drift/.test(f))]);
  cases.push(['a plain sha match is unaffected by parity evidence', derivePromotionReceipt({ ...base, shellParity: { state: 'unobserved', observedAt: null } }).receiptState === 'verified']);
  const laneNoEvidence = { ...laneEq, production: { ...laneEq.production, shellParity: { state: 'unobserved', observedAt: null, ageHours: null, stale: true, maxAgeHours: 12, source: null } } };
  cases.push(['content-lane-match without matched parity is a shape error', validateReceiptShape(laneNoEvidence).errors.some((e) => /shell parity/.test(e))]);
  cases.push(['shellParity honest-dark: unknown state + no timestamp → unobserved, stale, null age',
    normalizeShellParity(undefined, { now: NOW }).state === 'unobserved' && normalizeShellParity({ state: 'weird', observedAt: null }, { now: NOW }).stale === true && normalizeShellParity(null, { now: NOW }).ageHours === null]);
  cases.push(['shellParity age is measured, not assumed', normalizeShellParity({ state: 'matched', observedAt: hoursAgo(3) }, { now: NOW }).ageHours === 3]);
  cases.push(['fabricated parity age without an observedAt is a shape error',
    validateReceiptShape({ ...healthy, production: { ...healthy.production, shellParity: { state: 'matched', observedAt: null, ageHours: 0, stale: false, maxAgeHours: 12, source: null } } }).errors.some((e) => /honest-dark/.test(e))]);

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
