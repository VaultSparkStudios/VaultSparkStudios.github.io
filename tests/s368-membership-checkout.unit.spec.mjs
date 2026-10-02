// s368-membership-checkout.unit.spec.mjs — D-S368.1 server contract.
// The checkout/webhook policies are plain TypeScript with no remote imports, so
// Node's built-in type stripping (Node >= 23.6) imports them directly.
// Run: node --test tests/s368-membership-checkout.unit.spec.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  annualGate,
  envFlagEnabled,
  existingSubscriptionGate,
  isLiveSubscription,
  isUsablePriceId,
} from '../supabase/functions/create-checkout/policy.ts';
import {
  giftDurationDays,
  giftExpiresAt,
  giftMemberUpdate,
  parsePhase,
  shouldClaimPhaseSlot,
  storedSubscriptionStatus,
} from '../supabase/functions/stripe-webhook/policy.ts';
import {
  normalizePlanKey,
  isVaultSparkedPlan,
  isVaultSparkedProPlan,
  hasEntitlement,
  CONFIG as EDGE_CONFIG,
} from '../supabase/functions/_shared/membershipAccess.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// ── create-checkout: annual gate ────────────────────────────────────────────
test('annual plans are refused with 400 annual_not_offered while ANNUAL_ENABLED is off', () => {
  for (const plan of ['vault_sparked_annual', 'vault_sparked_pro_annual']) {
    const r = annualGate(plan, false);
    assert.equal(r.status, 400);
    assert.equal(r.body.code, 'annual_not_offered');
    assert.equal(annualGate(plan, true), null, 'explicit flag re-opens annual');
  }
  assert.equal(annualGate('vault_sparked', false), null);
  assert.equal(annualGate('vault_sparked_pro', false), null);
  assert.equal(annualGate('promogrind_pro', false), null);
});

test('ANNUAL_ENABLED / GIFT_ENABLED parse is strict opt-in', () => {
  for (const v of [undefined, null, '', 'false', '0', 'off', 'no', 'TRUE!']) assert.equal(envFlagEnabled(v), false, String(v));
  for (const v of ['true', 'TRUE', '1', 'yes', 'on', ' true ']) assert.equal(envFlagEnabled(v), true, String(v));
});

// ── create-checkout: double-billing guard ──────────────────────────────────
test('no live subscription → checkout proceeds', () => {
  assert.equal(existingSubscriptionGate('vault_sparked', null), null);
  for (const status of ['canceled', 'inactive', 'incomplete_expired', '', null]) {
    assert.equal(existingSubscriptionGate('vault_sparked', { plan: 'vault_sparked', status }), null, String(status));
  }
});

test('same plan while active or trialing → 409 already_subscribed', () => {
  for (const status of ['active', 'trialing', 'ACTIVE']) {
    const r = existingSubscriptionGate('vault_sparked', { plan: 'vault_sparked', status });
    assert.equal(r.status, 409);
    assert.equal(r.body.code, 'already_subscribed');
    assert.equal(r.body.portal, undefined);
  }
});

test('different plan → 409 plan_change_via_billing with portal:true', () => {
  const up = existingSubscriptionGate('vault_sparked_pro', { plan: 'vault_sparked', status: 'active' });
  assert.equal(up.status, 409);
  assert.equal(up.body.code, 'plan_change_via_billing');
  assert.equal(up.body.portal, true);
  assert.equal(up.body.current_plan, 'vault_sparked');
  assert.equal(up.body.requested_plan, 'vault_sparked_pro');
  const down = existingSubscriptionGate('vault_sparked', { plan: 'vault_sparked_pro', status: 'trialing' });
  assert.equal(down.body.code, 'plan_change_via_billing');
});

test('past_due / unpaid on the same plan routes to the billing portal, never a second subscription', () => {
  for (const status of ['past_due', 'unpaid']) {
    assert.equal(isLiveSubscription({ status }), true);
    const r = existingSubscriptionGate('vault_sparked', { plan: 'vault_sparked', status });
    assert.equal(r.status, 409);
    assert.equal(r.body.code, 'plan_change_via_billing');
    assert.equal(r.body.portal, true);
  }
});

test('plan comparison normalizes aliases', () => {
  const r = existingSubscriptionGate('pro', { plan: 'promogrind_pro', status: 'active' }, normalizePlanKey);
  assert.equal(r.body.code, 'already_subscribed');
});

test('placeholder price IDs from the phase54 seed are never sent to Stripe', () => {
  assert.equal(isUsablePriceId('price_SPARKED_P1_REPLACE_ME'), false);
  assert.equal(isUsablePriceId(''), false);
  assert.equal(isUsablePriceId(null), false);
  assert.equal(isUsablePriceId('prod_123'), false);
  assert.equal(isUsablePriceId('price_1TNJPfGMN60PfJYsHKVkjL12'), true);
});

// ── create-checkout: source wiring ─────────────────────────────────────────
test('create-checkout no longer reserves a phase slot at session creation', () => {
  const src = read('supabase/functions/create-checkout/index.ts');
  assert.ok(!/rpc\(\s*'reserve_phase_slot'/.test(src), 'reserve_phase_slot must not be called');
  assert.match(src, /rpc\(\s*'current_phase_price',\s*\{\s*p_plan:\s*plan\s*\}/);
  const gate = src.indexOf('annualGate(plan, ANNUAL_ENABLED)');
  const dup = src.indexOf('existingSubscriptionGate(plan, sub, normalizePlanKey)');
  const price = src.indexOf("rpc('current_phase_price'");
  const session = src.indexOf('stripe.checkout.sessions.create');
  assert.ok(gate > 0 && dup > gate && price > dup && session > price, 'gate → duplicate check → price → session');
  assert.ok(src.indexOf('stripe.customers.create') > dup, 'no Stripe customer is created before the duplicate check');
});

test('create-gift-checkout answers 410 gift_unavailable before any Stripe call unless GIFT_ENABLED', () => {
  const src = read('supabase/functions/create-gift-checkout/index.ts');
  const gate = src.indexOf('if (!GIFT_ENABLED)');
  assert.ok(gate > 0);
  assert.ok(gate < src.indexOf('stripe.checkout.sessions.create'));
  assert.ok(gate < src.indexOf('supabase.auth.getUser'));
  assert.match(src, /code: 'gift_unavailable' \}, cors, 410\)/);
  assert.match(src, /GIFT_ENABLED = \/\^\(true\|1\|yes\|on\)\$\/i\.test/);
  assert.ok(!/\$24\.99/.test(src), 'no stale gift price');
});

// ── stripe-webhook policy ──────────────────────────────────────────────────
test('phase slot is claimed only for paid subscription checkouts of phase plans', () => {
  assert.equal(shouldClaimPhaseSlot({ mode: 'subscription', plan: 'vault_sparked', paymentStatus: 'paid' }), true);
  assert.equal(shouldClaimPhaseSlot({ mode: 'subscription', plan: 'vault_sparked_pro', paymentStatus: 'no_payment_required' }), true);
  assert.equal(shouldClaimPhaseSlot({ mode: 'subscription', plan: 'vault_sparked', paymentStatus: 'unpaid' }), false);
  assert.equal(shouldClaimPhaseSlot({ mode: 'payment', plan: 'vault_sparked', paymentStatus: 'paid' }), false);
  assert.equal(shouldClaimPhaseSlot({ mode: 'subscription', plan: 'promogrind_pro', paymentStatus: 'paid' }), false);
  assert.equal(shouldClaimPhaseSlot({ mode: 'subscription', plan: 'vault_sparked_annual', paymentStatus: 'paid' }), false);
});

test('enrolled phase parse', () => {
  assert.equal(parsePhase('2'), 2);
  assert.equal(parsePhase(undefined), null);
  assert.equal(parsePhase('0'), null);
  assert.equal(parsePhase('abc'), null);
});

test('gift grants expire within 30 days', () => {
  assert.equal(giftDurationDays('30'), 30);
  assert.equal(giftDurationDays('365'), 30);
  assert.equal(giftDurationDays('7'), 7);
  assert.equal(giftDurationDays(undefined), 30);
  assert.equal(giftDurationDays('-5'), 30);
  const now = Date.UTC(2026, 9, 2);
  assert.equal(giftExpiresAt(now, 30), new Date(now + 30 * 86400000).toISOString());
  assert.equal(giftExpiresAt(now, 90), new Date(now + 30 * 86400000).toISOString());
});

test('a gift never downgrades an Eternal member', () => {
  assert.equal(giftMemberUpdate({ plan_key: 'vault_sparked_pro' }), null);
  assert.deepEqual(giftMemberUpdate({ plan_key: 'free' }), { is_sparked: true, plan_key: 'vault_sparked' });
  assert.deepEqual(giftMemberUpdate(null), { is_sparked: true, plan_key: 'vault_sparked' });
});

test('stored subscription status keeps trialing visible to the double-billing guard', () => {
  assert.equal(storedSubscriptionStatus('active'), 'active');
  assert.equal(storedSubscriptionStatus('trialing'), 'trialing');
  assert.equal(storedSubscriptionStatus('incomplete'), 'inactive');
});

test('stripe-webhook claims the slot with the session id and records gift expiry idempotently', () => {
  const src = read('supabase/functions/stripe-webhook/index.ts');
  assert.match(src, /rpc\('claim_phase_slot',\s*\{\s*p_plan:\s*plan,\s*p_session_id:\s*session\.id,/);
  assert.match(src, /expires_at:\s*expiresAt/);
  assert.match(src, /\.eq\('stripe_session_id', session\.id\)/);
});

// ── migration ──────────────────────────────────────────────────────────────
test('migration splits the phase RPC and guards gift expiry', () => {
  const sql = read('supabase/migrations/supabase-s368-membership-checkout-integrity.sql');
  assert.match(sql, /create table if not exists public\.membership_phase_claims \(\s*session_id\s+text primary key/);
  assert.match(sql, /create or replace function public\.current_phase_price\(p_plan text\)[\s\S]*?\bstable\b/);
  assert.match(sql, /create or replace function public\.claim_phase_slot\(/);
  assert.match(sql, /on conflict \(session_id\) do nothing/);
  assert.ok(!/create or replace function public\.reserve_phase_slot/.test(sql), 'reserve_phase_slot is kept as-is');
  const expire = sql.slice(sql.indexOf('function public.expire_gift_sparked'));
  assert.match(expire, /not exists \(\s*select 1 from public\.subscriptions s[\s\S]*?'active', 'trialing', 'past_due', 'unpaid'/);
  assert.match(expire, /in \('vault_sparked', 'free'\)/);
  assert.match(expire, /g\.expires_at is null or g\.expires_at > now\(\)/);
  for (const fn of ['current_phase_price(text)', 'claim_phase_slot(text, text, smallint, uuid)', 'expire_gift_sparked()']) {
    assert.ok(sql.includes(`revoke all on function public.${fn} from public, anon, authenticated`), fn);
  }
  assert.ok(!/cron\.schedule/.test(sql), 'migrations do not use pg_cron');
});

// ── membership access generator ────────────────────────────────────────────
test('generated browser and edge helpers agree with config/membership-entitlements.json', async () => {
  const config = JSON.parse(read('config/membership-entitlements.json'));
  const out = execFileSync(process.execPath, ['scripts/generate-membership-access.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.match(out, /ok\s+assets\/membership-access\.js/);
  assert.match(out, /ok\s+supabase\/functions\/_shared\/membershipAccess\.ts/);

  assert.deepEqual(EDGE_CONFIG, config);
  const sandbox = {};
  vm.runInNewContext(read('assets/membership-access.js'), { globalThis: sandbox });
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.VSMembership.config)), config);

  for (const plan of ['free', 'vault_sparked', 'vault_sparked_pro', 'promogrind_pro', 'pro', '']) {
    assert.equal(sandbox.VSMembership.isVaultSparkedPlan(plan), isVaultSparkedPlan(plan), plan);
    assert.equal(sandbox.VSMembership.isVaultSparkedProPlan(plan), isVaultSparkedProPlan(plan), plan);
  }
  for (const feature of Object.keys(config.features)) {
    for (const planKey of ['free', 'vault_sparked', 'vault_sparked_pro']) {
      const ctx = { planKey, points: 0 };
      assert.equal(sandbox.VSMembership.hasEntitlement(feature, ctx), hasEntitlement(feature, ctx), `${feature}/${planKey}`);
    }
  }
  assert.equal(config.plans.vault_sparked.priceDisplay, '$4.99/mo');
  assert.equal(config.plans.vault_sparked_pro.priceDisplay, '$29.99/mo');
  assert.equal(config.plans.vault_sparked_pro.label, 'VaultSparked Eternal');
});

test('generator PLAN_ORDER ranks Eternal above VaultSparked', async () => {
  const { buildOutputs } = await import(pathToFileURL(path.join(ROOT, 'scripts/generate-membership-access.mjs')).href);
  const config = JSON.parse(read('config/membership-entitlements.json'));
  const { edge, browser } = buildOutputs(config, {});
  for (const src of [edge, browser]) assert.match(src, /vault_sparked: 2,\n\s*vault_sparked_pro: 3,/);
  assert.throws(() => buildOutputs({ ...config, plans: { ...config.plans, mystery: {} } }, {}), /PLAN_ORDER is missing plan "mystery"/);
});

// ── ask-ignis prompt copy ──────────────────────────────────────────────────
test('ask-ignis prompts point at /membership/ and carry ruling-true tier wording', () => {
  const src = read('supabase/functions/ask-ignis/index.ts');
  assert.ok(!/\/vaultsparked\//.test(src), 'no /vaultsparked/ links');
  assert.ok(!/\/membership-value\//.test(src), 'no dead /membership-value/ link');
  assert.ok(!/2x XP|2× XP|\$24\.99|Vault Eternal|sealed-vault preview drops|exclusive lore drops/i.test(src));
  assert.match(src, /VAULTSPARKED \(\$4\.99\/mo, billed monthly\)/);
  assert.match(src, /VAULTSPARKED ETERNAL \(\$29\.99\/mo, billed monthly\)/);
});
