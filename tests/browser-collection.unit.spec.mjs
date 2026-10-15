import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { collectBrowserTests, validateBrowserCollection } from '../scripts/verify-browser-collection.mjs';

test('actual project configuration excludes throwing JS and ESM unit fixtures in every browser', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-browser-collection-'));
  try {
    fs.mkdirSync(path.join(dir, 'tests'));
    const require = createRequire(import.meta.url);
    const pw = require.resolve('@playwright/test');
    const config = fs.readFileSync(new URL('../playwright.config.js', import.meta.url), 'utf8')
      .replace("require('@playwright/test')", `require(${JSON.stringify(pw)})`);
    const configPath = path.join(dir, 'playwright.config.cjs');
    fs.writeFileSync(configPath, config);
    fs.writeFileSync(path.join(dir, 'tests/browser.spec.js'), `const {test}=require(${JSON.stringify(pw)});test('browser sentinel',()=>{});`);
    for (const extension of ['js', 'mjs']) {
      fs.writeFileSync(path.join(dir, `tests/throw.unit.spec.${extension}`), "throw new Error('UNIT_FIXTURE_EXECUTED');");
    }
    assert.deepEqual(collectBrowserTests(configPath), { chromium: 1, firefox: 1, webkit: 1 });
    // Use the real audit spec, not a fixture of its cleanup logic. Discovery
    // must not erase measurements created by a previous browser execution.
    const mobileSource = fs.readFileSync(new URL('./mobile-audit.spec.js', import.meta.url), 'utf8')
      .replace("require('@playwright/test')", `require(${JSON.stringify(pw)})`)
      .replace("require('../scripts/lib/mobile-runtime-contract.cjs')", `require(${JSON.stringify(require.resolve('../scripts/lib/mobile-runtime-contract.cjs'))})`);
    fs.writeFileSync(path.join(dir, 'tests/mobile-audit.spec.js'), mobileSource);
    const evidence = path.join(dir, 'docs/mobile-audit');
    fs.mkdirSync(evidence, { recursive: true });
    fs.writeFileSync(path.join(evidence, 'findings.jsonl'), 'existing-measurements\n');
    fs.writeFileSync(path.join(evidence, 'receipt.json'), '{"existingReceipt":true}\n');
    const { PAGES, VIEWPORTS } = require('../scripts/lib/mobile-runtime-contract.cjs');
    const count = 1 + PAGES.length * VIEWPORTS.length;
    assert.deepEqual(collectBrowserTests(configPath), { chromium: count, firefox: count, webkit: count });
    assert.equal(fs.readFileSync(path.join(evidence, 'findings.jsonl'), 'utf8'), 'existing-measurements\n');
    assert.equal(fs.readFileSync(path.join(evidence, 'receipt.json'), 'utf8'), '{"existingReceipt":true}\n');
    // Recreate the exact pre-repair exclusions. The same discovery must fail,
    // proving the positive result is isolation, rather than ignored errors.
    fs.writeFileSync(configPath, config.replaceAll('*.unit.spec.{js,mjs}', '*.unit.spec.js'));
    assert.throws(() => collectBrowserTests(configPath), /UNIT_FIXTURE_EXECUTED/);
  } finally {
    assert.equal(path.dirname(path.resolve(dir)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(dir).startsWith('vs-browser-collection-'));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('inventory refuses hidden discovery errors, missing projects and leaked unit tests', () => {
  assert.throws(() => validateBrowserCollection({ errors: [{ message: 'bad import' }] }), /errors/);
  assert.throws(() => validateBrowserCollection({ suites: [] }), /empty: chromium/);
  assert.throws(() => validateBrowserCollection({ suites: [{ specs: [{ file: 'x.unit.spec.mjs' }] }] }), /Node unit suite/);
});
