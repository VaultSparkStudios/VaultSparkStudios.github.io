/*
 * after-paint.js — runs the scripts a page parks in <template data-after-paint>
 * once the first frame is on screen.
 *
 * A page keeps its ordinary <script src defer> tags, wrapped in the template.
 * Template content is inert, so nothing inside it is fetched or executed during
 * the load, and every tool that reads script tags from the HTML (fingerprint
 * rewriting, reference resolution, the service-worker list) still sees them.
 * This file re-creates each one in document order after the page has loaded and
 * a frame has been presented, or at the visitor's first interaction, whichever
 * comes first; five seconds after it runs at the latest. Only for scripts that
 * change nothing above the fold, measure nothing from page start, and
 * initialise correctly when they run after DOMContentLoaded.
 */
(function () {
  'use strict';

  // A second copy on the page must not run every parked script twice.
  if (window.VSAfterPaint) return;

  var templates = document.querySelectorAll('template[data-after-paint]');
  var state = { started: false, done: false };
  window.VSAfterPaint = state;

  // A reaction tapped before its parked script exists would start the load and
  // then go nowhere, with nothing to tell the reader. Keep the most recent such
  // tap for each bar and deliver it once the parked scripts have run.
  // The listener sits at the end of the bubble path on purpose: the reactions
  // script cancels the default of every tap it handles, so a cancelled tap was
  // already delivered and must not be sent again (a second delivery of the
  // same button takes the vote back).
  var REPLAY = '[data-desk-reactions] [data-reaction]';
  var early = [];
  function remember(event) {
    var button = event.target && event.target.closest ? event.target.closest(REPLAY) : null;
    if (!button) return;
    var bar = button.closest('[data-desk-reactions]');
    var at = -1;
    for (var i = 0; i < early.length; i++) if (early[i].bar === bar) at = i;
    if (event.defaultPrevented) {
      // Handled by the live script; it also supersedes any earlier tap on this bar.
      if (at !== -1) early.splice(at, 1);
      return;
    }
    if (at !== -1) early[at].button = button;
    else early.push({ bar: bar, button: button });
  }

  function finish() {
    if (state.done) return;
    state.done = true;
    document.removeEventListener('click', remember);
    document.dispatchEvent(new Event('vs:after-paint'));
    for (var i = 0; i < early.length; i++) {
      try { if (early[i].button.isConnected) early[i].button.click(); } catch (_e) { /* skipped */ }
    }
    early = [];
  }

  if (!templates.length) { finish(); return; }
  document.addEventListener('click', remember);

  // script.src is a TrustedScriptURL sink. Same narrow pattern as the homepage
  // idle loader: same-origin /assets/ paths only. No-op when TT is absent.
  var ttPolicy = null;
  try {
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
      ttPolicy = window.trustedTypes.createPolicy('vs-after-paint', {
        createScriptURL: function (u) { return u.indexOf('/assets/') === 0 ? u : ''; },
      });
    }
  } catch (_e) { /* duplicate policy name or restricted — fall through */ }

  function parked() {
    var out = [];
    for (var i = 0; i < templates.length; i++) {
      var found = templates[i].content.querySelectorAll('script[src]');
      for (var j = 0; j < found.length; j++) out.push(found[j]);
    }
    return out;
  }

  function run() {
    var pending = 0;
    function settled() { if (--pending <= 0) finish(); }
    parked().forEach(function (source) {
      // One script that cannot be created must not stop the ones after it.
      try {
        var url = new URL(source.getAttribute('src'), document.baseURI);
        if (url.origin !== location.origin || url.pathname.indexOf('/assets/') !== 0) return;
        var path = url.pathname + url.search;
        var script = document.createElement('script');
        // async=false keeps execution in insertion order, as defer did.
        script.async = false;
        if (source.integrity) { script.integrity = source.integrity; script.crossOrigin = source.crossOrigin || 'anonymous'; }
        script.dataset.afterPaint = 'true';
        script.onload = settled;
        script.onerror = settled;
        script.src = ttPolicy ? ttPolicy.createScriptURL(path) : path;
        pending++;
        document.body.appendChild(script);
      } catch (_e) { /* skipped */ }
    });
    if (!pending) finish();
    // A request that never settles must not hold back whoever waits on us.
    else setTimeout(finish, 8000);
  }

  // Deferred scripts later in the document must run first, as they did when the
  // parked ones were plain deferred tags. They have all run by DOMContentLoaded.
  var domReady = document.readyState === 'complete';
  var wanted = false;
  function start() {
    if (state.started) return;
    if (!domReady) { wanted = true; return; }
    state.started = true;
    run();
  }
  function onDomReady() {
    if (domReady) return;
    domReady = true;
    if (wanted) start();
  }
  document.addEventListener('DOMContentLoaded', onDomReady, { once: true });
  window.addEventListener('load', onDomReady, { once: true });

  function afterFrame() {
    // Two animation frames: the second callback runs after a frame has been
    // produced, so the requests begin once content is visible.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 1500 });
        else setTimeout(start, 1);
      });
    });
  }

  if (document.readyState === 'complete') afterFrame();
  else window.addEventListener('load', afterFrame, { once: true });

  ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(function (type) {
    window.addEventListener(type, start, { once: true, passive: true });
  });
  // Background tabs do not run animation frames; never leave the page without its scripts.
  setTimeout(start, 5000);
})();
