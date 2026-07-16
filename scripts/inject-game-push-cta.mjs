#!/usr/bin/env node
/**
 * inject-game-push-cta.mjs (S216)
 *
 * Injects a push-subscribe CTA section before the .related-rail on each
 * individual game page. The [data-push-subscribe] container is auto-wired
 * by assets/push-subscribe.js at idle time. Skips pages that already have
 * [data-push-subscribe].
 *
 * Usage:
 *   node scripts/inject-game-push-cta.mjs           -- inject on all eligible pages
 *   node scripts/inject-game-push-cta.mjs --dry-run  -- preview without writing
 *   node scripts/inject-game-push-cta.mjs --self-test
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DRY = process.argv.includes('--dry-run');

// Per-game accent colors (CSS var) and notif copy — maps path-segment slug
const GAME_META = {
  'call-of-doodie':         { accent: 'var(--orange,#ff7a00)', label: 'Call of Doodie updates' },
  'franchise-architect': { accent: 'var(--blue,#1fa2ff)',   label: 'Franchise Architect updates' },
  'gridiron-gm':            { accent: 'var(--blue,#1fa2ff)',   label: 'Franchise Architect updates' },
  'mindframe':              { accent: 'var(--gold,#ffc400)',   label: 'MindFrame updates' },
  'solara':                 { accent: '#f97316',               label: 'Solara: Sunfall updates' },
  'vaultfront':             { accent: '#a78bfa',               label: 'VaultFront updates' },
  'the-exodus':             { accent: '#34d399',               label: 'The Exodus updates' },
  'vaultspark-forge':       { accent: 'var(--gold,#ffc400)',   label: 'Forge updates' },
};

const INJECT_BEFORE_PRIMARY = '<section class="related-rail"';
const INJECT_BEFORE_FALLBACK = '\n  </main>';
const ALREADY_INJECTED = 'data-push-subscribe';
const SECTION_LABEL = '<!-- push-cta-inject:game (S216) -->';

function selfTest() {
  const html = '<div>foo</div>\n' + INJECT_BEFORE_PRIMARY + ' aria-label="x">';
  const result = injectCTA(html, 'mindframe');
  const ok = result.includes(ALREADY_INJECTED) && result.indexOf(SECTION_LABEL) < result.indexOf(INJECT_BEFORE_PRIMARY);
  if (!ok) { console.error('self-test FAIL (primary)'); process.exit(1); }
  // Fallback path
  const htmlFb = '<div>foo</div>' + INJECT_BEFORE_FALLBACK;
  const resultFb = injectCTA(htmlFb, 'call-of-doodie');
  if (!resultFb || !resultFb.includes(ALREADY_INJECTED)) { console.error('self-test FAIL (fallback)'); process.exit(1); }
  const skip = injectCTA('<div ' + ALREADY_INJECTED + '></div>\n' + INJECT_BEFORE_PRIMARY + '>', 'mindframe');
  if (skip !== null) { console.error('self-test FAIL: should skip already-injected'); process.exit(1); }
  console.log('inject-game-push-cta: self-test PASS');
  process.exit(0);
}

if (process.argv.includes('--self-test')) selfTest();

function buildBlock(slug) {
  const meta = GAME_META[slug] || { accent: 'var(--gold,#ffc400)', label: 'game updates' };
  return [
    '',
    SECTION_LABEL,
    '    <section aria-label="Push notification opt-in" style="padding:1rem 0 2rem;">',
    '      <div class="container">',
    '        <div style="max-width:520px;">',
    `          <p style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:${meta.accent};margin-bottom:0.45rem;">${meta.label}</p>`,
    '          <div data-push-subscribe style="display:inline-block;"></div>',
    '        </div>',
    '      </div>',
    '    </section>',
    '',
  ].join('\n');
}

function injectCTA(html, slug) {
  if (html.includes(ALREADY_INJECTED)) return null; // already present
  let idx = html.indexOf(INJECT_BEFORE_PRIMARY);
  if (idx !== -1) {
    return html.slice(0, idx) + buildBlock(slug) + html.slice(idx);
  }
  // Fallback: inject just before </main>
  idx = html.indexOf(INJECT_BEFORE_FALLBACK);
  if (idx !== -1) {
    return html.slice(0, idx) + '\n' + buildBlock(slug) + html.slice(idx + 1); // skip one leading \n
  }
  return null;
}

const SKIP_DIRS = new Set(['index.html', 'gridiron-gm-play', 'project-unknown', 'voidfall']);

let updated = 0, skipped = 0, noRail = 0;

const gameDirs = readdirSync('games');
for (const dir of gameDirs) {
  if (SKIP_DIRS.has(dir)) continue;
  const htmlPath = join('games', dir, 'index.html');
  let html;
  try {
    if (!statSync(join('games', dir)).isDirectory()) continue;
    html = readFileSync(htmlPath, 'utf8');
  } catch { continue; }

  const result = injectCTA(html, dir);
  if (result === null) {
    if (html.includes(ALREADY_INJECTED)) {
      skipped++;
      console.log('  skip (already injected):', dir);
    } else {
      noRail++;
      console.log('  skip (no anchor found): ', dir);
    }
    continue;
  }

  if (DRY) {
    console.log('  [dry-run] would inject:', dir);
  } else {
    writeFileSync(htmlPath, result, 'utf8');
    console.log('  injected:', dir);
  }
  updated++;
}

console.log(`inject-game-push-cta: ${updated} injected · ${skipped} already present · ${noRail} no related-rail`);
