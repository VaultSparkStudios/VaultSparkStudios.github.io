import { chromium } from '@playwright/test';
const THEMES = ['dark','light','ambient','warm','cool','lava','high-contrast'];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:390,height:844}, hasTouch:true, bypassCSP:false });
await ctx.route('**/*', r => r.continue());
const p = await ctx.newPage();
const bad = [];
p.on('response', r => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
await p.goto('https://website.staging.vaultsparkstudios.com/?cb=' + Date.now(), { waitUntil:'load' });
await p.waitForTimeout(1500);
await p.locator('#hamburger').click();
await p.waitForTimeout(800);
for (const t of THEMES) { const pill = p.locator(`.mobile-theme-pill[data-theme="${t}"]`); if (await pill.count()) { await pill.click(); await p.waitForTimeout(450); } }
await p.waitForTimeout(2500);
console.log('failed responses:', bad.length);
[...new Set(bad)].forEach(x => console.log('   ', x));
const entries = await p.evaluate(() => performance.getEntriesByType('resource').filter(e=>e.name.includes('public-intelligence')).map(e=>e.name.split('/').pop()));
console.log('public-intelligence resources loaded:', JSON.stringify([...new Set(entries)]));
await b.close();
