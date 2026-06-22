#!/usr/bin/env node
/**
 * check-journal-dates.mjs (S216)
 *
 * Gates: every Signal Log post must display a day-level date (e.g. "March 5, 2026"),
 * not a month-only date (e.g. "March 2026"). Reads the <span class="post-date"> from
 * each post's index.html and cross-checks against article:published_time.
 *
 * Exit 0  → all posts have day-level dates
 * Exit 1  → one or more posts have month-only dates (run update-journal-dates.mjs to fix)
 *
 * --self-test: smoke the detection logic against an inline fixture
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RUN_DIRECT = process.argv[1]?.endsWith('check-journal-dates.mjs');

const SKIP = new Set(['archive', 'dispatches', '_drafts']);
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function hasMonthOnly(dateStr) {
  if (!dateStr) return false;
  // Month-only: "March 2026" — no comma-number-comma pattern
  // Day-level:  "March 5, 2026" — contains a comma
  return !dateStr.includes(',');
}

function selfTest() {
  const pass = [
    hasMonthOnly('March 2026') === true,
    hasMonthOnly('March 5, 2026') === false,
    hasMonthOnly('Jan 2026') === true,
    hasMonthOnly('Jan 5, 2026') === false,
    hasMonthOnly('') === false,
  ];
  const ok = pass.every(Boolean);
  if (!ok) {
    console.error('check-journal-dates: self-test FAILED', pass);
    process.exit(1);
  }
  console.log('check-journal-dates: self-test PASS');
  process.exit(0);
}

if (process.argv.includes('--self-test')) selfTest();

if (RUN_DIRECT) {
  let errors = 0;
  const warnings = [];

  let dirs;
  try { dirs = readdirSync('journal'); } catch { dirs = []; }

  for (const d of dirs) {
    if (SKIP.has(d)) continue;
    const dir = join('journal', d);
    try { if (!statSync(dir).isDirectory()) continue; } catch { continue; }
    const htmlPath = join(dir, 'index.html');
    let html;
    try { html = readFileSync(htmlPath, 'utf8'); } catch { continue; }

    // Read article:published_time to get the ISO date (ground truth)
    const isoMatch = html.match(/<meta[^>]+property="article:published_time"[^>]+content="([^"]+)"/);
    if (!isoMatch) continue; // not a post page

    // Read the displayed post-date
    const dateMatch = html.match(/<span class="post-date">([^<]*)<\/span>/);
    const displayDate = dateMatch ? dateMatch[1].trim() : '';

    if (hasMonthOnly(displayDate) || !displayDate) {
      const isoDate = isoMatch[1];
      const [y, mo, day] = isoDate.slice(0, 10).split('-').map(Number);
      const expected = `${MONTHS[mo - 1]} ${day}, ${y}`;
      warnings.push({ slug: d, displayDate: displayDate || '(empty)', expected });
      errors++;
    }
  }

  if (errors > 0) {
    console.error(`check-journal-dates: ${errors} post(s) have month-only or missing dates:`);
    for (const w of warnings) {
      console.error(`  journal/${w.slug}/index.html — displayed: "${w.displayDate}" → should be: "${w.expected}"`);
    }
    console.error('  Fix: node scripts/update-journal-dates.mjs');
    process.exit(1);
  }

  console.log(`check-journal-dates: all ${dirs.filter(d => !SKIP.has(d)).length} posts have day-level dates ✓`);
  process.exit(0);
}

export { hasMonthOnly };
