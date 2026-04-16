(function (window) {
  'use strict';

  function inferContext(root) {
    if (root && root.dataset.trustContext) return root.dataset.trustContext;
    var path = window.location.pathname;
    if (path === '/') return 'home';
    if (path.indexOf('/membership') === 0) return 'membership';
    if (path.indexOf('/vaultsparked') === 0) return 'vaultsparked';
    return 'home';
  }

  function buildModules(context, state, intel) {
    var freshShipCount = intel && intel.pulse && intel.pulse.shipped ? intel.pulse.shipped.length : 0;
    var activeEdges = intel && intel.stats ? intel.stats.activeEdgeFunctions : 0;
    var trackedAccounts = intel && intel.social && intel.social.summary ? intel.social.summary.trackedAccounts : 0;

    var whyReal = {
      label: 'Why This Is Real',
      title: 'The vault already has live proof behind it.',
      copy: 'This is not a fake concept funnel. There are live members, active progression, ' + activeEdges + ' edge functions, and ' + freshShipCount + ' fresh shipped signals already in the public operating layer.'
    };

    var next = {
      label: 'What Happens Next',
      title: 'The path stays coherent after the click.',
      copy: 'Your next action should not dump you into a dead end. Identity, pricing, worldbuilding, and studio pulse all now hand off into each other instead of behaving like isolated pages.'
    };

    var hesitation = {
      label: 'If You Are Hesitating',
      title: 'Start with the lowest-risk move.',
      copy: 'If conviction is still forming, the vault supports that. Use the free identity, read the live pulse, or follow the universe surfaces first. Nothing here requires blind faith.'
    };

    if (context === 'vaultsparked') {
      next.copy = state.membership_temperature === 'hot'
        ? 'You are already showing purchase intent. The remaining question is whether Sparked or Eternal better matches how directly you want to back the studio.'
        : 'The safest sequence is still free identity first, then paid depth only after the portal, rank, and proof surfaces feel earned.';
      hesitation.copy = 'If you are unsure about paying, that is healthy. The site now explicitly supports a lower-risk sequence: free identity, live proof, then upgrade the same account later.';
    } else if (context === 'membership') {
      next.copy = 'Membership is the identity layer first. One account carries rank, achievements, challenges, and future access across everything the studio ships.';
      hesitation.copy = 'If you do not want to commit money yet, do not. The free tier is not a crippled teaser; it is the actual foundation layer of the vault.';
    } else if (state.intent === 'lore') {
      next.copy = 'Your likely best path is not raw monetization. It is world affinity first, then identity, then deeper support if the studio earns it.';
      hesitation.copy = 'If you are still deciding whether the vault is for you, follow the universe, journal, and pulse surfaces. The system is designed to let conviction build gradually.';
    }

    return [whyReal, next, hesitation, {
      label: 'Founder Promise',
      title: 'The site is trying to feel earned, not generic.',
      copy: 'VaultSpark is treating branding, proof, operations, and community identity as one system. ' + trackedAccounts + ' tracked social/account surfaces and the Studio OS bridge exist to keep that promise coherent.'
    }];
  }

  function renderRoot(root, intel) {
    var context = inferContext(root);
    var state = window.VSIntentState ? window.VSIntentState.getState() : {};
    var modules = buildModules(context, state, intel);

    root.innerHTML =
      '<div class="trust-depth-shell">' +
        '<div class="trust-depth-head">' +
          '<p class="trust-depth-kicker">Trust Depth</p>' +
          '<h3 class="trust-depth-title">Reduce hesitation without flattening the brand.</h3>' +
          '<p class="trust-depth-copy">This layer is here to answer the quiet questions: is this real, what happens next, and what is the safest way to move forward?</p>' +
        '</div>' +
        '<div class="trust-depth-grid">' +
          modules.map(function (item) {
            return '<article class="trust-depth-card">' +
              '<span class="trust-depth-label">' + item.label + '</span>' +
              '<strong>' + item.title + '</strong>' +
              '<p>' + item.copy + '</p>' +
            '</article>';
          }).join('') +
        '</div>' +
      '</div>';

    if (window.VSIntentState) {
      window.VSIntentState.noteExposure('trust_depth_' + context);
    }
  }

  function init() {
    var roots = document.querySelectorAll('[data-trust-depth-root]');
    if (!roots.length) return;

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
