import { chromium } from '@playwright/test';
const b = await chromium.launch();
for (const [label, base] of [['PRODUCTION','https://vaultsparkstudios.com'],['STAGING','https://website.staging.vaultsparkstudios.com']]) {
  const p = await b.newPage({ viewport:{width:1280,height:900} });
  const errs = [];
  p.on('response', r => { if (r.status() >= 400) errs.push(`${r.status()} ${r.url().split('?')[0]}`); });
  await p.goto(base + '/changelog/', { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  const counts = {};
  errs.forEach(e => { counts[e] = (counts[e]||0)+1; });
  console.log(label + ':', errs.length, 'failed response(s)');
  Object.entries(counts).forEach(([k,v]) => console.log('   ', v+'x', k.slice(0,100)));
  await p.close();
}
await b.close();
