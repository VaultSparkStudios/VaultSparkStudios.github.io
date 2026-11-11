const { defineConfig } = require('@playwright/test');

// Credentials belong to the secrets gateway. CI and gateway-backed runners
// supply their explicit environment; configuration never reads local dotenv
// files. Public browser checks remain runnable without account credentials.

module.exports = defineConfig({
  testDir: './tests',
  // Node's built-in unit suites use node:test and run through `npm run test:unit`.
  // Keep Playwright from transforming those ESM fixtures into its browser-test
  // loader; `npm run build:check` exercises both runners independently.
  testIgnore: ['**/*.unit.spec.{js,mjs}'],
  // Snapshots under tests/__snapshots__/ so the workflow upload path is deterministic
  // and consistent with the spec comment + update-vr-baselines.mjs staging path.
  snapshotDir: './tests/__snapshots__',
  timeout: 30000,
  retries: 1,
  workers: process.env.CI ? 2 : 1,
  use: {
    baseURL: process.env.BASE_URL || 'https://vaultsparkstudios.com',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        launchOptions: {
          args: [
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
          ],
        },
      },
    },
    {
      name: 'firefox',
      use: { browserName: 'firefox' },
      // Pixel baselines are intentionally Chromium-only; behavioral and a11y
      // specs still run in Firefox.
      testIgnore: ['**/*.unit.spec.{js,mjs}', '**/visual-regression.spec.js'],
    },
    {
      name: 'webkit',
      use: { browserName: 'webkit' },
      // Pixel baselines are intentionally Chromium-only; behavioral and a11y
      // specs still run in WebKit.
      testIgnore: ['**/*.unit.spec.{js,mjs}', '**/visual-regression.spec.js'],
    },
  ],
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'playwright-report/results.json' }]],
});
