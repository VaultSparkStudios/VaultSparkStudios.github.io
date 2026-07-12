#!/usr/bin/env node
/**
 * probe-cls-bisect.mjs — S275 CLS attribution harness (born from the oracle 0.86 root-fix).
 *
 * Loads a route on the local preview server (scripts/local-preview-server.mjs,
 * port 4173), measures buffered layout-shift, then re-measures with each
 * non-shell script blocked — any module whose removal halves CLS is an
 * offender. This is how ignis-answer-engine.js (post-paint section insertion)
 * was isolated at S275; studio-pulse still lists nav-sheet, vault-genome-strip,
 * intent-flight-director, rate-page, vault-kinesis as compound offenders.
 *
 * Usage: node scripts/local-preview-server.mjs &   # port 4173
 *        ROUTE=/studio-pulse/ node scripts/probe-cls-bisect.mjs
 */
import { chromium } from '@playwright/test';
const browser = await chromium.launch();
async function measure(route, blockName) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const reqs = [];
  page.on('request', r => { if (/assets\/[\w.-]+\.js/.test(r.url())) reqs.push(r.url().split('/').pop()); });
  if (blockName) await page.route(`**/assets/${blockName}`, r => r.abort());
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  });
  let cls = -1;
  try {
    await page.goto('http://localhost:4173' + route, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(1500);
    cls = await page.evaluate(() => window.__cls);
  } catch (e) { console.log('  (nav issue', blockName, String(e).slice(0, 60), ')'); }
  await ctx.close();
  return { cls, reqs };
}
const route = process.env.ROUTE || "/";
const base = await measure(route, null);
console.log(route, 'baseline', base.cls.toFixed(4), '·', base.reqs.length, 'scripts');
const mods = [...new Set(base.reqs.filter(m => !/shell-|bundle|analytics|sentry|cookie/.test(m)))];
for (const m of mods) {
  const r = await measure(route, m);
  if (r.cls >= 0 && r.cls < base.cls * 0.5) console.log('OFFENDER→ without', m, '→', r.cls.toFixed(4));
}
console.log('done');
await browser.close();
