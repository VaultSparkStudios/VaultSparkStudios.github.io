(function (window) {
  'use strict';

  function inferContext(root) {
    if (root && root.dataset.networkContext) return root.dataset.networkContext;
    var path = window.location.pathname;
    if (path === '/') return 'home';
    if (path.indexOf('/studio-pulse') === 0) return 'pulse';
    if (path.indexOf('/membership') === 0) return 'membership';
    if (path.indexOf('/vaultsparked') === 0) return 'vaultsparked';
    return 'home';
  }

  function featuredLinks(context, intel) {
    var links = [
      {
        label: 'Live Site',
        title: 'Public website surface',
        copy: 'The public brand, games, membership, and intelligence surfaces all live here.',
        href: '/',
        cta: 'Open Home'
      },
      {
        label: 'Studio Pulse',
        title: 'Operating truth surface',
        copy: 'Now / next / shipped and catalog-state are rendered from the same truth spine.',
        href: '/studio-pulse/',
        cta: 'Read Pulse'
      },
      {
        label: 'Repo',
        title: 'Public code and delivery trail',
        copy: 'The GitHub surface remains part of the same network story, not an unrelated endpoint.',
        href: 'https://github.com/VaultSparkStudios/VaultSparkStudios.github.io',
        cta: 'View Repo'
      }
    ];

    if (context === 'pulse') {
      links[0] = {
        label: 'Membership',
        title: 'Identity and conversion layer',
        copy: 'The operating pulse feeds directly into the account and membership surfaces.',
        href: '/membership/',
        cta: 'Open Membership'
      };
    }

    if (intel && intel.ecosystem && intel.ecosystem.bridges && intel.ecosystem.bridges.socialDashboard && intel.ecosystem.bridges.socialDashboard.enabled) {
      links.push({
        label: 'Social Dashboard',
        title: 'Cross-channel signal bridge',
        copy: 'Social presence, funnel signal, and public-intelligence metadata share the same contract-backed spine.',
        href: 'https://app-social-dashboard.vaultsparkstudios.com',
        cta: 'View Dashboard'
      });
    }

    return links.slice(0, 4);
  }

  function renderRoot(root, intel) {
    var context = inferContext(root);
    var bridges = intel && intel.ecosystem ? intel.ecosystem.bridges : null;
    var state = window.VSIntentState ? window.VSIntentState.getState() : {};
    var links = featuredLinks(context, intel);
    var bridgeSummary = [];
    var focusCopy = 'This is the connective tissue. Freshness, labels, links, and public-safe truth are now meant to feel like one network instead of parallel tools.';

    if (bridges && bridges.studioHub && bridges.studioHub.enabled) {
      bridgeSummary.push('Studio Hub: ' + bridges.studioHub.mode);
    }
    if (bridges && bridges.socialDashboard && bridges.socialDashboard.enabled) {
      bridgeSummary.push('Social Dashboard: ' + bridges.socialDashboard.mode);
    }
    if (intel && intel.social && intel.social.summary) {
      bridgeSummary.push(intel.social.summary.trackedAccounts + ' tracked accounts');
    }

    if (state.hesitation_signal === 'need_proof') {
      focusCopy = 'The strongest hesitation signal is proof. This network layer exists to show that the website, pulse, repo, and social surfaces are all reporting from the same operating spine.';
    } else if (state.intent === 'investor') {
      focusCopy = 'Your current read looks analytical. Use this network to trace live status, code, public pulse, and cross-channel presence before you trust any single surface.';
    } else if (state.intent === 'lore') {
      focusCopy = 'Your current read looks world-first. This network is here to prove the archive, studio pulse, and public surfaces belong to the same living system.';
    }

    root.innerHTML =
      '<div class="network-spine-shell">' +
        '<div class="network-spine-head">' +
          '<p class="network-spine-kicker">Vault Network</p>' +
          '<h3 class="network-spine-title">One operating spine across website, pulse, hub, and social surfaces.</h3>' +
          '<p class="network-spine-copy">' + focusCopy + '</p>' +
        '</div>' +
        '<div class="network-spine-meta">' +
          '<span class="network-spine-badge">Session ' + (intel && intel.project ? intel.project.currentSession : '—') + '</span>' +
          '<span class="network-spine-badge">' + (state.intent || 'player') + ' intent</span>' +
          '<span class="network-spine-badge">' + bridgeSummary.join(' · ') + '</span>' +
        '</div>' +
        '<div class="network-spine-grid">' +
          links.map(function (item) {
            return '<a class="network-spine-card" href="' + item.href + '"' + (item.href.indexOf('http') === 0 ? ' target="_blank" rel="noreferrer"' : '') + '>' +
              '<span class="network-spine-label">' + item.label + '</span>' +
              '<strong>' + item.title + '</strong>' +
              '<p>' + item.copy + '</p>' +
              '<span class="network-spine-cta">' + item.cta + '</span>' +
            '</a>';
          }).join('') +
        '</div>' +
      '</div>';

    if (window.VSIntentState) {
      window.VSIntentState.noteExposure('network_spine_' + context);
    }
  }

  function init() {
    var roots = document.querySelectorAll('[data-network-spine]');
    if (!roots.length || !window.VSPublicIntel) return;

    window.VSPublicIntel.get().then(function (intel) {
      roots.forEach(function (root) {
        renderRoot(root, intel);
      });
    });

    document.addEventListener('vs:intent-state-change', function () {
      window.VSPublicIntel.get().then(function (intel) {
        roots.forEach(function (root) {
          renderRoot(root, intel);
        });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
