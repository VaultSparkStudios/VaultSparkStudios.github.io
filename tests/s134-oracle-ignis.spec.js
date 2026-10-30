// tests/s134-oracle-ignis.spec.js — browser tests for the IGNIS project block
// widget and the /oracle/ ecosystem page. Runs against BASE_URL (defaults to
// the local preview server when not set; live URL otherwise).

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173';
const IS_LOCAL = /localhost|127\.0\.0\.1/.test(BASE);

// ignis/output/ is gitignored — absent on CI; skip IGNIS-block tests when missing
const VOICES_PATH = path.join(__dirname, '..', 'ignis', 'output', 'project-voices.json');
const IGNIS_OUTPUT_PRESENT = fs.existsSync(VOICES_PATH);

test.describe('IGNIS project block widget', () => {
  test('renders on /games/solara/ with voice quote', async ({ page }) => {
    if (!IGNIS_OUTPUT_PRESENT) test.skip(true, 'ignis/output/project-voices.json is gitignored — absent on CI');
    await page.goto(`${BASE}/games/solara/`, { waitUntil: 'load' });
    const block = page.locator('.ignis-project-block').first();
    await expect(block).toBeVisible();
    // The widget mounts asynchronously; wait for hydration
    await expect(block.locator('.ignis-block-quote p')).toBeVisible({ timeout: 6000 });
    await expect(block.locator('.ignis-block-eyebrow')).toContainText(/IGNIS · Living Flame Intelligence/i);
    await expect(block.locator('.ignis-block-pill')).toContainText(/SPARKED|FORGE|VAULTED/);
    // Voice text should be non-trivial
    const quote = await block.locator('.ignis-block-quote p').textContent();
    expect((quote || '').length).toBeGreaterThan(30);
  });

  test('renders on /projects/ideaforge/ and exposes canonical Visit-live link', async ({ page }) => {
    if (!IGNIS_OUTPUT_PRESENT) test.skip(true, 'ignis/output/project-voices.json is gitignored — absent on CI');
    await page.goto(`${BASE}/projects/ideaforge/`, { waitUntil: 'load' });
    const block = page.locator('.ignis-project-block').first();
    await expect(block).toBeVisible();
    await expect(block.locator('.ignis-block-quote p')).toBeVisible({ timeout: 6000 });
    const live = block.locator('.ignis-block-live');
    if (await live.count()) {
      const href = await live.first().getAttribute('href');
      expect(href).toMatch(/^https?:\/\//);
      expect(href).not.toMatch(/app-dun-six-76\.vercel\.app/);
    }
  });

  test('no migrated vercel host appears anywhere on /projects/ideaforge/', async ({ page }) => {
    if (!IGNIS_OUTPUT_PRESENT) test.skip(true, 'ignis/output/project-voices.json is gitignored — absent on CI');
    test.setTimeout(60_000);
    await page.goto(`${BASE}/projects/ideaforge/`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    const html = await page.content();
    expect(html).not.toContain('app-dun-six-76.vercel.app');
  });

  test('no /vorn/ or /velaxis/ dead internal CTA appears', async ({ page }) => {
    if (!IGNIS_OUTPUT_PRESENT) test.skip(true, 'ignis/output/project-voices.json is gitignored — absent on CI');
    for (const slug of ['vorn', 'velaxis']) {
      await page.goto(`${BASE}/projects/${slug}/`, { waitUntil: 'domcontentloaded' });
      const ctas = page.locator(`a[href="/${slug}/"]`);
      await expect(ctas).toHaveCount(0);
    }
  });

  test('voice quote on /games/solara/ is visitor-readable with personality', async ({ page }) => {
    if (!IGNIS_OUTPUT_PRESENT) test.skip(true, 'ignis/output/project-voices.json is gitignored — absent on CI');
    test.setTimeout(45_000);
    await page.goto(`${BASE}/games/solara/`, { waitUntil: 'load' });
    const quote = await page.locator('.ignis-project-block .ignis-block-quote p').first().textContent({ timeout: 8000 });

    // Curator voice must NOT contain dev-coded IGNIS jargon
    expect(quote).not.toMatch(/regime|surprise score|coverage \d+%|cycle\b|cohort|pillar authority/i);

    // Must reference the project's distinct character or a visitor-facing metric
    expect(quote.length).toBeGreaterThan(80);
    expect(quote).toMatch(/sun|public act|shared|world|resting|sit|run|brightness|dim/i);
  });

  test('voice quotes carry tone metadata', async ({ page }) => {
    if (!IGNIS_OUTPUT_PRESENT) test.skip(true, 'ignis/output/project-voices.json is gitignored — absent on CI');
    await page.goto(`${BASE}/games/solara/`, { waitUntil: 'load' });
    const footer = await page.locator('.ignis-project-block .ignis-block-quote footer').first().textContent({ timeout: 8000 });
    expect(footer).toMatch(/IGNIS/);
    expect(footer).toMatch(/\((philosophical|wry|patient|appreciative|historical|infrastructural|incisive|conviction|operational|cryptic|self-aware|observational|founder-aware|matter-of-fact|engineering-aware|respectful|approving|structural|front-door|decisive|pragmatic|candid|strategic|auditor)\)/i);
  });

  test('voice quotes use concrete metrics, not generic prose', async ({ page }) => {
    if (!IGNIS_OUTPUT_PRESENT) test.skip(true, 'ignis/output/project-voices.json is gitignored — absent on CI');
    test.setTimeout(120_000);
    // Sample 3 distinct projects; each should cite at least one number, date,
    // or comparative claim ("only", "first", "most", "longest", "oldest", etc.)
    const samples = [
      { path: '/games/mindframe/', expect: /\d|only|most|third|first/i },
      { path: '/projects/canon/', expect: /\d|only|most|seven/i },
      { path: '/games/vaultfront/', expect: /\d|oldest|order of magnitude|biggest|largest/i },
    ];
    for (const s of samples) {
      await page.goto(`${BASE}${s.path}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForSelector('.ignis-project-block .ignis-block-quote p', { timeout: 15_000 });
      const quote = await page.locator('.ignis-project-block .ignis-block-quote p').first().textContent();
      expect(quote, `quote on ${s.path} should cite a concrete metric or comparison`).toMatch(s.expect);
    }
  });
});

test.describe('Oracle page', () => {
  test('renders headline + stats panel populates', async ({ page }) => {
    await page.goto(`${BASE}/oracle/`, { waitUntil: 'load' });
    await expect(page).toHaveURL(url => url.pathname === '/ignis/' && url.hash === '#oracle');
    await expect(page.getByRole('heading', { name: 'The Oracle.', exact: true })).toBeVisible();
    await expect(page.locator('#oracle-stat-total')).not.toHaveText('—', { timeout: 6000 });
    await expect(page.locator('#oracle-stat-green')).not.toHaveText('—');
  });

  test('feed renders one or more IGNIS blocks', async ({ page }) => {
    await page.goto(`${BASE}/oracle/`, { waitUntil: 'load' });
    const blocks = page.locator('#oracle-feed .ignis-project-block');
    await expect(blocks.first()).toBeVisible({ timeout: 8000 });
    const count = await blocks.count();
    expect(count).toBeGreaterThan(5);
  });

  test('velocity chart renders with populated stats', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto(`${BASE}/oracle/`, { waitUntil: 'load', timeout: 60_000 });
    const chart = page.locator('#oracle-velocity-chart');
    await expect(chart).toBeVisible({ timeout: 15_000 });
    // wait for population
    await expect(page.locator('#vel-commits')).not.toHaveText('—', { timeout: 15_000 });
    await expect(page.locator('#vel-repos')).not.toHaveText('—', { timeout: 5_000 });
    // Public-safe daily feeds intentionally omit private cognition history.
    // The chart must still render commit bars + the derived active-repo line;
    // the IGNIS line is asserted only when that optional series is present.
    await expect.poll(async () => {
      return page.locator('#vel-commit-bars rect').count();
    }, { timeout: 10_000 }).toBeGreaterThan(0);
    await expect.poll(async () => {
      const d = await page.locator('#vel-active-line').getAttribute('d');
      return d?.length || 0;
    }, { timeout: 10_000 }).toBeGreaterThan(20);
  });

  test('filter buttons toggle aria-pressed', async ({ page }) => {
    await page.goto(`${BASE}/oracle/`, { waitUntil: 'load' });
    const greenBtn = page.locator('.oracle-filter[data-filter="green"]');
    await greenBtn.click();
    await expect(greenBtn).toHaveAttribute('aria-pressed', 'true');
    const allBtn = page.locator('.oracle-filter[data-filter="all"]');
    await allBtn.click();
    await expect(allBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(greenBtn).toHaveAttribute('aria-pressed', 'false');
  });

  test('canonical IGNIS score populates without the retired duplicate gauge', async ({ page }) => {
    await page.goto(`${BASE}/oracle/`, { waitUntil: 'load' });
    await expect(page.locator('#ignis-live-score')).not.toHaveText('—');
    await expect(page.locator('#ignis-live-score')).toHaveText(/[\d,]+/);
    await expect(page.locator('#ignis-live-tier')).toContainText(/tier/i);
    await expect(page.locator('.oracle-ignis-card')).toHaveCount(0);
  });

  test('comparison share link is present and keeps the canonical destination', async ({ page }) => {
    await page.goto(`${BASE}/oracle/`, { waitUntil: 'load' });
    const shareBtn = page.getByRole('link', { name: 'Share this read', exact: true });
    await expect(shareBtn).toBeVisible();
    await expect(shareBtn).toHaveAttribute('href', /^\/ignis\/\?compare=/);
  });
});

test.describe('Navigation discoverability', () => {
  // Oracle should be linked from any page that carries the propagated nav.
  test('Studio dropdown links to the canonical IGNIS destination', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    const link = page.locator('.site-header .nav-dropdown a[href="/ignis/"]').first();
    await expect(link).toHaveText('IGNIS');
    await link.locator('xpath=ancestor::*[contains(@class, "has-dropdown")][1]').hover();
    await link.click();
    await expect(page).toHaveURL(url => url.pathname === '/ignis/');
    await expect(page.getByRole('heading', { name: 'The Oracle.', exact: true })).toBeAttached();
  });

  test('Footer intelligence column links directly to IGNIS', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    const footerOracle = page.locator('footer.site-footer a[href="/ignis/"]');
    await expect(footerOracle.first()).toHaveText('IGNIS');
  });
});
