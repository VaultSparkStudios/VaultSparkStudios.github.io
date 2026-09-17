import { chromium } from '@playwright/test';
const THEMES = ['dark','light','ambient','warm','cool','lava','high-contrast'];
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:390,height:844}, hasTouch:true });
await p.addInitScript(() => {
  const trap = (label, orig) => function(...a) {
    const url = String(a[0]?.url || a[0] || '');
    if (url.includes('founder-presence')) {
      // eslint-disable-next-line no-console
      console.log('VS_TRAP ' + label + ' ' + url + ' :: ' + new Error().stack);
    }
    return orig.apply(this, a);
  };
  window.fetch = trap('fetch', window.fetch);
  const xo = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(m, u, ...r) {
    if (String(u).includes('founder-presence')) console.log('VS_TRAP xhr ' + u + ' :: ' + new Error().stack);
    return xo.call(this, m, u, ...r);
  };
});
p.on('console', m => { const t = m.text(); if (t.startsWith('VS_TRAP')) console.log(t.slice(0, 1200)); });
await p.goto('https://website.staging.vaultsparkstudios.com/', { waitUntil:'load' });
await p.waitForTimeout(1500);
await p.locator('#hamburger').click();
await p.waitForTimeout(800);
for (const t of THEMES) { const pill = p.locator(`.mobile-theme-pill[data-theme="${t}"]`); if (await pill.count()) { await pill.click(); await p.waitForTimeout(400); } }
await p.waitForTimeout(3000);
await b.close();
