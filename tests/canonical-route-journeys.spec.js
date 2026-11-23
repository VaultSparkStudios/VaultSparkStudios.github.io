// Canonical route and account intent regressions.
// Actual browser redirect journeys, usable against local preview or a deployed
// candidate. External identity/data providers and non-read requests are blocked.
// This proves URL/intent preservation and reachable visible targets, not native
// authentication, profile creation, every retired route, or automatic alignment
// throughout later lazy hydration.
const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ context, baseURL }) => {
  const origin = new URL(baseURL).origin;
  await context.route('**/*', route => {
    const request = route.request();
    return new URL(request.url()).origin === origin && ['GET', 'HEAD'].includes(request.method())
      ? route.continue() : route.abort();
  });
});

const aliases = [
  ['/studio-pulse/', '/studio/', '#pulse'],
  ['/how-we-build/', '/studio/', '#sil'],
  ['/brand/', '/press/', '#brand'],
  ['/security/', '/trust/', '#security-policy'],
];
for (const [from, to, hash] of aliases) {
  test(`${from} retains caller query and fragment at its visible canonical section`, async ({ page }) => {
    const response = await page.goto(`${from}?route_probe=preserved${hash}`);
    expect(response.status()).toBe(200);
    await expect(page).toHaveURL(url => url.pathname === to && url.searchParams.get('route_probe') === 'preserved' && url.hash === hash);
    const target = page.locator(hash);
    await expect(target).toHaveCount(1);
    await target.scrollIntoViewIfNeeded();
    await expect(target).toBeVisible();
    await expect(target).toBeInViewport();
  });
}

for (const resource of ['/journal/building-vault-membership/', '/journal/dispatches/feed.xml', '/brand/assets.json', '/brand/tokens.json']) {
  test(`index retirement preserves ${resource}`, async ({ page }) => {
    const response = await page.goto(resource);
    expect(response.status()).toBe(200);
    await expect(page).toHaveURL(url => url.pathname === resource);
    if (resource.endsWith('.json')) {
      expect(response.headers()['content-type']).toContain('json');
      expect(await response.json()).toEqual(expect.any(Object));
    } else if (resource.endsWith('.xml')) {
      expect(response.headers()['content-type']).toMatch(/xml/);
      expect(await response.text()).toMatch(/<(?:\?xml|rss|feed)\b/);
    } else {
      await expect(page.locator('h1')).toBeVisible();
    }
  });
}

test('legacy ROI route reaches the real IGNIS overview without a missing fragment', async ({ page }) => {
  const response = await page.goto('/ignis/roi/');
  expect(response.status()).toBe(200);
  await expect(page).toHaveURL(url => url.pathname === '/ignis/' && !url.hash);
  await expect(page.locator('#ignis-heading')).toBeVisible();
});

test('join alias retains the declared safe member handoff and delegated signup intent', async ({ page, baseURL }) => {
  const safeReturn = '/vault-member/passport/?view=progress#achievements';
  const ref = 'VaultFriend';
  await page.goto('/join/?' + new URLSearchParams({ next: safeReturn, ref }));
  await expect(page).toHaveURL(url => url.pathname === '/vault-member/' && url.hash === '#register' && url.searchParams.get('next') === safeReturn && url.searchParams.get('ref') === ref);
  await expect(page.locator('#panel-register')).toBeVisible();
  await expect.poll(async () => {
    const href = await page.locator('#obelisk-create-account').getAttribute('href');
    const identity = new URL(href, baseURL);
    const callback = new URL(identity.searchParams.get('return'), baseURL);
    return {
      path: identity.pathname, intent: identity.searchParams.get('intent'),
      member: callback.pathname, next: callback.searchParams.get('return'),
      ref: callback.searchParams.get('ref'), hash: callback.hash,
    };
  }).toEqual({ path: '/login', intent: 'signup', member: '/vault-member/', next: safeReturn, ref, hash: '#register' });
  // Never click the identity link or submit any account/enrollment form.
});
