#!/usr/bin/env node
/**
 * check-generator-head-contracts.mjs
 *
 * Generator-owned public pages need the same discovery head primitives as
 * hand-authored pages. This gate scans page-generating generate-*.mjs scripts
 * and fails if their templates omit canonical URL, meta description, og:image,
 * or twitter:image.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SCRIPTS = join(ROOT, 'scripts');

const CONTRACTS = [
  { id: 'canonical', label: 'canonical URL', pattern: /rel=["']canonical["']/i },
  { id: 'description', label: 'meta description', pattern: /name=["']description["']/i },
  { id: 'ogImage', label: 'og:image', pattern: /property=["']og:image["']/i },
  { id: 'twitterImage', label: 'twitter:image', pattern: /name=["']twitter:image["']/i },
];

const NON_PAGE_GENERATORS = new Set([
  'generate-build-sha.mjs',
  'generate-changelog-entry.mjs',
  'generate-feed.mjs',
  'generate-founder-presence.mjs',
  'generate-genius-list.mjs',
  'generate-heartbeat.mjs',
  'generate-innovation-pack.mjs',
  'generate-leaderboard-api.mjs',
  'generate-og.mjs',
  'generate-public-intelligence.mjs',
  'generate-push-config.mjs',
  'generate-sitemap.mjs',
]);

export function isPageGenerator(source, name = '') {
  if (NON_PAGE_GENERATORS.has(name)) return false;
  return /index\.html/.test(source) && (
    /<!DOCTYPE html>|<html[\s>]/i.test(source) ||
    /<head[\s>]/i.test(source) ||
    /writeFileSync|writeFile|outputFile/.test(source)
  );
}

export function missingContracts(source) {
  return CONTRACTS.filter((contract) => !contract.pattern.test(source));
}

export function analyzeScript(name, source) {
  if (!isPageGenerator(source, name)) {
    return { name, pageGenerator: false, missing: [] };
  }
  return { name, pageGenerator: true, missing: missingContracts(source) };
}

function runSelfTest() {
  const complete = [
    'writeFileSync("x/index.html", `<!DOCTYPE html><html><head>',
    '<meta name="description" content="x">',
    '<link rel="canonical" href="https://vaultsparkstudios.com/x/">',
    '<meta property="og:image" content="https://vaultsparkstudios.com/og.png">',
    '<meta name="twitter:image" content="https://vaultsparkstudios.com/og.png">',
    '</head></html>`);',
  ].join('\n');
  const missing = complete.replace(/<meta name="twitter:image"[^>]+>/, '');
  const apiOnly = 'writeFileSync("api/heartbeat.json", JSON.stringify({ ok: true }));';
  const cases = [
    ['complete page generator passes', analyzeScript('generate-x.mjs', complete).missing.length === 0],
    ['missing twitter image fails', analyzeScript('generate-x.mjs', missing).missing.map((c) => c.id).includes('twitterImage')],
    ['non-page generator ignored', analyzeScript('generate-heartbeat.mjs', apiOnly).pageGenerator === false],
    ['explicit non-page generator ignored even with index text', analyzeScript('generate-og.mjs', complete).pageGenerator === false],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (failed.length) {
    console.error(`check-generator-head-contracts --self-test: ${failed.length} failure(s)`);
    process.exit(1);
  }
  console.log('check-generator-head-contracts --self-test: all passed');
}

function main() {
  if (process.argv.includes('--self-test')) {
    runSelfTest();
    return;
  }

  const files = readdirSync(SCRIPTS)
    .filter((name) => /^generate-.*\.mjs$/.test(name))
    .sort();
  const analyzed = files.map((name) => analyzeScript(name, readFileSync(join(SCRIPTS, name), 'utf8')));
  const pageGenerators = analyzed.filter((item) => item.pageGenerator);
  const failures = pageGenerators.filter((item) => item.missing.length);

  if (failures.length) {
    console.error(`[generator-head] ${failures.length}/${pageGenerators.length} page generator(s) missing head contract fields:`);
    for (const failure of failures) {
      console.error(`  • ${failure.name}: missing ${failure.missing.map((c) => c.label).join(', ')}`);
    }
    process.exit(1);
  }

  console.log(`[generator-head] ${pageGenerators.length} page generator(s) carry canonical, description, og:image, and twitter:image contracts`);
}

const isDirect = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isDirect) main();
