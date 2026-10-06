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
    // Keep search beside navigation, in document flow, so it cannot cover page content.
    var menuButton = document.getElementById('hamburger');
    if (menuButton && menuButton.parentNode) menuButton.parentNode.insertBefore(btn, menuButton);
    else (document.querySelector('.site-header .nav') || document.body).appendChild(btn);
  }

  function init() {
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', function(event){if(event.target.closest('[data-spark-open]'))openPalette();});
    injectMobileTrigger();
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
