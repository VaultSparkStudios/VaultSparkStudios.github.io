import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const themes = ['dark', 'light', 'ambient', 'warm', 'cool', 'lava', 'high-contrast'];
const surfaces = [
  { name: 'homepage showcase', path: '/', selector: '[data-analytica-surface="showcase"]', state: '[data-analytica-surface]' },
  { name: 'public stats report', path: '/evidence/#numbers', selector: 'body', state: '[data-analytica-surface]' },
  { name: 'ecosystem stats report', path: '/stats/ecosystem/', selector: 'body', state: '[data-ecosystem-stats]' },
  { name: 'Desk reader and panel controls', path: '/news/2026-08-11/cloudflare-gave-the-agent-a-browser-and-a-chaperone/#editorial-illustration-1', selector: 'body', state: null },
];

for (const theme of themes) {
  for (const surface of surfaces) {
    test(`${surface.name} clears AA contrast in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.addInitScript((selectedTheme) => localStorage.setItem('vs_theme', selectedTheme), theme);
      await page.goto(surface.path, { waitUntil: 'domcontentloaded' });
      if (surface.state) await expect(page.locator(surface.state)).toHaveAttribute('data-state', 'ready');
      else await expect(page.locator('.desk-panel-reactions').first()).toBeVisible();
      const results = await new AxeBuilder({ page }).include(surface.selector).withTags(['wcag2aa', 'wcag21aa']).analyze();
      expect(results.violations.filter((violation) => violation.id === 'color-contrast')).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    });
  }
}

test('ecosystem explorer preserves response denominators and every project state', async ({ page }) => {
  const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/ecosystem-stats.json');
  await page.goto('/stats/ecosystem/', { waitUntil: 'domcontentloaded' });
  const data = await (await response).json();
  await expect(page.locator('[data-ecosystem-stats]')).toHaveAttribute('data-state', 'ready');
  expect(data.projects.length).toBeGreaterThan(0);
  expect(data.totals.publicProjects).toBe(data.projects.length);
  await expect(page.locator('.ecosystem-project h3')).toHaveText(data.projects.map(p => p.name));
  expect(await page.locator('.ecosystem-project').evaluateAll(cards => cards.map(c => c.dataset.state)))
    .toEqual(data.projects.map(p => p.measurementState));
  for (const [label, numerator, percentage] of [
    ['Audience coverage', data.totals.audienceMeasuredProjects, data.coverage.audienceProjectCoveragePct],
    ['Edge coverage', data.totals.edgeMeasuredProjects, data.coverage.edgeProjectCoveragePct],
  ]) {
    const card = page.locator('.ecosystem-kpi').filter({ has: page.getByRole('heading', { name: label, exact: true }) });
    await expect(card.locator('.ecosystem-kpi__value')).toHaveText(`${percentage}%`);
    await expect(card.locator('p').last()).toHaveText(`${numerator} of ${data.totals.publicProjects} public projects`);
  }
  const measurement = page.locator('select[name=measurement]');
  for (const state of await measurement.locator('option').evaluateAll(options => options.map(o => o.value))) {
    await measurement.selectOption(state);
    const expected = data.projects.filter(p => state === 'all' || p.measurementState === state);
    await expect(page.locator('.ecosystem-project:visible h3')).toHaveText(expected.map(p => p.name));
    await expect(page.locator('[data-filter-count]')).toHaveText(`${expected.length} of ${data.projects.length} public projects shown`);
  }
  await measurement.selectOption('all');
  for (const status of [...new Set(data.projects.map(p => p.vaultStatus))]) {
    await page.locator('select[name=status]').selectOption(status);
    await expect(page.locator('.ecosystem-project:visible h3')).toHaveText(data.projects.filter(p => p.vaultStatus === status).map(p => p.name));
  }
  await page.locator('select[name=status]').selectOption('all');
  const project = data.projects[0];
  await page.locator('input[name=query]').fill(project.slug);
  await expect(page.locator('.ecosystem-project:visible h3')).toHaveText(data.projects.filter(p => p.slug.includes(project.slug) || p.name.toLowerCase().includes(project.slug)).map(p => p.name));
  await page.locator('input[name=query]').fill('no-project-matches-this-query');
  await expect(page.locator('.ecosystem-project:visible')).toHaveCount(0);
  await expect(page.locator('[data-filter-count]')).toHaveText(`0 of ${data.projects.length} public projects shown`);
});

test('ecosystem explorer keeps unavailable measurements distinct from zero', async ({ page }) => {
  await page.route('**/api/ecosystem-stats.json', async route => {
    const response = await route.fetch();
    const data = await response.json();
    data.projects = [{ ...data.projects[0], name: 'Unobserved fixture', slug: 'unobserved-fixture', measurementState: 'unobserved', audience30: { available: false }, infrastructure30: { available: false }, hostsMeasured: [], zones: [] }];
    data.totals.publicProjects = 1;
    data.totals.audienceMeasuredProjects = 0;
    data.totals.edgeMeasuredProjects = 0;
    data.totals.humanPageLoads30 = { estimate: 0, lower: 0, upper: 0, sampleSize: 0 };
    data.totals.humanVisits30 = { estimate: 0, lower: 0, upper: 0, sampleSize: 0 };
    for (const metric of ['edgeRequests30', 'htmlResponses30', 'cachedRequests30', 'bytes30', 'threats30']) data.totals[metric] = 0;
    data.coverage.audienceProjectCoveragePct = 0;
    data.coverage.edgeProjectCoveragePct = 0;
    await route.fulfill({ response, json: data });
  });
  await page.goto('/stats/ecosystem/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-ecosystem-stats]')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('.ecosystem-project dd')).toHaveText(['Unmeasured', 'Unmeasured', 'Unmeasured', 'Unmeasured']);
  await expect(page.locator('[data-filter-count]')).toHaveText('1 of 1 public projects shown');
});

test('ecosystem explorer reports a failed feed without invented metrics', async ({ page }) => {
  await page.route('**/api/ecosystem-stats.json', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  await page.goto('/stats/ecosystem/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-ecosystem-stats]')).toHaveAttribute('data-state', 'unavailable');
  await expect(page.locator('[data-ecosystem-asof]')).toHaveText('The aggregate feed is unavailable. Missing data is not shown as zero.');
  await expect(page.locator('.ecosystem-project')).toHaveCount(0);
  await expect(page.locator('.ecosystem-kpi__value')).toHaveCount(0);
});
