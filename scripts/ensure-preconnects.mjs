#!/usr/bin/env node
/**
 * S158 — Ensure resource preconnect hints on every page that loads
 * cross-origin scripts. Expected save: ~80-200ms TLS+DNS on first connection.
 *
 * Rules:
 *   · Any page loading `cdn.jsdelivr.net` MUST preconnect (with crossorigin).
 *   · Any page loading `challenges.cloudflare.com` MUST preconnect (with crossorigin).
 *   · Idempotent — re-running on already-fixed pages is a no-op.
 *
 * Modes:
 *   default → write fixes
 *   --check → exit 1 if any page is missing required preconnects
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const checkMode = process.argv.includes('--check');

const HOSTS = [
  { match: 'cdn.jsdelivr.net', href: 'https://cdn.jsdelivr.net', crossorigin: true },
  { match: 'challenges.cloudflare.com', href: 'https://challenges.cloudflare.com', crossorigin: true },
];

const SKIP_DIRS = new Set([
  '.git', '.well-known', 'node_modules', 'playwright-report', 'test-results',
  'scripts', 'docs', 'cloudflare', 'supabase', 'logs', 'context', 'tests',
]);

function findHtml(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) findHtml(path.join(dir, entry.name), out);
      continue;
    }
    if (entry.name.endsWith('.html')) out.push(path.join(dir, entry.name));
  }
  return out;
}

function ensurePreconnect(html, host) {
  const escaped = host.href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const preconnectRe = new RegExp(`<link[^>]+rel=["']preconnect["'][^>]+href=["']${escaped}["']`, 'i');
  if (preconnectRe.test(html)) return { html, changed: false };

  const tag = host.crossorigin
    ? `  <link rel="preconnect" href="${host.href}" crossorigin />\n`
    : `  <link rel="preconnect" href="${host.href}" />\n`;

  // Inject right after the last existing preconnect tag, or after <meta charset>
  const lastPre = /(<link[^>]+rel=["']preconnect["'][^>]*>\s*\n)(?![\s\S]*<link[^>]+rel=["']preconnect["'])/i;
  if (lastPre.test(html)) {
    return { html: html.replace(lastPre, `$1${tag}`), changed: true };
  }
  return {
    html: html.replace(/(<meta\s+charset=[^>]*>\s*\n)/i, `$1${tag}`),
    changed: true,
  };
}

const files = findHtml(ROOT);
const offenders = [];
let touched = 0;

for (const file of files) {
  const original = fs.readFileSync(file, 'utf8');
  let next = original;
  for (const host of HOSTS) {
    if (!next.includes(host.match)) continue;
    const out = ensurePreconnect(next, host);
    if (out.changed) {
      next = out.html;
      offenders.push({ file: path.relative(ROOT, file), host: host.match });
    }
  }
  if (next !== original) {
    if (!checkMode) fs.writeFileSync(file, next);
    touched += 1;
  }
}

if (checkMode) {
  if (offenders.length) {
    console.log(`ensure-preconnects: ${offenders.length} missing preconnect(s) across ${touched} file(s)`);
    for (const o of offenders.slice(0, 10)) console.log(`  · ${o.file} → ${o.host}`);
    process.exit(1);
  }
  console.log('ensure-preconnects: all required preconnects present');
  process.exit(0);
}

console.log(`ensure-preconnects: patched ${touched} file(s) · ${offenders.length} preconnect(s) added`);
process.exit(0);
