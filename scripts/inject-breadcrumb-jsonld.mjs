/* inject-breadcrumb-jsonld.mjs — sitewide BreadcrumbList structured data (S195 item 13).
 *
 * Half the public pages forfeited breadcrumb rich-results because they carried no
 * BreadcrumbList JSON-LD. This derives the trail from the URL path + the page's
 * own <title>, injects one schema.org BreadcrumbList block before </head>, and is
 * fully idempotent (skips any page that already has one). `--check` is the gate:
 * it exits non-zero listing pages that still lack coverage, so the gap can't reopen.
 *
 * Scope: indexable public pages only. Skips the homepage (it IS the root),
 * noindex pages, internal portals, and .ai/ machine-canonical pages.
 */
import { execSync } from './lib/safe-spawn.mjs';
import fs from 'node:fs';

const CHECK = process.argv.includes('--check');
const ORIGIN = 'https://vaultsparkstudios.com';
const SKIP_DIR = /^(vault-member|investor-portal|admin|ignis-health|obelisk-passport|studio-hub|nervous-system)\//;
const ACRONYMS = { api: 'API', faq: 'FAQ', ai: 'AI', roi: 'ROI', ignis: 'IGNIS', gm: 'GM' };

function titleCase(slug) {
  return slug.split('-').map((w) => ACRONYMS[w.toLowerCase()] || (w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
}

function pageTitle(html) {
  const m = html.match(/<title>([^<]*)<\/title>/i);
  if (!m) return null;
  // Keep only the leaf name (before the brand suffix / separator).
  return m[1].split(/\s[—|·–]\s/)[0].trim() || null;
}

function trailFor(file, html) {
  // file: "pathways/builders/index.html" → segments ["pathways","builders"]
  const rel = file.replace(/index\.html$/, '').replace(/\/$/, '');
  const segs = rel.split('/').filter(Boolean);
  const items = [{ '@type': 'ListItem', position: 1, name: 'Home', item: ORIGIN + '/' }];
  let acc = ORIGIN;
  segs.forEach((seg, i) => {
    acc += '/' + seg;
    const isLast = i === segs.length - 1;
    const name = isLast ? (pageTitle(html) || titleCase(seg)) : titleCase(seg);
    items.push({ '@type': 'ListItem', position: i + 2, name, item: acc + '/' });
  });
  return items;
}

function eligible(file, html) {
  if (file === 'index.html') return false;                 // homepage is the root
  if (/(^|\/)\.ai\//.test(file)) return false;             // machine-canonical pages
  if (SKIP_DIR.test(file)) return false;                   // internal portals
  if (/<meta[^>]+name=["']robots["'][^>]*noindex/i.test(html)) return false;
  return true;
}

const files = execSync('git ls-files "**/index.html" "index.html"', { encoding: 'utf8' })
  .split(/\r?\n/).filter(Boolean);

const missing = [];
let injected = 0, already = 0, skipped = 0;

for (const file of files) {
  let html;
  try { html = fs.readFileSync(file, 'utf8'); } catch { continue; }
  if (!eligible(file, html)) { skipped++; continue; }
  if (html.includes('"BreadcrumbList"')) { already++; continue; }

  missing.push(file);
  if (CHECK) continue;

  const trail = trailFor(file, html);
  const json = JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: trail });
  const block = '<script type="application/ld+json" data-vs-breadcrumb>' + json + '</script>\n</head>';
  const idx = html.lastIndexOf('</head>');
  if (idx === -1) { skipped++; missing.pop(); continue; }
  html = html.slice(0, idx) + block + html.slice(idx + '</head>'.length);
  fs.writeFileSync(file, html);
  injected++;
}

if (CHECK) {
  if (missing.length) {
    console.error(`✘ BreadcrumbList missing on ${missing.length} indexable page(s):`);
    missing.forEach((f) => console.error('  - ' + f));
    console.error('  Run: node scripts/inject-breadcrumb-jsonld.mjs');
    process.exit(1);
  }
  console.log(`✓ BreadcrumbList coverage complete (${already} pages, ${skipped} skipped).`);
} else {
  console.log(`✓ Injected BreadcrumbList into ${injected} page(s) · ${already} already had it · ${skipped} skipped.`);
}
