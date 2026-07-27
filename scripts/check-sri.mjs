#!/usr/bin/env node
/**
 * check-sri.mjs — enforce Subresource Integrity on third-party scripts.
 *
 * Scans every page's index.html for `<script src="https://...">` tags and fails if
 * any cross-origin script that COULD have SRI is missing `integrity` +
 * `crossorigin`. Some CDNs publish moving/dynamic URLs that don't support
 * SRI — those are allow-listed below.
 *
 * Exit codes: 0 clean · 1 violations found.
 * Wired into npm run build:check.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { createHash } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Hosts that publish stable, version-pinned URLs and MUST carry SRI.
const SRI_REQUIRED_HOSTS = [
  'cdn.jsdelivr.net',
  'unpkg.com',
  'cdnjs.cloudflare.com',
];

// Hosts whose scripts cannot carry SRI (dynamic version routing, runtime
// rewrites, or vendor-mandated bootstrap shape). Documented exemptions:
//
// - js.stripe.com           — Stripe v3 bootstrap; vendor rewrites response.
// - challenges.cloudflare.com — Turnstile API loader uses URL versioning.
// - www.googletagmanager.com — GTM is dynamic by design.
// - www.google-analytics.com — same as GTM.
// - vaultsparkstudios.com   — first-party display samples (e.g. /api/leaderboard widget code blocks).
const SRI_EXEMPT_HOSTS = [
  'js.stripe.com',
  'challenges.cloudflare.com',
  'www.googletagmanager.com',
  'www.google-analytics.com',
  'googletagmanager.com',
  'google-analytics.com',
  'vaultsparkstudios.com',
];

const SCRIPT_RE = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
const SAMPLE_BLOCK_RE = /<(pre|code)\b[\s\S]*?<\/\1>/gi;

function findHtmlFiles(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' ||
        entry.name === 'playwright-report' || entry.name === 'test-results') continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) findHtmlFiles(p, acc);
    else if (entry.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

function hostOf(src) {
  try { return new URL(src).hostname; } catch { return null; }
}

let violations = 0;
const files = findHtmlFiles(ROOT);

for (const f of files) {
  const raw = readFileSync(f, 'utf8');
  // Strip code-sample blocks (pre/code) so documented script snippets don't trigger.
  const html = raw.replace(SAMPLE_BLOCK_RE, '');
  let m;
  SCRIPT_RE.lastIndex = 0;
  while ((m = SCRIPT_RE.exec(html))) {
    const tag = m[0];
    const src = m[1];
    if (!src.startsWith('https://')) continue;
    const host = hostOf(src);
    if (!host) continue;
    if (SRI_EXEMPT_HOSTS.includes(host)) continue;
    if (!SRI_REQUIRED_HOSTS.includes(host)) continue;
    const hasIntegrity = /\bintegrity\s*=/.test(tag);
    const hasCrossorigin = /\bcrossorigin\s*=/.test(tag);
    if (!hasIntegrity || !hasCrossorigin) {
      violations++;
      const rel = f.replace(ROOT, '').replace(/\\/g, '/').replace(/^\//, '');
      console.error(`✗ ${rel}: missing ${!hasIntegrity ? 'integrity' : 'crossorigin'} on ${src}`);
    }
  }
}

// The Sentry CDN varies its response bytes by browser engine. The SDK is
// therefore vendored and its source pin, file digest, and MIT notice are one
// indivisible supply-chain contract.
const sentryInit = readFileSync(join(ROOT, 'assets', 'sentry-init.js'), 'utf8');
const sentrySource = sentryInit.match(/var SENTRY_SRC = '([^']+)'/)?.[1];
const sentryIntegrity = sentryInit.match(/script\.integrity = '([^']+)'/)?.[1];
const sentryPrefix = '/assets/vendor/sentry-browser-7.99.0.';
if (!sentrySource?.startsWith(sentryPrefix) || !sentryIntegrity?.startsWith('sha384-')) {
  console.error('✗ assets/sentry-init.js: Sentry must use the pinned first-party bundle with SHA-384');
  violations++;
} else {
  const sentryFile = join(ROOT, sentrySource.slice(1));
  const sentryLicense = join(ROOT, 'assets', 'vendor', 'sentry-browser-7.99.0.LICENSE.txt');
  if (!existsSync(sentryFile) || !existsSync(sentryLicense)) {
    console.error('✗ vendored Sentry bundle or MIT notice is missing');
    violations++;
  } else {
    const actual = `sha384-${createHash('sha384').update(readFileSync(sentryFile)).digest('base64')}`;
    if (actual !== sentryIntegrity) {
      console.error(`✗ ${sentrySource}: SHA-384 does not match assets/sentry-init.js`);
      violations++;
    }
  }
}

if (violations) {
  console.error(`\n✗ check-sri: ${violations} script tag(s) missing SRI`);
  process.exit(1);
}
console.log(`✓ check-sri: third-party tags and vendored Sentry digest are pinned (${files.length} HTML files scanned)`);
