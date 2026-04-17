/**
 * VaultSpark — Native-Feel Layer.
 *
 *  · View Transitions API: opt into smooth cross-document transitions on supported browsers.
 *  · Web Vibration API: light haptic on rank-up + drop-shipped events (PWA + Android).
 *  · Web Share API: progressive enhancement on `[data-share]` buttons (no third-party SDK).
 *  · Detects standalone display-mode and exposes window.VSNative.isStandalone().
 *
 * No-op on browsers that lack the relevant API. Suppressed on prefers-reduced-motion for view transitions.
 * CSP-clean (no inline scripts/styles — uses Document.styleSheets via injected <style>).
 */
(function () {
  'use strict';

  function injectViewTransitionRule() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!CSS.supports('view-transition-name', 'none') && !('startViewTransition' in document)) return;
    if (document.querySelector('style[data-vs-view-transitions]')) return;
    var s = document.createElement('style');
    s.setAttribute('data-vs-view-transitions', '1');
    s.appendChild(document.createTextNode(
      '@view-transition { navigation: auto; }\n' +
      '::view-transition-old(root) { animation-duration: 240ms; animation-timing-function: cubic-bezier(0.32, 0.72, 0, 1); }\n' +
      '::view-transition-new(root) { animation-duration: 280ms; animation-timing-function: cubic-bezier(0.32, 0.72, 0, 1); }\n'
    ));
    document.head.appendChild(s);
  }

  function buzz(pattern) {
    if (!('vibrate' in navigator)) return false;
    try { return navigator.vibrate(pattern); } catch (_e) { return false; }
  }

  function isStandalone() {
    return matchMedia('(display-mode: standalone)').matches
      || (window.navigator && window.navigator.standalone === true);
  }

  function bindHaptics() {
    // Listen to in-page custom events the rest of the codebase fires.
    document.addEventListener('vs:rank_up', function () { buzz([18, 22, 36]); });
    document.addEventListener('vs:drop_shipped', function () { buzz([26, 30, 26]); });
    document.addEventListener('vs:achievement_earned', function () { buzz([12, 16, 12, 16, 24]); });

    // Auto-bind to elements marked [data-haptic] (light tap on click).
    document.addEventListener('click', function (ev) {
      var el = ev.target.closest('[data-haptic]');
      if (!el) return;
      var pattern = el.getAttribute('data-haptic') || '14';
      var nums = pattern.split(',').map(function (x) { return Number(x); }).filter(function (x) { return !isNaN(x); });
      if (nums.length) buzz(nums);
    });
  }

  function bindShare() {
    if (!navigator.share) return;
    document.addEventListener('click', function (ev) {
      var el = ev.target.closest('[data-share]');
      if (!el) return;
      ev.preventDefault();
      var url = el.getAttribute('data-share-url') || el.getAttribute('href') || location.href;
      var title = el.getAttribute('data-share-title') || document.title;
      var text = el.getAttribute('data-share-text') || '';
      navigator.share({ url: url, title: title, text: text }).catch(function () { /* user cancelled */ });
      buzz(10);
    });
  }

  function init() {
    injectViewTransitionRule();
    bindHaptics();
    bindShare();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.VSNative = {
    isStandalone: isStandalone,
    buzz: buzz,
  };
})();
