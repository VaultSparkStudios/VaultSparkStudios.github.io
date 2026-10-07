/**
 * command-palette-loader — tiny intent gate for the full command palette.
 *
 * The full palette does fuzzy indexing, UI construction, and optional semantic
 * search wiring. Most visitors never ask for it, so the ambient bundle only
 * pays for this loader and imports the heavy script on first search intent.
 */
(function () {
  'use strict';

  var SRC = '/assets/spark-compass.js';
  var loading = null;

  function loaded() {
    return !!(window.VSCommandPalette && typeof window.VSCommandPalette.open === 'function');
  }

  function loadPalette() {
    
    if (loading) return loading;
    var css=document.querySelector('[data-spark-style]');
    var cssReady=new Promise(function(resolve,reject){if(css&&css.sheet){resolve();return;}if(!css){css=document.createElement('link');css.rel='stylesheet';css.href='/assets/spark-compass.css';css.dataset.sparkStyle='true';document.head.appendChild(css);}css.onload=resolve;css.onerror=function(){css.remove();reject(new Error('Spark style unavailable'));};});
    loading = Promise.all([cssReady,new Promise(function (resolve, reject) {
      if(loaded()){resolve();return;}
      var script = document.createElement('script');
      script.src = SRC;
      script.defer = true;
      script.onload = function () { resolve(); };
      script.onerror = function () { loading=null; reject(new Error('Spark failed to load')); };
      document.head.appendChild(script);
    })]).catch(function(error){loading=null;throw error;});
    return loading;
  }

  function openPalette() {
    loadPalette().then(function () {
      if (loaded()) window.VSCommandPalette.open();
      else document.dispatchEvent(new CustomEvent('vs:command-palette-open'));
    }).catch(function () { var trigger=document.querySelector('[data-vs-palette-loader-trigger]');if(trigger)trigger.setAttribute('aria-label','Spark unavailable — try again'); });
  }

  function onKey(e) {
    // The loader owns the single keyboard toggle before and after lazy loading.
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      if(window.VSSpark && document.querySelector('#spark-compass[open]'))window.VSSpark.close();else openPalette();
    }
  }

  function injectMobileTrigger() {
    if (document.querySelector('[data-vs-palette-loader-trigger]')) return;
    var style = document.createElement('style');
    style.textContent='.spark-launch{display:inline-flex;align-items:center;gap:.4rem;min-height:44px;padding:.35rem .65rem;border:1px solid var(--line);border-radius:999px;background:var(--bg-soft);color:var(--text);font:700 .8rem system-ui;cursor:pointer;white-space:nowrap}.spark-mini{width:23px;height:23px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff8b8,#ffcd49 13%,#93671d 25%,#241d3d 46%,#537bb9 70%,#100e24);box-shadow:inset 0 0 0 1px #ffc75a88}@media(min-width:1025px) and (max-width:1450px){.site-header .brand{gap:.45rem}.site-header .brand img{width:36px;height:36px}.site-header .brand>span{font-size:.9rem}.site-header .brand small{font-size:.6rem;letter-spacing:.04em}.site-header .nav{gap:.4rem}.site-header .nav-center a{font-size:.82rem;padding-inline:.25rem}.site-header .nav-right{gap:.35rem}.site-header .nav-signin{padding-inline:.35rem}}';
    document.head.appendChild(style);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'spark-launch vs-palette-loader-trigger';
    btn.setAttribute('data-vs-palette-loader-trigger', 'true');
    btn.setAttribute('aria-label', 'Open Spark — Vault Compass');
    // S174 TT burndown: DOM API instead of innerHTML.
    var mini=document.createElement('span');mini.className='spark-mini';mini.setAttribute('aria-hidden','true');btn.appendChild(mini);
    var btnLabel = document.createElement('span');
    btnLabel.textContent = 'Spark';
    btn.appendChild(btnLabel);
    btn.addEventListener('click', openPalette);
    btn.setAttribute('aria-expanded','false');
    btn.setAttribute('aria-controls','spark-compass');
    // The header recalls Spark even after the buddy is tucked away.
    btn.setAttribute('aria-label','Open Spark navigation');
    var menuButton = document.getElementById('hamburger');
    if (menuButton && menuButton.parentNode) menuButton.parentNode.insertBefore(btn, menuButton);
    else (document.querySelector('.site-header .nav') || document.body).appendChild(btn);
  }


  function injectBuddy(){
    var dock=document.createElement('aside');dock.className='spark-buddy';dock.setAttribute('aria-label','Spark companion');
    var buddy=document.createElement('button');buddy.type='button';buddy.className='spark-buddy-open';buddy.setAttribute('aria-label','Open Spark — Vault Compass');buddy.setAttribute('aria-expanded','false');buddy.setAttribute('aria-controls','spark-compass');
    var body=document.createElement('span');body.className='spark-buddy-orb';body.setAttribute('aria-hidden','true');
    ['halo','flame','face','trail'].forEach(function(name){var part=document.createElement('span');part.className='spark-buddy-'+name;body.appendChild(part);});
    buddy.appendChild(body);var label=document.createElement('span');label.className='spark-buddy-label';label.textContent='Spark';buddy.appendChild(label);
    buddy.addEventListener('click',function(){if(window.VSSpark&&document.querySelector('#spark-compass[open]'))window.VSSpark.close();else openPalette();});
    var hide=document.createElement('button');hide.type='button';hide.className='spark-buddy-hide';hide.textContent='×';hide.setAttribute('aria-label','Tuck Spark away for this visit');hide.addEventListener('click',function(){dock.hidden=true;try{sessionStorage.setItem('vs_spark_tucked','true');}catch(_){}var recall=document.querySelector('[data-vs-palette-loader-trigger]');if(recall)recall.focus();});
    dock.append(buddy,hide);document.body.appendChild(dock);
    var style=document.createElement('style');style.textContent=SPARK_BUDDY_STYLE;document.head.appendChild(style);
    function sync(){
      var prefs={};try{prefs=JSON.parse(localStorage.getItem('vs_spark_v1')||'{}')||{};}catch(_){}
      var tucked=false;try{tucked=sessionStorage.getItem('vs_spark_tucked')==='true';}catch(_){}
      var hidden=tucked||prefs.preference==='quiet';if(dock.hidden!==hidden)dock.hidden=hidden;dock.dataset.side=prefs.side==='left'?'left':'right';dock.dataset.motion=prefs.motion==='still'?'still':'gentle';
      var blocked=Array.from(document.querySelectorAll('#cookieConsent,dialog[open],[aria-modal="true"],.mobile-nav.open')).some(function(n){return n.id!=='spark-compass'&&!n.hidden&&n.getBoundingClientRect().width>0;});
      dock.dataset.yield=String(blocked);dock.dataset.paused=String(document.hidden);var opened=!!document.querySelector('#spark-compass[open]');buddy.setAttribute('aria-expanded',String(opened));
      var recall=document.querySelector('[data-vs-palette-loader-trigger]');if(recall)recall.setAttribute('aria-expanded',String(opened));
    }
    new MutationObserver(sync).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open','hidden','class','aria-modal']});
    document.addEventListener('visibilitychange',sync);window.addEventListener('storage',sync);document.addEventListener('spark:preferences',sync);sync();
  }
  var SPARK_BUDDY_STYLE="\n.spark-buddy{position:fixed;right:max(20px,env(safe-area-inset-right));bottom:calc(20px + env(safe-area-inset-bottom));z-index:950;display:grid;justify-items:center;width:90px;isolation:isolate}\n.spark-buddy[hidden]{display:none}.spark-buddy[data-side=left]{right:auto;left:max(20px,env(safe-area-inset-left))}.spark-buddy[data-yield=true]{visibility:hidden;pointer-events:none}\n.spark-buddy .spark-buddy-open{display:flex;flex-direction:column;align-items:center;gap:9px;width:90px;padding:10px 6px 6px;border:0;background:transparent;color:var(--text,#fafafa);cursor:pointer;border-radius:22px}\n.spark-buddy-open:focus-visible,.spark-buddy-hide:focus-visible{outline:3px solid var(--gold,#ffc400);outline-offset:4px}\n.spark-buddy-orb{position:relative;flex-shrink:0;width:64px;height:64px;display:block;border-radius:48% 52% 46% 54%;background:radial-gradient(circle at 33% 24%,#fff8bd 0%,#ffd96b 20%,#ffa23b 45%,#f06f63 67%,#977bed 90%);box-shadow:inset -5px -6px 12px #5d287d55,inset 2px 3px 9px #fff9,0 8px 26px #ff9b3440;animation:spark-buddy-float 4.6s ease-in-out infinite;transition:filter .2s}\n.spark-buddy-halo{position:absolute;inset:-9px;border:1px solid #ffbd7699;border-radius:50%;transform:rotate(-25deg) scaleY(.48);box-shadow:0 0 12px #ffb44833;animation:spark-buddy-halo 8s ease-in-out infinite}\n.spark-buddy-flame{position:absolute;left:22px;top:-11px;width:21px;height:23px;border-radius:3px 80% 10px 80%;background:linear-gradient(140deg,#fff2ab,#ffb642);transform:rotate(25deg);box-shadow:0 0 13px #ffbf6b66}\n.spark-buddy-face{position:absolute;left:18px;top:26px;width:28px;height:20px;background:radial-gradient(ellipse at 5px 5px,#322342 0 3px,transparent 3.5px),radial-gradient(ellipse at 23px 5px,#322342 0 3px,transparent 3.5px);animation:spark-buddy-blink 7s infinite}\n.spark-buddy-face:after{content:'';position:absolute;left:10px;top:9px;width:8px;height:5px;border-bottom:2px solid #322342;border-radius:0 0 10px 10px}\n.spark-buddy-trail{position:absolute;left:22px;bottom:-12px;width:20px;height:4px;background:#d59af2;border-radius:50%;box-shadow:0 6px 0 -1px #fac764;opacity:.65}\n.spark-buddy-label{font:700 .75rem system-ui;padding:5px 12px;border-radius:999px;background:var(--bg-soft,#161626);border:1px solid var(--line,#817288);color:var(--text,#fafafa);box-shadow:0 3px 14px #0002}\n.spark-buddy-hide{position:absolute;right:-2px;top:-6px;width:44px;height:44px;border:0;border-radius:50%;background:transparent;color:var(--muted,#aaa);font-size:20px;cursor:pointer;opacity:0;transition:opacity .2s}.spark-buddy:hover .spark-buddy-hide,.spark-buddy:focus-within .spark-buddy-hide{opacity:1}\n.spark-buddy-open:hover .spark-buddy-orb{filter:brightness(1.12)}.spark-buddy-open:hover .spark-buddy-face:after{height:7px;background:#322342}\n.spark-buddy[data-motion=still] *, .spark-buddy[data-paused=true] *{animation-play-state:paused!important}\n@keyframes spark-buddy-float{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-7px) rotate(5deg)}}\n@keyframes spark-buddy-halo{50%{transform:rotate(15deg) scaleY(.55)}}@keyframes spark-buddy-blink{0%,44%,48%,100%{transform:scaleY(1)}46%{transform:scaleY(.12)}}\n@media(max-width:720px){.spark-buddy{right:12px;bottom:calc(12px + env(safe-area-inset-bottom));width:76px}.spark-buddy .spark-buddy-open{width:76px}.spark-buddy-orb{width:56px;height:56px}.spark-buddy-face{left:14px;top:22px}.spark-buddy-flame{left:18px}.spark-buddy-hide{opacity:1;right:-7px;top:-12px}}\n@media(prefers-reduced-motion:reduce){.spark-buddy *{animation:none!important;transition:none!important}}\n";

  function init() {
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', function(event){if(event.target.closest('[data-spark-open]'))openPalette();});
    injectMobileTrigger();
    injectBuddy();
    // Only an explicitly started public route can earn an arrival receipt.
    try {
      var active=JSON.parse(localStorage.getItem('vs_spark_active_v1')||'null');
      if(active&&Array.isArray(active.targets)&&Array.isArray(active.stops)&&active.stops.length<=3){
        var target=active.targets.find(function(t){return t.path===location.pathname&&active.stops.includes(t.id);});
        if(target){active.visited=Array.isArray(active.visited)?active.visited:[];if(!active.visited.includes(target.id))active.visited.push(target.id);localStorage.setItem('vs_spark_active_v1',JSON.stringify(active));
          if(active.stops.length&&active.stops.every(function(id){return active.visited.includes(id);})){var saved=JSON.parse(localStorage.getItem('vs_spark_v1')||'null');if(saved&&saved.version===1){var key=active.stops.join('.');saved.completed=Array.isArray(saved.completed)?saved.completed:[];if(!saved.completed.includes(key)){saved.completed.push(key);saved.completed=saved.completed.slice(-30);localStorage.setItem('vs_spark_v1',JSON.stringify(saved));}}}
        }
      }
    } catch(_) {} // Storage restrictions never obstruct navigation.

  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
