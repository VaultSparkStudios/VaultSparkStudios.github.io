import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1280,height:900} });
await p.addInitScript(()=>{ try{ localStorage.setItem('vs_theme','light'); localStorage.setItem('vs_cookie_consent','declined'); }catch{} });
await p.goto('https://website.staging.vaultsparkstudios.com/changelog/', { waitUntil:'load' });
const el = p.locator('.cl-phase--live').first();
await el.scrollIntoViewIfNeeded();
await p.waitForTimeout(4000);           // let [data-reveal] fade-up finish
const style = await el.evaluate(n => { const c = getComputedStyle(n); return { opacity: c.opacity, transform: c.transform }; });
console.log('settled style:', JSON.stringify(style));
const title = p.locator('.cl-phase--live .cl-phase-title').first();
console.log('title colour:', await title.evaluate(n => getComputedStyle(n).color));
console.log('item colour :', await p.locator('.cl-phase--live .cl-items li').first().evaluate(n => getComputedStyle(n).color));
console.log('page bg     :', await p.evaluate(() => getComputedStyle(document.body).backgroundColor));
await el.screenshot({ path: '.cache/s357-staging/changelog-settled--light.png' });
await b.close();
