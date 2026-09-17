import { chromium } from '@playwright/test';
const lum = ([r,g,b]) => { const f=v=>{v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4);};
  return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
const ratio = (a,b) => { const [x,y]=[lum(a),lum(b)].sort((m,n)=>n-m); return ((x+0.05)/(y+0.05)); };
const parse = s => (s.match(/\d+/g)||[]).slice(0,3).map(Number);
const b = await chromium.launch();
for (const theme of ['light','dark']) {
  const p = await b.newPage({ viewport:{width:1280,height:900} });
  await p.addInitScript((t)=>{ try{ localStorage.setItem('vs_theme',t); localStorage.setItem('vs_cookie_consent','declined'); }catch{} }, theme);
  await p.goto('https://website.staging.vaultsparkstudios.com/changelog/', { waitUntil:'load' });
  await p.locator('.cl-phase--live').first().scrollIntoViewIfNeeded();
  await p.waitForTimeout(3000);
  const data = await p.evaluate(() => {
    const eff = (el) => { let n = el; while (n) { const c = getComputedStyle(n).backgroundColor;
      if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c; n = n.parentElement; }
      return getComputedStyle(document.documentElement).backgroundColor; };
    const t = document.querySelector('.cl-phase--live .cl-phase-title');
    const i = document.querySelector('.cl-phase--live .cl-items li');
    const d = document.querySelector('.cl-phase--live .cl-phase-date');
    return { titleColor:getComputedStyle(t).color, titleBg:eff(t), titleSize:getComputedStyle(t).fontSize, titleWeight:getComputedStyle(t).fontWeight,
             itemColor:getComputedStyle(i).color, itemBg:eff(i), itemSize:getComputedStyle(i).fontSize,
             dateColor:getComputedStyle(d).color, dateBg:eff(d) };
  });
  console.log('--- ' + theme + ' ---');
  console.log('  title', data.titleColor, 'on', data.titleBg, '=', ratio(parse(data.titleColor), parse(data.titleBg)).toFixed(2)+':1', `(${data.titleSize}, w${data.titleWeight})`);
  console.log('  item ', data.itemColor, 'on', data.itemBg, '=', ratio(parse(data.itemColor), parse(data.itemBg)).toFixed(2)+':1', `(${data.itemSize})`);
  console.log('  date ', data.dateColor, 'on', data.dateBg, '=', ratio(parse(data.dateColor), parse(data.dateBg)).toFixed(2)+':1');
  await p.close();
}
await b.close();
