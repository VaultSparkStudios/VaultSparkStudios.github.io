#!/usr/bin/env node
/**
 * check-sil-integrity.mjs (S176 #9 · sil-integrity-clamp)
 *
 * Validates SELF_IMPROVEMENT_LOOP.md SIL entries so cross-repo aggregation
 * (studio-ops dashboards) never chokes on malformed data. Studio-ops raised
 * the repo-question: entries carried Process Quality=101 (valid range 0–100)
 * and a stated total that disagreed with the sum of its categories.
 *
 * Rules per dated entry that has a category line:
 *   1. Every category score is an integer in [0, 100].
 *   2. The stated "**Score:** N / 1000" equals the sum of the 10 categories.
 *
 * Exit 0 = clean · 1 = violation(s). --self-test runs the rule engine on
 * fixtures. --fix not provided intentionally: score edits are founder-visible
 * truth, corrected by hand with a noted rationale (see S176 historical fix).
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SIL = path.join(ROOT, 'context', 'SELF_IMPROVEMENT_LOOP.md');

// Parse "(Dev Health 100 · Creative Alignment 99 · …)" into [{name,score}].
export function parseCategories(line) {
  const inner = (line.match(/^\(([^)]*)\)/) || [])[1];
  if (!inner) return null;
  const cats = [];
  for (const part of inner.split('·')) {
    const m = part.trim().match(/^(.*?)\s+(\d+)$/);
    if (m) cats.push({ name: m[1].trim(), score: Number(m[2]) });
  }
  return cats.length ? cats : null;
}

export function validateEntry({ stated, categories }) {
  const errors = [];
  for (const c of categories) {
    if (!Number.isInteger(c.score) || c.score < 0 || c.score > 100) {
      errors.push(`category "${c.name}" = ${c.score} out of range [0,100]`);
    }
  }
  const sum = categories.reduce((a, c) => a + c.score, 0);
  if (stated != null && sum !== stated) {
    errors.push(`stated total ${stated} ≠ sum of categories ${sum}`);
  }
  return errors;
}

function run() {
  const text = fs.readFileSync(SIL, 'utf8');
  const lines = text.split('\n');
  const violations = [];
  for (let i = 0; i < lines.length; i += 1) {
    const cats = parseCategories(lines[i]);
    if (!cats) continue;
    // Find the nearest preceding "**Score:** N / 1000".
    let stated = null;
    for (let j = i - 1; j >= 0 && j > i - 5; j -= 1) {
      const m = lines[j].match(/\*\*Score:\*\*\s*(\d+)\s*\/\s*1000/);
      if (m) { stated = Number(m[1]); break; }
    }
    const errs = validateEntry({ stated, categories: cats });
    if (errs.length) violations.push({ line: i + 1, errs });
  }
  return violations;
}

function selfTest() {
  const cases = [
    ['valid entry', validateEntry({ stated: 300, categories: [{ name: 'a', score: 100 }, { name: 'b', score: 100 }, { name: 'c', score: 100 }] }).length === 0],
    ['out-of-range caught', validateEntry({ stated: 101, categories: [{ name: 'a', score: 101 }] }).some((e) => /out of range/.test(e))],
    ['mismatch caught', validateEntry({ stated: 999, categories: [{ name: 'a', score: 100 }] }).some((e) => /≠ sum/.test(e))],
    ['parse line', (parseCategories('(Dev Health 100 · Momentum 99)') || []).length === 2],
    ['parse rejects prose', parseCategories('This is not a category line') === null],
  ];
  let pass = 0;
  for (const [name, ok] of cases) { if (ok) pass += 1; else console.error(`  ✗ ${name}`); }
  console.log(`check-sil-integrity self-test: ${pass}/${cases.length} passing`);
  process.exit(pass === cases.length ? 0 : 1);
}

if (process.argv.includes('--self-test')) selfTest();

const violations = run();
if (violations.length) {
  console.error(`✗ ${violations.length} SIL integrity violation(s) in SELF_IMPROVEMENT_LOOP.md:`);
  for (const v of violations) console.error(`  line ${v.line}: ${v.errs.join('; ')}`);
  console.error('  Fix by hand with a noted rationale (categories are founder-visible truth).');
  process.exit(1);
}
console.log('✓ SIL integrity: all category lines in range and totals consistent');
