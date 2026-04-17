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
    // Voice rule (memory/feedback_voice_leak_patrol.md): never render internal enums/keys as user text.
    // `topBlocker.label` is a human-authored label from the feedback schema — safe to display.
    // Counts are displayed directly because "N of you said X" is honest and understandable.
    var blockerCopy = topBlocker
      ? '"' + topBlocker.label + '" is what visitors are flagging most often — ' + topBlocker.count + ' ' + pluralize(topBlocker.count, 'person said it', 'people said it') + '.'
      : 'Nothing is blocking most visitors yet. If something\'s in your way, the feedback box below is how it gets addressed.';

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
            ? 'Start with the lore. Universe pages, transmissions, and the archive are the natural entry point — membership can wait until the worlds earn it.'
            : 'If you\'re here for the games, start with the games. Membership is built to deepen that interest, not replace it.'
        },
        {
          label: 'What Happens Next',
          title: 'The system should keep handing you forward.',
          copy: topGoal && topGoal.key === 'track_progress'
            ? 'If you want to track what the studio is actually shipping, Studio Pulse and the changelog are where that lives — updated the day things land.'
            : 'After the first click, the site stays coherent. Identity, worlds, live proof, and paid support all point into each other instead of acting like separate microsites.'
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
            ? 'It looks like you\'re already past "is this worth it?" — the real question now is whether the support + priority tiers match how deep you want to go.'
            : 'If you\'re still just curious, stay there. Paid depth should follow conviction, not pressure.'
        },
        {
          label: 'What People Are Saying',
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
            ? 'You already seem sure. The only remaining question is whether Sparked or Eternal better matches how directly you want to back the studio.'
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
            ? 'Pricing is what most visitors are weighing right now. That\'s fair — the answer is more proof (shipped work, portal depth, member outcomes), not a louder checkout button.'
            : 'If you\'re unsure about paying, keep the lower-risk sequence: identity first, public proof next, paid support only once the vault feels earned.'
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
    // User-facing section copy — speaks TO the reader, not ABOUT the layer.
    var titles = {
      home: 'Before we ask for anything, here\'s what\'s real.',
      membership: 'Here\'s what membership actually is, in plain terms.',
      vaultsparked: 'Here\'s what you get for paying, without the push.'
    };
    var copies = {
      home: 'What\'s already live. What the safest first step is. What still has to be earned.',
      membership: 'What membership means. What free already unlocks. When paid depth actually matters.',
      vaultsparked: 'What the paid tiers are for. What changes after upgrade. The honest guardrails. How to decide without pressure.'
    };
    // Kicker was "Trust Depth" — internal taxonomy. Now user-facing.
    var kickers = {
      home: 'Ground truth',
      membership: 'Membership, clearly',
      vaultsparked: 'The paid tier, clearly'
    };

    root.innerHTML =
      '<div class="trust-depth-shell">' +
        '<div class="trust-depth-head">' +
          '<p class="trust-depth-kicker">' + (kickers[context] || kickers.home) + '</p>' +
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
