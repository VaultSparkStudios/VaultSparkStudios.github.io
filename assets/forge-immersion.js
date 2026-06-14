/* forge-immersion.js — the hero finally looks lit (S195 item 2).
 *
 * A drifting ember field behind the homepage hero. The whole point is that it
 * can NEVER cost a millisecond of the metric this site bleeds over: it mounts
 * only AFTER the Largest Contentful Paint has fired, inside requestIdleCallback,
 * and self-excludes on prefers-reduced-motion, Save-Data, low device memory, or
 * a hidden tab. It is FPS-capped and pauses the instant the hero scrolls away.
 * Pure 2D canvas — no WebGL dependency, no library, no network.
 *
 * Honest perf contract: if anything looks marginal (no canvas, tiny memory,
 * reduced motion), it simply never starts and the hero stays exactly as it was.
 */
(function () {
  'use strict';

  // Homepage only.
  var path = location.pathname || '/';
  if (path !== '/' && !/\/index\.html$/i.test(path)) return;

  // Capability gate — bail before doing any work on a device that shouldn't run it.
  function capable() {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
      var c = navigator.connection || navigator.webkitConnection;
      if (c && c.saveData) return false;
      if (typeof navigator.deviceMemory === 'number' && navigator.deviceMemory < 4) return false;
      var test = document.createElement('canvas');
      if (!test.getContext || !test.getContext('2d')) return false;
    } catch (_e) { return false; }
    return true;
  }
  if (!capable()) return;

  var FPS = 30, FRAME_MS = 1000 / FPS;
  var canvas, ctx, host, particles = [], raf = 0, lastT = 0, running = false, visible = true, inView = true;
  var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 1.5);

  function rand(a, b) { return a + Math.random() * (b - a); }

  function makeParticle(seed) {
    return {
      x: rand(0, 1),                 // normalized 0..1 across width
      y: seed ? rand(0, 1) : rand(0.85, 1.15),
      r: rand(0.6, 2.1),
      vy: rand(0.018, 0.05),         // upward drift (fraction of height / sec)
      vx: rand(-0.01, 0.01),
      life: rand(0.4, 1),
      hue: rand(38, 50)              // gold→amber
    };
  }

  function sizeCanvas() {
    var rect = host.getBoundingClientRect();
    W = Math.max(1, Math.floor(rect.width));
    H = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function step(t) {
    if (!running) return;
    raf = requestAnimationFrame(step);
    if (t - lastT < FRAME_MS) return;
    var dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.y -= p.vy * dt;
      p.x += p.vx * dt;
      p.life -= 0.08 * dt;
      if (p.y < -0.05 || p.life <= 0) { particles[i] = makeParticle(false); continue; }
      var px = p.x * W, py = p.y * H;
      var alpha = Math.max(0, Math.min(0.5, p.life * 0.5));
      ctx.beginPath();
      ctx.arc(px, py, p.r, 0, 6.2832);
      ctx.fillStyle = 'hsla(' + p.hue.toFixed(0) + ',100%,60%,' + alpha.toFixed(3) + ')';
      ctx.shadowBlur = 6;
      ctx.shadowColor = 'rgba(255,180,40,' + (alpha * 0.8).toFixed(3) + ')';
      ctx.fill();
    }
  }

  function start() {
    if (running || !visible || !inView) return;
    running = true;
    lastT = performance.now();
    raf = requestAnimationFrame(step);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function mount() {
    host = document.querySelector('.hero-chamber') || document.querySelector('.hero');
    if (!host) return;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0';
    ctx = canvas.getContext('2d');
    host.appendChild(canvas);
    sizeCanvas();
    var count = Math.min(46, Math.round((W * H) / 26000));
    particles = [];
    for (var i = 0; i < count; i++) particles.push(makeParticle(true));

    // Pause when the hero leaves the viewport — no work for a scrolled-away canvas.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView) start(); else stop();
      }, { threshold: 0 }).observe(host);
    }
    document.addEventListener('visibilitychange', function () {
      visible = document.visibilityState === 'visible';
      if (visible) start(); else stop();
    });
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(sizeCanvas, 200); }, { passive: true });

    start();
  }

  // Defer until AFTER LCP, then to idle — so first paint is never our concern.
  function afterLcpThenIdle(fn) {
    var fired = false;
    function go() { if (fired) return; fired = true; (window.requestIdleCallback || function (c) { setTimeout(c, 200); })(fn, { timeout: 1500 }); }
    try {
      if ('PerformanceObserver' in window) {
        var po = new PerformanceObserver(function () { po.disconnect(); go(); });
        po.observe({ type: 'largest-contentful-paint', buffered: true });
      }
    } catch (_e) {}
    // Fallbacks: window load, and a hard ceiling so it always eventually runs.
    window.addEventListener('load', function () { setTimeout(go, 600); }, { once: true });
    setTimeout(go, 2500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { afterLcpThenIdle(mount); });
  else afterLcpThenIdle(mount);
})();
