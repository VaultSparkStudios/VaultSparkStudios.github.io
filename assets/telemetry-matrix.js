(function (window) {
  'use strict';

  function inferContext(root) {
    if (root && root.dataset.telemetryContext) return root.dataset.telemetryContext;
    var path = window.location.pathname;
    if (path === '/') return 'home';
    if (path.indexOf('/membership') === 0) return 'membership';
    if (path.indexOf('/vaultsparked') === 0) return 'vaultsparked';
    return 'home';
  }

  function nextActionFor(context, state) {
    if (state.logged_in) {
      return {
        title: 'You already have the vault identity. Continue from inside.',
        copy: 'The highest-leverage move is no longer account creation. Open the member portal, resume progression, and decide whether deeper support is earned.',
        href: '/vault-member/',
        cta: 'Open Your Vault'
      };
    }

    if (context === 'vaultsparked') {
      if (state.membership_temperature === 'hot') {
        return {
          title: 'Compare the paid tiers now.',
          copy: 'Your current signal says the question is not whether the vault is interesting. It is which tier matches your conviction.',
          href: '#pricing',
          cta: 'See Pricing'
        };
      }
      return {
        title: 'Start free before you pay.',
        copy: 'The safer path is still the same: create the free identity, verify that the portal and progression feel real, then upgrade the same account.',
        href: '/vault-member/#register',
        cta: 'Join Free First'
      };
    }

    if (context === 'membership') {
      if (state.intent === 'supporter' || state.membership_temperature !== 'cold') {
        return {
          title: 'You are already warming toward paid membership.',
          copy: 'Review the tiers only after the identity layer feels right. The system is strongest when one account carries your rank, proof, and future upgrades.',
          href: '/vaultsparked/',
          cta: 'Compare Tiers'
        };
      }
      return {
        title: 'Create the identity first.',
        copy: 'This page is about the permanent account layer. Claim the free identity, then let the rest of the vault prove it deserves more of your attention.',
        href: '/vault-member/#register',
        cta: 'Create Free Account'
      };
    }

    if (state.intent === 'investor') {
      return {
        title: 'Read the operating surface before the funnel.',
        copy: 'Your signal reads analytical, not impulsive. Start with the studio pulse and bridge surfaces, then circle back into membership or product once confidence rises.',
        href: '/studio-pulse/',
        cta: 'Review Studio Pulse'
      };
    }

    if (state.intent === 'lore') {
      return {
        title: 'Follow the world signal, then decide whether to join.',
        copy: 'You look story-led. The clean path is universe first, then account creation once the world feels worth staying in.',
        href: '/universe/',
        cta: 'Enter The Archive'
      };
    }

    return {
      title: 'The clearest next move is to enter the vault.',
      copy: 'This project works best when your identity, rank, proof, and world access are tied to one account instead of anonymous browsing.',
      href: '/vault-member/#register',
      cta: 'Enter The Vault'
    };
  }

  function confidenceBand(state) {
    if (state.confidence >= 75) return 'high';
    if (state.confidence >= 45) return 'medium';
    return 'early';
  }

  function renderRoot(root, intel) {
    var context = inferContext(root);
    var state = window.VSIntentState ? window.VSIntentState.getState() : {};
    var nextAction = nextActionFor(context, state);
    var feedback = intel && intel.feedback && intel.feedback.localSummary ? intel.feedback.localSummary : null;
    var bridgeCopy = 'Generated from the same public-safe truth spine that feeds the website, Studio Hub, and social dashboard.';
    if (intel && intel.ecosystem && intel.ecosystem.bridges) {
      var enabled = [];
      if (intel.ecosystem.bridges.studioHub && intel.ecosystem.bridges.studioHub.enabled) enabled.push('Studio Hub');
      if (intel.ecosystem.bridges.socialDashboard && intel.ecosystem.bridges.socialDashboard.enabled) enabled.push('Social Dashboard');
      if (enabled.length) {
        bridgeCopy = enabled.join(' + ') + ' read the same contract-backed operating signal, so this page is not making up its own story.';
      }
    }
    var feedbackCopy = 'No local feedback signal yet. The routing model is still running on observed intent and exposure only.';
    if (feedback && feedback.totalResponses) {
      feedbackCopy = 'Local feedback says the top friction is "' + (feedback.topBlocker ? feedback.topBlocker.label : 'unclear') + '" and the strongest interest is "' + (feedback.topGoal ? feedback.topGoal.label : 'exploration') + '".';
    }

    root.innerHTML =
      '<div class="telemetry-matrix-shell">' +
        '<div class="telemetry-matrix-head">' +
          '<p class="telemetry-matrix-kicker">Signal Matrix</p>' +
          '<h3 class="telemetry-matrix-title">The vault is reading intent, not just clicks.</h3>' +
          '<p class="telemetry-matrix-copy">This surface now tracks where your journey is, how warm membership intent is, and what the cleanest next move should be.</p>' +
        '</div>' +
        '<div class="telemetry-matrix-badges">' +
          '<span class="telemetry-badge">' + state.intent + ' intent</span>' +
          '<span class="telemetry-badge">' + state.journey_stage + ' stage</span>' +
          '<span class="telemetry-badge">' + state.trust_level + ' trust</span>' +
          '<span class="telemetry-badge">' + state.returning_status + ' visitor</span>' +
          '<span class="telemetry-badge">' + (state.feedback_count || 0) + ' feedback signals</span>' +
        '</div>' +
        '<div class="telemetry-matrix-grid">' +
          '<article class="telemetry-card telemetry-card-primary">' +
            '<span class="telemetry-card-label">Best Next Move</span>' +
            '<strong>' + nextAction.title + '</strong>' +
            '<p>' + nextAction.copy + '</p>' +
            '<a class="telemetry-card-cta" href="' + nextAction.href + '">' + nextAction.cta + '</a>' +
          '</article>' +
          '<article class="telemetry-card">' +
            '<span class="telemetry-card-label">Current Read</span>' +
            '<strong>' + state.confidence + '% confidence · ' + confidenceBand(state) + ' certainty</strong>' +
            '<p>Membership temperature is <strong>' + state.membership_temperature + '</strong>, world affinity is <strong>' + state.world_affinity + '</strong>, and this session has seen <strong>' + state.exposure_count + '</strong> tracked signal surfaces.</p>' +
          '</article>' +
          '<article class="telemetry-card">' +
            '<span class="telemetry-card-label">Studio Spine</span>' +
            '<strong>One truth source across the network</strong>' +
            '<p>' + bridgeCopy + '</p>' +
          '</article>' +
          '<article class="telemetry-card">' +
            '<span class="telemetry-card-label">Feedback Loop</span>' +
            '<strong>Real hesitation is now a live input.</strong>' +
            '<p>' + feedbackCopy + '</p>' +
          '</article>' +
        '</div>' +
      '</div>';

    if (window.VSIntentState) {
      window.VSIntentState.noteExposure('telemetry_matrix_' + context);
    }
  }

  function init() {
    var roots = document.querySelectorAll('[data-telemetry-matrix]');
    if (!roots.length) return;

    function rerender() {
      window.VSPublicIntel.get().then(function (intel) {
        roots.forEach(function (root) {
          renderRoot(root, intel);
        });
      });
    }

    rerender();

    document.addEventListener('vs:intent-state-change', rerender);
    document.addEventListener('vs:feedback-change', rerender);
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
