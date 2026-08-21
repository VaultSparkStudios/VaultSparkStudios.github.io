#!/usr/bin/env node
// @verification-scope startup — secrets-gateway capability discovery.
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
import { listCapabilities, resolveCapability } from './lib/secrets.mjs';
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
    status: r.ok ? 'READY' : (r.found || []).length > 0 ? 'PARTIAL' : 'MISSING',
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
    // UNKNOWN is not MISSING. MISSING is a founder action (mint a credential);
    // UNKNOWN is an agent action (fix the name). Rendering them identically is
    // how a typo becomes a "human-blocked" label — the phantom blocker
    // CANON-019 forbids. Restored S316 after an inbound propagation delivered a
    // newer CLI that had never carried this distinction.
    const status = r.known === false ? '✗ UNKNOWN '
      : r.ok ? '✓ READY   '
        : r.required.length === 0 ? '◦ EXTERNAL'
          : (r.found.length ? '⚠ PARTIAL ' : '⛔ MISSING ');
    const keys = r.known === false
      ? (r.suggestions?.length ? `no such capability — did you mean ${r.suggestions.slice(0, 3).join(', ')}?` : 'no such capability in CAPABILITY_MAP.json')
      : r.ok
        ? `${r.found.length}/${r.required.length} all present`
        : r.required.length === 0
          ? 'no env keys — vault/OAuth capability'
          : r.missing.length > 3
            ? `missing ${r.missing.length}: ${r.missing.slice(0, 2).join(', ')}…`
            : `missing: ${r.missing.join(', ')}`;
    console.log(
      r.capability.padEnd(32) + ' ' +
      status.padEnd(10) + ' ' +
      keys.padEnd(42)
    );
  }
  console.log('');
  const unknown = rows.filter(r => r.known === false).length;
  if (unknown) {
    console.log(`${unknown} unrecognised capability name(s) — this is a caller error, NOT a missing credential. Fix the name and retry before labelling anything human-blocked.`);
  }
  const knownRows = rows.filter(r => r.known !== false);
  const ready = knownRows.filter(r => r.ok).length;
  console.log(`${ready}/${knownRows.length} known capabilities ready. Missing → see docs/STUDIO_CANON.md + TASK_BOARD Human Action Required.`);
  console.log('');
}

if (probe) {
  // Action-scoped grading: one capability, or every capability with a probe.
  const caps = capArg ? [capArg] : probeableCapabilities();
  const graded = caps.map((c) => gradeCapability(c, { refresh }));
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
  // 0 ready · 1 credential genuinely absent (founder) · 3 unknown name (caller).
  // Distinct codes so a wrapper cannot fold a typo into a human-blocked label.
  process.exit(result.known === false ? 3 : result.ok ? 0 : 1);
} else {
  const rows = listCapabilities();
  if (emit) emitCapabilityStatus(rows);
  else render(rows);
  process.exit(0);
}
