/**
 * edge-swipe-nav.js — Mobile edge-swipe gesture for the primary nav drawer.
 *
 * - Swipe right from the left edge (touchstart clientX < 24) → opens nav.
 * - Swipe left while drawer is open → closes nav.
 * - Active only when the hamburger is visible (i.e. mobile viewports).
 * - Honors prefers-reduced-motion: no live-drag preview, fire on release only.
 * - Ignores swipes that start on interactive elements (inputs, buttons,
 *   contenteditable, [data-no-swipe]) so taps inside nav controls still work.
 *
 * Composes with nav-toggle.js — it triggers the same .open class toggle
 * that the hamburger button does. Falls back silently on desktop.
 */
(function () {
  'use strict';

  if (typeof window === 'undefined') return;
  if (!('ontouchstart' in window)) return;

  var EDGE_PX = 24;          // start zone from the left edge
  var TRIGGER_PX = 60;       // horizontal distance to commit
  var BAILOUT_VERT_PX = 50;  // if vertical movement > this, treat as scroll
  var MAX_DURATION_MS = 700;

  var hamburger, navMenu;
  var startX = 0, startY = 0, startT = 0;
  var tracking = false;
  var direction = null; // 'open' | 'close'

  function isMobile() {
    if (!hamburger) return false;
    return window.getComputedStyle(hamburger).display !== 'none';
  }

  function isOpen() {
    return navMenu && navMenu.classList.contains('open');
  }

  function shouldIgnoreTarget(t) {
    if (!t || !(t instanceof Element)) return false;
    if (t.closest('[data-no-swipe]')) return true;
    if (t.closest('input, textarea, select, button, [contenteditable=""], [contenteditable="true"]')) {
      // Allow the hamburger itself
      if (hamburger && t.closest('#hamburger')) return false;
      return true;
    }
    // Don't intercept inside nav-dropdown or scrollable list inside open drawer.
    if (t.closest('.nav-dropdown')) return true;
    return false;
  }

  function onStart(e) {
    if (!isMobile()) return;
    if (e.touches.length !== 1) return;
    var touch = e.touches[0];
    if (shouldIgnoreTarget(e.target)) return;

    if (touch.clientX < EDGE_PX && !isOpen()) {
      tracking = true;
      direction = 'open';
    } else if (isOpen() && touch.clientX > EDGE_PX) {
      tracking = true;
      direction = 'close';
    } else {
      tracking = false;
      return;
    }

    startX = touch.clientX;
    startY = touch.clientY;
    startT = Date.now();
  }

  function onMove(e) {
    if (!tracking) return;
    var touch = e.touches[0];
    var dy = Math.abs(touch.clientY - startY);
    if (dy > BAILOUT_VERT_PX) {
      tracking = false;
    }
  }

  function fire(open) {
    if (!hamburger) return;
    // Only fire if the state would actually change.
    if (open && isOpen()) return;
    if (!open && !isOpen()) return;
    // Synthesize a click on the hamburger so we share its open/close path.
    hamburger.click();
  }

  function onEnd(e) {
    if (!tracking) return;
    var touch = (e.changedTouches && e.changedTouches[0]) || null;
    var dur = Date.now() - startT;
    tracking = false;
    if (!touch || dur > MAX_DURATION_MS) return;
    var dx = touch.clientX - startX;
    if (direction === 'open' && dx > TRIGGER_PX) {
      fire(true);
    } else if (direction === 'close' && dx < -TRIGGER_PX) {
      fire(false);
    }
  }

  function onCancel() {
    tracking = false;
  }

  function init() {
    hamburger = document.getElementById('hamburger');
    navMenu = document.getElementById('nav-menu');
    if (!hamburger || !navMenu) return;
    var opts = { passive: true };
    document.addEventListener('touchstart', onStart, opts);
    document.addEventListener('touchmove', onMove, opts);
    document.addEventListener('touchend', onEnd, opts);
    document.addEventListener('touchcancel', onCancel, opts);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
