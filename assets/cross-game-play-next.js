/* cross-game-play-next.js — S187 cross-product routing (redesigned S206 #2).
   A studio brand's structural advantage over a single-game site is re-spending
   attention across the catalog (Lou's audience-compounding thesis). When a
   visitor reaches a game page, surface ONE tailored "play next" card that always
   points at a PLAYABLE title — so a forge page never dead-ends and a live page
   routes to the other live game.

   S206 redesign: card now mounts immediately after .game-hero (visible above
   the fold), uses a personalized "Haven't tried [name] yet?" headline, and
   includes the game's cover art thumbnail. Honest-dark: renders only when a
   real, playable recommendation exists and it isn't the current page.
   TT-safe (DOM nodes + textContent/src only). Loads on game routes. */
(function () {
  'use strict';

  var DATA_URL = '/data/game-affinity.json';

  // Cover art map: game slug → /assets/covers/<key>.png
  var COVERS = {
    'call-of-doodie':        'doodie',
    'vaultspark-football-gm':'footballgm',
    'football-gm':           'footballgm',
    'gridiron-gm':           'gridiron',
    'mindframe':             'mindframe',
    'solara':                'solara',
    'the-exodus':            'the-exodus',
    'vaultfront':            'vaultfront',
  };

  function emitUx(event, slug) {
    try {
      var body = JSON.stringify({ route: location.pathname || '/', ux: event, label: slug || '' });
      if (navigator.sendBeacon) navigator.sendBeacon('/v/rum', new Blob([body], { type: 'application/json' }));
    } catch (_e) {}
  }

  function currentSlug() {
    var parts = (location.pathname || '/').split('/').filter(Boolean);
    if (!parts.length) return null;
    if (parts[0] === 'games' && parts[1]) return parts[1];
    return parts[0];
  }

  function pickTarget(data, slug) {
    if (!data || !slug) return null;
    var live = data.live || {};
    var aff = (data.affinity || {})[slug];
    var targetSlug = aff && aff.next;
    if (!targetSlug || !live[targetSlug]) {
      var pool = data._forgePlayNow || Object.keys(live);
      targetSlug = pool.filter(function (s) { return s !== slug; })[0];
    }
    if (!targetSlug || targetSlug === slug) return null;
    var t = live[targetSlug];
    if (!t || !t.url) return null;
    if (location.pathname.replace(/\/+$/, '') === t.url.replace(/\/+$/, '')) return null;
    return { slug: targetSlug, name: t.name, url: t.url, reason: (aff && aff.reason) || 'Playable right now.' };
  }

  function styles() {
    if (document.getElementById('vs-playnext-style')) return;
    var s = document.createElement('style');
    s.id = 'vs-playnext-style';
    s.textContent =
      '.vs-playnext{display:flex;align-items:center;gap:1rem;flex-wrap:wrap;' +
        'max-width:100%;margin:0 auto;padding:1rem 1.5rem;' +
        'border-bottom:1px solid rgba(255,196,0,.15);' +
        'background:rgba(255,196,0,.04);}' +
      '.vs-playnext__cover{flex:0 0 auto;width:72px;height:54px;object-fit:cover;' +
        'border-radius:8px;border:1px solid rgba(255,196,0,.2);}' +
      '.vs-playnext__body{flex:1 1 200px;min-width:0;}' +
      '.vs-playnext__kicker{font-size:.78rem;font-weight:700;letter-spacing:.02em;' +
        'color:var(--text,#f4f6fb);margin:0 0 .15rem;}' +
      '.vs-playnext__reason{font-size:.82rem;color:var(--muted,#9aa3b2);margin:0;}' +
      '.vs-playnext__cta{flex:0 0 auto;background:var(--gold,#ffc400);color:#1a1205;' +
        'font-weight:700;font-size:.86rem;padding:.55rem 1.1rem;border-radius:9px;' +
        'text-decoration:none;white-space:nowrap;}' +
      '.vs-playnext__cta:hover{filter:brightness(1.06);}' +
      '@media(max-width:480px){.vs-playnext__cover{display:none;}}';
    document.head.appendChild(s);
  }

  function render(t) {
    styles();
    var card = document.createElement('aside');
    card.className = 'vs-playnext';
    card.setAttribute('aria-label', 'Play next: ' + t.name);

    // Cover art
    var coverKey = COVERS[t.slug];
    if (coverKey) {
      var img = document.createElement('img');
      img.className = 'vs-playnext__cover';
      img.src = '/assets/covers/' + coverKey + '.png';
      img.alt = t.name + ' cover';
      img.width = 72;
      img.height = 54;
      img.loading = 'lazy';
      card.appendChild(img);
    }

    // Body: personalized kicker + reason
    var body = document.createElement('div');
    body.className = 'vs-playnext__body';
    var k = document.createElement('p');
    k.className = 'vs-playnext__kicker';
    k.textContent = 'Haven’t tried ' + t.name + ' yet?';
    var reason = document.createElement('p');
    reason.className = 'vs-playnext__reason';
    reason.textContent = t.reason;
    body.appendChild(k);
    body.appendChild(reason);
    card.appendChild(body);

    // CTA
    var cta = document.createElement('a');
    cta.className = 'vs-playnext__cta';
    cta.href = t.url;
    cta.textContent = 'Play it →';
    cta.addEventListener('click', function () { emitUx('play-next:click', t.slug); });
    card.appendChild(cta);

    // Mount: after .game-hero (above the fold) > [data-play-next] > prepend main > append body
    var hook = document.querySelector('[data-play-next]');
    if (hook) {
      hook.appendChild(card);
    } else {
      var hero = document.querySelector('.game-hero');
      if (hero) {
        hero.insertAdjacentElement('afterend', card);
      } else {
        var mainEl = document.querySelector('main') ||
          document.getElementById('main-content') ||
          document.body;
        if (mainEl.firstChild) {
          mainEl.insertBefore(card, mainEl.firstChild);
        } else {
          mainEl.appendChild(card);
        }
      }
    }

    emitUx('play-next:shown', t.slug);
  }

  function boot() {
    var slug = currentSlug();
    if (!slug) return;
    fetch(DATA_URL, { cache: 'default' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var t = pickTarget(data, slug);
        if (!t) return;
        render(t);
      })
      .catch(function () {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else { boot(); }
})();
