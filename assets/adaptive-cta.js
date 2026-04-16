(function () {
  'use strict';

  function applyPathwayConfig(mode, state) {
    if (!state.pathway) return null;

    var pathway = state.pathway;
    if (mode === 'account') {
      if (pathway === 'member') {
        return {
          href: '/vault-member/#register',
          label: 'Claim Your Vault Identity',
          note: 'You flagged membership intent already. Start with the free identity, then deepen the same account later.'
        };
      }
      if (pathway === 'player') {
        return {
          href: '/vault-member/#register',
          label: 'Create Your Player Identity',
          note: 'Start free, then tie your play, rank, and progression to one vault account.'
        };
      }
      if (pathway === 'supporter') {
        return {
          href: '/vault-member/#register',
          label: 'Start Free, Then Back The Studio',
          note: 'The cleanest supporter path is still: free identity first, then paid support once the vault proves itself.'
        };
      }
      if (pathway === 'lore') {
        return {
          href: '/vault-member/#register',
          label: 'Open The Archive Through Your Identity',
          note: 'The lore path still benefits from a vault identity because archive access, rank, and future drops all key off the same account.'
        };
      }
    }

    if (mode === 'membership') {
      if (pathway === 'supporter') {
        return {
          href: '/vaultsparked/#pricing',
          label: 'Back The Studio',
          note: 'You marked supporter intent. Compare the live tiers and pick the depth that feels earned.'
        };
      }
      if (pathway === 'player') {
        return {
          href: '/vaultsparked/#pricing',
          label: 'See Player Perks',
          note: 'You marked player intent. Use the paid tiers only if the free account already made the worlds stick.'
        };
      }
      if (pathway === 'lore') {
        return {
          href: '/vaultsparked/#pricing',
          label: 'Unlock The Full Archive',
          note: 'You marked lore intent. Paid access matters here because the deeper archive is part of the membership layer.'
        };
      }
      if (pathway === 'member') {
        return {
          href: '/vaultsparked/#pricing',
          label: 'Compare Member Paths',
          note: 'You already know you want the identity layer. The next question is whether free, Sparked, or Eternal matches your conviction.'
        };
      }
    }

    return null;
  }

  function applyHesitationConfig(mode, state) {
    if (!state.hesitation_signal) return null;

    if (state.hesitation_signal === 'need_proof' && mode === 'membership') {
      return {
        href: '/studio-pulse/',
        label: 'See Live Proof First',
        note: 'Your latest friction signal says you need more proof before committing. Read the live operating surface, then come back to pricing.'
      };
    }

    if (state.hesitation_signal === 'not_clear' && mode === 'account') {
      return {
        href: '/membership/',
        label: 'See How Membership Works',
        note: 'The current signal says the path is not clear enough yet. Start with the identity layer explainer before creating the account.'
      };
    }

    if (state.hesitation_signal === 'want_gameplay' && mode === 'membership') {
      return {
        href: '/games/',
        label: 'See The Live Games First',
        note: 'The current hesitation signal is product depth. Follow the playable surfaces first, then come back if the worlds earn deeper support.'
      };
    }

    if (state.hesitation_signal === 'price_unsure' && mode === 'membership') {
      return {
        href: '/vault-member/#register',
        label: 'Start Free Before Paying',
        note: 'The price signal is still cold. The safest path is free identity, then paid depth only if the vault keeps proving itself.'
      };
    }

    return null;
  }

  function applyConfig(element, config) {
    if (!element || !config) return;
    if (config.href) element.setAttribute('href', config.href);
    if (config.label) element.innerHTML = config.label;
    if (config.note && element.dataset.adaptiveNoteTarget) {
      var noteTarget = document.getElementById(element.dataset.adaptiveNoteTarget);
      if (noteTarget) noteTarget.textContent = config.note;
    }
  }

  function rememberIntent() {
    document.addEventListener('click', function (event) {
      var target = event.target.closest('[data-track-plan], [data-membership-intent]');
      if (!target) return;
      if (window.VSIntentState) {
        window.VSIntentState.markMembershipIntent(true);
      }
    });
  }

  function applyAll(state) {
    document.querySelectorAll('[data-adaptive-cta]').forEach(function (element) {
      var mode = element.dataset.adaptiveCta;

      if (state.logged_in) {
        if (mode === 'account') {
          applyConfig(element, {
            href: '/vault-member/',
            label: 'Open Your Vault',
            note: 'Your account is already live. Pick up where you left off.'
          });
          return;
        }
        if (mode === 'membership') {
          applyConfig(element, {
            href: '/vault-member/',
            label: 'Open Your Member Portal',
            note: 'You already have a vault identity. Continue inside your portal.'
          });
          return;
        }
      }

      if (state.referral_active && mode === 'account') {
        applyConfig(element, {
          href: '/vault-member/#register',
          label: 'Claim Your Invited Spot',
          note: 'Your invite is active. Create the free account first, then upgrade later if you want deeper access.'
        });
        return;
      }

      if (state.membership_intent && mode === 'membership') {
        applyConfig(element, {
          href: '/vaultsparked/#pricing',
          label: 'See Live Pricing',
          note: 'You have already shown membership intent. The fastest next step is comparing the live tiers.'
        });
        var hesitationConfig = applyHesitationConfig(mode, state);
        if (hesitationConfig) applyConfig(element, hesitationConfig);
        var pathwayConfig = applyPathwayConfig(mode, state);
        if (pathwayConfig) applyConfig(element, pathwayConfig);
        return;
      }

      var hesitationConfig = applyHesitationConfig(mode, state);
      if (hesitationConfig) {
        applyConfig(element, hesitationConfig);
        return;
      }

      var pathwayConfig = applyPathwayConfig(mode, state);
      if (pathwayConfig) {
        applyConfig(element, pathwayConfig);
      }
    });
  }

  function init() {
    rememberIntent();
    applyAll(window.VSIntentState ? window.VSIntentState.getState() : {});
    document.addEventListener('vs:intent-state-change', function (event) {
      applyAll(event.detail || {});
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
