#!/usr/bin/env node
/* check-workflow-step-guards.mjs — S344

   THE BUG THIS EXISTS TO PREVENT.

   `.github/workflows/news-publish.yml` chained its steps like this:

       - id: author
         if: steps.prepare.outputs.status == '0'

   A step that is SKIPPED writes nothing to $GITHUB_OUTPUT, so the expression
   compares the empty string to '0'. GitHub Actions coerces both to a number and
   evaluates that TRUE. The guard therefore cannot tell "the upstream step
   succeeded" from "the upstream step never ran".

   Observed live in run 34063581495: `prepare` exited 1, `author` was correctly
   skipped, and then the art renderer, the full Desk rebuild, the editorial
   gates and the public-feed cascade ALL RAN — four guards deep, on a slot that
   had drafted nothing. The only two things that stopped an unattended
   `git commit` + push of a non-edition were an unhandled ENOENT crash and a
   cadence gate failing one step earlier. Both looked like ordinary bugs; fixing
   either one alone would have opened the publish path.

   THE RULE. A guard must compare against a value the empty string cannot
   impersonate. Numeric-looking literals ('0', "1", 0) are banned in
   `steps.*.outputs.*` comparisons; use a non-numeric sentinel (ok=yes / ok=no).

   Usage:
     node scripts/check-workflow-step-guards.mjs
     node scripts/check-workflow-step-guards.mjs --self-test
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WF_DIR = path.join(ROOT, '.github', 'workflows');

// A comparison of `steps.<id>.outputs.<key>` against a bare numeric literal,
// quoted or not, in either operand order. Deliberately regex over the raw text
// rather than a YAML parse: `if:` values are expression strings either way, and
// this must run with no dependency in any repo that copies it.
const OUTPUT_REF = String.raw`steps\.[A-Za-z0-9_-]+\.outputs\.[A-Za-z0-9_-]+`;
const NUM_LIT = String.raw`(?:'\s*-?\d+(?:\.\d+)?\s*'|"\s*-?\d+(?:\.\d+)?\s*"|-?\d+(?:\.\d+)?)`;
const BAD = new RegExp(
  `(?:${OUTPUT_REF}\\s*[!=]=\\s*${NUM_LIT}|${NUM_LIT}\\s*[!=]=\\s*${OUTPUT_REF})`,
  'g',
);

/** Find every offending comparison in one workflow's text. */
export function findNumericOutputGuards(text) {
  const findings = [];
  text.split(/\r?\n/).forEach((line, i) => {
    // Only `if:` conditions gate step execution. A numeric output comparison
    // inside a `run:` block is ordinary shell and is none of this gate's business.
    if (!/^\s*(?:-\s+)?if\s*:/.test(line)) return;
    const hits = line.match(BAD);
    if (hits) findings.push({ line: i + 1, text: line.trim(), matches: hits });
  });
  return findings;
}

function selfTest() {
  const cases = [
    ['the exact S344 bug is caught',
      `      - name: x\n        if: steps.prepare.outputs.status == '0'\n`, 1],
    ['double-quoted numeric literal is caught',
      `        if: steps.author.outputs.status == "1"\n`, 1],
    ['unquoted numeric literal is caught',
      `        if: steps.art.outputs.status == 0\n`, 1],
    ['reversed operand order is caught',
      `        if: '0' == steps.promote.outputs.status\n`, 1],
    ['inequality against a numeric literal is caught',
      `        if: steps.promote.outputs.status != '0'\n`, 1],
    ['the sentinel form is allowed',
      `        if: steps.prepare.outputs.ok == 'yes'\n`, 0],
    ['a non-numeric string comparison is allowed',
      `        if: steps.slot.outputs.edition == 'wire'\n`, 0],
    ['success()/failure() guards are allowed',
      `        if: always()\n`, 0],
    ['a numeric comparison in a run block is NOT a step guard',
      `        run: |\n          if [ "$status" == "0" ]; then echo steps.x.outputs.status == '0'; fi\n`, 0],
    ['github.event_name comparisons are untouched',
      `        if: github.event_name == 'schedule'\n`, 0],
  ];
  let pass = 0;
  for (const [name, text, expected] of cases) {
    const got = findNumericOutputGuards(text).length;
    const ok = got === expected;
    if (ok) pass += 1;
    else console.error(`  ✗ ${name} — expected ${expected}, got ${got}`);
  }
  console.log(`check-workflow-step-guards --self-test: ${pass}/${cases.length} passed`);
  if (pass !== cases.length) process.exit(1);
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  if (!fs.existsSync(WF_DIR)) {
    console.log('check-workflow-step-guards: no .github/workflows — nothing to check');
    return;
  }
  const files = fs.readdirSync(WF_DIR).filter((f) => /\.ya?ml$/.test(f)).sort();
  let bad = 0;
  for (const file of files) {
    const findings = findNumericOutputGuards(fs.readFileSync(path.join(WF_DIR, file), 'utf8'));
    for (const f of findings) {
      bad += 1;
      console.error(`✗ ${file}:${f.line} — step guard compares a step output to a numeric literal`);
      console.error(`    ${f.text}`);
    }
  }
  if (bad) {
    console.error('');
    console.error(`${bad} guard(s) cannot distinguish "succeeded" from "never ran": a SKIPPED step`);
    console.error('writes an empty output, and GitHub coerces "" and "0" to the same number, so the');
    console.error('guard passes for a step that never executed. Emit a non-numeric sentinel instead');
    console.error('(ok=yes / ok=no) and compare against that — nothing coerces into "yes".');
    process.exit(1);
  }
  console.log(`check-workflow-step-guards ✓ (${files.length} workflow(s) — no step guard compares an output to a numeric literal)`);
}

// Import-safe: a test or a sibling gate that imports findNumericOutputGuards
// must not trigger a full workflow scan (and its process.exit) as a side effect.
const RUN_DIRECT = import.meta.main
  ?? process.argv[1]?.endsWith('check-workflow-step-guards.mjs');
if (RUN_DIRECT) main();
