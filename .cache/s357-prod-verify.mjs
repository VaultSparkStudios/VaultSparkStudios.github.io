import { chromium } from '@playwright/test';
const THEMES = ['dark','light','ambient','warm','cool','lava','high-contrast'];
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:390,height:844}, hasTouch:true });
const bad = [];
p.on('response', r => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
await p.goto('https://vaultsparkstudios.com/', { waitUntil:'load' });
await p.waitForTimeout(1500);
await p.locator('#hamburger').click();
await p.waitForTimeout(800);
for (const t of THEMES) { const pill = p.locator(`.mobile-theme-pill[data-theme="${t}"]`); if (await pill.count()) { await pill.click(); await p.waitForTimeout(450); } }
await p.waitForTimeout(2500);
console.log('PRODUCTION homepage, drawer + all 7 themes → failed responses:', bad.length);
[...new Set(bad)].forEach(x => console.log('   ', x));
await b.close();
