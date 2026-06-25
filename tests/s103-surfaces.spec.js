const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';

test.skip(({ browserName }) => browserName !== 'chromium', 'S103 smoke is pinned to Chromium in this repo.');

test('membership page mounts rank projector v2 with tier controls and 24-month horizon', async ({ page }) => {
  await page.goto(BASE + '/membership/', { waitUntil: 'load' });

  await expect(page.locator('[data-rank-projector]')).toBeAttached();
  await expect(page.locator('#vs-rp-slider')).toHaveAttribute('max', '24');
  await expect(page.locator('#vs-rp-tier [data-tier="free"]')).toBeVisible();
  await expect(page.locator('#vs-rp-tier [data-tier="sparked"]')).toBeVisible();
  await expect(page.locator('#vs-rp-tier [data-tier="eternal"]')).toBeVisible();
  await expect(page.locator('#vs-rp-rank')).not.toHaveText('');
});

test('vaultsparked page exposes the new tier promises and LLC footer', async ({ page }) => {
  await page.goto(BASE + '/vaultsparked/', { waitUntil: 'load' });

  await expect(page.getByText('Ask IGNIS (AI assistant)', { exact: true })).toBeVisible();
  await expect(page.getByText('Monthly quota', { exact: true })).toBeVisible();
  await expect(page.getByText('Eternal Dispatch (quarterly briefing)', { exact: true })).toBeVisible();
  await expect(page.getByText('Sealed-vault 48h early reveal', { exact: true })).toBeVisible();
  await expect(page.getByText('VaultSpark Studios LLC. All rights reserved.')).toBeVisible();
});

test('privacy and terms pages render the AI intelligence disclosures', async ({ page }) => {
  await page.goto(BASE + '/privacy/', { waitUntil: 'load' });
  await expect(page.getByText('AI & Intelligence Features (Ask IGNIS, Eternal Dispatch)', { exact: true })).toBeVisible();

  await page.goto(BASE + '/terms/', { waitUntil: 'load' });
  await expect(page.getByText('5b. AI & Intelligence Features', { exact: true })).toBeVisible();
  await expect(page.getByText('unlimited Ask IGNIS usage for VaultSparked Eternal members')).toBeVisible();
});
