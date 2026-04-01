const { test, expect } = require('@playwright/test');
const { hasVaultCreds, loginVaultMember, loginVaultMemberWithTheme } = require('./helpers/vaultAuth');

async function dismissWhatsNewModal(page) {
  const modal = page.locator('#whats-new-modal');
  if (!(await modal.isVisible().catch(() => false))) return;

  const closeButton = modal.getByRole('button', { name: 'Close' });
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click();
    await expect(modal).toBeHidden();
    return;
  }

  await page.evaluate(() => {
    const modalEl = document.getElementById('whats-new-modal');
    if (modalEl) modalEl.style.display = 'none';
  });
}

test.describe('Vault portal authenticated flows', () => {
  test.describe.configure({ timeout: 60000 });
  test.skip(!hasVaultCreds(), 'Vault test credentials not configured');

  test('dashboard renders for an authenticated member', async ({ page, request }) => {
    await loginVaultMember(page, request);
    await expect(page.locator('#dashboard-view')).toBeVisible();
    await expect(page.locator('#profile-username')).not.toHaveText('');
    await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();
  });

  test('challenge tab can be opened after auth', async ({ page, request }) => {
    await loginVaultMember(page, request);
    await page.locator('#tab-dash-challenges').click();
    await expect(page.locator('#dash-pane-challenges')).toHaveClass(/active/);
  });

  test('dashboard exposes claim center and vault status surfaces', async ({ page, request }) => {
    await loginVaultMember(page, request);
    await expect(page.locator('#claim-center-panel')).toBeVisible();
    await dismissWhatsNewModal(page);
    await page.locator('#tab-dash-settings').click();
    await expect(page.locator('#vault-status-panel')).toBeVisible();
  });

  test('device theme override persists into vault status messaging', async ({ page, request }) => {
    await loginVaultMemberWithTheme(page, request, 'lava');
    await dismissWhatsNewModal(page);
    await page.locator('#tab-dash-settings').click();
    await expect(page.locator('#vault-status-panel')).toBeVisible();
    await expect(page.locator('#vault-status-theme')).toContainText('Lava');
    await expect(page.locator('#vault-status-theme')).toContainText('this device');
    await expect(page.locator('#theme-select')).toHaveValue('lava');
  });

  test('claim center and vault status reflect membership/account state', async ({ page, request }) => {
    await loginVaultMember(page, request);
    await expect(page.locator('#claim-center-focus')).not.toHaveText('Loading…');
    await expect(page.locator('#claim-center-treasury')).toContainText('pts');
    await dismissWhatsNewModal(page);
    await page.locator('#tab-dash-settings').click();
    await expect(page.locator('#vault-status-membership')).toContainText(/VaultSparked|Free Vault Member/);
    await expect(page.locator('#vault-status-dispatch')).toContainText(/enabled|muted/);
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
