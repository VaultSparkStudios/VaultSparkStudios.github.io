const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

// Exercise the public view as delivered, including rows whose handle has not
// been populated. The DOM assertions cover all three consumers of that view.
test('Community handles unnamed members without empty profile links', async ({ page }) => {
  const names = ['', null, ' \t ', undefined, 'Spark Keeper', '<Vault&"Member>', "O'Vault", '  Trimmed  '];
  const rows = names.map((username, i) => ({ username, points: 8000 - i * 1000, created_at: `2026-09-${String(9-i).padStart(2,'0')}T00:00:00Z`, is_sparked: false }));
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/rest/v1/public_leaderboard?**', route => {
    const query = new URL(route.request().url()).searchParams;
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '0-7/8', 'access-control-expose-headers': 'content-range' }, body: JSON.stringify(query.get('select') === 'id' ? [] : rows) });
  });
  await page.goto('/community/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.recent-member-chip')).toHaveCount(8);
  await expect(page.locator('.vw-podium-username')).toHaveText(['Vault Member','Vault Member','Vault Member']);
  await expect(page.locator('.vw-podium-username a')).toHaveCount(0);
  await expect(page.locator('.lbp-name')).toHaveText(['Vault Member','Vault Member','Vault Member','Vault Member','Spark Keeper']);
  await expect(page.locator('.rmc-name')).toHaveText(['Vault Member','Vault Member','Vault Member','Vault Member','Spark Keeper','<Vault&"Member>',"O'Vault",'Trimmed']);
  await expect(page.locator('.recent-member-chip .rmc-avatar')).toHaveText(['V','V','V','V','S','<','O','T']);
  await expect(page.locator('.rmc-name a')).toHaveCount(4);
  for (const handle of ['Spark Keeper','<Vault&"Member>',"O'Vault",'Trimmed']) {
    await expect(page.locator('.rmc-name').getByRole('link', { name: handle, exact: true })).toHaveAttribute('href', '/member/?u=' + encodeURIComponent(handle));
  }
  await expect(page.locator('.lbp-rank')).toHaveText(['1','2','3','4','5']);
  await expect(page.locator('.vw-podium-rank')).toHaveText(['The Sparked','The Sparked','The Sparked']);
  expect(await page.locator('a[href^="/member/?u="]').evaluateAll(links => links.every(link => link.textContent.trim() && new URL(link.href).searchParams.get('u')?.trim()))).toBe(true);
  const result = await new AxeBuilder({ page }).include('#vw-podium').include('#recent-members-row').include('.lb-preview-table').withRules(['link-name']).analyze();
  expect(result.violations).toEqual([]);
  expect(errors.filter(message => /username|charAt|encodeURIComponent|URI malformed/i.test(message))).toEqual([]);
});
