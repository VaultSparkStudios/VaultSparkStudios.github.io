import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { launchBrowser, openFixture } from './fixtures/browser-harness.mjs';

const pages = {
  '/': fs.readFileSync('index.html', 'utf8'),
  '/membership/': fs.readFileSync('membership/index.html', 'utf8'),
  '/invite/': fs.readFileSync('invite/index.html', 'utf8'),
};
let browser;
before(async () => { browser = await launchBrowser(); });
after(async () => { await browser?.close(); });

for (const [route, source] of Object.entries(pages)) {
  test(`${route}: public member entry offers direct registration and preserves referrals`, async () => {
    assert.doesNotMatch(source, /invite-led|by invitation|opened by invitation|Request (?:your (?:Vault )?)?invite|Request Invite|topic=invite/i);
    const f = await openFixture(browser, { pages: { [route]: source } });
    try {
      await f.goto(route);
      const joins = await f.page.locator('a[data-vs-join], a[data-adaptive-cta="account"]').evaluateAll(nodes =>
        nodes.map(node => ({ href: node.getAttribute('href'), text: node.textContent.trim() })));
      assert.ok(joins.length >= 2, 'desktop and mobile member join entries exist');
      for (const link of joins) {
        assert.equal(link.href, '/vault-member/#register', link.text);
        assert.match(link.text, /Create|account/i);
      }
      const referralLinks = await f.page.locator('a[href="/invite/"]').allTextContents();
      assert.ok(referralLinks.some(text => /Refer a Friend/.test(text)), 'referral page remains reachable');
      assert.ok(await f.page.locator('a[href="/investor-portal/"]').count(), 'investor destination remains separate');
      if (route === '/membership/') {
        assert.equal(await f.page.locator('.mem-cta-free.mem-tier-cta').getAttribute('href'), '/vault-member/#register');
        assert.match(await f.page.locator('.tier-free .mem-tier-cta-note').textContent(), /Sign in/);
        const structured = await f.page.locator('script[type="application/ld+json"]').allTextContents();
        assert.ok(structured.some(text => text.includes('https://vaultsparkstudios.com/vault-member/#register')));
        for (const text of structured) JSON.parse(text);
      }
      if (route === '/invite/') {
        assert.ok(await f.page.locator('#referral-link-input[readonly]').count());
        assert.ok(await f.page.locator('#copy-link-btn').count());
        assert.ok(await f.page.locator('a[href="/vault-member/#login"]').count());
        assert.match(await f.page.locator('.invite-honest').textContent(), /No invitation is needed/);
      }
      assert.equal(f.log.requests.filter(req => req.method === 'POST'
        && /\/auth\/|\/contact\/submit/.test(new URL(req.url).pathname)).length, 0, 'entry never auto-registers or submits');
    } finally { await f.close(); }
  });
}

test('canonical nav offers registration while keeping neutral sign-in and referral destinations', () => {
  const source = fs.readFileSync('scripts/propagate-nav.mjs', 'utf8');
  assert.doesNotMatch(source, /topic=invite|Request Invite/);
  assert.equal((source.match(/href="\/vault-member\/#register" data-vs-join>Create Account/g) || []).length, 2);
  assert.ok((source.match(/href="\/sign-in\/"/g) || []).length >= 2);
  assert.match(source, /href="\/invite\/">Refer a Friend/);
});

test('legacy invitation contact URL offers account help without an approval promise', () => {
  const source = fs.readFileSync('assets/contact-page.js', 'utf8');
  assert.match(source, /subject: 'Vault account help'/);
  assert.match(source, /No invitation is needed to join/);
  assert.match(source, /\/vault-member\/#register/);
  assert.doesNotMatch(source, /invite-led|reply with an invite|Vault invite request/);
  assert.match(source, /event: 'invite_request_view'/, 'existing analytics contract remains stable');
});
