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
  timeout: 20000,
  retries: 1,
  use: {
    baseURL: process.env.BASE_URL || 'https://vaultsparkstudios.com',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox',  use: { browserName: 'firefox'  } },
    { name: 'webkit',   use: { browserName: 'webkit'   } },
  ],
  reporter: [['list'], ['html', { open: 'never' }]],
});
