// tests/investor-thread.spec.js (S136)
// Smoke spec for the investor message thread + founder-reply visibility shipped
// in /investor-portal/message/. Public path — auth-gated content is verified
// only structurally (mount points present, fallback messaging visible).
const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';
const IS_LOCAL = /localhost|127\.0\.0\.1/.test(BASE);

test.describe('Investor message thread (S136)', () => {
  test('/investor-portal/message/ has thread mount point + script wiring', async ({ page }) => {
    test.skip(IS_LOCAL, 'Investor portal requires Supabase auth — not wired in local preview');
    await page.goto(BASE + '/investor-portal/message/', { waitUntil: 'domcontentloaded' });
    // Thread card is rendered into the HTML statically.
    await expect(page.locator('#messageThreadCard')).toBeAttached();
    await expect(page.locator('#investorThreadList')).toBeAttached();
    // The loader is wired to the investor:ready event.
    const wiring = await page.evaluate(() => {
      return /loadMessageThread/.test(document.body.innerHTML)
          && /investor:ready/.test(document.body.innerHTML);
    });
    expect(wiring).toBe(true);
  });

  test('unauth visitors see auth-gate, not thread (RLS isolation)', async ({ page }) => {
    test.skip(IS_LOCAL, 'Investor portal requires Supabase auth — not wired in local preview');
    await page.goto(BASE + '/investor-portal/message/', { waitUntil: 'load' });
    // /investor-portal/* is noindex + auth-required; an unauth visitor will
    // either be redirected to login OR see an empty state. Either is acceptable;
    // a 200 with real message bodies leaking through is a failure.
    const leaked = await page.evaluate(() => {
      const list = document.getElementById('investorThreadList');
      if (!list) return false;
      // If we see real founder_reply content from another investor's thread,
      // RLS is broken. Heuristic: look for the founder-reply UI block.
      return list.querySelector('.founder-reply, [data-founder-reply]') !== null;
    });
    expect(leaked, 'thread content visible without auth — RLS check').toBe(false);
  });
});
