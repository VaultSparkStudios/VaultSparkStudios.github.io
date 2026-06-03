// vaultsparked-csp.spec.js
// Playwright smoke — asserts zero Content-Security-Policy console violations on /vaultsparked/.
// Guards against inline script regressions introduced by propagate-csp.mjs or future edits.
// Runs Chromium only (CSP reporting behaviour is consistent there).

const { test, expect } = require('@playwright/test');
const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';

test.describe('VaultSparked CSP compliance', () => {
  test('no CSP violations on /vaultsparked/ (Chromium)', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'CSP smoke runs Chromium only');

    const cspViolations = [];

    page.on('console', (msg) => {
      if (
        msg.type() === 'error' &&
        msg.text().includes('Content-Security-Policy')
      ) {
        cspViolations.push(msg.text());
      }
    });

    // Also capture pageerror for CSP violations surfaced as uncaught errors
    page.on('pageerror', (err) => {
      if (err.message && err.message.includes('Content-Security-Policy')) {
        cspViolations.push(err.message);
      }
    });

    await page.goto(BASE + '/vaultsparked/', { waitUntil: 'networkidle' });

    // Allow time for deferred scripts to run and any CSP errors to surface
    await page.waitForTimeout(1500);

    if (cspViolations.length > 0) {
      console.error('CSP violations detected:\n' + cspViolations.join('\n'));
    }

    expect(cspViolations, 'CSP violations found on /vaultsparked/').toHaveLength(0);
  });

  test('no CSP violations on homepage (Chromium)', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'CSP smoke runs Chromium only');

    const cspViolations = [];

    page.on('console', (msg) => {
      if (
        msg.type() === 'error' &&
        msg.text().includes('Content-Security-Policy')
      ) {
        cspViolations.push(msg.text());
      }
    });

    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    expect(cspViolations, 'CSP violations found on homepage').toHaveLength(0);
  });
});
