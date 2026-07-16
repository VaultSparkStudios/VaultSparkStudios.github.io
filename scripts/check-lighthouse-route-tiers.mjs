#!/usr/bin/env node
/**
 * Route-tier Lighthouse contract.
 *
 * LHCI's single global assertion is too blunt for this site: first-impression and
 * trust routes need the strict release bar, while heavier catalog/generated routes
 * need explicit, named floors rather than silent exemptions. This checker reads
 * the latest Lighthouse result set when available, otherwise the trend ledger's
 * newest entry, and validates every audited route against config/lighthouse-route-tiers.json.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decideLighthouseVolatility, LIGHTHOUSE_VOLATILITY_POLICY } from './lib/lighthouse-volatility-policy.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CONFIG = path.join(ROOT, 'config', 'lighthouse-route-tiers.json');
const LHR_DIR = path.join(ROOT, 'lighthouse-results');
const TREND_FILE = path.join(ROOT, '.cache', 'lighthouse-trend.json');
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
// Lab-volatile tiers (config `labVolatile: true`) get single-run-noise tolerance:
// a floor breach is downgraded to advisory ONLY when the committed trend ledger
// corroborates an above-floor recent median across ≥ TREND_MIN_RUNS runs. This
// filters CI-runner lab noise WITHOUT lowering any floor or hiding a real
// regression — a persistent breach drags the trend median down and still
// hard-fails.
//
// The corroboration set must never contain the run under test (that is
// self-corroboration — a sub-floor value would help excuse itself). Two sources,
// one rule:
//   - `lighthouse-results` (fresh CI): the fresh run is not in the committed
//     ledger, so the ledger is already a clean corroborator.
//   - `lighthouse-trend-latest` (the ledger's own newest entry): the run under
//     test IS the ledger's last element, so it must be excluded — corroborate
//     against the PRECEDING runs (`excludeLatest`), the same shape as above.
// D-S280.1 originally disabled tolerance for trend-latest outright. That was
// correct about the hazard but over-broad: the e2e compliance job never has
// fresh Lighthouse results, so it ALWAYS reads trend-latest — meaning one noisy
// sub-floor value hard-failed EVERY subsequent e2e run until a better value
// landed (exactly the flaky-red S280 set out to kill, relocated). evaluate()
// now requires callers to *prove* the corroboration set excludes the run under
// test via `opts.trendExcludesLatest`; absent that proof it stays strict, so an
// unproven caller fails closed rather than silently self-corroborating.
const TREND_WINDOW = LIGHTHOUSE_VOLATILITY_POLICY.trendWindow;
// Advisory-streak tripwire (second-order safeguard): trend-corroboration must not
// become a place where a slow bleed hides. Even if the median stays above floor,
// a route that sits sub-floor in ≥ TREND_MAX_SUBFLOOR of the recent window is
// living at the edge — that is recurring debt, not lab noise, so the downgrade is
// refused and the breach hard-fails.

const args = process.argv.slice(2);
const SELF_TEST = args.includes('--self-test');
const CHECK_CONFIG = args.includes('--check-config');

function median(nums) {
  const sorted = nums.filter((n) => typeof n === 'number' && Number.isFinite(n)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function normalizeRoute(rawUrl) {
  const withoutOrigin = String(rawUrl || '').replace(/^https?:\/\/[^/]+/i, '') || '/';
  const withoutQuery = withoutOrigin.split(/[?#]/)[0] || '/';
  if (withoutQuery === '/') return '/';
  return withoutQuery.endsWith('/') ? withoutQuery : `${withoutQuery}/`;
}

function readLhrMedians(dir) {
  const byRoute = {};
  let files = [];
  try {
    files = fs.readdirSync(dir).filter((f) => /^lhr-.*\.json$/.test(f));
  } catch {
    return null;
  }
  for (const file of files) {
    let lhr = null;
    try {
      lhr = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    } catch {
      continue;
    }
    const route = normalizeRoute(lhr.finalUrl || lhr.requestedUrl || '/');
    byRoute[route] ||= {};
    for (const category of CATEGORIES) {
      const score = lhr.categories?.[category]?.score;
      if (typeof score === 'number') {
        byRoute[route][category] ||= [];
        byRoute[route][category].push(score);
      }
    }
  }
  if (!Object.keys(byRoute).length) return null;
  const pages = {};
  for (const [route, scores] of Object.entries(byRoute)) {
    pages[route] = {};
    for (const category of CATEGORIES) {
      const value = median(scores[category] || []);
      if (value !== null) pages[route][category] = Math.round(value * 100) / 100;
    }
  }
  return { source: 'lighthouse-results', pages };
}

function readTrendLatest(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    const latest = Array.isArray(parsed.runs) ? parsed.runs[parsed.runs.length - 1] : null;
    if (!latest?.pages) return null;
    const pages = {};
    for (const [route, scores] of Object.entries(latest.pages)) {
      pages[normalizeRoute(route)] = Object.fromEntries(
        CATEGORIES
          .filter((category) => typeof scores?.[category] === 'number')
          .map((category) => [category, scores[category]])
      );
    }
    return { source: 'lighthouse-trend-latest', date: latest.date || null, pages };
  } catch {
    return null;
  }
}

// Recent per-route/category medians from the committed trend ledger, used ONLY to
// corroborate (never to source) a lab-volatile floor breach. Returns
// { route: { category: { median, count } } } or null when the ledger is absent.
//
// `excludeLatest` drops the ledger's newest run before taking the window. Pass it
// whenever the run under test IS that newest entry (source=lighthouse-trend-latest),
// so the value being judged cannot vote on its own corroboration.
function readTrendMedians(file, window = TREND_WINDOW, { excludeLatest = false } = {}) {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
  const all = Array.isArray(parsed.runs) ? parsed.runs : [];
  const eligible = excludeLatest ? all.slice(0, -1) : all;
  const runs = eligible.slice(-window);
  const byRoute = {};
  for (const run of runs) {
    for (const [route, scores] of Object.entries(run.pages || {})) {
      const key = normalizeRoute(route);
      byRoute[key] ||= {};
      for (const category of CATEGORIES) {
        const value = scores?.[category];
        if (typeof value === 'number' && Number.isFinite(value)) {
          (byRoute[key][category] ||= []).push(value);
        }
      }
    }
  }
  const out = {};
  for (const [route, cats] of Object.entries(byRoute)) {
    out[route] = {};
    for (const [category, values] of Object.entries(cats)) {
      out[route][category] = { median: median(values), count: values.length, values };
    }
  }
  return out;
}

function validateConfig(config) {
  const findings = [];
  if (!config || typeof config !== 'object') findings.push('config must be a JSON object');
  if (!config?.tiers || typeof config.tiers !== 'object') findings.push('tiers must be an object');
  if (!config?.routes || typeof config.routes !== 'object') findings.push('routes must be an object');
  if (!config?.globalMinimum || typeof config.globalMinimum !== 'object') findings.push('globalMinimum must be an object');
  for (const category of CATEGORIES) {
    const value = config?.globalMinimum?.[category];
    if (typeof value !== 'number') findings.push(`globalMinimum.${category} must be numeric`);
  }
  for (const [tierName, tier] of Object.entries(config?.tiers || {})) {
    for (const category of CATEGORIES) {
      const value = tier?.[category];
      if (typeof value !== 'number') findings.push(`tiers.${tierName}.${category} must be numeric`);
      const minimum = config?.globalMinimum?.[category];
      if (typeof value === 'number' && typeof minimum === 'number' && value < minimum) {
        findings.push(`tiers.${tierName}.${category} ${value} is below globalMinimum ${minimum}`);
      }
    }
  }
  for (const [route, tierName] of Object.entries(config?.routes || {})) {
    if (!config?.tiers?.[tierName]) findings.push(`routes.${route} references unknown tier ${tierName}`);
  }
  return findings;
}

function evaluate(config, resultSet, trendMedians = null, opts = {}) {
  const findings = validateConfig(config);
  const warnings = [];
  const rows = [];
  if (!resultSet?.pages) {
    findings.push('no Lighthouse result source found');
    return { ok: false, source: null, rows, findings, warnings };
  }
  // Corroboration is valid only when the corroborating set provably excludes the
  // run under test. A fresh CI run is never in the committed ledger, so it always
  // qualifies. The ledger's own newest entry qualifies ONLY when the caller proves
  // it excluded that entry (`trendExcludesLatest`) — otherwise the value would be
  // helping excuse itself, so we stay strict and fail closed.
  const fromFreshRun = resultSet.source === 'lighthouse-results';
  const fromTrendLatest = resultSet.source === 'lighthouse-trend-latest';
  const corroborable = fromFreshRun || (fromTrendLatest && opts.trendExcludesLatest === true);
  for (const [route, scores] of Object.entries(resultSet.pages)) {
    const tierName = config.routes?.[route] || config.defaultTier;
    const tier = config.tiers?.[tierName];
    if (!tier) {
      findings.push(`${route} has no valid tier`);
      continue;
    }
    const labVolatile = tier.labVolatile === true;
    for (const category of CATEGORIES) {
      const score = scores?.[category];
      const floor = tier[category];
      if (typeof score !== 'number') continue;
      const pass = score >= floor;
      let downgraded = false;
      let handled = false;
      if (!pass) {
        const t = trendMedians?.[route]?.[category];
        const decision = decideLighthouseVolatility({ score, floor, labVolatile, corroborable, trend: t });
        if (decision.classification === 'advisory') {
          downgraded = true;
          handled = true;
          const corroborator = fromTrendLatest ? 'preceding committed' : 'committed';
          warnings.push(
            `${route} ${category} ${score.toFixed(2)} < ${floor.toFixed(2)} (${tierName}) — single-run lab dip; ` +
            `${corroborator} trend median ${t.median.toFixed(2)} across ${t.count} run(s) ≥ floor → advisory only`
          );
        } else if (decision.reason === 'recurring-sub-floor') {
          // Median still above floor but the route is recurrently sub-floor → slow bleed, not noise.
          handled = true;
          findings.push(
            `${route} ${category} ${score.toFixed(2)} < ${floor.toFixed(2)} (${tierName}) — recurring sub-floor ` +
            `(${decision.trend.subFloor}/${decision.trend.count} recent runs below floor); trend-corroboration refused → hard fail`
          );
        }
      }
      rows.push({ route, tier: tierName, category, score, floor, pass, downgraded });
      if (!pass && !handled) findings.push(`${route} ${category} ${score.toFixed(2)} < ${floor.toFixed(2)} (${tierName})`);
    }
  }
  return { ok: findings.length === 0, source: resultSet.source, date: resultSet.date || null, rows, findings, warnings };
}

if (SELF_TEST) {
  const fixtureConfig = {
    globalMinimum: { performance: 0.78, accessibility: 0.95, 'best-practices': 0.9, seo: 0.95 },
    defaultTier: 'longtail',
    tiers: {
      core: { performance: 0.85, accessibility: 0.95, 'best-practices': 0.9, seo: 0.95 },
      longtail: { performance: 0.78, accessibility: 0.95, 'best-practices': 0.9, seo: 0.95 },
    },
    routes: { '/': 'core', '/archive/': 'longtail' },
  };
  const pass = evaluate(fixtureConfig, { source: 'fixture', pages: {
    '/': { performance: 0.86, accessibility: 0.95, 'best-practices': 0.9, seo: 0.95 },
    '/archive/': { performance: 0.78, accessibility: 0.95, 'best-practices': 0.9, seo: 0.95 },
  } });
  const fail = evaluate(fixtureConfig, { source: 'fixture', pages: {
    '/': { performance: 0.84, accessibility: 0.95, 'best-practices': 0.9, seo: 0.95 },
  } });
  const badConfig = validateConfig({ ...fixtureConfig, routes: { '/': 'missing' } });

  // Lab-volatile corroboration cases: the homepage tier is flagged labVolatile.
  const volatileConfig = {
    globalMinimum: { performance: 0.76, accessibility: 0.95, 'best-practices': 0.9, seo: 0.95 },
    defaultTier: 'longtail',
    tiers: {
      core: { performance: 0.85, accessibility: 0.95, 'best-practices': 0.9, seo: 0.95 },
      longtail: { labVolatile: true, performance: 0.76, accessibility: 0.95, 'best-practices': 0.9, seo: 0.95 },
    },
    routes: { '/': 'longtail', '/community/': 'core' },
  };
  const freshDip = { source: 'lighthouse-results', pages: { '/': { performance: 0.72, accessibility: 0.95, 'best-practices': 0.9, seo: 0.95 } } };
  // healthy trend (median 0.78 ≥ floor, 4 above-floor runs) → single dip downgraded to advisory
  const healthyTrend = { '/': { performance: { median: 0.78, count: 4, values: [0.77, 0.78, 0.78, 0.79] } } };
  const dipCorroborated = evaluate(volatileConfig, freshDip, healthyTrend);
  // trend also below floor → persistent regression, still hard-fails
  const sickTrend = { '/': { performance: { median: 0.71, count: 4, values: [0.70, 0.71, 0.71, 0.72] } } };
  const dipPersistent = evaluate(volatileConfig, freshDip, sickTrend);
  // thin trend (< TREND_MIN_RUNS) → fail-closed
  const thinTrend = { '/': { performance: { median: 0.79, count: 2, values: [0.79, 0.79] } } };
  const dipThinTrend = evaluate(volatileConfig, freshDip, thinTrend);
  // trend-latest source with an UNPROVEN corroboration set → strict, fail-closed.
  // (The caller did not prove it excluded the run under test, so the dip could be
  // voting on its own corroboration. This is the D-S280.1 hazard, still guarded.)
  const trendSourceDip = { source: 'lighthouse-trend-latest', pages: { '/': { performance: 0.72, accessibility: 0.95, 'best-practices': 0.9, seo: 0.95 } } };
  const dipFromTrendSource = evaluate(volatileConfig, trendSourceDip, healthyTrend);
  // trend-latest source with a PROVEN latest-excluded set → corroboration is valid,
  // same shape as the fresh-CI path → single dip downgraded to advisory.
  const dipTrendExcluded = evaluate(volatileConfig, trendSourceDip, healthyTrend, { trendExcludesLatest: true });
  // ...but the excludeLatest path must not become a bypass. All three refusals still apply:
  const dipTrendExcludedPersistent = evaluate(volatileConfig, trendSourceDip, sickTrend, { trendExcludesLatest: true });
  const dipTrendExcludedThin = evaluate(volatileConfig, trendSourceDip, thinTrend, { trendExcludesLatest: true });
  // non-lab-volatile tier dip → hard-fails regardless of trend
  const coreDip = { source: 'lighthouse-results', pages: { '/community/': { performance: 0.72, accessibility: 0.95, 'best-practices': 0.9, seo: 0.95 } } };
  const dipCore = evaluate(volatileConfig, coreDip, { '/community/': { performance: { median: 0.90, count: 5, values: [0.9, 0.9, 0.9, 0.9, 0.9] } } });
  // second-order tripwire: median above floor BUT recurring sub-floor (≥2 of 5) → downgrade refused, hard fail
  const bleedTrend = { '/': { performance: { median: 0.77, count: 5, values: [0.72, 0.74, 0.77, 0.79, 0.80] } } };
  const dipRecurring = evaluate(volatileConfig, freshDip, bleedTrend);
  const dipTrendExcludedRecurring = evaluate(volatileConfig, trendSourceDip, bleedTrend, { trendExcludesLatest: true });

  // readTrendMedians({ excludeLatest }) must actually drop the newest run — the
  // whole invariant rests on this, so pin it against a real file rather than trust it.
  const fixtureLedger = path.join(os.tmpdir(), `lh-trend-fixture-${process.pid}.json`);
  const mk = (perf) => ({ date: '2026-01-01', pages: { '/': { performance: perf } } });
  fs.writeFileSync(fixtureLedger, JSON.stringify({ runs: [mk(0.80), mk(0.80), mk(0.80), mk(0.80), mk(0.10)] }));
  const inclusive = readTrendMedians(fixtureLedger, 5);
  const exclusive = readTrendMedians(fixtureLedger, 5, { excludeLatest: true });
  fs.unlinkSync(fixtureLedger);
  const inclusiveSawLatest = (inclusive['/'].performance.values || []).includes(0.10);
  const exclusiveDroppedLatest =
    !(exclusive['/'].performance.values || []).includes(0.10) &&
    exclusive['/'].performance.count === 4;

  const cases = [
    ['tier pass accepts explicit longtail floor', pass.ok],
    ['core miss fails with route/category detail', !fail.ok && fail.findings.some((f) => f.includes('/ performance'))],
    ['unknown tier fails config validation', badConfig.some((f) => f.includes('unknown tier'))],
    ['lab-volatile single dip + healthy trend → advisory (ok)', dipCorroborated.ok && dipCorroborated.warnings.length === 1],
    ['lab-volatile dip + trend-confirmed regression → hard fail', !dipPersistent.ok && dipPersistent.warnings.length === 0],
    ['lab-volatile dip + thin trend → fail-closed', !dipThinTrend.ok],
    ['lab-volatile dip from trend source, corroborator UNPROVEN → strict (fail-closed)', !dipFromTrendSource.ok],
    ['non-lab-volatile tier dip → hard fail regardless of trend', !dipCore.ok],
    ['recurring sub-floor (slow bleed) → downgrade refused, hard fail', !dipRecurring.ok && dipRecurring.findings.some((f) => f.includes('recurring sub-floor'))],
    // trend-latest path (the e2e compliance job's only source) — the S282 fix
    ['trend-latest dip + PROVEN latest-excluded healthy trend → advisory (ok)', dipTrendExcluded.ok && dipTrendExcluded.warnings.length === 1],
    ['trend-latest advisory names the preceding trend as corroborator', dipTrendExcluded.warnings.some((w) => w.includes('preceding committed trend median'))],
    ['trend-latest + latest-excluded but trend-confirmed regression → hard fail', !dipTrendExcludedPersistent.ok && dipTrendExcludedPersistent.warnings.length === 0],
    ['trend-latest + latest-excluded but thin trend → fail-closed', !dipTrendExcludedThin.ok],
    ['trend-latest + latest-excluded but recurring sub-floor → downgrade refused, hard fail', !dipTrendExcludedRecurring.ok && dipTrendExcludedRecurring.findings.some((f) => f.includes('recurring sub-floor'))],
    ['readTrendMedians default window includes the newest run', inclusiveSawLatest],
    ['readTrendMedians({ excludeLatest }) drops the newest run', exclusiveDroppedLatest],
  ];
  let failed = 0;
  for (const [name, ok] of cases) {
    console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
    if (!ok) failed += 1;
  }
  console.log(`\nself-test: ${cases.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

let config = null;
try {
  config = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
} catch (err) {
  console.error(`check-lighthouse-route-tiers: failed to read config (${err.message})`);
  process.exit(1);
}

if (CHECK_CONFIG) {
  const findings = validateConfig(config);
  if (findings.length) {
    for (const finding of findings) console.error(`check-lighthouse-route-tiers: ${finding}`);
    process.exit(1);
  }
  console.log(`check-lighthouse-route-tiers: config ok (${Object.keys(config.routes || {}).length} route(s), ${Object.keys(config.tiers || {}).length} tier(s))`);
  process.exit(0);
}

const resultSet = readLhrMedians(LHR_DIR) || readTrendLatest(TREND_FILE);
// When the result set IS the ledger's newest entry, that entry must not corroborate
// itself — drop it from the corroboration window and tell evaluate() we did.
const fromTrendLatest = resultSet?.source === 'lighthouse-trend-latest';
const trendMedians = readTrendMedians(TREND_FILE, TREND_WINDOW, { excludeLatest: fromTrendLatest });
const result = evaluate(config, resultSet, trendMedians, { trendExcludesLatest: fromTrendLatest });
for (const warning of result.warnings || []) console.warn(`  ⚠ ${warning}`);
if (result.ok) {
  const routeCount = new Set(result.rows.map((row) => row.route)).size;
  const advisory = (result.warnings || []).length ? ` · ${result.warnings.length} advisory` : '';
  console.log(`check-lighthouse-route-tiers: ok (${routeCount} route(s), source=${result.source}${result.date ? ` ${result.date}` : ''}${advisory})`);
} else {
  console.error(`check-lighthouse-route-tiers: FAIL (${result.source || 'no-source'})`);
  for (const finding of result.findings) console.error(`  - ${finding}`);
}
process.exit(result.ok ? 0 : 1);
