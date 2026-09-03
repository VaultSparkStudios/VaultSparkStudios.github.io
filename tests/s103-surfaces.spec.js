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

/**
 * S335 merged /vaultsparked/ into /membership/#tiers and deleted the page. This
 * test kept asking the retired alias for four exact marketing strings, none of
 * which survive anywhere in the tree — so it had been failing since that merge,
 * invisible behind the smoke pre-gate that was failing for the same reason
 * (S340). It now asserts the merge CONTRACT — the alias still lands a visitor on
 * the tier ladder — and then the durable surface: the tier names and the legal
 * footer, not revisable copy.
 */
test('the retired /vaultsparked/ alias lands on the tier ladder, which renders its tiers and LLC footer', async ({ page }) => {
  await page.goto(BASE + '/vaultsparked/', { waitUntil: 'load' });

  // The alias must arrive at its declared destination, not merely at some page.
  await expect(page).toHaveURL(/\/membership\/(#tiers)?$/);

  const tiers = page.locator('#tiers');
  await expect(tiers).toBeVisible();

  // Assert the ladder's SHAPE, not its marketing copy — that is what the old
  // four-string assertion got wrong. Every tier card must carry a name, a price
  // and a call to action; a tier that loses any of those is a broken offer,
  // while a reworded tagline is just editing.
  const cards = tiers.locator('.mem-tier-card');
  await expect(cards).toHaveCount(3);
  for (const part of ['.mem-tier-name', '.mem-tier-price', '.mem-tier-cta']) {
    await expect(tiers.locator(part)).toHaveCount(3);
  }
  await expect(page.getByText('VaultSpark Studios LLC. All rights reserved.')).toBeVisible();
});

test('privacy and terms pages render the AI intelligence disclosures', async ({ page }) => {
  await page.goto(BASE + '/privacy/', { waitUntil: 'load' });
  await expect(page.getByText('AI & Intelligence Features (Ask IGNIS, Eternal Dispatch)', { exact: true })).toBeVisible();

  await page.goto(BASE + '/terms/', { waitUntil: 'load' });
  await expect(page.getByText('5b. AI & Intelligence Features', { exact: true })).toBeVisible();
  await expect(page.getByText('unlimited Ask IGNIS usage for VaultSparked Eternal members')).toBeVisible();
});
