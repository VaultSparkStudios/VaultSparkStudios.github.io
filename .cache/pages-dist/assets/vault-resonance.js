/**
 * VaultSpark — Vault Resonance Score
 *
 * Tracks anonymous engagement signals (scroll depth, dwell, section views,
 * clicks) and computes a 0–100 "Resonance" score client-side. No PII collected.
 * Injects a live "Your Resonance" stat into the homepage proof rail.
 *
 * Score model:
 *   Scroll milestones  25 / 50 / 75 / 100 %  → 10 pts each  (max 40)
 *   Dwell              30s / 60s / 120s / 300s → 5 / 5 / 5 / 10 pts (max 25)
 *   Sections in view   per IntersectionObserver hit → 3 pts  (max 18)
 *   Meaningful clicks  first → 5 pts, each after → 2 pts      (max 17)
 *
 * Resonance labels:
 *   0–19   "—"           (not shown yet)
 *   20–39  "Signal Detected"
 *   40–59  "Resonant"
 *   60–79  "Deep Signal"
 *   80+    "Vault Sync"
 */
(function () {
  'use strict';

  if (typeof IntersectionObserver === 'undefined') return;

  var score = 0;
  var scrollHits = { 25: false, 50: false, 75: false, 100: false };
  var clickCount = 0;
  var sectionPts = 0;
  var MAX_SECTION_PTS = 18;

  var DWELL_MILESTONES = [30000, 60000, 120000, 300000];
  var DWELL_SCORES    = [5, 5, 5, 10];
  var dwellIdx = 0;

  var LABELS = [
    [80, 'Vault Sync'],
    [60, 'Deep Signal'],
    [40, 'Resonant'],
    [20, 'Signal Detected'],
  ];

  function label(s) {
    for (var i = 0; i < LABELS.length; i++) {
      if (s >= LABELS[i][0]) return LABELS[i][1];
    }
    return null;
  }

  // ── Stat injection ────────────────────────────────────────────────────
  var statEl = null;
  var statVal = null;
  var statLbl = null;
  var pulseEl = null;

  function ensureStat() {
    if (statEl) return;
    var rail = document.getElementById('vault-proof-inner');
    if (!rail) return;

    statEl = document.createElement('div');
    statEl.className = 'proof-stat';
    statEl.style.cssText = 'position:relative;';

    pulseEl = document.createElement('span');
    pulseEl.style.cssText = [
      'position:absolute;top:4px;right:4px;width:7px;height:7px;border-radius:50%;',
      'background:var(--gold,#d4af37);box-shadow:0 0 10px var(--gold,#d4af37);',
      'animation:vs-resonance-pulse 2.2s ease-in-out infinite;opacity:0;transition:opacity 0.4s;',
    ].join('');
    pulseEl.setAttribute('aria-hidden', 'true');

    if (!document.getElementById('vs-resonance-style')) {
      var sty = document.createElement('style');
      sty.id = 'vs-resonance-style';
      sty.textContent = '@keyframes vs-resonance-pulse{0%,100%{opacity:0.4;}50%{opacity:1;}}' +
        '@media(prefers-reduced-motion:reduce){.vs-resonance-anim{animation:none!important;}}';
      document.head.appendChild(sty);
      pulseEl.classList.add('vs-resonance-anim');
    }

    statVal = document.createElement('strong');
    statVal.id = 'proof-resonance-val';
    statVal.setAttribute('aria-live', 'polite');
    statVal.setAttribute('aria-label', 'Your vault resonance score');

    statLbl = document.createElement('span');
    statLbl.textContent = 'Your Resonance';

    statEl.appendChild(pulseEl);
    statEl.appendChild(statVal);
    statEl.appendChild(statLbl);

    // Insert before the "View Vault Wall" cell (last child)
    var last = rail.lastElementChild;
    rail.insertBefore(statEl, last);
  }

  function update() {
    var cap = Math.min(100, score);
    var lbl = label(cap);
    if (!lbl) return; // below display threshold

    ensureStat();
    if (!statVal) return;

    statVal.textContent = cap + ' · ' + lbl;
    if (pulseEl) pulseEl.style.opacity = cap >= 60 ? '1' : '0';
  }

  function add(pts) {
    score = Math.min(100, score + pts);
    update();
  }

  // ── Scroll depth ──────────────────────────────────────────────────────
  function onScroll() {
    var el = document.documentElement;
    var pct = Math.round((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100);
    if (pct >= 100 && !scrollHits[100]) { scrollHits[100] = true; add(10); }
    else if (pct >= 75 && !scrollHits[75]) { scrollHits[75] = true; add(10); }
    else if (pct >= 50 && !scrollHits[50]) { scrollHits[50] = true; add(10); }
    else if (pct >= 25 && !scrollHits[25]) { scrollHits[25] = true; add(10); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // ── Dwell time ────────────────────────────────────────────────────────
  function scheduleDwell() {
    if (dwellIdx >= DWELL_MILESTONES.length) return;
    setTimeout(function () {
      add(DWELL_SCORES[dwellIdx]);
      dwellIdx++;
      scheduleDwell();
    }, DWELL_MILESTONES[dwellIdx]);
  }
  scheduleDwell();

  // ── Section views ─────────────────────────────────────────────────────
  var secObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && sectionPts < MAX_SECTION_PTS) {
        sectionPts += 3;
        add(3);
        secObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.25 });

  function observeSections() {
    document.querySelectorAll('section[data-reveal], section[id]').forEach(function (s) {
      secObserver.observe(s);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeSections);
  } else {
    observeSections();
  }

  // ── Meaningful clicks ─────────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    var t = e.target.closest('a, button, [data-track-event]');
    if (!t) return;
    clickCount++;
    add(clickCount === 1 ? 5 : 2);
  }, { passive: true });

})();
