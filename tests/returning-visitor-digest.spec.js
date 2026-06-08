const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Offline, deployment-independent proof for assets/returning-visitor-digest.js.
// The asset is new (not yet on prod), so this serves a stub origin via route
// interception, mocks the public Forge Ledger, seeds localStorage, injects the
// real asset file, and asserts the momentum strip behaves honestly.

const ASSET = path.join(__dirname, '..', 'assets', 'returning-visitor-digest.js');
const ASSET_SRC = fs.readFileSync(ASSET, 'utf8');
const ORIGIN = 'http://vsx.test/';

function ledger(entries) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify({ entries }) };
}

async function stub(page, commitMapEntries) {
  await page.route(ORIGIN, (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><head></head><body></body></html>' }));
  await page.route('**/api/commit-map.json', (route) => route.fulfill(ledger(commitMapEntries)));
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
    await page.goto(ORIGIN);
    await page.addScriptTag({ content: ASSET_SRC });

    const strip = page.locator('[role="status"]');
    await expect(strip).toBeVisible();
    await expect(strip).toContainText('Since your last visit');
    await expect(strip).toContainText('2 things shipped'); // the May ship is excluded
    await expect(page.locator('[role="status"] a[href="/studio-pulse/"]')).toHaveCount(1);
  });

  test('stays silent for a first-ever visitor (no baseline yet) and sets the baseline', async ({ page }) => {
    await stub(page, [{ sha: 'a', ts: '2026-06-07T18:00:00.000Z', summary: 'ship' }]);
    await seed(page, { visitCount: 1, lastVisitTs: null });
    await page.goto(ORIGIN);
    await page.addScriptTag({ content: ASSET_SRC });

    await expect(page.locator('[role="status"]')).toHaveCount(0);
    const baseline = await page.evaluate(() => localStorage.getItem('vs_last_visit_ts'));
    expect(baseline).toBeTruthy(); // baseline now set for next visit
  });

  test('stays silent when fewer than 2 ships landed since the last visit', async ({ page }) => {
    const lastVisit = Date.UTC(2026, 5, 7); // 2026-06-07
    await stub(page, [
      { sha: 'a', ts: '2026-06-07T20:00:00.000Z', summary: 'only one since' },
      { sha: 'b', ts: '2026-06-01T18:00:00.000Z', summary: 'before' },
    ]);
    await seed(page, { visitCount: 4, lastVisitTs: lastVisit });
    await page.goto(ORIGIN);
    await page.addScriptTag({ content: ASSET_SRC });

    await expect(page.locator('[role="status"]')).toHaveCount(0);
  });
});
