const { test, expect } = require('@playwright/test');
const {
  hasVaultCreds,
  loginVaultMember,
  loginVaultMemberByType,
  loginVaultMemberWithTheme,
} = require('./helpers/vaultAuth');

const SUPABASE_ODDS_URL = 'https://fjnpzjjyhnpmunfoycrp.supabase.co/functions/v1/odds?sport=americanfootball_nfl&markets=h2h&regions=us';

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

async function getSessionAccessToken(page) {
  return page.evaluate(async () => {
    const { data } = await window.VSSupabase.auth.getSession();
    return data?.session?.access_token || null;
  });
}

async function probeOddsAccess(page, request) {
  const accessToken = await getSessionAccessToken(page);
  const response = await request.get(SUPABASE_ODDS_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return {
    status: response.status(),
    body: await response.text(),
  };
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

  test('account-backed theme sync restores after local preference is cleared', async ({ page, request }) => {
    await loginVaultMemberByType(page, request, 'free');
    await dismissWhatsNewModal(page);
    await page.selectOption('#theme-select', 'cool');
    await page.waitForFunction(() => {
      return document.body.dataset.theme === 'cool' && localStorage.getItem('vs_theme') === 'cool';
    });
    await page.evaluate(() => localStorage.removeItem('vs_theme'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await dismissWhatsNewModal(page);
    await page.locator('#tab-dash-settings').click();
    await expect(page.locator('#theme-select')).toHaveValue('cool');
    await expect(page.locator('#vault-status-theme')).toContainText('Cool');
    await expect(page.locator('#vault-status-theme')).toContainText('account restore ready');
  });

  test('free and VaultSparked members diverge on archive access and live-tool entitlement', async ({ page, request }) => {
    await loginVaultMemberByType(page, request, 'free');
    await dismissWhatsNewModal(page);
    await page.locator('#tab-dash-archive').click();
    await page.waitForFunction(() => Array.isArray(window._archiveFiles) && window._archiveFiles.length > 0);
    const freeArchiveState = await page.evaluate(() => {
      const sparkedMemo = window._archiveFiles.find((file) => file.slug === 'sparked-initiative-memo');
      return sparkedMemo ? { locked: !!sparkedMemo.locked, requiredPlan: sparkedMemo.required_plan } : null;
    });
    const freeOdds = await probeOddsAccess(page, request);

    await loginVaultMemberByType(page, request, 'sparked');
    await dismissWhatsNewModal(page);
    await page.locator('#tab-dash-settings').click();
    await expect(page.locator('#vault-status-membership')).toContainText('VaultSparked active');
    await page.locator('#tab-dash-archive').click();
    await page.waitForFunction(() => Array.isArray(window._archiveFiles) && window._archiveFiles.length > 0);
    const sparkedArchiveState = await page.evaluate(() => {
      const sparkedMemo = window._archiveFiles.find((file) => file.slug === 'sparked-initiative-memo');
      return sparkedMemo ? { locked: !!sparkedMemo.locked, requiredPlan: sparkedMemo.required_plan } : null;
    });
    const sparkedOdds = await probeOddsAccess(page, request);
    await page.locator('#tab-dash-earlyaccess').click();
    await expect(page.locator('#beta-keys-list')).not.toContainText('Loading…');
    await expect(page.locator('#gift-sub-btn')).toContainText('$24.99');

    expect(freeArchiveState).not.toBeNull();
    expect(freeArchiveState.locked).toBe(true);
    expect(freeArchiveState.requiredPlan).toBe('vault_sparked');
    expect(freeOdds.status).toBe(403);

    expect(sparkedArchiveState).not.toBeNull();
    expect(sparkedArchiveState.locked).toBe(false);
    expect(sparkedOdds.status).not.toBe(403);
  });

  test('PromoGrind Pro keeps live-tools entitlement without Sparked identity perks', async ({ page, request }) => {
    test.skip(!hasVaultCreds('promogrind'), 'PromoGrind Pro test credentials not configured');
    await loginVaultMemberByType(page, request, 'promogrind');
    await dismissWhatsNewModal(page);
    await page.locator('#tab-dash-settings').click();
    await expect(page.locator('#vault-status-membership')).toContainText('Free Vault Member');
    const oddsProbe = await probeOddsAccess(page, request);
    expect(oddsProbe.status).not.toBe(403);
  });
});
