/** Browser evaluator. Let finite entrances finish naturally, then pause only
 * visible infinite animations at their actual phase. Never seek, finish, hide,
 * replace styles or remove overlays. Raster must use animations:'allow'. */
export async function settleCaptureAnimations({timeoutMs=2000}={}) {
 if(!Number.isFinite(timeoutMs)||timeoutMs<1||timeoutMs>10000)throw Error('Invalid animation settlement deadline');
 const start=Date.now(),remaining=()=>timeoutMs-(Date.now()-start);
 const observable=a=>{const el=a.effect?.target;if(!(el instanceof Element))return false;const r=el.getBoundingClientRect();if(r.width<=0||r.height<=0||r.bottom<=0||r.top>=innerHeight||r.right<=0||r.left>=innerWidth)return false;for(let p=el;p;p=p.parentElement){const s=getComputedStyle(p);if(s.display==='none'||s.visibility!=='visible'||(p!==el&&Number(s.opacity)===0))return false;}return true;};
 const visible=()=>{const list=document.getAnimations().filter(observable);if(list.length>128)throw Error('Observable animation bound exceeded');return list;};
 const bounded=async promise=>{const ms=remaining();if(ms<=0)throw Error('Finite animation settlement deadline');let timer;try{return await Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('Finite animation settlement deadline')),ms))]);}finally{clearTimeout(timer);}};
 const finiteSettled=[];
 for(;;){const finite=visible().filter(a=>a.effect.getComputedTiming().iterations!==Infinity&&a.playState!=='finished');if(!finite.length)break;
  for(const a of finite){const t=a.effect.getComputedTiming();if(!Number.isFinite(t.endTime)||a.playState==='paused')throw Error('Finite animation cannot naturally settle');}
  await bounded(Promise.all(finite.map(async a=>{await a.finished;finiteSettled.push({name:a.animationName||a.id||null,time:a.currentTime,playState:a.playState});})));
 }
 const rows=visible().filter(a=>a.playState!=='finished').map(a=>{const t=a.effect.getComputedTiming(),el=a.effect.target;if(t.iterations!==Infinity||!Number.isFinite(t.duration)||t.duration<=0)throw Error('Unsettled/unknown observable animation');return {a,record:{name:a.animationName||a.id||null,tag:el.tagName,id:el.id||null,className:el.className?.baseVal??el.className,pseudoElement:a.effect.pseudoElement||null,duration:t.duration,iterations:'Infinity',timeBefore:a.currentTime,playStateBefore:a.playState}};});
 for(const r of rows)r.a.pause();await bounded(Promise.all(rows.map(r=>r.a.ready)));
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 if(visible().some(a=>a.playState!=='finished'&&(a.effect.getComputedTiming().iterations!==Infinity||!rows.some(r=>r.a===a)||a.playState!=='paused')))throw Error('New/unsettled animation appeared after settlement');
 return {captureState:'finite-entrances-naturally-finished-visible-infinite-paused',finiteSettled,seeked:false,cssChanged:false,hiddenContent:false,removedOverlays:false,screenshotAnimations:'allow',animations:rows.map(({a,record})=>{if(a.playState!=='paused')throw Error('Infinite animation did not pause');return {...record,pausedTime:a.currentTime,playStateAfter:a.playState};})};
}
