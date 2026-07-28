#!/usr/bin/env node
/* check-taskboard-duplicate-titles.mjs — S251 resolved-DONE-carry early-warning.

   S251 found 10 TASK_BOARD items (PROGRESSIVE-MEMBERSHIP-UNLOCK, PROOF-LINE-TELEMETRY,
   Ask IGNIS concierge, unified cross-portal shell, etc.) whose described work had
   already shipped — sometimes literally checked off `[x]` elsewhere in the file — but
   an older duplicate `[ ]` line in a historical section survived because
   check-stale-open-tasks.mjs only scans the last 3 sessions. A fuzzy "is this already
   done" gate risks false positives (D-S251.1), so instead this is a narrow, high-
   precision structural signal: the SAME bolded item title appears more than once in
   the file. That alone doesn't prove staleness — but if one copy is already `[x]`,
   an open `[ ]` duplicate of the identical title is exactly the class this session
   found nine times over. Always advisory (exit 0) — a human/agent verifies each hit
   against live code before touching anything, per the S196 disprove-deferral habit.

   Usage:
     node scripts/check-taskboard-duplicate-titles.mjs
     node scripts/check-taskboard-duplicate-titles.mjs --json
     node scripts/check-taskboard-duplicate-titles.mjs --self-test
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TASKBOARD = path.join(ROOT, 'context', 'TASK_BOARD.md');

const LINE_RE = /^- \[([ x~])\] \*\*(?:\[[^\]]*\])+\s*(.+?)\*\*/;

function normalizeTitle(raw) {
  // Cut at the first sentence-ending punctuation after the title phrase so
  // trailing prose ("— DONE S190, see...") doesn't dilute the match key.
  let t = raw.split(/[—.]/)[0];
  t = t.replace(/\s+/g, ' ').trim().toUpperCase();
  return t;
}

export function findDuplicates(text) {
  const lines = String(text || '').split('\n');
  const byTitle = new Map();

  for (const line of lines) {
    // Consolidated stubs intentionally preserve historical evidence while their
    // canonical survivor stays open. The explicit marker is machine authority
    // to exclude the stub from active duplicate analysis—not to erase its prose.
    if (/<!--\s*record-consolidation:\s*superseded-by\b/i.test(line)) continue;
    const m = LINE_RE.exec(line.trim());
    if (!m) continue;
    const state = m[1]; // ' ', 'x', or '~'
    const title = normalizeTitle(m[2]);
    if (!title || title.length < 6) continue; // skip near-empty/too-generic keys
    if (!byTitle.has(title)) byTitle.set(title, []);
    byTitle.get(title).push({ state, line: line.trim() });
  }

  const groups = [];
  for (const [title, entries] of byTitle) {
    if (entries.length < 2) continue;
    const hasDone = entries.some(e => e.state === 'x');
    const hasOpen = entries.some(e => e.state === ' ');
    groups.push({
      title,
      count: entries.length,
      hasDoneAndOpen: hasDone && hasOpen,
      entries,
    });
  }

  // Highest-signal first: a checked copy alongside an unchecked copy of the
  // identical title is the strongest match for the S251 class.
  groups.sort((a, b) => Number(b.hasDoneAndOpen) - Number(a.hasDoneAndOpen) || b.count - a.count);
  return groups;
}

function run() {
  const jsonOut = process.argv.includes('--json');
  const text = fs.readFileSync(TASKBOARD, 'utf8');
  const groups = findDuplicates(text);
  const strong = groups.filter(g => g.hasDoneAndOpen);

  if (jsonOut) {
    console.log(JSON.stringify({ ok: true, totalGroups: groups.length, strongSignal: strong.length, groups }, null, 2));
    process.exit(0);
  }

  if (!groups.length) {
    console.log('check-taskboard-duplicate-titles: no duplicate item titles found ✓');
    process.exit(0);
  }

  console.log(`check-taskboard-duplicate-titles: ${groups.length} duplicate title(s) · ${strong.length} with a [x]+[ ] mismatch (advisory only)`);
  for (const g of strong) {
    console.log(`  ⚠ "${g.title}" — ${g.count} copies, at least one already [x] done and one still [ ] open. Verify against live code before touching it.`);
  }
  for (const g of groups.filter(g => !g.hasDoneAndOpen)) {
    console.log(`  · "${g.title}" — ${g.count} copies, same open/checked state (likely independent proposals, lower priority)`);
  }
  console.log('(advisory — never blocks build:check; a duplicate title is a lead to verify, not proof of staleness)');
  process.exit(0);
}

function selfTest() {
  let fail = 0;
  const assert = (c, m) => { if (!c) { console.error('  ✗ ' + m); fail++; } };

  let g = findDuplicates([
    '- [x] **[S190][UX/P1] PROGRESSIVE-MEMBERSHIP-UNLOCK — DONE.** shipped.',
    '- [ ] **[S185][UX/P1] PROGRESSIVE-MEMBERSHIP-UNLOCK.** Deferred (8h).',
  ].join('\n'));
  assert(g.length === 1 && g[0].hasDoneAndOpen, 'detects a [x]+[ ] duplicate of the same title');

  g = findDuplicates([
    '- [ ] **[S180][SECURITY/P1] TT-ENFORCE-REPROBE.** now due.',
    '- [ ] **[S185][SECURITY/P1] TT-ENFORCE-REPROBE.** still due.',
  ].join('\n'));
  assert(g.length === 1 && !g[0].hasDoneAndOpen, 'two open copies of the same title is a lower-priority group, not strong signal');

  g = findDuplicates([
    '- [x] **[S1][X] Alpha task.** done.',
    '- [ ] **[S2][Y] Beta task.** open.',
  ].join('\n'));
  assert(g.length === 0, 'distinct titles never match');

  g = findDuplicates([
    '- [x] **[S1][X] Ask IGNIS public concierge** — done.',
    '- [ ] **[S2][Y] Ask IGNIS public concierge.** open, different session tag.',
    '- [ ] **[S3][Z] Ask IGNIS concierge** — different phrasing, no exact match.',
  ].join('\n'));
  assert(g.length === 1 && g[0].count === 2, 'exact-title matching is precise — near-miss phrasing does not merge groups (avoids fuzzy false positives)');

  g = findDuplicates('- [~] **[S1][X] Partial item.** partial state alone does not duplicate anything.\n');
  assert(g.length === 0, 'a lone partial-state line produces no group');

  g = findDuplicates('not a task line at all\n- also not one [ ] **missing bold close');
  assert(g.length === 0, 'malformed/non-matching lines are ignored, not miscounted');

  g = findDuplicates([
    '- [ ] **[S1][X] Canonical live item.** still open.',
    '- [x] **[S0][X] Canonical live item.** historical stub. <!-- record-consolidation: superseded-by S1-canonical -->',
  ].join('\n'));
  assert(g.length === 0, 'machine-marked consolidation stubs do not create false [x]+[ ] mismatches');

  if (fail === 0) { console.log('✓ check-taskboard-duplicate-titles --self-test: 7/7 passed'); process.exit(0); }
  console.error(`✗ check-taskboard-duplicate-titles --self-test: ${fail} failed`); process.exit(1);
}

const RUN_DIRECT = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('check-taskboard-duplicate-titles.mjs');
if (RUN_DIRECT) {
  if (process.argv.includes('--self-test')) selfTest();
  else run();
}
