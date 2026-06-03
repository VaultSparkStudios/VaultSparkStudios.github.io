(function () {
  'use strict';

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function parseDate(raw) {
    if (!raw) return 0;
    // Accepts "April 2026", "2026-04-13", "March 2026", etc.
    var d = new Date(String(raw).trim());
    if (!isNaN(d.getTime())) return d.getTime();
    // Fallback: try to extract a year + month from text
    var m = String(raw).match(/(\d{4})[-\/]?(\d{1,2})?/);
    if (m) {
      var yr = Number(m[1]);
      var mo = Number(m[2] || 1);
      return new Date(yr, mo - 1, 1).getTime();
    }
    return 0;
  }

  function formatDate(raw) {
    if (!raw) return '';
    try {
      var d = new Date(raw.trim());
      if (isNaN(d.getTime())) return raw.trim();
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch (_) {
      return raw.trim();
    }
  }

  function sortNewestFirst(entries) {
    return entries.slice().sort(function (a, b) { return parseDate(b.date) - parseDate(a.date); });
  }

  function renderEntries(container, entries) {
    container.innerHTML = entries.map(function (entry) {
      return (
        '<article class="recent-ship-card">' +
          '<div class="recent-ship-meta">' + escapeHtml(entry.date) + '</div>' +
          '<h3 class="recent-ship-title">' + escapeHtml(entry.title) + '</h3>' +
          '<ul class="recent-ship-list">' +
            entry.items.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('') +
          '</ul>' +
        '</article>'
      );
    }).join('');
  }

  function loadFromIntel(intel) {
    var feed = intel && intel.consumerChangelog;
    if (!Array.isArray(feed) || !feed.length) return null;
    return sortNewestFirst(feed).slice(0, 3).map(function (entry) {
      return {
        date: entry.date || '',
        title: entry.title || '',
        items: Array.isArray(entry.highlights) ? entry.highlights.slice(0, 3) : []
      };
    });
  }

  async function loadFromChangelog() {
    var response = await fetch('/changelog/');
    if (!response.ok) throw new Error('changelog_fetch_failed');
    var html = await response.text();
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var phases = Array.from(doc.querySelectorAll('.cl-phase')).map(function (phase) {
      var rawDate = (phase.querySelector('.cl-phase-date') || {}).textContent || '';
      return {
        date: formatDate(rawDate),
        rawDate: rawDate,
        title: (phase.querySelector('.cl-phase-title') || {}).textContent || 'Recent update',
        items: Array.from(phase.querySelectorAll('.cl-items li')).slice(0, 3).map(function (li) {
          return li.textContent.trim();
        })
      };
    });
    // Sort newest first by parsed raw date, then take top 3.
    return phases.sort(function (a, b) { return parseDate(b.rawDate) - parseDate(a.rawDate); }).slice(0, 3);
  }

  function renderFallback(container) {
    container.innerHTML =
      '<article class="recent-ship-card">' +
        '<div class="recent-ship-meta">Active development</div>' +
        '<h3 class="recent-ship-title">The studio is shipping</h3>' +
        '<ul class="recent-ship-list"><li>See the full release history in the changelog.</li></ul>' +
      '</article>';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var containers = document.querySelectorAll('[data-recent-ships]');
    if (!containers.length) return;

    var intelPromise = window.VSPublicIntel ? window.VSPublicIntel.get() : Promise.resolve(null);

    intelPromise.then(function (intel) {
      var intelEntries = loadFromIntel(intel);
      if (intelEntries) {
        containers.forEach(function (c) { renderEntries(c, intelEntries); });
        return;
      }
      return loadFromChangelog().then(function (entries) {
        containers.forEach(function (c) { renderEntries(c, entries); });
      });
    }).catch(function () {
      containers.forEach(renderFallback);
    });
  });
})();
