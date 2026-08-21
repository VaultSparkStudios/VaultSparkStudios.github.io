#!/usr/bin/env node
/**
 * check-public-safe-tracking.mjs — an artifact that declares itself
 * NOT public-safe must not be publicly served.
 *
 * Why this gate exists (S308): production publishes the entire git-tracked
 * tree. `data/` is served — probing `/data/staging-deploy-history.ndjson`
 * returns 200 — so committing a file under a served path publishes it, whatever
 * the file says about itself. The Desk's trend radar writes
 * `data/news-desk/topic-queue.json` with `"publicSafe": false` and scored
 * rejection reasons about third parties' stories ("vendor content, not news").
 * Nothing would have stopped that from shipping: the declaration was honest,
 * and nothing read it.
 *
 * The failure mode this closes is asymmetric and quiet. A generator author
 * writes `publicSafe: false` believing it *does* something; it does nothing
 * unless a gate reads it. So the marker is now load-bearing: declaring it
 * false and committing the file under a served path is a build failure, and
 * the fix is either to gitignore the artifact or to make it genuinely public
 * and flip the flag honestly.
 *
 * Enumeration is over GIT-TRACKED files, never a filesystem walk: an untracked
 * scratch file is not published and must not fail the build, while a tracked
 * one is published even if it is absent from a fresh checkout's working tree.
 *
 * Usage:
 *   node scripts/check-public-safe-tracking.mjs            # check (default)
 *   node scripts/check-public-safe-tracking.mjs --self-test
 */

import { execFileSync } from './lib/safe-spawn.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Path prefixes reachable over HTTPS on the live origin.
 *
 * VERIFIED BY PROBE on 2026-08-08, not assumed — an earlier note in this repo
 * said production publishes the *entire* git-tracked tree, and that is no
 * longer true. Measured: `/data/staging-deploy-history.ndjson` 200,
 * `/assets/news-desk.css` 200, `/api/news-desk.json` 200; while `/docs/…`,
 * `/context/PROJECT_STATUS.json`, `/logs/WORK_LOG.md` and `/.cache/…` all 404.
 *
 * `docs/` was deliberately REMOVED from this list after probing: keeping it
 * would make the gate flag files that are not actually published, and a gate
 * whose premise is wrong teaches the wrong lesson even while it passes.
 *
 * If the serving rules change, re-probe and update this list — an entry here
 * is a factual claim about the live site, not a convention.
 */
export const SERVED_PREFIXES = ['api/', 'data/', 'assets/', '.well-known/'];

export const isServedPath = (rel) => SERVED_PREFIXES.some((p) => rel.startsWith(p));

/**
 * Read the `publicSafe` declaration from JSON text. Returns `false` only for an
 * explicit `false` — absent, malformed, or non-boolean all return null, because
 * this gate must never invent a violation from a file it failed to parse.
 */
export function declaredPublicSafe(text) {
  let parsed;
  try { parsed = JSON.parse(text); } catch { return null; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  return typeof parsed.publicSafe === 'boolean' ? parsed.publicSafe : null;
}

/** Files git actually tracks — the set that gets published. */
export function trackedFiles(root = ROOT) {
  const out = execFileSync('git', ['ls-files', '-z'], {
    cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true,
  });
  return out.split('\0').filter(Boolean);
}

/** Pure evaluator so the self-test can exercise the rule without a repo. */
export function evaluate(entries) {
  return entries
    .filter((e) => isServedPath(e.path))
    .filter((e) => declaredPublicSafe(e.text) === false)
    .map((e) => e.path);
}

function check() {
  const violations = [];
  for (const rel of trackedFiles()) {
    if (!rel.endsWith('.json') || !isServedPath(rel)) continue;
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    if (declaredPublicSafe(fs.readFileSync(abs, 'utf8')) === false) violations.push(rel);
  }

  if (violations.length) {
    console.error('check-public-safe-tracking: FAIL — git-tracked artifact(s) declare publicSafe:false but sit under a publicly served path:');
    for (const v of violations) console.error(`  ⛔ ${v}`);
    console.error('  fix: gitignore the artifact, or make it genuinely public and set publicSafe:true honestly.');
    process.exit(1);
  }
  console.log('check-public-safe-tracking: ok — no publicSafe:false artifact is publicly served');
}

function selfTest() {
  const cases = [];
  const t = (label, ok) => cases.push([label, ok]);

  t('a served path is recognised', isServedPath('data/news-desk/topic-queue.json'));
  t('api/ is served', isServedPath('api/news-desk.json'));
  t('scripts/ is not served', !isServedPath('scripts/lib/news-trends.mjs'));
  t('context/ is not covered by this gate', !isServedPath('context/PROJECT_STATUS.json'));
  // Each of these was probed 404 on 2026-08-08; the gate must not claim they
  // are published, or it flags files no visitor can reach.
  t('docs/ is not served (probed 404)', !isServedPath('docs/AUDIT_2026-08-08.md'));
  t('logs/ is not served (probed 404)', !isServedPath('logs/WORK_LOG.md'));
  t('.cache/ is not served (probed 404)', !isServedPath('.cache/closeout-brief-308.json'));
  t('assets/ is served (probed 200)', isServedPath('assets/news-desk.css'));

  t('explicit false is detected', declaredPublicSafe('{"publicSafe":false}') === false);
  t('explicit true is allowed', declaredPublicSafe('{"publicSafe":true}') === true);
  t('absent flag is null, not false', declaredPublicSafe('{"a":1}') === null);
  t('malformed json never invents a violation', declaredPublicSafe('{oops') === null);
  t('a non-boolean flag is null', declaredPublicSafe('{"publicSafe":"false"}') === null);
  t('a bare array is null', declaredPublicSafe('[1,2,3]') === null);
  t('null json is null', declaredPublicSafe('null') === null);

  t('the exact S308 regression is caught', evaluate([
    { path: 'data/news-desk/topic-queue.json', text: '{"publicSafe":false,"topics":[]}' },
  ]).length === 1);
  t('a public-safe served artifact passes', evaluate([
    { path: 'api/news-desk.json', text: '{"publicSafe":true}' },
  ]).length === 0);
  t('a not-public-safe file outside served paths passes', evaluate([
    { path: '.cache/topic-queue.json', text: '{"publicSafe":false}' },
  ]).length === 0);
  t('mixed input reports only the violation', JSON.stringify(evaluate([
    { path: 'api/ok.json', text: '{"publicSafe":true}' },
    { path: 'data/bad.json', text: '{"publicSafe":false}' },
    { path: 'scripts/x.json', text: '{"publicSafe":false}' },
  ])) === JSON.stringify(['data/bad.json']));
  t('the live repo enumerates tracked files', trackedFiles().length > 0);

  const failed = cases.filter(([, ok]) => !ok);
  for (const [label, ok] of cases) if (!ok) console.error(`✗ ${label}`);
  console.log(`check-public-safe-tracking --self-test: ${cases.length - failed.length}/${cases.length} passed`);
  if (failed.length) process.exit(1);
}

if (process.argv.includes('--self-test')) selfTest();
else check();
