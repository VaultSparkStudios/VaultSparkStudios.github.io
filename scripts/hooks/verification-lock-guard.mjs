#!/usr/bin/env node
/**
 * verification-lock-guard — PreToolUse hook: keep the tree frozen while
 * `build:check` is running.
 *
 * `npm run build:check` binds a source fingerprint into its receipt, so ANY
 * edit while it runs invalidates the whole run with "receipt source fingerprint
 * is stale". That is correct behaviour — a receipt cannot certify a tree that
 * changed underneath it — but the failure arrives ~10 minutes late, after the
 * work is already wasted.
 *
 * Three runs were burned this way in a single session (S308), each time with a
 * plausible local reason ("it's only context files" — but several gates read
 * context/ and logs/, so those are in the fingerprint). A rule that has to be
 * remembered at the moment of temptation is a rule that gets broken; this
 * turns it into a precondition that is checked mechanically instead.
 *
 * Fail-OPEN by design. A guard that could wedge the repo shut is worse than the
 * problem it prevents, so anything unexpected — unreadable lock, malformed
 * JSON, missing file, stale lock from a killed run — allows the write.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** A run that has outlived this is a corpse, not a lock (build:check ≈ 10 min). */
const STALE_AFTER_MS = 20 * 60 * 1000;

const allow = () => process.exit(0);

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }));
  process.exit(0);
}

let raw = '';
try {
  raw = fs.readFileSync(0, 'utf8');
} catch { allow(); }

let payload = {};
try { payload = raw.trim() ? JSON.parse(raw) : {}; } catch { allow(); }

/**
 * Resolve the lock from the SCRIPT's own location first, not from the payload.
 *
 * This script lives at <repo>/scripts/hooks/, so <repo> is two levels up — a
 * fact that holds on every platform. `payload.cwd` and `process.cwd()` do not:
 * under Git Bash on Windows they can arrive as an MSYS path (`/c/Users/...`)
 * that Node cannot stat, so `existsSync` returns false and the guard silently
 * allows every write. A guard that fails open on a path quirk is a guard that
 * does nothing, and it would have looked like it was working.
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const candidates = [
  path.join(repoRoot, '.cache', 'verification.lock'),
  ...(payload?.cwd ? [path.join(payload.cwd, '.cache', 'verification.lock')] : []),
  path.join(process.cwd(), '.cache', 'verification.lock'),
];

const lockPath = candidates.find((p) => { try { return fs.existsSync(p); } catch { return false; } });
if (!lockPath) allow();

let lock = null;
try { lock = JSON.parse(fs.readFileSync(lockPath, 'utf8')); } catch { allow(); }

const startedAt = Date.parse(lock?.startedAt || '');
if (!Number.isFinite(startedAt)) allow();

const ageMs = Date.now() - startedAt;
if (ageMs > STALE_AFTER_MS) {
  // A killed run leaves its lock behind. Never let that freeze the repo.
  allow();
}

const ageMin = Math.max(1, Math.round(ageMs / 60000));
const target = payload?.tool_input?.file_path || payload?.tool_input?.notebook_path || 'this file';
deny(
  `The tree is frozen: a verification run (build:check) started ${ageMin} min ago and is still going.\n`
  + `Editing ${target} now would invalidate its receipt with "receipt source fingerprint is stale" and waste the whole run.\n\n`
  + 'Do read-only work until it reports — Read, Grep, live probes, analysis, drafting in context.\n'
  + 'If this edit genuinely cannot wait, kill the run first, then edit, then restart it.\n'
  + `(Lock: .cache/verification.lock — auto-ignored once older than ${STALE_AFTER_MS / 60000} min.)`,
);
