// Discovery is a release prerequisite even when authenticated tests are held.
import { spawnSync } from './lib/safe-spawn.mjs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);

export function validateBrowserCollection(report) {
  if (report.errors?.length) throw new Error('Playwright discovery reported errors');
  const counts = new Map(['chromium', 'firefox', 'webkit'].map(name => [name, 0]));
  function visit(suites = []) {
    for (const suite of suites) {
      for (const spec of suite.specs || []) {
        if (/\.unit\.spec\.[cm]?js$/.test(spec.file || suite.file || '')) {
          throw new Error(`Node unit suite entered browser discovery: ${spec.file || suite.file}`);
        }
        for (const test of spec.tests || []) {
          if (counts.has(test.projectName)) counts.set(test.projectName, counts.get(test.projectName) + 1);
        }
      }
      visit(suite.suites);
    }
  }
  visit(report.suites);
  for (const [project, count] of counts) {
    if (!count) throw new Error(`Browser inventory is empty: ${project}`);
  }
  return Object.fromEntries(counts);
}

export function collectBrowserTests(config) {
  const cli = require.resolve('@playwright/test/cli');
  const result = spawnSync(process.execPath, [cli, 'test', '--list', '--reporter=json', ...(config ? ['--config', config] : [])], {
    cwd: root, encoding: 'utf8', windowsHide: true, timeout: 120_000,
    maxBuffer: 32 * 1024 * 1024,
    // Collection never contacts this origin. Avoid the mobile suite's deliberate
    // production audit guard and keep discovery independent of private env files.
    env: { ...process.env, BASE_URL: 'http://127.0.0.1:4173' },
  });
  if (result.status !== 0) {
    throw new Error(`Playwright collection failed (exit ${result.status ?? 'unknown'}): ${String(result.stderr || result.stdout).slice(-3000)}`);
  }
  return validateBrowserCollection(JSON.parse(result.stdout));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify({ ok: true, projects: collectBrowserTests() })); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
