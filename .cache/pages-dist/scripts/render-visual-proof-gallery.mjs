#!/usr/bin/env node
/**
 * render-visual-proof-gallery.mjs (S172 audit #9 · visual-proof-gallery)
 *
 * Renders docs/visual-proof/index.html — a local-only side-by-side gallery of
 * every visual-proof capture set, built from each set's manifest.json. Founder
 * review of a proof pack becomes one click instead of N file-opens; every
 * future capture run regenerates the gallery for free.
 *
 * docs/ is not part of the deployed site surface — this page is for local +
 * repo-browse review only.
 *
 * Usage:
 *   node scripts/render-visual-proof-gallery.mjs           # write gallery
 *   node scripts/render-visual-proof-gallery.mjs --check   # gallery fresh vs manifests
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BASE = path.join(ROOT, 'docs', 'visual-proof');
const OUT = path.join(BASE, 'index.html');
const CHECK = process.argv.includes('--check');

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

if (!fs.existsSync(BASE)) {
  console.log('render-visual-proof-gallery: no docs/visual-proof/ — nothing to render');
  process.exit(0);
}

const sets = fs.readdirSync(BASE, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => {
    const manifestPath = path.join(BASE, d.name, 'manifest.json');
    if (!fs.existsSync(manifestPath)) return null;
    try { return { name: d.name, manifest: JSON.parse(fs.readFileSync(manifestPath, 'utf8')) }; } catch { return null; }
  })
  .filter(Boolean)
  .sort((a, b) => String(b.manifest.generatedAt).localeCompare(String(a.manifest.generatedAt)));

if (!sets.length) {
  console.log('render-visual-proof-gallery: no capture sets with manifests');
  process.exit(0);
}

if (CHECK) {
  if (!fs.existsSync(OUT)) { console.error('gallery missing — run render-visual-proof-gallery.mjs'); process.exit(1); }
  const galleryMtime = fs.statSync(OUT).mtimeMs;
  const stale = sets.filter((s) => fs.statSync(path.join(BASE, s.name, 'manifest.json')).mtimeMs > galleryMtime);
  if (stale.length) { console.error(`gallery stale vs ${stale.map((s) => s.name).join(', ')}`); process.exit(1); }
  console.log(`render-visual-proof-gallery --check: OK (${sets.length} set(s))`);
  process.exit(0);
}

const sections = sets.map(({ name, manifest }) => {
  const byRoute = {};
  for (const cap of manifest.captures || []) {
    (byRoute[cap.route] ??= []).push(cap);
  }
  const routeBlocks = Object.entries(byRoute).map(([route, caps]) => {
    const shots = caps.map((cap) => {
      const rel = path.relative(BASE, path.join(ROOT, cap.screenshot)).split(path.sep).join('/');
      const errs = (cap.pageErrors || []).length;
      return `
        <figure>
          <a href="${esc(rel)}" target="_blank" rel="noopener"><img src="${esc(rel)}" alt="${esc(route)} ${esc(cap.viewport)}" loading="lazy"></a>
          <figcaption>
            <strong>${esc(cap.viewport)}</strong> · ${esc(cap.status)} · ${Math.round((cap.bytes || 0) / 1024)} KB
            · non-blank ${esc(cap.nonBlankScore ?? '?')}${errs ? ` · <span class="bad">${errs} page error(s)</span>` : ' · <span class="ok">0 errors</span>'}
          </figcaption>
        </figure>`;
    }).join('\n');
    return `<div class="route"><h3><code>${esc(route)}</code></h3><div class="pair">${shots}</div></div>`;
  }).join('\n');
  return `
  <section>
    <h2>${esc(name)}</h2>
    <p class="meta">${esc(manifest.purpose || '')} · captured ${esc(String(manifest.generatedAt).slice(0, 10))} · ${(manifest.captures || []).length} shot(s)</p>
    ${routeBlocks}
  </section>`;
}).join('\n');

const html = `<!doctype html>
<!-- generated-by: scripts/render-visual-proof-gallery.mjs · local review surface, not deployed -->
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Visual Proof Gallery — VaultSpark Studios (local)</title>
<style>
  :root{color-scheme:dark}
  body{margin:0;padding:2rem;background:#07080f;color:#eef2ff;font:15px/1.5 Inter,system-ui,sans-serif}
  h1{font-family:Georgia,serif} h2{margin-top:2.4rem;color:#ffc400}
  .meta{color:#a8b4d0;font-size:.85rem}
  .route{margin:1.4rem 0} .route code{color:#ffc400}
  .pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:1rem;align-items:start}
  figure{margin:0;background:#0c0e18;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:.7rem}
  img{width:100%;height:auto;max-height:420px;object-fit:cover;object-position:top;border-radius:8px}
  figcaption{margin-top:.5rem;font-size:.8rem;color:#a8b4d0}
  .ok{color:#34d399}.bad{color:#f43f5e}
</style></head><body>
<h1>Visual Proof Gallery</h1>
<p class="meta">Side-by-side review of every capture set under docs/visual-proof/. Local-only surface — regenerate with <code>node scripts/render-visual-proof-gallery.mjs</code>.</p>
${sections}
</body></html>
`;

fs.writeFileSync(OUT, html, 'utf8');
console.log(`render-visual-proof-gallery → docs/visual-proof/index.html (${sets.length} set(s))`);
