import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const root=process.cwd(), require=createRequire(path.join(root,'package.json'));
const {chromium}=require('@playwright/test');
const {sourceBinding,candidateBinding}=require('./scripts/lib/mobile-runtime-contract.cjs');
const phase=process.argv[2]; if(!['before','after'].includes(phase))throw Error('phase must be before or after');
const home=path.join(root,'.cache/S395/news-qa'), plan=JSON.parse(fs.readFileSync(path.join(root,'docs/visual-qa/S395-news-plan.json'),'utf8').replace(/^\uFEFF/,''));
const only=process.argv[3]||'';if(only&&!['target','listing','related'].includes(only))throw Error('optional group must be target, listing or related');const out=path.join(home,phase+(only?'-'+only:'')); fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.avif':'image/avif','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{try{let rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let abs=path.resolve(root,'.'+rel);if(!abs.startsWith(root+path.sep))throw Error('path');if(fs.existsSync(abs)&&fs.statSync(abs).isDirectory())abs=path.join(abs,'index.html');if(!fs.existsSync(abs)){res.writeHead(404);res.end();return;}res.writeHead(200,{'content-type':mime[path.extname(abs)]||'application/octet-stream'});res.end(fs.readFileSync(abs));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r)); const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true}); const shots=[],absence=[],failures=[];
const sourceFiles=new Set(['assets/style.css','assets/news-desk.css','scripts/generate-news-pages.mjs','data/news-desk/days/2026-10-21.json','docs/visual-qa/S395-news-capture.mjs','docs/visual-qa/S395-news-plan.json','docs/visual-qa/S395-news-recipe.txt']);
const jobs=[...plan.targetStates.map(s=>({...s,route:plan.target,group:'target'})),{...plan.listing,group:'listing'},{...plan.related,group:'related'}];
if(only)jobs.splice(0,jobs.length,...jobs.filter(j=>j.group===only));
for(const j of jobs) sourceFiles.add(j.route.slice(1)+'index.html');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
try{for(const viewport of plan.viewports)for(const theme of plan.themes){
 const ctx=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:1});
 await ctx.addInitScript(t=>{localStorage.setItem('vs_theme',t);localStorage.setItem('vs_cookie_consent','declined');},theme);
 await ctx.route('**/*',route=>{const u=new URL(route.request().url()); if(u.origin!==origin)return route.abort(); if(!['GET','HEAD'].includes(route.request().method()))return route.abort();return route.continue();});
 try{for(const job of jobs){const page=await ctx.newPage();try{
 const response=await page.goto(origin+job.route,{waitUntil:'load',timeout:30000});if(response.status()!==200)throw Error('HTTP '+response.status());
 await page.evaluate(()=>document.fonts.ready); await page.addStyleTag({content:'html,body{scroll-behavior:auto!important}*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important}'});
 await page.waitForTimeout(500);
 const observedTheme=await page.evaluate(()=>({stored:localStorage.getItem('vs_theme'),root:document.documentElement.dataset.theme,body:document.body.dataset.theme}));if(Object.values(observedTheme).some(x=>x!==theme))throw Error('theme '+JSON.stringify(observedTheme));
 if(await page.locator('body').innerText().then(t=>t.length)<200)throw Error('blank content');
 const focus=page.locator(job.selector);const count=await focus.count();if(phase==='before'&&job.beforeExpected==='absent'){if(count!==0)throw Error('baseline satire unexpectedly present');absence.push({route:job.route,state:job.state,theme,viewport:viewport.name,observedTheme,observed:'absent'});continue;}if(count!==1)throw Error('selector count '+count+' '+job.selector);
 await focus.scrollIntoViewIfNeeded();
 if(job.open){const details=focus.locator(job.open);await details.locator('summary').click();if(!await details.evaluate(e=>e.open))throw Error('details failed open'); const comments=details.locator('.desk-comments');await comments.scrollIntoViewIfNeeded();await comments.locator('.desk-comments-status').waitFor({state:'visible',timeout:10000});await page.waitForFunction(e=>e.innerText.includes('Comments are not available yet.'),await comments.elementHandle(),{timeout:10000});}
 await focus.locator('img').evaluateAll(async images=>{await Promise.all(images.map(async image=>{image.loading='eager';await Promise.race([image.decode(),new Promise((_,reject)=>setTimeout(()=>reject(Error('image decode timeout')),10000))]);if(!image.naturalWidth)throw Error('empty image');}));});
 await page.waitForTimeout(350);await focus.scrollIntoViewIfNeeded();
 const assets=await page.evaluate(()=>[...document.querySelectorAll('script[src],link[rel=stylesheet][href],img,source[srcset]')].flatMap(e=>[e.src,e.href,...(e.srcset||'').split(',').map(s=>s.trim().split(' ')[0])]).filter(Boolean));for(const u of assets){try{const url=new URL(u,origin);if(url.origin===origin&&fs.existsSync(path.join(root,url.pathname.slice(1))))sourceFiles.add(url.pathname.slice(1));}catch{}}
 const file=`s395-${phase}-${job.group}-${job.state}-${theme}-${viewport.name}.png`;if(job.group==='related'){await focus.screenshot({path:path.join(out,file),animations:'disabled',timeout:30000});}else{await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(100);const box=await focus.boundingBox();if(!box||box.width<20||box.height<20)throw Error('empty focused bounds');await page.screenshot({path:path.join(out,file),clip:{x:Math.max(0,box.x),y:Math.max(0,box.y),width:box.width,height:box.height},fullPage:true,captureBeyondViewport:true,animations:'disabled',timeout:30000});}
 const overflow=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
 shots.push({route:job.route,page:job.route,state:job.state,group:job.group,theme,viewportName:viewport.name,viewport,observedTheme,file,sha256:sha(fs.readFileSync(path.join(out,file))),overflow,inspection:{mode:'automated-only'}});console.log(file);
 }catch(e){failures.push({theme,viewport:viewport.name,state:job.state,error:e.message});console.error('FAIL',JSON.stringify(failures.at(-1)));}finally{await page.close();}}
 }finally{await ctx.close();}
 }}finally{await browser.close();await new Promise(r=>server.close(r));}
for(const f of fs.readdirSync(path.join(root,'assets/og/news')))if(f.includes('2026-10-21--openais-agents-disabled-their-own-safety-monitoring-systems'))sourceFiles.add('assets/og/news/'+f);
const source=sourceBinding(root,[...sourceFiles].filter(f=>fs.existsSync(path.join(root,f))));
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({phase,capturedAt:new Date().toISOString(),source,candidate:candidateBinding(root),shots,absence,failures,browserTerminated:true},null,2));console.log(JSON.stringify({phase,shots:shots.length,absence:absence.length,failures:failures.length,browserTerminated:true}));if(failures.length)process.exitCode=1;
