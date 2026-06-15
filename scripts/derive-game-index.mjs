#!/usr/bin/env node
/**
 * derive-game-index.mjs — S199 game-registry-derive-pass-l2 (L2 of L2).
 *
 * Reads data/game-registry.json and synchronises data-status attributes on
 * game cards in games/index.html that carry a data-game="<slug>" attribute.
 * Cards without data-game are reported as "unmatched" (require manual review).
 *
 * Flags:
 *   --dry-run   Report changes without writing
 *   --check     Exit 1 if any card status is out of sync (CI mode)
 *   --self-test Run unit assertions
 *
 * Import-safe: side effects run only when invoked directly.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const INDEX_HTML = join(ROOT, 'games', 'index.html');

/**
 * Given HTML and registry games map, update data-status on cards that have
 * matching data-game="<slug>" attributes. Returns { html, updates, unmatched }.
 */
export function syncGameIndexStatus(html, games) {
  const updates = [];
  const unmatched = [];

  // Track all data-game values referenced in the HTML to find unmatched cards.
  const seenDataGame = new Set();

  let result = html;

  // Match <article ...> or <div ...> elements with data-game="<slug>" and data-status="<s>"
  const cardPat = /(<(?:article|div)[^>]*\bdata-game="([^"]+)"[^>]*\bdata-status=")([^"]+)(")/g;
  result = result.replace(cardPat, (match, pre, slug, oldStatus, close) => {
    seenDataGame.add(slug);
    const g = games[slug];
    if (!g) {
      unmatched.push({ slug, reason: 'not in registry' });
      return match;
    }
    const newStatus = g.status;
    if (newStatus !== oldStatus) {
      updates.push({ slug, from: oldStatus, to: newStatus });
      return pre + newStatus + close;
    }
    return match;
  });

  // Also check the variant where data-status comes before data-game.
  const cardPat2 = /(<(?:article|div)[^>]*\bdata-status=")([^"]+)("[^>]*\bdata-game="([^"]+)"[^>]*>)/g;
  result = result.replace(cardPat2, (match, pre, oldStatus, mid, slug) => {
    seenDataGame.add(slug);
    const g = games[slug];
    if (!g) {
      if (!unmatched.find((u) => u.slug === slug)) unmatched.push({ slug, reason: 'not in registry' });
      return match;
    }
    const newStatus = g.status;
    if (newStatus !== oldStatus) {
      const already = updates.find((u) => u.slug === slug);
      if (!already) updates.push({ slug, from: oldStatus, to: newStatus });
      return pre + newStatus + mid + slug + '">';
    }
    return match;
  });

  return { html: result, updates, unmatched };
}

function runSelfTest() {
  let pass = 0, fail = 0;
  const assert = (cond, msg) => {
    if (cond) { pass++; console.log('  ✓ ' + msg); }
    else       { fail++; console.error('  ✗ ' + msg); }
  };

  const games = {
    'game-a': { status: 'sparked' },
    'game-b': { status: 'vaulted' },
  };

  // T1: updates data-status when mismatched
  const html1 = '<article class="game-card" data-status="forge" data-game="game-a" aria-label="Game A">';
  const r1 = syncGameIndexStatus(html1, games);
  assert(r1.html.includes('data-status="sparked"'), 'T1 status updated');
  assert(r1.updates.length === 1 && r1.updates[0].slug === 'game-a', 'T1 update recorded');

  // T2: leaves matching status untouched
  const html2 = '<article class="game-card" data-status="vaulted" data-game="game-b" aria-label="Game B">';
  const r2 = syncGameIndexStatus(html2, games);
  assert(r2.html === html2, 'T2 unchanged when status matches');
  assert(r2.updates.length === 0, 'T2 no updates recorded');

  // T3: unknown slug goes to unmatched
  const html3 = '<article class="game-card" data-status="forge" data-game="unknown-slug" aria-label="X">';
  const r3 = syncGameIndexStatus(html3, games);
  assert(r3.unmatched.length === 1, 'T3 unknown slug → unmatched');

  // T4: idempotent
  const html4 = '<article class="game-card" data-status="forge" data-game="game-a">';
  const once = syncGameIndexStatus(html4, games).html;
  const twice = syncGameIndexStatus(once, games).html;
  assert(once === twice, 'T4 idempotent');

  console.log((fail === 0 ? '✓' : '✗') + ' derive-game-index self-test: ' + pass + '/' + (pass + fail));
  return fail;
}

const isMain = process.argv[1] &&
  process.argv[1].replace(/\\/g, '/').endsWith('scripts/derive-game-index.mjs');

if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) process.exit(runSelfTest() > 0 ? 1 : 0);

  const dryRun = args.includes('--dry-run');
  const check  = args.includes('--check');

  const registry = JSON.parse(readFileSync(join(ROOT, 'data', 'game-registry.json'), 'utf8'));
  const src = readFileSync(INDEX_HTML, 'utf8');
  const { html, updates, unmatched } = syncGameIndexStatus(src, registry.games);

  for (const u of updates) {
    console.log(`${dryRun || check ? '(would update) ' : '(updated) '}${u.slug}: ${u.from} → ${u.to}`);
  }
  for (const u of unmatched) {
    console.warn(`  ⚠ unmatched card: ${u.slug} (${u.reason}) — manual review needed`);
  }

  if (check && updates.length > 0) {
    console.error(`\n✗ derive-game-index --check: ${updates.length} card(s) out of sync with registry`);
    process.exit(1);
  }

  if (!dryRun && !check && updates.length > 0) {
    writeFileSync(INDEX_HTML, html, 'utf8');
  }

  const status = updates.length === 0 ? 'already in sync' : (dryRun || check ? `${updates.length} would update` : `${updates.length} updated`);
  console.log(`derive-game-index → games/index.html: ${status}`);
}
