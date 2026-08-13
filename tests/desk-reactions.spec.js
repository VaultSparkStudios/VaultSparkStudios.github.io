const { test, expect } = require('@playwright/test');

test('Desk reactions distinguish failed, accepted, and already-counted delivery', async ({ page }) => {
  let postState = 'fail';
  await page.route('**/v/desk-reaction*', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, counts: {} }) });
      return;
    }
    if (postState === 'fail') {
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'storage_unavailable' }) });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        counts: { 'made-me-laugh': 1 },
        alreadyCounted: postState === 'duplicate',
      }),
    });
  });

  await page.goto('/news/2026-08-11/cloudflare-gave-the-agent-a-browser-and-a-chaperone/', { waitUntil: 'domcontentloaded' });
  const button = page.locator('[data-reaction="made-me-laugh"]');
  const status = page.locator('[data-reaction-status]');

  await button.click();
  await expect(status).toContainText('Signal not delivered');
  await expect(status).toHaveAttribute('data-state', 'retry');
  await expect(button).not.toHaveAttribute('data-mine', 'true');
  expect(await page.evaluate(() => localStorage.getItem('vs_desk_react_2026-08-11/cloudflare-gave-the-agent-a-browser-and-a-chaperone'))).toBeNull();

  postState = 'success';
  await button.click();
  await expect(status).toContainText('Signal delivered');
  await expect(status).toHaveAttribute('data-state', 'submitted');
  await expect(button).toHaveAttribute('data-mine', 'true');

  postState = 'duplicate';
  await button.click();
  await expect(status).toContainText('Already counted today');
  await expect(status).toHaveAttribute('data-state', 'already-counted');
});
