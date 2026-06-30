#!/usr/bin/env node
/**
 * build-og-coverage.mjs — S239 OG-coverage observability feed.
 *
 * Persists a snapshot of OG-card coverage to api/og-coverage.json so the
 * triage state is measurable over time, not just a transient build-log line.
 * Reuses check-og-images.mjs exports (single source of classification truth).
 *
 * Emits:
 *   generatedAt   — ISO timestamp of this run
 *   total         — git-tracked HTML pages scanned
 *   carded        — pages with an explicit og:image (real raster, not SVG)
 *   dark          — pages intentionally excluded (auth flows, internal dashboards…)
 *   untriaged     — pages with no card and no dark-list entry (must be 0 to pass check-og-images)
 *   uniqueWarnCount — pages sharing an OG image with another page (advisory only)
 *   coverageRatio   — carded / (total - dark) — share-card coverage of public pages
 *
 * Usage:
 *   node scripts/build-og-coverage.mjs            # write api/og-coverage.json
 *   node scripts/build-og-coverage.mjs --check    # verify file present, fresh, valid shape
 *   node scripts/build-og-coverage.mjs --self-test
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from './lib/safe-spawn.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isOgDark, metaImage, checkOgUniqueness } from './check-og-images.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'api', 'og-coverage.json');
const MAX_DAYS = 2;

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const SELF_TEST = args.includes('--self-test');

export function buildCoverage({ pages }) {
  let carded = 0, dark = 0, untriaged = 0;
  const pageImages = [];

  for (const { file, html } of pages) {
    const og = metaImage(html, 'og:image');
    if (!og) {
      if (isOgDark(file)) dark++;
      else untriaged++;
    } else {
      carded++;
    }
    pageImages.push({ file, url: og });
  }

  const uniqueWarnings = checkOgUniqueness(pageImages);
  const uniqueWarnCount = uniqueWarnings.filter((w) => w.level === 'warn').length;
  const publicPages = pages.length - dark;
  const coverageRatio = publicPages > 0 ? Math.round((carded / publicPages) * 1000) / 1000 : 1;

  return {
    total: pages.length,
    carded,
    dark,
    untriaged,
    uniqueWarnCount,
    coverageRatio,
  };
}

function scanPages() {
  const files = execSync('git ls-files "*.html"', { cwd: ROOT, encoding: 'utf8' })
    .split('\n').filter(Boolean).filter((f) => !f.startsWith('docs/'));
  return files.map((file) => ({
    file,
    html: readFileSync(join(ROOT, file), 'utf8'),
  }));
}

function runSelfTest() {
  let fail = 0;
  const assert = (cond, msg) => { if (!cond) { console.error('  ✗ ' + msg); fail++; } else { console.log('  ✓ ' + msg); } };

  const pages = [
    { file: 'index.html',                     html: '<meta property="og:image" content="/assets/og-home.png">' },
    { file: 'games/cod/index.html',            html: '<meta property="og:image" content="/assets/og-cod.png">' },
    { file: 'games/new/index.html',            html: '<meta property="og:image" content="/assets/og-cod.png">' }, // shared — uniqueWarn
    { file: 'login.html',                      html: '' }, // intentionally dark
    { file: 'some-new-public/index.html',      html: '' }, // untriaged
  ];

  const cov = buildCoverage({ pages });
  assert(cov.total === 5, `total=5 (got ${cov.total})`);
  assert(cov.carded === 3, `carded=3 (got ${cov.carded})`);
  assert(cov.dark === 1, `dark=1 (got ${cov.dark})`);
  assert(cov.untriaged === 1, `untriaged=1 (got ${cov.untriaged})`);
  assert(cov.uniqueWarnCount === 1, `uniqueWarnCount=1 (got ${cov.uniqueWarnCount})`);
  // coverageRatio = carded / (total - dark) = 3 / 4 = 0.75
  assert(cov.coverageRatio === 0.75, `coverageRatio=0.75 (got ${cov.coverageRatio})`);

  const total = 6;
  if (fail === 0) { console.log(`✓ build-og-coverage --self-test: ${total}/${total} passed`); process.exit(0); }
  console.error(`✗ build-og-coverage --self-test: ${fail} failure(s)`); process.exit(1);
}

function runCheck() {
  if (!existsSync(OUT)) {
    console.error(`✗ build-og-coverage --check: ${OUT} missing — run: node scripts/build-og-coverage.mjs`);
    process.exit(1);
  }
  let data;
  try { data = JSON.parse(readFileSync(OUT, 'utf8')); } catch { console.error('✗ build-og-coverage --check: invalid JSON'); process.exit(1); }
  const required = ['generatedAt', 'total', 'carded', 'dark', 'untriaged', 'uniqueWarnCount', 'coverageRatio'];
  const missing = required.filter((k) => data[k] === undefined);
  if (missing.length) { console.error(`✗ build-og-coverage --check: missing fields: ${missing.join(', ')}`); process.exit(1); }
  const ageDays = (Date.now() - new Date(data.generatedAt).getTime()) / 86400000;
  if (ageDays > MAX_DAYS) {
    console.error(`✗ build-og-coverage --check: stale (${ageDays.toFixed(1)}d > ${MAX_DAYS}d) — run: node scripts/build-og-coverage.mjs`);
    process.exit(1);
  }
  console.log(`✓ build-og-coverage --check: ${data.carded}/${data.total - data.dark} public pages carded · ${data.dark} dark · ${ageDays.toFixed(1)}d old`);
}

function runBuild() {
  const pages = scanPages();
  const coverage = buildCoverage({ pages });
  const payload = { schemaVersion: '1.0', generatedAt: new Date().toISOString(), ...coverage };
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n');
  console.log(`✓ build-og-coverage: ${coverage.carded}/${coverage.total - coverage.dark} public pages carded · ${coverage.dark} dark · ${coverage.untriaged} untriaged → ${OUT}`);
}

const invokedDirectly = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('build-og-coverage.mjs');
if (invokedDirectly) {
  if (SELF_TEST) runSelfTest();
  else if (CHECK) runCheck();
  else runBuild();
}
