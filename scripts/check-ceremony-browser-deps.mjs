#!/usr/bin/env node
/**
 * check-ceremony-browser-deps.mjs — S319.
 *
 * THE DEFECT THIS CLOSES. Four workflows invoke the canonical release ceremony,
 * and the ceremony runs a Playwright browser suite. All four installed npm
 * packages and no browser binaries. The ceremony therefore failed in seconds
 * with nothing to launch, and wrote a REJECTED receipt — which reads as "the
 * site failed its quality gate", not "the dependency was never installed". No
 * production promotion through any of those workflows could ever have cleared,
 * and the real cause was invisible because the ceremony discards subprocess
 * output by contract.
 *
 * One of the steps was even NAMED "Install release-ceremony browser
 * dependencies" while installing no browsers — the name asserted a capability
 * the body did not deliver.
 *
 * So this is a structural gate, not four point fixes: any workflow that runs the
 * ceremony must also install browsers, forever.
 *
 * Modes: (default) check · --json · --self-test
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOW_DIR = path.join(ROOT, '.github', 'workflows');

export const CEREMONY_INVOCATION = /run-release-ceremony\.mjs/;
export const BROWSER_INSTALL = /playwright\s+install/;

/**
 * @returns {{workflow:string, runsCeremony:boolean, installsBrowsers:boolean}[]}
 */
export function auditWorkflows(sources) {
  return Object.entries(sources || {}).map(([workflow, source]) => ({
    workflow,
    runsCeremony: CEREMONY_INVOCATION.test(source),
    installsBrowsers: BROWSER_INSTALL.test(source),
  }));
}

export function violations(rows) {
  return rows
    .filter((row) => row.runsCeremony && !row.installsBrowsers)
    .map((row) => `${row.workflow}: runs the release ceremony (a browser suite) but never installs Playwright browsers — the gate will fail in seconds and report a quality failure`);
}

function readWorkflows() {
  const sources = {};
  if (!fs.existsSync(WORKFLOW_DIR)) return sources;
  for (const file of fs.readdirSync(WORKFLOW_DIR).filter((f) => /\.ya?ml$/.test(f))) {
    sources[file] = fs.readFileSync(path.join(WORKFLOW_DIR, file), 'utf8');
  }
  return sources;
}

function selfTest() {
  const cases = [];
  const add = (name, ok) => cases.push([name, ok]);

  const good = { 'a.yml': 'run: |\n  npm install\n  npx playwright install --with-deps chromium\nrun: node scripts/run-release-ceremony.mjs --ci' };
  const bad = { 'b.yml': 'run: npm install --no-audit\nrun: node scripts/run-release-ceremony.mjs --ci' };
  const unrelated = { 'c.yml': 'run: npm install --no-audit\nrun: node scripts/build-citation.mjs' };

  add('a ceremony workflow with browsers passes', violations(auditWorkflows(good)).length === 0);
  add('a ceremony workflow without browsers is flagged', violations(auditWorkflows(bad)).length === 1);
  add('the violation names the workflow', violations(auditWorkflows(bad))[0].startsWith('b.yml'));
  add('a workflow that does not run the ceremony is ignored', violations(auditWorkflows(unrelated)).length === 0);
  add('a ceremony invocation is detected', CEREMONY_INVOCATION.test('node scripts/run-release-ceremony.mjs --ci'));
  add('an unrelated script is not mistaken for the ceremony', !CEREMONY_INVOCATION.test('node scripts/run-staging-release-gate.mjs'));
  add('both install spellings are accepted', BROWSER_INSTALL.test('npx playwright install --with-deps') && BROWSER_INSTALL.test('playwright install chromium'));
  const ceremonySource = fs.readFileSync(path.join(ROOT, 'scripts', 'run-release-ceremony.mjs'), 'utf8');
  const attentionRunner = fs.readFileSync(path.join(ROOT, 'scripts', 'run-attention-release-gate.mjs'), 'utf8');
  add('the ceremony executes the attention browser gate', ceremonySource.includes("runScript('attention-browser'"));
  add('the ceremony validates the public attention receipt', ceremonySource.includes("'api/staging-attention-browser.json'"));
  add('the attention runner is pinned to 15 cases', attentionRunner.includes('const EXPECTED_TESTS = 15'));

  // The live tree must be clean — this gate exists because it was not.
  const live = violations(auditWorkflows(readWorkflows()));
  add('every live ceremony workflow installs browsers', live.length === 0);
  if (live.length) for (const v of live) console.error(`  ⛔ ${v}`);

  // And it must actually be watching something: if no workflow runs the
  // ceremony, this gate is vacuously green and should say so loudly.
  const ceremonyCount = auditWorkflows(readWorkflows()).filter((r) => r.runsCeremony).length;
  add('the gate is watching at least one real ceremony workflow', ceremonyCount > 0);

  for (const [name, ok] of cases) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (cases.some(([, ok]) => !ok)) process.exit(1);
  console.log(`ceremony-browser-deps self-test: ${cases.length}/${cases.length}`);
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const rows = auditWorkflows(readWorkflows());
  const bad = violations(rows);
  const watched = rows.filter((r) => r.runsCeremony).length;
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ ok: bad.length === 0, watched, violations: bad }, null, 2));
  } else if (bad.length) {
    console.error(`check-ceremony-browser-deps: ${bad.length} workflow(s) run the ceremony without browsers`);
    for (const v of bad) console.error(`  ⛔ ${v}`);
  } else {
    console.log(`check-ceremony-browser-deps: ok (${watched} ceremony workflow(s), all install browsers)`);
  }
  if (bad.length) process.exitCode = 1;
}

if (process.argv[1]?.endsWith('check-ceremony-browser-deps.mjs')) main();
