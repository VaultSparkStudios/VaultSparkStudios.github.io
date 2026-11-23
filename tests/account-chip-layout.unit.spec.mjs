// context: assets/account-chip.js, assets/style.css, assets/nav-toggle.js,
// assets/rank-orb.js, universe/voidfall/index.html; local member projection only.
import fs from 'node:fs';
import path from 'node:path';
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ROOT, ORIGIN, launchBrowser, openFixture, beaconStub } from './fixtures/browser-harness.mjs';

const accountModule = fs.readFileSync(path.join(ROOT, 'assets/account-chip.js'));
const identity = { sub: 'unit:header-member', supabaseUserId: '11111111-1111-4111-8111-111111111111', name: 'Header Member', email: 'header@example.test' };
let browser;
before(async () => { browser = await launchBrowser(); });
after(async () => { await browser?.close(); });

async function whollyReachable(locator) {
  return locator.evaluate(el => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return r.width > 0 && r.height > 0 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth + .5 && r.bottom <= innerHeight && !!hit && (hit === el || el.contains(hit));
  });
}

for (const width of [360, 390, 430, 640, 768, 1024, 1366]) {
  test(`signed-in header retains public navigation after the real rank orb mounts at ${width}px`, async () => {
    const f = await openFixture(browser, {
      pages: {
        '/universe/voidfall/': fs.readFileSync(path.join(ROOT, 'universe/voidfall/index.html'), 'utf8'),
        '/games/': fs.readFileSync(path.join(ROOT, 'games/index.html'), 'utf8'),
      },
      contextOptions: { viewport: { width, height: width === 1366 ? 900 : 844 }, hasTouch: width === 768 || width === 1024 },
      initScripts: [beaconStub, () => { localStorage.setItem('vs_theme', 'dark'); localStorage.setItem('vs_cookie_consent', 'declined'); }],
      handlers: [{
        match: (u, req) => u.origin === ORIGIN && req.method() === 'GET' && !u.search && ['/api/auth/me', '/api/auth/progression', '/api/public-intelligence.json', '/assets/account-chip.js'].includes(u.pathname),
        handle: async route => {
          const u = new URL(route.request().url());
          if (u.pathname === '/assets/account-chip.js') return route.fulfill({ status: 200, contentType: 'application/javascript', body: accountModule });
          const payload = u.pathname === '/api/auth/me' ? { ok: true, identity } : u.pathname === '/api/auth/progression' ? { ok: true, identity, progression: { id: identity.supabaseUserId, points: 0 } } : JSON.parse(fs.readFileSync(path.join(ROOT, 'api/public-intelligence.json')));
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
        },
      }],
    });
    try {
      await f.goto('/universe/voidfall/');
      const chip = f.page.locator('.vs-account-chip');
      await chip.waitFor();
      await f.page.locator('[data-lore-gate]').first().scrollIntoViewIfNeeded();
      await f.page.locator('.vs-rank-orb').waitFor({ state: 'visible' });
      await f.page.evaluate(() => document.fonts.ready);
      for (const selector of ['.site-header .brand', '.vs-rank-orb', '.vs-palette-loader-trigger']) {
        assert.equal(await whollyReachable(f.page.locator(selector).first()), true, `${selector} remains contained and hit-reachable`);
      }
      assert.equal(await whollyReachable(chip), true, 'account button wholly contained and hit-reachable');
      if (width <= 1024) assert.equal(await whollyReachable(f.page.locator('.hamburger')), true, 'public navigation also remains unobscured on touch-tablet widths');
      assert.match(await chip.getAttribute('aria-label'), /Header Member \(Vault Member\)/);
      assert.equal(await chip.locator('.vs-account-chip__tier').textContent(), 'MEMBER', 'presentation keeps actual free-member classification');
      if (width <= 640) {
        assert.equal(await whollyReachable(f.page.locator('.hamburger')), true, 'public navigation survives rank-orb insertion');
        const rect = await chip.boundingBox();
        assert.equal(rect.width, 44); assert.equal(rect.height, 44);
        assert.equal(await chip.locator('.vs-account-chip__tier').isVisible(), false);
        assert.equal(await chip.locator('.vs-account-chip__caret').isVisible(), false);
      } else {
        assert.equal(await chip.locator('.vs-account-chip__tier').isVisible(), true, 'desktop tier badge retained');
        assert.ok((await chip.boundingBox()).width > 44, 'desktop full chip retained');
      }
      if (width === 768 || width === 1024) {
        await chip.tap(); assert.equal(await chip.getAttribute('aria-expanded'), 'true', 'coarse-pointer tablet opens account menu by real touchscreen tap');
        await chip.tap(); assert.equal(await chip.getAttribute('aria-expanded'), 'false', 'coarse-pointer tablet closes account menu by real touchscreen tap');
      }
      await chip.focus(); await f.page.keyboard.press('Enter');
      assert.equal(await chip.getAttribute('aria-expanded'), 'true');
      {
        const heights = await chip.locator('[role="menuitem"]').evaluateAll(nodes => nodes.map(n => ({ height: n.getBoundingClientRect().height, minimum: parseFloat(getComputedStyle(n).minHeight) })));
        assert.ok(heights.length >= 8 && heights.every(h => h.minimum >= 44 && h.height >= 44 - 0.0001), 'every account-menu action has a44px target');
      }
      await f.page.keyboard.press('Tab');
      assert.equal(await f.page.evaluate(() => document.activeElement.getAttribute('href')), '/vault-member/');
      await f.page.keyboard.press('Escape');
      assert.equal(await chip.getAttribute('aria-expanded'), 'false');
      if (width === 390 || width === 1366) {
        await f.page.setViewportSize({ width: width === 390 ? 640 : 1366, height: 360 });
        await chip.click();
        const menu = chip.locator('.vs-account-menu');
        await menu.hover();
        await f.page.mouse.wheel(0, 1000);
        const signout = chip.locator('[data-vs-signout]');
        await f.page.waitForFunction(() => { const n = document.querySelector('[data-vs-signout]'), r = n.getBoundingClientRect(), h = document.elementFromPoint(r.x+r.width/2,r.y+r.height/2); return r.y >= 0 && r.bottom <= innerHeight && r.right <= innerWidth && !!h && (h === n || n.contains(h)); });
        assert.equal(await whollyReachable(signout), true, 'short-landscape Sign out reachable after real menu wheel, without clicking it');
        await chip.focus();
        const count = await chip.locator('[role="menuitem"]').count();
        for (let i = 0; i < count; i++) await f.page.keyboard.press('Tab');
        assert.equal(await f.page.evaluate(() => document.activeElement.hasAttribute('data-vs-signout')), true, 'keyboard can reach the last account action');
        await f.page.keyboard.press('Escape');
        assert.equal(await chip.getAttribute('aria-expanded'), 'false');
        assert.equal(await chip.evaluate(n => document.activeElement === n), true, 'Escape restores account-button focus from the last menu action');
        await f.page.setViewportSize({ width, height: width === 1366 ? 900 : 844 });
      }
      if (width <= 1024) {
        if (width === 768 || width === 1024) await f.page.locator('.hamburger').tap();
        else await f.page.locator('.hamburger').click();
        await f.page.locator('#nav-menu.open').waitFor({ state: 'visible' });
        const games = f.page.locator('#nav-menu > .nav-item > a[href="/games/"]');
        assert.equal(await games.isVisible(), true);
        if (width === 768 || width === 1024) await games.tap();
        else await games.click();
        const allGames = f.page.locator('#nav-menu .nav-dropdown a[href="/games/"]').first();
        await allGames.scrollIntoViewIfNeeded();
        assert.equal(await allGames.isVisible(), true, 'public destination link reachable within actual drawer');
        await f.page.keyboard.press('Escape');
        assert.equal(await f.page.locator('.hamburger').getAttribute('aria-expanded'), 'false');
        assert.equal(await f.page.evaluate(() => document.activeElement.id), 'hamburger');
      }
    } finally { await f.close(); }
  });
}
