#!/usr/bin/env node
/**
 * check-s151-contracts.mjs
 *
 * Structural guard for Session 151:
 * - homepage below-fold intelligence is owned by home-idle-loader.js
 * - deploy parity checker keeps live perf proof honest
 * - public links to /studio-pulse/ label the product as Studio Pulse (S185 rename)
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SELF_TEST = process.argv.includes('--self-test');

const HOME_IDLE_SCRIPTS = [
  '/assets/heartbeat.js',
  '/assets/studio-milestones.js',
  '/assets/home-intelligence.js',
  '/assets/home-personalized.js',
  '/assets/studio-stats.js',
  '/assets/ignis-live.js',
  '/assets/micro-feedback.js',
  '/assets/showcase-spine.js',
];

const SKIP_DIRS = new Set([
  '.git',
  '.github',
  '.well-known',
  '.wrangler',
  '.cache',
  '.ops-cache',
  'node_modules',
  'playwright-report',
  'test-results',
  'scripts',
]);

function scriptTagFor(src) {
  return new RegExp(`<script\\b[^>]*\\bsrc=["']${src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'i');
}

function anchorTextForHref(html, href) {
  const re = new RegExp(`<a\\b[^>]*\\bhref=["']${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>([\\s\\S]*?)<\\/a>`, 'gi');
  const out = [];
  let match;
  while ((match = re.exec(html))) {
    out.push(match[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
  }
  return out;
}

function walkHtml(dir, base = dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const rel = relative(base, full).replace(/\\/g, '/');
    const st = statSync(full);
    if (st.isDirectory()) files.push(...walkHtml(full, base));
    if (st.isFile() && name.endsWith('.html')) files.push({ full, rel });
  }
  return files;
}

function collectFailures({ homeHtml, paritySource, htmlFiles }) {
  const failures = [];

  if (!scriptTagFor('/assets/home-idle-loader.js').test(homeHtml)) {
    failures.push('index.html: missing /assets/home-idle-loader.js');
  }

  for (const src of HOME_IDLE_SCRIPTS) {
    if (scriptTagFor(src).test(homeHtml)) {
      failures.push(`index.html: ${src} must be loaded by home-idle-loader.js, not directly`);
    }
  }

  if (!/--self-test/.test(paritySource) || !/expectedShellPaths/.test(paritySource) || !/deployedShellPaths/.test(paritySource)) {
    failures.push('scripts/check-deploy-parity.mjs: missing parser self-test contract');
  }

  for (const { rel, html } of htmlFiles) {
    const labels = anchorTextForHref(html, '/studio-pulse/');
    for (const label of labels) {
      if (/Forge Window/i.test(label)) {
        failures.push(`${rel}: stale /studio-pulse/ link label "${label}" (renamed to Studio Pulse)`);
      }
    }
  }

  const pulse = htmlFiles.find((file) => file.rel === 'studio-pulse/index.html');
  if (pulse && !/<title>Studio Pulse — VaultSpark Studios<\/title>/.test(pulse.html)) {
    failures.push('studio-pulse/index.html: title must use Studio Pulse');
  }

  return failures;
}

function runSelfTest() {
  const good = collectFailures({
    homeHtml: '<script src="/assets/home-idle-loader.js" defer></script>',
    paritySource: 'function expectedShellPaths(){} function deployedShellPaths(){} "--self-test"',
    htmlFiles: [
      { rel: 'index.html', html: '<a href="/studio-pulse/">Studio Pulse</a>' },
      { rel: 'studio-pulse/index.html', html: '<title>Studio Pulse — VaultSpark Studios</title><a href="/studio-pulse/">Studio Pulse</a>' },
    ],
  });
  const bad = collectFailures({
    homeHtml: '<script src="/assets/heartbeat.js" defer></script>',
    paritySource: 'missing',
    htmlFiles: [
      { rel: 'index.html', html: '<a href="/studio-pulse/">Forge Window</a>' },
      { rel: 'studio-pulse/index.html', html: '<title>Forge Window — VaultSpark Studios</title>' },
    ],
  });

  if (good.length) throw new Error(`good fixture failed: ${good.join('; ')}`);
  if (bad.length < 4) throw new Error(`bad fixture missed drift: ${bad.join('; ')}`);
  console.log('check-s151-contracts self-test passed');
}

function run() {
  const homeHtml = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const parityPath = join(ROOT, 'scripts', 'check-deploy-parity.mjs');
  const paritySource = existsSync(parityPath) ? readFileSync(parityPath, 'utf8') : '';
  const htmlFiles = walkHtml(ROOT).map((file) => ({
    ...file,
    html: readFileSync(file.full, 'utf8'),
  }));
  const failures = collectFailures({ homeHtml, paritySource, htmlFiles });

  if (!failures.length) {
    console.log(`S151 contracts ✓ (${htmlFiles.length} HTML pages checked)`);
    return;
  }

  console.error('check-s151-contracts failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

if (SELF_TEST) {
  runSelfTest();
} else {
  run();
}
