const { test, expect } = require('@playwright/test');
const { hasVaultCreds, loginVaultMemberByType } = require('./helpers/vaultAuth');

test.describe('Eternal intelligence surface', () => {
  test('Sparked members see the Eternal upgrade state before dispatch content', async ({ page, request }) => {
    test.skip(!hasVaultCreds('sparked'), 'Sparked QA credentials not configured');

    try {
      await loginVaultMemberByType(page, request, 'sparked');
    } catch (error) {
      test.skip(true, `Sparked QA login unavailable locally: ${error.message}`);
    }

    const panel = page.locator('#eternal-intelligence-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('Eternal Upgrade');
    await expect(panel).toContainText('Go VaultSparked Eternal');
  });

  test('Eternal members load the dispatch positive path', async ({ page, request }) => {
    test.skip(!hasVaultCreds('eternal'), 'Eternal QA credentials not configured');

    try {
      await loginVaultMemberByType(page, request, 'eternal');
    } catch (error) {
      test.skip(true, `Eternal QA login unavailable locally: ${error.message}`);
    }

    const panel = page.locator('#eternal-intelligence-panel');
    await expect(panel).toBeVisible();
    await expect(panel.locator('#eternal-intelligence-content')).toContainText('Eternal Dispatch', { timeout: 20000 });
    await expect(panel.locator('#eternal-intelligence-content')).toContainText('48-Hour Reveal Window');
    await expect(panel.locator('#eternal-intelligence-content')).toContainText('Eternal Credits Queue');
  });
});
