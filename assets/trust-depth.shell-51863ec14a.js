(function (window) {
  'use strict';

  // TT-safe HTML: named policy prevents conflict when co-loaded with other modules.
  function vsHtml(s) {
    try {
      if (window.trustedTypes && window.trustedTypes.createPolicy) {
        window.__vsTrustDepthPolicy = window.__vsTrustDepthPolicy ||
          window.trustedTypes.createPolicy('vs-trust-depth', { createHTML: function (h) { return h; } });
        return window.__vsTrustDepthPolicy.createHTML(s);
      }
    } catch (_e) {}
    return s;
  }

  function pluralize(count, singular, plural) {
    return count === 1 ? singular : plural;
  }

  function inferContext(root) {
    if (root && root.dataset.trustContext) return root.dataset.trustContext;
    var path = window.location.pathname;
    if (path === '/') return 'home';
    if (path.indexOf('/membership') === 0) return 'membership';
    if (path.indexOf('/vaultsparked') === 0) return 'vaultsparked';
    if (path.indexOf('/join') === 0) return 'join';
    if (path.indexOf('/invite') === 0) return 'invite';
    return 'home';
  }

  function enrollmentNote(intel) {
    var mode = intel && intel.availability && intel.availability.signup && intel.availability.signup.mode;
    switch (mode) {
      case 'invitation': return 'New website memberships are currently opened by invitation.';
      case 'open': return 'New website memberships are currently open.';
      case 'closed': return 'New website membership enrollment is currently closed.';
      default: return 'See the membership page for current website enrollment.';
    }
  }

  function buildModules(context, state, intel) {
    var freshShipCount = intel && intel.pulse && intel.pulse.shipped ? intel.pulse.shipped.length : 0;
    var enrollment = enrollmentNote(intel);
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
          title: 'Check the public project catalog and status evidence.',
          copy: liveProjects + ' projects are marked live in the public catalog and ' + projectsInForge + ' are in development. Each project page lists its current release and access details.'
        },
        {
          label: 'Safest First Move',
          title: 'Check website membership before enrolling.',
          copy: enrollment + ' Obelisk provides shared Studio sign-in. Website profiles and progression are separate from access to individual projects.'
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
          title: 'Choose where to explore next.',
          copy: topGoal && topGoal.key === 'track_progress'
            ? 'If you want to track what the studio is actually shipping, the Studio Pulse and the changelog are where that lives — updated the day things land.'
            : 'Explore the games, read the universe stories, or compare website membership. Each project page explains its current release and access.'
        },
        {
          label: 'What Still Needs To Be Earned',
          title: 'Tell us what would help you decide.',
          copy: blockerCopy + ' Share a question or report a problem using the feedback box below.'
        }
      ],
      membership: [
        {
          label: 'What Membership Is',
          title: 'Website membership brings together your profile and progression.',
          copy: 'Website profiles bring together Vault ranks, points, achievements and community challenges. Project access and releases are described on each project page.'
        },
        {
          label: 'What Changes Immediately',
          title: 'Check the current enrollment path.',
          copy: enrollment + ' Shared Studio sign-in is separate from website membership enrollment.'
        },
        {
          label: 'Why Free Is Real',
          title: 'You do not have to pay to see whether the system feels earned.',
          copy: 'Public project pages and status evidence are available before you decide whether to join or support the studio.'
        },
        {
          label: 'When Paid Depth Matters',
          title: 'Upgrade only when support and access begin to matter more than curiosity.',
          copy: state.membership_temperature === 'warm' || state.membership_temperature === 'hot'
            ? 'Compare the support tiers and their listed features to decide which fits how you want to take part.'
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
          copy: 'Membership is monthly only for now: VaultSparked at $4.99 and VaultSparked Eternal at $29.99, cancel anytime. Annual plans come later. The safer first move is still the same: start as a free Vault Member, then upgrade only when the vault feels earned.'
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

    contexts.join = [
      {
        label: 'What Free Actually Means',
        title: 'Free is a permanent tier, not a trial.',
        copy: 'The Vault Member account has no expiry date, no credit card requirement, and no downgrade event. Rank, achievements, challenges, and community access stay with you however long it takes the studio to earn deeper support.'
      },
      {
        label: 'What Happens Immediately',
        title: 'One account gives you the whole identity layer.',
        copy: 'After registration, the vault begins recognizing your progress across games, worlds, and community surfaces. The progression system starts accumulating from that first moment — there is nothing to unlock or upgrade before it becomes real.'
      },
      {
        label: 'Why The Invite System Exists',
        title: 'Controlled access keeps the community tight on purpose.',
        copy: state.returning_status === 'returning' || state.journey_stage === 'activation'
          ? 'You are already past the gate — the vault is ready when you are. Registration takes about sixty seconds.'
          : 'Early access is managed through invites to prevent the community layer from scaling faster than the systems that support it. Waitlist means the request is real, not ignored.'
      },
      {
        label: 'What Still Has To Be Earned',
        title: 'The studio should prove the vault before asking for paid support.',
        copy: blockerCopy + ' The honest sequence: free account first, then community proof, then paid only when the depth feels worth backing.'
      }
    ];

    contexts.invite = [
      {
        label: 'What Your Friend Gets',
        title: 'You are inviting someone into the real vault, not a marketing funnel.',
        copy: 'Website membership includes profiles, Vault ranks, points, achievements and community challenges. An invitation does not grant access to every project or paid archive.'
      },
      {
        label: 'Why Referrals Are Tracked',
        title: 'Referring is recorded as community signal, not lead generation.',
        copy: enrollment + ' See the invitation page for the current referral process and eligibility.'
      },
      {
        label: 'What The Honest Ask Is',
        title: 'Only share if you\'d actually vouch for the studio.',
        copy: 'If the vault, games, or community feel worth recommending — share. If you\'re still figuring out whether it\'s worth it yourself, that\'s the right place to be too. No reward is worth a weak endorsement.'
      },
      {
        label: 'What Still Has To Be Earned',
        title: 'The referral system should make the vault feel worth referring.',
        copy: blockerCopy + ' If something is making inviting feel awkward, that signal matters — the feedback box below is how it reaches the studio.'
      }
    ];

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
      vaultsparked: 'Here\'s what you get for paying, without the push.',
      join: 'What the vault actually is before you decide to enter.',
      invite: 'What you\'re actually sharing when you send an invite.'
    };
    var copies = {
      home: 'What\'s already live. What the safest first step is. What still has to be earned.',
      membership: 'Website profiles and progression, current enrollment, and optional support.',
      vaultsparked: 'What the paid tiers are for. What changes after upgrade. The honest guardrails. How to decide without pressure.',
      join: 'What free means. What starts immediately. Why invite-only. What still has to be earned.',
      invite: 'What your friend gets. Why referrals are tracked. The honest ask.'
    };
    var kickers = {
      home: 'Ground truth',
      membership: 'Membership, clearly',
      vaultsparked: 'The paid tier, clearly',
      join: 'Before you enter',
      invite: 'Before you share'
    };

    root.innerHTML = vsHtml(
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
      '</div>');

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})(window);
