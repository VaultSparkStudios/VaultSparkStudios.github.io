(function (window) {
  'use strict';

  var STORAGE_KEY = 'vs_entry_pathway';
  var PATHWAYS = {
    player: {
      key: 'player',
      eyebrow: 'Player Path',
      title: 'I want something playable tonight',
      summary: 'Start with live games, rank progression, and a vault identity you can carry across worlds.',
      proof: 'Best first stop: games, rankings, and a free account.',
      href: '/games/',
      cta: 'Browse Live Games',
    },
    member: {
      key: 'member',
      eyebrow: 'Member Path',
      title: 'I want an account that grows with me',
      summary: 'Start free, earn rank, unlock achievements, and keep one identity across the entire studio.',
      proof: 'Best first stop: Vault Member and membership overview.',
      href: '/vault-member/#register',
      cta: 'Claim Your Vault Identity',
    },
    supporter: {
      key: 'supporter',
      eyebrow: 'Supporter Path',
      title: 'I want to back the studio directly',
      summary: 'See the paid tiers, the live proof behind them, and what deeper support unlocks.',
      proof: 'Best first stop: membership tiers and live proof.',
      href: '/vaultsparked/#pricing',
      cta: 'See Membership Tiers',
    },
    investor: {
      key: 'investor',
      eyebrow: 'Investor Path',
      title: 'I need the operating picture first',
      summary: 'Review the studio signal, operating posture, and gated investor surface before asking for deeper access.',
      proof: 'Best first stop: Studio Pulse and investor access.',
      href: '/studio-pulse/',
      cta: 'Review Studio Pulse',
    },
    lore: {
      key: 'lore',
      eyebrow: 'Lore Path',
      title: 'I am here for worlds, signals, and story',
      summary: 'Enter through the archive, universe pages, and journal dispatches instead of the membership funnel.',
      proof: 'Best first stop: universe pages and signal logs.',
      href: '/universe/',
      cta: 'Enter The Archive',
    },
  };

  var CONTEXTS = {
    home: ['player', 'member', 'supporter', 'lore', 'investor'],
    membership: ['member', 'supporter', 'player', 'lore'],
    vaultsparked: ['supporter', 'member', 'player', 'investor'],
    join: ['member', 'player', 'supporter'],
    invite: ['member', 'supporter', 'player'],
    studio: ['investor', 'supporter', 'lore'],
  };

  function safeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (_) {}
  }

  function inferContext(root) {
    if (root && root.dataset.pathwaysContext) return root.dataset.pathwaysContext;
    var path = window.location.pathname;
    if (path === '/') return 'home';
    if (path.indexOf('/membership') === 0) return 'membership';
    if (path.indexOf('/vaultsparked') === 0) return 'vaultsparked';
    if (path.indexOf('/join') === 0) return 'join';
    if (path.indexOf('/invite') === 0) return 'invite';
    if (path.indexOf('/studio') === 0 || path.indexOf('/studio-pulse') === 0) return 'studio';
    return 'home';
  }

  function getSelection() {
    var selected = window.VSIntentState ? window.VSIntentState.getState().pathway : safeGet(STORAGE_KEY);
    return PATHWAYS[selected] ? selected : null;
  }

  function getCards(context, limit) {
    var keys = CONTEXTS[context] || CONTEXTS.home;
    var selected = getSelection();

    if (selected && keys.indexOf(selected) > 0) {
      keys = [selected].concat(keys.filter(function (key) { return key !== selected; }));
    }

    return keys.slice(0, limit).map(function (key) {
      return PATHWAYS[key];
    });
  }

  function buildContextNote(intel, context) {
    if (!intel || !intel.project) return '';

    var stats = intel.stats || {};
    var sessionLine = 'Session ' + intel.project.currentSession + ' operating signal';
    var proofBits = [];

    if (stats.vaultRankTiers) proofBits.push(stats.vaultRankTiers + ' vault rank tiers');
    if (stats.activeEdgeFunctions) proofBits.push(stats.activeEdgeFunctions + ' live edge functions');
    if (stats.trackedSocialAccounts) proofBits.push(stats.trackedSocialAccounts + ' tracked social accounts');

    if (context === 'vaultsparked') {
      return sessionLine + ' · ' + proofBits.slice(0, 2).join(' · ');
    }
    if (context === 'membership' || context === 'join' || context === 'invite') {
      return sessionLine + ' · ' + proofBits.slice(0, 2).join(' · ');
    }
    return sessionLine + ' · ' + proofBits.slice(0, 3).join(' · ');
  }

  function personalizeCards(cards, state, intel) {
    var feedback = intel && intel.feedback && intel.feedback.localSummary ? intel.feedback.localSummary : null;

    return cards.map(function (item) {
      var next = Object.assign({}, item);

      if (state.hesitation_signal === 'need_proof' && item.key === 'investor') {
        next.title = 'I need proof before I commit';
        next.summary = 'Start with live operating signals, current focus, shipped work, and confidence surfaces before any deeper ask.';
        next.proof = 'Best first stop: Studio Pulse and recent shipped signals.';
        next.cta = 'See Proof First';
      }

      if (state.hesitation_signal === 'want_gameplay' && item.key === 'player') {
        next.title = 'I want the strongest playable proof';
        next.summary = 'Skip explanation-heavy surfaces and go straight to the live games, progression signal, and worlds already in motion.';
        next.proof = 'Best first stop: playable games and rank-carrying identity.';
        next.cta = 'Open Live Games';
      }

      if (feedback && feedback.topGoal && feedback.topGoal.key === 'track_progress' && item.key === 'investor') {
        next.title = 'I want to track what is actually shipping';
        next.summary = 'Use the operating path first. Pulse, changelog, and network surfaces now form one visibility layer.';
        next.proof = 'Best first stop: Studio Pulse, changelog, and network spine.';
        next.cta = 'Track Progress';
      }

      if (state.intent === 'lore' && item.key === 'lore') {
        next.summary = 'Enter through the archive, signal logs, and world surfaces first. The vault should earn identity and support through atmosphere and gravity.';
      }

      return next;
    });
  }

  function renderRoot(root, intel) {
    var context = inferContext(root);
    var limit = Number(root.dataset.pathwaysLimit || 3);
    var selected = getSelection();
    var state = window.VSIntentState ? window.VSIntentState.getState() : {};
    var cards = personalizeCards(getCards(context, limit), state, intel);
    var note = buildContextNote(intel, context);

    root.innerHTML =
      '<div class="vault-journey-shell">' +
        '<div class="vault-journey-head">' +
          '<p class="vault-journey-kicker">Choose Your Path</p>' +
          '<h3 class="vault-journey-title">Start where your intent is strongest.</h3>' +
          '<p class="vault-journey-copy">The site has games, rank identity, live member proof, public studio signals, and worldbuilding. Pick the right front door instead of wandering the whole vault cold.</p>' +
          '<p class="vault-journey-meta">' + (note || 'Pathway memory stays on this device so the site can stop asking you the same question.') + '</p>' +
        '</div>' +
        '<div class="vault-journey-grid">' +
          cards.map(function (item) {
            return (
              '<article class="vault-journey-card' + (selected === item.key ? ' active' : '') + '" data-pathway-key="' + item.key + '">' +
                '<div class="vault-journey-card-top">' +
                  '<span class="vault-journey-tag">' + item.eyebrow + '</span>' +
                  (selected === item.key ? '<span class="vault-journey-selected">remembered</span>' : '') +
                '</div>' +
                '<h4>' + item.title + '</h4>' +
                '<p>' + item.summary + '</p>' +
                '<div class="vault-journey-proof">' + item.proof + '</div>' +
                '<a class="vault-journey-cta" href="' + item.href + '" data-pathway-select="' + item.key + '">' + item.cta + '</a>' +
              '</article>'
            );
          }).join('') +
        '</div>' +
      '</div>';
  }

  function rememberSelection(target) {
    if (!target) return;
    var key = target.getAttribute('data-pathway-select') || target.getAttribute('data-pathway-key');
    if (!PATHWAYS[key]) return;
    if (window.VSIntentState) {
      window.VSIntentState.setPathway(key);
    } else {
      safeSet(STORAGE_KEY, key);
      document.dispatchEvent(new CustomEvent('vs:pathway-change', { detail: { pathway: key } }));
    }
  }

  function init() {
    var roots = document.querySelectorAll('[data-pathways-root]');
    if (!roots.length) return;

    window.VSPublicIntel.get().then(function (intel) {
      roots.forEach(function (root) {
        renderRoot(root, intel);
      });
    });

    document.addEventListener('click', function (event) {
      var target = event.target.closest('[data-pathway-select], [data-pathway-key]');
      if (!target) return;
      rememberSelection(target);
    });

    document.addEventListener('vs:intent-state-change', function () {
      window.VSPublicIntel.get().then(function (intel) {
        roots.forEach(function (root) {
          renderRoot(root, intel);
        });
      });
    });
  }

  window.VSPathways = {
    getSelected: getSelection,
    setSelected: function (key) {
      if (!PATHWAYS[key]) return;
      safeSet(STORAGE_KEY, key);
    },
    all: PATHWAYS,
  };

  document.addEventListener('DOMContentLoaded', init);
})(window);
