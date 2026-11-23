import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {planScrollTiles,validateScrollTileMeasurement,validateScrollTileCoverage,scrollTileLayoutKey,measureScrollTileOcclusion,serializeScrollTileState} from '../scripts/capture-theme-matrix.mjs';
import {validateReceipt} from '../scripts/check-visual-review-receipt.mjs';
const clone=value=>JSON.parse(JSON.stringify(value));
function fixture(){
 const plan=planScrollTiles(2500,900,1366),capturePlan={mode:'scroll-tiles-v1',routes:['/studio/'],themes:['dark'],viewports:['desktop'],cases:[{route:'/studio/',theme:'dark',viewport:'desktop',plan}]};
 const shots=plan.offsets.map((offset,index)=>({page:'/studio/',theme:'dark',viewportName:'desktop',viewport:{name:'desktop',width:1366,height:900},state:'scroll-tile',tileIndex:index,plannedOffset:offset,scroll:{scrollY:offset,documentHeight:2500,viewportHeight:900,viewportWidth:1366,scrollWidth:1366},file:`tile-y${offset}.png`,sha256:'a'.repeat(64),inspection:{mode:'automated-only'}}));
 const receipt={schemaVersion:1,inspectionSchemaVersion:2,source:{files:['source'],sha256:'a'.repeat(64)},matrix:{routes:['/studio/'],themes:['dark'],viewports:[{name:'desktop'}],states:['scroll-tile'],coverageMode:'scroll-tiles-v1',capturePlan,plannedCases:1,expectedCaptures:4,completedCaptures:4},captures:shots,inspection:{renderedPixelsReviewed:false,blockingDefectsOpen:null,coverage:{totalCaptures:4,manuallyReviewed:0,automatedOnly:4,complete:false}}};
 return{plan,capturePlan,shots,receipt};
}
test('adaptive plan reaches exact bottom with at least200px overlap and bounded geometry',()=>{
 assert.deepEqual(planScrollTiles(2500,900,1366).offsets,[0,700,1400,1600]);assert.deepEqual(planScrollTiles(844,844,390).offsets,[0]);assert.deepEqual(planScrollTiles(300,844,390).offsets,[0]);
 for(const args of [[100001,900,1366],[2500,200,390],[0,900,1366],[2500.5,900,1366],[2500,900,0]])assert.throws(()=>planScrollTiles(...args));
});
test('truthful adaptive receipt admits planned offsets and does not pretend to be Cartesian images',()=>{
 const f=fixture();assert.deepEqual(validateScrollTileCoverage(f.capturePlan,f.shots),{plannedCaptures:4,completedCaptures:4,plannedCases:1});assert.deepEqual(validateReceipt(f.receipt),[]);
});
test('gaps, missing bottom, duplicate or reordered tiles and reduced overlap refuse',()=>{
 for(const mutate of [f=>f.shots.splice(1,1),f=>f.shots.pop(),f=>f.shots.push(clone(f.shots[0])),f=>f.shots.reverse(),f=>f.shots[1].scroll.scrollY+=2,f=>f.shots.at(-1).scroll.scrollY-=1]){
  const f=fixture();mutate(f);assert.throws(()=>validateScrollTileCoverage(f.capturePlan,f.shots));
 }
});
test('height drift above2px, horizontal overflow and changed viewport refuse; small stable shrink can reach actual bottom',()=>{
 const f=fixture(),measurement=clone(f.shots[0].scroll);
 for(const delta of [{documentHeight:2503},{viewportHeight:899},{viewportWidth:1365},{scrollWidth:1368},{scrollY:3}])assert.throws(()=>validateScrollTileMeasurement(f.plan,{...measurement,...delta},0));
 f.shots.at(-1).scroll.documentHeight=2498;f.shots.at(-1).scroll.scrollY=1598;assert.doesNotThrow(()=>validateScrollTileCoverage(f.capturePlan,f.shots));
});
test('the separately declared case matrix prevents pruning a whole route/theme or rewriting expected captures',()=>{
 for(const mutate of [f=>f.capturePlan.themes.push('light'),f=>f.capturePlan.cases=[],f=>f.capturePlan.cases.push(clone(f.capturePlan.cases[0])),f=>f.capturePlan.cases[0].plan.offsets.pop()]){
  const f=fixture();mutate(f);assert.throws(()=>validateScrollTileCoverage(f.capturePlan,f.shots));
 }
 const f=fixture();f.receipt.matrix.expectedCaptures=1;assert.ok(validateReceipt(f.receipt).length);delete f.receipt.matrix.coverageMode;assert.ok(validateReceipt(f.receipt).length);
});
test('original Cartesian opening-only receipt remains accepted',()=>{
 const f=fixture(),capture={...f.shots[0],state:'page'};
 const receipt={...f.receipt,captures:[capture],matrix:{routes:['/studio/'],themes:['dark'],viewports:[{name:'desktop'}],states:['page'],expectedCaptures:1,completedCaptures:1},inspection:{renderedPixelsReviewed:false,blockingDefectsOpen:null,coverage:{totalCaptures:1,manuallyReviewed:0,automatedOnly:1,complete:false}}};
 assert.deepEqual(validateReceipt(receipt),[]);
});
test('scroll mode is explicit, exclusive, actual-viewport only and sealed with its prior plan',()=>{
 const source=fs.readFileSync('scripts/capture-theme-matrix.mjs','utf8');
 assert.match(source,/SCROLL_TILES && \(FULL_PAGE \|\| OPEN_NAV/);assert.match(source,/fullPage: false/);assert.match(source,/state: 'scroll-tile'/);assert.match(source,/scroll-tile-y\$\{scroll.scrollY\}/);assert.match(source,/capturePlan \? \{ capturePlan \}/);
});

// Occlusion-aware visible-content coverage regressions.
function occlusionFixture(top=79,bottom=125.42){
 const plan=planScrollTiles(6000,844,390,{top,bottom});
 const shots=plan.offsets.map((y,i)=>{const scroll={scrollY:y,documentHeight:6000,viewportHeight:844,viewportWidth:390,scrollWidth:390,occlusion:{top,bottom}};return{route:'/',theme:'dark',viewport:'mobile',state:'scroll-tile',tileIndex:i,plannedOffset:y,scroll,afterScroll:clone(scroll)};});
 return{plan,shots,capturePlan:{mode:'scroll-tiles-v1',routes:['/'],themes:['dark'],viewports:['mobile'],cases:[{route:'/',theme:'dark',viewport:'mobile',plan}]}};
}
test('original plan has byte-identical legacy geometry; measured zero is explicitly new mode',()=>{
 assert.equal(JSON.stringify(planScrollTiles(2500,900,1366)),JSON.stringify({documentHeight:2500,viewportHeight:900,viewportWidth:1366,overlap:200,offsets:[0,700,1400,1600]}));
 assert.deepEqual(planScrollTiles(2500,900,1366,{top:0,bottom:0}).offsets,[0,700,1400,1600]);
 assert.ok('occlusion' in planScrollTiles(2500,900,1366,{top:0,bottom:0}));
});
test('real measured79px header plus125.42px CTA would leave4.42px physical gap in legacy plan',()=>{
 const old=planScrollTiles(6000,844,390);assert.equal(old.offsets[1],644);
 assert.ok(Math.abs((844-125.42)-(644+79)+4.42)<0.000001);
 const f=occlusionFixture();assert.equal(f.plan.overlap,405);assert.equal(f.plan.offsets[1],439);
 assert.equal(f.plan.contentOverlap,200);assert.equal(f.plan.offsets.at(-1),5156);
 assert.doesNotThrow(()=>validateScrollTileCoverage(f.capturePlan,f.shots));
 for(let i=1;i<f.shots.length;i++)assert.ok(f.shots[i-1].scroll.scrollY+844-125.42-(f.shots[i].scroll.scrollY+79)>=200);
});
test('variable viewport, top, bottom, and final remainder retain at least200px visible content overlap',()=>{
 for(const vh of [600,844,900,1080])for(const top of [0,50.2,79,130.9])for(const bottom of [0,48,125.42,180.1])for(const h of [vh,vh+1,2500,9000]){
  const p=planScrollTiles(h,vh,390,{top,bottom});assert.equal(p.offsets[0],0);assert.equal(p.offsets.at(-1),Math.max(0,h-vh));
  for(let i=1;i<p.offsets.length;i++)assert.ok(p.offsets[i-1]+vh-bottom-(p.offsets[i]+top)>=200);
 }
});
test('bad geometry, no remaining step, negative/nonfinite bounds and capture overflow refuse',()=>{
 for(const o of [null,{}, {top:-1,bottom:0},{top:0,bottom:NaN},{top:Infinity,bottom:0},{top:400,bottom:244}])assert.throws(()=>planScrollTiles(6000,844,390,o));
 assert.throws(()=>planScrollTiles(100000,844,390,{top:300,bottom:300}));
});
test('bounds growth on either side before/after screenshot, missing measurement, hidden physical gap and old drift negatives refuse',()=>{
 for(const mutate of [f=>f.shots[1].scroll.occlusion.top=80,f=>f.shots[1].afterScroll.occlusion.bottom=127,f=>delete f.shots[1].afterScroll,f=>delete f.shots[1].scroll.occlusion,f=>f.shots[1].scroll.scrollY+=2,f=>f.shots[1].scroll.documentHeight+=3,f=>f.shots[1].scroll.scrollWidth+=2,f=>f.shots.pop(),f=>f.plan.overlap=200]){
  const f=occlusionFixture();mutate(f);assert.throws(()=>validateScrollTileCoverage(f.capturePlan,f.shots));
 }
 const f=occlusionFixture();assert.throws(()=>validateScrollTileMeasurement(f.plan,{...f.shots[0].scroll,occlusion:{top:79.01,bottom:125.42}},0));
});
test('layout stability ignores animated overlay rectangles while every actual layout coordinate still resets it',()=>{
 const m=occlusionFixture().shots[0].scroll,key=scrollTileLayoutKey(m);
 assert.equal(scrollTileLayoutKey({...m,occlusion:{top:79.4,bottom:126,sources:[{top:78.9}]}}),key);
 for(const field of ['scrollY','documentHeight','viewportHeight','viewportWidth','scrollWidth'])assert.notEqual(scrollTileLayoutKey({...m,[field]:m[field]+1}),key);
 const f=occlusionFixture();assert.throws(()=>validateScrollTileMeasurement(f.plan,{...m,occlusion:{top:80,bottom:125.42}},0));
});
test('actual publication projection JSON roundtrip retains after-capture measurement; missing or tampered evidence refuses, legacy projection unchanged',()=>{
 const f=occlusionFixture(),captures=f.shots.map((shot,i)=>({page:shot.route,theme:shot.theme,viewportName:shot.viewport,viewport:{name:'mobile',width:390,height:844},state:'scroll-tile',...serializeScrollTileState(shot),file:`tile-${i}.png`,sha256:'a'.repeat(64),inspection:{mode:'automated-only'}}));
 const n=captures.length,receipt={schemaVersion:1,inspectionSchemaVersion:2,source:{files:['source'],sha256:'a'.repeat(64)},matrix:{routes:['/'],themes:['dark'],viewports:[{name:'mobile'}],states:['scroll-tile'],coverageMode:'scroll-tiles-v1',capturePlan:f.capturePlan,plannedCases:1,expectedCaptures:n,completedCaptures:n},captures,inspection:{renderedPixelsReviewed:false,blockingDefectsOpen:null,coverage:{totalCaptures:n,manuallyReviewed:0,automatedOnly:n,complete:false}}};
 const serialized=JSON.parse(JSON.stringify(receipt));assert.deepEqual(validateReceipt(serialized),[]);assert.equal(validateScrollTileCoverage(serialized.matrix.capturePlan,serialized.captures).completedCaptures,n);assert.deepEqual(serialized.captures[1].afterScroll,f.shots[1].afterScroll);
 for(const mutate of [r=>delete r.captures[1].afterScroll,r=>r.captures[1].afterScroll.occlusion.top=80,r=>r.captures[1].afterScroll.documentHeight+=3,r=>r.captures[1].afterScroll.scrollY+=1]){
  const bad=JSON.parse(JSON.stringify(receipt));mutate(bad);assert.notDeepEqual(validateReceipt(bad),[]);assert.throws(()=>validateScrollTileCoverage(bad.matrix.capturePlan,bad.captures));
 }
 const legacy={tileIndex:0,plannedOffset:0,scroll:{scrollY:0},unrelated:'not published'};assert.deepEqual(serializeScrollTileState(legacy),{tileIndex:0,plannedOffset:0,scroll:{scrollY:0}});
});

test('only physically pinned fixed/sticky sources are measured; visible overflow retained and clipped children excluded in a real browser',async()=>{
 const {chromium}=await import('playwright');const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('**/*',r=>r.abort());
  await page.setContent(`<style>body{margin:0}header{position:sticky;top:0;height:79px;background:black}header span{position:absolute;top:70px;height:35px;width:100px;background:red}.ordinary{height:2000px}.flow{height:300px}.cta{position:fixed;bottom:0;height:125.42px;width:100%;background:blue}.hidden{display:none;position:fixed;inset:0}.clip{position:fixed;top:0;height:20px;overflow:hidden;width:20px}.clip i{display:block;height:400px}.notstuck{position:sticky;top:0;height:250px}</style><header><span>wire</span></header><div class=flow>ordinary nonsticky content</div><section class=notstuck>not pinned yet</section><div class=ordinary></div><div class=cta>CTA</div><div class=hidden>hidden drawer</div><div class=clip><i>clipped</i></div>`);
  let value=await page.evaluate(measureScrollTileOcclusion);assert.equal(value.top,105);assert.ok(Math.abs(value.bottom-125.42)<0.02);assert.equal(value.sources.length,3);
  await page.evaluate(()=>scrollTo(0,800));value=await page.evaluate(measureScrollTileOcclusion);assert.equal(value.top,250);assert.ok(value.sources.some(r=>r.position==='sticky'&&r.top===250));
  await page.evaluate(()=>document.querySelector('header span').style.display='none');
  await page.evaluate(()=>scrollTo(0,0));value=await page.evaluate(measureScrollTileOcclusion);assert.equal(value.top,79);
 }finally{await browser.close();}
});
