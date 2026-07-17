#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { PAGE_CSP } from '../config/csp-policy.mjs';
import {
  extractInlineScriptHashes,
  renderCaddyRoutePolicies,
  routePatterns,
  staticCspForHtml,
} from './lib/static-csp.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SELF_TEST = process.argv.includes('--self-test');
const SKIP = new Set([
  '.git', '.cache', '.ops-cache', 'context', 'docs', 'lighthouse-results',
  'node_modules', 'output', 'playwright-report', 'scripts', 'test-results', 'tests',
]);

function publicHtml(dir = ROOT, pages = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) publicHtml(full, pages);
    else if (entry.isFile() && entry.name.endsWith('.html')) {
      pages.push({
        relativePath: path.relative(ROOT, full).replaceAll('\\', '/'),
        html: fs.readFileSync(full, 'utf8'),
      });
    }
  }
  return pages;
}

if (SELF_TEST) {
  const a = '<script>window.alpha = 1;</script>';
  const b = '<script>window.beta = 2;</script>';
  const aHash = extractInlineScriptHashes(a)[0];
  const bHash = extractInlineScriptHashes(b)[0];
  const aPolicy = staticCspForHtml(PAGE_CSP, a);
  const rendered = renderCaddyRoutePolicies([
    { relativePath: 'index.html', html: a },
    { relativePath: 'membership/index.html', html: b },
  ], PAGE_CSP);
  const cases = [
    ['extracts deterministic inline hash', aHash?.startsWith("'sha256-")],
    ['route policy contains its own hash', aPolicy.includes(aHash)],
    ['route policy excludes unrelated hash', !aPolicy.includes(bHash)],
    ['route aliases include clean and slash forms', routePatterns('membership/index.html').join('|') === '/membership|/membership/|/membership/index.html'],
    ['Caddy renderer emits isolated matchers', rendered.includes('@vs_static_csp_0 path / /index.html') && rendered.includes('@vs_static_csp_1 path /membership /membership/ /membership/index.html')],
    ['static route policy has no strict-dynamic', !aPolicy.includes("'strict-dynamic'")],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
  console.log(`check-static-csp-routes --self-test: ${cases.length - failed.length}/${cases.length}`);
  process.exit(failed.length ? 1 : 0);
}

const adaptiveSource = fs.readFileSync(path.join(ROOT, 'assets', 'adaptive-speculation.js'), 'utf8');
if (!adaptiveSource.includes("window.location.hostname === 'website.staging.vaultsparkstudios.com'")) {
  console.error('check-static-csp-routes: adaptive speculation lacks static-staging guard');
  process.exit(1);
}

const pages = publicHtml();
const failures = [];
let maxBytes = 0;
for (const page of pages) {
  const policy = staticCspForHtml(PAGE_CSP, page.html);
  const hashes = extractInlineScriptHashes(page.html);
  maxBytes = Math.max(maxBytes, Buffer.byteLength(policy));
  if (policy.includes("'strict-dynamic'")) failures.push(`${page.relativePath}: strict-dynamic on static route`);
  for (const hash of hashes) {
    if (!policy.includes(hash)) failures.push(`${page.relativePath}: missing ${hash}`);
  }
  if (Buffer.byteLength(policy) > 12_000) failures.push(`${page.relativePath}: CSP exceeds 12KB`);
}
if (failures.length) {
  failures.slice(0, 20).forEach((failure) => console.error(`- ${failure}`));
  console.error(`check-static-csp-routes: ${failures.length} failure(s)`);
  process.exit(1);
}
console.log(`check-static-csp-routes: ${pages.length} route source(s) · max header ${maxBytes} bytes · route-isolated`);