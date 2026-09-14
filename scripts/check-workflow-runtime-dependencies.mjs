#!/usr/bin/env node
/**
 * check-workflow-runtime-dependencies.mjs  (S353)
 *
 * A workflow job that runs a script needing a declared npm package must install
 * dependencies first. Otherwise the import throws on the runner and nowhere else,
 * because every developer tree already has node_modules.
 *
 * WHY THIS EXISTS. `vault-narrative.yml` never installed anything. Its
 * `run-derived-builds --profile refresh-live-data` step reaches
 * `build-news-desk.mjs --rebuild`, which does `await import('sharp')`. The
 * import failed, the profile reported `build-news-desk.mjs:warn`, and the
 * workflow went red on 2026-09-10 and stayed red, committing nothing for four
 * days. `check-workflow-install-consistency` passed the whole time: it forbids
 * `npm ci` and `cache: npm`, but it never asks whether an install is NEEDED.
 * A naive "does the workflow file name a package-importing script" scan also
 * passes, because the importing script is only reachable through a helper
 * profile. So this gate follows the same indirections the runner does:
 *   `node scripts/x.mjs` → local imports, transitively
 *   `run-derived-builds.mjs --profile P` → every script in profile P
 *   `npm run <name>` → the node scripts that package.json script invokes
 *
 * Granularity is the JOB, not the file: an install in one job does not put
 * node_modules on another job's runner.
 *
 * Modes: (default) enforce · --list (print every job's needs) · --self-test
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DERIVED_BUILD_PROFILES } from './lib/build-order.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const INSTALL = /\bnpm\s+(?:install|i|ci)\b|\byarn(?:\s+install)?\s*$|\bpnpm\s+(?:install|i)\b/;

/** Strip YAML full-line and trailing comments so documentation never counts. */
export function codeLines(text) {
  return String(text).split('\n').map((raw) => (/^\s*#/.test(raw) ? '' : raw.split(' #')[0]));
}

/** Split a workflow into jobs: { name, text }. Falls back to one job for fixtures. */
export function splitJobs(text) {
  const lines = String(text).split('\n');
  const start = lines.findIndex((line) => /^jobs:\s*$/.test(line));
  if (start < 0) return [{ name: '(workflow)', text }];
  const jobs = [];
  for (let i = start + 1; i < lines.length; i++) {
    const m = lines[i].match(/^ {2}([A-Za-z0-9_-]+):\s*$/);
    if (m) jobs.push({ name: m[1], lines: [] });
    else if (/^\S/.test(lines[i])) break;
    else if (jobs.length) jobs.at(-1).lines.push(lines[i]);
  }
  return jobs.map((job) => ({ name: job.name, text: job.lines.join('\n') }));
}

export function invokedScripts(text, { profiles = DERIVED_BUILD_PROFILES, npmScripts = {} } = {}) {
  const code = codeLines(text).join('\n');
  const found = new Set();
  const addFrom = (fragment) => {
    for (const m of fragment.matchAll(/\bnode\s+(?:\.\/)?(scripts\/[A-Za-z0-9_./-]+\.m?js)\b/g)) found.add(m[1]);
  };
  addFrom(code);
  for (const m of code.matchAll(/run-derived-builds\.mjs\s+--profile(?:=|\s+)([\w-]+)/g)) {
    for (const step of profiles[m[1]] || []) found.add(`scripts/${step.script}`);
  }
  for (const m of code.matchAll(/\bnpm\s+run\s+([\w:.-]+)/g)) addFrom(String(npmScripts[m[1]] || ''));
  return [...found];
}

const IMPORT_RE = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)['"]([^'"]+)['"]/g;

/** Bare package roots a script needs, following relative imports transitively. */
export function packagesNeeded(entry, { root = ROOT, declared, read = (p) => readFileSync(p, 'utf8') } = {}) {
  const needed = new Map(); // package -> first file that imports it
  const seen = new Set();
  const stack = [resolve(root, entry)];
  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    let src;
    try { src = read(file); } catch { continue; }
    for (const m of src.matchAll(IMPORT_RE)) {
      const spec = m[1];
      // `try { ({ chromium } = await import('playwright')); } catch {}` degrades
      // when the package is absent, so it cannot fail a runner. Only a guard on the
      // same statement is trusted; a try block opened lines earlier is not inferred.
      const lineStart = src.lastIndexOf('\n', m.index) + 1;
      if (/\btry\s*\{/.test(src.slice(lineStart, m.index))) continue;
      if (spec.startsWith('.')) {
        if (/\.(m?js|cjs)$/.test(spec)) stack.push(resolve(dirname(file), spec));
        continue;
      }
      if (spec.startsWith('node:')) continue;
      const pkg = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
      if (declared.has(pkg) && !needed.has(pkg)) needed.set(pkg, relative(root, file).replace(/\\/g, '/'));
    }
  }
  return needed;
}

export function checkJob(workflow, job, opts) {
  const scripts = invokedScripts(job.text, opts);
  const needs = new Map();
  for (const script of scripts) {
    for (const [pkg, via] of packagesNeeded(script, opts)) if (!needs.has(pkg)) needs.set(pkg, { script, via });
  }
  const installs = codeLines(job.text).some((line) => INSTALL.test(line));
  const violations = installs ? [] : [...needs].map(([pkg, { script, via }]) =>
    `${workflow} › ${job.name}: runs ${script} which needs \`${pkg}\` (imported by ${via}) but the job never installs dependencies`);
  return { scripts, needs, installs, violations };
}

function declaredPackages(root = ROOT) {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  return {
    declared: new Set([...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {}), ...Object.keys(pkg.optionalDependencies || {})]),
    npmScripts: pkg.scripts || {},
  };
}

function selfTest() {
  const files = {
    [resolve(ROOT, 'scripts/fx-desk.mjs')]: "import { x } from './lib/fx-art.mjs';\nexport const y = 1;",
    [resolve(ROOT, 'scripts/lib/fx-art.mjs')]: "export async function art() { const { default: sharp } = await import('sharp'); return sharp; }",
    [resolve(ROOT, 'scripts/fx-plain.mjs')]: "import fs from 'node:fs';\nimport { chat } from './lib/fx-none.mjs';",
    [resolve(ROOT, 'scripts/lib/fx-none.mjs')]: "export const chat = () => fetch('https://example.invalid');",
    [resolve(ROOT, 'scripts/fx-scoped.mjs')]: "import { test } from '@playwright/test/reporter';",
    // The shape that made ci-status-beacon a false positive on first live run.
    [resolve(ROOT, 'scripts/fx-guarded.mjs')]: "let chromium;\ntry { ({ chromium } = await import('@playwright/test')); } catch { chromium = null; }",
  };
  const opts = {
    root: ROOT,
    declared: new Set(['sharp', '@playwright/test']),
    read: (p) => { if (p in files) return files[p]; throw new Error('missing'); },
    profiles: { 'fx-profile': [{ script: 'fx-desk.mjs' }] },
    npmScripts: { 'fx:art': 'node scripts/fx-desk.mjs --rebuild' },
  };
  const job = (text) => ({ name: 'j', text });
  const cases = [];
  // The S353 incident exactly: the importer is reachable only through a profile.
  const narrative = 'steps:\n  - run: |\n      node scripts/run-derived-builds.mjs --profile fx-profile';
  cases.push(['package reached through a derived-build profile is flagged without an install', checkJob('narrative.yml', job(narrative), opts).violations.some((v) => v.includes('`sharp`') && v.includes('scripts/lib/fx-art.mjs'))]);
  cases.push(['the same job with npm install passes', checkJob('narrative.yml', job('steps:\n  - run: npm install --no-audit --no-fund\n' + narrative), opts).violations.length === 0]);
  cases.push(['a direct node invocation is followed into its lib import', checkJob('d.yml', job('run: node scripts/fx-desk.mjs --rebuild'), opts).violations.length === 1]);
  cases.push(['npm run is resolved to the script it invokes', checkJob('n.yml', job('run: npm run fx:art'), opts).violations.length === 1]);
  cases.push(['scoped package subpaths resolve to the declared root', checkJob('s.yml', job('run: node scripts/fx-scoped.mjs'), opts).violations.some((v) => v.includes('@playwright/test'))]);
  cases.push(['node: builtins and undeclared fetch-only scripts need nothing', checkJob('p.yml', job('run: node scripts/fx-plain.mjs'), opts).violations.length === 0]);
  cases.push(['a try-guarded import on the same statement is optional', checkJob('g.yml', job('run: node scripts/fx-guarded.mjs'), opts).violations.length === 0]);
  cases.push(['an unguarded await import is still required', checkJob('u.yml', job('run: node scripts/fx-desk.mjs'), opts).needs.has('sharp')]);
  cases.push(['an install mentioned only in a comment does not count', checkJob('c.yml', job('# npm install happens elsewhere\n' + narrative), opts).violations.length === 1]);
  const twoJobs = 'on: push\njobs:\n  a:\n    steps:\n      - run: npm install\n  b:\n    steps:\n      - run: node scripts/fx-desk.mjs\n';
  const split = splitJobs(twoJobs);
  cases.push(['jobs are split so an install in job a does not cover job b', split.length === 2 && checkJob('t.yml', split[1], opts).violations.length === 1 && checkJob('t.yml', split[0], opts).violations.length === 0]);
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'FAIL'} ${name}`);
  console.log(`check-workflow-runtime-dependencies --self-test: ${cases.length - failed.length}/${cases.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

function run() {
  const { declared, npmScripts } = declaredPackages();
  const wfDir = join(ROOT, '.github', 'workflows');
  const files = existsSync(wfDir) ? readdirSync(wfDir).filter((f) => /\.ya?ml$/.test(f)).sort() : [];
  const opts = { root: ROOT, declared, npmScripts, profiles: DERIVED_BUILD_PROFILES };
  const violations = [];
  let jobsNeeding = 0;
  for (const f of files) {
    for (const job of splitJobs(readFileSync(join(wfDir, f), 'utf8'))) {
      const result = checkJob(f, job, opts);
      if (result.needs.size) jobsNeeding++;
      if (process.argv.includes('--list') && result.needs.size) {
        console.log(`${f} › ${job.name}: ${result.installs ? 'installs' : 'NO INSTALL'} · needs ${[...result.needs.keys()].join(', ')}`);
      }
      violations.push(...result.violations);
    }
  }
  if (violations.length) {
    console.error('check-workflow-runtime-dependencies: job(s) import declared packages without installing them:');
    for (const v of violations) console.error(`  ✗ ${v}`);
    console.error('  fix: add `npm install --no-audit --no-fund` to that job before the step (the lockfile is gitignored, so not npm ci).');
    process.exit(1);
  }
  console.log(`check-workflow-runtime-dependencies: ${files.length} workflow(s) · ${jobsNeeding} job(s) need packages · every one installs them`);
  process.exit(0);
}

if (process.argv.includes('--self-test')) selfTest();
else run();
