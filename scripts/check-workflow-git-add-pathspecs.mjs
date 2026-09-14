#!/usr/bin/env node
/**
 * check-workflow-git-add-pathspecs.mjs  (S353)
 *
 * An unguarded glob in a workflow `git add` that matches no git-tracked file is
 * a job that fails the first time its generator produces nothing.
 *
 * WHY THIS EXISTS. `weekly-maintenance.yml` ran
 *   git add member/*\/index.html member-sitemap.xml …
 * The member read returned 0 rows, so no profile page existed, git exited 128
 * with "pathspec 'member/*\/index.html' did not match any files", and the job
 * failed before staging anything else in the line — including the Obelisk
 * registration probe whose 14-day clock that job exists to refresh.
 *
 * Contract: every glob token in a `git add` must match at least one file that
 * `git ls-files` reports (a tracked file is present on every checkout, so the
 * shell glob and git's own pathspec both resolve), unless the command already
 * tolerates failure (`|| true`, or `--ignore-errors`). Explicit, non-glob paths
 * are not checked: a first-time generated file is legitimately untracked.
 *
 * Modes: (default) enforce · --self-test
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from './lib/safe-spawn.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

/** Unguarded glob tokens from every real `git add` command in a workflow. */
export function unguardedGlobs(text) {
  const out = [];
  String(text).split('\n').forEach((raw, index) => {
    if (/^\s*#/.test(raw)) return;
    const code = raw.split(' #')[0];
    const m = code.match(/\bgit add\s+(.+)$/);
    if (!m) return;
    if (/\|\|\s*(true|:)\b/.test(m[1]) || /--ignore-errors\b/.test(m[1])) return;
    for (const raw of m[1].split(/\s+/)) {
      if (/^(2>|1>|>|<|\|\||&&|;|\|)/.test(raw)) break;
      const token = raw.replace(/^['"]|['"]$/g, '');
      if (!token || token.startsWith('-')) continue;
      if (/[*?[]/.test(token)) out.push({ line: index + 1, token });
    }
  });
  return out;
}

function trackedMatches(token) {
  try {
    const listed = execFileSync('git', ['ls-files', '--', token], { cwd: ROOT, encoding: 'utf8' });
    return listed.split('\n').filter(Boolean).length;
  } catch {
    return null;
  }
}

function selfTest() {
  const cases = [];
  const incident = '          git add member/*/index.html member-sitemap.xml .cache/obelisk-registration-probe.json api/release-dependencies.json';
  cases.push(['the S353 weekly-maintenance glob is extracted', unguardedGlobs(incident).map((g) => g.token).join() === 'member/*/index.html']);
  cases.push(['the S353 fix (directory add) has no glob to check', unguardedGlobs('          git add -A -- member member-sitemap.xml').length === 0]);
  cases.push(['|| true tolerates a zero match', unguardedGlobs("git add 'projects/*/llms-full.txt' 2>/dev/null || true").length === 0]);
  cases.push(['quoted globs are unquoted before matching', unguardedGlobs("git add 'assets/og-*.png'")[0]?.token === 'assets/og-*.png']);
  cases.push(['comments are documentation, not commands', unguardedGlobs('# git add member/*/index.html').length === 0]);
  cases.push(['tokens stop at a shell operator', unguardedGlobs('git add api/x.json && echo a/*.b').length === 0]);
  cases.push(['a glob matching tracked files counts them', (trackedMatches('scripts/check-workflow-*.mjs') || 0) > 0]);
  cases.push(['the incident glob matches zero tracked files in this repo', trackedMatches('member/*/index.html') === 0]);
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'FAIL'} ${name}`);
  console.log(`check-workflow-git-add-pathspecs --self-test: ${cases.length - failed.length}/${cases.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

function run() {
  const wfDir = join(ROOT, '.github', 'workflows');
  const files = existsSync(wfDir) ? readdirSync(wfDir).filter((f) => /\.ya?ml$/.test(f)).sort() : [];
  const violations = [];
  let globs = 0;
  for (const f of files) {
    for (const { line, token } of unguardedGlobs(readFileSync(join(wfDir, f), 'utf8'))) {
      globs++;
      const count = trackedMatches(token);
      if (count === null) {
        console.error('check-workflow-git-add-pathspecs: git ls-files failed; cannot verify pathspecs');
        process.exit(1);
      }
      if (count === 0) violations.push(`${f}:${line} git add glob \`${token}\` matches no tracked file — git exits 128 when the generator produces none`);
    }
  }
  if (violations.length) {
    console.error('check-workflow-git-add-pathspecs: unguarded zero-match pathspec(s):');
    for (const v of violations) console.error(`  ✗ ${v}`);
    console.error('  fix: stage the directory (`git add -A -- dir`) or guard the glob with `|| true` if an empty result is valid.');
    process.exit(1);
  }
  console.log(`check-workflow-git-add-pathspecs: ${files.length} workflow(s) · ${globs} unguarded glob(s) · all match tracked files`);
  process.exit(0);
}

if (process.argv.includes('--self-test')) selfTest();
else run();
