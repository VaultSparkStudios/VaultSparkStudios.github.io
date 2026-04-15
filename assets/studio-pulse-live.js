(function () {
  'use strict';

  function renderList(id, items, kind) {
    var container = document.getElementById(id);
    if (!container) return;
    container.innerHTML = (items || []).map(function (item) {
      return '<div class="pulse-item ' + kind + '">' +
        '<div class="pulse-item-label">' + kind.toUpperCase() + '</div>' +
        '<div class="pulse-item-title">' + item + '</div>' +
      '</div>';
    }).join('');
  }

  function renderCatalog(items) {
    var container = document.getElementById('pulse-catalog-grid');
    if (!container) return;
    container.innerHTML = (items || []).map(function (item) {
      var colors = item.status === 'SPARKED'
        ? 'linear-gradient(90deg,#fbbf24,#10B981)'
        : 'linear-gradient(90deg,#f59e0b,#FF7A00)';
      return '<article class="game-status-card">' +
        '<div class="game-status-name">' + item.name + '</div>' +
        '<div class="game-status-tag">' + item.status + '</div>' +
        '<div class="game-progress-track"><div class="game-progress-fill" style="width:' + item.progress + '%;background:' + colors + ';"></div></div>' +
        '<div class="game-status-note">' + item.note + '</div>' +
      '</article>';
    }).join('');
  }

  function setStat(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.VSPublicIntel) return;
    window.VSPublicIntel.get().then(function (intel) {
      if (!intel) return;
      setStat('pulse-last-updated', 'Session ' + intel.project.currentSession + ' · ' + intel.project.lastUpdated);
      setStat('pulse-stat-sessions', intel.stats.sessionsCompleted);
      setStat('pulse-stat-live', intel.stats.liveProjects);
      setStat('pulse-stat-forge', intel.stats.projectsInForge);
      setStat('pulse-stat-edge', intel.stats.activeEdgeFunctions);
      setStat('pulse-stat-ranks', intel.stats.vaultRankTiers);
      setStat('pulse-stat-status', String(intel.project.ignis.score).toLocaleString('en-US'));
      setStat('pulse-stat-social', intel.stats.trackedSocialAccounts);
      renderList('pulse-now-list', intel.pulse.now, 'now');
      renderList('pulse-next-list', intel.pulse.next, 'next');
      renderList('pulse-shipped-list', intel.pulse.shipped, 'shipped');
      renderCatalog(intel.catalog);

      var bridgeNote = document.getElementById('pulse-bridge-note');
      if (bridgeNote && intel.ecosystem && intel.ecosystem.bridges) {
        var parts = [];
        if (intel.ecosystem.bridges.studioHub && intel.ecosystem.bridges.studioHub.enabled) {
          parts.push('Studio Hub shares the listing, pulse, and catalog contract');
        }
        if (intel.ecosystem.bridges.socialDashboard && intel.ecosystem.bridges.socialDashboard.enabled) {
          parts.push('Social Dashboard reads the same social-presence bridge');
        }
        if (intel.social && intel.social.summary) {
          parts.push(
            intel.social.summary.trackedAccounts + ' tracked accounts with ' +
            intel.social.summary.liveApiAccounts + ' live API-capable sources'
          );
        }
        if (parts.length) {
          bridgeNote.textContent = parts.join('. ') + '.';
        }
      }
    });
  });
})();
