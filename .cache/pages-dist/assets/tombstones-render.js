/* tombstones-render.js — hydrate /vault/tombstones/ from data/tombstones.json.
 *
 * Static SSR fallback exists in the HTML. This script swaps the grid for the
 * live data if the JSON is newer or has additional entries, preserving the
 * structure already styled by the page.
 */
(function () {
  'use strict';
  if (!('fetch' in window)) return;
  var grid = document.querySelector('[data-tombstones-grid]');
  if (!grid) return;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function renderCard(t) {
    var lessons = (t.lessons || []).map(function (l) {
      return '<li>' + esc(l) + '</li>';
    }).join('');
    var succ = t.successorHref
      ? '<a class="tomb-successor" href="' + esc(t.successorHref) + '">' + esc(t.successorLabel || t.successor || 'Successor') + '</a>'
      : '';
    var era = t.era ? esc(t.era) : '';
    if (t.vaulted) era += (era ? ' · ' : '') + 'vaulted ' + esc(t.vaulted);
    return '' +
      '<article class="tomb-card" data-slug="' + esc(t.slug) + '">' +
        '<div class="tomb-head">' +
          '<h2>' + esc(t.name) + '</h2>' +
          (t.kind ? '<span class="tomb-kind">' + esc(t.kind) + '</span>' : '') +
          (era ? '<span class="tomb-era">' + era + '</span>' : '') +
        '</div>' +
        (t.epitaph ? '<p class="tomb-epitaph">' + esc(t.epitaph) + '</p>' : '') +
        (lessons ? '<ul class="tomb-lessons">' + lessons + '</ul>' : '') +
        succ +
      '</article>';
  }

  fetch('/data/tombstones.json', { credentials: 'omit' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data || !Array.isArray(data.tombstones)) return;
      // Only swap if the JSON has at least as many entries as the SSR grid —
      // never replace good static HTML with an empty list on a transient fetch error.
      var staticCount = grid.querySelectorAll('.tomb-card').length;
      if (data.tombstones.length < staticCount) return;
      grid.innerHTML = data.tombstones.map(renderCard).join('');
    })
    .catch(function () { /* keep static fallback */ });
})();
