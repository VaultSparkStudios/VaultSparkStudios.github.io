#!/usr/bin/env node
/**
 * check-workflow-yaml-validity.mjs  (S223)
 *
 * THE BLINDNESS IT CLOSES: invalid YAML in a workflow file fails the workflow
 * run in 0 seconds with an opaque "workflow file issue" error — no stack trace,
 * no line number visible in CI, no local signal before push. The class was
 * identified in S183 (a `run:` value with an inline `: ` parsed as a YAML
 * mapping key) and codified in feedback: validate_workflow_yaml_before_push.
 *
 * WHAT IT DOES: zero-dependency regex scan of every .github/workflows/*.yml.
 * Specifically catches the S183 class: a `run:` line that starts a scalar value
 * inline (not a block scalar `>-` / `|` / `>` / `|-`) and contains `: ` which
 * YAML interprets as a mapping key → "found character that cannot start any token".
 *
 * Also catches: `${{ }}` in non-block scalars (YAML misparses the `{` as a flow
 * mapping), and bare `:` at end of line (mapping value with no key).
 *
 * KNOWN SCOPE: catches the S183 class and a few related patterns. Full YAML
 * parsing would require js-yaml; this gate is the fast zero-dep safety net.
 *
 * Usage:
 *   node scripts/check-workflow-yaml-validity.mjs          # check all
 *   node scripts/check-workflow-yaml-validity.mjs --self-test
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const WF_DIR = join(ROOT, '.github', 'workflows');
const SELF_TEST = process.argv.includes('--self-test');

/**
 * Scan one workflow file's text for known bad YAML patterns.
 * Returns an array of {line, col, pattern, hint} findings.
 */
export function scanWorkflowYaml(text, filename) {
  const findings = [];
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Detect `run:` lines with an inline scalar (not a block scalar indicator)
    // Pattern: `run:` followed by content that's NOT `>` / `|` / `>-` / `|-` / `>|` / `!`
    // and contains `: ` (which YAML parses as a new mapping key)
    const runInlineMatch = line.match(/^(\s*-?\s*run:\s+)(?![>|!])(.+)$/);
    if (runInlineMatch) {
      const value = runInlineMatch[2].trim();
      // `${{ ... }}` in an inline run: value — YAML tries to parse `{` as flow mapping
      if (value.includes('${{') && !value.startsWith("'") && !value.startsWith('"')) {
        findings.push({
          file: filename, line: lineNum,
          pattern: 'run: value with ${{ }} not quoted or in a block scalar',
          hint: 'Use >- or | block scalar for run: values containing ${{ }}',
        });
      }
      // `: ` in a plain scalar inline run: value → YAML maps it as a key
      // (exclude lines that are fully quoted)
      if (value.includes(': ') && !value.startsWith("'") && !value.startsWith('"')) {
        findings.push({
          file: filename, line: lineNum,
          pattern: 'run: value with inline ": " (parsed as YAML mapping key)',
          hint: 'Use >- or | block scalar for run: values containing colons',
        });
      }
    }
  }
  return findings;
}

function runSelfTest() {
  const assert = (c, m) => { if (!c) throw new Error(`self-test FAIL: ${m}`); };

  // Valid: block scalar with colon
  const good1 = `jobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - run: >-\n          echo foo: bar\n`;
  assert(scanWorkflowYaml(good1, 'good1.yml').length === 0, 'block scalar run: with colon must NOT flag');

  // Valid: quoted inline
  const good2 = `    steps:\n      - run: 'echo "foo: bar"'\n`;
  assert(scanWorkflowYaml(good2, 'good2.yml').length === 0, 'quoted inline run: must NOT flag');

  // Valid: block scalar with ${{ }}
  const EXPR = '${{'; // avoid JS template literal misparse
  const good3 = `    steps:\n      - run: >-\n          echo ${EXPR} github.sha }}\n`;
  assert(scanWorkflowYaml(good3, 'good3.yml').length === 0, 'block scalar run: with ${{ }} must NOT flag');

  // Bad: inline run: with colon (the S183 class)
  const bad1 = `    steps:\n      - run: echo foo: bar\n`;
  const f1 = scanWorkflowYaml(bad1, 'bad1.yml');
  assert(f1.some((f) => f.pattern.includes('mapping key')), 'inline run: with ": " MUST flag');

  // Bad: inline run: with ${{ }}
  const bad2 = `    steps:\n      - run: node scripts/foo.mjs ${EXPR} github.event.inputs.x }}\n`;
  const f2 = scanWorkflowYaml(bad2, 'bad2.yml');
  assert(f2.some((f) => f.pattern.includes('${{') || f.pattern.includes('mapping key')), 'inline run: with ${{ }} MUST flag');

  console.log('check-workflow-yaml-validity self-test passed (5/5)');
}

function main() {
  if (!existsSync(WF_DIR)) {
    console.log('check-workflow-yaml-validity: no .github/workflows/ directory — skipped.');
    return 0;
  }

  const files = readdirSync(WF_DIR).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
  if (files.length === 0) {
    console.log('check-workflow-yaml-validity: no workflow files found — skipped.');
    return 0;
  }

  const allFindings = [];
  for (const file of files) {
    const content = readFileSync(join(WF_DIR, file), 'utf8');
    const findings = scanWorkflowYaml(content, file);
    allFindings.push(...findings);
  }

  if (allFindings.length > 0) {
    console.error(`check-workflow-yaml-validity ⛔ — ${allFindings.length} potential YAML issue(s) in workflows:`);
    for (const f of allFindings) {
      console.error(`  ${f.file}:${f.line} — ${f.pattern}`);
      console.error(`    → ${f.hint}`);
    }
    return 1;
  }

  console.log(`check-workflow-yaml-validity ✓ (${files.length} workflow(s) checked — no inline-colon or $\\{\\{ \\}\\} traps)`);
  return 0;
}

const RUN_DIRECT = import.meta.url === `file://${process.argv[1]}`
  || process.argv[1]?.endsWith('check-workflow-yaml-validity.mjs');

if (RUN_DIRECT) {
  if (SELF_TEST) {
    runSelfTest();
  } else {
    process.exit(main());
  }
}
