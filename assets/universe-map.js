/*
 * universe-map.js — the living constellation on /universe/ (#universe-map).
 *
 * Source of truth is the plain, crawlable list inside [data-umap-index]: every
 * <a data-node> carries its kind, a short description and the ids it relates
 * to (data-links). Without JS that list IS the map. With JS this file:
 *   1. draws the same nodes and relations as an SVG constellation inside the
 *      reserved [data-umap-stage] box (fixed aspect-ratio in CSS, so no shift);
 *   2. refreshes game lifecycle labels from /data/game-registry.json (the
 *      studio registry) once the map is on screen — text only, no relayout;
 *   3. highlights a node's relations on hover/focus, uses a select-then-open
 *      tap on touch, and arrow keys step between stars;
 *   4. names the chosen world for a cross-document View Transition
 *      (@view-transition in CSS; plain navigation where unsupported).
 * Every node is a real SVG <a href> with an accessible name, so keyboard and
 * screen-reader users travel the same links as the list.
 */
(function () {
  'use strict';
  var root = document.getElementById('universe-map');
  if (!root) return;
  var index = root.querySelector('[data-umap-index]');
  var stage = root.querySelector('[data-umap-stage]');
  var panel = root.querySelector('[data-umap-panel]');
  if (!index || !stage) return;

  var SVGNS = 'http://www.w3.org/2000/svg';
  var STATUS_LABEL = { forge: 'In the Forge', sparked: 'Sparked', vaulted: 'Vaulted' };

  // ── Read the graph from the list ─────────────────────────────────────────
  var nodes = [];
  var byId = {};
  var anchors = index.querySelectorAll('a[data-node]');
  for (var i = 0; i < anchors.length; i++) {
    var a = anchors[i];
    var n = {
      id: a.getAttribute('data-node'),
      kind: a.getAttribute('data-kind') || 'entity',
      label: (a.querySelector('[data-umap-name]') || a).textContent.trim(),
      sub: ((a.querySelector('[data-umap-sub]') || {}).textContent || '').trim(),
      href: a.getAttribute('href'),
      links: (a.getAttribute('data-links') || '').split(/\s+/).filter(Boolean),
      status: a.getAttribute('data-status') || ''
    };
    nodes.push(n);
    byId[n.id] = n;
  }
  if (!nodes.length) return;

  // Undirected adjacency.
  var adj = {};
  var edges = [];
  var seen = {};
  nodes.forEach(function (n) { adj[n.id] = adj[n.id] || {}; });
  nodes.forEach(function (n) {
    n.links.forEach(function (t) {
      if (!byId[t] || t === n.id) return;
      adj[n.id][t] = true;
      adj[t][n.id] = true;
      var key = n.id < t ? n.id + '|' + t : t + '|' + n.id;
      if (seen[key]) return;
      seen[key] = true;
      edges.push({ a: n.id < t ? n.id : t, b: n.id < t ? t : n.id });
    });
  });

  // ── Layouts (viewBox units). Unknown nodes fall into spare slots. ────────
  var LAYOUTS = {
    wide: {
      w: 1000, h: 600, font: 15, subFont: 11.5, subs: true,
      pos: {
        vault: [500, 278], 'wrong-transmission': [500, 92],
        voidfall: [282, 196], watcher: [130, 86], answered: [118, 222], crossed: [196, 330],
        dreadspike: [718, 196], classified: [870, 72], factions: [884, 334]
      },
      gameSlots: (function () {
        var out = [];
        for (var k = 0; k < 10; k++) {
          var th = (28 + k * (124 / 7)) * Math.PI / 180;
          out.push([Math.round(500 + 392 * Math.cos(th)), Math.round(282 + 262 * Math.sin(th))]);
        }
        return out.slice(0, 8).reverse().concat(out.slice(8));
      })(),
      spare: [[60, 560], [940, 560]]
    },
    tall: {
      w: 600, h: 920, font: 23, subFont: 0, subs: false,
      pos: {
        'wrong-transmission': [300, 70], watcher: [110, 170], classified: [470, 170],
        voidfall: [150, 290], dreadspike: [450, 290], factions: [440, 392], answered: [100, 420],
        vault: [310, 505], crossed: [150, 565]
      },
      gameSlots: [[60, 660], [330, 660], [60, 730], [330, 730], [60, 800], [330, 800], [60, 870], [330, 870], [60, 905], [330, 905]],
      gameAnchor: 'start',
      spare: [[300, 600]]
    }
  };

  var layoutKey = null;
  var svg = null;
  var nodeEls = {};
  var edgeEls = [];
  var activeId = null;
  var touchArmed = null;

  function pickLayout() {
    // Must match the CSS breakpoint that reserves the stage's aspect-ratio.
    return window.matchMedia && window.matchMedia('(max-width: 671px)').matches ? 'tall' : 'wide';
  }

  function el(name, attrs, parent) {
    var e = document.createElementNS(SVGNS, name);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function render() {
    var key = pickLayout();
    if (key === layoutKey && svg) return;
    layoutKey = key;
    var L = LAYOUTS[key];
    var pos = {};
    var g = 0, s = 0;
    nodes.forEach(function (n) {
      if (L.pos[n.id]) pos[n.id] = L.pos[n.id];
      else if (n.kind === 'game' && L.gameSlots[g]) pos[n.id] = L.gameSlots[g++];
      else pos[n.id] = L.spare[s++] || [L.w / 2, L.h - 30];
    });

    if (svg) svg.remove();
    nodeEls = {};
    edgeEls = [];
    svg = el('svg', { viewBox: '0 0 ' + L.w + ' ' + L.h, class: 'umap-svg', role: 'group', 'aria-label': 'VaultSpark universe constellation' });
    var title = el('title', {}, svg);
    title.textContent = 'VaultSpark universe constellation';

    // Faint star field (decorative, deterministic).
    var field = el('g', { class: 'umap-field', 'aria-hidden': 'true' }, svg);
    var seed = 7;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (var k = 0; k < 70; k++) {
      el('circle', { cx: (rnd() * L.w).toFixed(1), cy: (rnd() * L.h).toFixed(1), r: (0.6 + rnd() * 1.3).toFixed(2) }, field);
    }

    var edgeG = el('g', { class: 'umap-edges', 'aria-hidden': 'true' }, svg);
    edges.forEach(function (e) {
      var p = pos[e.a], q = pos[e.b];
      var mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
      var dx = q[0] - p[0], dy = q[1] - p[1];
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var bow = Math.min(36, len * 0.12);
      var cx = mx - (dy / len) * bow, cy = my + (dx / len) * bow;
      var kinds = [byId[e.a].kind, byId[e.b].kind].sort().join('-');
      var path = el('path', { d: 'M' + p[0] + ' ' + p[1] + ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + q[0] + ' ' + q[1], class: 'umap-edge umap-edge--' + kinds }, edgeG);
      path.__a = e.a; path.__b = e.b;
      edgeEls.push(path);
    });

    var nodeG = el('g', { class: 'umap-nodes' }, svg);
    nodes.forEach(function (n) {
      var p = pos[n.id];
      var link = el('a', { href: n.href, class: 'umap-node umap-node--' + n.kind + (n.status ? ' is-' + n.status : ''), 'data-id': n.id }, nodeG);
      link.setAttribute('aria-label', n.label + (n.sub ? ', ' + n.sub : '') + '. ' + connectionsText(n.id));
      var r = n.kind === 'core' ? 20 : n.kind === 'saga' ? 14 : n.kind === 'game' ? 9 : 7;
      if (key === 'tall') r = Math.round(r * 1.35);
      el('circle', { class: 'umap-halo', cx: p[0], cy: p[1], r: r + (key === 'tall' ? 24 : 12) }, link);
      el('circle', { class: 'umap-dot', cx: p[0], cy: p[1], r: r }, link);
      var anchor = (n.kind === 'game' && L.gameAnchor) ? L.gameAnchor : 'middle';
      var tx = anchor === 'start' ? p[0] + r + 12 : p[0];
      var ty = anchor === 'start' ? p[1] + L.font * 0.35 : p[1] + r + L.font + 4;
      var t = el('text', { class: 'umap-label', x: tx, y: ty, 'text-anchor': anchor, 'font-size': L.font }, link);
      t.textContent = n.label;
      if (L.subs && n.sub) {
        var st = el('text', { class: 'umap-sub', x: tx, y: ty + L.subFont + 5, 'text-anchor': anchor, 'font-size': L.subFont, 'data-sub-for': n.id }, link);
        st.textContent = n.sub;
      }
      nodeEls[n.id] = link;
    });

    stage.appendChild(svg);
    if (activeId) highlight(activeId);
  }

  function connectionsText(id) {
    var names = Object.keys(adj[id] || {}).map(function (t) { return byId[t].label; });
    return names.length ? 'Connected to ' + names.join(', ') + '.' : '';
  }

  function highlight(id) {
    activeId = id;
    root.classList.toggle('umap-has-active', !!id);
    nodes.forEach(function (n) {
      var e = nodeEls[n.id];
      if (!e) return;
      e.classList.toggle('is-active', n.id === id);
      e.classList.toggle('is-linked', !!(id && adj[id][n.id]));
    });
    edgeEls.forEach(function (p) {
      p.classList.toggle('is-lit', !!id && (p.__a === id || p.__b === id));
    });
    updatePanel(id);
  }

  function updatePanel(id) {
    if (!panel) return;
    var n = id && byId[id];
    var name = panel.querySelector('[data-umap-panel-name]');
    var sub = panel.querySelector('[data-umap-panel-sub]');
    var rel = panel.querySelector('[data-umap-panel-links]');
    var open = panel.querySelector('[data-umap-panel-open]');
    if (!n) {
      panel.removeAttribute('data-active');
      return;
    }
    panel.setAttribute('data-active', '');
    if (name) name.textContent = n.label;
    if (sub) sub.textContent = n.sub;
    if (rel) {
      var names = Object.keys(adj[id]).map(function (t) { return byId[t].label; });
      rel.textContent = names.length ? 'Connected to ' + names.join(' · ') : '';
    }
    if (open) {
      open.setAttribute('href', n.href);
      open.textContent = 'Open ' + n.label + ' →';
    }
  }

  function nodeFromEvent(ev) {
    var t = ev.target;
    while (t && t !== svg) {
      if (t.getAttribute && t.getAttribute('data-id')) return t;
      t = t.parentNode;
    }
    return null;
  }

  function nameTransition(link) {
    // Cross-document View Transition: the chosen star's label morphs into the
    // destination page's title (both pages opt in via @view-transition).
    var label = link && link.querySelector('.umap-label');
    if (label) label.style.viewTransitionName = 'world-title';
  }

  function bind() {
    stage.addEventListener('pointerover', function (ev) {
      if (ev.pointerType === 'touch') return;
      var n = nodeFromEvent(ev);
      if (n) highlight(n.getAttribute('data-id'));
    });
    stage.addEventListener('pointerleave', function (ev) {
      if (ev.pointerType === 'touch') return;
      var f = document.activeElement;
      highlight(f && f.getAttribute && stage.contains(f) ? f.getAttribute('data-id') : null);
    });
    stage.addEventListener('focusin', function (ev) {
      var n = nodeFromEvent(ev);
      if (n) highlight(n.getAttribute('data-id'));
    });
    stage.addEventListener('focusout', function () {
      setTimeout(function () {
        if (!stage.contains(document.activeElement) && !(panel && panel.contains(document.activeElement))) highlight(null);
      }, 0);
    });
    var lastPointer = 'mouse';
    stage.addEventListener('pointerdown', function (ev) { lastPointer = ev.pointerType; });
    stage.addEventListener('click', function (ev) {
      var n = nodeFromEvent(ev);
      if (!n) return;
      var id = n.getAttribute('data-id');
      // Touch: first tap selects and reveals relations; a second tap travels.
      if (lastPointer === 'touch' && touchArmed !== id) {
        ev.preventDefault();
        touchArmed = id;
        highlight(id);
        return;
      }
      nameTransition(n);
    });
    stage.addEventListener('keydown', function (ev) {
      var n = nodeFromEvent(ev);
      if (!n) return;
      var keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      if (ev.key === 'Enter') { nameTransition(n); return; }
      if (!keys[ev.key]) return;
      ev.preventDefault();
      var ids = nodes.map(function (x) { return x.id; });
      var at = ids.indexOf(n.getAttribute('data-id'));
      var next = nodeEls[ids[(at + keys[ev.key] + ids.length) % ids.length]];
      if (next) next.focus();
    });
    if (panel) {
      var open = panel.querySelector('[data-umap-panel-open]');
      if (open) open.addEventListener('click', function () { nameTransition(nodeEls[activeId]); });
    }
    if ('ResizeObserver' in window) {
      var pending = 0;
      new ResizeObserver(function () {
        if (pending) return;
        pending = requestAnimationFrame(function () { pending = 0; render(); });
      }).observe(root);
    }
  }

  // ── Live registry refresh (text only) ────────────────────────────────────
  function refreshFromRegistry() {
    if (!window.fetch) return;
    fetch('/data/game-registry.json', { credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (reg) {
        var games = reg && reg.games;
        if (!games) return;
        Object.keys(games).forEach(function (slug) {
          var n = byId[slug];
          var st = String(games[slug].status || '').toLowerCase();
          if (!n || !STATUS_LABEL[st] || n.status === st) return;
          var prefix = n.kind === 'saga' ? n.sub.split(' · ')[0] + ' · ' : '';
          n.status = st;
          n.sub = prefix + STATUS_LABEL[st];
          var e = nodeEls[slug];
          if (e) {
            e.setAttribute('class', 'umap-node umap-node--' + n.kind + ' is-' + st);
            e.setAttribute('aria-label', n.label + ', ' + n.sub + '. ' + connectionsText(slug));
            var subEl = e.querySelector('[data-sub-for]');
            if (subEl) subEl.textContent = n.sub;
          }
        });
        if (activeId) updatePanel(activeId);
        root.setAttribute('data-registry', 'live');
      })
      .catch(function () { /* the authored list stays authoritative */ });
  }

  render();
  bind();
  index.hidden = true;
  root.classList.add('umap-ready');
  if (panel) panel.hidden = false;

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries[0] && entries[0].isIntersecting) { io.disconnect(); refreshFromRegistry(); }
    });
    io.observe(stage);
  } else {
    refreshFromRegistry();
  }
})();
