/**
 * VaultSpark — Changelog live feed.
 *
 * Renders public-safe consumerChangelog entries from public-intelligence.json
 * as `.cl-phase` articles prepended above the legacy hardcoded timeline. This
 * closes the gap between the last hardcoded session (S66) and what the studio
 * has actually shipped, using only public-safe copy authored in
 * scripts/generate-public-intelligence.mjs (CONSUMER_CHANGELOG).
 *
 * Sort order: newest first, so the feed reads top-to-bottom as a live log.
 */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function parseDate(raw) {
    if (!raw) return 0;
    var d = new Date(String(raw).trim());
    if (!isNaN(d.getTime())) return d.getTime();
    var m = String(raw).match(/(\d{4})[-\/]?(\d{1,2})?/);
    if (m) return new Date(Number(m[1]), Number(m[2] || 1) - 1, 1).getTime();
    return 0;
  }

  function formatLabel(raw) {
    if (!raw) return '';
    var d = new Date(String(raw).trim());
    if (isNaN(d.getTime())) return String(raw).trim();
    // ISO-style date → "April 21, 2026"
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
    // Month + year → leave as-is
    return String(raw).trim();
  }

  function renderEntry(entry, index) {
    var items = Array.isArray(entry.highlights) ? entry.highlights : [];
    var label = formatLabel(entry.date);
    return (
      '<article class="cl-phase cl-phase--live" data-reveal="fade-up" data-cl-live="1">' +
        '<div class="cl-dot" aria-hidden="true"></div>' +
        '<div class="cl-phase-header">' +
          '<span class="cl-phase-num">Live</span><span class="cl-phase-date">' + esc(label) + '</span>' +
          '<div class="cl-phase-title">' + esc(entry.title || 'Vault update') + '</div>' +
        '</div>' +
        '<ul class="cl-items">' +
          items.map(function (li) { return '<li>' + esc(li) + '</li>'; }).join('') +
        '</ul>' +
      '</article>'
    );
  }

  function init() {
    var timeline = document.querySelector('.cl-timeline');
    if (!timeline || !window.VSPublicIntel) return;

    window.VSPublicIntel.get().then(function (intel) {
      var feed = intel && intel.consumerChangelog;
      if (!Array.isArray(feed) || !feed.length) return;

      var sorted = feed.slice().sort(function (a, b) { return parseDate(b.date) - parseDate(a.date); });
      var html = sorted.map(renderEntry).join('');

      // Prepend so live entries appear above the hardcoded legacy timeline.
      timeline.insertAdjacentHTML('afterbegin', html);

      // Notify any listeners (e.g., changelog-time-machine) that the DOM has new entries.
      document.dispatchEvent(new CustomEvent('vs:changelog-live-rendered'));
    }).catch(function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
