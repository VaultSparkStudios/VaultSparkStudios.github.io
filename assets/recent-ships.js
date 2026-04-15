(function () {
  'use strict';

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  async function loadEntries() {
    var response = await fetch('/changelog/');
    if (!response.ok) throw new Error('Unable to load changelog');
    var html = await response.text();
    var doc = new DOMParser().parseFromString(html, 'text/html');
    return Array.from(doc.querySelectorAll('.cl-phase')).slice(0, 3).map(function (phase) {
      return {
        session: (phase.querySelector('.cl-phase-num') || {}).textContent || 'Recent',
        date: (phase.querySelector('.cl-phase-date') || {}).textContent || '',
        title: (phase.querySelector('.cl-phase-title') || {}).textContent || 'Recent progress',
        items: Array.from(phase.querySelectorAll('.cl-items li')).slice(0, 3).map(function (item) {
          return item.textContent.trim();
        })
      };
    });
  }

  function render(container, entries) {
    container.innerHTML = entries.map(function (entry) {
      return (
        '<article class="recent-ship-card">' +
          '<div class="recent-ship-meta">' + escapeHtml(entry.session) + ' · ' + escapeHtml(entry.date) + '</div>' +
          '<h3 class="recent-ship-title">' + escapeHtml(entry.title) + '</h3>' +
          '<ul class="recent-ship-list">' +
            entry.items.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('') +
          '</ul>' +
        '</article>'
      );
    }).join('');
  }

  document.addEventListener('DOMContentLoaded', function () {
    var containers = document.querySelectorAll('[data-recent-ships]');
    if (!containers.length) return;

    loadEntries().then(function (entries) {
      containers.forEach(function (container) { render(container, entries); });
    }).catch(function () {
      containers.forEach(function (container) {
        container.innerHTML =
          '<article class="recent-ship-card">' +
            '<div class="recent-ship-meta">Vault Activity</div>' +
            '<h3 class="recent-ship-title">Live changelog unavailable</h3>' +
            '<ul class="recent-ship-list"><li>Open the changelog for the full shipped history.</li></ul>' +
          '</article>';
      });
    });
  });
})();
