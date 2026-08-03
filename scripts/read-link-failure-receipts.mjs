#!/usr/bin/env node
/**
 * read-link-failure-receipts.mjs — S304 (plan item 9).
 *
 * THE GAP IT CLOSES: since S303 the Worker writes a privacy-safe receipt
 * (`auth:linkfail:<ts>-<rand>` → {version, at, plane, code}) for every failed
 * identity link — but nothing READ them, so "we learn nothing from failed
 * first logins" was only half-fixed. This aggregates the KV records into
 * bounded counts and (with --write-evidence) records them in the identity
 * evidence file for the public receipt to summarize.
 *
 * Privacy is inherited, not re-argued: the Worker's receipts carry a bounded
 * code family and plane only (proven identifier-free by unit test); this
 * reader aggregates counts and stores NOTHING per-record.
 *
 * Honest-dark: no KV credentials → exit with `unmeasured`, never a fake zero.
 * Zero records with credentials → an honest "no failures observed".
 *
 * Usage:
 *   node scripts/read-link-failure-receipts.mjs --self-test
 *   node scripts/read-link-failure-receipts.mjs [--env production] [--write-evidence]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from './lib/safe-spawn.mjs';
import { envForSpawn, resolveCapability } from './lib/secrets.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EVIDENCE_PATH = path.join(ROOT, 'context', 'IDENTITY_MIGRATION_EVIDENCE.json');
const args = process.argv.slice(2);
const SELF_TEST = args.includes('--self-test');
const WRITE = args.includes('--write-evidence');
const TARGET = args.includes('--env') ? args[args.indexOf('--env') + 1] : 'production';

const NAMESPACES = { production: '6fde74ca7f3d462786afbb85c85611e0', staging: 'a723f2358dc940a495bf0b36bbece25b' };
const KNOWN_PLANES = new Set(['exchange', 'verify', 'link', 'session', 'unknown']);

/** Pure aggregation: KV values → bounded counts. Unknown shapes count as malformed, never crash. */
export function aggregate(records) {
  const byPlaneCode = {};
  let malformed = 0;
  let earliest = null;
  let latest = null;
  for (const raw of records) {
    let value;
    try { value = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { malformed++; continue; }
    const plane = KNOWN_PLANES.has(value?.plane) ? value.plane : 'unknown';
    const code = /^[a-z_]{1,64}$/.test(value?.code || '') ? value.code : 'unknown';
    byPlaneCode[plane] = byPlaneCode[plane] || {};
    byPlaneCode[plane][code] = (byPlaneCode[plane][code] || 0) + 1;
    if (Number.isFinite(value?.at)) {
      earliest = earliest === null ? value.at : Math.min(earliest, value.at);
      latest = latest === null ? value.at : Math.max(latest, value.at);
    }
  }
  const total = records.length - malformed;
  return { total, malformed, byPlaneCode, window: total ? { earliest, latest } : null };
}

function selfTest() {
  let pass = 0, fail = 0;
  const ok = (c, l) => { if (c) { pass++; console.log(`  ✓ ${l}`); } else { fail++; console.error(`  ✗ ${l}`); } };
  const agg = aggregate([
    JSON.stringify({ version: 1, at: 100, plane: 'link', code: 'identity_email_duplicate' }),
    JSON.stringify({ version: 1, at: 200, plane: 'link', code: 'identity_email_duplicate' }),
    JSON.stringify({ version: 1, at: 300, plane: 'exchange', code: 'token_exchange_failed' }),
  ]);
  ok(agg.total === 3 && agg.byPlaneCode.link.identity_email_duplicate === 2, 'counts aggregate by plane+code');
  ok(agg.window.earliest === 100 && agg.window.latest === 300, 'observation window from record stamps, not wall-clock');
  ok(aggregate(['{nope']).malformed === 1, 'malformed records are counted, never crash');
  ok(aggregate([JSON.stringify({ plane: 'lateral', code: 'DROP TABLE;--' })]).byPlaneCode.unknown.unknown === 1, 'unbounded values collapse to unknown — nothing free-text survives aggregation');
  ok(aggregate([]).total === 0 && aggregate([]).window === null, 'zero records is an honest zero with no window');
  console.log(`read-link-failure-receipts --self-test: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

function wrangler(cliArgs, env) {
  const bin = path.resolve(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
  const result = spawnSync(process.execPath, [bin, ...cliArgs], { cwd: ROOT, encoding: 'utf8', env });
  return { status: result.status ?? 1, stdout: result.stdout || '', stderr: result.stderr || '' };
}

async function main() {
  const namespace = NAMESPACES[TARGET];
  if (!namespace) { console.error(`unknown --env ${TARGET}`); process.exit(1); }
  const readiness = resolveCapability('cloudflare.deploy');
  if (!readiness.ok && !process.env.CLOUDFLARE_API_TOKEN) {
    console.log('read-link-failure-receipts: UNMEASURED — no cloudflare.deploy credentials (honest-dark, not zero)');
    process.exit(0);
  }
  const env = readiness.ok ? envForSpawn('cloudflare.deploy', ['CLOUDFLARE_API_TOKEN']) : { ...process.env };

  const list = wrangler(['kv', 'key', 'list', `--namespace-id=${namespace}`, '--prefix=auth:linkfail:'], env);
  if (list.status !== 0) { console.error(`kv list failed:\n${(list.stderr || list.stdout).slice(-300)}`); process.exit(1); }
  let keys;
  try { keys = JSON.parse(list.stdout).map((k) => k.name); }
  catch { console.error('kv list output unparseable'); process.exit(1); }

  const values = [];
  for (const key of keys) {
    const get = wrangler(['kv', 'key', 'get', key, `--namespace-id=${namespace}`], env);
    if (get.status === 0) values.push(get.stdout.trim());
  }
  const agg = aggregate(values);
  console.log(`read-link-failure-receipts (${TARGET}): ${agg.total} receipt(s) · ${agg.malformed} malformed`);
  for (const [plane, codes] of Object.entries(agg.byPlaneCode)) {
    for (const [code, count] of Object.entries(codes)) console.log(`  ${plane}/${code}: ${count}`);
  }

  if (WRITE) {
    const evidence = JSON.parse(fs.readFileSync(EVIDENCE_PATH, 'utf8'));
    evidence.linkFailureSignal = {
      asOf: new Date().toISOString(),
      source: `kv-scan:${TARGET}`,
      total: agg.total,
      malformed: agg.malformed,
      byPlaneCode: agg.byPlaneCode,
      window: agg.window,
    };
    fs.writeFileSync(EVIDENCE_PATH, JSON.stringify(evidence, null, 2) + '\n');
    console.log('evidence updated: linkFailureSignal (machine-produced from KV re-read)');
  }
}

if (SELF_TEST) selfTest(); else await main();
