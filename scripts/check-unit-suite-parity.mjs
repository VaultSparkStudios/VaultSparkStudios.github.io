#!/usr/bin/env node
/* check-unit-suite-parity.mjs — S352

   THE BUG THIS EXISTS TO PREVENT.

   S351 found `npm run test:unit` declaring five unit spec files while
   `build:check:steps` executed two of them, and `test:unit` itself invoked by
   no runner anywhere. Three suites (16 tests) were therefore gated by nothing.
   They happened to pass, and the lists were reconciled by hand. Nothing compared
   the lists, so the next spec added to one of them can go missing from the other
   the same way.

   THE RULE. Three sets must be equal:
     1. DECLARED — the specs named in package.json `test:unit`
     2. EXECUTED — the specs named by every `node --test` in `build:check:steps`
     3. TRACKED  — the git-tracked `tests/*.unit.spec.js` files
   A tracked unit spec that neither list names has never run. A declared spec
   the gate does not execute passes only when a person remembers to run it.

   Usage:
     node scripts/check-unit-suite-parity.mjs
     node scripts/check-unit-suite-parity.mjs --self-test
*/
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from './lib/safe-spawn.mjs';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPEC_RE = /^tests\/[\w./-]+\.unit\.spec\.m?js$/;

/** Every spec path passed to `node --test` in a shell command string. */
export function nodeTestSpecs(command = '') {
  const specs = [];
  for (const segment of String(command).split(/&&|\|\||;/)) {
    const tokens = segment.trim().split(/\s+/);
    const at = tokens.findIndex((t, i) => t === '--test' && tokens[i - 1] === 'node');
    if (at === -1) continue;
    for (const token of tokens.slice(at + 1)) {
      if (token.startsWith('-')) continue; // node --test flags, e.g. --test-reporter
      if (SPEC_RE.test(token)) specs.push(token);
    }
  }
  return specs;
}

/** Pure comparison of the three sets. Returns named, human-readable violations. */
export function evaluateParity({ declared = [], executed = [], tracked = [] } = {}) {
  const d = new Set(declared);
  const e = new Set(executed);
  const t = new Set(tracked);
  const violations = [];
  if (!e.size) violations.push('build:check:steps runs no `node --test` unit specs at all');
  for (const s of d) if (!e.has(s)) violations.push(`${s} is declared in test:unit but build:check never executes it`);
  for (const s of e) if (!d.has(s)) violations.push(`${s} is executed by build:check but missing from test:unit`);
  for (const s of t) if (!d.has(s) && !e.has(s)) violations.push(`${s} is tracked but named by neither list, so it has never run`);
  for (const s of new Set([...d, ...e])) if (!t.has(s)) violations.push(`${s} is named but is not a tracked file`);
  return { ok: violations.length === 0, violations };
}

export function trackedUnitSpecs(root = ROOT) {
  const res = spawnSync('git', ['ls-files', 'tests/'], { cwd: root, encoding: 'utf8', windowsHide: true });
  if (res.status !== 0) return null;
  return res.stdout.split(/\r?\n/).map((l) => l.trim()).filter((l) => SPEC_RE.test(l));
}

function run() {
  const scripts = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts || {};
  const tracked = trackedUnitSpecs();
  if (tracked === null) {
    // Unreadable git index = UNMEASURED, never a pass.
    console.error('check-unit-suite-parity: UNMEASURED — git ls-files failed, tracked specs unknown');
    process.exit(3);
  }
  const declared = nodeTestSpecs(scripts['test:unit']);
  const executed = nodeTestSpecs(scripts['build:check:steps']);
  const { ok, violations } = evaluateParity({ declared, executed, tracked });
  if (!ok) {
    console.error('check-unit-suite-parity: FAIL');
    for (const v of violations) console.error(`  ✗ ${v}`);
    console.error('  fix: name every tests/*.unit.spec.js in BOTH `test:unit` and the build:check `node --test` step.');
    process.exit(1);
  }
  console.log(`check-unit-suite-parity: ${declared.length} declared = ${executed.length} executed = ${tracked.length} tracked`);
}

function selfTest() {
  const five = ['tests/a.unit.spec.js', 'tests/b.unit.spec.js', 'tests/c.unit.spec.js', 'tests/d.unit.spec.js', 'tests/e.unit.spec.js'];
  const cases = [
    ['identical sets pass',
      () => evaluateParity({ declared: five, executed: five, tracked: five }).ok === true],
    // The S351 shape: five declared, two executed. It must fail and name all three.
    ['the S351 shape (5 declared, 2 executed) fails naming each missing suite',
      () => {
        const r = evaluateParity({ declared: five, executed: five.slice(0, 2), tracked: five });
        return r.ok === false && five.slice(2).every((s) => r.violations.some((v) => v.startsWith(s)));
      }],
    ['a tracked spec named by neither list fails',
      () => evaluateParity({ declared: five.slice(0, 4), executed: five.slice(0, 4), tracked: five }).violations
        .some((v) => v.startsWith('tests/e.unit.spec.js') && v.includes('never run'))],
    ['a spec executed but not declared fails',
      () => evaluateParity({ declared: five.slice(0, 4), executed: five, tracked: five }).violations
        .some((v) => v.includes('missing from test:unit'))],
    ['a named spec that is not tracked fails',
      () => evaluateParity({ declared: [...five, 'tests/ghost.unit.spec.js'], executed: [...five, 'tests/ghost.unit.spec.js'], tracked: five }).ok === false],
    ['zero executed specs is a failure, not a vacuous pass',
      () => evaluateParity({ declared: [], executed: [], tracked: [] }).ok === false],
    ['extracts specs from a real-shaped chain and stops at the next command',
      () => {
        const chain = 'node scripts/lint-repo.mjs && node --test tests/a.unit.spec.js tests/b.unit.spec.js && node scripts/validate-contracts.mjs --check';
        const got = nodeTestSpecs(chain);
        return got.length === 2 && got[0] === 'tests/a.unit.spec.js' && got[1] === 'tests/b.unit.spec.js';
      }],
    ['collects specs across more than one node --test invocation',
      () => nodeTestSpecs('node --test tests/a.unit.spec.js && node x.mjs && node --test --test-reporter=dot tests/b.unit.spec.js').length === 2],
    ['a playwright spec is not mistaken for a unit spec',
      () => nodeTestSpecs('node --test tests/smoke.spec.js tests/a.unit.spec.js').join() === 'tests/a.unit.spec.js'],
  ];
  let failed = 0;
  for (const [name, fn] of cases) {
    let pass = false;
    try { pass = fn() === true; } catch { pass = false; }
    if (!pass) failed++;
    console.log(`  ${pass ? 'ok' : 'FAIL'} ${name}`);
  }
  console.log(`check-unit-suite-parity --self-test: ${cases.length - failed}/${cases.length} passed`);
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--self-test')) selfTest();
  else run();
}
