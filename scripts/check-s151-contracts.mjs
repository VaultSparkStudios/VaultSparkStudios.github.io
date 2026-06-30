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

// Visible text only: drop <script>/<style> blocks, strip all tags, collapse
// whitespace. So a label split across tags (`Forge<br>Window`) is rejoined into
// "Forge Window" — the form a visitor actually reads.
function visibleText(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
  // S222: the title+nav gate above never inspected the page BODY — which is
  // exactly how the stale "The Forge Window" H1 (the single most prominent
  // on-page label) survived the S185 rename invisibly for 30+ sessions
  // (the D-S208.1 anti-pattern: a gate that skips the surface where the label
  // lives can't catch the lie). Police the visible body too. The `forge window`
  // bigram is the banned product LABEL; it does not match the `.forge-*` CSS
  // class names or the "forge" verb/metaphor prose ("Live from the forge").
  if (pulse && /forge\s+window/i.test(visibleText(pulse.html))) {
    failures.push('studio-pulse/index.html: body still shows the retired "Forge Window" label (S185 → Studio Pulse)');
  }

  return failures;
}

function runSelfTest() {
  const good = collectFailures({
    homeHtml: '<script src="/assets/home-idle-loader.js" defer></script>',
    paritySource: 'function expectedShellPaths(){} function deployedShellPaths(){} "--self-test"',
    htmlFiles: [
      { rel: 'index.html', html: '<a href="/studio-pulse/">Studio Pulse</a>' },
      // Non-false-positive: a body full of legitimate "forge" metaphor prose +
      // the `.forge-*` CSS class names must NOT trip the body label gate.
      { rel: 'studio-pulse/index.html', html: '<title>Studio Pulse — VaultSpark Studios</title><a href="/studio-pulse/">Studio Pulse</a><section class="forge-hero"><div class="forge-live-pill">Live from the forge</div><h1 class="forge-h1">Studio<br>Pulse</h1><a class="button-secondary">Get closer to the forge</a></section>' },
    ],
  });
  const bad = collectFailures({
    homeHtml: '<script src="/assets/studio-milestones.js" defer></script>',
    paritySource: 'missing',
    htmlFiles: [
      { rel: 'index.html', html: '<a href="/studio-pulse/">Forge Window</a>' },
      // Detection: the retired label split across tags (`Forge<br>Window`) must
      // still be caught once tags are stripped to visible text.
      { rel: 'studio-pulse/index.html', html: '<title>Forge Window — VaultSpark Studios</title><h1 class="forge-h1">The Forge<br>Window</h1>' },
    ],
  });

  if (good.length) throw new Error(`good fixture failed: ${good.join('; ')}`);
  if (bad.length < 4) throw new Error(`bad fixture missed drift: ${bad.join('; ')}`);
  // The bad studio-pulse fixture must trip the BODY gate specifically, not just title.
  if (!bad.some((f) => /body still shows the retired "Forge Window" label/.test(f))) {
    throw new Error('body label gate did not fire on split-tag "Forge<br>Window"');
  }
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
