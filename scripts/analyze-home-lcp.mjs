#!/usr/bin/env node
/**
 * Homepage LCP autopsy.
 *
 * Runs the local homepage in Chromium, records the LCP candidate through a
 * PerformanceObserver, captures basic resource/long-task evidence, and writes a
 * durable JSON + HTML report for the S173 field-LCP sprint.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from './lib/safe-spawn.mjs';
import { chromium } from '@playwright/test';

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, 'docs', 'PERF_HOME_LCP_AUTOPSY_2026-06-04.json');
const OUT_HTML = path.join(ROOT, 'docs', 'PERF_HOME_LCP_AUTOPSY_2026-06-04.html');
const args = process.argv.slice(2);
const SELF_TEST = args.includes('--self-test');
const CHECK = args.includes('--check');

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderHtml(report) {
  const resources = (report.resources || []).slice(0, 24).map((r) =>
    `<tr><td>${esc(r.name)}</td><td>${Math.round(r.startTime)}</td><td>${Math.round(r.duration)}</td><td>${esc(r.initiatorType)}</td><td>${Math.round(r.transferSize || 0)}</td></tr>`
  ).join('\n');
  const tasks = (report.longTasks || []).map((t) =>
    `<tr><td>${Math.round(t.startTime)}</td><td>${Math.round(t.duration)}</td></tr>`
  ).join('\n') || '<tr><td colspan="2">No long tasks observed.</td></tr>';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex">
<title>Homepage LCP Autopsy</title>
<style>body{margin:0;padding:2rem;background:#07080f;color:#eef2ff;font:14px/1.5 Inter,system-ui,sans-serif}h1{font-family:Georgia,serif}code{color:#ffc400}table{border-collapse:collapse;width:100%;margin:1rem 0}td,th{border:1px solid rgba(255,255,255,.12);padding:.45rem;text-align:left}th{color:#ffc400}.card{border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:1rem;background:#0c0e18;margin:1rem 0}</style>
</head><body>
<h1>Homepage LCP Autopsy</h1>
<div class="card">
  <p><strong>Route:</strong> <code>${esc(report.route)}</code></p>
  <p><strong>LCP:</strong> ${Math.round(report.lcp?.startTime || 0)}ms · <strong>Selector:</strong> <code>${esc(report.lcp?.selector || 'unknown')}</code></p>
  <p><strong>Text:</strong> ${esc(report.lcp?.text || '')}</p>
  <p><strong>FCP:</strong> ${Math.round(report.paint?.fcp || 0)}ms · <strong>DOM Content Loaded:</strong> ${Math.round(report.navigation?.domContentLoaded || 0)}ms · <strong>Load:</strong> ${Math.round(report.navigation?.load || 0)}ms</p>
</div>
<h2>Top Resources</h2>
<table><thead><tr><th>Name</th><th>Start</th><th>Duration</th><th>Type</th><th>Bytes</th></tr></thead><tbody>${resources}</tbody></table>
<h2>Long Tasks</h2>
<table><thead><tr><th>Start</th><th>Duration</th></tr></thead><tbody>${tasks}</tbody></table>
</body></html>`;
}

function summarize(report) {
  return {
    route: report.route,
    lcpSelector: report.lcp?.selector || '',
    lcpMs: Math.round(report.lcp?.startTime || 0),
    fcpMs: Math.round(report.paint?.fcp || 0),
    resourceCount: (report.resources || []).length,
    longTaskCount: (report.longTasks || []).length,
  };
}

if (SELF_TEST) {
  const html = renderHtml({ route: '/', lcp: { startTime: 1234, selector: 'h1', text: 'VaultSpark' }, paint: { fcp: 900 }, navigation: { domContentLoaded: 800, load: 1400 }, resources: [], longTasks: [] });
  const cases = [
    ['renders route', html.includes('<code>/</code>')],
    ['escapes selector', renderHtml({ route: '/', lcp: { selector: '<x>' }, paint: {}, navigation: {} }).includes('&lt;x&gt;')],
    ['summarizes report', summarize({ route: '/', lcp: { selector: 'h1', startTime: 10 }, paint: { fcp: 5 }, resources: [1], longTasks: [] }).resourceCount === 1],
  ];
  let failed = 0;
  for (const [name, ok] of cases) {
    console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
    if (!ok) failed += 1;
  }
  console.log(`\nself-test: ${cases.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

if (CHECK) {
  if (!fs.existsSync(OUT_JSON) || !fs.existsSync(OUT_HTML)) {
    console.error('analyze-home-lcp --check: missing autopsy artifacts; run without --check');
    process.exit(1);
  }
  const parsed = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
  if (!parsed.lcp || !parsed.generatedAt) {
    console.error('analyze-home-lcp --check: artifact shape drift');
    process.exit(1);
  }
  console.log(`analyze-home-lcp --check: OK (${summarize(parsed).lcpMs}ms ${summarize(parsed).lcpSelector || 'unknown'})`);
  process.exit(0);
}

function waitForServer(child, timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('local preview server did not start')), timeoutMs);
    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      const match = text.match(/https?:\/\/127\.0\.0\.1:\d+/);
      if (match) {
        clearTimeout(timer);
        resolve(match[0]);
      }
    });
    child.stderr.on('data', (chunk) => process.stderr.write(chunk));
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`local preview server exited early with code ${code}`));
    });
  });
}

const server = spawn(process.execPath, ['scripts/local-preview-server.mjs'], {
  cwd: ROOT,
  stdio: ['ignore', 'pipe', 'pipe'],
});

let browser;
try {
  const base = await waitForServer(server);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await page.addInitScript(() => {
    window.__vsLcpEntries = [];
    window.__vsLongTasks = [];
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const el = entry.element;
          let selector = '';
          if (el) {
            selector = el.id ? `#${el.id}` : el.className ? `${el.tagName.toLowerCase()}.${String(el.className).trim().split(/\s+/).slice(0, 3).join('.')}` : el.tagName.toLowerCase();
          }
          window.__vsLcpEntries.push({
            startTime: entry.startTime,
            size: entry.size,
            url: entry.url || '',
            selector,
            text: el && el.innerText ? el.innerText.slice(0, 160) : '',
            rect: el ? el.getBoundingClientRect().toJSON() : null,
          });
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) window.__vsLongTasks.push({ startTime: entry.startTime, duration: entry.duration });
      }).observe({ type: 'longtask', buffered: true });
    } catch (_) {}
  });
  await page.goto(`${base}/`, { waitUntil: 'load', timeout: 30_000 });
  await page.waitForTimeout(3000);
  const report = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const paints = Object.fromEntries(performance.getEntriesByType('paint').map((p) => [p.name, p.startTime]));
    const resources = performance.getEntriesByType('resource')
      .map((r) => ({
        name: r.name.replace(location.origin, ''),
        startTime: r.startTime,
        duration: r.duration,
        transferSize: r.transferSize,
        initiatorType: r.initiatorType,
      }))
      .sort((a, b) => b.duration - a.duration);
    const lcp = (window.__vsLcpEntries || []).slice(-1)[0] || null;
    return {
      lcp,
      paint: { fcp: paints['first-contentful-paint'] || 0 },
      navigation: {
        domContentLoaded: nav ? nav.domContentLoadedEventEnd : 0,
        load: nav ? nav.loadEventEnd : 0,
      },
      resources,
      longTasks: window.__vsLongTasks || [],
    };
  });
  const payload = {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    generatedBy: 'scripts/analyze-home-lcp.mjs',
    route: '/',
    baseUrl: base,
    ...report,
  };
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.writeFileSync(OUT_HTML, renderHtml(payload), 'utf8');
  const summary = summarize(payload);
  console.log(`analyze-home-lcp: ${summary.lcpMs}ms · ${summary.lcpSelector || 'unknown'} · ${summary.resourceCount} resources`);
} finally {
  if (browser) await browser.close();
  server.kill();
}
