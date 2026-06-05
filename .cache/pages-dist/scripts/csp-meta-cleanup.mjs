#!/usr/bin/env node
// CSP meta-tag cleanup. Two fixes:
//   1. Remove <meta http-equiv="X-Frame-Options" content="SAMEORIGIN" /> — this directive is invalid
//      in <meta>; browsers ignore it. The Cloudflare Worker sets it via HTTP header already.
//   2. Strip `frame-ancestors 'self';` from <meta http-equiv="Content-Security-Policy" content="..."> —
//      browsers ignore frame-ancestors when delivered via <meta>. Worker handles it via HTTP header.
// Usage:
//   node scripts/csp-meta-cleanup.mjs           # apply fixes
//   node scripts/csp-meta-cleanup.mjs --check   # exit non-zero if anything would change
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checkMode = process.argv.includes('--check');

const SKIP_DIRS = new Set(['.git','node_modules','playwright-report','test-results','dist','dist-cap']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

const files = walk(root);
const X_FRAME_META_RE = /\s*<meta\s+http-equiv=["']X-Frame-Options["'][^>]*>\s*\r?\n?/gi;
const FRAME_ANCESTORS_RE = /\s*frame-ancestors[^;"]*;/gi;

let changedCount = 0;
const changed = [];

for (const fp of files) {
  const original = fs.readFileSync(fp, 'utf8');
  let next = original;

  next = next.replace(X_FRAME_META_RE, '\n');
  next = next.replace(FRAME_ANCESTORS_RE, '');

  if (next !== original) {
    changedCount++;
    changed.push(path.relative(root, fp));
    if (!checkMode) fs.writeFileSync(fp, next);
  }
}

console.log(`${checkMode ? 'Would fix' : 'Fixed'} ${changedCount} file(s).`);
for (const f of changed.slice(0, 20)) console.log(`  ${f}`);
if (changed.length > 20) console.log(`  ...and ${changed.length - 20} more`);

if (checkMode && changedCount > 0) process.exit(1);
