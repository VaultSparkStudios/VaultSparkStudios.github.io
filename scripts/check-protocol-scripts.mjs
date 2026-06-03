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
  'scripts/lib/skill-profile.mjs': 'medium-overlay resolver lives in studio-ops; per-project profiles propagated on demand',
  'scripts/sample-codebase.mjs': 'audit sampler is studio-ops-side; LLM-driven survey runs without it',
  'scripts/audit-run.mjs': 'optional orchestrator; /audit can write sidecar + md directly',
  'scripts/ark.mjs': 'Studio Ark transport is studio-ops-side; receipts auto-drain when present',
  'scripts/router.mjs': 'plain-English intent router lives in studio-ops; /start tolerates absence',
  'scripts/propagate-agents-sections.mjs': 'AGENTS.md propagator runs from studio-ops; targets this repo as a sibling',
  'scripts/render-founder-queue.mjs': 'founder-queue renderer is studio-ops-side; not bundled with public website repo',
  'scripts/studio-pulse.mjs': 'portfolio-level Studio Pulse runs from studio-ops, reads this repo via PROJECT_STATUS.json',
  'scripts/twin-ask.mjs': 'founder-twin verdict service lives in studio-ops; PreToolUse hook wires it when present',
};

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
const unexpectedAbsent = [];

for (const ref of [...referenced].sort()) {
  if (fs.existsSync(path.join(ROOT, ref))) {
    present.push(ref);
  } else if (Object.hasOwn(KNOWN_ABSENT_ALLOWLIST, ref)) {
    allowedAbsent.push({ path: ref, reason: KNOWN_ABSENT_ALLOWLIST[ref] });
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
    unexpectedAbsent: unexpectedAbsent.length,
  },
  unexpectedAbsent,
  allowedAbsent,
  present,
};

if (asJson) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  console.log(`check-protocol-scripts: ${present.length} present · ${allowedAbsent.length} allowed-absent · ${unexpectedAbsent.length} unexpected-absent (of ${referenced.size} referenced)`);
  if (allowedAbsent.length) {
    console.log('Allowed absences (intentional, studio-ops-side):');
    for (const e of allowedAbsent) console.log(`  · ${e.path} — ${e.reason}`);
  }
  if (unexpectedAbsent.length) {
    console.log('UNEXPECTED ABSENCES — protocol references a script that should be in this repo:');
    for (const p of unexpectedAbsent) console.log(`  ⛔ ${p}`);
  }
}

if (infoOnly) process.exit(0);
process.exit(unexpectedAbsent.length === 0 ? 0 : 1);
