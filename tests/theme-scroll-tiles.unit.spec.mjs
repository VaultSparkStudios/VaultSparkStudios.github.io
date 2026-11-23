import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {planScrollTiles,validateScrollTileMeasurement,validateScrollTileCoverage} from '../scripts/capture-theme-matrix.mjs';
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
