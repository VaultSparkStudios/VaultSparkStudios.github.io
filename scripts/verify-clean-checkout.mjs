#!/usr/bin/env node
// @verification-scope operator-preflight
/**
 * verify-clean-checkout.mjs — run build:check against a clean checkout of a commit,
 * the way CI sees it, before pushing.
 *
 * WHY (S373). The working checkout is not what CI checks out. It carries gitignored
 * receipts, generated files that are dirty but uncommitted, and (on Windows) its own
 * line endings and directory order. In S372 five E2E runs failed on causes that all
 * passed locally, each discovered one 15-minute CI cycle at a time; a single clean
 * checkout run then found two more before the push.
 *
 * It adds a detached git worktree in the OS temp directory, links node_modules into it,
 * copies the gitignored mobile-audit receipt (CI generates that in an earlier step), and
 * runs `run-build-check.mjs` with CI=true so machine-local receipts are relaxed exactly
 * as they are in CI. The worktree is removed afterwards.
 *
 * TEARDOWN ORDER IS THE SAFETY PROPERTY. node_modules is a junction. Removing the
 * worktree while that junction exists would recurse through it into the real
 * node_modules, so the link is removed first, verified gone, and only then is the
 * worktree removed. If the link cannot be removed, teardown stops and says so.
 *
 * Usage:
 *   node scripts/verify-clean-checkout.mjs                 # HEAD
 *   node scripts/verify-clean-checkout.mjs --ref=<commit>
 *   node scripts/verify-clean-checkout.mjs --from=150      # resume build:check at a step
 *   node scripts/verify-clean-checkout.mjs --keep          # leave the worktree for inspection
 *   node scripts/verify-clean-checkout.mjs --self-test
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from './lib/safe-spawn.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = (name, fallback) => args.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1) ?? fallback;

export function worktreePathFor(sha, tmp = os.tmpdir()) {
  if (!/^[0-9a-f]{7,40}$/.test(String(sha))) throw new Error(`not a commit sha: ${sha}`);
  return path.join(tmp, `vss-clean-checkout-${String(sha).slice(0, 12)}`);
}

/** True when `link` is a symlink/junction (never true for a real directory). */
export function isLink(link) {
  try { return fs.lstatSync(link).isSymbolicLink(); } catch { return false; }
}

/**
 * Remove ONLY the link, never what it points at. Returns true when the path no longer
 * exists. A real directory at that path is refused: this function must not delete it.
 */
export function removeLink(link) {
  let stat;
  try { stat = fs.lstatSync(link); } catch { return true; }
  if (!stat.isSymbolicLink()) throw new Error(`${link} is a real directory, not a link; refusing to remove it`);
  try { fs.rmdirSync(link); } catch { try { fs.unlinkSync(link); } catch { /* reported below */ } }
  return !fs.existsSync(link) && !isLink(link);
}

function git(argv, opts = {}) {
  return spawnSync('git', ['-C', ROOT, ...argv], { encoding: 'utf8', windowsHide: true, ...opts });
}

function teardown(worktree) {
  const link = path.join(worktree, 'node_modules');
  if (!removeLink(link)) {
    console.error(`⛔ verify-clean-checkout: could not remove the node_modules link at ${link}.`);
    console.error('   The worktree was NOT removed, because removing it would follow that link. Remove the link by hand, then: git worktree remove --force <path>');
    return false;
  }
  const removed = git(['worktree', 'remove', '--force', worktree]);
  if (removed.status !== 0) { console.error(`verify-clean-checkout: worktree remove failed: ${String(removed.stderr).trim()}`); return false; }
  return true;
}

function selfTest() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vss-clean-checkout-selftest-'));
  const cases = [];
  try {
    const target = path.join(tmp, 'real-node-modules');
    fs.mkdirSync(target);
    const sentinel = path.join(target, 'sentinel.txt');
    fs.writeFileSync(sentinel, 'must survive');
    const tree = path.join(tmp, 'tree');
    fs.mkdirSync(tree);
    const link = path.join(tree, 'node_modules');
    fs.symlinkSync(target, link, 'junction');
    cases.push(['the link is recognised as a link', isLink(link) && !isLink(target)]);
    cases.push(['files are reachable through the link before removal', fs.existsSync(path.join(link, 'sentinel.txt'))]);
    cases.push(['removing the link reports success', removeLink(link) === true]);
    cases.push(['the link is gone', !fs.existsSync(link) && !isLink(link)]);
    cases.push(['THE TARGET AND ITS CONTENTS SURVIVE', fs.existsSync(sentinel) && fs.readFileSync(sentinel, 'utf8') === 'must survive']);
    cases.push(['removing an absent link is a no-op success', removeLink(link) === true]);
    const realDir = path.join(tree, 'real');
    fs.mkdirSync(realDir);
    fs.writeFileSync(path.join(realDir, 'keep.txt'), 'x');
    cases.push(['a real directory is refused, not deleted', (() => { try { removeLink(realDir); return false; } catch { return fs.existsSync(path.join(realDir, 'keep.txt')); } })()]);
    cases.push(['worktree paths are derived from a sha in the OS temp dir', worktreePathFor('abcdef1234567890', '/t').replace(/\\/g, '/') === '/t/vss-clean-checkout-abcdef123456']);
    cases.push(['a non-sha ref is rejected before any path is built', (() => { try { worktreePathFor('../../etc'); return false; } catch { return true; } })()]);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  for (const [name, ok] of cases) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (cases.some(([, ok]) => !ok)) { console.error('verify-clean-checkout self-test failed'); process.exit(1); }
  console.log(`verify-clean-checkout --self-test: ${cases.length}/${cases.length} passed`);
}

function main() {
  if (args.includes('--self-test')) return selfTest();
  const ref = option('--ref', 'HEAD');
  const resolved = git(['rev-parse', '--verify', `${ref}^{commit}`]);
  if (resolved.status !== 0) { console.error(`verify-clean-checkout: cannot resolve ${ref}`); process.exit(2); }
  const sha = resolved.stdout.trim();
  const worktree = worktreePathFor(sha);
  const dirty = git(['status', '--porcelain', '--untracked-files=no']).stdout.split(/\r?\n/).filter(Boolean).length;
  if (dirty && ref === 'HEAD') console.log(`verify-clean-checkout: note — ${dirty} uncommitted tracked change(s) are NOT part of this check; it verifies commit ${sha.slice(0, 9)}.`);

  if (fs.existsSync(worktree) && !teardown(worktree)) process.exit(2);
  const added = git(['worktree', 'add', '--detach', worktree, sha]);
  if (added.status !== 0) { console.error(`verify-clean-checkout: worktree add failed: ${String(added.stderr).trim()}`); process.exit(2); }

  let status = 1;
  try {
    fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(worktree, 'node_modules'), 'junction');
    const receipts = path.join(ROOT, 'docs', 'mobile-audit');
    if (fs.existsSync(receipts)) fs.cpSync(receipts, path.join(worktree, 'docs', 'mobile-audit'), { recursive: true });
    const from = option('--from', '');
    console.log(`verify-clean-checkout: build:check at ${sha.slice(0, 9)} in ${worktree} (CI mode${from ? `, from step ${from}` : ''})`);
    const run = spawnSync(process.execPath, ['scripts/run-build-check.mjs', '--quiet', ...(from ? [`--from=${from}`] : [])], {
      cwd: worktree, stdio: 'inherit', windowsHide: true, env: { ...process.env, CI: 'true', GITHUB_ACTIONS: 'true' },
    });
    status = run.status ?? 1;
  } finally {
    if (args.includes('--keep')) console.log(`verify-clean-checkout: --keep set; worktree left at ${worktree} (remove its node_modules link first).`);
    else if (!teardown(worktree)) status = status || 2;
  }
  console.log(status === 0 ? `verify-clean-checkout: PASS at ${sha.slice(0, 9)}` : `verify-clean-checkout: FAIL at ${sha.slice(0, 9)} (exit ${status})`);
  process.exit(status);
}

const direct = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (direct) main();
