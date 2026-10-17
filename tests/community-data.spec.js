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
  await expect(page.locator('script[src^="/assets/members-directory.shell-"]')).toHaveCount(1);
  await expect(page.locator('script[src="/assets/members-directory.js"]')).toHaveCount(0);
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
  // Podium renders silver, gold, bronze; rank follows earned points, not
  // the paid membership flag or the neutral display-name fallback.
  await expect(page.locator('.vw-podium-pts')).toHaveText(['7,000 pts','8,000 pts','6,000 pts']);
  await expect(page.locator('.vw-podium-rank')).toHaveText(['Vault Guard','Vault Breacher','Vault Guard']);
  await expect(page.locator('#members-grid .mc-username')).toHaveText(['Vault Member','Vault Member','Vault Member','Vault Member','Spark Keeper','<Vault&"Member>',"O'Vault",'Trimmed']);
  await expect(page.locator('#members-grid a.member-card')).toHaveCount(4);
  await expect(page.locator('#members-grid .mc-avatar')).toHaveText(['V','V','V','V','S','<','O','T']);
  expect(await page.locator('a[href^="/member/?u="]').evaluateAll(links => links.every(link => link.textContent.trim() && new URL(link.href).searchParams.get('u')?.trim()))).toBe(true);
  const result = await new AxeBuilder({ page }).include('#vw-podium').include('#recent-members-row').include('.lb-preview-table').include('#members-grid').withRules(['link-name']).analyze();
  expect(result.violations).toEqual([]);
  await page.locator('#member-search').fill('Vault Member');
  await expect(page.locator('#members-grid .mc-username')).toHaveText(['Vault Member','Vault Member','Vault Member','Vault Member']);
  await expect(page.locator('#members-grid a.member-card')).toHaveCount(0);
  await page.locator('#member-search').fill('  Trimmed  ');
  await expect(page.locator('#members-grid .mc-username')).toHaveText(['Trimmed']);
  await expect(page.locator('#members-grid a.member-card')).toHaveAttribute('href','/member/?u=Trimmed');
  await page.locator('#member-search').fill('no-member-matches-this');
  await expect(page.locator('#members-grid .member-card')).toHaveCount(0);
  await page.locator('#members-grid .members-clear-filters').click();
  await expect(page.locator('#members-grid .member-card')).toHaveCount(8);
  expect(errors.filter(message => /username|charAt|encodeURIComponent|URI malformed/i.test(message))).toEqual([]);
});

test('Community preserves earned rank boundaries and the full population denominator', async ({ page }) => {
  const tiers = [
    ['Spark Initiate', 0, 249], ['Vault Runner', 250, 999],
    ['Rift Scout', 1000, 2999], ['Vault Guard', 3000, 7499],
    ['Vault Breacher', 7500, 14999], ['Void Operative', 15000, 29999],
    ['Vault Keeper', 30000, 59999], ['Forge Master', 60000, 99999],
    ['The Sparked', 100000, 100001],
  ];
  // Every boundary is exercised on both sides. Paid members below 100000
  // must not count as the top earned rank. Two unfetched members retain
  // the existing lowest-tier distribution semantics.
  const rows = tiers.flatMap(([rank, min, max]) => [min, max].map(points => ({
    username: `${rank} ${points}`, points, is_sparked: points < 100000,
    created_at: '2026-09-01T00:00:00Z',
  }))).sort((a, b) => b.points - a.points);
  let visibleRows = rows;
  await page.route('**/rest/v1/public_leaderboard?**', route => route.fulfill({
    status: 200, contentType: 'application/json',
    headers: { 'content-range': `0-${visibleRows.length - 1}/${visibleRows.length + 2}`, 'access-control-expose-headers': 'content-range' },
    body: JSON.stringify(visibleRows),
  }));
  await page.goto('/community/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#stat-total')).toHaveText('20');
  await expect(page.locator('#stat-sparked')).toHaveText('2');
  await expect(page.locator('#rank-dist-bar')).toHaveAttribute('aria-label',
    'Rank distribution: ' + tiers.map(([rank], i) => `${rank} ${i === 0 ? 4 : 2}`).join(', '));
  for (const [rank, min, max] of tiers) {
    visibleRows = [max, min].map(points => ({ username: rank, points, is_sparked: true, created_at: '2026-09-01T00:00:00Z' }));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('.vw-podium-rank')).toHaveText([rank, rank]);
    await expect(page.locator('#stat-sparked')).toHaveText(rank === 'The Sparked' ? '2' : '0');
  }
});
