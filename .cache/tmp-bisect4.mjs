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
  await page.goto(`http://localhost:4173${route}`, { waitUntil: 'load' });
  await page.waitForTimeout(2200);
  const cls = await page.evaluate(() => window.__cls);
  await ctx.close();
  return { cls, reqs };
}
for (const route of ['/studio-pulse/', '/changelog/']) {
  const base = await measure(route, null);
  console.log(`\n${route} baseline ${base.cls.toFixed(4)}`);
  const mods = base.reqs.filter(m => !/shell-|bundle/.test(m));
  for (const m of [...new Set(mods)]) {
    const { cls } = await measure(route, m);
    if (cls < base.cls * 0.5) console.log(`  OFFENDER→ without ${m} → ${cls.toFixed(4)}`);
  }
}
await browser.close();
