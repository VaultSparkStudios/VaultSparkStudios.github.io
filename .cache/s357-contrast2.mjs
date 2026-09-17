import { chromium } from '@playwright/test';
const lum=([r,g,b])=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);};
const ratio=(a,b)=>{const[x,y]=[lum(a),lum(b)].sort((m,n)=>n-m);return (x+0.05)/(y+0.05);};
const b = await chromium.launch();
for (const theme of ['light','dark']) {
  const p = await b.newPage({ viewport:{width:1280,height:900} });
  await p.addInitScript((t)=>{try{localStorage.setItem('vs_theme',t);localStorage.setItem('vs_cookie_consent','declined');}catch{}}, t=>t, theme);
  await p.addInitScript((t)=>{try{localStorage.setItem('vs_theme',t);localStorage.setItem('vs_cookie_consent','declined');}catch{}}, theme);
  await p.goto('https://website.staging.vaultsparkstudios.com/changelog/',{waitUntil:'load'});
  await p.locator('.cl-phase--live').first().scrollIntoViewIfNeeded();
  await p.waitForTimeout(3000);
  const out = await p.evaluate(() => {
    const px = s => (s.match(/[\d.]+/g)||[]).map(Number);
    // Composite every semi-transparent ancestor over the opaque base beneath it.
    const composited = (el) => {
      const stack = []; let n = el;
      while (n) { const c = px(getComputedStyle(n).backgroundColor);
        if (c.length >= 3) { const a = c.length === 4 ? c[3] : 1; if (a > 0) stack.push([c[0],c[1],c[2],a]); if (a >= 1) break; }
        n = n.parentElement; }
      const rootC = px(getComputedStyle(document.documentElement).backgroundColor);
      let base = (rootC.length>=3 && (rootC.length===3||rootC[3]>=1)) ? [rootC[0],rootC[1],rootC[2]] : [255,255,255];
      for (let i = stack.length-1; i >= 0; i--) { const [r,g,bb,a]=stack[i];
        base = [r*a+base[0]*(1-a), g*a+base[1]*(1-a), bb*a+base[2]*(1-a)]; }
      return base.map(Math.round);
    };
    const pick = (sel) => { const el=document.querySelector(sel); if(!el) return null;
      const cs=getComputedStyle(el); return { sel, color:px(cs.color).slice(0,3), bg:composited(el), size:cs.fontSize, weight:cs.fontWeight }; };
    return ['.cl-phase--live .cl-phase-title','.cl-phase--live .cl-items li','.cl-phase--live .cl-phase-date','.cl-phase--live .cl-phase-num'].map(pick).filter(Boolean);
  });
  console.log('--- ' + theme + ' ---');
  for (const r of out) {
    const v = ratio(r.color, r.bg);
    const large = parseFloat(r.size) >= 24 || (parseFloat(r.size) >= 18.66 && Number(r.weight) >= 700);
    const need = large ? 3 : 4.5;
    console.log(`  ${(v>=need?'PASS':'FAIL')} ${v.toFixed(2)}:1 (need ${need})  rgb(${r.color}) on rgb(${r.bg})  ${r.size} w${r.weight}  ${r.sel.split(' ').pop()}`);
  }
  await p.close();
}
await b.close();
