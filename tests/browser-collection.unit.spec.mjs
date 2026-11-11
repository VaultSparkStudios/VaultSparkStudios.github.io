import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import http from 'node:http';
import { once } from 'node:events';
import { spawn, spawnSync } from '../scripts/lib/safe-spawn.mjs';
import { collectBrowserTests, validateBrowserCollection } from '../scripts/verify-browser-collection.mjs';

test('preconnect gate checks public pages while preserving operator reports', async () => {
  const { spawnSync } = await import('../scripts/lib/safe-spawn.mjs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-preconnect-scope-'));
  const source = new URL('../scripts/ensure-preconnects.mjs', import.meta.url);
  const html = '<html><head><meta charset="utf-8">\n</head><body><script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script></body></html>';
  try {
    for (const name of ['.cache', '.ops-cache', 'output']) {
      fs.mkdirSync(path.join(dir, name));
      fs.writeFileSync(path.join(dir, name, 'report.html'), html);
    }
    const run = () => spawnSync(process.execPath, [fileURLToPath(source), '--check'], { cwd: dir, encoding: 'utf8', windowsHide: true });
    assert.equal(run().status, 0, 'operator reports are outside public-page scope');
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    const failed = run();
    assert.equal(failed.status, 1);
    assert.match(failed.stdout, /index\.html.*challenges\.cloudflare\.com/);
    assert.equal(fs.readFileSync(path.join(dir, '.cache/report.html'), 'utf8'), html);
  } finally {
    assert.equal(path.dirname(dir), path.resolve(os.tmpdir()));
    assert.ok(path.basename(dir).startsWith('vs-preconnect-scope-'));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

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
    for (const file of ['.env.playwright.local', '.env.playwright.local.private']) {
      fs.writeFileSync(path.join(dir, file), 'VS_PLAYWRIGHT_FILE_SENTINEL=fixture-file-must-not-be-loaded\n');
    }
    fs.writeFileSync(path.join(dir, 'tests/browser.spec.js'), `const {test}=require(${JSON.stringify(pw)});if(process.env.VS_PLAYWRIGHT_FILE_SENTINEL==='fixture-file-must-not-be-loaded')throw new Error('LOCAL_DOTENV_READ');test('browser sentinel',()=>{});`);
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

// Run the real specs in a separate checkout-shaped fixture. Healthy production
// is represented by a second loopback origin: a candidate defect must remain a
// failure even when that decoy answers every request successfully.
test('actual nav and visual specs audit the candidate, with an explicit visual override', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-browser-origins-'));
  const requests = { candidate: [], decoy: [] };
  let broken = false;
  let decoyOrigin;
  let primaryError;
  const themeScript = fs.readFileSync(new URL('../assets/theme-toggle.js', import.meta.url), 'utf8');
  const servers = [];
  const listen = async (name) => {
    const server = http.createServer((req, res) => {
      requests[name].push(req.url);
      if (req.url === '/fixture-theme.js') {
        res.setHeader('Content-Type', 'application/javascript');
        return res.end(themeScript);
      }
      res.setHeader('Content-Type', 'text/html');
      if (name === 'candidate' && broken && req.url === '/candidate-link-0/') {
        res.writeHead(404);
        return res.end('candidate link missing');
      }
      const links = Array.from({ length: 20 }, (_, i) => `<a href="/candidate-link-${i}/">Link ${i}</a>`).join('');
      const external = `<a href="//${new URL(decoyOrigin).host}/external-only/">External protocol-relative link</a>`;
      res.end(`<html><body data-theme="dark"><script src="/fixture-theme.js"></script><header class="site-header"><nav class="nav-center"><div class="nav-item has-dropdown"><div class="nav-dropdown">${links}${external}</div></div></nav></header><h1 id="hero-heading"><span class="forge-letter">${name}</span></h1></body></html>`);
    });
    servers.push(server);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    return `http://127.0.0.1:${server.address().port}`;
  };
  try {
    const candidate = await listen('candidate');
    const decoy = await listen('decoy');
    decoyOrigin = decoy;
    const require = createRequire(import.meta.url);
    const pw = require.resolve('@playwright/test');
    const cli = require.resolve('@playwright/test/cli');
    fs.mkdirSync(path.join(dir, 'tests'));
    fs.writeFileSync(path.join(dir, 'playwright.config.cjs'), `
      const {defineConfig}=require(${JSON.stringify(pw)});
      module.exports=defineConfig({testDir:'./tests',timeout:10000,retries:0,workers:1,
        use:{baseURL:process.env.BASE_URL,headless:true},
        projects:[{name:'chromium',use:{browserName:'chromium'}}],reporter:'list'});
    `);
    const sources = Object.fromEntries(['nav-dropdown-coverage', 'visual-regression'].map(name => [name,
      fs.readFileSync(new URL(`./${name}.spec.js`, import.meta.url), 'utf8')
        .replace("require('@playwright/test')", `require(${JSON.stringify(pw)})`)
        .replace("from '@playwright/test'", `from ${JSON.stringify(pw)}`),
    ]));
    const run = async (name, source, override = '') => {
      requests.candidate.length = requests.decoy.length = 0;
      // Prevent even incidental browser traffic from leaving this fixture.
      fs.writeFileSync(path.join(dir, `tests/${name}.spec.js`), source + `
        test.beforeEach(async ({context}) => {
          await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
        });
      `);
      const args = [cli, 'test', `${name}.spec.js`, '--project=chromium', '--grep',
        name === 'nav-dropdown-coverage' ? 'every dropdown link resolves' : 'visual regression · iphone-se · dark home · iphone-se · dark$',
        ...(name === 'visual-regression' ? ['--update-snapshots'] : [])];
      const child = spawn(process.execPath, args, { cwd: dir, windowsHide: true,
        env: { ...process.env, BASE_URL: candidate, VR_BASE_URL: override }, stdio: ['ignore', 'pipe', 'pipe'] });
      let output = '';
      child.stdout.on('data', chunk => { output += chunk; });
      child.stderr.on('data', chunk => { output += chunk; });
      let timedOut = false;
      let shutdownTimer;
      let rejectShutdown;
      const shutdownDeadline = new Promise((_, reject) => { rejectShutdown = reject; });
      // A loaded full suite can spend longer than45s starting Chromium. Keep a
      // bounded allowance, and terminate this owned CLI's descendants as well:
      // killing only its parent on Windows leaves workers holding fixture files.
      const timer = setTimeout(() => {
        timedOut = true;
        if (process.platform === 'win32' && Number.isInteger(child.pid)) {
          const stopped = spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
            windowsHide: true, encoding: 'utf8', timeout: 10000,
          });
          if (stopped.status !== 0) output += `\nOwned process-tree termination failed: ${stopped.error?.message || stopped.stderr || stopped.status}`;
        }
        if (child.exitCode === null && child.signalCode === null) child.kill();
        shutdownTimer = setTimeout(() => {
          child.stdout.destroy();
          child.stderr.destroy();
          rejectShutdown(new Error(`Browser fixture exceeded120s and failed to close within10s: ${name}\n${output}`));
        }, 10000);
      }, 120000);
      try {
        const [status] = await Promise.race([once(child, 'close'), shutdownDeadline]);
        assert.equal(timedOut, false, `Browser fixture exceeded120s: ${name}\n${output}`);
        assert.doesNotMatch(output, /No tests found/);
        return { status, output };
      } finally { clearTimeout(timer); clearTimeout(shutdownTimer); }
    };
    const nav = sources['nav-dropdown-coverage'];
    let result = await run('nav-dropdown-coverage', nav);
    assert.equal(result.status, 0, result.output);
    assert.equal(requests.candidate.filter(url => url.startsWith('/candidate-link-')).length, 20);
    assert.equal(requests.decoy.length, 0, 'protocol-relative external link must be skipped');
    broken = true;
    result = await run('nav-dropdown-coverage', nav);
    assert.notEqual(result.status, 0, result.output);
    assert.match(result.output, /candidate-link-0\/.*404/);
    assert.equal(requests.decoy.length, 0);
    const oldNav = nav.replace('new URL(href, page.url())', `new URL(href, ${JSON.stringify(decoy)})`);
    assert.notEqual(oldNav, nav, 'nav mutation must replace the actual target expression');
    result = await run('nav-dropdown-coverage', oldNav);
    assert.equal(result.status, 0, result.output);
    assert.equal(requests.decoy.filter(url => url.startsWith('/candidate-link-')).length, 20);
    assert.equal(requests.candidate.filter(url => url.startsWith('/candidate-link-')).length, 0,
      'the old implementation falsely passes the broken candidate by probing the healthy decoy');

    const visual = sources['visual-regression'];
    result = await run('visual-regression', visual);
    assert.equal(result.status, 0, result.output);
    assert.ok(requests.candidate.includes('/'), 'visual test must navigate to configured candidate');
    assert.equal(requests.decoy.length, 0);
    result = await run('visual-regression', visual, decoy);
    assert.equal(result.status, 0, result.output);
    assert.ok(requests.decoy.includes('/'), 'explicit visual override must still work');
    assert.equal(requests.candidate.length, 0);
    const oldVisual = visual.replace('process.env.VR_BASE_URL || baseURL', `process.env.VR_BASE_URL || ${JSON.stringify(decoy)}`);
    assert.notEqual(oldVisual, visual, 'visual mutation must replace the actual target expression');
    result = await run('visual-regression', oldVisual);
    assert.equal(result.status, 0, result.output);
    assert.equal(requests.candidate.length, 0, 'the old fallback bypasses the configured candidate');
    assert.ok(requests.decoy.includes('/'), 'origin observations detect the old fallback mutation');
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    await Promise.all(servers.map(server => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); })));
    assert.equal(path.dirname(path.resolve(dir)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(dir).startsWith('vs-browser-origins-'));
    // Windows may release Chromium/report handles just after child close.
    // Retry this guarded fixture root briefly; persistent cleanup errors fail.
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    } catch (cleanupError) {
      if (primaryError) throw new AggregateError([primaryError, cleanupError], 'Browser fixture failed and cleanup also failed', { cause: primaryError });
      throw cleanupError;
    }
  }
});

test('visual PR workflow starts its candidate preview and retains an explicit manual origin', () => {
  const source = fs.readFileSync(new URL('../.github/workflows/visual-regression.yml', import.meta.url), 'utf8');
  // Focused contracts for the executable steps, rather than matching comments
  // that describe candidate coverage while still running against production.
  const verify = text => {
    assert.match(text, /\n  pull_request:/);
    assert.match(text, /- name: Start candidate preview\s+run: \|\s+node scripts\/local-preview-server\.mjs &\s+echo "PREVIEW_PID=\$!" >> \$GITHUB_ENV/);
    assert.match(text, /- name: Wait for candidate preview\s+run: .*http:\/\/127\.0\.0\.1:4173\//);
    assert.match(text, /- name: Run visual-regression snapshots\s+env:\s+BASE_URL: http:\/\/127\.0\.0\.1:4173\s+VR_BASE_URL: \$\{\{ github\.event_name == 'workflow_dispatch' && github\.event\.inputs\.base_url \|\| '' \}\}/);
    assert.match(text, /- name: Stop candidate preview\s+if: always\(\)\s+run: \|\s+if \[ -n "\$\{PREVIEW_PID:-\}" \]; then kill "\$PREVIEW_PID" \|\| true; fi/);
    assert.match(text, /workflow_dispatch:\s+inputs:\s+base_url:[\s\S]*?default: 'http:\/\/127\.0\.0\.1:4173'/);
  };
  verify(source);
  assert.throws(() => verify(source.replace("default: 'http://127.0.0.1:4173'", "default: 'https://vaultsparkstudios.com'")), assert.AssertionError);
  assert.throws(() => verify(source.replace("github.event_name == 'workflow_dispatch' && github.event.inputs.base_url || ''", "github.event.inputs.base_url || 'https://vaultsparkstudios.com'")), assert.AssertionError);
  assert.throws(() => verify(source.replace('node scripts/local-preview-server.mjs &', 'echo preview omitted')), assert.AssertionError);
  assert.throws(() => verify(source.replace('if: always()', 'if: success()')), assert.AssertionError);
});

test('executed public E2E failures gate CI independently of optional account credentials', () => {
  const source = fs.readFileSync(new URL('../.github/workflows/e2e.yml', import.meta.url), 'utf8');
  const verify = text => {
    const job = text.split('\n  e2e:\n')[1];
    assert.ok(job, 'the public E2E job must exist');
    assert.doesNotMatch(job.split('\n    steps:')[0], /continue-on-error:/);
    const step = job.match(/- name: Run E2E tests\n([\s\S]*?)(?=\n      - name:|$)/)?.[1];
    assert.ok(step, 'the browser suite must execute');
    assert.doesNotMatch(step, /continue-on-error:/, 'missing account credentials cannot hide executed public failures');
  };
  verify(source);
  assert.throws(() => verify(source.replace('run: npx playwright test --project=chromium', '$&\n        continue-on-error: true')), assert.AssertionError);
  assert.throws(() => verify(source.replace('\n  e2e:\n', '\n  e2e:\n    continue-on-error: true\n')), assert.AssertionError);
});
