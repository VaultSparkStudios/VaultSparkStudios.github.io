(function () {
  'use strict';

  var STYLE_ID = 'vs-sealed-vault-row-styles';
  var CSS = [
    '.vs-sealed-row{padding:2rem;border-radius:20px;background:rgba(8,11,18,0.65);',
    'border:1px solid rgba(31,162,255,0.14);position:relative;overflow:hidden;}',
    '.vs-sealed-row::before{content:"";position:absolute;inset:0;pointer-events:none;',
    'background:radial-gradient(60% 80% at 50% 10%,rgba(31,162,255,0.09),transparent 70%);}',
    '.vs-sealed-row > *{position:relative;z-index:1;}',
    '.vs-sealed-row .vs-sealed-eyebrow{font-size:0.72rem;font-weight:800;letter-spacing:0.14em;',
    'text-transform:uppercase;color:#7EC9FF;margin-bottom:0.4rem;}',
    '.vs-sealed-row h2{font-family:Georgia,\'Times New Roman\',serif;font-size:clamp(1.5rem,2.7vw,2.1rem);',
    'letter-spacing:-0.02em;margin:0 0 0.6rem;color:var(--text);}',
    '.vs-sealed-row .vs-sealed-caption{font-size:0.98rem;color:var(--muted);max-width:60ch;',
    'line-height:1.6;margin:0 0 1.3rem;}',
    '.vs-sealed-row .vs-sealed-caption strong{color:#7EC9FF;font-family:Georgia,serif;',
    'font-size:1.3rem;font-weight:700;margin-right:0.25em;}',
    '.vs-sealed-row .vs-sealed-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:0.6rem;}',
    '.vs-sealed-row .vs-sealed-tile{aspect-ratio:1/1;border-radius:12px;background:rgba(8,11,18,0.85);',
    'border:1px solid rgba(31,162,255,0.18);display:flex;flex-direction:column;align-items:center;',
    'justify-content:center;gap:0.35rem;color:rgba(126,201,255,0.55);position:relative;overflow:hidden;',
    'transition:color 0.3s ease,border-color 0.3s ease;}',
    '.vs-sealed-row .vs-sealed-tile::before{content:"";position:absolute;inset:0;',
    'background:radial-gradient(closest-side,rgba(31,162,255,0.12),transparent 75%);',
    'opacity:0.5;animation:vs-seal-pulse 3.4s ease-in-out infinite;animation-delay:var(--d,0s);}',
    '@keyframes vs-seal-pulse{50%{opacity:1;}}',
    '@media (prefers-reduced-motion: reduce){.vs-sealed-row .vs-sealed-tile::before{animation:none;}}',
    '.vs-sealed-row .vs-sealed-tile:hover{color:rgba(126,201,255,0.95);border-color:rgba(31,162,255,0.45);}',
    '.vs-sealed-row .vs-sigil{width:26px;height:26px;position:relative;z-index:1;}',
    '.vs-sealed-row .vs-sealed-label{font-size:0.58rem;font-weight:800;letter-spacing:0.2em;position:relative;z-index:1;}',
    '.vs-sealed-row .vs-sealed-foot{margin-top:1.2rem;font-size:0.88rem;color:var(--muted);}',
    '.vs-sealed-row .vs-sealed-foot a{color:var(--gold);font-weight:600;}',
    '@media (max-width:900px){.vs-sealed-row .vs-sealed-grid{grid-template-columns:repeat(4,1fr);}}',
    '@media (max-width:520px){.vs-sealed-row .vs-sealed-grid{grid-template-columns:repeat(3,1fr);}}',
    'body.light-mode .vs-sealed-row{background:rgba(255,255,255,0.85);border-color:rgba(17,24,39,0.12);}',
    'body.light-mode .vs-sealed-row .vs-sealed-caption{color:#4a5568;}',
  ].join('');

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function buildTile(i) {
    var tile = document.createElement('div');
    tile.className = 'vs-sealed-tile';
    tile.setAttribute('aria-hidden', 'true');
    tile.style.setProperty('--d', ((i * 0.18) % 2.4).toFixed(2) + 's');
    tile.innerHTML =
      '<svg class="vs-sigil" viewBox="0 0 48 48" aria-hidden="true">' +
        '<circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="3 5"/>' +
        '<circle cx="24" cy="24" r="11" fill="none" stroke="currentColor" stroke-width="1.2"/>' +
        '<path d="M24 15 v10 M19 24 h10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>' +
      '</svg>' +
      '<span class="vs-sealed-label">SEALED</span>';
    return tile;
  }

  function contextCopy(context, count, total) {
    var map = {
      games: {
        heading: 'Worlds sealed in the deep forge.',
        body: '<strong>' + count + '</strong> of the vault\'s <strong>' + total + '</strong> initiatives are still shaping behind sealed doors. You\'re looking at what we\'ve let breathe so far.',
      },
      projects: {
        heading: 'More tools are being sharpened.',
        body: '<strong>' + count + '</strong> sealed initiatives are still forming. Vault Members hear about each one the moment it\'s ready to speak.',
      },
      default: {
        heading: 'Sealed in the deep forge.',
        body: '<strong>' + count + '</strong> more initiatives are taking shape in sealed vaults across the studio.',
      },
    };
    return map[context] || map.default;
  }

  function render(root, portfolio) {
    if (!root || !portfolio) return;
    var count = Number(portfolio.sealedCount || 0);
    if (!count) { root.style.display = 'none'; return; }
    var context = root.getAttribute('data-sealed-vault-context') || 'default';
    var copy = contextCopy(context, count, portfolio.total || count);

    var wrap = document.createElement('div');
    wrap.className = 'vs-sealed-row';
    wrap.innerHTML =
      '<div class="vs-sealed-eyebrow">Sealed in the deep forge</div>' +
      '<h2>' + copy.heading + '</h2>' +
      '<p class="vs-sealed-caption">' + copy.body + '</p>' +
      '<div class="vs-sealed-grid" aria-hidden="true"></div>' +
      '<p class="vs-sealed-foot">When a seal breaks, <a href="/membership/">Vault Members hear first</a>. See everything live in the <a href="/studio-pulse/">Forge Window</a>.</p>';
    var grid = wrap.querySelector('.vs-sealed-grid');
    for (var i = 0; i < count; i += 1) grid.appendChild(buildTile(i));
    root.innerHTML = '';
    root.appendChild(wrap);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var roots = document.querySelectorAll('[data-sealed-vault-row]');
    if (!roots.length) return;
    injectStyles();
    if (!window.VSPublicIntel) return;
    window.VSPublicIntel.get().then(function (intel) {
      if (!intel || !intel.portfolio) return;
      roots.forEach(function (root) { render(root, intel.portfolio); });
    });
  });
})();
