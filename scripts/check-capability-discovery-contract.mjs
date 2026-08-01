#!/usr/bin/env node
/**
 * Contract gate — capability discovery must never manufacture a phantom blocker.
 *
 * CANON-019 requires an agent to run secrets discovery before labelling anything
 * human-blocked. That makes the discovery tool's OUTPUT vocabulary safety-
 * critical, because whatever it says is what gets escalated to the founder:
 *
 *   MISSING  → the credential does not exist. A human must mint it.
 *   UNKNOWN  → the capability NAME does not exist. The agent must fix the name.
 *
 * Before this gate, `resolveCapability` returned the same empty-`missing` shape
 * for both, so `--for supabase` (no such capability — the real entries are
 * `supabase.admin` and `supabase.client`) rendered as an absent credential while
 * all four Supabase authority planes probed ready. The discovery tool built to
 * prevent phantom blockers was generating one.
 *
 * Usage:
 *   node scripts/check-capability-discovery-contract.mjs --self-test
 *   node scripts/check-capability-discovery-contract.mjs            # live map
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveCapability, suggestCapabilities } from './lib/secrets.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(ROOT, 'scripts', 'check-secrets.mjs');
const CATALOGUE = ['cloudflare', 'cloudflare.deploy', 'cloudflare.dns', 'supabase.admin', 'supabase.client', 'stripe.checkout'];

/** Run the CLI and capture its exit code without letting a non-zero throw. */
function cli(args) {
  try {
    return { code: 0, out: execFileSync(process.execPath, [CLI, ...args], { encoding: 'utf8' }) };
  } catch (error) {
    return { code: error.status ?? -1, out: `${error.stdout || ''}${error.stderr || ''}` };
  }
}

function selfTest() {
  const cases = [
    ['a bare namespace suggests its real children',
      suggestCapabilities('supabase', CATALOGUE).slice(0, 2).join(',') === 'supabase.admin,supabase.client'],
    ['a truncated name suggests the full one',
      suggestCapabilities('cloudflar', CATALOGUE).includes('cloudflare')],
    ['an exact name ranks itself first',
      suggestCapabilities('cloudflare.deploy', CATALOGUE)[0] === 'cloudflare.deploy'],
    ['a nonsense query suggests nothing rather than everything',
      suggestCapabilities('zzzzzzzz', CATALOGUE).length === 0],
    ['suggestions are deterministic across calls',
      JSON.stringify(suggestCapabilities('cloudflare', CATALOGUE)) === JSON.stringify(suggestCapabilities('cloudflare', CATALOGUE))],
    ['suggestions are bounded', suggestCapabilities('c', [...CATALOGUE, ...Array.from({ length: 40 }, (_, i) => `c.${i}`)]).length <= 5],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  cases.forEach(([label, ok]) => console.log(`  ${ok ? 'ok' : 'fail'} ${label}`));
  console.log(`capability-discovery-contract self-test: ${cases.length - failed.length}/${cases.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

function liveCheck() {
  const unknownName = 'definitely-not-a-capability-vaultspark-contract-probe';
  const unknown = resolveCapability(unknownName);
  const known = resolveCapability('cloudflare.deploy');

  // A public CI checkout has no studio-ops sibling, so the capability map is
  // legitimately unreachable and EVERY name is unknown. That makes the
  // known-vs-unknown separation unobservable rather than broken — report it as
  // explicitly unverifiable instead of failing (or, worse, passing vacuously,
  // since the unknown-side assertions would all still hold).
  if (known.known === false) {
    console.log('  skip capability map unreachable (no studio-ops sibling) — separation is unverifiable here, not broken');
    console.log('capability-discovery-contract: SKIPPED (map unavailable)');
    process.exit(0);
  }

  const unknownCli = cli(['--for', unknownName]);
  const knownCli = cli(['--for', 'cloudflare.deploy']);

  const cases = [
    ['an unknown capability is flagged unknown, not merely not-ok', unknown.known === false],
    ['an unknown capability is never ok', unknown.ok === false],
    ['a real capability is flagged known', known.known === true],
    ['the live map still defines cloudflare.deploy', known.required.length > 0],
    // The decisive separation: an unknown name must not be reportable as a
    // missing credential, in either the human render or the exit code.
    ['the CLI renders UNKNOWN, never MISSING, for an unknown name',
      /UNKNOWN/.test(unknownCli.out) && !/MISSING\s+no such/.test(unknownCli.out)],
    ['the CLI exit code for an unknown name is distinct from a missing credential',
      unknownCli.code === 3],
    ['the CLI still exits 0 for a ready capability', knownCli.code === 0],
    ['the CLI names the caller error explicitly', /caller error/i.test(unknownCli.out)],
  ];

  const failed = cases.filter(([, ok]) => !ok);
  cases.forEach(([label, ok]) => console.log(`  ${ok ? 'ok' : 'fail'} ${label}`));
  console.log(`capability-discovery-contract: ${cases.length - failed.length}/${cases.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

if (process.argv.includes('--self-test')) selfTest();
else liveCheck();
