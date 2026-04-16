(function (window) {
  'use strict';

  function pluralize(count, singular, plural) {
    return count === 1 ? singular : plural;
  }

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
    var activeEdges = intel && intel.stats ? intel.stats.activeEdgeFunctions || 0 : 0;
    var liveProjects = intel && intel.stats ? intel.stats.liveProjects || 0 : 0;
    var projectsInForge = intel && intel.stats ? intel.stats.projectsInForge || 0 : 0;
    var trackedAccounts = intel && intel.social && intel.social.summary ? intel.social.summary.trackedAccounts || 0 : 0;
    var feedback = intel && intel.feedback && intel.feedback.localSummary ? intel.feedback.localSummary : null;
    var topBlocker = feedback && feedback.topBlocker ? feedback.topBlocker : null;
    var topGoal = feedback && feedback.topGoal ? feedback.topGoal : null;
    var blockerCopy = topBlocker
      ? '"' + topBlocker.label + '" is currently the strongest browser-local friction signal, with ' + topBlocker.count + ' ' + pluralize(topBlocker.count, 'response', 'responses') + ' pointing to it.'
      : 'No blocker pattern has won yet, so this layer is still leading with inferred hesitation instead of a dominant local feedback pattern.';

    var contexts = {
      home: [
        {
          label: 'Proof You Can Check',
          title: 'This is already a live operating system, not a mood board.',
          copy: liveProjects + ' public projects are live, ' + projectsInForge + ' more are in the forge, and ' + activeEdges + ' edge functions already back the public layer.'
        },
        {
          label: 'Safest First Move',
          title: 'Start with identity before money.',
          copy: 'The lowest-risk path is free: create one vault account, let rank/progression/world access begin there, then decide later whether the studio has earned paid backing.'
        },
        {
          label: 'If You Came For Worlds',
          title: 'Games and lore can lead the decision.',
          copy: state.intent === 'lore'
            ? 'Your best next move is world affinity first: universe pages, dispatches, and the classified archive should build conviction before any upgrade ask.'
            : 'If the reason you are here is gameplay, follow the game pages and universe layer first. The membership system is designed to compound that interest, not replace it.'
        },
        {
          label: 'What Happens Next',
          title: 'The system should keep handing you forward.',
          copy: topGoal && topGoal.key === 'track_progress'
            ? 'Progress visibility is the strongest local goal right now, so Studio Pulse, changelog, and the shared network surfaces are the next proof layer after the homepage.'
            : 'After the first click, the route should stay coherent: identity, worldbuilding, live proof, and paid support now point into each other instead of acting like separate microsites.'
        },
        {
          label: 'What Still Needs To Be Earned',
          title: 'The brand promise is stronger when it admits the pressure.',
          copy: blockerCopy + ' The point of this layer is to treat hesitation as design work, not user failure.'
        }
      ],
      membership: [
        {
          label: 'What Membership Is',
          title: 'Membership is the account layer that makes everything accumulate.',
          copy: 'One identity carries rank, achievements, challenges, referrals, future access, and the right to keep one continuous history as the studio expands.'
        },
        {
          label: 'What Changes Immediately',
          title: 'Free already unlocks the real foundation.',
          copy: 'The moment you register, the vault can start recognizing you. That is why the free tier matters: it is not a teaser, it is the base identity system the paid tiers build on.'
        },
        {
          label: 'Why Free Is Real',
          title: 'You do not have to pay to see whether the system feels earned.',
          copy: 'The correct order for most people is account first, then public proof, then paid depth only if the portal, worlds, and operating signal feel worth backing.'
        },
        {
          label: 'When Paid Depth Matters',
          title: 'Upgrade only when support and access begin to matter more than curiosity.',
          copy: state.membership_temperature === 'warm' || state.membership_temperature === 'hot'
            ? 'You are already showing warming membership intent, so the real decision is no longer "should I join?" but whether the support and priority benefits now feel justified.'
            : 'If you are still in curiosity mode, stay there. Paid depth should follow conviction, not pressure.'
        },
        {
          label: 'Current Friction',
          title: 'The strongest hesitation is visible instead of hidden.',
          copy: blockerCopy
        }
      ],
      vaultsparked: [
        {
          label: 'What You Are Paying For',
          title: 'VaultSparked is direct support plus deeper participation.',
          copy: 'This is not separate from the identity layer. It is the same vault account, but with stronger support, access priority, and deeper alignment with what the studio is building.'
        },
        {
          label: 'What Changes After Upgrade',
          title: 'The account you already created keeps compounding.',
          copy: state.membership_temperature === 'hot'
            ? 'Your interest is already reading hot. The remaining decision is whether Sparked or Eternal better matches how directly you want to back the studio and how much priority/depth you want attached to the same account.'
            : 'The safest sequence still applies: create the free identity first, confirm the portal and proof surfaces feel real, then upgrade the same account later without losing continuity.'
        },
        {
          label: 'Pricing Honesty',
          title: 'The paid layer is trying to earn trust by telling the truth.',
          copy: 'Monthly paths are live now. Annual pricing stays visible because it is part of the intended shape, but the site keeps annual checkout honestly blocked until the real yearly plans exist instead of faking urgency.'
        },
        {
          label: 'If You Are Hesitating',
          title: 'Price caution is healthy, not disqualifying.',
          copy: topBlocker && topBlocker.key === 'price_unsure'
            ? 'Price uncertainty is the strongest current blocker, which usually means the next missing ingredient is stronger proof of outcomes, access, and consistency rather than a louder checkout push.'
            : 'If you are unsure about paying, keep the lower-risk sequence: identity, public proof, then paid support only once the system feels earned.'
        },
        {
          label: 'Founder Promise',
          title: 'The studio is trying to make support feel grounded, not abstract.',
          copy: 'The public layer already spans ' + trackedAccounts + ' tracked social/account surfaces, live portal progression, and coherent world pages. Paid support is supposed to deepen that system, not distract from it.'
        }
      ]
    };

    return contexts[context] || contexts.home;
  }

  function renderRoot(root, intel) {
    var context = inferContext(root);
    var state = window.VSIntentState ? window.VSIntentState.getState() : {};
    var modules = buildModules(context, state, intel);
    var titles = {
      home: 'Answer the quiet questions before asking for commitment.',
      membership: 'Make the identity layer feel clear before asking for upgrade intent.',
      vaultsparked: 'Reduce payment hesitation with honest proof and next-step clarity.'
    };
    var copies = {
      home: 'This layer explains what is already real, what the safest first move is, and what proof still needs to be earned.',
      membership: 'The goal here is clarity: what membership means, what free already unlocks, when paid depth matters, and what hesitation pattern is currently strongest.',
      vaultsparked: 'This layer exists to answer what the paid tiers are for, what changes after upgrade, where the honest guardrails are, and how to decide without pressure.'
    };

    root.innerHTML =
      '<div class="trust-depth-shell">' +
        '<div class="trust-depth-head">' +
          '<p class="trust-depth-kicker">Trust Depth</p>' +
          '<h3 class="trust-depth-title">' + (titles[context] || titles.home) + '</h3>' +
          '<p class="trust-depth-copy">' + (copies[context] || copies.home) + '</p>' +
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
