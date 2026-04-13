// scroll-depth.js — GA4 scroll-depth milestone tracking
// Fires gtag scroll_milestone events at 25 / 50 / 75 / 100% of page height.
// Sentinels are created dynamically — no HTML changes required.
// CSP-safe: no eval, no new Function, no inline handlers.

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {

    // Guard: GA4 gtag must be available (may not be on ad-blocked sessions).
    // We define a safe wrapper so the rest of the code stays clean.
    function fireEvent(percent) {
      try {
        if (typeof gtag === 'function') {
          gtag('event', 'scroll_milestone', { percent: percent });
        }
      } catch (e) {
        // Silently swallow — analytics failure must never break page behaviour.
      }
    }

    // Guard: IntersectionObserver must be supported (all modern browsers).
    if (!window.IntersectionObserver) {
      return;
    }

    var MILESTONES = [25, 50, 75, 100];

    // Track which milestones have already fired so each fires at most once.
    var fired = new Set ? new Set() : (function () {
      // Minimal polyfill for environments without Set (extremely rare).
      var store = [];
      return {
        has: function (v) { return store.indexOf(v) !== -1; },
        add: function (v) { store.push(v); }
      };
    }());

    // Insert invisible sentinel divs at 25 / 50 / 75 / 100% of document height.
    // We append them to <body> so they don't disturb layout flow.
    // They are positioned absolutely relative to the document.
    function createSentinels() {
      // Use scrollHeight of <body> as a proxy for document height at load time.
      // The 100% sentinel is placed 1px before the very bottom so it triggers
      // reliably even on pages whose height equals the viewport height.
      var docHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight
      );

      MILESTONES.forEach(function (pct) {
        var sentinel = document.createElement('div');
        sentinel.setAttribute('aria-hidden', 'true');
        sentinel.dataset.scrollMilestone = pct;

        // Position absolutely so the element doesn't affect layout.
        sentinel.style.cssText = [
          'position:absolute',
          'left:0',
          'width:1px',
          'height:1px',
          'pointer-events:none',
          'visibility:hidden',
          // For 100% pin 1px before the bottom so IntersectionObserver fires.
          'top:' + Math.min(Math.floor(docHeight * (pct / 100)), docHeight - 2) + 'px'
        ].join(';');

        document.body.appendChild(sentinel);
      });
    }

    // Make sure <body> is relatively positioned so absolute children work.
    // Only set if not already positioned — avoids clobbering sticky/fixed layouts.
    var bodyPos = window.getComputedStyle(document.body).position;
    if (bodyPos === 'static') {
      document.body.style.position = 'relative';
    }

    createSentinels();

    // Observe all sentinels. Fire the GA4 event once per milestone.
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        var pct = parseInt(entry.target.dataset.scrollMilestone, 10);
        if (isNaN(pct) || fired.has(pct)) return;

        fired.add(pct);
        fireEvent(pct);

        // Stop observing once fired — milestone is one-shot per page load.
        io.unobserve(entry.target);
      });
    }, {
      // threshold:0 fires as soon as 1px of the sentinel enters the viewport.
      threshold: 0,
      rootMargin: '0px'
    });

    var sentinels = document.querySelectorAll('[data-scroll-milestone]');
    sentinels.forEach(function (el) { io.observe(el); });

    // Note: prefers-reduced-motion has no impact on event firing — we still
    // track scroll depth regardless of motion preference (there are no
    // animations in this script). The guard is documented here for clarity:
    // var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Events fire unconditionally; only visual animations (none here) would
    // need to respect this preference.

  });

}());
