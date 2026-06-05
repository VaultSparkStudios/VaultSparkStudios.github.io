/* intent-flight-director.js — local-first next-step pathfinder. */
(function () {
  'use strict';

  var ROUTES = ['/', '/membership/', '/games/', '/universe/', '/studio-pulse/', '/oracle/'];
  var GRAPH_URL = '/data/intent-graph.json';
  var INTEL_URL = '/api/public-intelligence.json';

  function routeContext() {
    var p = location.pathname;
    if (p === '/') return 'home';
    if (p.indexOf('/membership') === 0) return 'membership';
    if (p.indexOf('/games') === 0) return 'games';
    if (p.indexOf('/universe') === 0) return 'universe';
    if (p.indexOf('/studio-pulse') === 0) return 'pulse';
    if (p.indexOf('/oracle') === 0) return 'oracle';
    if (p.indexOf('/studio') === 0) return 'studio';
    return '';
  }

  function shouldRun() {
    return ROUTES.indexOf(location.pathname) !== -1;
  }

  function state() {
    return window.VSIntentState && window.VSIntentState.getState ? window.VSIntentState.getState() : {};
  }

  function scoreNode(key, node, currentState, intel) {
    var score = 10;
    var text = [key, node.title, node.copy, node.eyebrow].join(' ').toLowerCase();
    if (currentState.logged_in && key === 'vault-member') score += 18;
    if (currentState.pathway === 'player' && /game|play|rank/.test(text)) score += 16;
    if (currentState.pathway === 'supporter' && /support|sparked|membership|proof/.test(text)) score += 16;
    if (currentState.pathway === 'lore' && /lore|voidfall|dreadspike|universe|journal/.test(text)) score += 16;
    if (currentState.hesitation_signal === 'need_proof' && /proof|forge|nervous|oracle|window/.test(text)) score += 14;
    if (currentState.hesitation_signal === 'want_gameplay' && /game|play/.test(text)) score += 14;
    if (intel && intel.project && /nervous|forge|oracle/.test(text)) score += 4;
    return score;
  }

  function ensureStyles() {
    if (document.getElementById('vs-flight-director-style')) return;
    var style = document.createElement('style');
    style.id = 'vs-flight-director-style';
    style.textContent =
      '.vs-flight-director{padding:0 0 2.4rem}.vs-flight-director__panel{display:grid;grid-template-columns:1.1fr repeat(3,1fr);gap:.75rem;padding:1rem;border:1px solid var(--line);border-radius:18px;background:linear-gradient(135deg,rgba(31,162,255,.06),rgba(255,196,0,.035));box-shadow:var(--shadow)}' +
      '.vs-flight-director__lead{padding:.2rem .4rem}.vs-flight-director__eyebrow{font-size:.72rem;text-transform:uppercase;letter-spacing:.12em;color:var(--gold);font-weight:800}.vs-flight-director h2{font-family:Georgia,serif;font-size:clamp(1.3rem,2.3vw,2rem);margin:.35rem 0 .45rem}.vs-flight-director p{color:var(--muted);font-size:.92rem;line-height:1.55}' +
      '.vs-flight-card{display:flex;flex-direction:column;gap:.45rem;min-height:148px;padding:.9rem;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.035);text-decoration:none;color:inherit}.vs-flight-card:hover{border-color:rgba(255,196,0,.35);background:rgba(255,196,0,.06)}.vs-flight-card strong{font-size:1rem}.vs-flight-card span{font-size:.7rem;text-transform:uppercase;letter-spacing:.1em;color:var(--gold);font-weight:800}.vs-flight-card em{margin-top:auto;font-style:normal;color:var(--dim);font-size:.8rem}' +
      '@media(max-width:860px){.vs-flight-director__panel{grid-template-columns:1fr}.vs-flight-card{min-height:0}}';
    document.head.appendChild(style);
  }

  function mount(cards) {
    if (!cards.length || document.querySelector('.vs-flight-director')) return;
    ensureStyles();
    var section = document.createElement('section');
    section.className = 'vs-flight-director';
    section.setAttribute('aria-label', 'Recommended next steps');
    section.innerHTML =
      '<div class="container"><div class="vs-flight-director__panel">' +
        '<div class="vs-flight-director__lead"><div class="vs-flight-director__eyebrow">Pathfinder</div><h2>Your next clean move.</h2><p>This route is chosen locally from your current page, saved intent, and public studio signals. No account data leaves the browser.</p></div>' +
        cards.map(function (card) {
          return '<a class="vs-flight-card" href="' + card.href + '"><span>' + card.eyebrow + '</span><strong>' + card.title + '</strong><p>' + card.copy + '</p><em>Open →</em></a>';
        }).join('') +
      '</div></div>';
    var main = document.querySelector('main');
    var anchor = main && main.querySelector('section:nth-of-type(2)');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(section, anchor);
    else if (main) main.appendChild(section);
  }

  function boot() {
    if (!shouldRun()) return;
    Promise.all([
      fetch(GRAPH_URL, { cache: 'default' }).then(function (r) { return r.json(); }).catch(function () { return null; }),
      fetch(INTEL_URL, { cache: 'default' }).then(function (r) { return r.json(); }).catch(function () { return null; })
    ]).then(function (parts) {
      var graph = parts[0];
      var intel = parts[1];
      if (!graph || !graph.nodes) return;
      var context = routeContext();
      var keys = graph.contexts[context] || graph.contexts.home || [];
      var currentState = state();
      var cards = keys.map(function (key) {
        var node = graph.nodes[key];
        return node && Object.assign({ key: key, score: scoreNode(key, node, currentState, intel) }, node);
      }).filter(Boolean).sort(function (a, b) { return b.score - a.score; }).slice(0, 3);
      mount(cards);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
