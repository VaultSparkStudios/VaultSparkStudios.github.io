/* vault-rank-bar.js — ambient rank progress bar for signed-in members.
 *
 * Renders a 2px gradient bar at the very bottom of the viewport showing
 * progress to the next Vault rank. Subtle — no UI surface, no banner.
 * Visible only when signed in. Hides at max rank (The Sparked / 5000+).
 *
 * Listens for vs:session-ready from signed-in-state.js (no extra auth call).
 * Points data fetched from vault_members table on first sign-in per session.
 * Cached in sessionStorage to avoid re-querying across navigations.
 */
(function () {
  'use strict';

  var RANK_THRESHOLDS = [
    { title: 'Spark Initiate', min: 0,    next: 50 },
    { title: 'Vault Runner',   min: 50,   next: 100 },
    { title: 'Rift Scout',     min: 100,  next: 200 },
    { title: 'Vault Guard',    min: 200,  next: 400 },
    { title: 'Vault Breacher', min: 400,  next: 800 },
    { title: 'Void Operative', min: 800,  next: 1500 },
    { title: 'Vault Keeper',   min: 1500, next: 2500 },
    { title: 'Forge Master',   min: 2500, next: 5000 },
    { title: 'The Sparked',    min: 5000, next: null },
  ];

  var STORAGE_KEY = 'vs-rank-bar-data';
  var BAR_ID = 'vs-rank-bar';
  var barEl = null;

  function getRankProgress(points) {
    var p = Number(points) || 0;
    for (var i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
      if (p >= RANK_THRESHOLDS[i].min) {
        var tier = RANK_THRESHOLDS[i];
        if (tier.next === null) return { pct: 100, rank: tier.title, maxed: true };
        var pct = Math.min(100, Math.round(((p - tier.min) / (tier.next - tier.min)) * 100));
        return { pct: pct, rank: tier.title, next: RANK_THRESHOLDS[i + 1].title, maxed: false };
      }
    }
    return { pct: 0, rank: 'Spark Initiate', next: 'Vault Runner', maxed: false };
  }

  function ensureBar() {
    if (barEl) return barEl;
    barEl = document.createElement('div');
    barEl.id = BAR_ID;
    barEl.setAttribute('aria-hidden', 'true');
    barEl.setAttribute('title', '');
    var style = document.createElement('style');
    style.textContent =
      '#vs-rank-bar{position:fixed;bottom:0;left:0;height:2px;background:var(--vs-gold,#ffc400);' +
      'width:0%;transition:width 1.4s cubic-bezier(.25,.8,.25,1);z-index:9999;pointer-events:none;}' +
      '#vs-rank-bar.vs-rank-bar--ready{opacity:1;}' +
      '#vs-rank-bar.vs-rank-bar--maxed{background:linear-gradient(90deg,#ffc400,#ff7a00);}' +
      // WCAG 2.3.3 — motion-sensitive visitors get the bar at its final width with no sweep.
      '@media(prefers-reduced-motion:reduce){#vs-rank-bar{transition:none;}}';
    document.head.appendChild(style);
    document.body.appendChild(barEl);
    return barEl;
  }

  function renderBar(data) {
    if (!data || data.pct === undefined) return;
    var bar = ensureBar();
    bar.setAttribute('title', data.maxed
      ? 'Rank: The Sparked — max rank'
      : ('Rank progress: ' + data.rank + ' → ' + (data.next || '') + ' (' + data.pct + '%)'));
    if (data.maxed) {
      bar.classList.add('vs-rank-bar--maxed');
    }
    // Defer width set by a frame so the CSS transition fires.
    requestAnimationFrame(function () {
      bar.classList.add('vs-rank-bar--ready');
      bar.style.width = (data.pct || 0) + '%';
    });
  }

  function getCached() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) { return null; }
  }

  function setCache(data) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (_) {}
  }

  async function fetchAndRender(userId) {
    // Check session cache first (avoids re-query on same-session navigations).
    var cached = getCached();
    if (cached && cached.userId === userId) {
      renderBar(cached);
      return;
    }
    try {
      var sb = window.VSSupabase;
      if (!sb) return;
      var res = await sb.from('vault_members').select('points, rank_name').eq('id', userId).maybeSingle();
      if (!res || !res.data) return;
      var points = Number(res.data.points) || 0;
      var progress = getRankProgress(points);
      var data = { userId: userId, pct: progress.pct, rank: progress.rank, next: progress.next, maxed: progress.maxed };
      setCache(data);
      renderBar(data);
    } catch (_) { /* silent */ }
  }

  document.addEventListener('vs:session-ready', function (e) {
    var detail = (e && e.detail) || {};
    if (!detail.signedIn) return;
    var session = detail.session;
    var userId = session && (session.userId || (session.raw && session.raw.user && session.raw.user.id));
    if (!userId) return;
    // Defer to idle to avoid LCP competition.
    if ('requestIdleCallback' in window) {
      requestIdleCallback(function () { fetchAndRender(userId); }, { timeout: 3000 });
    } else {
      setTimeout(function () { fetchAndRender(userId); }, 2000);
    }
  });
})();
