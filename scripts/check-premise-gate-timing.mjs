#!/usr/bin/env node
// @verification-scope session-lifecycle
// check-premise-gate-timing.mjs — S385 [audit #1] · closes [SIL:2⛔][S382 #1].
//
// Did the strict premise gate run BEFORE implementation began? Reads the sidecar's
// premiseGate record (written by check-audit-premises --strict --record) and judges it
// against the session lock's start_head with git facts. Read-only: no writes, no network.
//
// S386 [audit #2] — the subject is the SIDECAR's repository: its git root, its
// context/.session-lock, its history. Before, every query ran in this script's own root,
// so judging a recipient's sidecar from the control plane silently judged studio-ops.
// A sidecar outside any git repository is unknown, never judged against this one.
// S386 [audit #1] — commits authored by another identity than the lock's author_digest
// are reported as otherWriters and do not convict (routine Actions commit mid-session).
//
// Exit codes: 0 pre-implementation · 1 any other verdict (missing, failed, stale,
// foreign, after-implementation, unknown) · 2 usage.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from './lib/safe-spawn.mjs';
import { printHelpIfRequested, readValueArg, CliUsageError } from './lib/cli-contract.mjs';
import { assessPremiseGateTiming, premiseDigest, authorDigest } from './lib/premise-gate-timing.mjs';
import { sessionTrailerValue, commitSessionFromTrailers, SESSION_TRAILER_KEY, SESSION_START_TRAILER_KEY } from './lib/session-trailer.mjs';
// S387 [audit #2] — a Studio-Session trailer (prepare-commit-msg hook) binds a commit to its
// session, so a concurrent same-identity session's commits are other writers too.

const USAGE = `
Usage: node scripts/check-premise-gate-timing.mjs --audit <docs/AUDIT_*.json> [--start-head <sha>] [--json]

Judges the sidecar's premiseGate record: did a passing --strict gate run before any
implementation path changed since the session's start_head (default: the
context/.session-lock of the git repository that contains the sidecar)?
A relative --audit path resolves against the current directory.
Exit 0 pre-implementation · 1 otherwise · 2 usage. Read-only.
`;

const args = process.argv.slice(2);
if (printHelpIfRequested(args, USAGE)) process.exit(0);
const KNOWN = new Set(['--audit', '--start-head', '--json']);
let auditArg; let startArg;
try {
  for (let i = 0; i < args.length; i++) {
    if (!KNOWN.has(args[i])) throw new CliUsageError(`unknown argument: ${args[i]}`);
    if (args[i] !== '--json') i++;
  }
  auditArg = readValueArg(args, '--audit');
  startArg = readValueArg(args, '--start-head');
  if (!auditArg) throw new CliUsageError('--audit <sidecar> is required');
} catch (e) {
  console.error(`⛔ check-premise-gate-timing: ${e.message}`);
  console.error(USAGE.trim());
  process.exit(2);
}
const JSON_OUT = args.includes('--json');

const auditPath = path.resolve(auditArg);
let audit;
try { audit = JSON.parse(fs.readFileSync(auditPath, 'utf8')); } catch (e) {
  console.error(`⛔ cannot read ${auditArg}: ${e.message}`);
  process.exit(1);
}

const git = (cwd, gitArgs) => spawnSync('git', gitArgs, { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
const top = git(path.dirname(auditPath), ['rev-parse', '--show-toplevel']);
const repoRoot = top.status === 0 && top.stdout.trim() ? path.resolve(top.stdout.trim()) : null;

const lockText = (() => {
  if (!repoRoot) return null;
  try { return fs.readFileSync(path.join(repoRoot, 'context', '.session-lock'), 'utf8'); } catch { return null; }
})();
function lockField(name) {
  return lockText?.match(new RegExp(`^${name}:\\s*([0-9a-f]{40,64})\\s*$`, 'm'))?.[1] ?? null;
}

const gate = audit.premiseGate ?? null;
const startHead = startArg || lockField('start_head');
const sessionAuthorDigest = lockField('author_digest');
const sessionTrailer = lockText ? sessionTrailerValue(lockText) : null;

let gateDescendsFromStart = null;
let commitsBeforeGate = [];
if (repoRoot && gate?.head && startHead) {
  const anc = git(repoRoot, ['merge-base', '--is-ancestor', startHead, gate.head]);
  // 0 = ancestor, 1 = not; anything else (unknown object) stays unknown.
  gateDescendsFromStart = anc.status === 0 ? true : anc.status === 1 ? false : null;
  if (gateDescendsFromStart) {
    // --no-renames: a committed move lists BOTH paths, so moving implementation into a
    // record directory still counts (review r2 #9).
    // Fields are tab-separated; trailer values are joined with \x1f (never in a value).
    // S388 — the start instant has its own trailer (one grammar per key).
    const log = git(repoRoot, ['log', '--no-renames', `--format=@@%H%x09%ae%x09%(trailers:key=${SESSION_TRAILER_KEY},valueonly,separator=%x1f)%x09%(trailers:key=${SESSION_START_TRAILER_KEY},valueonly,separator=%x1f)`, '--name-only', `${startHead}..${gate.head}`]);
    if (log.status !== 0) gateDescendsFromStart = null;
    else {
      for (const line of log.stdout.split(/\r?\n/)) {
        if (line.startsWith('@@')) {
          const [sha, email = '', trailers = '', starts = ''] = line.slice(2).split('\t');
          const values = (s) => (s ? s.split('\x1f') : []);
          commitsBeforeGate.push({ sha, authorDigest: authorDigest(email), session: commitSessionFromTrailers(values(trailers), values(starts)), paths: [] });
        } else if (line.trim() && commitsBeforeGate.length) commitsBeforeGate[commitsBeforeGate.length - 1].paths.push(line.trim());
      }
    }
  }
}
// An unreadable tree at gate time is not a clean tree.
const verdict = !repoRoot
  ? { state: 'unknown', ok: false, detail: `${auditArg} is not inside a git repository — no history or session lock to judge it against` }
  : gate && gate.implementationDirty === null
    ? { state: 'unknown', ok: false, detail: 'the gate could not read the working tree when it ran' }
    : assessPremiseGateTiming({ gate, currentDigest: premiseDigest(audit.items ?? []), startHead, gateDescendsFromStart, commitsBeforeGate, auditName: path.basename(auditPath), sessionAuthorDigest, sessionTrailer });

if (JSON_OUT) console.log(JSON.stringify({ audit: path.basename(auditPath), repoRoot, startHead, gateHead: gate?.head ?? null, ...verdict }, null, 2));
else console.log(`${verdict.ok ? '✓' : '⛔'} premise-gate-timing · ${verdict.state} · ${verdict.detail}${repoRoot ? ` · repo ${path.basename(repoRoot)}` : ''}`);
process.exit(verdict.ok ? 0 : 1);
