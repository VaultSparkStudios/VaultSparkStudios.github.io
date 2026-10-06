// CANON-053: capture current rendered Spark states; inspection remains explicit.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {chromium} from '@playwright/test';
import sharp from 'sharp';
const require=createRequire(import.meta.url);
const {sourceBinding,candidateBinding}=require('./lib/mobile-runtime-contract.cjs');
const capturedCandidate=candidateBinding(process.cwd());
const base=process.env.BASE_URL||'http://127.0.0.1:4173';
const themes=['dark','light','ambient','warm','cool','lava','high-contrast'];
const viewports=[{name:'desktop',width:1366,height:900},{name:'mobile',width:390,height:844}];
const states=['closed','map','list','proof','mix','route','saved','feedback','empty','fallback'];
const out='docs/visual-qa';fs.mkdirSync(out,{recursive:true});fs.mkdirSync('.cache/spark-contact',{recursive:true});
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const captures=[],errors=[];
const browser=await chromium.launch({headless:true});
try{
 for(const theme of themes)for(const viewport of viewports){
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:1});
  await context.addInitScript(t=>{localStorage.setItem('vs_cookie_consent','declined');localStorage.setItem('vs_theme',t);},theme);
  const page=await context.newPage();page.on('pageerror',e=>errors.push({theme,viewport:viewport.name,error:e.message}));
  await page.goto(base+'/games/',{waitUntil:'load'});
  await page.getByRole('button',{name:'Open Spark — Vault Compass'}).waitFor();
  const shot=async state=>{await page.waitForTimeout(450);const file=`spark-${theme}-${viewport.name}-${state}.png`;await page.screenshot({path:path.join(out,file),animations:'disabled'});captures.push({page:'/games/',theme,viewportName:viewport.name,viewport:{width:viewport.width,height:viewport.height},state,file,sha256:hash(path.join(out,file)),inspection:{mode:'automated-only'}});};
  await shot('closed');await page.getByRole('button',{name:'Open Spark — Vault Compass'}).click();await page.locator('.spark-card').first().waitFor();await shot('map');
  await page.locator('#spark-compass').getByRole('button',{name:'List',exact:true}).click();await shot('list');
  await page.locator('#spark-compass').getByRole('button',{name:'Map',exact:true}).click();await page.locator('.spark-proof summary').first().click();await shot('proof');
  await page.getByRole('button',{name:'Mix interests',exact:true}).click();await shot('mix');await page.getByRole('button',{name:'Compose a path'}).click();await shot('route');
  await page.getByRole('button',{name:'Save path',exact:true}).click();await page.getByRole('button',{name:'Saved paths',exact:true}).click();await shot('saved');
  await page.getByRole('button',{name:'Feedback',exact:true}).click();await shot('feedback');
  await page.getByRole('searchbox',{name:'Search Vault destinations'}).fill('no-match-xyz');await shot('empty');
  await page.keyboard.press('Escape');await page.route('**/api/spark-manifest.json',r=>r.fulfill({status:503,body:'Unavailable'}));await page.reload();await page.getByRole('button',{name:'Open Spark — Vault Compass'}).click();await page.getByText('This source is unavailable. You can still browse.').waitFor();await shot('fallback');
  const cells=[];for(let i=0;i<states.length;i++){const raw=path.join(out,`spark-${theme}-${viewport.name}-${states[i]}.png`);const width=viewport.name==='mobile'?390:683;const height=viewport.name==='mobile'?844:450;const label=Buffer.from(`<svg width="${width}" height="28"><rect width="100%" height="100%" fill="#111"/><text x="8" y="20" fill="white" font-size="16">${theme} ${states[i]}</text></svg>`);const input=await sharp(raw).resize(width,height).composite([{input:label,top:0,left:0}]).png().toBuffer();cells.push({input,left:(i%2)*width,top:Math.floor(i/2)*height});}
  const width=viewport.name==='mobile'?390:683,height=viewport.name==='mobile'?844:450;await sharp({create:{width:width*2,height:height*5,channels:4,background:'#111'}}).composite(cells).png().toFile(`.cache/spark-contact/${theme}-${viewport.name}.png`);
  console.log(`Captured ${theme} ${viewport.name}: ${states.length} states`);await context.close();
 }
}finally{await browser.close();}
const files=['assets/spark-compass.js','assets/spark-compass.css','assets/command-palette-loader.js','assets/ambient-loader.js','assets/journey-conductor.js','assets/constellation-tracker.js','assets/pwa-install.js','scripts/build-flight-director.mjs','scripts/build-spark-manifest.mjs','api/spark-manifest.json','games/index.html'];
const receipt={schemaVersion:1,inspectionSchemaVersion:2,capturedAt:new Date().toISOString(),generatedBy:'scripts/capture-spark-visual-proof.mjs',themes,source:sourceBinding(process.cwd(),files),matrix:{routes:['/games/'],themes,viewports:viewports.map(v=>v.name),states,expectedCaptures:captures.length,completedCaptures:captures.length},inspection:{renderedPixelsReviewed:false,reviewer:'pending',coverage:{totalCaptures:captures.length,manuallyReviewed:0,automatedOnly:captures.length,complete:false},findings:errors,blockingDefectsOpen:1},captures};
receipt.candidate=capturedCandidate;
fs.writeFileSync(path.join(out,'LATEST.json'),JSON.stringify(receipt,null,2)+'\n');console.log(`${captures.length} hash-bound captures; manual inspection pending; ${errors.length} runtime errors`);
