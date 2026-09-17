import { chromium } from '@playwright/test';
const b = await chromium.launch();
for (const [label, base] of [['STAGING','https://website.staging.vaultsparkstudios.com'],['PRODUCTION','https://vaultsparkstudios.com']]) {
  const p = await b.newPage({ viewport:{width:390,height:844}, hasTouch:true });
  const bad = [];
  p.on('response', r => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
  await p.goto(base + '/', { waitUntil:'load' });
  await p.waitForTimeout(3500);
  console.log(label, '→', bad.length, 'failed');
  [...new Set(bad)].forEach(x => console.log('   ', x));
  await p.close();
}
await b.close();
