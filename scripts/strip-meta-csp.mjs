#!/usr/bin/env node
// strip-meta-csp.mjs — Remove <meta http-equiv="Content-Security-Policy" ...> from all HTML files.
// The Cloudflare Worker now injects nonce-based CSP via HTTP headers (NONCE_CSP_ENABLED=1)
// and strips meta CSP via MetaCspStripper HTMLRewriter. This one-time cleanup prevents
// the browser from enforcing both policies simultaneously.
//
// Usage:
//   node scripts/strip-meta-csp.mjs           # apply
//   node scripts/strip-meta-csp.mjs --dry-run # preview only

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT    = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY_RUN = process.argv.includes('--dry-run');

const SKIP_DIRS = new Set([
  '.git', 'node_modules', 'playwright-report', 'test-results', 'dist', 'dist-cap',
]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), out);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

// Matches <meta http-equiv="Content-Security-Policy" content="..." /> (any whitespace/quote style)
const META_CSP_RE = /[ \t]*<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*\/?>\s*\r?\n?/gi;

let changed = 0;
const files = walk(ROOT);

for (const fp of files) {
  const original = fs.readFileSync(fp, 'utf8');
  const next     = original.replace(META_CSP_RE, '');
  if (next !== original) {
    changed++;
    if (!DRY_RUN) fs.writeFileSync(fp, next, 'utf8');
    console.log((DRY_RUN ? '[DRY] ' : '') + path.relative(ROOT, fp));
  }
}

console.log(`\n${DRY_RUN ? 'Would strip' : 'Stripped'} meta CSP tag from ${changed} file(s).`);
