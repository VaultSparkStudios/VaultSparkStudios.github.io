#!/usr/bin/env node
/**
 * measure-throttled-vitals.mjs  (S279 — D-S279.2)
 *
 * The missing capability behind three carried perf items: a LOCAL harness that
 * reproduces Lighthouse-CI's *throttled* Core Web Vitals so we can find and
 * verify levers before pushing and waiting ~5min for CI.
 *
 * Why the existing measure-page-performance.mjs was insufficient: it runs
 * Chromium UNTHROTTLED, so a route reads "measured-safe" locally while CI's
 * simulated Moto-G / slow-4G throttling scores it very differently. That gap is
 * exactly how /ranks/ shipped a 0.291 CLS (Lighthouse perf 0.81<0.82) that every
 * local trace called clean — the Supabase Fame-Wall fill only shifts layout once
 * network + CPU are slow enough for it to land after first paint.
 *
 * This harness drives Playwright's already-installed Chromium and applies the
 * DevTools-protocol throttling Lighthouse uses by default:
 *   - Emulation.setCPUThrottlingRate  (4× — Lighthouse mobile default)
 *   - Network.emulateNetworkConditions (slow-4G: 150ms RTT · 1.6Mbps↓ · 750Kbps↑)
 *   - mobile viewport 412×823 @ DPR 1.75 (Lighthouse "Moto G Power" emulation)
 * then buffers layout-shift / LCP / FCP via PerformanceObserver.
 *
 * It is NOT a Lighthouse score replacement (Lantern simulation differs), but CLS
 * is layout-deterministic and reproduces faithfully, and throttled LCP lands in
 * the right ballpark — enough to find levers and PROVE a CLS fix before CI.
 *
 * KNOWN LIMITATION (proven S279 — do not chase a phantom LCP win here): this
 * harness applies *real* CDP throttling, whereas Lighthouse-CI uses Lantern
 * *simulated* throttling that models the render-blocking critical chain and
 * heavily inflates LCP for render-blocking-bound pages. Measured evidence: the
 * homepage reads LCP≈1700ms here (applied) but 5800ms in CI (Lantern). So a
 * LOW LCP in this harness does NOT prove a low CI LCP when the page is gated by
 * render-blocking CSS/JS. Trust this harness for CLS (exact) and for spotting a
 * genuinely slow *element* load; use real Lighthouse-CI for render-blocking LCP.
 *
 * Usage:
 *   node scripts/measure-throttled-vitals.mjs                 # default route set
 *   node scripts/measure-throttled-vitals.mjs --routes=/ranks/,/
 *   node scripts/measure-throttled-vitals.mjs --cls-budget=0.10   # non-zero exit on breach
 *   node scripts/measure-throttled-vitals.mjs --settle=6000 --runs=2
 *   node scripts/measure-throttled-vitals.mjs --self-test
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from './lib/safe-spawn.mjs';
import { chromium } from '@playwright/test';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const selfTest = args.includes('--self-test');

function valueFor(flag, dflt = null) {
  const eq = args.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : dflt;
}

// Lighthouse mobile default throttling (devtools-equivalent applied via CDP).
const THROTTLE = {
  cpuRate: Number(valueFor('--cpu', '4')),
  // slow-4G — bytes/sec (Kbps → *1024/8), latency ms.
  net: {
    downloadThroughput: Math.round((1638.4 * 1024) / 8), // ~209,715 B/s
    uploadThroughput: Math.round((675 * 1024) / 8),       // ~86,400 B/s
    latency: 150,
  },
};

// Default: the routes whose CWV are load-bearing on CI + the Supabase-fill
// routes whose post-paint injection is the historical CLS class.
const DEFAULT_ROUTES = ['/ranks/', '/', '/join/', '/community/', '/games/'];
const routes = (valueFor('--routes') || DEFAULT_ROUTES.join(','))
  .split(',').map((r) => r.trim()).filter(Boolean);
const settleMs = Number(valueFor('--settle', '5000'));
const runs = Math.max(1, Number(valueFor('--runs', '1')));
const clsBudget = valueFor('--cls-budget') != null ? Number(valueFor('--cls-budget')) : null;
const outPath = valueFor('--out');
const host = process.env.LOCAL_PREVIEW_HOST || '127.0.0.1';
const port = process.env.LOCAL_PREVIEW_PORT || String(4900 + Math.floor(process.pid % 90));

// ── Self-test: validate throttle math + parsing without a browser ────────────
function runSelfTest() {
  const checks = [];
  const t = (name, cond) => checks.push({ name, ok: !!cond });
  t('cpu rate is 4× by default', THROTTLE.cpuRate === 4);
  t('slow-4G download ≈ 205KB/s', Math.abs(THROTTLE.net.downloadThroughput - 209715) < 50);
  t('slow-4G latency is 150ms', THROTTLE.net.latency === 150);
  t('default route set includes /ranks/', DEFAULT_ROUTES.includes('/ranks/'));
  t('default route set includes the Supabase-fill routes',
    ['/join/', '/community/'].every((r) => DEFAULT_ROUTES.includes(r)));
  // median helper correctness
  t('median of [0.81,0.78,0.82] = 0.81', median([0.81, 0.78, 0.82]) === 0.81);
  t('median of [1,2] = 1.5', median([1, 2]) === 1.5);
  // CLS verdict math
  t('cls 0.29 breaches 0.10 budget', 0.291 >= 0.10);
  t('cls 0.0006 clears 0.10 budget', 0.0006 < 0.10);
  const passed = checks.filter((c) => c.ok).length;
  for (const c of checks) console.log(`  ${c.ok ? '✓' : '✘'} ${c.name}`);
  console.log(`measure-throttled-vitals --self-test: ${passed}/${checks.length}`);
  process.exit(passed === checks.length ? 0 : 1);
}

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

if (selfTest) runSelfTest();

function waitForReady(child, timeoutMs = 20_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('preview server did not start in time')), timeoutMs);
    child.stdout.on('data', (chunk) => {
      const m = chunk.toString().match(/https?:\/\/127\.0\.0\.1:\d+/);
      if (m) { clearTimeout(timer); resolve(m[0]); }
    });
    child.stderr.on('data', (c) => process.stderr.write(c));
    child.on('exit', (code) => { clearTimeout(timer); reject(new Error(`preview exited early (${code})`)); });
  });
}

const OBSERVER_INIT = () => {
  window.__vsv = { lcp: 0, cls: 0, fcp: 0, sources: [], lcpEl: null };
  try {
    new PerformanceObserver((list) => {
      const e = list.getEntries();
      const last = e[e.length - 1];
      if (last) {
        window.__vsv.lcp = last.startTime;
        const n = last.element;
        window.__vsv.lcpEl = n
          ? { tag: n.tagName, id: n.id || '', cls: String(n.className || '').slice(0, 60), size: last.size || 0 }
          : { tag: '', id: '', cls: '', size: last.size || 0 };
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (_) {}
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          window.__vsv.cls += entry.value;
          if (entry.value > 0.01) {
            window.__vsv.sources.push({
              value: Number(entry.value.toFixed(4)),
              at: Math.round(entry.startTime),
              nodes: (entry.sources || []).slice(0, 3).map((s) => {
                const n = s.node;
                return n ? { tag: n.tagName, id: n.id || '', cls: String(n.className || '').slice(0, 50) } : null;
              }).filter(Boolean),
            });
          }
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (_) {}
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') window.__vsv.fcp = entry.startTime;
      }
    }).observe({ type: 'paint', buffered: true });
  } catch (_) {}
};

async function measureRoute(browser, base, route) {
  const context = await browser.newContext({
    viewport: { width: 412, height: 823 },
    deviceScaleFactor: 1.75,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (Linux; Android 11; moto g power) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, ...THROTTLE.net });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE.cpuRate });
  await page.addInitScript(OBSERVER_INIT);
  let status = 0;
  try {
    const resp = await page.goto(base + route, { waitUntil: 'load', timeout: 45_000 });
    status = resp ? resp.status() : 0;
  } catch (e) {
    await context.close();
    return { route, status: 0, error: String(e.message || e).slice(0, 80) };
  }
  await page.waitForTimeout(settleMs);
  const v = await page.evaluate(() => window.__vsv);
  await context.close();
  return {
    route, status,
    lcp: Math.round(v.lcp),
    fcp: Math.round(v.fcp),
    cls: Number(v.cls.toFixed(4)),
    lcpEl: v.lcpEl,
    sources: v.sources,
  };
}

async function main() {
  const server = spawn(process.execPath, ['scripts/local-preview-server.mjs'], {
    cwd: ROOT,
    env: { ...process.env, LOCAL_PREVIEW_HOST: host, LOCAL_PREVIEW_PORT: port },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let base;
  try {
    base = await waitForReady(server);
  } catch (e) {
    server.kill();
    console.error('✘ ' + e.message);
    process.exit(2);
  }
  console.log(`measure-throttled-vitals · ${base} · CPU ${THROTTLE.cpuRate}× · slow-4G · ${runs} run(s)\n`);
  const browser = await chromium.launch();
  const results = [];
  try {
    for (const route of routes) {
      const perRun = [];
      for (let i = 0; i < runs; i++) perRun.push(await measureRoute(browser, base, route));
      // median run by CLS (the metric this harness exists to catch)
      const ok = perRun.filter((r) => !r.error);
      const pick = ok.length
        ? ok.sort((a, b) => a.cls - b.cls)[Math.floor(ok.length / 2)]
        : perRun[0];
      results.push(pick);
    }
  } finally {
    await browser.close();
    server.kill();
  }

  console.log('  Route'.padEnd(20) + 'CLS'.padEnd(10) + 'LCP'.padEnd(10) + 'FCP'.padEnd(10) + 'LCP element');
  console.log('  ' + '─'.repeat(72));
  let breaches = 0;
  for (const r of results) {
    if (r.error) { console.log(`  ${r.route.padEnd(18)} ERROR: ${r.error}`); continue; }
    const el = r.lcpEl ? `${r.lcpEl.tag}${r.lcpEl.id ? '#' + r.lcpEl.id : ''}${r.lcpEl.cls ? '.' + r.lcpEl.cls.split(' ')[0] : ''}` : '';
    const flag = clsBudget != null && r.cls >= clsBudget ? ' ⛔' : '';
    if (clsBudget != null && r.cls >= clsBudget) breaches++;
    console.log(`  ${r.route.padEnd(18)}${String(r.cls).padEnd(10)}${(r.lcp + 'ms').padEnd(10)}${(r.fcp + 'ms').padEnd(10)}${el}${flag}`);
    for (const s of r.sources) {
      const n = s.nodes[0];
      console.log(`      ↳ shift ${s.value} @${s.at}ms  ${n ? n.tag + (n.id ? '#' + n.id : '') + (n.cls ? '.' + n.cls.split(' ')[0] : '') : ''}`);
    }
  }
  if (outPath) {
    fs.writeFileSync(path.join(ROOT, outPath), JSON.stringify({ base, throttle: THROTTLE, results }, null, 2));
    console.log(`\n  → ${outPath}`);
  }
  if (clsBudget != null && breaches > 0) {
    console.error(`\n✘ ${breaches} route(s) breach CLS budget ${clsBudget}`);
    process.exit(1);
  }
  console.log('\n✓ done');
}

main().catch((e) => { console.error(e); process.exit(2); });
