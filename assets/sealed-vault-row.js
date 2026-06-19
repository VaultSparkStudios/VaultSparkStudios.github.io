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
    '.vs-sealed-row .vs-sealed-countdown{display:inline-flex;align-items:center;gap:0.45rem;',
    'margin-top:0.9rem;padding:0.35rem 0.75rem;border-radius:999px;',
    'background:rgba(31,162,255,0.10);border:1px solid rgba(31,162,255,0.25);',
    'font-size:0.78rem;font-weight:700;letter-spacing:0.04em;color:#7EC9FF;',
    'font-variant-numeric:tabular-nums;}',
    '.vs-sealed-row .vs-sealed-countdown::before{content:"";width:7px;height:7px;border-radius:50%;',
    'background:#7EC9FF;box-shadow:0 0 6px rgba(126,201,255,0.7);animation:vs-seal-pulse 2.6s ease-in-out infinite;}',
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
      '<span class="vs-sealed-label">VAULTED</span>';
    return tile;
  }

  function contextCopy(context, count, total) {
    var map = {
      games: {
        heading: 'Worlds still vaulted.',
        body: '<strong>' + count + '</strong> of the vault\'s <strong>' + total + '</strong> initiatives are still shaping behind vault doors. You\'re looking at what we\'ve let breathe so far.',
      },
      projects: {
        heading: 'More tools still vaulted.',
        body: '<strong>' + count + '</strong> vaulted initiatives are still forming. Vault Members hear about each one the moment it\'s ready to speak.',
      },
      default: {
        heading: 'Vaulted.',
        body: '<strong>' + count + '</strong> more initiatives are taking shape behind vault doors across the studio.',
      },
    };
    return map[context] || map.default;
  }

  function daysUntil(iso) {
    if (!iso) return null;
    var t = Date.parse(iso);
    if (Number.isNaN(t)) return null;
    var d = Math.round((t - Date.now()) / 86400000);
    return d;
  }

  function countdownChip(iso) {
    var d = daysUntil(iso);
    if (d == null || d < 0) return '';
    var label;
    if (d === 0) label = 'next reveal today';
    else if (d === 1) label = 'next reveal in ~1 day';
    else if (d < 14) label = 'next reveal in ~' + d + ' days';
    else if (d < 60) label = 'next reveal in ~' + Math.round(d / 7) + ' weeks';
    else label = 'next reveal in ~' + Math.round(d / 30) + ' months';
    // S174 TT burndown: return a node, not an HTML string.
    var span = document.createElement('span');
    span.className = 'vs-sealed-countdown';
    span.title = iso;
    span.textContent = label;
    return span;
  }

  function render(root, portfolio) {
    if (!root || !portfolio) return;
    var count = Number(portfolio.sealedCount || 0);
    if (!count) { root.style.display = 'none'; return; }
    var context = root.getAttribute('data-sealed-vault-context') || 'default';
    var copy = contextCopy(context, count, portfolio.total || count);
    var chip = countdownChip(portfolio.sealedNextRevealAt);

    var wrap = document.createElement('div');
    wrap.className = 'vs-sealed-row';
    // S174 TT burndown: DOM API instead of innerHTML.
    function el(tag, cls, text) {
      var node = document.createElement(tag);
      if (cls) node.className = cls;
      if (text) node.textContent = text;
      return node;
    }
    wrap.appendChild(el('div', 'vs-sealed-eyebrow', 'Vaulted'));
    wrap.appendChild(el('h2', null, copy.heading));
    wrap.appendChild(el('p', 'vs-sealed-caption', copy.body));
    var grid = el('div', 'vs-sealed-grid');
    grid.setAttribute('aria-hidden', 'true');
    wrap.appendChild(grid);
    if (chip) {
      var chipWrap = document.createElement('div');
      chipWrap.appendChild(chip);
      wrap.appendChild(chipWrap);
    }
    var foot = el('p', 'vs-sealed-foot');
    foot.appendChild(document.createTextNode('When a vault opens, '));
    var memberLink = el('a', null, 'Vault Members hear first');
    memberLink.href = '/membership/';
    foot.appendChild(memberLink);
    foot.appendChild(document.createTextNode('. See everything live in '));
    var pulseLink = el('a', null, 'Studio Pulse');
    pulseLink.href = '/studio-pulse/';
    foot.appendChild(pulseLink);
    foot.appendChild(document.createTextNode('.'));
    wrap.appendChild(foot);
    for (var i = 0; i < count; i += 1) grid.appendChild(buildTile(i));
    while (root.firstChild) root.removeChild(root.firstChild);
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
