const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';

test('visit-depth upsell appears after four explored sections and Esc dismisses it', async ({ page }) => {
  test.setTimeout(20000);
  await page.addInitScript(() => {
    sessionStorage.setItem('vs_vd_sections', JSON.stringify(['games', 'projects', 'universe', 'journal']));
    sessionStorage.removeItem('vs_vd_dismissed');
    sessionStorage.removeItem('vs_vd_shown');
    sessionStorage.removeItem('vs_attention_surface_v1');
    localStorage.setItem('vs_cookie_consent', 'accepted');
    localStorage.removeItem('vs_vd_last_shown');
  });

  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.addScriptTag({ url: BASE + '/assets/visit-depth.js' });
  const panel = page.locator('.vs-vd');
  await expect(panel).toBeVisible({ timeout: 6000 });
  await expect(panel).toContainText(/games shelf|projects library|universe lore|signal log/);

  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
});

test('exit-intent waits for engagement plus dwell before showing feedback panel', async ({ page }) => {
  test.setTimeout(20000);
  await page.addInitScript(() => {
    sessionStorage.removeItem('vs_exit_intent_shown');
    sessionStorage.removeItem('vs_attention_surface_v1');
    localStorage.setItem('vs_cookie_consent', 'accepted');
    localStorage.removeItem('vs_exit_intent_last_shown');
    window.__vsNow = 1000000;
    Date.now = () => window.__vsNow;
  });
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.addScriptTag({ url: BASE + '/assets/exit-intent.js' });

  await page.evaluate(() => {
    document.documentElement.dispatchEvent(new MouseEvent('mouseleave', { clientY: 0, bubbles: true }));
  });
  await expect(page.locator('.vs-exit-panel')).toHaveCount(0);

  await page.evaluate(() => {
    window.dispatchEvent(new Event('scroll'));
    window.__vsNow += 26000;
    document.documentElement.dispatchEvent(new MouseEvent('mouseleave', { clientY: 0, bubbles: true }));
  });
  await expect(page.locator('.vs-exit-panel')).toBeVisible({ timeout: 3000 });
});

test('studio milestones render six chapters with an active now card', async ({ page }) => {
  test.setTimeout(25000);
  await page.goto(BASE + '/', { waitUntil: 'load' });

  const milestones = page.locator('[data-milestones-root] .milestone-card');
  // This below-fold surface loads after reader interaction (12s idle fallback).
  // Scroll to the surface like a reader instead of racing that fallback.
  await page.locator('[data-milestones-root]').scrollIntoViewIfNeeded();
  // WebKit may finish programmatic scrolling before the loader receives its
  // scroll event. A real pointer interaction also starts the same idle queue.
  await page.locator('#milestones-heading').click();
  await expect(milestones).toHaveCount(6, { timeout: 10000 });
  await expect(page.locator('[data-milestones-root] .milestone-pill--live')).toContainText('Active now');
  await expect(page.locator('[data-milestones-root]')).toContainText(/worlds playable|build sessions on the record/);
});
test('homepage first-scroll order leads from proof through the vault door to membership', async ({ page }) => {
  test.setTimeout(25000);
  await page.goto(BASE + '/', { waitUntil: 'load' });

  const order = await page.evaluate(() => {
    return Array.from(document.querySelector('main').children)
      .filter((el) => (el.tagName === 'SECTION' || el.matches('[data-hero-section]')) && !el.hidden)
      .map((el) => el.id || el.getAttribute('aria-labelledby') || el.className || el.tagName);
  });

  const proof = order.indexOf('vault-proof');
  const membership = order.indexOf('vault-membership');
  const door = order.indexOf('vault-door');
  const pulse = order.indexOf('studio-pulse-teaser-heading');
  const spine = order.indexOf('studio-spine');

  expect(proof).toBeGreaterThan(-1);
  expect(door).toBe(proof + 1);
  expect(membership).toBe(door + 1);
  await expect(page.locator('#vault-door')).toBeVisible();
  expect(pulse).toBe(membership + 1);
  expect(spine).toBeGreaterThan(pulse);
  await expect(page.locator('[class*="vault-live-"]')).toHaveCount(0);
});

test('social icon sprite resolves on homepage, footer, social dashboard, and PWA cache', async ({ page, request }) => {
  test.setTimeout(30000);
  const sprite = await request.get(BASE + '/assets/social-icons.svg');
  expect(sprite.ok()).toBeTruthy();
  const spriteText = await sprite.text();

  for (const theme of ['dark', 'light', 'ambient', 'warm', 'cool', 'lava', 'high-contrast']) {
    await page.goto(BASE + '/', { waitUntil: 'load' });
    await page.evaluate((name) => {
      document.documentElement.dataset.theme = name;
      document.body.dataset.theme = name;
    }, theme);
    const hrefs = await page.locator('#social use[href*="social-icons.svg"], footer use[href*="social-icons.svg"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')));
    expect(hrefs.length).toBeGreaterThanOrEqual(20);
    for (const href of hrefs) {
      const id = href && href.split('#')[1];
      expect(id, `missing symbol for ${href}`).toBeTruthy();
      expect(spriteText).toContain(`id="${id}"`);
    }
  }

  await page.goto(BASE + '/social/', { waitUntil: 'load' });
  await expect(page.locator('.social-tile use[href*="social-icons.svg"]')).toHaveCount(15, { timeout: 10000 });

  const sw = await request.get(BASE + '/sw.js');
  expect(sw.ok()).toBeTruthy();
  await expect(await sw.text()).toContain('/assets/social-icons.svg');
});

test('homepage IGNIS proof rail and IGNIS gauge hydrate from public intelligence', async ({ page }) => {
  test.setTimeout(25000);
  // Mock the network boundary, leaving the production truth bus and consumers
  // intact. An init-script facade is overwritten by public-intelligence.js.
  const feed = require('../api/public-intelligence.json');
  const fixture = { ...feed, project: { ...feed.project, ignis: { ...feed.project.ignis, score: 91234, grade: 'FORGE' } } };
  await page.route('**/api/public-intelligence.json*', route => {
    return route.fulfill({ json: fixture });
  });

  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.locator('#vault-proof').scrollIntoViewIfNeeded();
  await expect(page.locator('#proof-ignis-score')).toHaveText('91,234', { timeout: 10000 });
  await expect(page.locator('#proof-ignis-tier')).toHaveText('Ignited tier');

  await page.goto(BASE + '/ignis/', { waitUntil: 'load' });
  await expect(page.locator('#ignis-live-score')).toHaveText('91,234', { timeout: 5000 });
  // The gauge deliberately honors the feed's project grade; the proof rail
  // reports the numeric score band. They are separate concepts.
  await expect(page.locator('#ignis-live-tier')).toHaveText('FORGE tier');
  expect(await page.locator('#ignis-live-bar').evaluate(el => parseFloat(el.style.width))).toBeCloseTo(91.234, 3);
});

test('membership rank strip and world teaser render complete on desktop and mobile', async ({ page }) => {
  test.setTimeout(25000);
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto(BASE + '/membership/', { waitUntil: 'load' });
    await expect(page.locator('.rank-strip-item')).toHaveCount(9);
    await expect(page.locator('.rank-strip-item--peak')).toContainText('The Sparked');
    await expect(page.locator('.rank-strip-icon--gold')).toBeVisible();
    await expect(page.locator('.mem-world-card')).toHaveCount(4);
    await expect(page.locator('.mem-world-unlock')).toHaveCount(12);
    const stripWidth = await page.locator('.rank-strip-track').evaluate((el) => el.scrollWidth);
    expect(stripWidth).toBeGreaterThan(700);
  }
});
