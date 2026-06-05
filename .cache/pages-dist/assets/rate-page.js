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
  var REACTIONS = [
    { id: 'useful', label: '😍', aria: 'Useful' },
    { id: 'ok', label: '😐', aria: 'Just okay' },
    { id: 'not_useful', label: '😢', aria: 'Not useful' },
  ];

  function pathKey() { return window.location.pathname.replace(/\/$/, '') || '/'; }

  function loadStore() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      var d = raw ? JSON.parse(raw) : {};
      return (d && typeof d === 'object') ? d : {};
    } catch { return {}; }
  }

  function saveStore(store) {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch {}
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
      return !res || !res.error;
    } catch { return false; }
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

    box.addEventListener('click', async function (e) {
      var btn = e.target && e.target.closest && e.target.closest('.vs-rate-page__btn');
      if (!btn) return;
      var reaction = btn.dataset.reaction;
      box.querySelectorAll('.vs-rate-page__btn').forEach(function (b) { b.classList.remove('vs-rate-page__btn--active'); });
      btn.classList.add('vs-rate-page__btn--active');

      var payload = {
        path: pathKey(),
        reaction: reaction,
        visit_depth_bucket: visitDepthBucket(),
        ua_kind: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      };
      var store = loadStore();
      store[pathKey()] = { at: Date.now(), reaction: reaction, replayed: false };
      saveStore(store);

      var sent = await postToSupabase(payload);
      if (!sent) {
        store[pathKey()].pendingPayload = payload;
        saveStore(store);
      }

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
    var store = loadStore();
    var entries = Object.entries(store);
    for (var i = 0; i < entries.length; i++) {
      var key = entries[i][0];
      var entry = entries[i][1];
      if (!entry || !entry.pendingPayload) continue;
      var ok = await postToSupabase(entry.pendingPayload);
      if (ok) {
        delete entry.pendingPayload;
        store[key] = entry;
      }
    }
    saveStore(store);
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

  function ready() {
    if (shouldSkip()) return;
    if (recentlyRated(loadStore())) {
      // Already rated this page in last 24h — don't bug the user. Try to flush pending.
      replayPending();
      return;
    }
    if (document.querySelector('.vs-rate-page')) return; // idempotent

    var refs = build();
    document.body.appendChild(refs.box);
    bind(refs);

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
