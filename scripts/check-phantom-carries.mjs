#!/usr/bin/env node
/* check-phantom-carries.mjs — S249 decided-phantom registry validator.

   The genius-list generator (generate-genius-list.mjs) suppresses carries whose
   premise a DECISIONS.md entry REVERSED, via context/PHANTOM_CARRIES.json. That
   suppression is only safe if it stays DECISION-BACKED: every phantom's
   `supersededBy` id must actually be present in DECISIONS.md, or the entry is inert
   (silently suppresses nothing) — worse, a typo'd id could let a real carry hide.
   This gate enforces the invariant + flags dead entries (a `match` that no longer
   appears anywhere, i.e. the carry stopped surfacing → the entry can retire).

   Exit 0 = registry healthy · 1 = a phantom's supersededBy is missing from
   DECISIONS.md (inert/unsafe entry) or a regex is invalid. Dead-entry = WARN (0).

   Usage:
     node scripts/check-phantom-carries.mjs
     node scripts/check-phantom-carries.mjs --json
     node scripts/check-phantom-carries.mjs --self-test
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = path.join(ROOT, 'context', 'PHANTOM_CARRIES.json');
const DECISIONS = path.join(ROOT, 'context', 'DECISIONS.md');
const TASKBOARD = path.join(ROOT, 'context', 'TASK_BOARD.md');

function readText(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }
function readJson(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }

export function validate({ registry, decisions, taskboard }) {
  const errors = [];
  const warnings = [];
  const phantoms = Array.isArray(registry?.phantoms) ? registry.phantoms : [];
  const seenKeys = new Set();

  for (const p of phantoms) {
    const id = p?.key || '(no key)';
    if (!p?.key) errors.push('a phantom entry is missing `key`');
    else if (seenKeys.has(p.key)) errors.push(`duplicate phantom key: ${p.key}`);
    else seenKeys.add(p.key);
    if (!p?.match) { errors.push(`${id}: missing \`match\` pattern`); continue; }
    if (!p?.supersededBy) { errors.push(`${id}: missing \`supersededBy\` decision id`); continue; }
    if (!p?.reason) warnings.push(`${id}: missing \`reason\` (recommended for provenance)`);

    // regex validity
    let re, reqRe = null;
    try { re = new RegExp(p.match, 'i'); }
    catch (e) { errors.push(`${id}: invalid \`match\` regex — ${e.message}`); continue; }
    if (p.requires) {
      try { reqRe = new RegExp(p.requires, 'i'); }
      catch (e) { errors.push(`${id}: invalid \`requires\` regex — ${e.message}`); continue; }
    }

    // DECISION-BACKED invariant: the superseding decision MUST exist in DECISIONS.md.
    if (!decisions.includes(p.supersededBy)) {
      errors.push(`${id}: supersededBy "${p.supersededBy}" not found in DECISIONS.md — the suppressor would be inert or, worse, could hide a live carry. Fix the id or remove the entry.`);
    }

    // Dead-entry hygiene: if the phantom no longer matches anything in TASK_BOARD,
    // the carry has stopped surfacing and the entry can eventually retire (advisory).
    if (taskboard && re.test(taskboard) === false && (!reqRe || true)) {
      warnings.push(`${id}: \`match\` no longer appears in TASK_BOARD — retire the entry once the carry is confirmed gone (advisory).`);
    }
  }

  return { ok: errors.length === 0, count: phantoms.length, errors, warnings };
}

function run() {
  const jsonOut = process.argv.includes('--json');
  const registry = readJson(REGISTRY, null);
  if (!registry) {
    // No registry = nothing to enforce (feature is opt-in). Clean.
    if (jsonOut) console.log(JSON.stringify({ ok: true, count: 0, note: 'no PHANTOM_CARRIES.json' }));
    else console.log('check-phantom-carries: no registry (context/PHANTOM_CARRIES.json) — nothing to validate.');
    process.exit(0);
  }
  const res = validate({ registry, decisions: readText(DECISIONS), taskboard: readText(TASKBOARD) });
  if (jsonOut) { console.log(JSON.stringify(res, null, 2)); process.exit(res.ok ? 0 : 1); }

  console.log(`check-phantom-carries: ${res.count} phantom(s) · ${res.errors.length} error(s) · ${res.warnings.length} warning(s)`);
  for (const w of res.warnings) console.log(`  ⚠ ${w}`);
  for (const e of res.errors) console.error(`  ✗ ${e}`);
  console.log(res.ok ? '✓ phantom registry is decision-backed and valid.' : '✗ phantom registry has unsafe entries.');
  process.exit(res.ok ? 0 : 1);
}

function selfTest() {
  let fail = 0;
  const assert = (c, m) => { if (!c) { console.error('  ✗ ' + m); fail++; } };

  // Healthy: decision present → no errors.
  let r = validate({
    registry: { phantoms: [{ key: 'k1', match: 'forge window', requires: 'propagat', supersededBy: 'D-S218.4', reason: 'x' }] },
    decisions: 'blah D-S218.4 blah',
    taskboard: '- [ ] finish forge window propagation',
  });
  assert(r.ok && r.errors.length === 0, 'healthy decision-backed entry passes');
  assert(r.warnings.length === 0, 'matching taskboard entry produces no dead-entry warning');

  // Unsafe: supersededBy missing from DECISIONS → error (the core invariant).
  r = validate({
    registry: { phantoms: [{ key: 'k1', match: 'forge window', supersededBy: 'D-S999.9', reason: 'x' }] },
    decisions: 'no such decision here',
    taskboard: 'forge window',
  });
  assert(!r.ok && r.errors.some(e => /not found in DECISIONS/.test(e)), 'missing supersededBy decision is a hard error');

  // Invalid regex → error.
  r = validate({
    registry: { phantoms: [{ key: 'k1', match: '(', supersededBy: 'D-S1.1', reason: 'x' }] },
    decisions: 'D-S1.1',
    taskboard: '',
  });
  assert(!r.ok && r.errors.some(e => /invalid `match` regex/.test(e)), 'invalid regex is a hard error');

  // Dead entry: decision present but no taskboard match → WARN, still ok.
  r = validate({
    registry: { phantoms: [{ key: 'k1', match: 'zzz-gone', supersededBy: 'D-S1.1', reason: 'x' }] },
    decisions: 'D-S1.1',
    taskboard: 'nothing relevant',
  });
  assert(r.ok && r.warnings.some(w => /retire the entry/.test(w)), 'dead entry warns but does not fail');

  // Duplicate key → error.
  r = validate({
    registry: { phantoms: [
      { key: 'dup', match: 'a', supersededBy: 'D-S1.1', reason: 'x' },
      { key: 'dup', match: 'b', supersededBy: 'D-S1.1', reason: 'x' },
    ] },
    decisions: 'D-S1.1',
    taskboard: 'a b',
  });
  assert(!r.ok && r.errors.some(e => /duplicate phantom key/.test(e)), 'duplicate key is a hard error');

  if (fail === 0) { console.log('✓ check-phantom-carries --self-test: 6/6 passed'); process.exit(0); }
  console.error(`✗ check-phantom-carries --self-test: ${fail} failed`); process.exit(1);
}

const RUN_DIRECT = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('check-phantom-carries.mjs');
if (RUN_DIRECT) {
  if (process.argv.includes('--self-test')) selfTest();
  else run();
}
