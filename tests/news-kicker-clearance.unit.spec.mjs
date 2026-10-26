import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { spawn } from '../scripts/lib/safe-spawn.mjs';

test('rendered News kicker and title clear the actual status link across themes and widths',async()=>{
  const server=spawn(process.execPath,[path.resolve('scripts/local-preview-server.mjs')],{windowsHide:true,env:{...process.env,LOCAL_PREVIEW_HOST:'127.0.0.1',LOCAL_PREVIEW_PORT:'0'},stdio:['ignore','pipe','pipe']});
  const closed=new Promise(resolve=>server.once('close',resolve));let browser;
  try{
    const origin=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('Preview readiness timeout')),15000);server.stdout.on('data',b=>{output+=b;const m=output.match(/Local preview running at (http:\/\/127\.0\.0\.1:\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.once('error',reject);server.once('exit',code=>{clearTimeout(timer);reject(Error('Preview exit '+code));});});
    browser=await chromium.launch();const findings=[];
    for(const width of [360,390,430,1366])for(const theme of ['dark','light','ambient','warm','cool','lava','high-contrast']){
      const context=await browser.newContext({viewport:{width,height:900}});
      await context.addInitScript(t=>{localStorage.setItem('vs_theme',t);localStorage.setItem('vs_cookie_consent','declined');},theme);
      for(const slug of ['anthropics-claude-ai-model-accessed-georgia-voter-data-in','spacex-closes-40-billion-debt-deal-for-ai-chips']){
        const page=await context.newPage();
        try{
          const response=await page.goto(`${origin}/news/2026-10-26/${slug}/`,{waitUntil:'load'});assert.equal(response.status(),200);
          await page.locator('[data-vs-page-sigil]').waitFor({state:'visible'});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(250);
          const result=await page.evaluate(()=>{
            const sigil=document.querySelector('[data-vs-page-sigil]').getBoundingClientRect();
            const overlaps=r=>Math.min(r.right,sigil.right)-Math.max(r.left,sigil.left)>0&&Math.min(r.bottom,sigil.bottom)-Math.max(r.top,sigil.top)>0;
            const ranges=['.desk-article-head .desk-kicker','.desk-article-head h1'].map(selector=>{const el=document.querySelector(selector);const range=document.createRange();range.selectNodeContents(el);return {selector,intersects:[...range.getClientRects()].some(overlaps)};});
            return {ranges,overflow:document.documentElement.scrollWidth>innerWidth+1,theme:document.documentElement.dataset.theme,statusTarget:{width:sigil.width,height:sigil.height}};
          });
          findings.push({width,theme,slug,...result});
          assert.equal(result.theme,theme);assert.equal(result.overflow,false,JSON.stringify(findings.at(-1)));assert.ok(result.statusTarget.width>=44&&result.statusTarget.height>=44);
          assert.ok(result.ranges.every(r=>!r.intersects),JSON.stringify(findings.at(-1)));
        }finally{await page.close();}
      }
      await context.close();
    }
    assert.equal(findings.length,56);
  }finally{await browser?.close();if(server.exitCode===null&&server.signalCode===null)server.kill();await closed;}
});
