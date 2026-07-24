const fs = require('fs');
const path = require('path');
const { defineConfig } = require('@playwright/test');

loadLocalPlaywrightEnv();

function loadLocalPlaywrightEnv() {
  const envFiles = [
    '.env.playwright.local.private',
    '.env.playwright.local',
  ];

  for (const relativePath of envFiles) {
    loadEnvFile(path.join(__dirname, relativePath));
  }
}

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    if (!key || process.env[key]) continue;

    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

module.exports = defineConfig({
  testDir: './tests',
  // Node's built-in unit suites use node:test and run through `npm run test:unit`.
  // Keep Playwright from transforming those ESM fixtures into its browser-test
  // loader; `npm run build:check` exercises both runners independently.
  testIgnore: ['**/*.unit.spec.js'],
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
      testIgnore: ['**/*.unit.spec.js', '**/visual-regression.spec.js'],
    },
    {
      name: 'webkit',
      use: { browserName: 'webkit' },
      // Pixel baselines are intentionally Chromium-only; behavioral and a11y
      // specs still run in WebKit.
      testIgnore: ['**/*.unit.spec.js', '**/visual-regression.spec.js'],
    },
  ],
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'playwright-report/results.json' }]],
});
