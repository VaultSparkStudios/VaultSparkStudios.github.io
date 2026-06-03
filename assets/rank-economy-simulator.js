/* rank-economy-simulator.js — local-only Vault rank economy simulator. */
(function () {
  'use strict';
  function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function rankFor(points, ranks) {
    var active = ranks[0];
    var next = null;
    for (var i = 0; i < ranks.length; i += 1) {
      if (points >= ranks[i].min) active = ranks[i];
      else { next = ranks[i]; break; }
    }
    return { active: active, next: next };
  }
  function mount(root, data) {
    var actions = data.actions || {};
    var keys = Object.keys(actions);
    root.innerHTML = '<div class="vs-rank-sim"><div><div class="eyebrow">Rank Economy</div><h2>Model your Vault climb.</h2><p>Local-only sliders. No account state changes, no server writes.</p><div class="vs-rank-sim__out" aria-live="polite"></div></div><div class="vs-rank-sim__controls">' + keys.map(function (key) {
      var a = actions[key];
      return '<label><span>' + esc(a.label) + '</span><input type="range" min="0" max="' + Number(a.max || 10) + '" value="0" data-rank-action="' + esc(key) + '"></label>';
    }).join('') + '</div></div>';
    var style = document.createElement('style');
    style.textContent = '.vs-rank-sim{display:grid;grid-template-columns:.85fr 1.15fr;gap:1rem;border:1px solid var(--line);border-radius:18px;padding:1.1rem;background:rgba(255,255,255,.035)}.vs-rank-sim h2{font-family:Georgia,serif;font-size:clamp(1.6rem,3vw,2.4rem);margin:.4rem 0}.vs-rank-sim p,.vs-rank-sim__out{color:var(--muted)}.vs-rank-sim__controls{display:grid;gap:.75rem}.vs-rank-sim label{display:grid;gap:.35rem}.vs-rank-sim label span{font-weight:700}.vs-rank-sim input{width:100%}@media(max-width:780px){.vs-rank-sim{grid-template-columns:1fr}}';
    document.head.appendChild(style);
    function update() {
      var points = 0;
      keys.forEach(function (key) {
        var input = root.querySelector('[data-rank-action="' + key + '"]');
        points += Number(input.value || 0) * Number(actions[key].xp || 0);
      });
      var r = rankFor(points, data.ranks || []);
      root.querySelector('.vs-rank-sim__out').innerHTML = '<strong>' + points.toLocaleString() + ' projected points</strong><br>Rank: ' + esc(r.active.name) + (r.next ? ' · Next: ' + esc(r.next.name) + ' at ' + r.next.min.toLocaleString() : ' · max public rank reached');
    }
    root.addEventListener('input', update);
    update();
  }
  function boot() {
    var roots = Array.prototype.slice.call(document.querySelectorAll('[data-rank-economy]'));
    if (!roots.length && (location.pathname.indexOf('/membership') === 0 || location.pathname.indexOf('/ranks') === 0)) {
      var section = document.createElement('section');
      section.id = 'rank-economy';
      section.className = 'container';
      section.setAttribute('data-rank-economy', '');
      var main = document.querySelector('main');
      if (main) main.appendChild(section);
      roots.push(section);
    }
    if (!roots.length) return;
    fetch('/data/rank-economy.json', { cache: 'default' }).then(function (r) { return r.json(); }).then(function (data) {
      roots.forEach(function (root) { mount(root, data); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
