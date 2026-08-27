#!/usr/bin/env node
/**
 * measure-page-performance.mjs
 *
 * Captures repeatable local/staging/production browser timing evidence for key
 * public routes and checks the static HTML shell for render-blocking stylesheet
 * regressions. Local mode starts scripts/local-preview-server.mjs.
 *
 * External `--check --base=...` runs verify deploy parity before browser launch
 * unless `--skip-deploy-parity` is passed.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from './lib/safe-spawn.mjs';
import { once } from 'node:events';
import { chromium } from '@playwright/test';

const ROOT = process.cwd();
const DEFAULT_ROUTES = ['/', '/oracle/', '/membership/', '/vaultsparked/', '/community/', '/games/'];
// Keep this aligned with build-shell-assets.mjs. Only routes whose critical
// shell is fold-complete may swap the full stylesheet after first paint;
// content routes intentionally block on CSS to prevent post-paint reflow.
const ASYNC_STYLESHEET_ROUTES = new Set(['/', '/status/']);
const DEFAULT_PROFILE = 'desktop:1366x900:dark:1800:300';
const MATRIX_PROFILES = [
  DEFAULT_PROFILE,
  'tablet:768x1024:dark:2200:250',
  'tablet-light:768x1024:light:2400:250',
  'mobile:390x844:dark:2200:200',
  'mobile-light:390x844:light:2400:200',
  'mobile-high-contrast:390x844:high-contrast:2400:200',
  'mobile-warm:390x844:warm:2400:200',
  'mobile-cool:390x844:cool:2400:200',
];
const args = process.argv.slice(2);
const check = args.includes('--check');
const progress = args.includes('--progress');
const skipDeployParity = args.includes('--skip-deploy-parity');
// S163 (audit #4 warm-trace-mode): hit each route twice and measure the second
// (warm-cache) pass so synthetic traces report steady-state instead of
// conflating cold-bucket origin TTFB with a real regression. `--cold` forces
// the legacy single-hit behavior for TTFB diagnostics.
const warmTrace = args.includes('--warm') && !args.includes('--cold');
const baseArg = valueFor('--base');
const allowExternal = args.includes('--allow-external') || (Boolean(baseArg) && !args.includes('--same-origin-only'));
const outputPath = valueFor('--out') || path.join('docs', 'PERF_TRACE_S142.json');
const profileArg = valueFor('--profiles') || (args.includes('--matrix') ? MATRIX_PROFILES.join(',') : DEFAULT_PROFILE);
const routes = (valueFor('--routes') || DEFAULT_ROUTES.join(','))
  .split(',')
  .map((route) => route.trim())
  .filter(Boolean);
const profiles = profileArg
  .split(',')
  .map((profile) => profile.trim())
  .filter(Boolean)
  .map(parseProfile);
const host = process.env.LOCAL_PREVIEW_HOST || '127.0.0.1';
const port = process.env.LOCAL_PREVIEW_PORT || String(4700 + Math.floor(Math.random() * 300));
const navigationWaitUntil = valueFor('--wait-until') || (baseArg ? 'domcontentloaded' : 'load');
const navigationTimeoutMs = Number(valueFor('--nav-timeout') || (baseArg ? 45_000 : 30_000));
const observationMs = Number(valueFor('--observe-ms') || 2_500);
const rowTimeoutMs = Number(valueFor('--row-timeout') || Math.max(20_000, (Number.isFinite(navigationTimeoutMs) ? navigationTimeoutMs : 45_000) + (Number.isFinite(observationMs) ? observationMs : 2_500) + 10_000));
const batchSize = Math.max(0, Number(valueFor('--batch-size') || 0));
const minDiskMb = Math.max(0, Number(valueFor('--min-disk-mb') || 512));

function valueFor(flag) {
  const item = args.find((arg) => arg.startsWith(`${flag}=`));
  if (item) return item.slice(flag.length + 1);
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : null;
}

function waitForReady(child, timeoutMs = 15_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Local preview server did not start in time.')), timeoutMs);
    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      process.stdout.write(text);
      const match = text.match(/https?:\/\/127\.0\.0\.1:\d+/);
      if (match) {
        clearTimeout(timer);
        resolve(match[0]);
      }
    });
    child.stderr.on('data', (chunk) => process.stderr.write(chunk));
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Local preview server exited early with code ${code}`));
    });
  });
}

function routeToHtml(route) {
  if (route === '/') return path.join(ROOT, 'index.html');
  const clean = route.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!clean) return path.join(ROOT, 'index.html');
  const dirIndex = path.join(ROOT, clean, 'index.html');
  if (fs.existsSync(dirIndex)) return dirIndex;
  return path.join(ROOT, `${clean}.html`);
}

function parseProfile(value) {
  const [name, viewportToken = '1366x900', theme = 'dark', lcpBudgetToken = '1800', inpBudgetToken = ''] = value.split(':');
  const [width, height] = viewportToken.split('x').map((part) => Number(part));
  const viewport = {
    width: Number.isFinite(width) && width > 0 ? width : 1366,
    height: Number.isFinite(height) && height > 0 ? height : 900,
  };
  const lcpBudget = Number(lcpBudgetToken);
  const inpBudget = Number(inpBudgetToken);
  const profileName = name || 'desktop';
  return {
    name: profileName,
    viewport,
    theme: theme || 'dark',
    lcpBudget: Number.isFinite(lcpBudget) && lcpBudget > 0 ? lcpBudget : 1800,
    inpBudget: Number.isFinite(inpBudget) && inpBudget > 0 ? inpBudget : (profileName.includes('mobile') ? 200 : 300),
  };
}

function assertDiskSpace() {
  if (!minDiskMb || typeof fs.statfsSync !== 'function') return null;
  const stats = fs.statfsSync(ROOT);
  const freeMb = Math.floor((stats.bavail * stats.bsize) / 1024 / 1024);
  if (freeMb < minDiskMb) {
    throw new Error(`disk preflight failed: ${freeMb}MB free < ${minDiskMb}MB required. Run: node scripts/check-disk-headroom.mjs`);
  }
  return freeMb;
}

function loadShellManifest() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'shell-manifest.json'), 'utf8'));
}

function expectedShellPaths(manifest) {
  return Object.values(manifest.assets || {})
    .map((asset) => asset.path)
    .filter(Boolean)
    .sort();
}

function deployedShellPaths(html) {
  const paths = new Set();
  const re = /(?:src|href)=["']([^"']*assets\/[a-z0-9-]+\.shell-[a-f0-9]{10}\.(?:css|js))["']/gi;
  let match;
  while ((match = re.exec(html))) {
    const url = match[1];
    const idx = url.indexOf('assets/');
    if (idx >= 0) paths.add(url.slice(idx).replace(/\\/g, '/'));
  }
  return [...paths].sort();
}

async function verifyDeployParity(baseUrl) {
  if (!baseUrl || !check || skipDeployParity) {
    return {
      skipped: true,
      reason: !baseUrl ? 'local preview' : skipDeployParity ? 'skip flag' : 'check mode disabled',
    };
  }

  const manifest = loadShellManifest();
  const expected = expectedShellPaths(manifest);
  const url = new URL('/', baseUrl).toString();
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'VaultSpark performance parity preflight' },
  });
  const html = await response.text();
  const actual = deployedShellPaths(html);
  const availability = await Promise.all(expected.map(async (assetPath) => {
    try {
      const assetResponse = await fetch(new URL(assetPath, baseUrl), {
        redirect: 'follow',
        headers: { 'user-agent': 'VaultSpark performance parity preflight' },
      });
      return { path: assetPath, ok: assetResponse.status >= 200 && assetResponse.status < 400 };
    } catch {
      return { path: assetPath, ok: false };
    }
  }));
  const expectedSet = new Set(expected);
  const diff = {
    missing: availability.filter((asset) => !asset.ok).map((asset) => asset.path),
    unexpected: actual.filter((assetPath) => !expectedSet.has(assetPath)),
  };
  const ok = response.status >= 200 && response.status < 400 && diff.missing.length === 0 && diff.unexpected.length === 0;

  return {
    skipped: false,
    ok,
    source: url,
    status: response.status,
    manifestVersion: manifest.version,
    expected,
    actual,
    missing: diff.missing,
    unexpected: diff.unexpected,
  };
}

function checkStylesheetShell(route) {
  const htmlPath = routeToHtml(route);
  if (!fs.existsSync(htmlPath)) return { route, htmlPath: path.relative(ROOT, htmlPath), missing: true, violations: [] };

  const html = fs.readFileSync(htmlPath, 'utf8');
  const violations = [];
  const expectsAsync = ASYNC_STYLESHEET_ROUTES.has(route);
  let sawBlockingShell = false;
  let sawAsyncShell = false;
  const htmlWithoutNoscript = html.replace(/<noscript\b[\s\S]*?<\/noscript>/gi, '');
  const linkRe = /<link\b([^>]*?)>/gi;
  let match;

  while ((match = linkRe.exec(htmlWithoutNoscript))) {
    const tag = match[0];
    const attrs = match[1] || '';
    if (!/\brel=["'][^"']*\bstylesheet\b[^"']*["']/i.test(attrs)) continue;
    if (!/\bhref=["'](?:\/|\.\.\/)?assets\/style\.shell-[a-f0-9]{10}\.css/i.test(attrs)) continue;
    const isAsync = /\bmedia=["']print["']/i.test(attrs) && /\bdata-vs-async-css\b/i.test(attrs);
    if (isAsync) sawAsyncShell = true;
    else sawBlockingShell = true;
    if (expectsAsync ? !isAsync : isAsync) violations.push(tag);
  }

  if (expectsAsync) {
    if (!sawAsyncShell) violations.push('missing async stylesheet shell');
    if (!/<link\b[^>]*\brel=["'][^"']*\bpreload\b[^"']*["'][^>]*\bas=["']style["'][^>]*\bdata-vs-css-preload\b/i.test(html)) {
      violations.push('missing style preload[data-vs-css-preload]');
    }

    if (!/<noscript>[\s\S]*?<link\b[^>]*\brel=["'][^"']*\bstylesheet\b[^"']*["'][\s\S]*?assets\/style\.shell-[a-f0-9]{10}\.css[\s\S]*?<\/noscript>/i.test(html)) {
      violations.push('missing noscript stylesheet fallback');
    }
  } else if (!sawBlockingShell) {
    violations.push('missing blocking stylesheet shell');
  }

  return { route, htmlPath: path.relative(ROOT, htmlPath), violations };
}

async function measureRoute(browser, baseUrl, route, profile) {
  const page = await browser.newPage({
    viewport: profile.viewport,
  });
  const pageErrors = [];
  let response = null;
  let navigationError = '';

  page.on('pageerror', (error) => pageErrors.push(error.message));
  if (!allowExternal) {
    await page.route('**/*', async (routeHandle) => {
      const request = routeHandle.request();
      const url = new URL(request.url());
      const base = new URL(baseUrl);
      if (url.origin !== base.origin) {
        await routeHandle.abort().catch(() => {});
        return;
      }
      await routeHandle.continue().catch(() => {});
    });
  }

  await page.addInitScript((theme) => {
    try {
      if (theme && theme !== 'default') {
        localStorage.setItem('vs_theme', theme);
      } else {
        localStorage.removeItem('vs_theme');
      }
      localStorage.setItem('vs_cookie_consent', 'accepted');
    } catch (_) {}

    window.__vsPerf = {
      lcp: 0,
      cls: 0,
      clsSources: [],
      fcp: 0,
      inp: 0,
      interactions: [],
      lcpEntries: [],
      entries: [],
    };

    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) {
          window.__vsPerf.lcp = last.startTime;
          var node = last.element;
          window.__vsPerf.lcpEntries.push(node ? {
            startTime: last.startTime,
            size: last.size || 0,
            tag: node.tagName,
            id: node.id || '',
            className: String(node.className || ''),
            src: node.currentSrc || node.src || '',
            text: String(node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120),
          } : {
            startTime: last.startTime,
            size: last.size || 0,
            tag: '',
            id: '',
            className: '',
            text: last.url || '',
            src: last.url || '',
          });
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (_) {}

    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            window.__vsPerf.cls += entry.value;
            window.__vsPerf.clsSources.push({
              value: entry.value,
              startTime: entry.startTime,
              sources: (entry.sources || []).slice(0, 4).map((source) => {
                var node = source.node;
                return node ? {
                  tag: node.tagName,
                  id: node.id || '',
                  className: String(node.className || ''),
                  text: String(node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
                } : null;
              }).filter(Boolean),
            });
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch (_) {}

    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') window.__vsPerf.fcp = entry.startTime;
        }
      }).observe({ type: 'paint', buffered: true });
    } catch (_) {}

    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          var duration = Math.round(entry.duration || 0);
          if (!duration) continue;
          window.__vsPerf.inp = Math.max(window.__vsPerf.inp || 0, duration);
          window.__vsPerf.interactions.push({
            name: entry.name || entry.entryType || 'event',
            duration: duration,
            startTime: Math.round(entry.startTime || 0),
            target: entry.target ? String(entry.target.className || entry.target.id || entry.target.tagName || '').slice(0, 80) : '',
          });
        }
      }).observe({ type: 'event', buffered: true, durationThreshold: 40 });
    } catch (_) {}
  }, profile.theme);

  const targetUrl = new URL(route, baseUrl).toString();
  // S163 warm-trace-mode: prime the HTTP cache with a throwaway navigation so the
  // measured pass below reflects steady-state delivery, not cold-bucket TTFB. The
  // addInitScript re-runs on the second navigation, so window.__vsPerf resets
  // cleanly — only the warm pass is measured.
  if (warmTrace) {
    try {
      await page.goto(targetUrl, {
        waitUntil: navigationWaitUntil,
        timeout: Number.isFinite(navigationTimeoutMs) && navigationTimeoutMs > 0 ? navigationTimeoutMs : 45_000,
      });
      await page.waitForTimeout(300);
    } catch (_) {
      // A failed warm-up pass is non-fatal; the measured pass below still runs
      // and will surface any real navigation error.
    }
  }

  try {
    response = await page.goto(targetUrl, {
      waitUntil: navigationWaitUntil,
      timeout: Number.isFinite(navigationTimeoutMs) && navigationTimeoutMs > 0 ? navigationTimeoutMs : 45_000,
    });
  } catch (error) {
    navigationError = error.message || String(error);
  }
  await page.waitForTimeout(Number.isFinite(observationMs) && observationMs > 0 ? observationMs : 2_500);
  await runInteractionProbe(page, route);
  await page.waitForTimeout(250);

  let data = null;
  try {
    data = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const resources = performance.getEntriesByType('resource')
        .filter((entry) => /\/assets\//.test(entry.name))
        .map((entry) => ({
          name: entry.name.replace(location.origin, ''),
          initiatorType: entry.initiatorType,
          duration: Math.round(entry.duration),
          transferSize: entry.transferSize || 0,
          encodedBodySize: entry.encodedBodySize || 0,
        }));
      return {
        lcp: Math.round(window.__vsPerf?.lcp || 0),
        fcp: Math.round(window.__vsPerf?.fcp || 0),
        cls: Number((window.__vsPerf?.cls || 0).toFixed(4)),
        inp: Math.round(window.__vsPerf?.inp || 0),
        interactions: (window.__vsPerf?.interactions || [])
          .sort((a, b) => b.duration - a.duration)
          .slice(0, 8),
        clsSources: (window.__vsPerf?.clsSources || [])
          .sort((a, b) => b.value - a.value)
          .slice(0, 6)
          .map((entry) => ({
            value: Number(entry.value.toFixed(4)),
            startTime: Math.round(entry.startTime),
            sources: entry.sources,
          })),
        lcpEntries: (window.__vsPerf?.lcpEntries || [])
          .slice(-5)
          .map((entry) => ({
            startTime: Math.round(entry.startTime),
            size: entry.size,
            tag: entry.tag,
            id: entry.id,
            className: entry.className,
            src: entry.src,
            text: entry.text,
          })),
        domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : 0,
        load: nav ? Math.round(nav.loadEventEnd) : 0,
        ttfb: nav ? Math.round(nav.responseStart) : 0,
        transferSize: nav?.transferSize || 0,
        styleLinks: [...document.querySelectorAll('link[rel="stylesheet"]')].map((link) => ({
          href: link.getAttribute('href'),
          media: link.getAttribute('media') || '',
          asyncCss: link.hasAttribute('data-vs-async-css'),
        })),
        resources,
      };
    });
  } catch (error) {
    navigationError = navigationError || error.message || String(error);
  }

  await page.close().catch(() => {});

  return {
    profile: profile.name,
    viewport: profile.viewport,
    theme: profile.theme,
    lcpBudget: profile.lcpBudget,
    inpBudget: profile.inpBudget,
    route,
    status: response?.status() || 0,
    ...(data || {
      lcp: 0,
      fcp: 0,
      cls: 0,
      inp: 0,
      interactions: [],
      clsSources: [],
      lcpEntries: [],
      domContentLoaded: 0,
      load: 0,
      ttfb: 0,
      transferSize: 0,
      styleLinks: [],
      resources: [],
    }),
    navigationWaitUntil,
    navigationError,
    pageErrors,
  };
}

function timeoutRow(route, profile, error) {
  return {
    profile: profile.name,
    viewport: profile.viewport,
    theme: profile.theme,
    lcpBudget: profile.lcpBudget,
    inpBudget: profile.inpBudget,
    route,
    status: 0,
    lcp: 0,
    fcp: 0,
    cls: 0,
    inp: 0,
    interactions: [],
    clsSources: [],
    domContentLoaded: 0,
    load: 0,
    ttfb: 0,
    transferSize: 0,
    styleLinks: [],
    resources: [],
    navigationWaitUntil,
    navigationError: error.message || String(error),
    pageErrors: [],
  };
}

function rowFailures(row) {
  const failures = [];
  if (row.status < 200 || row.status >= 400) failures.push(`status ${row.status}`);
  if (row.navigationError) failures.push(`navigation error: ${row.navigationError.split('\n')[0]}`);
  if (row.pageErrors.length) failures.push(`${row.pageErrors.length} page error(s)`);
  if (row.lcp > row.lcpBudget) failures.push(`LCP ${row.lcp}ms > ${row.lcpBudget}ms`);
  if (row.cls > 0.1) failures.push(`CLS ${row.cls} > 0.1`);
  if (row.profile.includes('mobile') && row.inp > row.inpBudget) failures.push(`INP ${row.inp}ms > ${row.inpBudget}ms`);
  return failures;
}

function rowScore(row) {
  return row.lcp + row.cls * 10_000 + row.pageErrors.length * 10_000 + (row.status >= 200 && row.status < 400 ? 0 : 100_000);
}

async function measureRouteWithRetry(browser, baseUrl, route, profile) {
  const first = await withRowTimeout(measureRoute(browser, baseUrl, route, profile), route, profile);
  if (!check || rowFailures(first).length === 0) return first;

  const second = await withRowTimeout(measureRoute(browser, baseUrl, route, profile), route, profile);
  return rowFailures(second).length < rowFailures(first).length || rowScore(second) < rowScore(first) ? second : first;
}

async function withRowTimeout(promise, route, profile) {
  let timer = null;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`row timed out after ${rowTimeoutMs}ms`)), rowTimeoutMs);
      }),
    ]);
  } catch (error) {
    return timeoutRow(route, profile, error);
  } finally {
    clearTimeout(timer);
  }
}

function renderMarkdown(result) {
  const hasMultipleProfiles = new Set(result.routes.map((row) => row.profile)).size > 1;
  const lines = [
    `# Performance Trace — ${hasMultipleProfiles ? 'Responsive / Theme Matrix' : 'S142'}`,
    '',
    `Generated: ${result.generatedAt}`,
    `Base URL: ${result.baseUrl}`,
    '',
    hasMultipleProfiles
      ? '| Profile | Viewport | Theme | Route | Status | LCP | LCP Budget | INP | INP Budget | FCP | CLS | DCL | Load | TTFB |'
      : '| Route | Status | LCP | LCP Budget | INP | INP Budget | FCP | CLS | DCL | Load | TTFB |',
    hasMultipleProfiles
      ? '|---|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|'
      : '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
  ];

  for (const row of result.routes) {
    if (hasMultipleProfiles) {
      lines.push(`| ${row.profile} | ${row.viewport.width}x${row.viewport.height} | ${row.theme} | ${row.route} | ${row.status} | ${row.lcp}ms | ${row.lcpBudget}ms | ${row.inp}ms | ${row.inpBudget}ms | ${row.fcp}ms | ${row.cls} | ${row.domContentLoaded}ms | ${row.load}ms | ${row.ttfb}ms |`);
    } else {
      lines.push(`| ${row.route} | ${row.status} | ${row.lcp}ms | ${row.lcpBudget}ms | ${row.inp}ms | ${row.inpBudget}ms | ${row.fcp}ms | ${row.cls} | ${row.domContentLoaded}ms | ${row.load}ms | ${row.ttfb}ms |`);
    }
  }

  lines.push('', '## Stylesheet Shell');
  for (const shell of result.stylesheetShell) {
    const verdict = shell.violations.length ? `FAIL: ${shell.violations.length}` : 'OK';
    lines.push(`- ${shell.route}: ${verdict}`);
  }

  return `${lines.join('\n')}\n`;
}

async function clickIfVisible(page, selector) {
  const target = page.locator(selector).first();
  try {
    if (await target.isVisible({ timeout: 500 })) {
      await target.click({ timeout: 1_500 });
      return true;
    }
  } catch (_) {}
  return false;
}

async function hoverIfVisible(page, selector) {
  const target = page.locator(selector).first();
  try {
    if (await target.isVisible({ timeout: 500 })) {
      await target.hover({ timeout: 1_500 });
      return true;
    }
  } catch (_) {}
  return false;
}

async function runInteractionProbe(page, route) {
  const actions = [
    () => clickIfVisible(page, '#theme-picker-btn, .theme-picker-btn'),
    () => clickIfVisible(page, '#hamburger, .hamburger'),
    () => hoverIfVisible(page, '.oracle-ignis-card, [data-vault-oracle], .vs-oracle, #oracle-share-btn'),
    () => clickIfVisible(page, '.vs-rate-page__btn, .micro-feedback-toggle, .micro-feedback-option, .micro-feedback-submit'),
  ];
  for (const action of actions) {
    await action();
    await page.waitForTimeout(route === '/oracle/' ? 180 : 120);
  }
}

async function main() {
  let server = null;
  let baseUrl = baseArg;
  const freeDiskMb = assertDiskSpace();
  const deployParity = await verifyDeployParity(baseUrl);
  if (deployParity && deployParity.skipped === false) {
    if (deployParity.ok) {
      console.log(`deploy parity: OK (${deployParity.manifestVersion})`);
    } else {
      console.error(`deploy parity failed for ${deployParity.source}`);
      if (deployParity.missing?.length) console.error(`missing: ${deployParity.missing.join(', ')}`);
      if (deployParity.unexpected?.length) console.error(`unexpected: ${deployParity.unexpected.join(', ')}`);
      process.exit(1);
    }
  }

  if (!baseUrl) {
    server = spawn(process.execPath, ['scripts/local-preview-server.mjs'], {
      cwd: ROOT,
      env: { ...process.env, LOCAL_PREVIEW_HOST: host, LOCAL_PREVIEW_PORT: port },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    baseUrl = await waitForReady(server);
  }

  const measurements = [];
  const jobs = profiles.flatMap((profile) => routes.map((route) => ({ profile, route })));
  const effectiveBatchSize = batchSize > 0 ? batchSize : jobs.length;

  try {
    for (let start = 0; start < jobs.length; start += effectiveBatchSize) {
      const batch = jobs.slice(start, start + effectiveBatchSize);
      if (progress) console.error(`browser launch start batch ${Math.floor(start / effectiveBatchSize) + 1}`);
      const browser = await chromium.launch({ headless: true });
      if (progress) console.error('browser launch ready');
      try {
        for (const { profile, route } of batch) {
          if (progress) console.error(`measure start ${profile.name} ${route}`);
          const measurement = await measureRouteWithRetry(browser, baseUrl, route, profile);
          measurements.push(measurement);
          if (progress) console.error(`measure end   ${profile.name} ${route} status=${measurement.status} lcp=${measurement.lcp} cls=${measurement.cls}`);
        }
      } finally {
        await browser.close();
      }
    }
  } finally {
    if (server) {
      server.kill('SIGTERM');
      await once(server, 'exit').catch(() => {});
    }
  }

  const result = {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    traceMode: warmTrace ? 'warm' : 'cold',
    baseUrl,
    profiles,
    batchSize: effectiveBatchSize,
    freeDiskMb,
    deployParity,
    routes: measurements,
    stylesheetShell: routes.map(checkStylesheetShell),
  };

  const outAbs = path.resolve(ROOT, outputPath);
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, `${JSON.stringify(result, null, 2)}\n`);
  fs.writeFileSync(outAbs.replace(/\.json$/i, '.md'), renderMarkdown(result));

  const failures = [];
  for (const row of result.routes) {
    for (const failure of rowFailures(row)) failures.push(`${row.profile} ${row.route}: ${failure}`);
  }
  for (const shell of result.stylesheetShell) {
    if (shell.violations.length) failures.push(`${shell.route}: ${shell.violations.length} stylesheet shell violation(s)`);
  }

  console.log(`performance trace: ${routes.length} routes x ${profiles.length} profile(s) -> ${path.relative(ROOT, outAbs)}`);
  for (const row of result.routes) {
    console.log(`  ${row.profile.padEnd(12)} ${row.route.padEnd(16)} LCP ${String(row.lcp).padStart(4)}ms/${row.lcpBudget}  INP ${String(row.inp).padStart(3)}ms/${row.inpBudget}  FCP ${String(row.fcp).padStart(4)}ms  CLS ${row.cls}`);
  }

  if (failures.length) {
    for (const failure of failures) console.error(`FAIL ${failure}`);
    if (check) process.exit(1);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
