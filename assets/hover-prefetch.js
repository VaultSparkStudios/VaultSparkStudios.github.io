/**
 * hover-prefetch.js — Predictive prefetch on hover-intent.
 *
 * Complements `<script type=speculationrules>` (which prerenders HTML on
 * eagerness=moderate) by pre-fetching the JSON shards that pages hydrate
 * from: api/public-intelligence.json, api/heartbeat.json,
 * api/founder-presence.json, api/vault-narrative.json. Pages that depend on
 * those shards (Studio Pulse, homepage heartbeat, /journal/dispatches/,
 * /studio-pulse/) become near-instant on first interaction.
 *
 * Intent debounce: 80ms hover before prefetch fires — filters glancing
 * mouseovers and respects mobile (no hover events).
 *
 * Cost: each shard fetches via `fetch(url, { priority: 'low' })` which
 * lives in the network cache for the next navigation. Idempotent — once a
 * shard is fetched for a hover target, we don't re-fetch in this session.
 */
(function () {
  'use strict';

  if (typeof window === 'undefined' || !('fetch' in window)) return;
  // Conservative — only run if the user actually has hover capability.
  if (window.matchMedia && !window.matchMedia('(hover: hover)').matches) return;
  // Skip on Save-Data / metered connections.
  var conn = navigator.connection || navigator.mozConnection;
  if (conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || ''))) return;

  // hover target → JSON shards to warm up
  var TARGETS = {
    '/studio-pulse/':       ['/api/public-intelligence.json', '/api/heartbeat.json'],
    '/journal/':            ['/api/vault-narrative.json'],
    '/journal/dispatches/': ['/api/vault-narrative-history.json'],
    '/changelog/':          ['/api/public-intelligence.json'],
    '/community/':          ['/api/founder-presence.json'],
    '/leaderboards/':       ['/api/leaderboard/v1/global.json'],
    '/ranks/':              ['/api/public-intelligence.json'],
  };

  var fetched = new Set();

  function warm(urls) {
    urls.forEach(function (u) {
      if (fetched.has(u)) return;
      fetched.add(u);
      try {
        fetch(u, { credentials: 'omit', priority: 'low' }).catch(function () {});
      } catch (_) {}
    });
  }

  var pending = new WeakMap();

  function onEnter(ev) {
    var a = ev.currentTarget;
    var href = a && a.getAttribute('href');
    if (!href) return;
    var shards = TARGETS[href];
    if (!shards) return;
    if (pending.has(a)) return;
    var t = setTimeout(function () {
      pending.delete(a);
      warm(shards);
    }, 80);
    pending.set(a, t);
  }

  function onLeave(ev) {
    var a = ev.currentTarget;
    var t = pending.get(a);
    if (t) {
      clearTimeout(t);
      pending.delete(a);
    }
  }

  function bind() {
    Object.keys(TARGETS).forEach(function (path) {
      document.querySelectorAll('a[href="' + path + '"]').forEach(function (a) {
        if (a.dataset.hpBound === '1') return;
        a.dataset.hpBound = '1';
        a.addEventListener('mouseenter', onEnter);
        a.addEventListener('mouseleave', onLeave);
        a.addEventListener('focus', function () { warm(TARGETS[path]); }, { once: true });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
  // Late-mounted nav (PWA shell, hub) — re-bind once on first interactive scroll.
  window.addEventListener('load', bind, { once: true });
})();
