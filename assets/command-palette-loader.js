/**
 * command-palette-loader — tiny intent gate for the full command palette.
 *
 * The full palette does fuzzy indexing, UI construction, and optional semantic
 * search wiring. Most visitors never ask for it, so the ambient bundle only
 * pays for this loader and imports the heavy script on first search intent.
 */
(function () {
  'use strict';

  var SRC = '/assets/command-palette.js';
  var loading = null;

  function loaded() {
    return !!(window.VSCommandPalette && typeof window.VSCommandPalette.open === 'function');
  }

  function loadPalette() {
    if (loaded()) return Promise.resolve();
    if (loading) return loading;
    window.__VSCommandPaletteOpenRequested = true;
    loading = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = SRC;
      script.defer = true;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('command palette failed to load')); };
      document.head.appendChild(script);
    });
    return loading;
  }

  function openPalette() {
    if (loaded()) {
      window.VSCommandPalette.open();
      return;
    }
    loadPalette().then(function () {
      if (loaded()) window.VSCommandPalette.open();
      else document.dispatchEvent(new CustomEvent('vs:command-palette-open'));
    }).catch(function () {});
  }

  function onKey(e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      openPalette();
    }
  }

  function injectMobileTrigger() {
    if (document.querySelector('[data-vs-palette-loader-trigger]')) return;
    var style = document.createElement('style');
    style.textContent = [
      '.vs-palette-loader-trigger{position:fixed;bottom:1rem;right:1rem;z-index:50;padding:.55rem .95rem;background:rgba(13,16,28,.92);border:1px solid rgba(255,255,255,.12);border-radius:999px;color:var(--text);font-size:.8rem;font-family:Georgia,serif;cursor:pointer;min-height:44px;display:none;align-items:center;gap:.45rem}',
      'body.light-mode .vs-palette-loader-trigger{background:rgba(255,253,247,.95);border-color:rgba(20,28,52,.15)}',
      '@media(max-width:720px){.vs-palette-loader-trigger{display:inline-flex}}'
    ].join('');
    document.head.appendChild(style);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vs-palette-loader-trigger';
    btn.setAttribute('data-vs-palette-loader-trigger', 'true');
    btn.setAttribute('aria-label', 'Open search palette');
    // S174 TT burndown: DOM API instead of innerHTML.
    btn.appendChild(document.createTextNode('⌕ '));
    var btnLabel = document.createElement('span');
    btnLabel.textContent = 'Search';
    btn.appendChild(btnLabel);
    btn.addEventListener('click', openPalette);
    document.body.appendChild(btn);
  }

  function init() {
    document.addEventListener('keydown', onKey);
    injectMobileTrigger();
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
