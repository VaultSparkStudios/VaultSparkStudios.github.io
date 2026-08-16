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
    // S317: the route absent from the DEPLOYED Worker — the real production
    // failure. The static origin answers HTML, not JSON, so the client cannot
    // read an error code from the body and must infer from the status.
    if (postState === 'missing') {
      await route.fulfill({ status: 404, contentType: 'text/html', body: '<!doctype html><title>404</title>' });
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
  const story = page.locator('[data-desk-reactions="2026-08-11/cloudflare-gave-the-agent-a-browser-and-a-chaperone"]');
  const button = story.locator('[data-reaction="made-me-laugh"]');
  const status = story.locator('[data-reaction-status]');

  // S317 — a site-side outage must NOT be reported as the reader's connection.
  // Storage unavailable and a missing route are both our problem; only a genuine
  // transport failure earns "check your connection". For weeks production told
  // every visitor their connection was bad while the endpoint simply was not
  // deployed.
  await button.click();
  await expect(status).toContainText('aren’t available right now');
  await expect(status).toContainText('on our side, not yours');
  await expect(status).toHaveAttribute('data-state', 'unavailable');
  await expect(button).not.toHaveAttribute('data-mine', 'true');
  expect(await page.evaluate(() => localStorage.getItem('vs_desk_react_2026-08-11/cloudflare-gave-the-agent-a-browser-and-a-chaperone'))).toBeNull();

  // The exact production shape: 404 HTML from the static origin.
  postState = 'missing';
  await button.click();
  await expect(status).toContainText('aren’t available right now');
  await expect(status).toHaveAttribute('data-state', 'unavailable');
  await expect(button).not.toHaveAttribute('data-mine', 'true');

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

test('every generated panel has its own confirmed emoji reaction tally', async ({ page }) => {
  let posted = null;
  await page.route('**/v/desk-reaction*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, counts: {} }) });
      return;
    }
    posted = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, counts: { 'panel-fire': 1 } }),
    });
  });
  await page.goto('/news/2026-08-11/cloudflare-gave-the-agent-a-browser-and-a-chaperone/', { waitUntil: 'domcontentloaded' });
  const panel = page.locator('.desk-panel-reactions');
  await expect(panel).toHaveCount(1);
  await expect(panel.locator('[data-reaction]')).toHaveCount(4);
  await panel.locator('[data-reaction="panel-fire"]').click();
  await expect(panel.locator('[data-reaction="panel-fire"]')).toHaveAttribute('data-mine', 'true');
  await expect(panel.locator('[data-reaction="panel-fire"] .desk-react-n')).toHaveText('1');
  expect(posted.slug).toContain('/panel/editorial-illustration-1');
  expect(posted.reaction).toBe('panel-fire');
});

test('Desk reader activity separates live presence from sample-gated engaged time', async ({ page }) => {
  let summary = null;
  await page.route('**/v/desk-presence*', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, state: 'observed', activeReaders: null, activeBand: 'one-or-two', windowSeconds: 90 }) });
      return;
    }
    const body = request.postDataJSON();
    if (body.kind === 'summary') summary = body;
    await route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ ok: true, state: 'accepted' }) });
  });
  await page.route('**/api/news-desk-engagement.json', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      stories: [{ slug: '2026-08-11/cloudflare-gave-the-agent-a-browser-and-a-chaperone', state: 'sufficient', observations: 8, averageEngagedSeconds: 134, windowDays: 30 }],
    }) });
  });
  await page.goto('/news/2026-08-11/cloudflare-gave-the-agent-a-browser-and-a-chaperone/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-reader-presence]')).toHaveText('A reader or two');
  await expect(page.locator('[data-engaged-time]')).toHaveText('2m 14s avg');
  await expect(page.locator('[data-engagement-note]')).toContainText('8 completed');
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await expect.poll(() => summary).not.toBeNull();
  expect(summary.engagedSeconds).toBeGreaterThanOrEqual(1);
  expect(summary.slug).toContain('cloudflare-gave-the-agent');
});
