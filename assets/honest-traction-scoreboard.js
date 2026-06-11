/* honest-traction-scoreboard.js — S187 honest social proof.
   The competitive read: self-asserted internal scores (IGNIS/Cognition) read as
   marketing; what converts is HONEST, dated, externally-meaningful numbers —
   including what's paused. levels.io's most-copied pattern is "here's the real
   state, failures included." This surfaces ONE honest scoreboard sourced live
   from the deployed api/public-intelligence.json, including the sealed/vaulted
   count as a trust signal (not hidden).

   Honest-dark contract: render only when real counts exist; never fabricate.
   TT-safe (DOM nodes + textContent only). Mounts on [data-vs-traction]. */
(function () {
  'use strict';

  var FEED = '/api/public-intelligence.json';

  function n(v) { var x = Number(v); return isFinite(x) ? x : null; }

  // Build honest, externally-meaningful figures. Order = most concrete first.
  function figuresFrom(data) {
    var s = (data && data.stats) || {};
    var p = (data && data.portfolio) || {};
    var live = n(s.liveProjects != null ? s.liveProjects : p.sparked);
    var forge = n(s.projectsInForge != null ? s.projectsInForge : p.forge);
    var sealed = n(p.sealedCount);
    var sessions = n(s.sessionsCompleted);
    var figs = [];
    if (live != null && live >= 1) figs.push({ v: live, label: live === 1 ? 'live' : 'live' });
    if (forge != null && forge >= 1) figs.push({ v: forge, label: 'in the forge' });
    if (sealed != null && sealed >= 1) figs.push({ v: sealed, label: 'sealed' }); // honesty = trust
    if (sessions != null && sessions >= 10) figs.push({ v: sessions, label: 'sessions in the open' });
    return figs;
  }

  function fmtDate(iso) {
    if (!iso) return null;
    var d = new Date(iso);
    if (isNaN(d)) return null;
    try { return d.toISOString().slice(0, 10); } catch (_) { return null; }
  }

  function styles() {
    if (document.getElementById('vs-traction-style')) return;
    var s = document.createElement('style');
    s.id = 'vs-traction-style';
    s.textContent = '.vs-traction{display:flex;align-items:center;gap:1.1rem;flex-wrap:wrap;margin:1.2rem 0;padding:.7rem 1rem;border:1px solid rgba(255,196,0,.18);border-radius:12px;background:rgba(255,196,0,.04)}.vs-traction__fig{display:flex;flex-direction:column;line-height:1.1}.vs-traction__num{font-size:1.35rem;font-weight:700;color:var(--gold,#ffc400)}.vs-traction__lbl{font-size:.7rem;letter-spacing:.04em;text-transform:uppercase;color:var(--muted,#9aa3b2)}.vs-traction__meta{margin-left:auto;font-size:.72rem;color:var(--muted,#9aa3b2)}.vs-traction__meta a{color:var(--muted,#9aa3b2);text-decoration:underline;text-decoration-color:rgba(154,163,178,.4)}@media(max-width:560px){.vs-traction__meta{margin-left:0;flex-basis:100%}}';
    document.head.appendChild(s);
  }

  function render(root, figs, dateStr) {
    if (figs.length < 2) return; // floor: need real breadth, else honest-dark
    styles();
    var wrap = document.createElement('div');
    wrap.className = 'vs-traction';
    wrap.setAttribute('aria-label', 'Studio traction, built in the open');
    figs.forEach(function (f) {
      var cell = document.createElement('div');
      cell.className = 'vs-traction__fig';
      var num = document.createElement('span');
      num.className = 'vs-traction__num';
      num.textContent = String(f.v);
      var lbl = document.createElement('span');
      lbl.className = 'vs-traction__lbl';
      lbl.textContent = f.label;
      cell.appendChild(num); cell.appendChild(lbl);
      wrap.appendChild(cell);
    });
    var meta = document.createElement('span');
    meta.className = 'vs-traction__meta';
    var txt = document.createElement('span');
    txt.textContent = (dateStr ? 'as of ' + dateStr + ' · ' : '') + 'every number is live — ';
    meta.appendChild(txt);
    var a = document.createElement('a');
    a.href = '/studio-pulse/';
    a.textContent = 'see the pulse';
    meta.appendChild(a);
    wrap.appendChild(meta);
    root.appendChild(wrap);
  }

  function boot() {
    var roots = Array.prototype.slice.call(document.querySelectorAll('[data-vs-traction]'));
    if (!roots.length) return;
    fetch(FEED, { cache: 'default' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;
        var figs = figuresFrom(data);
        if (figs.length < 2) return; // honest-dark
        var dateStr = fmtDate(data.generatedAt);
        roots.forEach(function (root) { render(root, figs, dateStr); });
      })
      .catch(function () { /* feed unreachable → render nothing */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else { boot(); }
})();
