const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Offline, deployment-independent proof for assets/returning-visitor-digest.js.
// Serve a controlled origin and ledger, but load the real asset through its
// script request. The homepage owns an inline signal; other pages can show the
// floating digest. Both consume the same previous-visit baseline.

const ASSET = path.join(__dirname, '..', 'assets', 'returning-visitor-digest.js');
const ASSET_SRC = fs.readFileSync(ASSET, 'utf8');
const ORIGIN = 'http://vsx.test/';
const GAMES = new URL('games/', ORIGIN).href;
const SCRIPT = new URL('assets/returning-visitor-digest.js', ORIGIN).href;

function ledger(entries) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify({ entries }) };
}

async function stub(page, commitMapEntries, { feedStatus = 200 } = {}) {
  await page.route('http://vsx.test/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/assets/returning-visitor-digest.js') {
      return route.fulfill({ status: 200, contentType: 'text/javascript', body: ASSET_SRC });
    }
    if (url.pathname === '/api/commit-map.json') {
      return route.fulfill({ ...ledger(commitMapEntries), status: feedStatus });
    }
    return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><head></head><body></body></html>' });
  });
}

async function load(page, { url = GAMES, fetchesLedger = true } = {}) {
  await page.goto(url);
  const response = fetchesLedger
    ? page.waitForResponse((r) => new URL(r.url()).pathname === '/api/commit-map.json')
    : null;
  await page.addScriptTag({ url: SCRIPT });
  if (response) {
    await (await response).finished();
    // Allow the response consumer and its paint to finish before checking that
    // a notice stayed absent; a zero-count assertion alone can pass too early.
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  }
}

async function seed(page, { visitCount, lastVisitTs }) {
  await page.addInitScript(({ vc, lv }) => {
    try {
      if (vc != null) localStorage.setItem('vs_visit_count', String(vc));
      if (lv != null) localStorage.setItem('vs_last_visit_ts', String(lv));
    } catch (_) {}
  }, { vc: visitCount, lv: lastVisitTs });
}

test.describe('returning-visitor-digest', () => {
  test.use({ baseURL: undefined });

  test('shows the momentum strip when >=2 ships landed since the last visit', async ({ page }) => {
    const lastVisit = Date.UTC(2026, 5, 1); // 2026-06-01
    await stub(page, [
      { sha: 'a', ts: '2026-06-07T18:00:00.000Z', summary: 'ship one' },
      { sha: 'b', ts: '2026-06-06T18:00:00.000Z', summary: 'ship two' },
      { sha: 'c', ts: '2026-05-20T18:00:00.000Z', summary: 'before last visit' },
    ]);
    await seed(page, { visitCount: 3, lastVisitTs: lastVisit });
    await load(page);

    const strip = page.locator('[role="status"]');
    await expect(strip).toBeVisible();
    await expect(strip).toContainText('Since your last visit');
    await expect(strip).toContainText('2 things shipped'); // the May ship is excluded
    await expect(page.locator('[role="status"] a[href="/studio-pulse/"]')).toHaveCount(1);
    await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
    await expect(strip).toHaveCount(0);
  });

  test('stays silent for a first-ever visitor (no baseline yet) and sets the baseline', async ({ page }) => {
    await stub(page, [{ sha: 'a', ts: '2026-06-07T18:00:00.000Z', summary: 'ship' }]);
    await seed(page, { visitCount: 1, lastVisitTs: null });
    const requests = [];
    page.on('request', (r) => requests.push(new URL(r.url()).pathname));
    const before = Date.now();
    await load(page, { fetchesLedger: false });

    await expect(page.locator('[role="status"]')).toHaveCount(0);
    const baseline = await page.evaluate(() => localStorage.getItem('vs_last_visit_ts'));
    expect(Number(baseline)).toBeGreaterThanOrEqual(before);
    expect(Number(baseline)).toBeLessThanOrEqual(Date.now());
    expect(await page.evaluate(() => localStorage.getItem('vs_visit_count'))).toBe('1');
    expect(requests).not.toContain('/api/commit-map.json');
  });

  test('stays silent when fewer than 2 ships landed since the last visit', async ({ page }) => {
    const lastVisit = Date.UTC(2026, 5, 7); // 2026-06-07
    await stub(page, [
      { sha: 'a', ts: '2026-06-07T20:00:00.000Z', summary: 'only one since' },
      { sha: 'b', ts: '2026-06-01T18:00:00.000Z', summary: 'before' },
    ]);
    await seed(page, { visitCount: 4, lastVisitTs: lastVisit });
    await load(page);

    await expect(page.locator('[role="status"]')).toHaveCount(0);
  });

  test('homepage suppresses the floating digest and hands its previous baseline to the inline signal', async ({ page }) => {
    const lastVisit = Date.UTC(2026, 5, 1);
    await stub(page, [
      { sha: 'a', ts: '2026-06-07T18:00:00.000Z' },
      { sha: 'b', ts: '2026-06-06T18:00:00.000Z' },
    ]);
    await seed(page, { visitCount: 3, lastVisitTs: lastVisit });
    await load(page, { url: ORIGIN });

    await expect(page.locator('[role="status"]')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('vs_prev_visit_ts'))).toBe(String(lastVisit));
    expect(Number(await page.evaluate(() => localStorage.getItem('vs_last_visit_ts')))).toBeGreaterThan(lastVisit);
    expect(await page.evaluate(() => localStorage.getItem('vs_visit_count'))).toBe('4');
  });

  test('a reload in the same session preserves both baselines and does not fetch another digest', async ({ page }) => {
    const lastVisit = Date.UTC(2026, 5, 1);
    await stub(page, [{ ts: '2026-06-07T18:00:00.000Z' }, { ts: '2026-06-06T18:00:00.000Z' }]);
    let requests = 0;
    page.on('request', (r) => { if (new URL(r.url()).pathname === '/api/commit-map.json') requests++; });
    // Seed only once: an init script would overwrite storage on reload.
    await page.goto(GAMES);
    await page.evaluate(({ lastVisit }) => {
      localStorage.setItem('vs_last_visit_ts', String(lastVisit));
      localStorage.setItem('vs_visit_count', '3');
    }, { lastVisit });
    const response = page.waitForResponse('**/api/commit-map.json');
    await page.addScriptTag({ url: SCRIPT });
    await (await response).finished();
    await expect(page.locator('[role="status"]')).toBeVisible();
    const before = await page.evaluate(() => ({ last: localStorage.getItem('vs_last_visit_ts'), previous: localStorage.getItem('vs_prev_visit_ts'), visits: localStorage.getItem('vs_visit_count') }));
    await page.reload();
    await page.addScriptTag({ url: SCRIPT });
    await expect(page.locator('[role="status"]')).toHaveCount(0);
    expect(await page.evaluate(() => ({ last: localStorage.getItem('vs_last_visit_ts'), previous: localStorage.getItem('vs_prev_visit_ts'), visits: localStorage.getItem('vs_visit_count') }))).toEqual(before);
    expect(requests).toBe(1);
  });

  test('a failed ledger stays silent without losing the consumed baseline', async ({ page }) => {
    const lastVisit = Date.UTC(2026, 5, 1);
    await stub(page, [{ ts: '2026-06-07T18:00:00.000Z' }, { ts: '2026-06-06T18:00:00.000Z' }], { feedStatus: 503 });
    await seed(page, { visitCount: 3, lastVisitTs: lastVisit });
    await load(page);
    await expect(page.locator('[role="status"]')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('vs_prev_visit_ts'))).toBe(String(lastVisit));
  });
});
