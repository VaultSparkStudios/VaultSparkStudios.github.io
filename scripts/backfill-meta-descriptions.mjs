#!/usr/bin/env node
/**
 * backfill-meta-descriptions.mjs — Add a <meta name="description"> to every
 * public HTML page that's missing one. Derives copy from the page's <title>
 * + first meaningful text, with a sensible VaultSpark-branded fallback.
 *
 * Skips private portals (investor/*, studio-hub/, vault-member portals),
 * game runtime shells, and the Google verification stub — those either
 * carry noindex or are not meant to appear in SERPs.
 *
 * Usage: node scripts/backfill-meta-descriptions.mjs [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const DRY = process.argv.includes('--dry-run');

const SKIP_PATH_PATTERNS = [
  /^investor(\/|-portal\/)/i,
  /^studio-hub\//i,
  /^vault-member\/admin\//i,
  /^vault-treasury\//i,   // internal surface
  /^open-source\//i,       // landing redirects to rights; canonical lives at /rights/
  /^franchise-architect\/game\.html$/i,
  /^vaultfront\/404\.html$/i,
  /^franchise-architect\/404\.html$/i,
  /google-site-verification/i,
  /\/offline\.html$/i,
];

function walk(dir, base = dir, acc = []) {
  for (const entry of fs.readdirSync(dir)) {
    if (['node_modules', 'playwright-report', 'test-results', '.git'].includes(entry)) continue;
    const full = path.join(dir, entry);
    const rel = path.relative(base, full).replace(/\\/g, '/');
    if (fs.statSync(full).isDirectory()) walk(full, base, acc);
    else if (entry.endsWith('.html')) acc.push({ full, rel });
  }
  return acc;
}

function extractTitle(html) {
  const m = html.match(/<title>([^<]+)<\/title>/i);
  if (!m) return null;
  return m[1].replace(/\s*[—|·]\s*VaultSpark Studios.*$/i, '').trim();
}

function extractFirstParagraph(html) {
  // Strip the nav + header region first.
  const body = html.replace(/<header[\s\S]*?<\/header>/i, '');
  const m = body.match(/<p[^>]*>([\s\S]{40,})?<\/p>/i);
  if (!m) return null;
  return m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
}

function buildDescription(rel, html) {
  const title = extractTitle(html);
  const para = extractFirstParagraph(html);
  if (title && para && para.length > 40) {
    const trimmed = para.length > 150 ? para.slice(0, 147).trim() + '…' : para;
    return `${trimmed} — VaultSpark Studios.`;
  }
  if (title) return `${title} — VaultSpark Studios. Games, tools, and a living protocol layer, shipped from the forge.`;
  return 'VaultSpark Studios — Games, tools, and a living protocol layer, shipped from the forge.';
}

function injectDescription(html, desc) {
  const meta = `<meta name="description" content="${desc.replace(/"/g, '&quot;')}" />`;
  // Prefer: insert right after the <title> line.
  if (/<title>[^<]*<\/title>/i.test(html)) {
    return html.replace(/(<title>[^<]*<\/title>)/i, `$1\n  ${meta}`);
  }
  // Fallback: insert after the charset meta.
  if (/<meta\s+charset=[^>]*>/i.test(html)) {
    return html.replace(/(<meta\s+charset=[^>]*>)/i, `$1\n  ${meta}`);
  }
  return html; // can't safely inject
}

let written = 0, already = 0, skipped = 0, failed = 0;
for (const { full, rel } of walk(ROOT)) {
  if (SKIP_PATH_PATTERNS.some((p) => p.test(rel))) { skipped++; continue; }
  const html = fs.readFileSync(full, 'utf8');
  if (/<meta\s+name=["']description["']/i.test(html)) { already++; continue; }
  const desc = buildDescription(rel, html);
  const out = injectDescription(html, desc);
  if (out === html) { failed++; console.log(`[failed]  ${rel}`); continue; }
  if (DRY) console.log(`[dry-run] ${rel} → "${desc.slice(0, 80)}…"`);
  else { fs.writeFileSync(full, out, 'utf8'); console.log(`wrote:    ${rel}`); }
  written++;
}
console.log(`\nDone. Wrote: ${written}  ·  Already had: ${already}  ·  Skipped (portal): ${skipped}  ·  Failed: ${failed}`);
