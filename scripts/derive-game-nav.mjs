#!/usr/bin/env node
/**
 * derive-game-nav.mjs — S199 game-registry-derive-pass-l2 (L1 of L2).
 *
 * Reads data/game-registry.json and regenerates the Games nav dropdown in
 * every HTML page. Makes nav drift structurally impossible: the registry is
 * the single source of truth for which games appear, in which status group.
 *
 * Flags:
 *   --dry-run   Report files that would change without writing
 *   --check     Exit 1 if any file is out of sync (CI mode)
 *   --self-test Run unit assertions
 *
 * Import-safe: side effects run only when invoked directly.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Build the inner nav-dropdown HTML for the Games section. */
export function buildGameNavHtml(games) {
  const byStatus = { sparked: [], forge: [], vaulted: [] };
  for (const [slug, g] of Object.entries(games)) {
    if (byStatus[g.status]) byStatus[g.status].push({ slug, name: g.name, navOrder: g.navOrder ?? 99 });
  }
  // Sort each group by navOrder so registry drives display order.
  for (const arr of Object.values(byStatus)) arr.sort((a, b) => a.navOrder - b.navOrder);

  let html = '<span class="dropdown-label">Games</span><a href="/games/">All Games</a>';

  if (byStatus.sparked.length) {
    html += '<div class="dropdown-divider"></div>' +
      '<span class="dropdown-label dropdown-status-sparked">🔥 Sparked</span>';
    for (const g of byStatus.sparked) {
      html += `<a href="/games/${g.slug}/">${g.name}</a>`;
    }
  }
  if (byStatus.forge.length) {
    html += '<div class="dropdown-divider"></div>' +
      '<span class="dropdown-label dropdown-status-forge">⚒️ In The Forge</span>';
    for (const g of byStatus.forge) {
      html += `<a href="/games/${g.slug}/">${g.name}</a>`;
    }
  }
  if (byStatus.vaulted.length) {
    html += '<div class="dropdown-divider"></div>' +
      '<span class="dropdown-label dropdown-status-honored">🔒 Honored</span>';
    for (const g of byStatus.vaulted) {
      html += `<a href="/games/${g.slug}/">${g.name}</a>`;
    }
  }
  return html;
}

/** Replace the inner content of the Games nav-dropdown in one HTML string. */
export function injectGameNav(html, innerHtml) {
  // Pattern: <div class="nav-dropdown"><span class="dropdown-label">Games</span>
  //          ... (any content) ...
  //          </div></div>           ← closes nav-dropdown then nav-item
  // The dropdown-divider pairs (<div class="dropdown-divider"></div>) never
  // produce adjacent </div></div> so this ending is unique in this context.
  const PAT = /(<div class="nav-dropdown">)<span class="dropdown-label">Games<\/span>[\s\S]*?(<\/div><\/div>)/;
  const replaced = html.replace(PAT, `$1${innerHtml}$2`);
  return replaced;
}

/** Walk directory tree collecting *.html paths. */
function walkHtml(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') walkHtml(p, out);
    } else if (entry.name.endsWith('.html')) {
      out.push(p);
    }
  }
  return out;
}

function runSelfTest() {
  let pass = 0, fail = 0;
  const assert = (cond, msg) => {
    if (cond) { pass++; console.log('  ✓ ' + msg); }
    else       { fail++; console.error('  ✗ ' + msg); }
  };

  // T1: buildGameNavHtml groups by status correctly
  const games = {
    'game-a': { name: 'Game A', status: 'sparked' },
    'game-b': { name: 'Game B', status: 'forge' },
    'game-c': { name: 'Game C', status: 'vaulted' },
  };
  const nav = buildGameNavHtml(games);
  assert(nav.includes('dropdown-status-sparked'), 'T1 sparked label present');
  assert(nav.includes('<a href="/games/game-a/">Game A</a>'), 'T1 sparked link correct');
  assert(nav.includes('dropdown-status-forge'), 'T1 forge label present');
  assert(nav.includes('dropdown-status-honored'), 'T1 honored presentation for vaulted games present');

  // T2: injectGameNav replaces inner content
  const html = '<div class="nav-item has-dropdown"><a href="/games/">Games</a>' +
    '<div class="nav-dropdown"><span class="dropdown-label">Games</span>' +
    '<a href="/games/old/">Old</a></div></div>';
  const injected = injectGameNav(html, 'NEW_CONTENT');
  assert(injected.includes('NEW_CONTENT'), 'T2 inject replaces inner');
  assert(!injected.includes('Old'), 'T2 old content removed');

  // T3: injectGameNav is idempotent
  const nav2 = buildGameNavHtml(games);
  const h1 = injectGameNav(html, nav2);
  const h2 = injectGameNav(h1, nav2);
  assert(h1 === h2, 'T3 idempotent');

  console.log((fail === 0 ? '✓' : '✗') + ' derive-game-nav self-test: ' + pass + '/' + (pass + fail));
  return fail;
}

const isMain = process.argv[1] &&
  process.argv[1].replace(/\\/g, '/').endsWith('scripts/derive-game-nav.mjs');

if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) {
    process.exit(runSelfTest() > 0 ? 1 : 0);
  }

  const dryRun  = args.includes('--dry-run');
  const check   = args.includes('--check');

  const registry = JSON.parse(readFileSync(join(ROOT, 'data', 'game-registry.json'), 'utf8'));
  const innerHtml = buildGameNavHtml(registry.games);
  const htmlFiles = walkHtml(ROOT);

  let changed = 0, checked = 0;
  for (const f of htmlFiles) {
    const src = readFileSync(f, 'utf8');
    if (!src.includes('<span class="dropdown-label">Games</span>')) continue;
    checked++;
    const updated = injectGameNav(src, innerHtml);
    if (updated === src) continue;
    changed++;
    if (!dryRun && !check) writeFileSync(f, updated, 'utf8');
    const rel = f.replace(ROOT + '\\', '').replace(ROOT + '/', '');
    console.log((dryRun || check ? '(would update) ' : '(updated) ') + rel);
  }

  if (check && changed > 0) {
    console.error(`\n✗ derive-game-nav --check: ${changed} file(s) out of sync with registry`);
    process.exit(1);
  }
  console.log(`derive-game-nav → ${checked} scanned · ${changed} ${dryRun || check ? 'would change' : 'updated'}`);
}
