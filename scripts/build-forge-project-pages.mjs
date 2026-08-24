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
  // S275: registry flipped atlas + scriptorium to public audiences — the
  // portfolio-coherence gate requires an on-site page for every public entry.
  // Teasers follow the sanitized one-liner pattern (founder review noted in
  // DECISIONS D-S275).
  { id: 'atlas', name: 'ATLAS', category: 'Studio Foundation', teaser: 'The foundation that carries the ecosystem.', liveUrl: null },
  // S329: scriptorium is SPARKED (live at scriptorium.vaultsparkstudios.com,
  // auth-gated studio-internal) — the page said "Forging" while the registry,
  // llms.txt, and the running service all said sparked. sparked:true swaps the
  // forge framing for honest in-studio-use copy; liveUrl stays null because a
  // 401 wall is not a public destination.
  { id: 'scriptorium', name: 'Scriptorium', category: 'Writing OS', teaser: 'Where the studio’s worlds get written.', liveUrl: null, sparked: true },
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
  html = html.replace(/(<div class="hero-art-content">\s*)<h1>/, `$1<span class="hero-art-eyebrow" style="display:block;font-size:0.72rem;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#7EC9FF;margin-bottom:0.5rem;">${esc(p.category)} · ${p.sparked ? 'Sparked — in studio use' : 'In the Forge'}</span><h1>`);
  // 6. S329 sparked variant — a live project must not present as "Forging".
  // Applied last so every templated "Forging" token (title, OG, prose) flips.
  if (p.sparked) {
    html = html.replace(/Forging/g, 'Sparked');
    html = html.replace(/taking shape in the forge\. Vault Members get first notice when it opens\./g,
      'live and in daily studio use. Public access hasn’t opened yet — Vault Members get first notice when it does.');
    html = html.replace(/Forging at VaultSpark Studios\./g, 'Sparked at VaultSpark Studios.');
    // Display chips/badges/rows — scoped exactly to the template's status
    // surfaces so the footer legend + nav (which describe the WHOLE studio,
    // not this project) are untouched.
    html = html.replace(/&nbsp;&middot;&nbsp; In The Forge<\/span>/g, '&nbsp;&middot;&nbsp; Sparked</span>');
    html = html.replace(/<span class="status status-forge">⚒️ Forge<\/span>/g, '<span class="status status-sparked">🔥 Sparked</span>');
    html = html.replace(/<span>In The Forge<\/span>/g, '<span>Sparked</span>');
    html = html.replace(/<span style="color:#f59e0b;">⚒️ In The Forge<\/span>/g, '<span style="color:#22c55e;">🔥 Sparked — in studio use</span>');
  }
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
  const sparkedOut = renderPage(tpl, PROJECTS.find((p) => p.sparked));
  a(!sparkedOut.includes('Forging'), 'sparked variant: no residual "Forging" token');
  a(sparkedOut.includes('Sparked — in studio use'), 'sparked variant: honest eyebrow');
  a(sparkedOut.includes('live and in daily studio use'), 'sparked variant: prose flipped');
  a(!sparkedOut.includes('status status-forge') && !/<span>In The Forge<\/span>/.test(sparkedOut), 'sparked variant: status chips flipped');
  a(sparkedOut.includes('legend-status-forge'), 'sparked variant: studio-wide footer legend untouched');
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
