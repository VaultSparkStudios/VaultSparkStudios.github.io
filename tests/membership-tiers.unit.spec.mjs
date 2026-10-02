// membership-tiers.unit.spec.mjs — D-S368.1 membership truth contract.
// api/membership-tiers.json is the single source for every membership surface.
// These checks keep /membership/, the portal and the account chip agreeing with
// it, and keep removed (never-enforced) perks from creeping back into copy.
// Run: node --test tests/membership-tiers.unit.spec.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const feed = JSON.parse(read('api/membership-tiers.json'));
const tier = (id) => feed.tiers.find((t) => t.id === id);

// Phrases for perks that were advertised but never enforced. None may appear on
// the surfaces this contract owns.
const REMOVED = [
  /[23]\s*[×x]\s*XP/i,
  /XP multiplier/i,
  /\b(20|35)%\s*(studio\s*)?discount/i,
  /rank loyalty/i,
  /priority challenge queue/i,
  /co-dev input/i,
  /direct studio channel/i,
  /splash[- ]screen/i,
  /credits\s*(—|-)?\s*forever/i,
  /premium access across every game/i,
  /locked for life/i,
  /\$24\.99/,
  /\$44\.99/,
  /\$269\.99/,
];
const SURFACES = [
  'membership/index.html',
  'vault-member/index.html',
  'vault-member/portal-core.js',
  'vault-member/portal-dashboard.js',
  'assets/smart-trial-offer.js',
  'assets/vault-oracle.js',
  'terms/index.html',
  'data/faq.json',
  'api/membership-tiers.json',
  'config/membership-entitlements.json',
];

test('feed: three tiers, canonical names, monthly prices, annual coming later', () => {
  assert.deepEqual(feed.tiers.map((t) => t.id), ['free', 'sparked', 'eternal']);
  assert.equal(tier('free').name, 'Vault Member');
  assert.equal(tier('sparked').name, 'VaultSparked');
  assert.equal(tier('eternal').name, 'VaultSparked Eternal');
  assert.equal(tier('sparked').planCode, 'vault_sparked');
  assert.equal(tier('eternal').planCode, 'vault_sparked_pro');
  assert.equal(tier('free').price.monthly, 0);
  assert.equal(tier('sparked').price.monthly, 4.99);
  assert.equal(tier('eternal').price.monthly, 29.99);
  for (const t of feed.tiers) assert.equal(t.price.annual, null, `${t.id} must not sell an annual price`);
  assert.equal(feed.billing.interval, 'month');
  assert.equal(feed.billing.annual.comingLater, true);
  assert.equal(feed.billing.annual.buyable, false);
  assert.equal(tier('sparked').recommended, true);
});

test('membership page renders every tier name, price and perk from the feed', () => {
  const html = read('membership/index.html');
  const decode = (s) => s.replace(/&amp;/g, '&');
  const text = decode(html);
  for (const t of feed.tiers) {
    assert.ok(text.includes(`>${t.name}</h3>`), `tier card heading for ${t.name}`);
    for (const perk of t.perks) {
      // The page writes the theme colour word capitalised for the coherence gate.
      const needle = perk.replace('blue VaultSparked profile theme', 'Blue VaultSparked profile theme');
      assert.ok(text.includes(needle), `${t.name} perk missing from /membership/: ${perk}`);
    }
  }
  assert.ok(text.includes('$4.99<small>/mo</small>'));
  assert.ok(text.includes('$29.99<small>/mo</small>'));
  assert.match(text, /Annual plans: coming later/);
  assert.match(text, /class="tier-ribbon">Recommended</);
  assert.equal((html.match(/class="mem-tier-card /g) || []).length, 3);
  assert.equal((html.match(/class="mem-tier-cta /g) || []).length, 3, 'one primary CTA per card (s103 contract)');
  assert.ok(!/href="\/vaultsparked\//.test(html), 'no links to the retired /vaultsparked/ route');
});

test('membership JSON-LD offers match the feed (free + two monthly offers)', () => {
  const html = read('membership/index.html');
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">\n([\s\S]*?)\n<\/script>/g)].map((m) => JSON.parse(m[1]));
  const product = blocks.find((b) => b['@type'] === 'Product');
  assert.ok(product, 'Product JSON-LD present');
  assert.deepEqual(product.offers.map((o) => o.name), ['Vault Member (Free)', 'VaultSparked', 'VaultSparked Eternal']);
  assert.deepEqual(product.offers.map((o) => o.price), ['0', '4.99', '29.99']);
  for (const o of product.offers.slice(1)) assert.equal(o.priceSpecification.unitCode, 'MON');
  assert.ok(blocks.some((b) => b['@type'] === 'FAQPage'), 'FAQPage JSON-LD present');
});

test('no removed perk or retired price appears on owned surfaces', () => {
  for (const rel of SURFACES) {
    const src = read(rel);
    for (const re of REMOVED) {
      // notOffered in the feed names removed perks on purpose; skip that block.
      const scan = rel === 'api/membership-tiers.json' ? JSON.stringify({ ...feed, notOffered: [] }) : src;
      assert.ok(!re.test(scan), `${rel} still matches removed claim ${re}`);
    }
  }
});

test('portal: upgrade anchor, Eternal panel, no gift checkout', () => {
  const html = read('vault-member/index.html');
  assert.match(html, /id="upgrade"/);
  assert.match(html, /id="vaultsparked-cta-panel"/);
  assert.match(html, /id="vaultsparked-pro-cta-panel"/);
  assert.match(html, /id="vaultsparked-pro-upgrade-btn"/);
  assert.match(html, /data-tier-price="vault_sparked"/);
  assert.ok(!/id="gift-sub-btn"/.test(html), 'gift subscription button is hidden');
  const core = read('vault-member/portal-core.js');
  assert.match(core, /startVaultSparkedEternalCheckout/);
  assert.match(core, /'vault_sparked_pro'/);
  assert.match(core, /promo_code: promo/);
  assert.ok(!/gift-sub-btn/.test(core), 'gift handler wiring removed');
});

test('entitlements config: corrected prices and an Eternal plan', () => {
  const cfg = JSON.parse(read('config/membership-entitlements.json'));
  assert.equal(cfg.plans.vault_sparked.monthlyPriceUsd, 4.99);
  assert.equal(cfg.plans.vault_sparked_pro.label, 'VaultSparked Eternal');
  assert.equal(cfg.plans.vault_sparked_pro.monthlyPriceUsd, 29.99);
  assert.deepEqual(cfg.features.eternal_dispatch.rule.allowedPlans, ['vault_sparked_pro']);
  for (const key of ['sparked_badge', 'sparked_discord_role', 'classified_archive_full', 'promoGrind_live_tools']) {
    assert.ok(cfg.features[key].rule.allowedPlans.includes('vault_sparked_pro'), `${key} includes Eternal`);
  }
  // The browser helper carries the same CONFIG.
  const sandbox = {};
  vm.runInNewContext(read('assets/membership-access.js'), { globalThis: sandbox });
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.VSMembership.config)), cfg);
  assert.equal(sandbox.VSMembership.isVaultSparkedPlan('vault_sparked_pro'), true);
  assert.equal(sandbox.VSMembership.isVaultSparkedProPlan('vault_sparked'), false);
});

test('account chip: exact plan-key tiers, promogrind_pro is not Eternal, expired subs are free', () => {
  const src = read('assets/account-chip.js');
  // Pull the pure helpers out of the IIFE and evaluate them in isolation.
  const start = src.indexOf('  var PLAN_TIER');
  const end = src.indexOf('  function findMountPoint()');
  const ctx = { window: {}, Date };
  vm.runInNewContext(src.slice(start, end) + '\nthis.tierLabel = tierLabel;', ctx);
  const future = new Date(Date.now() + 864e5).toISOString();
  const past = new Date(Date.now() - 864e5).toISOString();
  assert.equal(ctx.tierLabel(null, { plan: 'vault_sparked', status: 'active', current_period_end: future }), 'SPARKED');
  assert.equal(ctx.tierLabel(null, { plan: 'vault_sparked_pro', status: 'active', current_period_end: future }), 'ETERNAL');
  assert.equal(ctx.tierLabel(null, { plan: 'promogrind_pro', status: 'active' }), 'MEMBER');
  assert.equal(ctx.tierLabel(null, { plan: 'vault_sparked_pro', status: 'active', current_period_end: past }), 'MEMBER');
  assert.equal(ctx.tierLabel(null, { plan: 'vault_sparked', status: 'canceled' }), 'MEMBER');
  assert.equal(ctx.tierLabel({ plan_key: 'vault_sparked_pro' }, null), 'ETERNAL');
  assert.equal(ctx.tierLabel({ is_sparked: true }, null), 'SPARKED');
  assert.equal(ctx.tierLabel({}, null), 'MEMBER');
  assert.match(src, /tier === 'ETERNAL' \? ''/, 'Eternal members get no "Upgrade membership" link');
});
