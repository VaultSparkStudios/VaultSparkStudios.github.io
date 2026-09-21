#!/usr/bin/env node
/**
 * test-context-wipe-guard.mjs — S363.
 *
 * WHY THIS EXISTS. S363 changed `scripts/lib/context-wipe-guard.mjs` twice, and
 * both times the only evidence was a throwaway `node -e` check typed at the
 * terminal. That is not evidence anyone can re-run, and this guard is the last
 * thing standing between a bad write and a committed context wipe — the repo's
 * own discipline says a change like that gets pinned.
 *
 * The two changes, and the false verdicts they produced live:
 *
 *   1. `isGeneratedWiped` decided a GENERATED artifact was contentless unless it
 *      carried a generator stamp OR a structured entry, where "structured entry"
 *      accepted `^[✓⚠⛔]`. Its own comment described context/SIGNALS.md as "bare
 *      ✓/⚠⛔ rows". The file is box-drawn — `║  ✓  Tests  502/502` — so the glyph
 *      never appears at line start, no stamp exists either, and EVERY
 *      regeneration classified as a wipe. Measured: a refresh at 110% of HEAD
 *      (a file that GREW) aborted the closeout commit.
 *
 *   2. `archivedAppendOnlyPreserved` recognised relocated history only through
 *      `context/archive/<STEM>_S<a>-S<b>.md` files named by an in-file pointer.
 *      This repo's own `scripts/rotate-ledger.mjs` writes
 *      `context/archive/<TAG>_<YYYY>Q<q>.md` and writes no pointer — so the
 *      ledger size gate's PRESCRIBED repair produced a tree this guard rejected,
 *      leaving no correct move.
 *
 * Both fixes broadened only DISCOVERY and CLASSIFICATION. The substantive
 * guarantee — content that vanished, or was edited on its way to the archive,
 * still fails — is what most of these cases assert, because a guard that cannot
 * fail is worse than no guard.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { archivedAppendOnlyPreserved, isGeneratedWiped } from './lib/context-wipe-guard.mjs';

const results = [];
const check = (label, fn) => {
  try {
    fn();
    results.push([true, label]);
  } catch (error) {
    results.push([false, `${label} — ${error.message}`]);
  }
};

// ── 1. isGeneratedWiped: shape classification ───────────────────────────────

// The real artifact shape, verbatim from context/SIGNALS.md.
const BOXED_SIGNALS = [
  '╔══ SIGNALS ═════════════════════════════════════════════════════╗',
  '║  ✓  Tests         502/502 passing (2026-09-19)                   ║',
  '║  ⚠  Revenue sig.  9d old (2026-09-11)                            ║',
  '║  ⛔  Doctor        13/17 (76%)  ·  2 failing                      ║',
  '╚════════════════════════════════════════════════════════════════╝',
].join('\n');

check('THE LIVE FALSE POSITIVE: box-drawn status rows are content, not a wipe',
  () => assert.equal(isGeneratedWiped(BOXED_SIGNALS), false));

check('bare glyph rows still count as content (the original contract is kept)',
  () => assert.equal(isGeneratedWiped('✓ Tests 1/1 passing'), false));

check('a quoted/indented status row is content',
  () => assert.equal(isGeneratedWiped('>  ⚠  Doctor 13/17'), false));

// The guard must still FAIL. These are the cases the broadening must not swallow.
check('empty input is a wipe',
  () => assert.equal(isGeneratedWiped(''), true));

check('whitespace-only input is a wipe',
  () => assert.equal(isGeneratedWiped('   \n\t\n  '), true));

check('a box frame with no rows inside it is a wipe',
  () => assert.equal(isGeneratedWiped('╔══ SIGNALS ══╗\n╚═════════════╝'), true));

check('prose with no stamp and no structured entry is a wipe',
  () => assert.equal(isGeneratedWiped('this file used to have signals in it'), true));

check('a generator stamp alone is enough (markdown briefs carry no glyph rows)',
  () => assert.equal(isGeneratedWiped('<!-- generated-by: scripts/x.mjs -->\nnothing else'), false));

check('a markdown heading is still a structured entry',
  () => assert.equal(isGeneratedWiped('## Session 1\nbody'), false));

check('an empty JSON sidecar is a wipe, a populated one is not',
  () => {
    assert.equal(isGeneratedWiped('{}'), true);
    assert.equal(isGeneratedWiped('[]'), true);
    assert.equal(isGeneratedWiped('{"a":1}'), false);
  });

check('corrupt JSON is a wipe, never optimistically accepted',
  () => assert.equal(isGeneratedWiped('{"a":'), true));

// ── 2. archivedAppendOnlyPreserved: archive discovery + preservation proof ──

/** Build a throwaway repo: context/DECISIONS.md plus an archive directory. */
function fixture({ hotSections, archives = {}, stem = 'DECISIONS' }) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vs-wipe-guard-')));
  fs.mkdirSync(path.join(root, 'context', 'archive'), { recursive: true });
  const filePath = path.join(root, 'context', `${stem}.md`);
  fs.writeFileSync(filePath, hotSections, 'utf8');
  for (const [name, body] of Object.entries(archives)) {
    fs.writeFileSync(path.join(root, 'context', 'archive', name), body, 'utf8');
  }
  return { root, filePath, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

const SEC_A = '## D-1 — first\n\nbody one.';
const SEC_B = '## D-2 — second\n\nbody two.';
const SEC_C = '## D-3 — third\n\nbody three.';
const HEAD_ALL = [SEC_A, SEC_B, SEC_C].join('\n\n');

check('THE LIVE FALSE POSITIVE: a quarter-named archive with no pointer is accepted',
  () => {
    const f = fixture({
      hotSections: SEC_C,
      archives: { 'DECISIONS_2026Q3.md': `${SEC_A}\n\n${SEC_B}\n` },
    });
    try {
      assert.equal(
        archivedAppendOnlyPreserved(HEAD_ALL, SEC_C, { filePath: f.filePath, root: f.root }),
        true,
      );
    } finally { f.cleanup(); }
  });

check('content split across several quarter archives is accepted',
  () => {
    const f = fixture({
      hotSections: SEC_C,
      archives: { 'DECISIONS_2026Q2.md': `${SEC_A}\n`, 'DECISIONS_2026Q3.md': `${SEC_B}\n` },
    });
    try {
      assert.equal(
        archivedAppendOnlyPreserved(HEAD_ALL, SEC_C, { filePath: f.filePath, root: f.root }),
        true,
      );
    } finally { f.cleanup(); }
  });

check('the SIL archive stem is recognised for SELF_IMPROVEMENT_LOOP.md',
  () => {
    const f = fixture({
      hotSections: SEC_C,
      archives: { 'SIL_2026Q3.md': `${SEC_A}\n\n${SEC_B}\n` },
      stem: 'SELF_IMPROVEMENT_LOOP',
    });
    try {
      assert.equal(
        archivedAppendOnlyPreserved(HEAD_ALL, SEC_C, { filePath: f.filePath, root: f.root }),
        true,
      );
    } finally { f.cleanup(); }
  });

// ── The guarantee. Broadening discovery must not weaken any of these. ────────

check('THE MUTE-BUTTON GUARD: a section in neither the hot file nor an archive FAILS',
  () => {
    const f = fixture({
      hotSections: SEC_C,
      archives: { 'DECISIONS_2026Q3.md': `${SEC_A}\n` },   // SEC_B simply vanished
    });
    try {
      assert.equal(
        archivedAppendOnlyPreserved(HEAD_ALL, SEC_C, { filePath: f.filePath, root: f.root }),
        false,
      );
    } finally { f.cleanup(); }
  });

check('a section EDITED on its way to the archive fails',
  () => {
    const f = fixture({
      hotSections: SEC_C,
      archives: { 'DECISIONS_2026Q3.md': `${SEC_A}\n\n${SEC_B.replace('body two', 'body TWO')}\n` },
    });
    try {
      assert.equal(
        archivedAppendOnlyPreserved(HEAD_ALL, SEC_C, { filePath: f.filePath, root: f.root }),
        false,
      );
    } finally { f.cleanup(); }
  });

check('an empty archive directory is not a pass',
  () => {
    const f = fixture({ hotSections: SEC_C, archives: {} });
    try {
      assert.equal(
        archivedAppendOnlyPreserved(HEAD_ALL, SEC_C, { filePath: f.filePath, root: f.root }),
        false,
      );
    } finally { f.cleanup(); }
  });

check('an unrecognised archive filename is not consulted',
  () => {
    const f = fixture({
      hotSections: SEC_C,
      archives: { 'DECISIONS_backup.md': `${SEC_A}\n\n${SEC_B}\n` },
    });
    try {
      assert.equal(
        archivedAppendOnlyPreserved(HEAD_ALL, SEC_C, { filePath: f.filePath, root: f.root }),
        false,
      );
    } finally { f.cleanup(); }
  });

check('another document\'s archive cannot satisfy this one',
  () => {
    const f = fixture({
      hotSections: SEC_C,
      archives: { 'SIL_2026Q3.md': `${SEC_A}\n\n${SEC_B}\n` },   // wrong stem for DECISIONS.md
    });
    try {
      assert.equal(
        archivedAppendOnlyPreserved(HEAD_ALL, SEC_C, { filePath: f.filePath, root: f.root }),
        false,
      );
    } finally { f.cleanup(); }
  });

check('a file outside context/DECISIONS|SELF_IMPROVEMENT_LOOP is never handled here',
  () => {
    const f = fixture({ hotSections: SEC_C, archives: { 'DECISIONS_2026Q3.md': `${SEC_A}\n${SEC_B}\n` } });
    try {
      const other = path.join(f.root, 'context', 'CURRENT_STATE.md');
      assert.equal(archivedAppendOnlyPreserved(HEAD_ALL, SEC_C, { filePath: other, root: f.root }), false);
    } finally { f.cleanup(); }
  });

check('nothing removed at all is accepted (a pure append)',
  () => {
    const f = fixture({ hotSections: `${HEAD_ALL}\n\n## D-4 — new\n\nbody four.`, archives: {} });
    try {
      assert.equal(
        archivedAppendOnlyPreserved(HEAD_ALL, fs.readFileSync(f.filePath, 'utf8'), { filePath: f.filePath, root: f.root }),
        // No archive exists and none is needed, but this helper requires archive
        // evidence by design — the plain appendOnlyPreserved path covers appends.
        false,
      );
    } finally { f.cleanup(); }
  });

// ── Report ──────────────────────────────────────────────────────────────────

for (const [ok, label] of results) console.log(`  ${ok ? 'ok' : 'FAIL'} ${label}`);
const failed = results.filter(([ok]) => !ok);
console.log(`test-context-wipe-guard: ${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
