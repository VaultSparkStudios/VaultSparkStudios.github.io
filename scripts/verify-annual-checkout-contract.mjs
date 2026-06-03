#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function requireMatch(label, text, pattern) {
  const match = text.match(pattern);
  if (!match) {
    failures.push(`${label}: missing ${pattern}`);
    return '';
  }
  return match[1] || match[0];
}

const failures = [];
const billing = read('vaultsparked/billing-toggle.js');
const checkout = read('vaultsparked/vaultsparked-checkout.js');
const edge = read('supabase/functions/create-checkout/index.ts');
const trustDepth = read('assets/trust-depth.js');

const annualSparkedPlan = requireMatch(
  'billing-toggle annual sparked plan',
  billing,
  /sparked:\s*'([^']+)'/
);
const annualProPlan = requireMatch(
  'billing-toggle annual pro plan',
  billing,
  /pro:\s*'([^']+)'/
);

if (annualSparkedPlan !== 'vault_sparked_annual') {
  failures.push(`billing-toggle annual sparked plan expected vault_sparked_annual, got ${annualSparkedPlan || 'missing'}`);
}
if (annualProPlan !== 'vault_sparked_pro_annual') {
  failures.push(`billing-toggle annual pro plan expected vault_sparked_pro_annual, got ${annualProPlan || 'missing'}`);
}

[
  ['checkout resolves sparked annual key', /plan === 'vault_sparked' && annualPlanKeys\.sparked/],
  ['checkout resolves pro annual key', /plan === 'vault_sparked_pro' && annualPlanKeys\.pro/],
  ['checkout invokes create-checkout edge function', /functions\.invoke\('create-checkout'/],
  ['checkout redirects unauthenticated visitors', /\/vault-member\/\?next=/],
].forEach(([label, pattern]) => requireMatch(label, checkout, pattern));

const sparkedPrice = requireMatch(
  'edge annual sparked price',
  edge,
  /vault_sparked_annual:\s*'([^']+)'/
);
const proPrice = requireMatch(
  'edge annual pro price',
  edge,
  /vault_sparked_pro_annual:\s*'([^']+)'/
);

if (sparkedPrice !== 'price_1TNJPfGMN60PfJYsHKVkjL12') {
  failures.push(`edge annual sparked price expected price_1TNJPfGMN60PfJYsHKVkjL12, got ${sparkedPrice || 'missing'}`);
}
if (proPrice !== 'price_1TNJPtGMN60PfJYsAXZYQNVj') {
  failures.push(`edge annual pro price expected price_1TNJPtGMN60PfJYsAXZYQNVj, got ${proPrice || 'missing'}`);
}

[
  ['edge annual sparked success URL includes billing=annual', /vault_sparked_annual:\s*`\$\{APP_URL\}\/vault-member\/\?checkout=success&plan=sparked&billing=annual`/],
  ['edge annual pro success URL includes billing=annual', /vault_sparked_pro_annual:\s*`\$\{APP_URL\}\/vault-member\/\?checkout=success&plan=pro&billing=annual`/],
  ['edge annual plans bypass phase slot', /if \(ANNUAL_PRICE_IDS\[plan\]\)/],
].forEach(([label, pattern]) => requireMatch(label, edge, pattern));

if (/annual checkout honestly blocked|until the real yearly plans exist|not live yet/i.test(trustDepth)) {
  failures.push('trust-depth still describes annual checkout as unavailable');
}

if (failures.length) {
  console.error('Annual checkout contract verification failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('Annual checkout contract verified: UI plan keys, edge price IDs, success URLs, and public copy are in sync.');
