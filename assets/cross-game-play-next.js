/* cross-game-play-next.js — S187 cross-product routing.
   A studio brand's structural advantage over a single-game site is re-spending
   attention across the catalog (Lou's audience-compounding thesis). When a
   visitor reaches a game page, surface ONE tailored "play next" card that always
   points at a PLAYABLE title — so a forge page never dead-ends and a live page
   routes to the other live game.

   Honest-dark: render only when a real, playable recommendation exists and it
   isn't the current page. TT-safe (DOM nodes + textContent only). Loads on game
   routes; mounts into [data-play-next] if present, else appends after main. */
(function () {
  'use strict';

  var DATA_URL = '/data/game-affinity.json';

  function emitUx(event, slug) {
    try {
      var body = JSON.stringify({ route: location.pathname || '/', ux: event, label: slug || '' });
      if (navigator.sendBeacon) navigator.sendBeacon('/v/rum', new Blob([body], { type: 'application/json' }));
    } catch (_e) {}
  }

  // Current game slug = first path segment, with or without a /games/ prefix.
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
    // fall through to the first playable that isn't the current page
    if (!targetSlug || !live[targetSlug]) {
      var pool = data._forgePlayNow || Object.keys(live);
      targetSlug = pool.filter(function (s) { return s !== slug; })[0];
    }
    if (!targetSlug || targetSlug === slug) return null;
    var t = live[targetSlug];
    if (!t || !t.url) return null;            // honest-dark: only route to playable
    // don't recommend the page you're already on (alias-safe by URL)
    if (location.pathname.replace(/\/+$/, '') === t.url.replace(/\/+$/, '')) return null;
    return { slug: targetSlug, name: t.name, url: t.url, reason: (aff && aff.reason) || 'Playable right now.' };
  }

  function styles() {
    if (document.getElementById('vs-playnext-style')) return;
    var s = document.createElement('style');
    s.id = 'vs-playnext-style';
    s.textContent = '.vs-playnext{display:flex;align-items:center;gap:1rem;flex-wrap:wrap;max-width:680px;margin:2.4rem auto;padding:1rem 1.25rem;border:1px solid rgba(255,196,0,.22);border-radius:14px;background:rgba(255,196,0,.05)}.vs-playnext__body{flex:1 1 240px;min-width:0}.vs-playnext__kicker{font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted,#9aa3b2);margin:0 0 .2rem}.vs-playnext__name{font-size:1.05rem;font-weight:700;color:var(--text,#f4f6fb);margin:0 0 .15rem}.vs-playnext__reason{font-size:.84rem;color:var(--muted,#9aa3b2);margin:0}.vs-playnext__cta{flex:0 0 auto;background:var(--gold,#ffc400);color:#1a1205;font-weight:700;font-size:.86rem;padding:.55rem 1rem;border-radius:9px;text-decoration:none;white-space:nowrap}.vs-playnext__cta:hover{filter:brightness(1.06)}';
    document.head.appendChild(s);
  }

  function render(root, t) {
    styles();
    var card = document.createElement('aside');
    card.className = 'vs-playnext';
    card.setAttribute('aria-label', 'Play next');
    var body = document.createElement('div');
    body.className = 'vs-playnext__body';
    var k = document.createElement('p'); k.className = 'vs-playnext__kicker'; k.textContent = 'Play next';
    var name = document.createElement('p'); name.className = 'vs-playnext__name'; name.textContent = t.name;
    var reason = document.createElement('p'); reason.className = 'vs-playnext__reason'; reason.textContent = t.reason;
    body.appendChild(k); body.appendChild(name); body.appendChild(reason);
    var cta = document.createElement('a');
    cta.className = 'vs-playnext__cta';
    cta.href = t.url;
    cta.textContent = 'Play it →';
    cta.addEventListener('click', function () { emitUx('play-next:click', t.slug); });
    card.appendChild(body); card.appendChild(cta);
    root.appendChild(card);
    emitUx('play-next:shown', t.slug);
  }

  function mountPoint() {
    return document.querySelector('[data-play-next]') ||
      document.querySelector('main') ||
      document.getElementById('main-content') ||
      document.body;
  }

  function boot() {
    var slug = currentSlug();
    if (!slug) return;
    fetch(DATA_URL, { cache: 'default' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var t = pickTarget(data, slug);
        if (!t) return;                       // honest-dark
        render(mountPoint(), t);
      })
      .catch(function () { /* data unreachable → render nothing */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else { boot(); }
})();
