/* cross-game-play-next.js — S187 cross-product routing (S206 redesign, S207 retime).
   A studio brand's structural advantage over a single-game site is re-spending
   attention across the catalog (Lou's audience-compounding thesis). When a
   visitor reaches a game page, surface ONE tailored "play next" card that always
   points at a PLAYABLE title — so a forge page never dead-ends and a live page
   routes to the other live game.

   S207 retime (audit play-next-intent-retiming): the S206 above-the-fold variant
   measured 18 impressions / 0 clicks (api/dead-ctas.json) — firing before a
   visitor engaged fought the page's own primary Play CTA and read as a banner.
   Fix is timing + framing, not pixels:
     • reveal is now ENGAGEMENT-GATED — mounts only after scroll ≥60% OR 45s
       dwell OR exit-intent, whichever fires first (it reads as a next-step, not
       an interruption);
     • copy is COMPLETION-FRAMED ("Done here? [Name] is live too — play free")
       instead of pre-engagement "Haven't tried X yet?";
     • it's a real standalone card with its own visual weight, not a divider strip.
   play-next:shown emits only on actual reveal so check-dead-ctas measures the new
   timing fairly. Honest-dark: renders only when a real, playable recommendation
   exists and it isn't the current page. TT-safe (DOM nodes + textContent/src). */
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
      '.vs-playnext{display:flex;align-items:center;gap:1.1rem;flex-wrap:wrap;' +
        'max-width:760px;margin:2.5rem auto;padding:1.15rem 1.35rem;' +
        'border:1px solid rgba(255,196,0,.22);border-radius:14px;' +
        'background:linear-gradient(135deg,rgba(255,196,0,.07),rgba(255,196,0,.02));' +
        'box-shadow:0 6px 24px rgba(0,0,0,.18);' +
        'opacity:0;transform:translateY(12px);' +
        'transition:opacity .5s ease,transform .5s ease;}' +
      '.vs-playnext.is-in{opacity:1;transform:none;}' +
      '.vs-playnext__cover{flex:0 0 auto;width:96px;height:72px;object-fit:cover;' +
        'border-radius:10px;border:1px solid rgba(255,196,0,.25);}' +
      '.vs-playnext__body{flex:1 1 220px;min-width:0;}' +
      '.vs-playnext__kicker{font-size:.95rem;font-weight:800;letter-spacing:.01em;' +
        'color:var(--text,#f4f6fb);margin:0 0 .2rem;}' +
      '.vs-playnext__reason{font-size:.84rem;color:var(--muted,#9aa3b2);margin:0;}' +
      '.vs-playnext__cta{flex:0 0 auto;background:var(--gold,#ffc400);color:#1a1205;' +
        'font-weight:800;font-size:.9rem;padding:.62rem 1.25rem;border-radius:10px;' +
        'text-decoration:none;white-space:nowrap;}' +
      '.vs-playnext__cta:hover{filter:brightness(1.06);}' +
      '@media(prefers-reduced-motion:reduce){.vs-playnext{transition:none;opacity:1;transform:none;}}' +
      '@media(max-width:480px){.vs-playnext__cover{width:72px;height:54px;}}';
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
    k.textContent = 'Done here? ' + t.name + ' is live too — play free';
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

    // Mount (S207): a completion-framed "what's next" card belongs at the END of
    // the content, not above the fold — explicit [data-play-next] hook wins, else
    // append to the end of main. (The old after-hero mount was the dead variant.)
    var hook = document.querySelector('[data-play-next]');
    if (hook) {
      hook.appendChild(card);
    } else {
      var mainEl = document.querySelector('main') ||
        document.getElementById('main-content') ||
        document.body;
      mainEl.appendChild(card);
    }
    return card;
  }

  // S207: reveal only on an engagement signal so the card reads as a next-step,
  // not a pre-engagement interruption. Fires once, then disarms all triggers.
  function armReveal(card, slug) {
    var revealed = false;
    var cleanup = [];
    function reveal() {
      if (revealed) return;
      revealed = true;
      cleanup.forEach(function (fn) { try { fn(); } catch (_e) {} });
      // Force layout so the transition runs from the hidden state.
      void card.offsetWidth;
      card.classList.add('is-in');
      emitUx('play-next:shown', slug);
    }

    // 1) Scroll depth ≥60% of the document.
    function onScroll() {
      var doc = document.documentElement;
      var scrolled = (window.scrollY || doc.scrollTop || 0) + window.innerHeight;
      var height = Math.max(doc.scrollHeight, document.body.scrollHeight, 1);
      if (scrolled / height >= 0.6) reveal();
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    cleanup.push(function () { window.removeEventListener('scroll', onScroll); });

    // 2) Dwell ≥45s.
    var dwell = setTimeout(reveal, 45000);
    cleanup.push(function () { clearTimeout(dwell); });

    // 3) Exit-intent (pointer leaves toward the top of the viewport).
    function onLeave(e) { if ((e.clientY || 0) <= 0) reveal(); }
    document.addEventListener('mouseout', onLeave);
    cleanup.push(function () { document.removeEventListener('mouseout', onLeave); });

    // In case the page is already short / scrolled past 60% on load.
    onScroll();
  }

  function boot() {
    var slug = currentSlug();
    if (!slug) return;
    fetch(DATA_URL, { cache: 'default' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var t = pickTarget(data, slug);
        if (!t) return;
        var card = render(t);
        if (card) armReveal(card, t.slug);
      })
      .catch(function () {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else { boot(); }
})();
