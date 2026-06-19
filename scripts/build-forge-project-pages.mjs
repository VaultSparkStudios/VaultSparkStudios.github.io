#!/usr/bin/env node
/* build-forge-project-pages.mjs — D-S208.5: scaffold consistent public studio pages
 * for forge/pre-launch projects from registry data, so the Atlas + hero can link to a
 * real on-site page (never a generic fallback) and new projects auto-get a page.
 *
 * It templates the canonical "Forging" teaser page (projects/seamline/index.html) and
 * substitutes project-specific head/hero/JSON-LD tokens. Shared chrome (nav, footer,
 * shell CSS, OG card, breadcrumb) is reconciled by the normal build pipeline afterward
 * (propagate-nav, build-shell-assets, build-og-cards, inject-breadcrumb-jsonld).
 *
 * Public-safe: teasers are sanitized one-liners (no internal/engineer detail), matching
 * the established forge-teaser pattern. Idempotent: only writes a page that is MISSING
 * (never clobbers a hand-authored page); --force regenerates.
 *
 * Usage: node scripts/build-forge-project-pages.mjs [--force] [--check] [--self-test]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const FORCE = argv.includes('--force');
const CHECK = argv.includes('--check');
const SELF_TEST = argv.includes('--self-test');
const TEMPLATE = join(ROOT, 'projects/seamline/index.html');

// Public-safe project pages to ensure exist. Teasers are deliberately sanitized.
// liveUrl is shown on-page as an external "Visit" link where the founder confirmed a
// public destination; the Atlas/hero still route to THIS studio page (forge projects
// never link straight to a not-yet-launched external site).
const PROJECTS = [
  { id: 'hashmark', name: 'Hashmark', category: 'Sports AI', teaser: 'Football, rewritten every week by AI.', liveUrl: 'https://hashmark.football' },
  { id: 'shadow', name: 'SHADOW', category: 'Artist OS', teaser: 'An operating system for artists.', liveUrl: 'https://yourshadow.io' },
  { id: 'concurrent', name: 'Concurrent', category: 'Agent OS', teaser: 'A workstation built around user-owned AI.', liveUrl: null },
  { id: 'ouren', name: 'Ouren', category: 'Ambient AI', teaser: 'Ambient intelligence for smart eyewear.', liveUrl: null },
  { id: 'sparkraid', name: 'SparkRaid', category: 'Creator Economy', teaser: 'Every tip is an event.', liveUrl: null },
  { id: 'syntha', name: 'Syntha', category: 'Music Platform', teaser: 'AI-accepted music, with rights made clear.', liveUrl: null },
  { id: 'obelisk', name: 'Obelisk', category: 'Trust Protocol', teaser: 'Trust and capability for the AI era.', liveUrl: 'https://obeliskgate.com' },
  // Flagship creative works in the games section (D-S208.8) — teaser pages so the
  // Atlas/hero link to a real page, not the generic /games/ index.
  { id: 'voidfall', name: 'Voidfall', section: 'games', category: 'Cinematic Saga', teaser: 'A nine-book cosmic-horror saga. Not a game — a world.', liveUrl: null },
  { id: 'vaultspark-forge', name: 'VaultSpark Forge', section: 'games', category: 'Crafting World', teaser: 'A crafting-and-building world taking shape in the forge.', liveUrl: null },
];

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// Build one page by templating the Seamline forging page. Pure for testability.
export function renderPage(template, p) {
  const section = p.section || 'projects';
  let html = template;
  // 1. Path + slug tokens (lowercase): /projects/seamline/ → /<section>/<id>/ , og slug, data-voice.
  html = html.replace(/projects\/seamline\//g, `${section}/${p.id}/`);
  html = html.replace(/og-projects-seamline/g, `og-${section}-${p.id}`);
  html = html.replace(/data-voice="seamline"/g, `data-voice="${p.id}"`);
  // 2. Display-name tokens: "Seamline" → name (covers title, OG, JSON-LD, h1, data-project, prose).
  html = html.replace(/Seamline/g, esc(p.name));
  // 3. Project-specific head copy.
  html = html.replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${esc(p.name)} — ${esc(p.teaser)} A VaultSpark Studios project taking shape in the forge. Vault Members get first notice when it opens."`);
  html = html.replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${esc(p.teaser)} Forging at VaultSpark Studios."`);
  // 4. IGNIS live-url: point at the confirmed public URL or drop the attribute.
  if (p.liveUrl) html = html.replace(/data-live-url="[^"]*"/, `data-live-url="${esc(p.liveUrl)}"`);
  else html = html.replace(/\sdata-live-url="[^"]*"/, '');
  // 5. Category eyebrow + teaser line just above the H1 hero name, if a hook exists.
  html = html.replace(/(<div class="hero-art-content">\s*)<h1>/, `$1<span class="hero-art-eyebrow" style="display:block;font-size:0.72rem;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#7EC9FF;margin-bottom:0.5rem;">${esc(p.category)} · In the Forge</span><h1>`);
  return html;
}

if (SELF_TEST) {
  const tpl = readFileSync(TEMPLATE, 'utf8');
  const out = renderPage(tpl, PROJECTS[0]);
  let fail = 0;
  const a = (c, m) => { if (!c) { console.error('  ✗ ' + m); fail++; } else console.log('  ✓ ' + m); };
  a(out.includes('<title>Hashmark'), 'title carries project name');
  a(out.includes('projects/hashmark/'), 'canonical/path rewritten to project id');
  a(out.includes('og-projects-hashmark'), 'OG image slug rewritten');
  a(!out.includes('Seamline'), 'no residual template name');
  a(out.includes('Sports AI · In the Forge'), 'category eyebrow injected');
  a(out.includes('data-live-url="https://hashmark.football"'), 'live url set');
  console.log(`\nbuild-forge-project-pages self-test: ${fail ? '✗ ' + fail + ' failed' : 'all passed'}`);
  process.exit(fail ? 1 : 0);
}

if (!existsSync(TEMPLATE)) { console.error('✗ template missing: projects/seamline/index.html'); process.exit(1); }
const template = readFileSync(TEMPLATE, 'utf8');
let created = 0, skipped = 0, missing = [];
for (const p of PROJECTS) {
  const rel = `${p.section || 'projects'}/${p.id}/index.html`;
  const abs = join(ROOT, rel);
  if (existsSync(abs) && !FORCE) { skipped++; continue; }
  if (CHECK) { missing.push(rel); continue; }
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, renderPage(template, p));
  console.log(`  + ${rel}  (${p.name})`);
  created++;
}
if (CHECK) {
  if (missing.length) { console.error(`✗ ${missing.length} forge project page(s) missing: ${missing.join(', ')}`); process.exit(1); }
  console.log('build-forge-project-pages --check: all present'); process.exit(0);
}
console.log(`build-forge-project-pages: ${created} created · ${skipped} already present`);
