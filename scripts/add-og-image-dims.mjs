#!/usr/bin/env node
/**
 * Adds missing og:image:width, og:image:height, og:image:type, og:image:alt
 * to every public index.html that has og:image but lacks these attributes.
 *
 * Reference pattern (homepage already has this):
 *   <meta property="og:image" content="..." />
 *   <meta property="og:image:width" content="1200" />
 *   <meta property="og:image:height" content="630" />
 *   <meta property="og:image:type" content="image/png" />
 *   <meta property="og:image:alt" content="..." />
 *
 * Alt text is derived from og:title on the same page.
 * All OG images in this repo are 1200×630 PNG.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Directories to exclude (private portals)
const EXCLUDE = new Set([
  'vault-member', 'investor-portal', 'studio-hub', 'ignis-health',
  '.git', '.github', '.cache', '.ops-cache', 'node_modules',
  'scripts', 'supabase', 'cloudflare', 'tests', 'assets',
  'prompts', 'docs', 'context', 'logs', 'handoffs', 'config',
  'data', 'audits',
]);

function findHtmlFiles(dir, depth = 0) {
  if (depth > 5) return [];
  const files = [];
  let entries;
  try { entries = readdirSync(dir); } catch { return files; }
  for (const entry of entries) {
    if (entry.startsWith('.') || EXCLUDE.has(entry)) continue;
    const full = join(dir, entry);
    let stat;
    try { stat = statSync(full); } catch { continue; }
    if (stat.isDirectory()) {
      files.push(...findHtmlFiles(full, depth + 1));
    } else if (entry === 'index.html') {
      files.push(full);
    }
  }
  return files;
}

function extractMeta(html, property) {
  const re = new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i');
  const m = html.match(re);
  if (m) return m[1];
  // also try reversed attribute order
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i');
  const m2 = html.match(re2);
  return m2 ? m2[1] : null;
}

function processFile(filePath) {
  const html = readFileSync(filePath, 'utf8');

  // Skip if og:image is absent
  if (!html.includes('og:image"') && !html.includes("og:image'")) return false;

  // Skip if og:image:alt already present (means dimensions are also present)
  if (html.includes('og:image:alt')) return false;

  let altText = extractMeta(html, 'og:title');
  if (!altText) {
    // Fall back to <title> tag
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    altText = titleMatch ? titleMatch[1] : null;
  }
  if (!altText) return false;

  altText = altText.trim();

  // Insert the four meta tags immediately after the og:image line (handles both /> and >)
  const ogImageRe = /(<meta[^>]+property=["']og:image["'][^>]*\/?>)/i;
  if (!ogImageRe.test(html)) return false;

  const newHtml = html.replace(ogImageRe, (match) => {
    return `${match}\n  <meta property="og:image:width" content="1200" />\n  <meta property="og:image:height" content="630" />\n  <meta property="og:image:type" content="image/png" />\n  <meta property="og:image:alt" content="${altText.replace(/"/g, '&quot;')}" />`;
  });

  if (newHtml === html) return false;

  writeFileSync(filePath, newHtml, 'utf8');
  return true;
}

const files = findHtmlFiles(ROOT);
let fixed = 0;
let skipped = 0;

for (const f of files) {
  const rel = f.slice(ROOT.length + 1);
  const changed = processFile(f);
  if (changed) {
    console.log(`  fixed: ${rel}`);
    fixed++;
  } else {
    skipped++;
  }
}

console.log(`\nDone: ${fixed} fixed, ${skipped} skipped (already complete or no og:image).`);
