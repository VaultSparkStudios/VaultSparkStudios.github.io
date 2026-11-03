/**
 * rate-page — persistent "How's this page?" emoji feedback widget.
 *
 * Three reactions: 😍 useful · 😐 ok · 😢 not useful. One submission per page
 * per visitor (24h cooldown via localStorage). Submitted reactions are POSTed
 * to Supabase `page_feedback` table when VSSupabase is available; otherwise
 * cached locally and replayed on next visit.
 *
 * Mount: ambient-block on every page (skip portals + admin via the existing
 * propagate-nav portal filter). Self-mounting; idempotent.
 *
 * Privacy: no identifying data. We store path + reaction + timestamp + a
 * coarse-bucketed visit-depth (1, 2-4, 5-10, 10+) so the public insights
 * dashboard can show "second visits rate higher" without a tracking id.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'vs_rate_page_v1';
  var COOLDOWN_MS = 24 * 60 * 60 * 1000;
  var memoryStore = {};
  var storageAvailable = true;
  var pendingFlights = Object.create(null);
  var REACTIONS = [
    { id: 'useful', label: '😍', aria: 'Useful' },
    { id: 'ok', label: '😐', aria: 'Just okay' },
    { id: 'not_useful', label: '😢', aria: 'Not useful' },
  ];

  function pathKey() { return window.location.pathname.replace(/\/$/, '') || '/'; }

  function loadStore() {
    if (!storageAvailable) return memoryStore;
    var raw;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch { storageAvailable = false; return memoryStore; }
    try {
      var d = raw ? JSON.parse(raw) : {};
      memoryStore = (d && typeof d === 'object' && !Array.isArray(d)) ? d : {};
    } catch { memoryStore = {}; }
    return memoryStore;
  }

  function saveStore(store) {
    memoryStore = store;
    if (!storageAvailable) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }
    catch { storageAvailable = false; }
  }

  function recentlyRated(store) {
    var entry = store[pathKey()];
    if (!entry || !entry.at) return false;
    return (Date.now() - entry.at) < COOLDOWN_MS;
  }

  function visitDepthBucket() {
    try {
      var n = Number(window.localStorage.getItem('vs_visit_depth') || '1');
      if (!isFinite(n) || n <= 1) return '1';
      if (n <= 4) return '2-4';
      if (n <= 10) return '5-10';
      return '10+';
    } catch { return '1'; }
  }

  async function postToSupabase(payload) {
    try {
      var sb = window.VSSupabase;
      if (!sb || !sb.from) return false;
      var res = await sb.from('page_feedback').insert([payload]);
      return !!res && !res.error;
    } catch { return false; }
  }

  function samePending(current, expected) {
    return !!current && current.at === expected.at && current.reaction === expected.reaction &&
      !!current.pendingPayload && JSON.stringify(current.pendingPayload) === JSON.stringify(expected.pendingPayload);
  }

  async function sendPending(key, entry) {
    if (pendingFlights[key] || !samePending(loadStore()[key], entry)) return;
    pendingFlights[key] = true;
    try {
      if (!await postToSupabase(entry.pendingPayload)) return;
      // Another page/tab may have added or replaced records during this await.
      // Acknowledge only this pending entry, against the latest store.
      var current = loadStore();
      if (!samePending(current[key], entry)) return;
      delete current[key].pendingPayload;
      saveStore(current);
    } finally { delete pendingFlights[key]; }
  }

  function build() {
    var box = document.createElement('div');
    box.className = 'vs-rate-page';
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', 'Rate this page');

    var label = document.createElement('span');
    label.className = 'vs-rate-page__label';
    label.textContent = 'How\'s this page?';
    box.appendChild(label);

    REACTIONS.forEach(function (r) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'vs-rate-page__btn';
      b.setAttribute('aria-label', r.aria);
      b.dataset.reaction = r.id;
      b.textContent = r.label;
      box.appendChild(b);
    });

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'vs-rate-page__close';
    close.setAttribute('aria-label', 'Hide feedback widget');
    close.textContent = '×';
    box.appendChild(close);

    var expand = document.createElement('button');
    expand.type = 'button';
    expand.className = 'vs-rate-page__expand';
    expand.setAttribute('aria-label', 'Show feedback widget');
    expand.textContent = '?';
    box.appendChild(expand);

    return { box: box, close: close, expand: expand };
  }

  function bind(refs) {
    var box = refs.box;
    var close = refs.close;
    var expand = refs.expand;
    var admitted = false;

    box.addEventListener('click', async function (e) {
      var btn = e.target && e.target.closest && e.target.closest('.vs-rate-page__btn');
      if (!btn) return;
      var key = pathKey();
      var store = loadStore();
      if (admitted || recentlyRated(store) || (store[key] && store[key].pendingPayload)) return;
      // Admit synchronously, before any asynchronous insert or storage access
      // can allow a second click through. This also works without localStorage.
      admitted = true;
      var reaction = btn.dataset.reaction;
      box.querySelectorAll('.vs-rate-page__btn').forEach(function (b) { b.classList.remove('vs-rate-page__btn--active'); });
      btn.classList.add('vs-rate-page__btn--active');

      var payload = {
        path: pathKey(),
        reaction: reaction,
        visit_depth_bucket: visitDepthBucket(),
        ua_kind: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      };
      var entry = { at: Date.now(), reaction: reaction, replayed: false, pendingPayload: payload };
      // Keep the payload until the provider acknowledges it, including a page
      // navigation or close while its request is still in flight.
      store[key] = entry;
      saveStore(store);
      await sendPending(key, entry);

      // Brief thank-you, then collapse.
      box.classList.add('vs-rate-page--thanks');
      box.querySelector('.vs-rate-page__label').textContent = 'thank you ·';
      setTimeout(function () {
        box.dataset.collapsed = 'true';
        try { window.localStorage.setItem('vs_rate_page_collapsed', '1'); } catch {}
      }, 1200);
    });

    close.addEventListener('click', function () {
      box.dataset.collapsed = 'true';
      try { window.localStorage.setItem('vs_rate_page_collapsed', '1'); } catch {}
    });

    expand.addEventListener('click', function () {
      box.dataset.collapsed = 'false';
      try { window.localStorage.setItem('vs_rate_page_collapsed', '0'); } catch {}
    });
  }

  async function replayPending() {
    var entries = Object.entries(loadStore());
    for (var i = 0; i < entries.length; i++) {
      var key = entries[i][0];
      var entry = entries[i][1];
      if (!entry || !entry.pendingPayload) continue;
      await sendPending(key, entry);
    }
  }

  function shouldSkip() {
    // Skip on portals, admin, login, share landing — page-feedback is for content pages.
    var path = window.location.pathname;
    if (/^\/(?:vault-member|investor-portal|investor|studio-hub|admin|share|404)/.test(path)) return true;
    // Honor user dismissal via existing exit-intent decline state if present.
    try {
      if (window.localStorage.getItem('vs_rate_page_disabled') === '1') return true;
    } catch {}
    return false;
  }

  // S357 (audit P0-2): at 390px the fixed puck covered body copy on 104+
  // page-loads — a service row's name and its "Down" state on /status/, the
  // footer dispatch line elsewhere. Below 600px it now mounts IN THE FLOW at
  // the end of <main>, where it cannot overlap anything at any scroll
  // position; above that it stays floating and reserves its own space through
  // the overlay registry in assets/ambient-loader.js.
  function mountTarget() {
    var narrow = window.matchMedia && window.matchMedia('(max-width: 600px)').matches;
    if (!narrow) return { host: document.body, inline: false };
    var main = document.querySelector('main');
    if (!main) return { host: document.body, inline: false };
    return { host: main, inline: true };
  }

  function ready() {
    if (shouldSkip()) return;
    if (recentlyRated(loadStore())) {
      // Already rated this page in last 24h — don't bug the user. Try to flush pending.
      replayPending();
      return;
    }
    if (document.querySelector('.vs-rate-page')) return; // idempotent

    var refs = build();
    var target = mountTarget();
    if (target.inline) refs.box.classList.add('vs-rate-page--inline');
    target.host.appendChild(refs.box);
    bind(refs);

    if (!target.inline) {
      if (window.VSFloating && window.VSFloating.register) window.VSFloating.register(refs.box);
      // Stand down while a blocking overlay (cookie banner, tour, exit panel)
      // owns the screen — one floating surface at a time.
      if (document.documentElement.hasAttribute('data-vs-overlay-busy')) refs.box.dataset.collapsed = 'true';
    }

    try {
      if (window.localStorage.getItem('vs_rate_page_collapsed') === '1') {
        refs.box.dataset.collapsed = 'true';
      }
    } catch {}

    replayPending();
  }

  if (document.readyState !== 'loading') ready();
  else document.addEventListener('DOMContentLoaded', ready);
})();
