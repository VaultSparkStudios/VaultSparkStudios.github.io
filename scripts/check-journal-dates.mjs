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

// S323: comma-presence is NOT a day-level test. The old heuristic
// `hasMonthOnly(s) = !s.includes(',')` was wrong in both directions:
//   - "March, 2026" HAS a comma yet carries no day number → it passed as
//     day-level while displaying no day at all.
//   - "5 March 2026" is a legitimate day-level date with NO comma → it
//     false-positived as month-only.
// A date is day-level iff it names a day NUMBER alongside a month name, or it
// is a full ISO / YYYY-MM-DD date. The 1–2 digit day test `\b\d{1,2}\b` does
// not match a 4-digit year ("2026" has no internal word boundary), so
// "March 2026" and "March, 2026" both correctly read as month-only.
const ISO_DATE = /\b\d{4}-\d{2}-\d{2}\b/;
const MONTH_NAME = /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t)?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b/i;
const DAY_NUMBER = /\b\d{1,2}\b/;

/** Pure predicate: does the displayed date string resolve to a DAY-LEVEL date?
 *  Accepts "March 5, 2026", "5 March 2026", "2026-03-05".
 *  Rejects "March 2026", "March, 2026", "" (month-only or empty). */
export function isDayLevel(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const s = dateStr.trim();
  if (!s) return false;
  if (ISO_DATE.test(s)) return true;
  return MONTH_NAME.test(s) && DAY_NUMBER.test(s);
}

/** A non-empty date string that is displayed but NOT day-level (month-only).
 *  Empty strings are "missing", not "month-only" — the crawl flags those
 *  separately — so this stays false for "". */
function hasMonthOnly(dateStr) {
  if (!dateStr) return false;
  return !isDayLevel(dateStr);
}

function selfTest() {
  // Both directions across the S323 example strings — a gate that can only
  // trip on one branch is the bug this rewrite closes.
  const cases = [
    ['"March 5, 2026" is day-level',   isDayLevel('March 5, 2026') === true],
    ['"5 March 2026" is day-level (no comma)', isDayLevel('5 March 2026') === true],
    ['"2026-03-05" (ISO) is day-level', isDayLevel('2026-03-05') === true],
    ['"March 2026" is month-only',      isDayLevel('March 2026') === false],
    ['"March, 2026" is month-only (comma, no day)', isDayLevel('March, 2026') === false],
    ['"" is not day-level',             isDayLevel('') === false],
    ['"Jan 2026" is month-only',        isDayLevel('Jan 2026') === false],
    ['"Jan 5, 2026" is day-level',      isDayLevel('Jan 5, 2026') === true],
    ['hasMonthOnly("March, 2026") is true', hasMonthOnly('March, 2026') === true],
    ['hasMonthOnly("5 March 2026") is false', hasMonthOnly('5 March 2026') === false],
    ['hasMonthOnly("") is false (missing, not month-only)', hasMonthOnly('') === false],
  ];
  let failed = 0;
  for (const [name, passed] of cases) {
    console.log(`${passed ? '  ✓' : '  ✗'} ${name}`);
    if (!passed) failed += 1;
  }
  const total = cases.length;
  console.log(failed === 0
    ? `check-journal-dates self-test ✓  ${total}/${total}`
    : `check-journal-dates self-test ✗  ${failed}/${total} failing`);
  process.exit(failed === 0 ? 0 : 1);
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
// isDayLevel is exported inline at its declaration (S323 pure predicate).
