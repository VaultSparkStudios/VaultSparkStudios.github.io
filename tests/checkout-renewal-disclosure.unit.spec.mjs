import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import * as policy from '../supabase/functions/create-checkout/policy.ts';
import { normalizePlanKey } from '../supabase/functions/_shared/membershipAccess.ts';

function checkout({ annual = false, authenticated = true } = {}) {
  let handler, captured;
  const chain = { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: null }; } };
  const supabase = {
    auth: { async getUser() { return authenticated ? { data: { user: { id: 'owned-test-member', email: 'member@example.test' } } } : { data: { user: null }, error: {} }; } },
    from() { return chain; },
    async rpc() { return { data: { ok: true, stripe_price_id: 'price_test_phase', phase: 2 } }; },
  };
  class Stripe {
    static createFetchHttpClient() { return {}; }
    customers = { async create() { return { id: 'cus_test_owned' }; } };
    checkout = { sessions: { async create(params) { captured = params; return { url: 'https://checkout.stripe.test/session' }; } } };
  }
  const source = fs.readFileSync(new URL('../supabase/functions/create-checkout/index.ts', import.meta.url), 'utf8')
    .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];\s*$/gm, '');
  vm.runInNewContext(stripTypeScriptTypes(source), {
    ...policy, normalizePlanKey, Stripe, createClient: () => supabase,
    serve: fn => { handler = fn; }, Request, Response, console,
    Deno: { env: { get: key => ({ APP_URL: 'https://vaultsparkstudios.com', ANNUAL_ENABLED: String(annual), STRIPE_PRICE_ID: 'price_legacy' })[key] } },
  });
  return { async request(plan) { return handler(new Request('https://functions.example.test/create-checkout', {
    method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }),
  })); }, params: () => captured };
}

test('actual website checkout payload discloses renewal without changing the phase price', async () => {
  for (const plan of ['vault_sparked', 'vault_sparked_pro']) {
    const route = checkout();
    assert.equal((await route.request(plan)).status, 200);
    const params = route.params();
    assert.match(params.custom_text.submit.message, /renews automatically/);
    assert.match(params.custom_text.submit.message, /billing interval shown/);
    assert.match(params.custom_text.submit.message, /Manage billing/);
    assert.match(params.custom_text.submit.message, /https:\/\/vaultsparkstudios\.com\/subscription-terms\//);
    assert.ok(params.custom_text.submit.message.length <= 1200);
    assert.equal(params.line_items[0].price, 'price_test_phase');
    assert.equal(params.metadata.plan, plan);
  }
});

test('legacy PromoGrind checkout does not receive website membership terms', async () => {
  const route = checkout();
  assert.equal((await route.request('promogrind_pro')).status, 200);
  assert.equal(route.params().custom_text, undefined);
  assert.equal(route.params().line_items[0].price, 'price_legacy');
});

test('renewal disclosure does not reopen annual billing or create a session for an invalid identity', async () => {
  const annual = checkout();
  assert.equal((await annual.request('vault_sparked_annual')).status, 400);
  assert.equal(annual.params(), undefined);
  const denied = checkout({ authenticated: false });
  assert.equal((await denied.request('vault_sparked')).status, 401);
  assert.equal(denied.params(), undefined);
});
