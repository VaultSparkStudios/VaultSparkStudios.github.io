#!/usr/bin/env node
// @verification-scope startup — reads LIVE credentials through the secrets gateway,
// so its verdict describes this machine, not this tree; wiring it into build:check
// would make the build fail on a laptop without credentials and pass in CI for the
// wrong reason. Genuinely invoked: /start step 2 runs it (`--audit`) and
// scripts/git-hooks/pre-push runs it before every push. Declared S363.
/**
 * check-secrets.mjs — Secrets discovery CLI (v3.1)
 *
 * Agents MUST run this (or call `resolveCapability` from lib/secrets.mjs)
 * before labeling a task "Human Action Required". AGENTS.md v3.1 rule.
 *
 * Usage:
 *   node scripts/check-secrets.mjs                        # list all capabilities
 *   node scripts/check-secrets.mjs --for <capability>     # check one
 *   node scripts/check-secrets.mjs --json                 # machine output
 *   node scripts/check-secrets.mjs --for claude.api --json
 *   node scripts/check-secrets.mjs --for cloudflare --probe [--refresh]
 *                                  # S266 (S259 #1): action-scoped grade —
 *                                  # ACTION-VERIFIED / DEGRADED, not just presence
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listCapabilities, resolveCapability, describeCapability } from './lib/secrets.mjs';
import { gradeCapability, probeableCapabilities } from './lib/capability-action-probes.mjs';

const args = process.argv.slice(2);
const capArg = args.includes('--for') ? args[args.indexOf('--for') + 1] : null;
const json = args.includes('--json');
const probe = args.includes('--probe');
const refresh = args.includes('--refresh');
// S271: --emit writes a machine-readable capability STATUS artifact for the
// Studio Ops Console. It records capability names, readiness grade, and WHICH
// env var names are absent — never a value, never a partial value. The console
// is a browser surface; secrets resolve server-side through the gateway only
// (CANON-012). Without this artifact the console's secrets tile is honestly
// unavailable rather than guessed, which is why it is emitted explicitly.
const emit = args.includes('--emit');

function emitCapabilityStatus(rows) {
  const capabilities = rows.map((r) => ({
    capability: r.capability,
    ok: Boolean(r.ok),
    // S313 [audit #1] — the console tile inherits the gateway's reason rather than
    // re-deriving status from found.length, which cannot see the difference between a
    // credential-free capability, an unknown name, and a genuinely empty credential set.
    status: r.ok
      ? 'READY'
      : r.reason === 'unknown-capability' ? 'UNKNOWN'
        : r.reason === 'map-absent' || r.reason === 'map-unreadable' ? 'NO-MAP'
          : (r.found || []).length > 0 ? 'PARTIAL' : 'MISSING',
    reason: r.reason,
    cause: describeCapability(r),
    requiredCount: (r.required || []).length,
    presentCount: (r.found || []).length,
    missingKeys: r.missing || [],   // NAMES only — no values, ever
  }));
  const payload = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    generatedBy: 'scripts/check-secrets.mjs --emit',
    contract: 'capability names and absent env-var NAMES only; never values (CANON-012)',
    total: capabilities.length,
    ready: capabilities.filter((c) => c.status === 'READY').length,
    partial: capabilities.filter((c) => c.status === 'PARTIAL').length,
    missing: capabilities.filter((c) => c.status === 'MISSING').length,
    unknown: capabilities.filter((c) => c.status === 'UNKNOWN').length,
    noMap: capabilities.filter((c) => c.status === 'NO-MAP').length,
    capabilities,
  };
  const out = new URL('../portfolio/CAPABILITY_STATUS.json', import.meta.url);
  fs.mkdirSync(path.dirname(fileURLToPath(out)), { recursive: true });
  fs.writeFileSync(fileURLToPath(out), JSON.stringify(payload, null, 2) + '\n');
  console.log(`✓ capability status → portfolio/CAPABILITY_STATUS.json  (${payload.ready}/${payload.total} ready · ${payload.partial} partial · ${payload.missing} missing)`);
}

function render(rows) {
  if (json) {
    process.stdout.write(JSON.stringify(rows, null, 2) + '\n');
    return;
  }
  const cols = [
    ['Capability', 32],
    ['Status',      10],
    ['Keys present', 42],
  ];
  const line = cols.map(([h, w]) => h.padEnd(w)).join(' ');
  const sep  = cols.map(([, w]) => '─'.repeat(w)).join(' ');
  console.log('\n' + line);
  console.log(sep);
  for (const r of rows) {
    // S313 [audit #1] — status and cause both derive from the gateway's `reason`, never
    // from `missing.length`. A credential-free capability is READY, an unknown name is a
    // spelling defect, and neither may render as `⛔ MISSING  missing:` with an empty cause.
    const status = r.ok
      ? '✓ READY   '
      : r.reason === 'unknown-capability' ? '? UNKNOWN '
        : r.reason === 'map-absent' || r.reason === 'map-unreadable' ? '· NO MAP  '
          : (r.found.length ? '⚠ PARTIAL ' : '⛔ MISSING ');
    const keys = describeCapability(r);
    console.log(
      r.capability.padEnd(32) + ' ' +
      status.padEnd(10) + ' ' +
      keys.padEnd(42)
    );
  }
  console.log('');
  // S363 — restored after the same inbound propagation that reverted
  // lib/secrets.mjs also flattened this render. Two distinctions were lost, and
  // both of them exist to stop a phantom blocker (CANON-019):
  //   · an unrecognised NAME is a caller error, not a missing credential. Folded
  //     into the plain tally, a typo reads as "a human must mint this".
  //   · a capability can be PRESENT and its last action probe FAILING (S349).
  //     Counting those as ready is how `✓ READY 2/2 all present` got printed for
  //     a capability whose own entry recorded `auth-error`.
  // The denominator is scoped to KNOWN capabilities for the same reason: an
  // unknown name must not quietly enlarge the "not ready" count.
  const unknown = rows.filter(r => r.known === false).length;
  if (unknown) {
    console.log(`${unknown} unrecognised capability name(s) — this is a caller error, NOT a missing credential. Fix the name and retry before labelling anything human-blocked.`);
  }
  const knownRows = rows.filter(r => r.known !== false);
  const failing = knownRows.filter(r => r.ok && r.probeFailing);
  if (failing.length) {
    console.log(`${failing.length} capability(ies) are PRESENT but their last action probe FAILED: ${failing.map(r => `${r.capability} (${r.lastProbeStatus})`).join(', ')}.`);
    console.log('Presence is not health — do not treat these as usable without re-probing (`--for <cap> --probe --refresh`).');
  }
  const ready = knownRows.filter(r => r.ok && !r.probeFailing).length;
  console.log(`${ready}/${knownRows.length} known capabilities ready. Missing → see docs/STUDIO_CANON.md + TASK_BOARD Human Action Required.`);
  console.log('');
}

if (probe) {
  // Action-scoped grading: one capability, or every capability with a probe.
  const caps = capArg ? [capArg] : probeableCapabilities();
  const graded = await Promise.all(caps.map((c) => gradeCapability(c, { refresh })));
  if (json) {
    process.stdout.write(JSON.stringify(graded, null, 2) + '\n');
  } else {
    console.log('');
    for (const g of graded) {
      const badge = { 'ACTION-VERIFIED': '✓ ACTION-VERIFIED', DEGRADED: '⚠ DEGRADED', READY: '✓ READY (presence-only)', PARTIAL: '⚠ PARTIAL', MISSING: '⛔ MISSING' }[g.grade];
      console.log(`${g.capability.padEnd(28)} ${badge}${g.cached ? ' (cached)' : ''}`);
      if (g.action) console.log(`${''.padEnd(28)}   action: ${g.action}`);
      if (g.detail) console.log(`${''.padEnd(28)}   ${g.detail}`);
    }
    console.log('');
  }
  process.exit(graded.every((g) => g.grade === 'ACTION-VERIFIED' || g.grade === 'READY') ? 0 : 1);
} else if (capArg) {
  const result = resolveCapability(capArg);
  render([{ capability: capArg, ...result }]);
  // S363 — exit 3 is the machine-readable half of the same separation: a caller
  // that cannot tell "you typed the name wrong" (3) from "the credential is
  // genuinely absent" (1) will escalate a typo to the founder.
  process.exit(result.known === false ? 3 : result.ok ? 0 : 1);
} else {
  const rows = listCapabilities();
  if (emit) emitCapabilityStatus(rows);
  else render(rows);
  process.exit(0);
}
