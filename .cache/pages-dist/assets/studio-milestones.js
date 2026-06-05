/**
 * VaultSpark — Studio Milestones renderer.
 *
 * Replaces the static milestone grid with a live, evolving timeline that
 * mixes fixed origin milestones with dynamic data from public-intelligence.json
 * (session count, live project count, current focus). Public-safe copy only —
 * no internal scores, no session numbers, no operator-facing language.
 */
(function () {
  'use strict';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function buildMilestones(intel) {
    var stats = (intel && intel.stats) || {};
    var portfolio = (intel && intel.portfolio) || {};
    var sessions = stats.sessionsCompleted || 0;
    var liveProjects = stats.liveProjects || portfolio.sparked || 0;
    var forgeCount = stats.projectsInForge || portfolio.forge || 0;
    var sealedCount = portfolio.sealedCount || 0;
    var totalInitiatives = portfolio.total || 0;

    return [
      {
        status: 'done',
        era: 'March 2026',
        title: 'The Studio Opens',
        body: 'VaultSpark Studios is founded as an independent studio — one vault, many worlds.',
        accent: '#1FA2FF'
      },
      {
        status: 'done',
        era: 'March 2026',
        title: 'First World Sparked',
        body: 'Call of Doodie goes live — the first playable world inside the vault.',
        accent: '#FF7A00'
      },
      {
        status: 'done',
        era: 'March 2026',
        title: 'The Vault Opens',
        body: 'Members-only community launches with the 9-tier Vault Rank system and community challenges.',
        accent: '#FFC400'
      },
      {
        status: 'live',
        era: 'Now',
        title: 'The Vault Is Sparked',
        body: (liveProjects || '—') + ' worlds playable · ' + (forgeCount || '—') + ' more in the forge · ' + (sealedCount || '—') + ' sealed behind locks · ' + (sessions || '—') + ' build sessions on the record.',
        accent: '#10B981'
      },
      {
        status: 'next',
        era: 'On The Horizon',
        title: 'The Forge Expands',
        body: (totalInitiatives ? totalInitiatives + ' initiatives under the vault banner. ' : '') + 'New worlds open as the forge fires — members see each one first.',
        accent: '#8B5CF6'
      },
      {
        status: 'next',
        era: 'Ahead',
        title: 'The Full Catalog',
        body: 'Every sealed world eventually steps into the light. The horizon keeps moving — the vault keeps building.',
        accent: '#7EC9FF'
      }
    ];
  }

  function renderTimeline(root, items) {
    root.innerHTML = items.map(function (m) {
      var statusClass = 'milestone-card milestone-card--' + m.status;
      var pill = m.status === 'live'
        ? '<span class="milestone-pill milestone-pill--live"><span class="milestone-pill-dot" aria-hidden="true"></span>Active now</span>'
        : m.status === 'next'
          ? '<span class="milestone-pill milestone-pill--next">Ahead</span>'
          : '<span class="milestone-pill milestone-pill--done">Sparked</span>';
      return (
        '<article class="' + statusClass + '" style="--milestone-accent:' + m.accent + ';">' +
          '<div class="milestone-node" aria-hidden="true"></div>' +
          '<div class="milestone-head">' +
            '<span class="milestone-era">' + esc(m.era) + '</span>' +
            pill +
          '</div>' +
          '<h3 class="milestone-title">' + esc(m.title) + '</h3>' +
          '<p class="milestone-body">' + esc(m.body) + '</p>' +
        '</article>'
      );
    }).join('');
  }

  function init() {
    var root = document.querySelector('[data-milestones-root]');
    if (!root) return;
    var intelPromise = window.VSPublicIntel ? window.VSPublicIntel.get() : Promise.resolve(null);
    intelPromise.then(function (intel) {
      renderTimeline(root, buildMilestones(intel));
    }).catch(function () {
      renderTimeline(root, buildMilestones(null));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
