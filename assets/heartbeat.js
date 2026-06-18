/**
 * VaultSpark — Portfolio Heartbeat Visualizer.
 *
 * Self-mounts on any `<div data-heartbeat>`. Fetches `/api/heartbeat.json`
 * and renders a live pulse-grid of the studio's 27 projects. Recency drives
 * the dot size; tier drives the colour; pulses_7d drives the animation rate.
 *
 * Respects prefers-reduced-motion (static dots instead of pulse).
 * CSP-clean (no inline handlers/styles). No external dependencies.
 */
(function () {
  'use strict';

  var ENDPOINT = '/api/heartbeat.json';
  var TIER_COLOUR = {
    sparked: '#FFC400',
    forge:   '#f59e0b',
    vaulted: '#94a3b8',
  };
  var TIER_LABEL = {
    sparked: 'Sparked',
    forge:   'In the Forge',
    vaulted: 'Vaulted',
  };

  var STYLE = [
    '.vs-hb{padding:2rem 0;border-top:1px solid rgba(255,255,255,0.06);border-bottom:1px solid rgba(255,255,255,0.06);}',
    '.vs-hb__head{display:flex;flex-wrap:wrap;align-items:baseline;gap:0.75rem;margin-bottom:1rem;}',
    '.vs-hb__eyebrow{font-size:0.72rem;font-weight:800;text-transform:uppercase;letter-spacing:0.14em;color:var(--gold,#d4af37);}',
    '.vs-hb__title{font-family:Georgia,"Times New Roman",serif;font-size:1.35rem;letter-spacing:-0.02em;margin:0;color:var(--text);}',
    '.vs-hb__sub{color:var(--muted);font-size:0.85rem;margin-left:auto;}',
    '.vs-hb__grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:0.75rem;}',
    '.vs-hb__cell{position:relative;display:flex;align-items:flex-start;gap:0.7rem;padding:0.82rem 0.95rem;border-radius:14px;background:rgba(13,17,28,0.55);border:1px solid rgba(255,255,255,0.05);transition:transform 160ms,border-color 160ms,background 160ms;}',
    '.vs-hb__cell:hover{transform:translateY(-2px);border-color:rgba(255,196,0,0.28);background:rgba(13,17,28,0.78);}',
    '.vs-hb__dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;box-shadow:0 0 10px currentColor;animation:vs-hb-pulse 2.4s ease-in-out infinite;}',
    '.vs-hb__dot--cold{animation:none;opacity:0.35;box-shadow:none;}',
    '.vs-hb__dot--warm{animation-duration:3.2s;}',
    '.vs-hb__dot--hot{animation-duration:1.3s;}',
    '@keyframes vs-hb-pulse{0%,100%{transform:scale(1);opacity:0.55;}50%{transform:scale(1.35);opacity:1;}}',
    '@media(prefers-reduced-motion:reduce){.vs-hb__dot{animation:none;opacity:0.85;}}',
    '.vs-hb__body{min-width:0;display:grid;gap:0.18rem;flex:1;}',
    '.vs-hb__name{font-size:0.92rem;font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.vs-hb__detail{font-size:0.76rem;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.vs-hb__meta{font-size:0.74rem;color:var(--dim);font-variant-numeric:tabular-nums;white-space:nowrap;align-self:center;}',
    'body.light-mode .vs-hb__cell{background:rgba(255,253,247,0.85);border-color:rgba(20,28,52,0.08);}',
    'body.light-mode .vs-hb__cell:hover{background:rgba(255,253,247,0.98);border-color:rgba(212,175,55,0.4);}',
  ].join('\n');

  function injectStyle() {
    if (document.querySelector('style[data-vs-hb-style]')) return;
    var s = document.createElement('style');
    s.setAttribute('data-vs-hb-style', '1');
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function tempClass(p) {
    if ((p.pulses7d || 0) >= 8) return 'vs-hb__dot--hot';
    if ((p.pulses7d || 0) >= 2) return '';
    if ((p.pulses30d || 0) >= 1) return 'vs-hb__dot--warm';
    return 'vs-hb__dot--cold';
  }

  function relativeTime(iso) {
    if (!iso) return 'dormant';
    var t = Date.parse(iso);
    if (!Number.isFinite(t)) return 'dormant';
    var mins = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (mins < 60)   return mins + 'm';
    if (mins < 1440) return Math.round(mins / 60) + 'h';
    return Math.round(mins / 1440) + 'd';
  }

  function pulseLabel(project) {
    if ((project.pulses7d || 0) > 0) return (project.pulses7d || 0) + ' pulse' + ((project.pulses7d || 0) === 1 ? '' : 's') + ' / 7d';
    if ((project.pulses30d || 0) > 0) return (project.pulses30d || 0) + ' pulse' + ((project.pulses30d || 0) === 1 ? '' : 's') + ' / 30d';
    return 'No recent public pulse';
  }

  function render(root, data) {
    var totals = { sparked: 0, forge: 0, vaulted: 0 };
    // SEALED retired — fold into VAULTED (coined vocab: vaulted is sealed).
    (data.projects || []).forEach(function (p) { var t = p.tier === 'sealed' ? 'vaulted' : p.tier; totals[t] = (totals[t] || 0) + 1; });
    var total = data.projects ? data.projects.length : 0;
    var totalPulses = (data.projects || []).reduce(function (a, p) { return a + (p.pulses30d || 0); }, 0);
    var hottest = (data.projects || []).slice().sort(function (a, b) {
      return (b.pulses7d - a.pulses7d) || (Date.parse(b.lastActivity || 0) - Date.parse(a.lastActivity || 0));
    })[0] || null;

    // Honest empty state: if we have zero activity in the window, say so
    // plainly rather than showing a grid of cold dots that implies breakage.
    if (totalPulses === 0) {
      root.innerHTML = '';
      root.className = (root.className || '') + ' vs-hb';
      var quiet = document.createElement('div');
      quiet.className = 'vs-hb__head';
      quiet.innerHTML = '<span class="vs-hb__eyebrow">Portfolio Heartbeat</span>'
        + '<h2 class="vs-hb__title">The forge is quiet right now.</h2>'
        + '<span class="vs-hb__sub">No shipped pulses in the last ' + (data.windowDays || 30) + ' days. Check back soon — new sessions are tracked live.</span>';
      root.appendChild(quiet);
      return;
    }

    var head = document.createElement('div');
    head.className = 'vs-hb__head';
    head.innerHTML = '<span class="vs-hb__eyebrow">Portfolio Heartbeat</span>'
      + '<h2 class="vs-hb__title">The forge is alive — ' + total + ' initiatives</h2>'
      + '<span class="vs-hb__sub">' + (data.windowDays || 30) + 'd window &middot; '
      + (totals.sparked || 0) + ' sparked &middot; ' + (totals.forge || 0) + ' forge &middot; '
      + (totals.vaulted || 0) + ' vaulted'
      + (hottest ? ' &middot; hottest: ' + hottest.name : '') + '</span>';

    var grid = document.createElement('div');
    grid.className = 'vs-hb__grid';
    (data.projects || []).forEach(function (p) {
      var cell = document.createElement('div');
      cell.className = 'vs-hb__cell';
      cell.title = (TIER_LABEL[p.tier] || p.tier) + ' · last activity ' + relativeTime(p.lastActivity)
        + ' · ' + (p.pulses7d || 0) + ' pulses (7d)';
      var dotCls = 'vs-hb__dot ' + tempClass(p);
      var colour = TIER_COLOUR[p.tier] || '#d4af37';
      var dot = document.createElement('span');
      dot.className = dotCls;
      dot.style.color = colour;
      dot.style.background = colour;
      var body = document.createElement('span');
      body.className = 'vs-hb__body';
      var nm = document.createElement('span');
      nm.className = 'vs-hb__name';
      nm.textContent = p.name;
      var detail = document.createElement('span');
      detail.className = 'vs-hb__detail';
      detail.textContent = pulseLabel(p);
      var meta = document.createElement('span');
      meta.className = 'vs-hb__meta';
      meta.textContent = relativeTime(p.lastActivity);
      body.appendChild(nm);
      body.appendChild(detail);
      cell.appendChild(dot); cell.appendChild(body); cell.appendChild(meta);
      grid.appendChild(cell);
    });

    root.innerHTML = '';
    root.className = (root.className || '') + ' vs-hb';
    root.appendChild(head);
    root.appendChild(grid);
  }

  function mount(root) {
    fetch(ENDPOINT, { credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('heartbeat_' + r.status)); })
      .then(function (data) { injectStyle(); render(root, data); })
      .catch(function () { /* silent: honest empty state */ });
  }

  function boot() {
    document.querySelectorAll('[data-heartbeat]').forEach(mount);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
