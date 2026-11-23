/** Browser evaluator: finish finite DocumentTimeline entrances naturally, pause
 * visible DocumentTimeline loops at their real phase, and OBSERVE recognized
 * native scroll/view timelines without changing their progress or play state. */
export async function settleCaptureAnimations({timeoutMs=2000}={}) {
 if(!Number.isFinite(timeoutMs)||timeoutMs<1||timeoutMs>10000)throw Error('Invalid animation settlement deadline');
 const start=Date.now(),remaining=()=>timeoutMs-(Date.now()-start);
 const observable=a=>{const el=a.effect?.target;if(!(el instanceof Element))return false;const r=el.getBoundingClientRect();if(r.width<=0||r.height<=0||r.bottom<=0||r.top>=innerHeight||r.right<=0||r.left>=innerWidth)return false;for(let p=el;p;p=p.parentElement){const s=getComputedStyle(p);if(s.display==='none'||s.visibility!=='visible'||(p!==el&&Number(s.opacity)===0))return false;}return true;};
 const visible=()=>{const list=document.getAnimations().filter(observable);if(list.length>128)throw Error('Observable animation bound exceeded');return list;};
 const bounded=async promise=>{const ms=remaining();if(ms<=0)throw Error('Animation settlement deadline');let timer;try{return await Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('Animation settlement deadline')),ms))]);}finally{clearTimeout(timer);}};
 const frame=()=>bounded(new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const kind=a=>{const t=a.timeline;if(typeof ViewTimeline==='function'&&t instanceof ViewTimeline)return 'ViewTimeline';if(typeof ScrollTimeline==='function'&&t instanceof ScrollTimeline)return 'ScrollTimeline';if(typeof DocumentTimeline==='function'&&t instanceof DocumentTimeline)return 'DocumentTimeline';throw Error('Unknown animation timeline');};
 const percent=(value,label)=>{if(typeof CSSUnitValue!=='function'||!(value instanceof CSSUnitValue)||value.unit!=='percent'||!Number.isFinite(value.value))throw Error('Invalid native percentage '+label);return {unit:'percent',value:value.value};};
 const elementPath=el=>{if(!(el instanceof Element)||el.ownerDocument!==document||!el.isConnected||el.getRootNode()!==document)throw Error('Unknown/detached timeline element');if(el===document.scrollingElement)return 'document.scrollingElement';let current=el,parts=[];while(current&&parts.length<32){const parent=current.parentElement,index=parent?[...parent.children].indexOf(current):0;parts.unshift(current.tagName.toLowerCase()+':'+index);current=parent;}if(current)throw Error('Timeline element ancestry exceeds bound');return parts.join('/');};
 const elementInfo=el=>{const key=elementPath(el),r=el.getBoundingClientRect(),style=getComputedStyle(el),geometry={scrollTop:el.scrollTop,scrollLeft:el.scrollLeft,scrollHeight:el.scrollHeight,scrollWidth:el.scrollWidth,clientHeight:el.clientHeight,clientWidth:el.clientWidth,rect:{top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}};if(![geometry.scrollTop,geometry.scrollLeft,geometry.scrollHeight,geometry.scrollWidth,geometry.clientHeight,geometry.clientWidth,...Object.values(geometry.rect)].every(Number.isFinite))throw Error('Invalid timeline source geometry');return {key,tag:el.tagName,id:el.id||null,className:el.className?.baseVal??el.className,writingMode:style.writingMode,direction:style.direction,geometry};};
 const scrollState=(a,index)=>{
  const nativeTimeline=kind(a),timeline=a.timeline,timing=a.effect.getComputedTiming();
  if(nativeTimeline==='DocumentTimeline')throw Error('Not a scroll timeline');
  if(!['block','inline','x','y'].includes(timeline.axis)||!Number.isFinite(timing.iterations)||timing.iterations<=0)throw Error('Invalid native scroll axis/iterations');
  const source=elementInfo(timeline.source),subject=nativeTimeline==='ViewTimeline'?elementInfo(timeline.subject):null;
  if(!['horizontal-tb','vertical-rl','vertical-lr','sideways-rl','sideways-lr'].includes(source.writingMode)||!['ltr','rtl'].includes(source.direction))throw Error('Unknown native source writing mode');
  const horizontal=timeline.axis==='x'||(timeline.axis==='inline'&&source.writingMode==='horizontal-tb')||(timeline.axis==='block'&&source.writingMode!=='horizontal-tb');
  const extent=horizontal?source.geometry.scrollWidth-source.geometry.clientWidth:source.geometry.scrollHeight-source.geometry.clientHeight;
  if(!(extent>0)||!['running','paused','finished'].includes(a.playState)||(timing.progress!==null&&(!Number.isFinite(timing.progress)||timing.progress<0||timing.progress>1)))throw Error('Inactive/unknown native scroll progress');
  return {index,name:a.animationName||a.id||null,target:elementPath(a.effect.target),pseudoElement:a.effect.pseudoElement||null,nativeTimeline,axis:timeline.axis,playState:a.playState,source,subject,animationTime:percent(a.currentTime,'animation currentTime'),timelineTime:percent(timeline.currentTime,'timeline currentTime'),duration:percent(timing.duration,'effect duration'),endTime:percent(timing.endTime,'effect endTime'),progress:timing.progress,iterations:timing.iterations,viewport:{scrollX,scrollY,width:innerWidth,height:innerHeight,documentHeight:document.documentElement.scrollHeight,documentWidth:document.documentElement.scrollWidth}};
 };
 const finiteSettled=[];
 for(;;){const finite=visible().filter(a=>kind(a)==='DocumentTimeline'&&a.effect.getComputedTiming().iterations!==Infinity&&a.playState!=='finished');if(!finite.length)break;for(const a of finite){const t=a.effect.getComputedTiming();if(!Number.isFinite(t.endTime)||a.playState==='paused')throw Error('Finite animation cannot naturally settle');}await bounded(Promise.all(finite.map(async a=>{await a.finished;finiteSettled.push({name:a.animationName||a.id||null,time:a.currentTime,playState:a.playState});})));}
 const rows=visible().filter(a=>kind(a)==='DocumentTimeline'&&a.playState!=='finished').map(a=>{const t=a.effect.getComputedTiming(),el=a.effect.target;if(t.iterations!==Infinity||!Number.isFinite(t.duration)||t.duration<=0)throw Error('Unsettled/unknown observable animation');return {a,record:{name:a.animationName||a.id||null,tag:el.tagName,id:el.id||null,className:el.className?.baseVal??el.className,pseudoElement:a.effect.pseudoElement||null,duration:t.duration,iterations:'Infinity',timeBefore:a.currentTime,playStateBefore:a.playState}};});
 for(const r of rows)r.a.pause();await bounded(Promise.all(rows.map(r=>r.a.ready)));await frame();
 const list=visible();if(list.some(a=>kind(a)==='DocumentTimeline'&&a.playState!=='finished'&&(a.effect.getComputedTiming().iterations!==Infinity||!rows.some(r=>r.a===a)||a.playState!=='paused')))throw Error('New/unsettled animation appeared after settlement');
 const scrollRows=list.filter(a=>kind(a)!=='DocumentTimeline').map((a,index)=>({a,index})),first=scrollRows.map(({a,index})=>scrollState(a,index));
 await frame();const secondVisible=visible();if(secondVisible.length!==list.length||secondVisible.some((a,i)=>a!==list[i]))throw Error('Visible animation set changed during scroll observation');const scrollDriven=scrollRows.map(({a,index})=>scrollState(a,index));if(JSON.stringify(first)!==JSON.stringify(scrollDriven))throw Error('Native scroll progress/geometry did not settle');
 return {captureState:'document-time-settled-native-scroll-progress-observed',finiteSettled,seeked:false,cssChanged:false,hiddenContent:false,removedOverlays:false,screenshotAnimations:'allow',scrollDriven,scrollTimelinesChanged:false,animations:rows.map(({a,record})=>{if(a.playState!=='paused')throw Error('Infinite animation did not pause');return {...record,pausedTime:a.currentTime,playStateAfter:a.playState};})};
}

/** Called around one raster at an unchanged planned scroll position. Old
 * receipts without this new state keep their historical validation branch. */
export function validateRasterAnimationState(before,after){
 const a=before?.animationCaptureState?.scrollDriven,b=after?.animationCaptureState?.scrollDriven;
 if(a===undefined&&b===undefined)return;
 if(!Array.isArray(a)||!Array.isArray(b)||JSON.stringify(a)!==JSON.stringify(b))throw Error('Native scroll progress/source changed during raster');
}
