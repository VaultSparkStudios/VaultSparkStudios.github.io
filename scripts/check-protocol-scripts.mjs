#!/usr/bin/env node
/**
 * S153 — Protocol Script Presence Sentinel.
 *
 * Enumerates every `node scripts/<name>.mjs` invocation referenced by Studio OS
 * protocol docs (prompts/start.md, prompts/closeout.md, AGENTS.md, CLAUDE.md)
 * and verifies presence locally. Known-absent entries get an explicit allowlist
 * with rationale so the next time /start fires we see ONE structured delta
 * line instead of four phantom MODULE_NOT_FOUND stack traces.
 *
 * Exit 0 on clean. Exit 1 only on unexpected drift (script vanished from
 * disk that the protocol expects AND it isn't on the allowlist).
 * `--info` and `--json` are read-only modes for the build:check chain.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const asJson = args.includes('--json');
const infoOnly = args.includes('--info');

const PROTOCOL_FILES = [
  'prompts/start.md',
  'prompts/closeout.md',
  'AGENTS.md',
  'CLAUDE.md',
  'docs/SESSION_PROTOCOL.md',
];

// Scripts referenced by user-side skill files that live OUTSIDE this repo
// (~/.claude/skills/*) — we cannot enforce their presence locally. They MAY
// be shipped from the sibling vaultspark-studio-ops repo or live only in the
// skill-runner context. Each entry must justify why absence is expected.
const KNOWN_ABSENT_ALLOWLIST = {
  'scripts/audit-run.mjs': 'optional orchestrator; /audit can write sidecar + md directly',
  'scripts/ark.mjs': 'Studio Ark transport is studio-ops-side; receipts auto-drain when present',
  'scripts/router.mjs': 'plain-English intent router lives in studio-ops; /start tolerates absence',
  'scripts/propagate-agents-sections.mjs': 'AGENTS.md propagator runs from studio-ops; targets this repo as a sibling',
  'scripts/render-founder-queue.mjs': 'founder-queue renderer is studio-ops-side; not bundled with public website repo',
  'scripts/studio-pulse.mjs': 'portfolio-level Studio Pulse runs from studio-ops, reads this repo via PROJECT_STATUS.json',
  'scripts/twin-ask.mjs': 'founder-twin verdict service lives in studio-ops; PreToolUse hook wires it when present',
  'scripts/studio-oracle.mjs': 'cross-project queryable data plane; ingests every repo from studio-ops, not runnable per-project',
};

// ── S341: name the propagation gap instead of leaving it ambient ────────────
// `--info` made this check report and never fail, so "13 unexpected-absent" had
// been ambient for sessions: a number nobody could act on, mixing two very
// different things. Verified this session against the sibling checkout: all
// thirteen EXIST in studio-ops. They are not missing work — they are per-project
// protocol steps that were never propagated here, which is why five of them
// (start-sync, start-canon-sync, frontier-capability-radar, run-maintenance,
// check-maintenance-lane-ran) are named as GATES by docs/SESSION_PROTOCOL.md §1
// and were simply unrunnable during this session's own /start. A protocol step
// whose script does not exist in the repo that runs it has never run here.
//
// These must NOT be laundered into the allowlist — that would turn a real gap
// green. They are their own bucket, with the canonical owner named, so the fix
// is one Ark `repo-question`/propagation request rather than thirteen local
// re-implementations (CANON-018: never write into a sibling's tree; CANON-039:
// reuse the canonical implementation rather than forking it).
const STUDIO_OPS_PROPAGATION_GAP = {
  'scripts/start-sync.mjs': 'SESSION_PROTOCOL §1 step 0.8 gate',
  'scripts/start-canon-sync.mjs': 'SESSION_PROTOCOL §1 step 2.3 gate (D-S259.5)',
  'scripts/frontier-capability-radar.mjs': 'SESSION_PROTOCOL §1 step 2.6 gate (CANON-049)',
  'scripts/run-maintenance.mjs': 'SESSION_PROTOCOL §1 step 2.7 gate (S301 · CANON-031)',
  'scripts/check-maintenance-lane-ran.mjs': 'SESSION_PROTOCOL §1 step 2.8 gate (S315)',
  'scripts/start-recovery-preflight.mjs': 'no-write /start cut-off detector',
  'scripts/start-stalled-remediation-resume.mjs': 'stalled-remediation resume (S288)',
  'scripts/check-audit-premises.mjs': '/audit typed-premise verifier (S239)',
  'scripts/check-release-proof.mjs': 'release-proof verifier',
  'scripts/render-closeout-checklist.mjs': 'token-lean closeout surface (S236)',
  'scripts/compact-memory-index.mjs': 'agent-memory index remediator',
  'scripts/task-slice.mjs': 'focused single-task TASK_BOARD lookup',
};

// S172 protocol-script-self-heal: scripts the session protocol invokes that
// SHOULD respond locally, healed as thin delegation shims to the studio-ops
// canonical (the ark.mjs pattern — no logic copied, nothing to drift).
// `--heal` writes any missing shim when the sibling is reachable.
const HEAL_AS_SHIM = {
  'scripts/set-active-skill.mjs': 'per-skill ROI attribution (S121 G3) — every skill calls it first',
  'scripts/credential-watch.mjs': 'MISSING→READY credential transition watcher (S121 G9)',
  'scripts/check-brief-staleness.mjs': 'G12 staleness gate before brief regeneration (S118)',
  'scripts/skill-trace-emit.mjs': 'skill telemetry start/step/finish (R-H4 S118)',
  'scripts/build-skill-manifest.mjs': 'skill drift warning at /start (G10 S118)',
  'scripts/augment-startup-brief.mjs': 'LAST SESSION + SKILL HEALTH brief blocks (R-H5/12/15 S118)',
  'scripts/ark.mjs': 'Studio Ark transport (CANON-018) — drain at every /start',
  'scripts/router.mjs': 'plain-English intent router suggestions — /start precomputes top routes when available',
  // S174 protocol-shim-completion: the three scripts that MODULE_NOT_FOUND'd in S174
  'scripts/lib/skill-profile.mjs': 'medium-overlay resolver — /start, /audit, /implement all call it first (S125+S126)',
  'scripts/sample-codebase.mjs': 'token-budgeted audit codebase sampler (G3 S118) — /audit step 3',
  'scripts/render-audit-md.mjs': 'audit md reverse-renderer from JSON sidecar (R-H14 S118) — /audit step 9',
  'scripts/gen-agents-canon-index.mjs': 'canon index generator — AGENTS.md documents the refresh path',
  'scripts/ignis-rescore-touched.mjs': 'closeout touched-repo IGNIS rescore hook',
  'scripts/record-skill-cost.mjs': 'per-skill and per-item cost attribution ledger',
  'scripts/session-floor.mjs': 'goal/implement saturation gate and closeout amortization source',
  'scripts/sync-agent-skills.mjs': 'agent skill parity sync hook for initiated repos',
};
const SIBLING_SCRIPTS = path.resolve(ROOT, '..', 'vaultspark-studio-ops', 'scripts');

function shimSource(name, why, depth = 1) {
  const rootHops = Array(depth).fill('..').join("', '");
  return `#!/usr/bin/env node
/**
 * ${name} — thin delegation shim (S172 protocol-script-self-heal)
 *
 * ${why}.
 * Canonical implementation lives in vaultspark-studio-ops; this shim forwards
 * argv verbatim with this repo as cwd. Exits 0 quietly when the sibling is
 * unreachable so the session protocol never blocks on a missing checkout.
 *
 * Generated by: node scripts/check-protocol-scripts.mjs --heal
 */
import { existsSync } from 'node:fs';
import { spawnSync } from './lib/safe-spawn.mjs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '${rootHops}');
const SIBLING = path.resolve(ROOT, '..', 'vaultspark-studio-ops', 'scripts', ...'${name}'.split('/'));

if (!existsSync(SIBLING)) {
  console.log('${name} (shim): studio-ops sibling not reachable — skipping.');
  process.exit(0);
}
const r = spawnSync(process.execPath, [SIBLING, ...process.argv.slice(2)], { stdio: 'inherit', cwd: ROOT });
process.exit(r.status ?? 0);
`;
}

if (args.includes('--heal')) {
  let healed = 0, skipped = 0, unavailable = 0;
  for (const [rel, why] of Object.entries(HEAL_AS_SHIM)) {
    const local = path.join(ROOT, rel);
    // path inside scripts/ (supports lib/ subpaths — S174)
    const name = rel.replace(/^scripts\//, '');
    if (fs.existsSync(local)) { skipped++; continue; }
    if (!fs.existsSync(path.join(SIBLING_SCRIPTS, ...name.split('/')))) { unavailable++; console.log(`  ~ ${rel}: not in sibling either — left absent`); continue; }
    fs.mkdirSync(path.dirname(local), { recursive: true });
    const depth = rel.split('/').length - 1; // hops from script file up to repo ROOT
    fs.writeFileSync(local, shimSource(name, why, depth), 'utf8');
    console.log(`  ✓ healed ${rel} (delegation shim → studio-ops)`);
    healed++;
  }
  console.log(`check-protocol-scripts --heal: ${healed} healed · ${skipped} already present · ${unavailable} unavailable`);
  process.exit(0);
}

function extractRefs(text) {
  const refs = new Set();
  // Match `node scripts/...mjs`, possibly with path args following
  const re = /node\s+(scripts\/[A-Za-z0-9_\-/.]+\.mjs)/g;
  let m;
  while ((m = re.exec(text)) !== null) refs.add(m[1]);
  return refs;
}

const referenced = new Set();
const perFile = {};
for (const rel of PROTOCOL_FILES) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  const text = fs.readFileSync(abs, 'utf8');
  const refs = [...extractRefs(text)];
  perFile[rel] = refs;
  for (const r of refs) referenced.add(r);
}

const present = [];
const allowedAbsent = [];
const propagationGap = [];
const unexpectedAbsent = [];

for (const ref of [...referenced].sort()) {
  if (fs.existsSync(path.join(ROOT, ref))) {
    present.push(ref);
  } else if (Object.hasOwn(KNOWN_ABSENT_ALLOWLIST, ref)) {
    allowedAbsent.push({ path: ref, reason: KNOWN_ABSENT_ALLOWLIST[ref] });
  } else if (Object.hasOwn(STUDIO_OPS_PROPAGATION_GAP, ref)) {
    propagationGap.push({ path: ref, role: STUDIO_OPS_PROPAGATION_GAP[ref], owner: 'vaultspark-studio-ops' });
  } else {
    unexpectedAbsent.push(ref);
  }
}

const payload = {
  schemaVersion: '1.0',
  checkedAt: new Date().toISOString(),
  protocolFiles: PROTOCOL_FILES.filter((f) => fs.existsSync(path.join(ROOT, f))),
  totals: {
    referenced: referenced.size,
    present: present.length,
    allowedAbsent: allowedAbsent.length,
    propagationGap: propagationGap.length,
    unexpectedAbsent: unexpectedAbsent.length,
  },
  unexpectedAbsent,
  allowedAbsent,
  propagationGap,
  present,
};

if (asJson) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  console.log(`check-protocol-scripts: ${present.length} present · ${allowedAbsent.length} allowed-absent · ${propagationGap.length} awaiting propagation · ${unexpectedAbsent.length} unexpected-absent (of ${referenced.size} referenced)`);
  if (allowedAbsent.length) {
    console.log('Allowed absences (intentional, studio-ops-side):');
    for (const e of allowedAbsent) console.log(`  · ${e.path} — ${e.reason}`);
  }
  if (propagationGap.length) {
    console.log('AWAITING PROPAGATION — canonical in studio-ops, per-project step, not yet propagated here:');
    for (const e of propagationGap) console.log(`  ~ ${e.path} — ${e.role} (owner: ${e.owner})`);
    console.log('  Fix path: Ark cargo to studio-ops requesting propagation — never re-implement locally (CANON-018/039).');
  }
  if (unexpectedAbsent.length) {
    console.log('UNEXPECTED ABSENCES — protocol references a script that should be in this repo:');
    for (const p of unexpectedAbsent) console.log(`  ⛔ ${p}`);
  }
}

if (infoOnly) process.exit(0);
process.exit(unexpectedAbsent.length === 0 ? 0 : 1);
