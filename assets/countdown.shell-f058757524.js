/* ============================================================
   VaultSpark Studios — Countdown Timer Widget
   Finds [data-countdown-target] elements and runs live countdowns.
   ~1.5 KB minified.
   ============================================================ */
(function () {
  'use strict';

  var GLITCH_CHARS = '!@#$%&?*0123456789ABCDEF';
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function pad(n, len) {
    var s = String(n);
    while (s.length < len) s = '0' + s;
    return s;
  }

  function updateCountdown(wrap) {
    var target = wrap.getAttribute('data-countdown-target');
    var display = wrap.querySelector('.countdown-display');
    if (!display) return;

    // Classified mode — no real date
    if (!target || target === 'classified') {
      renderClassified(display, wrap);
      return;
    }

    var targetDate = new Date(target).getTime();
    var now = Date.now();
    var diff = targetDate - now;

    if (diff <= 0) {
      renderComplete(display, wrap);
      return;
    }

    var days = Math.floor(diff / 86400000);
    var hours = Math.floor((diff % 86400000) / 3600000);
    var minutes = Math.floor((diff % 3600000) / 60000);
    var seconds = Math.floor((diff % 60000) / 1000);

    setUnit(display, 'days', pad(days, 3));
    setUnit(display, 'hours', pad(hours, 2));
    setUnit(display, 'minutes', pad(minutes, 2));
    setUnit(display, 'seconds', pad(seconds, 2));
  }

  function setUnit(display, unit, value) {
    var el = display.querySelector('[data-unit="' + unit + '"]');
    if (el) el.textContent = value;
  }

  function renderComplete(display, wrap) {
    var units = display.querySelectorAll('.countdown-unit');
    for (var i = 0; i < units.length; i++) units[i].style.display = 'none';

    if (!display.querySelector('.countdown-complete')) {
      var msg = document.createElement('div');
      msg.className = 'countdown-complete';
      msg.textContent = 'AVAILABLE NOW';
      display.appendChild(msg);
    }
    wrap._done = true;
  }

  function renderClassified(display, wrap) {
    if (reducedMotion) {
      setUnit(display, 'days', '???');
      setUnit(display, 'hours', '??');
      setUnit(display, 'minutes', '??');
      setUnit(display, 'seconds', '??');
      return;
    }

    // Glitch effect: randomize characters
    var units = ['days', 'hours', 'minutes', 'seconds'];
    var lengths = [3, 2, 2, 2];
    for (var i = 0; i < units.length; i++) {
      var el = display.querySelector('[data-unit="' + units[i] + '"]');
      if (!el) continue;
      var str = '';
      for (var j = 0; j < lengths[i]; j++) {
        str += GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
      }
      el.textContent = str;
    }
  }

  function init() {
    var wraps = document.querySelectorAll('[data-countdown-target]');
    if (!wraps.length) return;

    // Initial render
    for (var i = 0; i < wraps.length; i++) updateCountdown(wraps[i]);

    // Tick every second (or every 2s for classified with reduced motion)
    setInterval(function () {
      for (var i = 0; i < wraps.length; i++) {
        if (!wraps[i]._done) updateCountdown(wraps[i]);
      }
    }, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
