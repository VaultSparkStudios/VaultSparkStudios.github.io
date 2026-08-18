import { chromium } from 'playwright';
const target = process.argv[2];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const bad = [];
page.on('response', r => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
await page.goto(target + '/', { waitUntil: 'load' });
try { await page.locator('#hamburger').click({ timeout: 8000 }); } catch {}
await page.waitForTimeout(3000);
console.log('failing requests:'); [...new Set(bad)].forEach(b => console.log('  ', b));
if (!bad.length) console.log('   (none)');
await browser.close();
