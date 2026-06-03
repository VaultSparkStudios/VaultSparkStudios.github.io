#!/usr/bin/env node
// render-product-pages.mjs — S114 (S113 TASK_BOARD #608)
// Reads portfolio/PROJECT_REGISTRY.json from vaultspark-studio-ops and
// generates one HTML page per non-archived project under /products/<slug>/.
// Also generates /products/index.html listing.
//
// Implements vaultspark-studio-ops/docs/WEBSITE_AUTO_RENDER_PROTOCOL.md.
// Triggered by repository_dispatch event_type=registry-changed.
//
// Hand-authored pages at /<slug>/ are NEVER touched. The renderer only
// writes to /products/<slug>/ (new path). If a hand-authored page exists,
// the /products/ page links to it; otherwise renders a default landing.
//
// Usage:
//   node scripts/render-product-pages.mjs          # render from local sibling studio-ops
//   node scripts/render-product-pages.mjs --remote # fetch registry from GitHub raw

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';

const WEBSITE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const REMOTE = process.argv.includes('--remote');

const REGISTRY_URL = 'https://raw.githubusercontent.com/VaultSparkStudios/vaultspark-studio-ops/main/portfolio/PROJECT_REGISTRY.json';
const LOCAL_REGISTRY = join(WEBSITE_ROOT, '..', 'vaultspark-studio-ops', 'portfolio', 'PROJECT_REGISTRY.json');

// ─────────────────────────────────────────────────────────────────────────────
// Load registry
// ─────────────────────────────────────────────────────────────────────────────

async function loadRegistry() {
  if (!REMOTE && existsSync(LOCAL_REGISTRY)) {
    console.log(`▶ reading local registry: ${LOCAL_REGISTRY}`);
    return JSON.parse(readFileSync(LOCAL_REGISTRY, 'utf8'));
  }
  console.log(`▶ fetching remote registry: ${REGISTRY_URL}`);
  return new Promise((resolve, reject) => {
    https.get(REGISTRY_URL, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function vaultBadge(status) {
  const colors = { SPARKED: '#7ae7c7', FORGE: '#fb923c', VAULTED: '#64748b' };
  const c = colors[status] || '#64748b';
  return `<span class="vault-badge" style="background:${c}1a;color:${c};border:1px solid ${c}40;">${status}</span>`;
}

function liveLinkLogic(p) {
  const isLive = p.vaultStatus === 'SPARKED' && (p.runtimeUrl || p.liveUrl || p.deployedUrl);
  const url = p.runtimeUrl || p.liveUrl || p.deployedUrl;
  const ctaText = p.landing?.cta || (isLive ? 'Visit Live →' : 'Learn More');
  return { isLive, url, ctaText };
}

function existingHandAuthoredPath(p) {
  const folderName = p.folderName || p.slug;
  const candidate = join(WEBSITE_ROOT, folderName, 'index.html');
  return existsSync(candidate) ? `/${folderName}/` : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page template
// ─────────────────────────────────────────────────────────────────────────────

function pageTemplate(p) {
  const { isLive, url: liveUrl, ctaText } = liveLinkLogic(p);
  const handAuthored = existingHandAuthoredPath(p);
  const tagline = p.landing?.tagline || p.summary || '';
  const heroCopy = p.landing?.heroCopy || p.summary || '';
  const themeColor = p.landing?.themeColor || '#7ae7c7';
  const ogImage = p.landing?.ogImage
    || `https://vaultsparkstudios.com/_og/?title=${encodeURIComponent(p.name)}&eyebrow=VaultSpark+Studios&status=${(p.vaultStatus || 'forge').toLowerCase()}`;
  const screenshots = p.landing?.screenshots || [];
  const social = p.landing?.socialLinks || {};
  const press = p.landing?.pressLinks || [];
  const highlights = p.landing?.releaseHighlights || [];
  const medium = p.medium || p.type || 'project';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(p.name)} — VaultSpark Studios</title>
  <meta name="description" content="${esc(tagline || heroCopy.slice(0, 160))}" />
  <meta name="theme-color" content="${esc(themeColor)}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://vaultsparkstudios.com/products/${esc(p.slug)}/" />

  <meta property="og:title" content="${esc(p.name)} — VaultSpark Studios" />
  <meta property="og:description" content="${esc(tagline || heroCopy.slice(0, 200))}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://vaultsparkstudios.com/products/${esc(p.slug)}/" />
  <meta property="og:image" content="${esc(ogImage)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@VaultSparkStudios" />
  <meta name="twitter:image" content="${esc(ogImage)}" />

  <link rel="icon" type="image/png" href="/assets/icon-32.png" />
  <style>
    *{box-sizing:border-box}
    body{margin:0;background:#0a0e1a;color:#e4e7f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.6}
    .container{max-width:880px;margin:0 auto;padding:4rem 1.5rem}
    .eyebrow{font-size:.85rem;letter-spacing:.1em;text-transform:uppercase;color:#94a3b8;margin-bottom:.5rem}
    h1{font-size:clamp(2rem,5vw,3.5rem);margin:0 0 1rem;line-height:1.1;color:#fff}
    .tagline{font-size:1.25rem;color:#cbd5e1;margin:0 0 2rem}
    .vault-badge{display:inline-block;padding:.25rem .75rem;border-radius:9999px;font-size:.75rem;letter-spacing:.05em;font-weight:600;margin-right:.5rem}
    .meta-row{display:flex;flex-wrap:wrap;gap:.75rem;margin-bottom:2rem;color:#94a3b8;font-size:.9rem}
    .meta-row span{padding:.25rem 0}
    .cta{display:inline-block;padding:.875rem 1.75rem;background:${themeColor};color:#0a0e1a;border-radius:8px;text-decoration:none;font-weight:600;margin:1rem 0 2rem;transition:transform .15s}
    .cta:hover{transform:translateY(-1px)}
    .secondary-cta{display:inline-block;padding:.875rem 1.75rem;background:transparent;color:${themeColor};border:1px solid ${themeColor};border-radius:8px;text-decoration:none;margin-left:.5rem}
    .hero-copy{font-size:1.1rem;color:#cbd5e1;margin-bottom:3rem}
    .gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1rem;margin:2rem 0}
    .gallery img{width:100%;border-radius:8px;border:1px solid #1e293b}
    .section{margin:3rem 0;padding-top:2rem;border-top:1px solid #1e293b}
    .section h2{font-size:1.5rem;color:#fff;margin:0 0 1rem}
    .highlights{list-style:none;padding:0}
    .highlights li{padding:.75rem 0;border-bottom:1px solid #1e293b}
    .highlights .date{color:#64748b;font-size:.85rem;margin-right:1rem}
    .social-links{display:flex;gap:1rem;flex-wrap:wrap;margin-top:1rem}
    .social-links a{color:#94a3b8;text-decoration:none;padding:.5rem .875rem;border:1px solid #1e293b;border-radius:6px;font-size:.9rem}
    .social-links a:hover{color:${themeColor};border-color:${themeColor}}
    .press{margin:1rem 0}
    .press a{display:block;padding:.75rem 0;color:#cbd5e1;text-decoration:none;border-bottom:1px solid #1e293b}
    .press a:hover{color:${themeColor}}
    footer{margin-top:4rem;padding-top:2rem;border-top:1px solid #1e293b;color:#64748b;font-size:.85rem}
    footer a{color:#94a3b8}
    .auto-note{font-size:.75rem;color:#475569;margin-top:1rem;font-family:monospace}
  </style>
</head>
<body>
  <div class="container">
    <p class="eyebrow">A VaultSpark Studios ${medium === 'game' ? 'Game' : medium === 'app' || medium === 'tool' ? 'Tool' : 'Production'}</p>
    <h1>${esc(p.name)}</h1>
    ${tagline ? `<p class="tagline">${esc(tagline)}</p>` : ''}

    <div class="meta-row">
      ${vaultBadge(p.vaultStatus || 'FORGE')}
      ${p.medium ? `<span>${esc(p.medium)}</span>` : ''}
      ${p.audience ? `<span>· ${esc(p.audience)}</span>` : ''}
      ${p.lifecycle ? `<span>· ${esc(p.lifecycle)}</span>` : ''}
    </div>

    ${isLive && liveUrl
      ? `<a class="cta" href="${esc(liveUrl)}">${esc(ctaText)}</a>`
      : handAuthored
        ? `<a class="cta" href="${esc(handAuthored)}">${esc(ctaText)}</a>`
        : ''}
    ${handAuthored && isLive ? `<a class="secondary-cta" href="${esc(handAuthored)}">Project Page →</a>` : ''}

    ${heroCopy && heroCopy !== tagline ? `<p class="hero-copy">${esc(heroCopy)}</p>` : ''}

    ${screenshots.length > 0 ? `
    <div class="gallery">
      ${screenshots.map(s => `<img src="${esc(s)}" alt="${esc(p.name)} screenshot" loading="lazy" />`).join('\n      ')}
    </div>` : ''}

    ${highlights.length > 0 ? `
    <div class="section">
      <h2>Recent</h2>
      <ul class="highlights">
        ${highlights.map(h => `<li><span class="date">${esc(h.date)}</span>${h.url ? `<a href="${esc(h.url)}" style="color:#cbd5e1;text-decoration:none">${esc(h.title)}</a>` : esc(h.title)}</li>`).join('\n        ')}
      </ul>
    </div>` : ''}

    ${press.length > 0 ? `
    <div class="section">
      <h2>Press</h2>
      <div class="press">
        ${press.map(pr => `<a href="${esc(pr.url)}">${esc(pr.outlet)} <span style="color:#64748b">· ${esc(pr.date)}</span></a>`).join('\n        ')}
      </div>
    </div>` : ''}

    ${Object.keys(social).length > 0 ? `
    <div class="section">
      <h2>Community</h2>
      <div class="social-links">
        ${Object.entries(social).filter(([_, url]) => url).map(([k, url]) =>
          `<a href="${esc(url)}" rel="noopener">${esc(k.charAt(0).toUpperCase() + k.slice(1))}</a>`
        ).join('\n        ')}
      </div>
    </div>` : ''}

    <footer>
      <a href="/products/">← All Projects</a>
      &nbsp;·&nbsp;
      <a href="/">VaultSpark Studios</a>
      <p>© 2026 VaultSpark Studios LLC. All rights reserved.</p>
      <p class="auto-note">auto-rendered from portfolio/PROJECT_REGISTRY.json · ${new Date().toISOString().slice(0, 10)}</p>
    </footer>
  </div>
</body>
</html>
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Index page
// ─────────────────────────────────────────────────────────────────────────────

function indexTemplate(projects) {
  const grouped = { SPARKED: [], FORGE: [], VAULTED: [] };
  for (const p of projects) {
    if (p.status === 'archived' || p.lifecycle === 'archived') continue;
    const group = p.vaultStatus || 'FORGE';
    if (grouped[group]) grouped[group].push(p);
  }

  const card = (p) => {
    const { isLive, url } = liveLinkLogic(p);
    const handAuthored = existingHandAuthoredPath(p);
    const target = handAuthored || (isLive ? url : `/products/${p.slug}/`);
    return `
      <a href="${esc(target)}" class="card">
        <div class="card-header">
          ${vaultBadge(p.vaultStatus || 'FORGE')}
          ${isLive ? '<span class="live-dot" title="Live">●</span>' : ''}
        </div>
        <h3>${esc(p.name)}</h3>
        <p>${esc(p.landing?.tagline || p.summary || '')}</p>
        <div class="card-meta">${esc(p.medium || '')}${p.stack ? ` · stack ${esc(p.stack)}` : ''}</div>
      </a>`;
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Projects — VaultSpark Studios</title>
  <meta name="description" content="Every VaultSpark Studios project — live, in development, or paused." />
  <meta name="theme-color" content="#7ae7c7" />
  <link rel="canonical" href="https://vaultsparkstudios.com/products/" />
  <meta property="og:title" content="Projects — VaultSpark Studios" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://vaultsparkstudios.com/products/" />
  <style>
    *{box-sizing:border-box}
    body{margin:0;background:#0a0e1a;color:#e4e7f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
    .container{max-width:1100px;margin:0 auto;padding:4rem 1.5rem}
    h1{font-size:2.5rem;margin:0 0 .5rem;color:#fff}
    .subtitle{color:#94a3b8;margin-bottom:3rem}
    .group{margin:2.5rem 0}
    .group-label{font-size:.85rem;letter-spacing:.1em;text-transform:uppercase;color:#94a3b8;margin-bottom:1rem}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem}
    .card{display:block;padding:1.5rem;background:#0f172a;border:1px solid #1e293b;border-radius:8px;text-decoration:none;color:inherit;transition:border-color .15s,transform .15s}
    .card:hover{border-color:#7ae7c7;transform:translateY(-2px)}
    .card-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem}
    .card h3{margin:0 0 .5rem;color:#fff;font-size:1.15rem}
    .card p{margin:0 0 1rem;color:#cbd5e1;font-size:.9rem;line-height:1.5;min-height:2.7em}
    .card-meta{font-size:.75rem;color:#64748b;letter-spacing:.05em;text-transform:uppercase}
    .vault-badge{display:inline-block;padding:.2rem .6rem;border-radius:9999px;font-size:.7rem;letter-spacing:.05em;font-weight:600}
    .live-dot{color:#7ae7c7;font-size:.75rem;animation:pulse 2s ease-in-out infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    footer{margin-top:4rem;padding-top:2rem;border-top:1px solid #1e293b;color:#64748b;font-size:.85rem}
    footer a{color:#94a3b8}
  </style>
</head>
<body>
  <div class="container">
    <h1>Projects</h1>
    <p class="subtitle">Every VaultSpark Studios project — live, in development, or paused.</p>

    ${grouped.SPARKED.length > 0 ? `
    <div class="group">
      <div class="group-label">Live (${grouped.SPARKED.length})</div>
      <div class="grid">${grouped.SPARKED.map(card).join('')}</div>
    </div>` : ''}

    ${grouped.FORGE.length > 0 ? `
    <div class="group">
      <div class="group-label">In Development (${grouped.FORGE.length})</div>
      <div class="grid">${grouped.FORGE.map(card).join('')}</div>
    </div>` : ''}

    ${grouped.VAULTED.length > 0 ? `
    <div class="group">
      <div class="group-label">Paused (${grouped.VAULTED.length})</div>
      <div class="grid">${grouped.VAULTED.map(card).join('')}</div>
    </div>` : ''}

    <footer>
      <a href="/">← VaultSpark Studios</a>
      <p>© 2026 VaultSpark Studios LLC. All rights reserved.</p>
      <p style="font-family:monospace;font-size:.75rem;color:#475569">auto-rendered from registry · ${new Date().toISOString().slice(0, 10)}</p>
    </footer>
  </div>
</body>
</html>
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

const data = await loadRegistry();
const projects = (data.projects || []).filter(p =>
  p.status !== 'archived' && p.lifecycle !== 'archived' && p.slug
);

console.log(`▶ ${projects.length} projects to render`);

const productsDir = join(WEBSITE_ROOT, 'products');
mkdirSync(productsDir, { recursive: true });

let rendered = 0;
for (const p of projects) {
  const dir = join(productsDir, p.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), pageTemplate(p));
  rendered++;
}

writeFileSync(join(productsDir, 'index.html'), indexTemplate(projects));

console.log(`✓ ${rendered} project pages + 1 index written to /products/`);
console.log(`  Visit: https://vaultsparkstudios.com/products/`);
