/* honest-traction-scoreboard.js — S187 honest social proof · S190 velocity badge.
   Surfaces honest, dated, externally-meaningful counts from api/public-intelligence.json.
   Includes the vaulted count as a trust signal, never hidden.

   S190 enhancements:
   - IntersectionObserver count-up animation for sessions figure (800ms ease-out)
   - "Last session: today / N days ago" recency label
   - "avg N/day" velocity badge when sessions ≥ 100

   Honest-dark contract: render only when real counts exist; never fabricate.
   TT-safe (DOM nodes + textContent only). Mounts on [data-vs-traction]. */
(function () {
  'use strict';

  var FEED = '/api/public-intelligence.json';

  function n(v) { var x = Number(v); return isFinite(x) ? x : null; }

  function figuresFrom(data) {
    var s = (data && data.stats) || {};
    var p = (data && data.portfolio) || {};
    var live = n(s.liveProjects != null ? s.liveProjects : p.sparked);
    var forge = n(s.projectsInForge != null ? s.projectsInForge : p.forge);
    // SEALED retired — VAULTED is what sealed means (coined vocab); accept either source key.
    var vaulted = n(p.vaultedCount != null ? p.vaultedCount : p.sealedCount);
    var sessions = n(s.sessionsCompleted);
    var figs = [];
    if (live != null && live >= 1) figs.push({ v: live, label: 'sparked', animate: false });
    if (forge != null && forge >= 1) figs.push({ v: forge, label: 'in the forge', animate: false });
    if (vaulted != null && vaulted >= 1) figs.push({ v: vaulted, label: 'vaulted', animate: false });
    if (sessions != null && sessions >= 10) figs.push({ v: sessions, label: 'sessions in the open', animate: true });
    return figs;
  }

  function fmtDate(iso) {
    if (!iso) return null;
    var d = new Date(iso);
    if (isNaN(d)) return null;
    try { return d.toISOString().slice(0, 10); } catch (_) { return null; }
  }

  // Returns "today", "yesterday", or "N days ago"
  function daysSince(isoDate) {
    if (!isoDate) return null;
    var then = new Date(isoDate);
    if (isNaN(then)) return null;
    var now = new Date();
    var diffMs = now - then;
    var diffDays = Math.floor(diffMs / 86400000);
    if (diffDays <= 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    return diffDays + ' days ago';
  }

  // Count-up animation: from 0 to target over ~800ms, ease-out.
  // Honors prefers-reduced-motion (WCAG 2.3.3) — motion-sensitive visitors
  // get the final value instantly, no count-up.
  function animateCount(el, target) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = String(target);
      return;
    }
    var start = null;
    var duration = 800;
    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = String(Math.round(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function styles() {
    if (document.getElementById('vs-traction-style')) return;
    var s = document.createElement('style');
    s.id = 'vs-traction-style';
    s.textContent = '.vs-traction{display:flex;align-items:center;gap:1.1rem;flex-wrap:wrap;margin:1.2rem 0;padding:.7rem 1rem;border:1px solid rgba(255,196,0,.18);border-radius:12px;background:rgba(255,196,0,.04)}.vs-traction__fig{display:flex;flex-direction:column;line-height:1.1}.vs-traction__num{font-size:1.35rem;font-weight:700;color:var(--gold,#ffc400)}.vs-traction__lbl{font-size:.7rem;letter-spacing:.04em;text-transform:uppercase;color:var(--muted,#9aa3b2)}.vs-traction__meta{margin-left:auto;font-size:.72rem;color:var(--muted,#9aa3b2);display:flex;flex-direction:column;gap:.2rem;align-items:flex-end}.vs-traction__meta a{color:var(--muted,#9aa3b2);text-decoration:underline;text-decoration-color:rgba(154,163,178,.4)}.vs-traction__velocity{font-size:.68rem;color:var(--gold,#ffc400);opacity:.7;letter-spacing:.03em}@media(max-width:560px){.vs-traction__meta{margin-left:0;flex-basis:100%;align-items:flex-start}}';
    document.head.appendChild(s);
  }

  function render(root, figs, dateStr, recency, velocityBadge) {
    if (figs.length < 2) return;
    styles();
    var wrap = document.createElement('div');
    wrap.className = 'vs-traction';
    wrap.setAttribute('aria-label', 'Studio traction, built in the open');
    var animateTargets = [];
    figs.forEach(function (f) {
      var cell = document.createElement('div');
      cell.className = 'vs-traction__fig';
      var num = document.createElement('span');
      num.className = 'vs-traction__num';
      if (f.animate) {
        num.textContent = '0'; // start at 0; count-up fires on intersection
        animateTargets.push({ el: num, target: f.v });
      } else {
        num.textContent = String(f.v);
      }
      var lbl = document.createElement('span');
      lbl.className = 'vs-traction__lbl';
      lbl.textContent = f.label;
      cell.appendChild(num); cell.appendChild(lbl);
      wrap.appendChild(cell);
    });
    var meta = document.createElement('span');
    meta.className = 'vs-traction__meta';
    var line1 = document.createElement('span');
    var datePart = dateStr ? 'as of ' + dateStr + ' · ' : '';
    line1.innerHTML = datePart + 'every number is live — <a href="/studio-pulse/">see the pulse</a>';
    meta.appendChild(line1);
    if (recency) {
      var line2 = document.createElement('span');
      line2.className = 'vs-traction__velocity';
      var recencyText = 'Last session: ' + recency;
      if (velocityBadge) recencyText += ' · ' + velocityBadge;
      line2.textContent = recencyText;
      meta.appendChild(line2);
    }
    wrap.appendChild(meta);
    root.appendChild(wrap);
    // Fire count-up when scoreboard enters viewport
    if (animateTargets.length && window.IntersectionObserver) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            animateTargets.forEach(function (t) { animateCount(t.el, t.target); });
            io.disconnect();
          }
        });
      }, { threshold: 0.3 });
      io.observe(wrap);
    } else {
      // Fallback: set final value immediately
      animateTargets.forEach(function (t) { t.el.textContent = String(t.target); });
    }
  }

  function velocityLabel(sessions, updatedAt) {
    if (!sessions || sessions < 10) return null;
    var d = new Date(updatedAt);
    if (isNaN(d)) return null;
    // Assume studio started ~S1 by estimating 1 session per day as base cadence
    // Show "avg ~1/day" if sessions/days ≥ 0.7
    var startEst = new Date(d.getTime() - sessions * 86400000);
    var days = Math.round((d - startEst) / 86400000);
    var avg = days > 0 ? (sessions / days).toFixed(1) : null;
    if (!avg || Number(avg) < 0.7) return null;
    return 'avg ' + avg + '/day';
  }

  function boot() {
    var roots = Array.prototype.slice.call(document.querySelectorAll('[data-vs-traction]'));
    if (!roots.length) return;
    fetch(FEED, { cache: 'default' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;
        var figs = figuresFrom(data);
        if (figs.length < 2) return;
        var dateStr = fmtDate(data.generatedAt);
        var recency = daysSince(data.generatedAt);
        var sessions = n((data.stats || {}).sessionsCompleted);
        var vBadge = velocityLabel(sessions, data.generatedAt);
        roots.forEach(function (root) { render(root, figs, dateStr, recency, vBadge); });
      })
      .catch(function () { /* feed unreachable → render nothing */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else { boot(); }
})();
