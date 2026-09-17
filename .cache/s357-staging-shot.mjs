// S357 — verify the repaired surfaces on the real staging origin, not a local
// preview. The local pixels proved the CSS; these prove the deployed bytes.
import { chromium } from '@playwright/test';

const base = 'https://website.staging.vaultsparkstudios.com';
const out = process.argv[2];
const targets = [
  ['ignis-pillars', '/ignis/', '.ignis-pillars'],
  ['ignis-tiers', '/ignis/', '.ignis-tier-grid'],
  ['oracle-chip', '/oracle/', '.ignis-chip'],
  ['changelog-entry', '/changelog/', '.cl-phase--live'],
];
const browser = await chromium.launch();
for (const [name, route, selector] of targets) {
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.addInitScript((t) => {
      try {
        localStorage.setItem('vs_theme', t);
        localStorage.setItem('vs_cookie_consent', 'declined');
      } catch {}
    }, theme);
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    await page.goto(base + route, { waitUntil: 'load' });
    await page.waitForTimeout(1800);
    const el = page.locator(selector).first();
    if (await el.count()) {
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await el.screenshot({ path: `${out}/${name}--${theme}.png` });
      console.log('ok', name, theme, errors.length ? `| ${errors.length} error(s): ${errors.slice(0, 2).join(' ; ')}` : '| clean');
    } else {
      console.log('MISSING', name, selector);
    }
    await page.close();
  }
}
await browser.close();
