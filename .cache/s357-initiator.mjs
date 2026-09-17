import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:390,height:844}, hasTouch:true });
p.on('request', r => {
  if (r.url().includes('founder-presence')) {
    console.log('REQUEST', r.url());
    console.log('  resourceType:', r.resourceType());
    const i = r.frame();
    console.log('  initiator chain:', JSON.stringify(r.initiator?.() ?? 'n/a'));
  }
});
await p.goto('https://website.staging.vaultsparkstudios.com/', { waitUntil:'load' });
await p.waitForTimeout(1500);
await p.locator('#hamburger').click();
await p.waitForTimeout(3000);
// Ask the page what fetched it.
const entries = await p.evaluate(() => performance.getEntriesByType('resource')
  .filter(e => e.name.includes('founder-presence'))
  .map(e => ({ name: e.name, initiatorType: e.initiatorType, startTime: Math.round(e.startTime) })));
console.log('performance entries:', JSON.stringify(entries, null, 1));
await b.close();
