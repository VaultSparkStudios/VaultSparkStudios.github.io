// game-welcome-back.js (S216)
// Returning-visitor welcome-back badge on individual game pages.
// Shows a gold "Welcome back · Nth visit" badge when the visitor's last-game
// matches this page AND they've visited this game at least twice.
// Reads: vs_last_game (set by ambient-loader), vs_game_visits_<slug>.
// Writes: vs_game_visits_<slug> (incremented per page-load).
(function () {
  'use strict';

  // Maps URL path segment → STARTERS_GAME / vs_last_game slug.
  var SLUG_MAP = {
    'call-of-doodie':       'cod',
    'vaultspark-football-gm': 'fgm',
    'gridiron-gm':          'fgm',
    'football-gm':          'fgm',
    'mindframe':            'mindframe',
    'solara':               'solara',
    'vaultfront':           'vaultfront',
    'the-exodus':           'the-exodus',
    'vaultspark-forge':     'forge',
  };

  function getSlug() {
    var m = (location.pathname || '/').match(/\/games\/([^/]+)\//);
    return m ? (SLUG_MAP[m[1]] || null) : null;
  }

  function ensureStyles() {
    if (document.getElementById('vs-wb-style')) return;
    var s = document.createElement('style');
    s.id = 'vs-wb-style';
    s.textContent =
      '.vs-welcome-back{display:inline-flex;align-items:center;gap:.42rem;' +
      'padding:.3rem .8rem;margin:.55rem 0 0;border-radius:999px;' +
      'background:rgba(255,196,0,.1);border:1px solid rgba(255,196,0,.3);' +
      'color:#ffc400;font-size:.8rem;font-weight:600;letter-spacing:.05em;' +
      'opacity:0;transform:translateY(5px);' +
      'animation:vs-wb-in .38s .08s ease forwards;}' +
      '@keyframes vs-wb-in{to{opacity:1;transform:translateY(0)}}';
    document.head.appendChild(s);
  }

  function ordinal(n) {
    if (n === 2) return '2nd';
    if (n === 3) return '3rd';
    return n + 'th';
  }

  function run() {
    var slug = getSlug();
    if (!slug) return;

    var lastGame, count;
    try {
      lastGame = localStorage.getItem('vs_last_game');
      count = parseInt(localStorage.getItem('vs_game_visits_' + slug) || '0', 10) + 1;
      localStorage.setItem('vs_game_visits_' + slug, String(count));
    } catch (_) { return; }

    // Show badge on 2nd+ visit when this was the user's last game.
    if (lastGame !== slug || count < 2) return;

    ensureStyles();

    var label = count >= 10 ? 'Vault Regular' : count >= 5 ? 'Vault Familiar' : 'Welcome back';
    var badge = document.createElement('div');
    badge.className = 'vs-welcome-back';
    badge.setAttribute('aria-label', label + ' — ' + ordinal(count) + ' visit');
    badge.textContent = label + ' · ' + ordinal(count) + ' visit';

    // Inject after the <h1> in .hero-center
    var h1 = document.querySelector('.hero-center h1');
    if (h1) {
      h1.insertAdjacentElement('afterend', badge);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();
