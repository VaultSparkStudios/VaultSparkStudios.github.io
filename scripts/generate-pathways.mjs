#!/usr/bin/env node
/**
 * generate-pathways.mjs — S201 merge-pathways-pages.
 *
 * Reads data/pathways.json and regenerates all 6 pathways sub-page index.html files
 * files from a single source of truth. Idempotent; only writes files
 * when content changes.
 *
 * Usage:
 *   node scripts/generate-pathways.mjs          # dry-run (shows diff)
 *   node scripts/generate-pathways.mjs --apply  # writes files
 *   node scripts/generate-pathways.mjs --check  # exits 1 if any file is stale
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const APPLY = process.argv.includes('--apply');
const CHECK = process.argv.includes('--check');

const data = JSON.parse(readFileSync(join(ROOT, 'data/pathways.json'), 'utf8'));
const pathways = data.pathways;

// Read shell manifest to get current hashed filenames for the split ambient bundles.
const shellManifest = JSON.parse(readFileSync(join(ROOT, 'assets/shell-manifest.json'), 'utf8'));
const AMBIENT_CORE_PATH = shellManifest.assets?.ambientCore?.path || 'assets/ambient-core.shell-82efb5ec87.js';
const AMBIENT_FEATURE_PATH = shellManifest.assets?.ambientFeature?.path || 'assets/ambient-feature.shell-5b85ce5201.js';

// Read one existing file to extract the shared nav/footer boilerplate.
// The generator preserves the current nav exactly — it only swaps the per-pathway content.
// S305: the sample must be a page this generator does NOT write. Harvesting from
// pathways/builders/index.html (its own output) let one failed nav harvest become
// self-perpetuating — every pathways page silently lost the primary nav menu.
const SAMPLE = join(ROOT, 'journal/index.html');
const sample = readFileSync(SAMPLE, 'utf8');

// Extract nav block (from <nav class="nav-center" to </nav>) and footer block.
// S305: the menu is ONE <nav> element — dropdowns are <div>s inside it. The old
// "second </nav>" arithmetic returned -1 once the markup lost its inner nav,
// sliced an empty block, and every pathways page shipped without a menu.
const NAV_START = sample.indexOf('<nav class="nav-center"');
const NAV_END = sample.indexOf('</nav>', NAV_START) + '</nav>'.length;
const navBlock = NAV_START >= 0 && NAV_END > NAV_START ? sample.slice(NAV_START, NAV_END) : '';
if (!navBlock.includes('nav-item')) {
  console.error('[generate-pathways] nav harvest failed — refusing to write pages without a primary nav');
  process.exit(1);
}

const FOOTER_START = sample.indexOf('<footer class="site-footer"');
const FOOTER_END = sample.indexOf('</footer>') + 9;
const footerBlock = sample.slice(FOOTER_START, FOOTER_END);

function footerForDepth(depthPrefix) {
  return footerBlock.replaceAll('../assets/', depthPrefix + 'assets/');
}

// Extract ambient scripts block.
const AMBIENT_START = sample.indexOf('<!-- vs-ambient:start -->');
const AMBIENT_END = sample.indexOf('<!-- vs-ambient:end -->') + '<!-- vs-ambient:end -->'.length;
const ambientBlock = sample.slice(AMBIENT_START, AMBIENT_END);

const SPEC_START = sample.indexOf('<!-- vs-speculation:start -->');
const SPEC_END = sample.indexOf('<!-- vs-speculation:end -->') + '<!-- vs-speculation:end -->'.length;
const speculationBlock = sample.slice(SPEC_START, SPEC_END);

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildBreadcrumb(p) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://vaultsparkstudios.com/' },
      { '@type': 'ListItem', position: 2, name: 'Pathways', item: 'https://vaultsparkstudios.com/pathways/' },
      { '@type': 'ListItem', position: 3, name: p.breadcrumbName, item: `https://vaultsparkstudios.com/pathways/${p.slug}/` }
    ]
  });
}

function buildCtas(ctas) {
  return ctas.map(function (c) {
    return `<a class="${escapeHtml(c.type)}" href="${escapeHtml(c.href)}">${escapeHtml(c.label)}</a>`;
  }).join(' ');
}

/**
 * Render the route.
 *
 * S334: `steps` had been in data/pathways.json since S201 and buildPage() threw
 * it away, so every pathway page shipped 23KB of nav and footer around ~530
 * bytes of headline — a doorway page that told a visitor less than the hub they
 * clicked from. The route was always the point; it just never reached the page.
 *
 * An ordered list is the honest element here: these are sequential, and a
 * screen reader announcing "1 of 4" is carrying real meaning rather than
 * decoration. Numbering comes from <ol> itself so it stays correct if a step is
 * added, and the marker is hidden from assistive tech only because the list
 * already announces position.
 */
/**
 * Route styling ships inline, deliberately.
 *
 * These six pages are the only consumers, and adding ~1KB to assets/style.css
 * would rotate the 192KB shared shell hash for every page on the site — a
 * cold-cache cost paid by every visitor to buy styling for six. Every colour is
 * an existing custom property, so all seven themes are correct for free rather
 * than by seven hand-written overrides.
 */
const ROUTE_STYLE = '<style>.pathway-route{margin-top:3.5rem;padding-top:2rem;border-top:1px solid rgba(127,127,127,.22)}.pathway-route-title{font:600 .78rem/1 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--dim);margin:0 0 1.5rem}.pathway-step-list{list-style:none;padding:0;margin:0;display:grid;gap:1.5rem;max-width:70ch;counter-reset:none}.pathway-step{display:grid;grid-template-columns:2rem 1fr;gap:1rem;align-items:start}.pathway-step-n{display:flex;align-items:center;justify-content:center;width:2rem;height:2rem;border-radius:999px;border:1px solid rgba(127,127,127,.35);font:600 .85rem/1 system-ui,sans-serif;color:var(--dim)}.pathway-step-link{font:600 1.08rem/1.35 Georgia,serif;color:var(--text);text-decoration:none;border-bottom:1px solid transparent;transition:border-color .15s ease,color .15s ease}.pathway-step-link:hover,.pathway-step-link:focus-visible{color:var(--gold);border-bottom-color:currentColor}.pathway-step-why{color:var(--muted);font-size:.95rem;line-height:1.6;margin:.35rem 0 0}@media (max-width:520px){.pathway-step{grid-template-columns:1.6rem 1fr;gap:.75rem}.pathway-step-n{width:1.6rem;height:1.6rem;font-size:.75rem}}</style>';

function buildRoute(steps) {
  if (!Array.isArray(steps) || !steps.length) return '';
  const items = steps.map(function (s, i) {
    return `<li class="pathway-step"><span class="pathway-step-n" aria-hidden="true">${i + 1}</span><div><a class="pathway-step-link" href="${escapeHtml(s.href)}">${escapeHtml(s.label)}</a><p class="pathway-step-why">${escapeHtml(s.why)}</p></div></li>`;
  }).join('');
  return `<nav class="pathway-route" aria-label="Suggested route"><h2 class="pathway-route-title">The route</h2><ol class="pathway-step-list">${items}</ol></nav>`;
}

// S305: never hardcode a shell hash — the old literal (style.shell-cade1bd169)
// outlived its asset by dozens of rotations and served the pages unstyled.
// Harvest the live stylesheet path from the sample instead.
const SAMPLE_STYLE = (sample.match(/href="(?:\.\.\/)*(assets\/style\.shell-[a-f0-9]+\.css)"/) || [])[1] || 'assets/style.css';
// build-shell-assets injects the nav-sheet loader per page — emit it so the
// generated file is byte-identical with the reconciled one (S305).
const NAV_SHEET_TAG = (sample.match(/<script src="\/assets\/nav-sheet\.shell-[a-f0-9]+\.js" defer><\/script>/) || [''])[0];

function buildPage(p) {
  const depthPrefix = '../../';
  const ogImage = `https://vaultsparkstudios.com/assets/og/og-pathways-${p.slug}.png`;
  return `<!DOCTYPE html><html lang="en" class="dark-mode" data-theme="dark"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(p.pageTitle)}</title><meta name="description" content="${escapeHtml(p.metaDescription)}"><meta property="og:image" content="${escapeHtml(ogImage)}"><meta name="twitter:image" content="${escapeHtml(ogImage)}"><link rel="canonical" href="${escapeHtml('https://vaultsparkstudios.com/pathways/' + p.slug + '/')}"><link rel="stylesheet" href="${depthPrefix}${SAMPLE_STYLE}">${speculationBlock}${ROUTE_STYLE}
<script type="application/ld+json" data-vs-breadcrumb>${buildBreadcrumb(p)}</script>
  <link rel="alternate" type="application/json" href="/agents.json" />
</head><body class="dark-mode" data-theme="dark">
<script>!function(){try{var t=localStorage.getItem('vs_theme')||'dark',m={dark:'dark-mode',light:'light-mode',ambient:'ambient-mode',warm:'warm-mode',cool:'cool-mode',lava:'lava-mode','high-contrast':'high-contrast-mode'};if(m[t]){var r=['dark-mode','light-mode','ambient-mode','warm-mode','cool-mode','lava-mode','high-contrast-mode'];document.documentElement.classList.remove.apply(document.documentElement.classList,r);document.body.classList.remove.apply(document.body.classList,r);var c=m[t];document.documentElement.classList.add(c);document.documentElement.dataset.theme=t;document.body.classList.add(c);document.body.dataset.theme=t;}var mo=localStorage.getItem('vs_motion');if(mo==='reduced'){document.documentElement.dataset.motion='reduced';document.body.dataset.motion='reduced';}}catch(e){}}();</script><a href="#main-content" class="skip-link">Skip to main content</a><header class="site-header">
    <div class="container nav">
      <a class="brand" href="/" aria-label="VaultSpark Studios — home">
        <img fetchpriority="high" src="${depthPrefix}assets/vaultspark-icon-nav.webp" alt="VaultSpark Studios icon" width="44" height="44" />
        <span class="brand-wordmark">VaultSpark<span class="brand-suffix"> Studios</span><small>The vault is sparked</small></span>
      </a>
      ${navBlock}
      <div class="nav-right">
        <a class="nav-icon-link" href="https://github.com/VaultSparkStudios" target="_blank" rel="noreferrer" aria-label="VaultSpark Studios on GitHub"><svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg></a>
        <a class="nav-signin" href="/vault-member/#login">Sign In</a>
        <a class="button button-sm" href="/vault-member/#register">Join The Vault</a>
        <button type="button" class="hamburger" id="hamburger" aria-expanded="false" aria-controls="nav-menu" aria-label="Toggle navigation">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  </header><main id="main-content"><section class="container" style="padding:5rem 0"><span class="eyebrow">${escapeHtml(p.eyebrow)}</span><h1 style="font-family:Georgia,serif;font-size:clamp(2.4rem,6vw,4.5rem)">${escapeHtml(p.headline)}</h1><p style="color:var(--muted);max-width:70ch">${escapeHtml(p.lede)}</p><p style="margin-top:1.5rem">${buildCtas(p.ctas)}</p>${buildRoute(p.steps)}</section></main>${footerForDepth(depthPrefix)}  ${ambientBlock}
${NAV_SHEET_TAG ? `${NAV_SHEET_TAG}\n` : ''}</body></html>
`;
}

let stale = 0;
let updated = 0;

for (const p of pathways) {
  const outPath = join(ROOT, `pathways/${p.slug}/index.html`);
  const generated = buildPage(p);

  if (!existsSync(outPath)) {
    if (APPLY) {
      writeFileSync(outPath, generated, 'utf8');
      console.log(`[generate-pathways] created ${p.slug}/index.html`);
      updated++;
    } else {
      console.log(`[generate-pathways] MISSING: pathways/${p.slug}/index.html`);
      stale++;
    }
    continue;
  }

  const existing = readFileSync(outPath, 'utf8');

  // Compare meaningful content only (ignore trailing whitespace differences).
  if (existing.trim() === generated.trim()) {
    if (!CHECK) console.log(`[generate-pathways] OK: pathways/${p.slug}/index.html`);
    continue;
  }

  stale++;
  if (APPLY) {
    writeFileSync(outPath, generated, 'utf8');
    console.log(`[generate-pathways] updated pathways/${p.slug}/index.html`);
    updated++;
  } else if (!CHECK) {
    console.log(`[generate-pathways] STALE: pathways/${p.slug}/index.html`);
  }
}

if (CHECK && stale > 0) {
  console.error(`[generate-pathways] ${stale} pathway page(s) are stale — run with --apply to regenerate.`);
  process.exit(1);
}

if (!APPLY && !CHECK && stale > 0) {
  console.log(`[generate-pathways] ${stale} stale — run with --apply to update.`);
}
if (APPLY) {
  console.log(`[generate-pathways] done — ${updated} updated, ${pathways.length - updated} unchanged.`);
}
