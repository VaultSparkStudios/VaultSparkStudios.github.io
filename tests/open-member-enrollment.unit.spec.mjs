import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { launchBrowser, openFixture, html } from './fixtures/browser-harness.mjs';

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

for (const slug of ['players', 'builders', 'investors', 'lore', 'press', 'supporters']) {
  test(`${slug} pathway: actual mobile account navigation and theme controls work`, async () => {
    const route = `/pathways/${slug}/`;
    const source = fs.readFileSync(`pathways/${slug}/index.html`, 'utf8');
    const manifest = JSON.parse(fs.readFileSync('assets/shell-manifest.json', 'utf8'));
    const themeTag = `<script src="/${manifest.assets.themeToggle.path}" defer></script>`;
    const navTag = `<script src="/${manifest.assets.navToggle.path}" defer></script>`;
    assert.ok(source.includes(themeTag) && source.includes(navTag));
    assert.ok(source.indexOf(themeTag) < source.indexOf(navTag), 'theme bootstrap precedes nav bootstrap');
    const f = await openFixture(browser, {
      pages: { [route]: source, '/sign-in/': html({ body: '<h1>Neutral account entrance</h1>' }), '/vault-member/': html({ body: '<h1>Member account entrance</h1>' }) },
      contextOptions: { viewport: { width: 390, height: 844 } },
      initScripts: [() => { localStorage.setItem('vs-nav-style', 'classic'); localStorage.setItem('vs_cookie_consent', 'declined'); }],
    });
    try {
      await f.goto(route);
      await f.page.locator('#hamburger').click();
      await f.page.waitForFunction(() => document.querySelector('#hamburger').getAttribute('aria-expanded') === 'true');
      assert.equal(await f.page.locator('#nav-menu').evaluate(el => el.classList.contains('open')), true);
      const theme = f.page.locator('#mobile-theme-bar [data-theme="light"]');
      await theme.click();
      assert.equal(await f.page.locator('html').getAttribute('data-theme'), 'light');
      const signin = f.page.locator('#nav-menu .mobile-nav-signin');
      const create = f.page.locator('#nav-menu a[data-vs-join]');
      assert.equal(await signin.getAttribute('href'), '/sign-in/');
      assert.equal(await create.getAttribute('href'), '/vault-member/#register');
      assert.equal(await signin.isVisible(), true);
      assert.equal(await create.isVisible(), true);
      await f.page.keyboard.press('Escape');
      await f.page.waitForFunction(() => document.querySelector('#hamburger').getAttribute('aria-expanded') === 'false');
      assert.equal(await f.page.locator('#hamburger').evaluate(el => document.activeElement === el), true);
      await f.page.locator('#hamburger').click();
      await signin.click();
      await f.page.waitForURL('**/sign-in/');
      await f.goto(route);
      await f.page.locator('#hamburger').click();
      await f.page.locator('#nav-menu a[data-vs-join]').click();
      await f.page.waitForURL('**/vault-member/#register');
    } finally { await f.close(); }
  });
}
