/* share-game.js — S194 web-share-per-game.

   The studio's only true viral surface is a player who just enjoyed a game —
   the cheapest acquisition channel a traffic-starved studio has — yet no game
   page offered a way to share. This adds a one-tap share control to each game
   hero (Web Share API on mobile, clipboard copy as fallback). It rides on the
   S194 og-image-raster-fix: every shared link now carries a real PNG card, so a
   share is an actual click-through, not a blank rectangle.

   Telemetry: emits the bounded `share:<slug>:<outcome>` RUM family (allowlisted
   in the Worker via prefixAllowlist, S194). Names only — slug is the game, outcome
   is native|copy|cancel|error. No URLs, no PII, same privacy model as every other
   /v/rum ux beacon.

   Self-mounting · idempotent · TT-safe (createElement only, no untrusted HTML) ·
   CSP-safe (no inline handlers). Loaded via ambient-loader predicate on /games/. */
(function () {
  'use strict';

  // Only on a game page: a shared .game-hero container or an explicit hook.
  var hero = document.querySelector('.game-hero, [data-share-game]');
  if (!hero) return;
  if (document.querySelector('.vs-share-game-btn')) return; // idempotent

  // Slug = the game, bounded to the Worker charset ([a-z0-9-], <=32). Derive from
  // an explicit data-share-game, else the last path segment.
  function deriveSlug() {
    var explicit = hero.getAttribute && hero.getAttribute('data-share-game');
    var raw = explicit || (location.pathname || '').replace(/\/+$/, '').split('/').filter(Boolean).pop() || 'game';
    return String(raw).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'game';
  }
  var slug = deriveSlug();

  // emitUx takes the FULL bounded event name (so the allowlist-integrity gate can
  // see the `share:` prefix at the call site, per the membership-unlock convention).
  function emitUx(name) {
    try {
      var body = JSON.stringify({ route: location.pathname || '/', ux: name });
      if (navigator.sendBeacon) navigator.sendBeacon('/v/rum', new Blob([body], { type: 'application/json' }));
    } catch (_) {}
  }
  function shareOutcome(outcome) { emitUx('share:' + slug + ':' + outcome); }

  function ogTitle() {
    var m = document.querySelector('meta[property="og:title"]');
    return (m && m.getAttribute('content')) || document.title || 'a VaultSpark game';
  }

  var canonical = (function () {
    var c = document.querySelector('link[rel="canonical"]');
    return (c && c.getAttribute('href')) || ('https://vaultsparkstudios.com' + (location.pathname || '/'));
  })();

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'button-ghost button-sm vs-share-game-btn';
  btn.textContent = '↗ Share this game';
  btn.setAttribute('aria-label', 'Share this game');
  // Light spacing so it reads as a secondary action under the hero CTAs without a
  // stylesheet edit; matches the inline-spacing other JS-injected controls use.
  btn.style.marginTop = '0.75rem';

  btn.addEventListener('click', function () {
    var title = ogTitle();
    var text = 'Play ' + title.replace(/\s*\|.*$/, '') + ' free in your browser — no download. From VaultSpark Studios.';
    if (navigator.share) {
      navigator.share({ title: title, text: text, url: canonical })
        .then(function () { shareOutcome('native'); })
        .catch(function () { shareOutcome('cancel'); });
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(canonical).then(function () {
        shareOutcome('copy');
        var orig = btn.textContent;
        btn.textContent = 'Link copied ✓';
        setTimeout(function () { btn.textContent = orig; }, 2200);
      }).catch(function () { shareOutcome('error'); });
      return;
    }
    shareOutcome('error');
  });

  // Prefer a hero actions row if present, else append to the hero itself.
  var slot = hero.querySelector('.hero-actions, .game-actions, .hero-art-content') || hero;
  slot.appendChild(btn);
})();
