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

import {settleCaptureAnimations,validateRasterAnimationState} from '../scripts/lib/capture-animation-state.mjs';
async function animationFixture(run){
 const names=['Element','document','innerHeight','innerWidth','getComputedStyle','requestAnimationFrame','DocumentTimeline','ScrollTimeline','ViewTimeline','CSSUnitValue','scrollX','scrollY'],saved=names.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]);
 class FakeDocumentTimeline{};class FakeCSSUnitValue{constructor(value,unit='percent'){this.value=value;this.unit=unit;}}class FakeScrollTimeline{constructor(source){this.source=source;this.axis='block';this.currentTime=new FakeCSSUnitValue(25);}}class FakeViewTimeline extends FakeScrollTimeline{constructor(source){super(source);this.subject=source;}};
 class FakeElement{constructor(){this.tagName='SPAN';this.className='actual-orb';this.id='';this.parentElement=null;}get ownerDocument(){return document;}get isConnected(){return true;}getRootNode(){return document;}scrollTop=375;scrollLeft=0;scrollHeight=2400;scrollWidth=1366;clientHeight=900;clientWidth=1366;getBoundingClientRect(){return{width:40,height:40,top:700,bottom:740,left:100,right:140};}}
 let animations=[];const calls={pause:0,finish:0},element=new FakeElement();
 const animation=(finite=false)=>{const a={timeline:new FakeDocumentTimeline(),animationName:finite?'entry':'float',currentTime:167,playState:'running',effect:{target:element,getComputedTiming:()=>({iterations:finite?1:Infinity,duration:finite?500:4600,endTime:finite?500:Infinity})},ready:Promise.resolve(),pause(){calls.pause++;this.playState='paused';},finish(){calls.finish++;throw Error('Seeking/finishing forbidden');}};a.finished=finite?new Promise(resolve=>setTimeout(()=>{a.playState='finished';a.currentTime=500;resolve();},20)):new Promise(()=>{});return a;};
 Object.assign(globalThis,{Element:FakeElement,DocumentTimeline:FakeDocumentTimeline,ScrollTimeline:FakeScrollTimeline,ViewTimeline:FakeViewTimeline,CSSUnitValue:FakeCSSUnitValue,scrollX:0,scrollY:375,document:{getAnimations:()=>animations,documentElement:element,scrollingElement:element},innerHeight:900,innerWidth:1366,getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1',writingMode:'horizontal-tb',direction:'ltr'}),requestAnimationFrame:fn=>setImmediate(fn)});
 try{return await run({animation,set:list=>animations=list,calls,element});}finally{for(const[k,d]of saved)if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}
}
test('animation capture naturally finishes finite entrance before pausing actual infinite phase without seek or DOM writes',()=>animationFixture(async f=>{const finite=f.animation(true),infinite=f.animation();f.set([finite,infinite]);const result=await settleCaptureAnimations();assert.equal(finite.playState,'finished');assert.equal(f.calls.finish,0);assert.equal(f.calls.pause,1);assert.equal(infinite.currentTime,167);assert.equal(result.animations[0].pausedTime,167);assert.equal(result.finiteSettled[0].time,500);assert.equal(result.cssChanged,false);assert.equal(result.screenshotAnimations,'allow');assert.equal(f.element.className,'actual-orb');}));
test('animation capture finite timeout/paused/unknown state refuses instead of dim mid-entry fixture acceptance',()=>animationFixture(async f=>{for(const kind of ['timeout','paused','unknown']){const a=f.animation();a.effect.getComputedTiming=()=>({iterations:1,duration:500,endTime:kind==='unknown'?Infinity:500});a.playState=kind==='paused'?'paused':'running';a.finished=new Promise(()=>{});f.set([a]);await assert.rejects(settleCaptureAnimations({timeoutMs:20}),/settle|deadline/);}assert.equal(f.calls.pause,0);}));
test('animation capture rechecks newly visible finite entrances and bounds unknown infinite effects',()=>animationFixture(async f=>{const a=f.animation(true),b=f.animation(true);let readyB;const delayed=new Promise(r=>readyB=r);b.finished=delayed;const done=a.finished;a.finished=done.then(()=>{f.set([a,b]);setTimeout(()=>{b.playState='finished';b.currentTime=500;readyB();},15);});f.set([a]);const result=await settleCaptureAnimations();assert.equal(result.finiteSettled.length,2);assert.equal(f.calls.pause,0);const infinite=f.animation();infinite.effect.getComputedTiming=()=>({iterations:Infinity,duration:Infinity,endTime:Infinity});f.set([infinite]);await assert.rejects(settleCaptureAnimations(),/unknown/);}));
test('animation capture rejects new animation after pause/RAF instead of claiming it stabilized',()=>animationFixture(async f=>{const a=f.animation();f.set([a]);let frames=0;globalThis.requestAnimationFrame=fn=>setImmediate(()=>{if(++frames===2)f.set([a,f.animation()]);fn();});await assert.rejects(settleCaptureAnimations(),/New\/unsettled/);}));

test('animation capture waits for viewport finite fade at ownopacityzero rather than accepting an invisible entry',()=>animationFixture(async f=>{const a=f.animation(true);f.set([a]);globalThis.getComputedStyle=()=>({display:'block',visibility:'visible',opacity:'0'});const result=await settleCaptureAnimations();assert.equal(a.playState,'finished');assert.equal(result.finiteSettled.length,1);assert.equal(f.calls.pause,0);}));

function nativeScrollFixture(f,{view=false}={}){const a=f.animation();a.timeline=view?new ViewTimeline(f.element):new ScrollTimeline(f.element);a.currentTime=new CSSUnitValue(25,'percent');a.effect.getComputedTiming=()=>({iterations:1,duration:new CSSUnitValue(100,'percent'),endTime:new CSSUnitValue(100,'percent'),progress:.25});a.pause=()=>{throw Error('Native scroll timeline must NEVER pause');};f.set([a]);return a;}
test('native ScrollTimeline and ViewTimeline percentages observe real sourceaxis without any pause/finish/seek',()=>animationFixture(async f=>{for(const view of [false,true]){const a=nativeScrollFixture(f,{view}),before=a.currentTime.value,result=await settleCaptureAnimations();assert.equal(result.scrollDriven.length,1);assert.equal(result.scrollDriven[0].nativeTimeline,view?'ViewTimeline':'ScrollTimeline');assert.equal(result.scrollDriven[0].source.key,'document.scrollingElement');assert.equal(result.scrollDriven[0].axis,'block');assert.equal(result.scrollDriven[0].animationTime.value,25);assert.equal(result.animations.length,0);assert.equal(a.currentTime.value,before);assert.equal(a.playState,'running');assert.equal(f.calls.finish,0);}}));
test('typedpercent lookalikes, wrongunit/nonfinite/null time, missing source/axis and unknowntimeline refuse',()=>animationFixture(async f=>{for(const mutate of [a=>a.currentTime={unit:'percent',value:25},a=>a.currentTime=new CSSUnitValue(25,'ms'),a=>a.currentTime=new CSSUnitValue(Infinity,'percent'),a=>a.currentTime=null,a=>a.timeline.source=null,a=>a.timeline.axis='unknown',a=>a.timeline={constructor:{name:'ScrollTimeline'}},a=>a.effect.getComputedTiming=()=>({iterations:1,duration:{unit:'percent',value:100},endTime:new CSSUnitValue(100),progress:.25})]){const a=nativeScrollFixture(f);mutate(a);await assert.rejects(settleCaptureAnimations(),/native|timeline/i);}}));
test('native scroll source geometry and progress changes between RAF samples failclosed',()=>animationFixture(async f=>{for(const field of ['time','source','set']){const a=nativeScrollFixture(f);let frames=0;globalThis.requestAnimationFrame=fn=>setImmediate(()=>{if(++frames===4){if(field==='time')a.currentTime=new CSSUnitValue(26);if(field==='source')f.element.scrollTop++;if(field==='set')f.set([a,f.animation()]);}fn();});await assert.rejects(settleCaptureAnimations(),/changed|did not settle/);}}));
test('mixed native scroll observer still naturally finishes DocumentTimeline finite entrances and pauses only document loops',()=>animationFixture(async f=>{const scroll=nativeScrollFixture(f),finite=f.animation(true),loop=f.animation();f.set([scroll,finite,loop]);const result=await settleCaptureAnimations();assert.equal(finite.playState,'finished');assert.equal(loop.playState,'paused');assert.equal(scroll.playState,'running');assert.equal(result.scrollDriven.length,1);assert.equal(result.finiteSettled.length,1);assert.equal(f.calls.pause,1);}));
test('perraster source/progress/typedtime identity check rejects missing/new or changing native state; old no-state receipts unchanged',()=>{const value={animationCaptureState:{scrollDriven:[{nativeTimeline:'ScrollTimeline',axis:'block',source:{key:'document.scrollingElement',geometry:{scrollTop:375}},animationTime:{unit:'percent',value:25}}]}};assert.doesNotThrow(()=>validateRasterAnimationState(value,structuredClone(value)));assert.doesNotThrow(()=>validateRasterAnimationState({},{}));for(const change of [x=>x.animationCaptureState.scrollDriven[0].animationTime.value++,x=>x.animationCaptureState.scrollDriven[0].source.key='other',x=>x.animationCaptureState.scrollDriven[0].source.geometry.scrollTop++,x=>delete x.animationCaptureState.scrollDriven,x=>x.animationCaptureState.scrollDriven.push({})]){const after=structuredClone(value);change(after);assert.throws(()=>validateRasterAnimationState(value,after),/changed/);}});

function inactiveNativeFixture(f,{view=false}={}){const a=nativeScrollFixture(f,{view});f.element.scrollHeight=f.element.clientHeight;f.element.scrollTop=0;a.currentTime=null;a.timeline.currentTime=null;a.effect.getComputedTiming=()=>({iterations:1,duration:new CSSUnitValue(100),endTime:new CSSUnitValue(100),progress:null,localTime:null,currentIteration:null});return a;}

test('recognized inactive native timelines record exact zero-range and null state without manufactured percentage or pause',()=>animationFixture(async f=>{for(const view of [false,true]){const a=inactiveNativeFixture(f,{view});const result=await settleCaptureAnimations();const r=result.scrollDriven[0];assert.equal(r.nativeState,'inactive-zero-scroll-range');assert.equal(r.extent,0);assert.equal(r.animationTime,null);assert.equal(r.timelineTime,null);assert.equal(r.progress,null);assert.equal(r.source.geometry.scrollHeight,r.source.geometry.clientHeight);assert.equal(r.axis,'block');assert.equal(a.playState,'running');assert.equal(f.calls.pause,0);assert.equal(f.calls.finish,0);assert.doesNotThrow(()=>validateRasterAnimationState({animationCaptureState:result},{animationCaptureState:structuredClone(result)}));}}));

test('inactive native mismatched nonnull time/progress, nonzero or negative range, unknown brand/source/axis still refuse',()=>animationFixture(async f=>{for(const mutate of [a=>a.currentTime=new CSSUnitValue(0),a=>a.timeline.currentTime=new CSSUnitValue(0),a=>a.effect.getComputedTiming=()=>({iterations:1,duration:new CSSUnitValue(100),endTime:new CSSUnitValue(100),progress:0,localTime:null,currentIteration:null}),a=>a.effect.getComputedTiming=()=>({iterations:1,duration:new CSSUnitValue(100),endTime:new CSSUnitValue(100),progress:null,localTime:0,currentIteration:null}),a=>f.element.scrollHeight++,a=>f.element.scrollHeight--,a=>a.timeline={constructor:{name:'ScrollTimeline'},source:f.element,axis:'block',currentTime:null},a=>a.timeline.source=null,a=>a.timeline.axis='unknown']){const a=inactiveNativeFixture(f);mutate(a);await assert.rejects(settleCaptureAnimations(),/native|timeline/i);}}));

test('inactive-to-active during RAF and any raster inactive state/source/subject geometry change refuse',()=>animationFixture(async f=>{const a=inactiveNativeFixture(f,{view:true});let frames=0;globalThis.requestAnimationFrame=fn=>setImmediate(()=>{if(++frames===4)f.element.scrollHeight++;fn();});await assert.rejects(settleCaptureAnimations(),/native|settle/i);globalThis.requestAnimationFrame=fn=>setImmediate(fn);inactiveNativeFixture(f,{view:true});const state=await settleCaptureAnimations();for(const change of [s=>s.scrollDriven[0].nativeState='active',s=>s.scrollDriven[0].animationTime={unit:'percent',value:0},s=>s.scrollDriven[0].timelineTime={unit:'percent',value:0},s=>s.scrollDriven[0].progress=0,s=>s.scrollDriven[0].source.geometry.scrollHeight++,s=>s.scrollDriven[0].subject.geometry.rect.top++,s=>s.scrollDriven[0].axis='inline']){const after=structuredClone(state);change(after);assert.throws(()=>validateRasterAnimationState({animationCaptureState:state},{animationCaptureState:after}),/changed/);}}));


test('late finite observer-style RAF entrance defaults to refusal but before-raster opt-in naturally completes',()=>animationFixture(async f=>{
 for(const allow of [false,true]){const loop=f.animation();f.set([loop]);let frames=0,late;globalThis.requestAnimationFrame=fn=>setImmediate(()=>{if(++frames===2){late=f.animation(true);f.set([loop,late]);}fn();});
 if(!allow)await assert.rejects(settleCaptureAnimations(),/New\/unsettled/);else{const result=await settleCaptureAnimations({resettleLateFinite:true});assert.equal(late.playState,'finished');assert.ok(result.finiteSettled.some(r=>r.name==='entry'));assert.equal(f.calls.finish,0);assert.equal(loop.currentTime,167);}
 }
}));
test('before-raster resettlement remains deadline bounded and refuses late loops or paused finite',()=>animationFixture(async f=>{
 for(const type of ['loop','paused','never']){const loop=f.animation();f.set([loop]);let frames=0;globalThis.requestAnimationFrame=fn=>setImmediate(()=>{if(++frames===2){const late=f.animation(type!=='loop');if(type==='paused')late.playState='paused';if(type==='never')late.finished=new Promise(()=>{});f.set([loop,late]);}fn();});await assert.rejects(settleCaptureAnimations({timeoutMs:50,resettleLateFinite:true}),/New\/unsettled|cannot naturally|deadline/);}
}));

test('late finite second observation-frame appearance completes only with before-raster opt-in',()=>animationFixture(async f=>{
 for(const allow of [false,true]){
  const loop=f.animation();f.set([loop]);let frames=0,late;
  globalThis.requestAnimationFrame=fn=>setImmediate(()=>{if(++frames===4){late=f.animation(true);f.set([loop,late]);}fn();});
  if(!allow)await assert.rejects(settleCaptureAnimations(),/Visible animation set changed/);
  else{const result=await settleCaptureAnimations({resettleLateFinite:true});assert.equal(late.playState,'finished');assert.equal(result.finiteSettled.length,1);assert.equal(f.calls.finish,0);assert.equal(loop.currentTime,167);}
 }
}));
test('late finite cannot mask native scroll progress change at the second observation seam',()=>animationFixture(async f=>{
 const scroll=nativeScrollFixture(f);let frames=0;
 globalThis.requestAnimationFrame=fn=>setImmediate(()=>{if(++frames===4){scroll.currentTime=new CSSUnitValue(26);f.set([scroll,f.animation(true)]);}fn();});
 await assert.rejects(settleCaptureAnimations({resettleLateFinite:true}),/Native scroll progress/);
}));

test('real IntersectionObserver callback can create a late CSS entrance during capture RAF settlement',async()=>{
 const {chromium}=await import('playwright');
 const browser=await chromium.launch({headless:true});
 try{
  for(const appearanceFrame of [2,4])for(const resettleLateFinite of [false,true]){
   const page=await browser.newPage({viewport:{width:1366,height:900}});
   await page.route('**/*',route=>route.abort());
   await page.setContent(`<style>@keyframes entry{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}#target{width:300px;height:100px;background:#111;color:white}.revealed{animation:entry 120ms linear both}</style><section id="target">Real observer entrance</section>`);
   await page.evaluate(()=>{
    window.observerEvents=[];
    let release;
    const gate=new Promise(resolve=>release=resolve);
    const observer=new IntersectionObserver(async entries=>{
     if(!entries.some(entry=>entry.isIntersecting))return;
     observer.disconnect();window.observerEvents.push('actual-intersection');
     await gate;
     document.querySelector('#target').classList.add('revealed');
     window.observerEvents.push('actual-class-created');
    });
    observer.observe(document.querySelector('#target'));
    window.armLateEntrance=appearanceFrame=>{
     const nativeRAF=requestAnimationFrame.bind(window);let frames=0;
     window.requestAnimationFrame=callback=>nativeRAF(time=>{
      if(++frames===appearanceFrame)release();
      callback(time);
     });
    };
   });
   await page.waitForFunction(()=>window.observerEvents.includes('actual-intersection'));
   await page.evaluate(frame=>window.armLateEntrance(frame),appearanceFrame);
   if(!resettleLateFinite)await assert.rejects(page.evaluate(settleCaptureAnimations),/New\/unsettled|Visible animation set changed/);
   else{
    const state=await page.evaluate(settleCaptureAnimations,{resettleLateFinite:true});
    assert.ok(state.finiteSettled.some(row=>row.name==='entry'));
    assert.equal(state.seeked,false);assert.equal(state.cssChanged,false);
    assert.deepEqual(await page.evaluate(()=>window.observerEvents),['actual-intersection','actual-class-created']);
    assert.equal(await page.locator('#target').evaluate(node=>getComputedStyle(node).opacity),'1');
   }
   await page.close();
  }
 }finally{await browser.close();}
});

test('integrated inactive native state survives natural late finite settlement at either admitted before-raster seam',()=>animationFixture(async f=>{
 for(const seam of [2,4]){const scroll=inactiveNativeFixture(f),loop=f.animation();f.set([scroll,loop]);let frames=0,late;globalThis.requestAnimationFrame=fn=>setImmediate(()=>{if(++frames===seam){late=f.animation(true);f.set([scroll,loop,late]);}fn();});const result=await settleCaptureAnimations({resettleLateFinite:true});assert.equal(late.playState,'finished');assert.equal(result.scrollDriven[0].nativeState,'inactive-zero-scroll-range');assert.equal(result.scrollDriven[0].timelineTime,null);assert.equal(scroll.playState,'running');assert.equal(loop.playState,'paused');assert.equal(f.calls.finish,0);}
}));

test('integrated late finite never masks inactive native transition at either observation seam',()=>animationFixture(async f=>{
 for(const seam of [2,4]){const scroll=inactiveNativeFixture(f);let frames=0;globalThis.requestAnimationFrame=fn=>setImmediate(()=>{if(++frames===seam){f.element.scrollHeight++;f.set([scroll,f.animation(true)]);}fn();});await assert.rejects(settleCaptureAnimations({resettleLateFinite:true}),/native/i);}
}));

// Reserved grid-column exposure and fixed-point preplanning owner regressions.
import {validateReservedColumnCoverage,validateReservedColumnGeometry,intersectReservedMeasurements,closeScrollTilePlan} from '../scripts/capture-theme-matrix.mjs';
const column={key:'grid-1-child-1',left:983,right:1283,height:975.171875,peerLeft:83,peerRight:943};
const exposure=(a,b)=>[{...column,exposedStart:a,exposedEnd:b}];
test('actual measured disjoint Devlog columns require all975.171875px rather than wholeviewport900 top',()=>{
 assert.doesNotThrow(()=>validateReservedColumnCoverage([column],[exposure(0,492),exposure(15,734.58),exposure(600,975.171875)]));
 assert.throws(()=>validateReservedColumnCoverage([column],[exposure(0,492),exposure(15,734.58)]),/bottom/);
 assert.throws(()=>validateReservedColumnCoverage([column],[exposure(0,492),exposure(493,975.171875)]),/unexposed/);
});
test('column overlap, changed x bounds, height, missing and duplicate inventory cannot waive occlusion',()=>{
 for(const mutate of [x=>x[0].left=942,x=>x[0].right++,x=>x[0].height++,x=>x.pop(),x=>x.push(clone(x[0]))]){const x=exposure(0,column.height);mutate(x);assert.throws(()=>validateReservedColumnGeometry([column],x));}
});
test('before/after intersection exposes only pixels visible throughout the raster boundary',()=>{
 assert.equal(intersectReservedMeasurements(exposure(0,600),exposure(40,650))[0].exposedStart,40);
 assert.throws(()=>validateReservedColumnCoverage([column],[intersectReservedMeasurements(exposure(0,975.171875),exposure(1,975.171875))]),/unexposed/);
});
function reservedColumnFixture(){
 const plan=planScrollTiles(2500,900,1366,{top:115,bottom:65.421875,reservedColumns:[column],witnessOffsets:[0,700,1400,1600]});
 const shots=plan.offsets.map((y,i)=>{const scroll={scrollY:y,documentHeight:2500,viewportHeight:900,viewportWidth:1366,scrollWidth:1366,occlusion:{top:115,bottom:65.421875,reservedColumns:y===0?exposure(0,600):exposure(500,975.171875)}};return{route:'/devlog/',theme:'dark',viewport:'desktop',state:'scroll-tile',tileIndex:i,plannedOffset:y,scroll,afterScroll:clone(scroll)};});
 return {plan,shots,capturePlan:{mode:'scroll-tiles-v1',routes:['/devlog/'],themes:['dark'],viewports:['desktop'],cases:[{route:'/devlog/',theme:'dark',viewport:'desktop',plan}]}};
}
test('witness offsets are planned before capture; actual JSON serialization validates complete pixel coverage',()=>{
 const f=reservedColumnFixture();assert.ok(f.plan.offsets.includes(700));assert.ok(f.plan.offsets.includes(1400));
 const published=JSON.parse(JSON.stringify(f.shots.map(s=>({...s,...serializeScrollTileState(s)}))));
 assert.doesNotThrow(()=>validateScrollTileCoverage(JSON.parse(JSON.stringify(f.capturePlan)),published));
});
test('final raster coverage rejects absent witness, changed rectangle, hidden local gap and lost aftermeasurement',()=>{
 for(const mutate of [f=>f.shots.splice(f.plan.offsets.indexOf(700),1),f=>f.shots[0].afterScroll.occlusion.reservedColumns[0].left++,f=>f.shots.forEach(s=>{s.scroll.occlusion.reservedColumns=exposure(1,975.171875);s.afterScroll=clone(s.scroll);}),f=>delete f.shots[0].afterScroll]){const f=reservedColumnFixture();mutate(f);assert.throws(()=>validateScrollTileCoverage(f.capturePlan,f.shots));}
});
test('existing fullwidth fixed obstruction,2px drift and growth negatives remain refusals',()=>{
 assert.throws(()=>planScrollTiles(6486,900,1366,{top:900,bottom:65.421875}));
 for(const mutate of [f=>f.shots[1].scroll.documentHeight+=3,f=>f.shots[1].afterScroll.occlusion.bottom=67,f=>f.shots[1].scroll.scrollY+=3]){const f=reservedColumnFixture();mutate(f);assert.throws(()=>validateScrollTileCoverage(f.capturePlan,f.shots));}
});
test('legacy3argument plan remains byteidentical',()=>assert.equal(JSON.stringify(planScrollTiles(2500,900,1366)),JSON.stringify({documentHeight:2500,viewportHeight:900,viewportWidth:1366,overlap:200,offsets:[0,700,1400,1600]})));
test('actual exported DOM collector exempts only contained disjoint grid column and retains fixed overlays',()=>{
 const keys=['document','innerHeight','innerWidth','getComputedStyle'],saved=keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]);
 const el=(tag,left,top,width,height,position='static')=>({tagName:tag.toUpperCase(),id:'',parentElement:null,children:[],scrollHeight:height,scrollWidth:width,style:{position,top:position==='sticky'?'100px':'auto',bottom:position==='fixed'?'0px':'auto',display:'block',visibility:'visible',opacity:'1',overflowX:'visible',overflowY:'visible'},getBoundingClientRect(){return {left,top,right:left+width,bottom:top+height,width,height};},querySelectorAll(){return this.children;}});
 const parent=el('div',83,-358,1200,4154);parent.style.display='grid';const peer=el('main',83,-358,860,4154),side=el('aside',983,100,300,975.171875,'sticky');parent.children=[peer,side];peer.parentElement=parent;side.parentElement=parent;
 const header=el('header',0,0,1366,115,'fixed'),cta=el('div',0,834.578125,1366,65.421875,'fixed');
 Object.assign(globalThis,{innerHeight:900,innerWidth:1366,document:{querySelectorAll:()=>[parent,peer,side,header,cta]},getComputedStyle:e=>e.style});
 try{
  const measured=measureScrollTileOcclusion();assert.equal(measured.top,115);assert.equal(measured.bottom,65.421875);assert.equal(measured.reservedColumns.length,1);assert.equal(measured.reservedColumns[0].exposedStart,15);assert.equal(measured.reservedColumns[0].exposedEnd,734.578125);
  side.scrollHeight=1000;assert.equal(measureScrollTileOcclusion().top,900);side.scrollHeight=975.171875;
  const overflow=el('span',900,120,400,30);overflow.parentElement=side;side.children=[overflow];assert.equal(measureScrollTileOcclusion().top,900);side.children=[];
  parent.style.display='block';assert.equal(measureScrollTileOcclusion().top,900);parent.style.display='grid';
  const peerOverflow=el('span',930,150,80,25);peerOverflow.parentElement=peer;peer.children=[peerOverflow];assert.equal(measureScrollTileOcclusion().top,900);peer.children=[];
  const peerPositioned=el('span',100,150,80,25,'absolute');peerPositioned.parentElement=peer;peer.children=[peerPositioned];assert.equal(measureScrollTileOcclusion().top,900);peer.children=[];
  globalThis.getComputedStyle=(e,pseudo)=>pseudo&&e===peer?{...e.style,content:'""'}:e.style;assert.equal(measureScrollTileOcclusion().top,900);globalThis.getComputedStyle=e=>e.style;
  // Actual Devlog .entry pattern: positioned card clips its absolute ::before.
  const entry=el('article',83,150,860,400,'relative');entry.style.overflowX='hidden';entry.style.overflowY='hidden';entry.parentElement=peer;peer.children=[entry];
  globalThis.getComputedStyle=(e,pseudo)=>pseudo&&e===entry?{...entry.style,position:'absolute',content:'""'}:e.style;
  assert.equal(measureScrollTileOcclusion().top,115);assert.equal(measureScrollTileOcclusion().reservedColumns.length,1);
  entry.style.overflowX='visible';assert.equal(measureScrollTileOcclusion().top,900);entry.style.overflowX='hidden';
  const clippedAbsolute=el('span',930,170,100,20,'absolute');clippedAbsolute.parentElement=entry;entry.children=[clippedAbsolute];peer.querySelectorAll=()=>[entry,clippedAbsolute];
  assert.equal(measureScrollTileOcclusion().top,115);entry.style.overflowX='visible';assert.equal(measureScrollTileOcclusion().top,900);entry.style.overflowX='hidden';
  clippedAbsolute.style.position='fixed';assert.equal(measureScrollTileOcclusion().top,900);entry.children=[];peer.children=[];peer.querySelectorAll=()=>[];globalThis.getComputedStyle=e=>e.style;
  const leading=el('div',83,0,1200,70);leading.style.gridColumnStart='1';leading.style.gridColumnEnd='-1';leading.parentElement=parent;parent.children=[leading,peer,side];
  let actual=measureScrollTileOcclusion();assert.equal(actual.top,115);assert.equal(actual.reservedColumns[0].leadingRow.bottom,70);
  leading.style.gridColumnEnd='auto';assert.equal(measureScrollTileOcclusion().top,900);leading.style.gridColumnEnd='-1';
  leading.style.position='fixed';assert.equal(measureScrollTileOcclusion().top,900);leading.style.position='static';
  const below=el('button',100,65,80,30);below.parentElement=leading;leading.children=[below];assert.equal(measureScrollTileOcclusion().top,900);leading.children=[];
  globalThis.getComputedStyle=(e,pseudo)=>pseudo&&e===leading?{...leading.style,position:'absolute',content:'""'}:e.style;assert.equal(measureScrollTileOcclusion().top,900);
  leading.style.position='relative';leading.style.overflowX='hidden';leading.style.overflowY='hidden';assert.equal(measureScrollTileOcclusion().top,115);globalThis.getComputedStyle=e=>e.style;
  leading.getBoundingClientRect=()=>({left:83,right:1283,top:0,bottom:101,width:1200,height:101});assert.equal(measureScrollTileOcclusion().top,900);parent.children=[peer,side];
  peer.getBoundingClientRect=()=>({left:83,right:1000,top:0,bottom:4154,width:917,height:4154});assert.equal(measureScrollTileOcclusion().top,900);
 }finally{for(const[k,d]of saved)if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}
});
test('actual legal measured pattern closes over new513px offsets and preserves137.78125px Spark instead of waiving growth',async()=>{
 const h=5155,vh=844,vw=390,seen=[];const closed=await closeScrollTilePlan({documentHeight:h,viewportHeight:vh,viewportWidth:vw},async y=>{seen.push(y);return{scrollY:y,documentHeight:h,viewportHeight:vh,viewportWidth:vw,scrollWidth:vw,occlusion:{top:y===0?131:79,bottom:y===2052?137.78125:0}};});
 assert.ok(seen.includes(2052));assert.equal(closed.plan.occlusion.bottom,138);assert.equal(closed.plan.offsets[1],375);
 const lastPass=Math.max(...closed.occlusionWalk.map(m=>m.preplanPass));assert.deepEqual(closed.occlusionWalk.filter(m=>m.preplanPass===lastPass).map(m=>m.scrollY),closed.plan.offsets);
 for(let i=1;i<closed.plan.offsets.length;i++)assert.ok(closed.plan.offsets[i-1]+vh-137.78125-(closed.plan.offsets[i]+131)>=200);
});
test('fixedpoint preplan refuses geometry drift and endlessly growing bounds',async()=>{
 const g={documentHeight:2500,viewportHeight:900,viewportWidth:1366},measurement=y=>({scrollY:y,...g,scrollWidth:1366,occlusion:{top:79,bottom:0}});
 await assert.rejects(closeScrollTilePlan(g,async y=>({...measurement(y),documentHeight:2503})),/drift/);
 let bottom=0;await assert.rejects(closeScrollTilePlan(g,async y=>({...measurement(y),occlusion:{top:79,bottom:bottom++}})),/did not close|no scroll-tile step|bound/);
});
test('natural parent-end sidebar exposure becomes actual planned witnesses; persistent bottom clipping refuses',async()=>{
 const g={documentHeight:6486,viewportHeight:900,viewportWidth:1366};
 const observe=async y=>{const top=Math.min(Math.max(100,942.375-y),4995.46875-y-column.height);return{scrollY:y,...g,scrollWidth:1366,occlusion:{top:115,bottom:65.421875,reservedColumns:[{...column,exposedStart:Math.min(column.height,Math.max(0,115-top)),exposedEnd:Math.min(column.height,Math.max(0,834.578125-top))}]}};};
 const closed=await closeScrollTilePlan(g,observe);assert.ok(closed.plan.offsets.includes(4200));assert.ok(closed.plan.witnessOffsets.includes(4200));assert.ok(closed.plan.reservedColumns);
 await assert.rejects(closeScrollTilePlan(g,async y=>{const m=await observe(y);m.occlusion.reservedColumns[0].exposedEnd=Math.min(900,m.occlusion.reservedColumns[0].exposedEnd);return m;}),/bottom/);
});
test('leading-row identity/geometry and above-column relation survive only exact planned inventory',()=>{
 const row={key:'grid-1-child-0',left:83,right:1283,height:70,position:'relative',gridColumnStart:'1',gridColumnEnd:'-1'},expected=[{...column,leadingRow:row}],actual=[{...column,rectTop:100,leadingRow:{...row,top:0,bottom:70},exposedStart:15,exposedEnd:734}];
 assert.doesNotThrow(()=>validateReservedColumnGeometry(expected,actual));
 for(const mutate of [x=>delete x[0].leadingRow,x=>x[0].leadingRow.height++,x=>x[0].leadingRow.gridColumnEnd='auto',x=>x[0].leadingRow.bottom=101,x=>x[0].leadingRow.position='fixed']){const x=clone(actual);mutate(x);assert.throws(()=>validateReservedColumnGeometry(expected,x));}
});

test('finished finite removal known before observation settles only for pre-raster opt-in',()=>animationFixture(async f=>{
 for(const allow of [false,true]){
  const done=f.animation(true),loop=f.animation();done.playState='finished';done.currentTime=500;f.set([done,loop]);let frames=0;
  globalThis.requestAnimationFrame=fn=>setImmediate(()=>{if(++frames===4)f.set([loop]);fn();});
  if(!allow)await assert.rejects(settleCaptureAnimations(),/Visible animation set changed/);
  else{const result=await settleCaptureAnimations({resettleLateFinite:true});assert.equal(result.seeked,false);assert.equal(loop.playState,'paused');assert.equal(f.calls.finish,0);}
 }
}));

test('finished finite removal refuses running paused infinite and newly-finished removals',()=>animationFixture(async f=>{
 for(const variant of ['running-loop','paused-loop','finished-infinite','newly-finished','restarted-finite','unknown-duration']){
  const a=f.animation(variant==='restarted-finite'||variant==='unknown-duration');
  if(['finished-infinite','restarted-finite','unknown-duration'].includes(variant))a.playState='finished';
  if(variant==='paused-loop')a.playState='paused';
  if(variant==='unknown-duration')a.effect.getComputedTiming=()=>({iterations:1,duration:Infinity,endTime:500});
  f.set([a]);let frames=0;
  globalThis.requestAnimationFrame=fn=>setImmediate(()=>{if(++frames===4){if(variant==='restarted-finite')a.playState='running';if(variant==='newly-finished'){a.playState='finished';a.effect.getComputedTiming=()=>({iterations:1,duration:500,endTime:500});}f.set([]);}fn();});
  await assert.rejects(settleCaptureAnimations({resettleLateFinite:true}),/Visible animation set changed|Unsettled|deadline/);
 }
}));

test('finished finite removal cannot permit mixed replacement churn or pure identity reorder',()=>animationFixture(async f=>{
 for(const variant of ['churn','order']){
  const a=f.animation(true),b=f.animation(true),c=f.animation(true);for(const x of [a,b,c])x.playState='finished';f.set([a,b]);let frames=0;
  globalThis.requestAnimationFrame=fn=>setImmediate(()=>{if(++frames===4)f.set(variant==='order'?[b,a]:[b,c]);fn();});
  await assert.rejects(settleCaptureAnimations({resettleLateFinite:true}),/Visible animation set changed/);
 }
}));

test('finished finite removal never waives native set progress geometry or unknown timeline guards',()=>animationFixture(async f=>{
 for(const variant of ['native-set','native-progress','native-geometry','unknown-timeline']){
  const done=f.animation(true);done.playState='finished';const scroll=nativeScrollFixture(f);if(variant==='unknown-timeline')done.timeline={};f.set([done,scroll]);let frames=0;
  globalThis.requestAnimationFrame=fn=>setImmediate(()=>{if(++frames===4){if(variant==='native-progress')scroll.currentTime=new CSSUnitValue(26);if(variant==='native-geometry')f.element.scrollTop++;f.set(variant==='native-set'?[]:[scroll]);}fn();});
  await assert.rejects(settleCaptureAnimations({resettleLateFinite:true}),/Native scroll|Unknown animation timeline/);
 }
}));

test('cleanup rejection diagnostics retain actual identity orders and safe bounded phase details',()=>animationFixture(async f=>{
 const a=f.animation(true),b=f.animation(true);a.playState=b.playState='finished';f.set([a,b]);let frames=0;
 globalThis.requestAnimationFrame=fn=>setImmediate(()=>{if(++frames===4)f.set([b,a]);fn();});
 await assert.rejects(settleCaptureAnimations(),error=>{
  const marker=' CAPTURE_ANIMATION_SET_CHANGED ',at=error.message.indexOf(marker);assert.ok(at>0);const raw=error.message.slice(at+marker.length);assert.ok(Buffer.byteLength(raw)<16384);const d=JSON.parse(raw);
  assert.equal(d.schemaVersion,1);assert.equal(d.phase,'AFTER_RASTER');assert.deepEqual(d.firstIdentityOrder,[0,1]);assert.deepEqual(d.secondIdentityOrder,[1,0]);assert.equal(d.orderChanged,true);assert.deepEqual(d.addedIds,[]);assert.deepEqual(d.removedIds,[]);assert.equal(d.details[0].tag,'SPAN');assert.equal('rect' in d.details[0],false);return true;
 });
}));


test('cleanup rejection UTF8 bounds preserve complete128-effect identity sets with unicode labels',()=>animationFixture(async f=>{
 const list=Array.from({length:128},()=>{const a=f.animation(true);a.playState='finished';a.animationName='火'.repeat(160);a.constructor={name:'火'.repeat(40)};a.timeline.constructor={name:'火'.repeat(40)};a.currentTime='火'.repeat(32);return a;});f.element.tagName='火'.repeat(24);f.element.id='火'.repeat(160);f.element.className='火'.repeat(160);f.set(list);let frames=0;
 globalThis.requestAnimationFrame=fn=>setImmediate(()=>{if(++frames===4)f.set([...list].reverse());fn();});
 await assert.rejects(settleCaptureAnimations(),error=>{const marker=' CAPTURE_ANIMATION_SET_CHANGED ',raw=error.message.split(marker)[1];assert.ok(raw);assert.ok(Buffer.byteLength(raw)<=16384);const d=JSON.parse(raw);assert.equal(d.firstIdentityOrder.length,128);assert.equal(d.secondIdentityOrder.length,128);assert.equal(d.orderChanged,true);assert.ok(d.detailsTruncatedCount>112);return true;});
}));
