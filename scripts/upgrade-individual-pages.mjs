#!/usr/bin/env node
/**
 * upgrade-individual-pages.mjs (S216)
 *
 * Applies the S215 visual treatment to individual game + project pages:
 *   1. Upgrades .game-hero::before / .proj-hero::before from 2-circle radial-
 *      gradient to 3-layer ellipse gradient using each page's existing accent colors.
 *   2. Adds @keyframes gold-pulse and applies it to .stat-block strong.
 *   3. Injects the ecosystem-bridge section (HTML + CSS) before </main>.
 *
 * Skips pages that already have the 3-layer ellipse treatment.
 *
 * Usage:
 *   node scripts/upgrade-individual-pages.mjs           -- apply all
 *   node scripts/upgrade-individual-pages.mjs --dry-run -- preview
 *   node scripts/upgrade-individual-pages.mjs --self-test
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DRY = process.argv.includes('--dry-run');

// 2-circle detection: the OLD pattern we're replacing
const OLD_PATTERN = /radial-gradient\(circle at 1[05]% 40%/;
// Ellipse detection: already upgraded (skip)
const NEW_PATTERN = /radial-gradient\(ellipse at 1[02]%/;
// gold-pulse already injected
const GOLD_PULSE_PRESENT = /gold-pulse/;
// ecosystem-bridge already injected
const BRIDGE_PRESENT = /ecosystem-bridge/;

// Per-page accent colors (primary, secondary).
// Extracted from existing hero gradients or brand kit.
const ACCENT_MAP = {
  // Game pages (path-segment → [primary rgba, secondary rgba])
  'call-of-doodie':         ['rgba(232,64,64',   'rgba(255,122,0'],
  'franchise-architect': ['rgba(31,162,255',  'rgba(34,197,94'],
  'gridiron-gm':            ['rgba(31,162,255',  'rgba(34,197,94'],
  'gridiron-gm-play':       ['rgba(31,162,255',  'rgba(34,197,94'],
  'mindframe':              ['rgba(139,92,246',  'rgba(6,182,212'],
  'solara':                 ['rgba(192,132,252', 'rgba(249,115,22'],
  'the-exodus':             ['rgba(249,115,22',  'rgba(52,211,153'],
  'vaultfront':             ['rgba(255,196,0',   'rgba(167,139,250'],
  'vaultspark-forge':       ['rgba(255,196,0',   'rgba(31,162,255'],
  'voidfall':               ['rgba(100,116,255', 'rgba(167,139,250'],
  // Project pages
  'promogrind':             ['rgba(249,115,22',  'rgba(31,162,255'],
  'velaxis':                ['rgba(6,182,212',   'rgba(34,197,94'],
  'vault-member':           ['rgba(34,197,94',   'rgba(255,196,0'],
  'obelisk':                ['rgba(255,196,0',   'rgba(31,162,255'],
  'statvault':              ['rgba(31,162,255',  'rgba(34,197,94'],
  'promogrind':             ['rgba(249,115,22',  'rgba(31,162,255'],
  'vault-pipeline':         ['rgba(31,162,255',  'rgba(139,92,246'],
  'signal-log':             ['rgba(167,139,250', 'rgba(255,196,0'],
  'canon':                  ['rgba(255,196,0',   'rgba(31,162,255'],
  'concurrent':             ['rgba(6,182,212',   'rgba(139,92,246'],
  'hashmark':               ['rgba(34,197,94',   'rgba(31,162,255'],
  'ideaforge':              ['rgba(255,122,0',   'rgba(255,196,0'],
  'ouren':                  ['rgba(139,92,246',  'rgba(6,182,212'],
  'seamline':               ['rgba(249,115,22',  'rgba(34,197,94'],
  'shadow':                 ['rgba(100,116,255', 'rgba(167,139,250'],
  'sparkraid':              ['rgba(34,197,94',   'rgba(31,162,255'],
  'syntha':                 ['rgba(6,182,212',   'rgba(255,196,0'],
  'the-living-protocol':    ['rgba(167,139,250', 'rgba(6,182,212'],
  'vorn':                   ['rgba(31,162,255',  'rgba(249,115,22'],
};

const FALLBACK_ACCENT = ['rgba(255,196,0', 'rgba(31,162,255'];

// The gold-pulse CSS to inject into the <style> block
const GOLD_PULSE_CSS = [
  '    @keyframes gold-pulse { 0%,100%{opacity:1} 50%{opacity:.7} }',
  '    .stat-block strong { animation: gold-pulse 3s ease-in-out infinite; animation-delay: var(--pulse-delay,0s); }',
].join('\n');

// Ecosystem-bridge CSS (inserted into <style>)
const BRIDGE_CSS = [
  '    .ecosystem-bridge { padding:2.5rem 0; border-top:1px solid rgba(255,255,255,0.06); }',
  '    .ecosystem-bridge-inner { display:grid; grid-template-columns:1fr 1fr; gap:2.5rem; align-items:center; }',
  '    .ecosystem-bridge-eyebrow { font-size:0.72rem; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; color:var(--gold,#ffc400); margin-bottom:0.7rem; }',
  '    .ecosystem-bridge h2 { font-family:Georgia,serif; font-size:clamp(1.4rem,2.6vw,2rem); margin-bottom:0.9rem; }',
  '    .ecosystem-bridge p { color:var(--muted,#a8b4d0); font-size:0.95rem; line-height:1.7; margin-bottom:1.3rem; }',
  '    .eco-link { display:block; padding:0.6rem 0.9rem; border-radius:12px; border:1px solid rgba(255,255,255,0.07); background:rgba(255,255,255,0.02); color:var(--muted,#a8b4d0); font-size:0.85rem; font-weight:600; text-decoration:none; transition:border-color .18s,color .18s; }',
  '    .eco-link:hover { color:var(--text,#eef2ff); border-color:rgba(255,255,255,0.15); }',
  '    .eco-link span { display:block; font-size:0.75rem; font-weight:400; margin-top:0.1rem; opacity:0.7; }',
  '    .ecosystem-bridge-links { display:grid; grid-template-columns:1fr 1fr; gap:0.7rem; }',
  '    @media (max-width:720px) { .ecosystem-bridge-inner { grid-template-columns:1fr; gap:1.8rem; } }',
].join('\n');

// Ecosystem-bridge HTML block — injected before </main>
function buildBridgeHTML(isGame) {
  if (isGame) {
    return [
      '    <!-- ecosystem-bridge-inject:game (S216) -->',
      '    <section class="ecosystem-bridge" aria-label="Cross-studio ecosystem">',
      '      <div class="container">',
      '        <div class="ecosystem-bridge-inner">',
      '          <div>',
      '            <p class="ecosystem-bridge-eyebrow">Also From The Vault</p>',
      '            <h2>Projects That Power The Games</h2>',
      '            <p>From sports analytics to creator tools — VaultSpark builds a connected ecosystem where every project serves the games.</p>',
      '            <a href="/projects/" class="button-ghost button-sm" style="display:inline-flex;align-items:center;min-height:40px;padding:0 1rem;border-radius:999px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.04);color:var(--muted,#a8b4d0);font-size:0.84rem;font-weight:600;text-decoration:none;">Explore All Projects &rarr;</a>',
      '          </div>',
      '          <div class="ecosystem-bridge-links">',
      '            <a href="/projects/promogrind/" class="eco-link">PromoGrind <span>Sports Promo Tool</span></a>',
      '            <a href="/projects/vault-member/" class="eco-link">Vault Member <span>Cross-Game Rank</span></a>',
      '            <a href="/projects/velaxis/" class="eco-link">Velaxis <span>Sports Intelligence</span></a>',
      '            <a href="/games/" class="eco-link">All Games <span>VaultSpark Universe</span></a>',
      '          </div>',
      '        </div>',
      '      </div>',
      '    </section>',
    ].join('\n');
  }
  return [
    '    <!-- ecosystem-bridge-inject:project (S216) -->',
    '    <section class="ecosystem-bridge" aria-label="Cross-studio ecosystem">',
    '      <div class="container">',
    '        <div class="ecosystem-bridge-inner">',
    '          <div>',
    '            <p class="ecosystem-bridge-eyebrow">Also From The Vault</p>',
    '            <h2>Games &amp; Tools From The Studio</h2>',
    '            <p>VaultSpark Studios builds a connected ecosystem — games, analytics, creator tools, and community features that all serve each other.</p>',
    '            <a href="/games/" class="button-ghost button-sm" style="display:inline-flex;align-items:center;min-height:40px;padding:0 1rem;border-radius:999px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.04);color:var(--muted,#a8b4d0);font-size:0.84rem;font-weight:600;text-decoration:none;">Explore All Games &rarr;</a>',
    '          </div>',
    '          <div class="ecosystem-bridge-links">',
    '            <a href="/games/call-of-doodie/" class="eco-link">Call of Doodie <span>Browser Shooter</span></a>',
    '            <a href="/games/franchise-architect/" class="eco-link">Franchise Architect <span>Franchise Sim</span></a>',
    '            <a href="/games/mindframe/" class="eco-link">MindFrame <span>Cognitive Training</span></a>',
    '            <a href="/projects/" class="eco-link">All Projects <span>Full Portfolio</span></a>',
    '          </div>',
    '        </div>',
    '      </div>',
    '    </section>',
  ].join('\n');
}

function build3LayerGradient(slug) {
  const [p, s] = ACCENT_MAP[slug] || FALLBACK_ACCENT;
  return [
    `        radial-gradient(ellipse at 12% 45%, ${p},0.22), transparent 42%),`,
    `        radial-gradient(ellipse at 88% 35%, ${s},0.14), transparent 42%),`,
    `        radial-gradient(ellipse at 50% 90%, ${p},0.07), transparent 52%);`,
  ].join('\n');
}

function upgradeHero(html, slug, heroClass) {
  // Regex: finds the 2-circle pattern and replaces with 3-layer ellipse
  const re = new RegExp(
    `(${heroClass}::before\\s*\\{[^}]*background:\\s*)` +
    `radial-gradient\\(circle at 1[05]% 40%[^;]+;`,
    's'
  );
  return html.replace(re, (_, prefix) => {
    return prefix + 'background:\n' + build3LayerGradient(slug);
  });
}

function selfTest() {
  const html = [
    '<html><head><style>',
    '.game-hero::before { content:""; position:absolute; }',
    '.game-hero::before {',
    '  background:',
    '    radial-gradient(circle at 15% 40%, rgba(255,122,0,0.16), transparent 32%),',
    '    radial-gradient(circle at 85% 40%, rgba(255,196,0,0.1), transparent 32%); }',
    '</style></head><body>',
    '<main>',
    '<section class="related-rail"></section>',
    '</main></body></html>',
  ].join('\n');

  const result = applyUpgrade(html, 'call-of-doodie', true);
  const ok =
    result.includes('ellipse') &&
    result.includes('gold-pulse') &&
    result.includes('ecosystem-bridge') &&
    !result.includes('radial-gradient(circle at 15%');
  if (!ok) {
    console.error('self-test FAIL');
    if (!result.includes('ellipse')) console.error('  missing: ellipse');
    if (!result.includes('gold-pulse')) console.error('  missing: gold-pulse');
    if (!result.includes('ecosystem-bridge')) console.error('  missing: ecosystem-bridge');
    if (result.includes('radial-gradient(circle at 15%')) console.error('  old pattern still present');
    process.exit(1);
  }
  console.log('upgrade-individual-pages: self-test PASS');
  process.exit(0);
}

if (process.argv.includes('--self-test')) selfTest();

function applyUpgrade(html, slug, isGame) {
  let out = html;
  const heroClass = isGame ? '.game-hero' : '.proj-hero';

  // 1. Upgrade hero gradient if old pattern present
  if (OLD_PATTERN.test(out) && !NEW_PATTERN.test(out)) {
    out = upgradeHero(out, slug, heroClass);
  }

  // 2. Add gold-pulse + stat-block strong animation
  if (!GOLD_PULSE_PRESENT.test(out)) {
    // Inject before closing </style> of the critical-shell style block
    // (look for the first </style> that closes a data-vs-critical-shell block)
    const styleClose = '</style>';
    const idx = out.indexOf(styleClose);
    if (idx !== -1) {
      out = out.slice(0, idx) + '\n' + GOLD_PULSE_CSS + '\n  ' + out.slice(idx);
    }
  }

  // 3. Add ecosystem-bridge CSS (inside same style block)
  if (!BRIDGE_PRESENT.test(out)) {
    const styleClose = '</style>';
    const idx = out.indexOf(styleClose);
    if (idx !== -1) {
      out = out.slice(0, idx) + '\n' + BRIDGE_CSS + '\n  ' + out.slice(idx);
    }

    // Inject bridge HTML before </main>
    const mainClose = '\n  </main>';
    const mainIdx = out.indexOf(mainClose);
    if (mainIdx !== -1) {
      const bridgeHTML = '\n' + buildBridgeHTML(isGame) + '\n';
      out = out.slice(0, mainIdx) + bridgeHTML + out.slice(mainIdx);
    }
  }

  return out;
}

// ── Main ──────────────────────────────────────────────────────────────────────

function processDir(baseDir, isGame) {
  let updated = 0, skipped = 0;
  let dirs;
  try { dirs = readdirSync(baseDir); } catch { return [0, 0]; }

  for (const dir of dirs) {
    const dirPath = join(baseDir, dir);
    try { if (!statSync(dirPath).isDirectory()) continue; } catch { continue; }
    const htmlPath = join(dirPath, 'index.html');
    let html;
    try { html = readFileSync(htmlPath, 'utf8'); } catch { continue; }

    // Skip if already fully upgraded
    if (NEW_PATTERN.test(html) && GOLD_PULSE_PRESENT.test(html) && BRIDGE_PRESENT.test(html)) {
      skipped++;
      continue;
    }

    const upgraded = applyUpgrade(html, dir, isGame);
    if (upgraded === html) { skipped++; continue; }

    if (DRY) {
      console.log(`  [dry-run] would upgrade: ${baseDir}/${dir}`);
    } else {
      writeFileSync(htmlPath, upgraded, 'utf8');
      console.log(`  upgraded: ${baseDir}/${dir}`);
    }
    updated++;
  }
  return [updated, skipped];
}

const [gU, gS] = processDir('games', true);
const [pU, pS] = processDir('projects', false);
const total = gU + pU;
const totalSkip = gS + pS;
console.log(`upgrade-individual-pages: ${total} upgraded (${gU} game, ${pU} project) · ${totalSkip} already current`);
