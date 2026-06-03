/* vault-genome-strip.js — Ambient 20px studio-health strip at top of every page.
 *
 * Renders 10 SIL category mini-bars (Dev Health, Alignment, Momentum, Engagement,
 * Process, Coherence, Security, Ecosystem, Capital, Automation) reading from
 * portfolio.silCategories in /api/public-intelligence.json.
 *
 * Color by score: green ≥85 · amber 70–84 · red <70. Hover reveals label + score.
 * Click navigates to /studio-pulse/. Respects [data-no-strip] page opt-out.
 * Hidden on portals, admin, vault-member-internal pages, and prefers-reduced-motion fades.
 *
 * Composes with: page-sigil (per-page age) + vault-atlas (live-status strip in Resources).
 * Cost: ~1.6 KB; idle-mounted; one fetch from already-loaded intelligence shard.
 */
(function () {
  'use strict';

  // Skip surfaces.
  var p = location.pathname || '/';
  if (/^\/(vault-member|investor-portal|admin|api)\//.test(p)) return;
  if (document.documentElement.hasAttribute('data-no-strip')) return;
  if (document.body && document.body.hasAttribute('data-no-strip')) return;

  var STYLE_ID = 'vs-genome-strip-styles';
  var CSS = [
    '.vs-genome-strip{position:fixed;top:0;left:0;right:0;height:3px;display:flex;',
    'gap:0;z-index:9999;background:rgba(0,0,0,0.4);pointer-events:auto;',
    'transition:opacity 240ms ease,height 240ms ease;}',
    '.vs-genome-strip.is-scrolled{opacity:0.35;height:2px;}',
    '.vs-genome-strip:hover{opacity:1!important;height:6px;}',
    '.vs-genome-bar{flex:1 1 0;height:100%;background:var(--c,#94a3b8);',
    'transition:background 240ms ease,filter 160ms ease;position:relative;cursor:pointer;}',
    '.vs-genome-bar:hover{filter:brightness(1.4);}',
    '.vs-genome-bar:not(:last-child){border-right:1px solid rgba(0,0,0,0.35);}',
    '.vs-genome-tooltip{position:fixed;top:8px;background:rgba(10,12,20,0.96);',
    'border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:0.45rem 0.7rem;',
    'font-size:0.78rem;font-weight:600;color:#fff;white-space:nowrap;pointer-events:none;',
    'z-index:10000;letter-spacing:0.02em;font-variant-numeric:tabular-nums;',
    'opacity:0;transform:translateY(-4px);transition:opacity 140ms ease,transform 140ms ease;',
    'box-shadow:0 6px 22px rgba(0,0,0,0.45);}',
    '.vs-genome-tooltip.is-on{opacity:1;transform:translateY(0);}',
    '.vs-genome-tooltip .vs-genome-tooltip-score{color:#FFC400;margin-left:0.4em;font-weight:800;}',
    '@media (prefers-reduced-motion: reduce){.vs-genome-strip,.vs-genome-bar{transition:none;}}',
    '@media print{.vs-genome-strip,.vs-genome-tooltip{display:none!important;}}',
  ].join('');

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function colorFor(score) {
    if (score == null || Number.isNaN(score)) return '#475569';
    if (score >= 95) return '#22c55e';
    if (score >= 85) return '#4ade80';
    if (score >= 70) return '#facc15';
    if (score >= 50) return '#fb923c';
    return '#ef4444';
  }

  var LABELS = {
    devHealth: 'Dev Health',
    alignment: 'Alignment',
    momentum: 'Momentum',
    engagement: 'Engagement',
    process: 'Process',
    coherence: 'Coherence',
    security: 'Security',
    ecosystem: 'Ecosystem',
    capital: 'Capital',
    automation: 'Automation',
  };
  var ORDER = ['devHealth', 'alignment', 'momentum', 'engagement', 'process',
               'coherence', 'security', 'ecosystem', 'capital', 'automation'];

  function render(cats) {
    if (!cats) return;
    injectStyles();

    var strip = document.createElement('a');
    strip.className = 'vs-genome-strip';
    strip.setAttribute('role', 'group');
    strip.setAttribute('aria-label', 'Studio health snapshot — click for Studio Pulse');
    strip.href = '/studio-pulse/';
    strip.style.textDecoration = 'none';

    var tip = document.createElement('div');
    tip.className = 'vs-genome-tooltip';
    tip.setAttribute('role', 'tooltip');
    tip.setAttribute('aria-hidden', 'true');

    ORDER.forEach(function (key) {
      var score = cats[key];
      var bar = document.createElement('div');
      bar.className = 'vs-genome-bar';
      bar.style.setProperty('--c', colorFor(score));
      bar.dataset.key = key;
      bar.setAttribute('aria-hidden', 'true');
      bar.title = LABELS[key] + ': ' + (score != null ? score : 'n/a');
      bar.addEventListener('mouseenter', function (e) {
        tip.innerHTML = LABELS[key] + '<span class="vs-genome-tooltip-score">' +
          (score != null ? score : '—') + '</span>';
        var rect = bar.getBoundingClientRect();
        tip.style.left = Math.max(8, Math.min(window.innerWidth - 140, rect.left + rect.width / 2 - 60)) + 'px';
        tip.classList.add('is-on');
      });
      bar.addEventListener('mouseleave', function () { tip.classList.remove('is-on'); });
      strip.appendChild(bar);
    });

    document.body.appendChild(strip);
    document.body.appendChild(tip);

    var onScroll = function () {
      strip.classList.toggle('is-scrolled', (window.scrollY || 0) > 60);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function load() {
    fetch('/api/public-intelligence.json', { credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var cats = d && d.portfolio && d.portfolio.silCategories;
        if (cats) render(cats);
      })
      .catch(function () { /* silent — ambient asset */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 2000 });
      else setTimeout(load, 500);
    });
  } else if ('requestIdleCallback' in window) {
    requestIdleCallback(load, { timeout: 2000 });
  } else {
    setTimeout(load, 500);
  }
})();
