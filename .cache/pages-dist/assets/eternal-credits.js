/**
 * VaultSpark — Eternal Credits splash helper.
 *
 * Shared module used by game splash screens (Call of Doodie, Gridiron GM,
 * MindFrame, Vaultfront, Solara, The Exodus, etc.) and by the studio site's
 * Eternal surfaces to render the opt-in credits roster of VaultSparked Eternal
 * members. Zero dependencies, CSP-clean (no inline), fail-safe (empty default).
 *
 * Contract: /api/eternal-credits.json
 *   {
 *     schemaVersion: "1.0",
 *     generated:      ISO string | null,
 *     credits:        [ { name: string, flair?: string, joined?: ISO } ]
 *   }
 *
 * Usage (HTML):
 *   <div data-eternal-credits
 *        data-eternal-credits-title="Eternal Patrons"
 *        data-eternal-credits-max="30"></div>
 *   <script src="https://vaultsparkstudios.com/assets/eternal-credits.js" defer></script>
 *
 * Usage (programmatic):
 *   window.VSEternalCredits.fetch().then(data => { ... })
 *   window.VSEternalCredits.render(element, data)
 */
(function () {
  'use strict';

  var FEED_URL = 'https://vaultsparkstudios.com/api/eternal-credits.json';
  var CACHE_TTL_MS = 10 * 60 * 1000; // 10 min — match public-intelligence shared cache convention
  var _cache = null;
  var _cacheAt = 0;
  var _styleInjected = false;

  // Scoped default CSS so game splash screens and website surfaces render
  // presentably out-of-the-box. Consumers can override by scoping their own
  // rules more specifically. All classes are prefixed `vs-ec__` to avoid
  // collisions with game-side styles.
  var STYLE = [
    '.vs-ec__title{font-family:Georgia,serif;letter-spacing:0.08em;text-transform:uppercase;font-size:0.78rem;color:#d4af37;margin-bottom:0.5rem;opacity:0.9;}',
    '.vs-ec__list{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:0.35rem 0.85rem;}',
    '.vs-ec__row{font-family:Georgia,serif;font-size:0.92rem;color:inherit;opacity:0.92;}',
    '.vs-ec__flair{font-size:0.72em;color:#d4af37;margin-left:0.25rem;letter-spacing:0.04em;}',
    '.vs-ec__overflow{margin-top:0.5rem;font-size:0.75rem;color:#d4af37;opacity:0.75;font-family:Georgia,serif;letter-spacing:0.04em;}'
  ].join('');

  function injectStyle() {
    if (_styleInjected) return;
    _styleInjected = true;
    var s = document.createElement('style');
    s.setAttribute('data-eternal-credits-style', '1');
    s.appendChild(document.createTextNode(STYLE));
    document.head.appendChild(s);
  }

  function fetchCredits() {
    var now = Date.now();
    if (_cache && now - _cacheAt < CACHE_TTL_MS) return Promise.resolve(_cache);
    return fetch(FEED_URL, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        _cache = data;
        _cacheAt = Date.now();
        return data;
      })
      .catch(function () {
        return { schemaVersion: '1.0', generated: null, credits: [] };
      });
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function render(host, data) {
    if (!host || !data) return;
    var credits = Array.isArray(data.credits) ? data.credits : [];
    var max = parseInt(host.getAttribute('data-eternal-credits-max') || '30', 10);
    var title = host.getAttribute('data-eternal-credits-title') || 'Eternal Patrons';

    if (credits.length === 0) {
      // Empty state: hide rather than advertise "none yet" — game splash screens
      // should render a neutral fallback, not an empty list.
      host.hidden = true;
      host.setAttribute('data-eternal-credits-state', 'empty');
      return;
    }

    host.hidden = false;
    host.setAttribute('data-eternal-credits-state', 'ready');

    var shown = credits.slice(0, max);
    var rows = shown.map(function (c) {
      var name = esc(c.name || '').trim();
      if (!name) return '';
      var flair = c.flair ? ' <span class="vs-ec__flair">' + esc(c.flair) + '</span>' : '';
      return '<li class="vs-ec__row">' + name + flair + '</li>';
    }).filter(Boolean).join('');

    var overflow = credits.length > shown.length
      ? '<div class="vs-ec__overflow">+' + (credits.length - shown.length) + ' more Eternal patrons</div>'
      : '';

    host.innerHTML =
      '<div class="vs-ec__title">' + esc(title) + '</div>' +
      '<ul class="vs-ec__list">' + rows + '</ul>' +
      overflow;
  }

  function init() {
    var hosts = document.querySelectorAll('[data-eternal-credits]');
    if (!hosts.length) return;
    injectStyle();
    fetchCredits().then(function (data) {
      hosts.forEach(function (h) { render(h, data); });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.VSEternalCredits = { fetch: fetchCredits, render: render };
})();
