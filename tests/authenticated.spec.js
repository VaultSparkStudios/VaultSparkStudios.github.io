const { test, expect } = require('@playwright/test');
const { hasVaultCreds, loginVaultMember } = require('./helpers/vaultAuth');

test.describe('Vault portal authenticated flows', () => {
  test.skip(!hasVaultCreds(), 'Vault test credentials not configured');

  test('dashboard renders for an authenticated member', async ({ page, request }) => {
    await loginVaultMember(page, request);
    await expect(page.locator('#nav-account-wrap')).toBeVisible();
    await expect(page.locator('#dashboard-view')).toBeVisible();
    await expect(page.locator('#profile-username')).not.toHaveText('');
  });

  test('challenge tab can be opened after auth', async ({ page, request }) => {
    await loginVaultMember(page, request);
    await page.locator('#tab-dash-challenges').click();
    await expect(page.locator('#dash-pane-challenges')).toHaveClass(/active/);
  });

  test('dashboard exposes claim center and vault status surfaces', async ({ page, request }) => {
    await loginVaultMember(page, request);
    await expect(page.locator('#claim-center-panel')).toBeVisible();
    await page.locator('#tab-dash-settings').click();
    await expect(page.locator('#vault-status-panel')).toBeVisible();
  });

  test('onboarding overlay markup is present and can be shown', async ({ page, request }) => {
    await loginVaultMember(page, request);
    await page.evaluate(() => {
      const overlay = document.getElementById('onboarding-overlay');
      if (overlay) overlay.style.display = 'block';
    });
    await expect(page.locator('#onboarding-card')).toBeVisible();
  });
});
