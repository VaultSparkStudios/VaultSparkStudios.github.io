// scroll-depth.js — zero-mutation scroll-depth milestone tracking
// Fires engagement:scroll_N events (25/50/75/100%) to /v/rum via sendBeacon.
// It performs no document geometry work until the visitor actually scrolls.

(function () {
  'use strict';

  var MILESTONES = [25, 50, 75, 100];
  var fired = typeof Set === 'function' ? new Set() : {
    values: [],
    has: function (value) { return this.values.indexOf(value) !== -1; },
    add: function (value) { this.values.push(value); }
  };
  var ticking = false;
  var extent = 0;

  function fireEvent(percent) {
    try {
      var body = JSON.stringify({ ux: 'engagement:scroll_' + percent });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/v/rum', new Blob([body], { type: 'application/json' }));
      }
    } catch (_error) {
      // Analytics failure must never affect page behavior.
    }
  }

  function measureExtent() {
    var root = document.documentElement;
    var body = document.body;
    var height = Math.max(
      root ? root.scrollHeight : 0,
      body ? body.scrollHeight : 0
    );
    extent = Math.max(1, height - window.innerHeight);
  }

  function sample() {
    ticking = false;
    if (!extent) measureExtent();
    var percent = Math.min(100, Math.max(0, (window.scrollY / extent) * 100));
    MILESTONES.forEach(function (milestone) {
      if (percent >= milestone && !fired.has(milestone)) {
        fired.add(milestone);
        fireEvent(milestone);
      }
    });
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(sample);
  }

  function onResize() {
    extent = 0;
    if (window.scrollY > 0) onScroll();
  }

  function init() {
    if (!document.body) return;
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    if (window.scrollY > 0) onScroll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}());
