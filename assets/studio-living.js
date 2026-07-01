/**
 * studio-living — renders the Studio Living Window on /studio-pulse/.
 *
 * Two surfaces, one section:
 *   1. Heat over 30 days — horizontal-bar list of projects ranked by event weight.
 *      Sealed-vault projects collapse into one anonymized bucket (sigil only).
 *   2. Project constellation — SVG node graph of high-signal cross-project edges.
 *      Edges are creative-canon and infra-lineage, not derived metrics.
 *
 * Data source: /api/public-intelligence.json → projectGraph + activityHeatmap.
 * Soft-fails: if data is missing or empty, the parent section keeps display:none
 * so studio-pulse never renders an empty "living window" placeholder.
 *
 * No external deps. SVG is hand-authored to keep the page payload small.
 */
(function () {
  'use strict';

  var INTEL_URL = '/api/public-intelligence.json';
  var SECTION_ID = 'studio-living-window';

  // Inject scoped CSS once; CSP-clean (no inline styles in HTML).
  var STYLE = [
    '#studio-living-window .living-card{background:rgba(13,16,28,0.7);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:1rem 1.1rem;}',
    'body.light-mode #studio-living-window .living-card{background:rgba(255,253,247,0.96);border-color:rgba(20,28,52,0.12);}',
    '#studio-living-window .living-h{font-family:Georgia,serif;font-size:0.78rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--gold,#d4af37);margin:0 0 0.85rem;}',
    '#studio-living-window .heat-row{display:flex;align-items:center;gap:0.55rem;font-size:0.86rem;margin:0.35rem 0;}',
    '#studio-living-window .heat-name{flex:1 1 auto;color:var(--text);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '#studio-living-window .heat-bar{flex:0 0 80px;height:6px;border-radius:3px;background:rgba(255,255,255,0.06);overflow:hidden;}',
    '#studio-living-window .heat-bar__fill{height:100%;background:linear-gradient(90deg,#7ec9ff,#d4af37,#ff7a7a);transition:width 250ms ease;}',
    '#studio-living-window .heat-num{flex:0 0 auto;font-variant-numeric:tabular-nums;color:var(--text-muted,#889);font-size:0.78rem;min-width:38px;text-align:right;}',
    '#studio-living-window .heat-row--sealed .heat-name{font-style:italic;color:var(--text-muted,#889);}',
    '#studio-living-window .graph-svg{width:100%;height:340px;display:block;}',
    '#studio-living-window .graph-node{cursor:pointer;}',
    '#studio-living-window .graph-node:hover circle{fill:rgba(212,175,55,0.18);}',
    '#studio-living-window .graph-node text{font-family:Georgia,serif;font-size:11px;fill:var(--text);pointer-events:none;}',
    '#studio-living-window .graph-node:focus circle{stroke-width:2.4;filter:drop-shadow(0 0 6px rgba(212,175,55,0.5));outline:none;}',
    '#studio-living-window .graph-node:focus{outline:none;}',
    '#studio-living-window .graph-node:hover circle{fill:rgba(212,175,55,0.28);}',
    '#studio-living-window .graph-edge{stroke:rgba(212,175,55,0.3);stroke-width:1.4;fill:none;transition:stroke-width 140ms ease,opacity 140ms ease;}',
    '#studio-living-window .graph-edge--sibling{stroke-dasharray:4 3;}',
    '#studio-living-window .graph-edge--builds-on{stroke:rgba(126,201,255,0.45);}',
    '#studio-living-window .graph-edge--shares-universe{stroke:rgba(212,175,55,0.55);}',
    '#studio-living-window .graph-edge.is-active{stroke-width:2.6;opacity:1;}',
    '#studio-living-window .graph-edge.is-dimmed{opacity:0.18;}',
    '#studio-living-window .graph-edge-label{font-family:Georgia,serif;font-size:10px;fill:var(--gold,#d4af37);text-anchor:middle;pointer-events:none;opacity:0;transition:opacity 140ms ease;}',
    '#studio-living-window .graph-edge-label.is-visible{opacity:1;}',
    '#studio-living-window .graph-legend{display:flex;flex-wrap:wrap;gap:0.6rem 1rem;margin-top:0.85rem;font-size:0.72rem;color:var(--text-muted,#889);font-family:Georgia,serif;}',
    '#studio-living-window .graph-legend__item{display:inline-flex;align-items:center;gap:0.35rem;}',
    '#studio-living-window .graph-legend__swatch{display:inline-block;width:18px;height:2px;background:rgba(212,175,55,0.55);}',
    '#studio-living-window .graph-legend__swatch--builds{background:rgba(126,201,255,0.55);}',
    '#studio-living-window .graph-legend__swatch--sibling{background-image:repeating-linear-gradient(90deg,rgba(212,175,55,0.55) 0 4px,transparent 4px 7px);background-color:transparent;}',
    '@media (prefers-reduced-motion: reduce){#studio-living-window .graph-edge,#studio-living-window .graph-edge-label{transition:none;}}',
    '@media (max-width: 720px){#studio-living-window .living-grid > .living-card{grid-column: span 1 !important;} #studio-living-window .graph-svg{height:280px;}}',
  ].join('\n');

  function injectStyle() {
    if (document.getElementById('studio-living-style')) return;
    var s = document.createElement('style');
    s.id = 'studio-living-style';
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function renderHeatmap(data) {
    var card = document.getElementById('living-heatmap');
    if (!card) return;
    var body = card.querySelector('.living-body');
    if (!body) return;
    if (!data || !data.length) {
      body.textContent = 'No recent activity in the last 30 days.';
      return;
    }
    var max = Math.max.apply(null, data.map(function (d) { return d.heat; })) || 1;
    var rows = data.slice(0, 8).map(function (d) {
      var pct = Math.round((d.heat / max) * 100);
      var sealed = d.projectId === 'sealed-vault' ? ' heat-row--sealed' : '';
      var name = (d.name || d.projectId || '').replace(/[<>&]/g, '');
      return [
        '<div class="heat-row', sealed, '">',
          '<span class="heat-name">', name, '</span>',
          '<span class="heat-bar"><span class="heat-bar__fill" style="width:', pct, '%"></span></span>',
          '<span class="heat-num">', d.heat, '</span>',
        '</div>',
      ].join('');
    }).join('');
    body.innerHTML = rows;
  }

  // Force-directed layout is overkill — we use a deterministic radial layout that
  // spreads nodes around a circle, with edge bundling toward the centroid for
  // legibility. Same input → same output, so the constellation feels stable.
  function renderGraph(graph) {
    var card = document.getElementById('living-graph');
    if (!card) return;
    var body = card.querySelector('.living-body');
    if (!body) return;
    if (!graph || !graph.nodes || !graph.nodes.length) {
      body.textContent = 'No cross-project nodes to render yet.';
      return;
    }

    var w = card.clientWidth || 600;
    var h = 340;
    var cx = w / 2;
    var cy = h / 2;
    var r = Math.min(w, h) * 0.36;
    var n = graph.nodes.length;

    var positions = {};
    graph.nodes.forEach(function (node, i) {
      var angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      positions[node.id] = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), node: node };
    });

    var svg = ['<svg viewBox="0 0 ' + w + ' ' + h + '" class="graph-svg" role="img" aria-label="Project constellation — ' + graph.nodes.length + ' projects, ' + (graph.edges || []).length + ' connections">'];

    // Edges (paths + labels). Labels start hidden; visibility toggles on hover/focus.
    (graph.edges || []).forEach(function (e, i) {
      var a = positions[e.from];
      var b = positions[e.to];
      if (!a || !b) return;
      var cls = 'graph-edge graph-edge--' + (e.type || 'sibling');
      var label = (e.label || '').replace(/"/g, '&quot;').replace(/[<>&]/g, '');
      var mx = (a.x + b.x + cx) / 3;
      var my = (a.y + b.y + cy) / 3;
      svg.push('<path id="vsg-edge-' + i + '" class="' + cls + '" data-from="' + e.from + '" data-to="' + e.to + '" d="M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + ' Q ' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1) + '"><title>' + label + '</title></path>');
      // Label position: midpoint of the curve, with slight vertical offset to avoid the node text.
      var lx = (a.x + 2 * mx + b.x) / 4;
      var ly = (a.y + 2 * my + b.y) / 4 - 4;
      svg.push('<text class="graph-edge-label" data-edge="vsg-edge-' + i + '" x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '">' + label + '</text>');
    });

    Object.keys(positions).forEach(function (id) {
      var p = positions[id];
      var color = p.node.color || '#d4af37';
      var name = (p.node.name || id).replace(/[<>&]/g, '');
      var dy = p.y < cy ? -16 : 24;
      var ariaDesc = name + ' (' + (p.node.type || 'project') + ', ' + (p.node.status || 'forge') + ')';
      svg.push('<g class="graph-node" tabindex="0" role="button" data-node="' + id + '" aria-label="' + ariaDesc + '">');
      svg.push('<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="9" fill="' + color + '" fill-opacity="0.7" stroke="' + color + '" stroke-width="1.6"/>');
      svg.push('<text x="' + p.x.toFixed(1) + '" y="' + (p.y + dy).toFixed(1) + '" text-anchor="middle">' + name + '</text>');
      svg.push('</g>');
    });

    svg.push('</svg>');
    var legend = [
      '<div class="graph-legend" aria-hidden="true">',
        '<span class="graph-legend__item"><span class="graph-legend__swatch"></span>shares universe</span>',
        '<span class="graph-legend__item"><span class="graph-legend__swatch graph-legend__swatch--builds"></span>builds on</span>',
        '<span class="graph-legend__item"><span class="graph-legend__swatch graph-legend__swatch--sibling"></span>sibling</span>',
        (!(graph.edges || []).length ? '<span class="graph-legend__item">No founder-confirmed edges yet — showing public project nodes only</span>' : ''),
      '</div>',
    ].join('');
    body.innerHTML = svg.join('') + legend;

    // Hover/focus on a node highlights its incident edges + reveals their labels.
    var svgEl = body.querySelector('svg');
    if (!svgEl) return;
    function highlightNode(nodeId) {
      var allEdges = svgEl.querySelectorAll('.graph-edge');
      var allLabels = svgEl.querySelectorAll('.graph-edge-label');
      if (!nodeId) {
        allEdges.forEach(function (el) { el.classList.remove('is-active', 'is-dimmed'); });
        allLabels.forEach(function (el) { el.classList.remove('is-visible'); });
        return;
      }
      allEdges.forEach(function (el) {
        var incident = el.dataset.from === nodeId || el.dataset.to === nodeId;
        el.classList.toggle('is-active', incident);
        el.classList.toggle('is-dimmed', !incident);
      });
      allLabels.forEach(function (el) {
        var ref = el.getAttribute('data-edge');
        var path = svgEl.querySelector('#' + ref);
        var incident = path && (path.dataset.from === nodeId || path.dataset.to === nodeId);
        el.classList.toggle('is-visible', !!incident);
      });
    }
    svgEl.querySelectorAll('.graph-node').forEach(function (g) {
      g.addEventListener('mouseenter', function () { highlightNode(g.dataset.node); });
      g.addEventListener('focus', function () { highlightNode(g.dataset.node); });
      g.addEventListener('mouseleave', function () { highlightNode(null); });
      g.addEventListener('blur', function () { highlightNode(null); });
    });
  }

  function showSection() {
    var section = document.getElementById(SECTION_ID);
    if (section) section.style.display = '';
  }

  async function load() {
    injectStyle();
    try {
      var res = await fetch(INTEL_URL, { cache: 'default' });
      if (!res.ok) return;
      var data = await res.json();
      var graph = data && data.projectGraph;
      var heat = data && data.activityHeatmap;
      var catalog = Array.isArray(data && data.catalog) ? data.catalog : [];
      var hasGraph = graph && graph.nodes && graph.nodes.length;
      var hasHeat = heat && heat.length;
      if (!hasGraph && catalog.length) {
        graph = {
          nodes: catalog.slice(0, 14).map(function (c) {
            return { id: c.id, name: c.name, type: c.type, status: c.status, color: c.color || null };
          }),
          edges: [],
          mode: 'public-catalog-nodes-no-founder-confirmed-edges',
        };
        hasGraph = graph.nodes.length > 0;
      }
      if (!hasGraph && !hasHeat) return;
      showSection();
      if (hasHeat) renderHeatmap(heat);
      if (hasGraph) renderGraph(graph);
      // Re-render graph on resize (debounced).
      if (hasGraph) {
        var t = null;
        window.addEventListener('resize', function () {
          clearTimeout(t);
          t = setTimeout(function () { renderGraph(graph); }, 180);
        });
      }
    } catch (err) {
      // Soft-fail — section stays hidden.
      console.warn('[studio-living] could not load intelligence', err);
    }
  }

  if (document.readyState !== 'loading') load();
  else document.addEventListener('DOMContentLoaded', load);
})();
