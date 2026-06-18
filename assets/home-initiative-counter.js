/* home-initiative-counter.js — S200 #6
   Replaces the static "27 initiatives" promo claim with self-proving live counts
   derived from the same public-intelligence feed the hero spotlight uses. Honest
   empty state: if the feed is unavailable the strip stays hidden and the prose stands.
   No RUM emit (avoids allowlist coupling); pure read + render. */
(function () {
  'use strict';
  function boot() {
    var strip = document.querySelector('[data-initiative-counts]');
    if (!strip) return;

    var source = (window.VSPublicIntel && typeof window.VSPublicIntel.get === 'function')
      ? window.VSPublicIntel.get()
      : fetch('/api/public-intelligence.json', { cache: 'no-cache' })
          .then(function (r) { if (!r.ok) throw new Error('fetch'); return r.json(); });

    Promise.resolve(source)
      .then(function (data) {
        var catalog = (data && data.catalog) || [];
        if (!Array.isArray(catalog) || !catalog.length) return; // honest: leave hidden
        var counts = { SPARKED: 0, FORGE: 0, VAULTED: 0 };
        catalog.forEach(function (c) {
          var s = (c.status || '').toUpperCase();
          // SEALED retired — it's what VAULTED means (coined vocab); fold any in.
          if (s === 'SEALED') s = 'VAULTED';
          if (counts[s] != null) counts[s] += 1;
        });
        var map = {
          sparked: counts.SPARKED,
          forge: counts.FORGE,
          vaulted: counts.VAULTED
        };
        var any = false;
        strip.querySelectorAll('.pti-count').forEach(function (el) {
          var n = map[el.dataset.status];
          var num = el.querySelector('.pti-num');
          if (num && typeof n === 'number') { num.textContent = String(n); if (n > 0) any = true; }
        });
        if (any) strip.hidden = false;
      })
      .catch(function () { /* silent — keep prose-only when intelligence is down */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
