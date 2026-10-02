#!/usr/bin/env node
// verify-annual-checkout-contract.mjs — D-S368.1: annual billing is "coming later"
// and must NOT be buyable by default.
//
// Asserts:
//   - create-checkout refuses annual plan keys with 400 {code:'annual_not_offered'}
//     unless the ANNUAL_ENABLED env flag is explicitly on (strict opt-in parse);
//   - the gate runs before any price lookup, and the fixed annual price-ID map is
//     kept (so re-enabling is a flag flip, not a rewrite);
//   - api/membership-tiers.json flags annual as coming later with no annual price;
//   - public copy (assets/trust-depth.js) does not claim annual checkout is live
//     (reported as a warning; --strict makes it a failure).
//
//   node scripts/verify-annual-checkout-contract.mjs            verify the repo (same as --check)
//   node scripts/verify-annual-checkout-contract.mjs --check
//   node scripts/verify-annual-checkout-contract.mjs --strict   copy warnings fail too
//   node scripts/verify-annual-checkout-contract.mjs --self-test
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ANNUAL_KEYS = ['vault_sparked_annual', 'vault_sparked_pro_annual'];
const ANNUAL_PRICE_IDS = {
  vault_sparked_annual: 'price_1TNJPfGMN60PfJYsHKVkjL12',
  vault_sparked_pro_annual: 'price_1TNJPtGMN60PfJYsAXZYQNVj',
};
const LIVE_ANNUAL_COPY = /annual (?:paths?|checkout|plans?) (?:are|is) live|monthly and annual paths are live|save 25%/i;

export function verifyContract({ edge, policy, tiers, publicCopy = {} }) {
  const failures = [];
  const warnings = [];

  // ── Edge source wiring ──────────────────────────────────────────────────
  if (!/envFlagEnabled\(\s*Deno\.env\.get\(\s*'ANNUAL_ENABLED'\s*\)\s*\)/.test(edge)) {
    failures.push('create-checkout must read ANNUAL_ENABLED through envFlagEnabled(Deno.env.get(\'ANNUAL_ENABLED\'))');
  }
  const gateIdx = edge.indexOf('annualGate(plan, ANNUAL_ENABLED)');
  if (gateIdx === -1) failures.push('create-checkout must call annualGate(plan, ANNUAL_ENABLED)');
  const priceIdx = edge.search(/if \(ANNUAL_PRICE_IDS\[plan\]\)/);
  if (priceIdx === -1) failures.push('create-checkout must keep the ANNUAL_PRICE_IDS branch (flag-gated re-enable path)');
  if (gateIdx !== -1 && priceIdx !== -1 && gateIdx > priceIdx) {
    failures.push('annualGate must run before the annual price lookup');
  }
  const rpcIdx = edge.search(/\.rpc\(\s*'current_phase_price'/);
  if (gateIdx !== -1 && rpcIdx !== -1 && gateIdx > rpcIdx) {
    failures.push('annualGate must run before any phase price lookup');
  }
  for (const [key, id] of Object.entries(ANNUAL_PRICE_IDS)) {
    const m = edge.match(new RegExp(`${key}:\\s*'([^']+)'`));
    if (!m) failures.push(`create-checkout ANNUAL_PRICE_IDS missing ${key}`);
    else if (m[1] !== id) failures.push(`create-checkout ${key} price expected ${id}, got ${m[1]}`);
  }

  // ── Policy behaviour (pure module) ──────────────────────────────────────
  if (!policy || typeof policy.annualGate !== 'function' || typeof policy.envFlagEnabled !== 'function') {
    failures.push('create-checkout/policy.ts must export annualGate and envFlagEnabled');
  } else {
    for (const key of ANNUAL_KEYS) {
      const off = policy.annualGate(key, false);
      if (!off || off.status !== 400 || off.body?.code !== 'annual_not_offered') {
        failures.push(`${key} must be refused with 400 annual_not_offered while ANNUAL_ENABLED is off`);
      }
      if (policy.annualGate(key, true) !== null) failures.push(`${key} must pass the gate when ANNUAL_ENABLED is on`);
    }
    for (const monthly of ['vault_sparked', 'vault_sparked_pro']) {
      if (policy.annualGate(monthly, false) !== null) failures.push(`monthly plan ${monthly} must never hit the annual gate`);
    }
    for (const v of [undefined, null, '', 'false', '0', 'no', 'off', 'enabled?']) {
      if (policy.envFlagEnabled(v)) failures.push(`ANNUAL_ENABLED=${JSON.stringify(v)} must leave annual off`);
    }
    if (!policy.envFlagEnabled('true')) failures.push('ANNUAL_ENABLED=true must enable annual');
  }

  // ── Canonical tier feed ─────────────────────────────────────────────────
  const annual = tiers?.billing?.annual ?? findAnnualFlag(tiers);
  if (!annual || annual.comingLater !== true) failures.push('api/membership-tiers.json must flag annual billing comingLater: true');
  if (annual && annual.buyable !== false) failures.push('api/membership-tiers.json must mark annual billing buyable: false');
  for (const tier of tiers?.tiers || []) {
    if (tier?.price && tier.price.annual != null) failures.push(`tier ${tier.id} must not carry an annual price while annual is not offered`);
  }

  // ── Public copy ─────────────────────────────────────────────────────────
  for (const [file, text] of Object.entries(publicCopy)) {
    if (LIVE_ANNUAL_COPY.test(text || '')) warnings.push(`${file} still describes annual checkout as live`);
  }

  return { failures, warnings };
}

function findAnnualFlag(tiers) {
  if (!tiers || typeof tiers !== 'object') return null;
  for (const value of Object.values(tiers)) {
    if (value && typeof value === 'object' && value.annual && typeof value.annual === 'object') return value.annual;
  }
  return null;
}

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

async function loadRepo() {
  const policy = await import(pathToFileURL(join(root, 'supabase/functions/create-checkout/policy.ts')).href);
  const publicCopy = {};
  for (const rel of ['assets/trust-depth.js', 'vaultsparked/billing-toggle.js']) {
    if (existsSync(join(root, rel))) publicCopy[rel] = read(rel);
  }
  return {
    edge: read('supabase/functions/create-checkout/index.ts'),
    policy,
    tiers: JSON.parse(read('api/membership-tiers.json')),
    publicCopy,
  };
}

async function selfTest() {
  const repo = await loadRepo();
  const good = verifyContract({ ...repo, publicCopy: { 'copy.js': 'Annual plans: coming later.' } });
  const cases = [
    ['repo fixture passes', good.failures.length === 0, good.failures],
    ['copy fixture has no warnings', good.warnings.length === 0, good.warnings],
  ];
  const ungated = verifyContract({ ...repo, edge: repo.edge.replace('annualGate(plan, ANNUAL_ENABLED)', 'null') });
  cases.push(['missing gate fails', ungated.failures.some((f) => f.includes('annualGate(plan, ANNUAL_ENABLED)')), ungated.failures]);
  const open = verifyContract({ ...repo, policy: { ...repo.policy, annualGate: () => null } });
  cases.push(['gate that lets annual through fails', open.failures.some((f) => f.includes('annual_not_offered')), open.failures]);
  const loose = verifyContract({ ...repo, policy: { ...repo.policy, envFlagEnabled: (v) => !!v } });
  cases.push(['truthy flag parse fails', loose.failures.some((f) => f.includes('must leave annual off')), loose.failures]);
  const priced = verifyContract({ ...repo, tiers: { ...repo.tiers, tiers: [{ id: 'sparked', price: { annual: 44.99 } }] } });
  cases.push(['annual price in feed fails', priced.failures.some((f) => f.includes('annual price')), priced.failures]);
  const live = verifyContract({ ...repo, publicCopy: { 'x.js': 'Monthly and annual paths are live now.' } });
  cases.push(['live-annual copy warns', live.warnings.length === 1, live.warnings]);

  let bad = 0;
  for (const [label, ok, detail] of cases) {
    console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}`);
    if (!ok) { bad += 1; console.log('      ', JSON.stringify(detail)); }
  }
  if (bad) process.exit(1);
  console.log(`verify-annual-checkout-contract self-test: ${cases.length} cases passed.`);
}

async function main(argv) {
  if (argv.includes('--self-test')) return selfTest();
  const strict = argv.includes('--strict');
  const { failures, warnings } = verifyContract(await loadRepo());
  for (const w of warnings) console.warn(`WARN  ${w}`);
  const all = strict ? failures.concat(warnings) : failures;
  if (all.length) {
    console.error('Annual checkout contract verification failed:');
    for (const failure of all) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log('Annual checkout contract verified: annual is not offered by default (ANNUAL_ENABLED off), the gate precedes pricing, and the tier feed lists annual as coming later.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((err) => { console.error(err); process.exit(1); });
}
