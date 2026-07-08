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
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CONFIG = path.join(ROOT, 'config', 'lighthouse-route-tiers.json');
const LHR_DIR = path.join(ROOT, 'lighthouse-results');
const TREND_FILE = path.join(ROOT, '.cache', 'lighthouse-trend.json');
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];

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

function evaluate(config, resultSet) {
  const findings = validateConfig(config);
  const rows = [];
  if (!resultSet?.pages) {
    findings.push('no Lighthouse result source found');
    return { ok: false, source: null, rows, findings };
  }
  for (const [route, scores] of Object.entries(resultSet.pages)) {
    const tierName = config.routes?.[route] || config.defaultTier;
    const tier = config.tiers?.[tierName];
    if (!tier) {
      findings.push(`${route} has no valid tier`);
      continue;
    }
    for (const category of CATEGORIES) {
      const score = scores?.[category];
      const floor = tier[category];
      if (typeof score !== 'number') continue;
      const pass = score >= floor;
      rows.push({ route, tier: tierName, category, score, floor, pass });
      if (!pass) findings.push(`${route} ${category} ${score.toFixed(2)} < ${floor.toFixed(2)} (${tierName})`);
    }
  }
  return { ok: findings.length === 0, source: resultSet.source, date: resultSet.date || null, rows, findings };
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
  const cases = [
    ['tier pass accepts explicit longtail floor', pass.ok],
    ['core miss fails with route/category detail', !fail.ok && fail.findings.some((f) => f.includes('/ performance'))],
    ['unknown tier fails config validation', badConfig.some((f) => f.includes('unknown tier'))],
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
const result = evaluate(config, resultSet);
if (result.ok) {
  const routeCount = new Set(result.rows.map((row) => row.route)).size;
  console.log(`check-lighthouse-route-tiers: ok (${routeCount} route(s), source=${result.source}${result.date ? ` ${result.date}` : ''})`);
} else {
  console.error(`check-lighthouse-route-tiers: FAIL (${result.source || 'no-source'})`);
  for (const finding of result.findings) console.error(`  - ${finding}`);
}
process.exit(result.ok ? 0 : 1);
