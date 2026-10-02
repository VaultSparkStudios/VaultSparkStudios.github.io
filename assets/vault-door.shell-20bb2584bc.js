/*
 * vault-door.js — progressive enhancement for the homepage Vault Door (#vault-door).
 *
 * The door is pure SVG + CSS. Its static (no-JS) state is the final, open
 * state, so the section is readable without this file. This script only:
 *   1. arms an IntersectionObserver fallback (class toggle + CSS transitions)
 *      on browsers without CSS scroll-driven animations (animation-timeline);
 *   2. starts a tiny canvas spark layer after idle, only while the stage is
 *      on screen and the tab is visible.
 * Both are skipped entirely under prefers-reduced-motion or the site's own
 * reduced-motion preference (data-motion="reduced").
 *
 * Never touches layout: the stage reserves its size in CSS (aspect-ratio), and
 * everything here animates transform/opacity or paints into that box.
 */
(function () {
  'use strict';
  var root = document.getElementById('vault-door');
  if (!root) return;
  var stage = root.querySelector('.vd-stage');
  if (!stage) return;

  var doc = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reducedMotion() {
    return (mq && mq.matches) || doc.dataset.motion === 'reduced' ||
      (document.body && document.body.dataset.motion === 'reduced');
  }
  if (reducedMotion()) return;

  var scrollDriven = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()'));

  // ── 1. IntersectionObserver fallback ─────────────────────────────────────
  if (!scrollDriven && 'IntersectionObserver' in window) {
    // Only arm (close the door) while it is still off screen below the fold,
    // so a visitor never sees an open door snap shut.
    var rect = stage.getBoundingClientRect();
    if (rect.top > window.innerHeight) {
      root.classList.add('vd-armed');
      var openIO = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            root.classList.add('vd-open');
            openIO.disconnect();
            return;
          }
        }
      }, { threshold: 0.45 });
      openIO.observe(stage);
    }
  }

  // ── 2. Spark layer (decorative, after idle, only while visible) ──────────
  var canvas = stage.querySelector('.vd-sparks');
  if (!canvas || !canvas.getContext) return;

  var idle = window.requestIdleCallback || function (cb) { return setTimeout(cb, 1200); };
  idle(function () {
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var w = 0, h = 0, dpr = 1, raf = 0, visible = false, color = '255,196,0';
    var sparks = [];
    var MAX = 34;

    function readColor() {
      var c = getComputedStyle(root).getPropertyValue('--vd-spark-rgb').trim();
      if (c) color = c;
    }
    function size() {
      var r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = Math.max(1, Math.round(r.width));
      h = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function spawn() {
      // Sparks rise from the seam of the door (centre-left) like light leaking out.
      var a = Math.random() * Math.PI * 2;
      var rad = w * (0.18 + Math.random() * 0.2);
      return {
        x: w / 2 + Math.cos(a) * rad,
        y: h / 2 + Math.sin(a) * rad,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -(0.15 + Math.random() * 0.45),
        life: 0,
        max: 90 + Math.random() * 120,
        r: 0.6 + Math.random() * 1.4
      };
    }
    function frame() {
      raf = 0;
      if (!visible || document.hidden) return;
      ctx.clearRect(0, 0, w, h);
      if (sparks.length < MAX && Math.random() < 0.35) sparks.push(spawn());
      for (var i = sparks.length - 1; i >= 0; i--) {
        var s = sparks[i];
        s.life++;
        s.x += s.vx;
        s.y += s.vy;
        var t = s.life / s.max;
        if (t >= 1) { sparks.splice(i, 1); continue; }
        var alpha = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + color + ',' + (alpha * 0.85).toFixed(3) + ')';
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }
    function start() { if (!raf) raf = requestAnimationFrame(frame); }

    readColor();
    size();
    var io = new IntersectionObserver(function (entries) {
      visible = entries[0] && entries[0].isIntersecting;
      if (visible) start();
    }, { threshold: 0.05 });
    io.observe(canvas);
    document.addEventListener('visibilitychange', function () { if (!document.hidden && visible) start(); });
    if ('ResizeObserver' in window) new ResizeObserver(size).observe(canvas);
    // Theme changes swap the spark colour without a reload.
    if ('MutationObserver' in window && document.body) {
      new MutationObserver(readColor).observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    }
    if (mq && mq.addEventListener) {
      mq.addEventListener('change', function () {
        if (mq.matches) { visible = false; ctx.clearRect(0, 0, w, h); io.disconnect(); }
      });
    }
  });
})();
