#!/usr/bin/env node
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
 */

import { listCapabilities, resolveCapability } from './lib/secrets.mjs';

const args = process.argv.slice(2);
const capArg = args.includes('--for') ? args[args.indexOf('--for') + 1] : null;
const json = args.includes('--json');

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
    // CANON-019 forbids.
    const status = r.known === false ? '✗ UNKNOWN '
      : r.ok ? '✓ READY   '
        : r.required.length === 0 ? '◦ EXTERNAL'
          : (r.found.length ? '⚠ PARTIAL ' : '⛔ MISSING ');
    const detail = r.known === false
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
      detail.padEnd(42)
    );
  }
  console.log('');
  const unknown = rows.filter(r => r.known === false).length;
  if (unknown) {
    console.log(`${unknown} unrecognised capability name(s) — this is a caller error, NOT a missing credential. Fix the name and retry before labelling anything human-blocked.`);
  }
  const known = rows.filter(r => r.known !== false);
  const ready = known.filter(r => r.ok).length;
  console.log(`${ready}/${known.length} known capabilities ready. Missing → see docs/STUDIO_CANON.md + TASK_BOARD Human Action Required.`);
  console.log('');
}

if (capArg) {
  const result = resolveCapability(capArg);
  render([{ capability: capArg, ...result }]);
  // 0 ready · 1 credential genuinely absent (founder) · 3 unknown name (caller).
  // Distinct codes so a wrapper cannot fold a typo into a human-blocked label.
  process.exit(result.known === false ? 3 : result.ok ? 0 : 1);
} else {
  const rows = listCapabilities();
  render(rows);
  process.exit(0);
}
