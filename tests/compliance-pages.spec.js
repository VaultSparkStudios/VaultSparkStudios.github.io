// compliance-pages.spec.js
// Covers the 8 compliance/utility pages added in Session 38b:
// Cookie Policy, Accessibility, Technology & Rights, FAQ, Careers, Data Deletion, Security, HTML Sitemap
// Also covers cookie consent banner behaviour.

const { test, expect } = require('@playwright/test');
const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';

const COMPLIANCE_PAGES = [
  { path: '/cookies/',       title: /Cookie/i,      h1: true },
  { path: '/accessibility/', title: /Accessibility/i, h1: true },
  { path: '/rights/',        title: /Technology|Rights|Attributions/i, h1: true },
  { path: '/faq/',           title: /FAQ|Frequently/i, h1: true },
  { path: '/collaborate/',   title: /Collaborate/i, h1: true },
  { path: '/data-deletion/', title: /Data Deletion/i, h1: true },
  { path: '/security/',      title: /Security/i,    h1: true },
  { path: '/sitemap.html',   title: /Sitemap/i,     h1: true },
  { path: '/changelog/',     title: /Changelog|Vault/i, h1: true },
];

test.describe('Compliance & utility pages (S38b)', () => {
  for (const pg of COMPLIANCE_PAGES) {
    test(`${pg.path} loads correctly`, async ({ page }) => {
      await page.goto(BASE + pg.path);
      await expect(page).toHaveTitle(pg.title);
      if (pg.h1) {
        await expect(page.locator('h1').first()).toBeVisible();
      }
      await expect(page.locator('footer.site-footer')).toBeVisible();
      // No broken navigation
      const navLinks = page.locator('.nav-center a');
      await expect(navLinks.first()).toBeVisible();
    });
  }
});

test.describe('Cookie consent banner', () => {
  test('banner appears on first visit and links to /cookies/', async ({ page }) => {
    // Playwright creates a fresh isolated context for every test. Do not use a
    // localStorage.clear() init script here: init scripts also run in later
    // same-origin frames and can erase the very consent state these tests prove.
    await page.goto(BASE + '/');

    // Banner should appear
    // The consent surface is intentionally one fixed node. A transformed
    // wrapper around a fixed child breaks its mobile viewport positioning, so
    // assert the real same-node contract instead of the retired nesting.
    const banner = page.locator('#cookieConsent.vs-cookie-banner');
    await expect(banner).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#cookieConsent')).toHaveCSS('opacity', '1');

    // Should link to /cookies/
    const cookieLink = page.locator('#cookieConsent a[href="/cookies/"]');
    await expect(cookieLink).toBeVisible();
  });

  test('banner disappears after accepting', async ({ page }) => {
    await page.goto(BASE + '/');

    const banner = page.locator('#cookieConsent.vs-cookie-banner');
    await expect(banner).toBeVisible({ timeout: 5000 });

    await page.locator('#cookieAccept').click();
    await expect(page.locator('#cookieConsent')).toHaveCount(0);

    // Consent should be stored
    const consent = await page.evaluate(() => localStorage.getItem('vs_cookie_consent'));
    expect(consent).toBe('accepted');
  });

  test('banner disappears after declining', async ({ page }) => {
    await page.goto(BASE + '/');

    const banner = page.locator('#cookieConsent.vs-cookie-banner');
    await expect(banner).toBeVisible({ timeout: 5000 });

    await page.locator('#cookieDecline').click();
    await expect(page.locator('#cookieConsent')).toHaveCount(0);

    const consent = await page.evaluate(() => localStorage.getItem('vs_cookie_consent'));
    expect(consent).toBe('declined');
  });

  test('banner does not appear on repeat visit after accepting', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('vs_cookie_consent', 'accepted'));
    await page.goto(BASE + '/games/');
    await expect(page.locator('#cookieConsent')).toHaveCount(0);
  });
});

test.describe('Release truth surface', () => {
  for (const authority of [
    { overall: 'partial', label: 'Partial', ready: 3 },
    { overall: 'ready', label: 'Ready', ready: 4 },
  ]) {
  test(`status keeps identity held with ${authority.ready}/4 ${authority.overall} authority planes`, async ({ page }) => {
    // These independent signals may legitimately change between releases.
    // Supply deterministic data at the exact same-origin bundled-proof endpoint
    // used by getProof(), rather than freezing the live artifact in a partial state.
    const planes = Object.fromEntries(['dataRest', 'managementApi', 'sqlMigration', 'edgeFunctions']
      .map((name, index) => [name, { status: index < authority.ready ? 'ready' : 'degraded' }]));
    const proofData = {
        'identity-migration-receipt': {
          publicSafe: true, state: 'honest-dark', productionEligible: false,
          blockers: ['real-provider-e2e-pending'],
          bindings: { worker: { versionId: '11111111-1111-4111-8111-111111111111' } },
        },
        'supabase-control-plane': { publicSafe: true, overall: authority.overall, planes },
        'deploy-currency': {
          publicSafe: true, state: 'current', commitsBehind: 0,
          shellParity: { state: 'matched' },
        },
    };
    await page.route(new URL('/api/status-proof.json', BASE).href, route => route.fulfill({
      json: { proofs: Object.fromEntries(Object.entries(proofData)
        .map(([key, data]) => [key, { present: true, data }])) },
    }));
    // Concurrent getProof calls can take the exact individual-feed fallback
    // while the shared manifest is loading. Both paths must use the same fixture.
    for (const [key, data] of Object.entries(proofData)) {
      await page.route(new URL(`/api/${key}.json`, BASE).href, route => route.fulfill({ json: data }));
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE + '/status/');

    const signals = page.locator('#liveSignalsGrid');
    const identity = signals.locator(':scope > div').filter({ hasText: 'Identity migration' });
    await expect(identity).toHaveCount(1);
    await expect(identity).toContainText('Staged · held');
    await expect(identity).toContainText('1 open proof');
    await expect(identity).not.toContainText('Verified');
    const releaseAuthority = signals.locator(':scope > div').filter({ hasText: 'Release authority' });
    await expect(releaseAuthority).toHaveCount(1);
    await expect(releaseAuthority.locator(':scope > div').nth(1)).toHaveText(authority.label);
    await expect(releaseAuthority).toContainText(`${authority.ready}/4 Supabase authority planes verified`);
    await expect(releaseAuthority).not.toContainText(`${authority.ready === 3 ? 4 : 3}/4 Supabase authority planes verified`);
    await expect(signals).toContainText('Production deploy currency');
    // S316 — this assertion used to read /shell fingerprint (drift|matched)/,
    // which matched the two DEGRADED strings but never the healthy one the page
    // actually renders ("shell fingerprints matched", plural). The gate went red
    // exactly when production was healthy and green when parity was broken. The
    // three accepted strings below are the literal copy from status/index.html;
    // if that copy changes, this must change with it.
    await expect(signals).toContainText(/shell fingerprints matched|shell fingerprint drift|shell parity unobserved/);
    // The deploy-currency tile must name a real producer state, never a
    // placeholder. 'Unverified'/'Unobserved' are legitimate honest states.
    await expect(signals).toContainText(/Current|Content current|Behind|Stale|Diverged|Unverified|Unobserved/);

    const box = await signals.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeLessThanOrEqual(390);
  });
  }
});

test.describe('Game detail pages — stat-block hover styles', () => {
  const GAME_PAGES = [
    '/games/call-of-doodie/',
    '/games/franchise-architect/',
    '/games/vaultfront/',
    '/games/solara/',
  ];

  for (const path of GAME_PAGES) {
    test(`${path} has stat-blocks and data-status on hero`, async ({ page }) => {
      await page.goto(BASE + path);

      // At least one stat-block should be visible
      const statBlocks = page.locator('.stat-block');
      await expect(statBlocks.first()).toBeVisible();

      // game-hero should have data-status attribute
      const hero = page.locator('.game-hero[data-status]');
      await expect(hero).toBeAttached();
      const status = await hero.getAttribute('data-status');
      expect(['sparked', 'forge', 'vaulted']).toContain(status);
    });
  }
});
