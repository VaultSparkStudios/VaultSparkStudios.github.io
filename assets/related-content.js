(function (window) {
  'use strict';

  var ITEMS = {
    membership: {
      eyebrow: 'Membership',
      title: 'See what membership actually unlocks',
      copy: 'Compare the three tiers, benefits, and live proof before you upgrade.',
      href: '/membership/',
    },
    vaultsparked: {
      eyebrow: 'Paid Tiers',
      title: 'Go deeper into VaultSparked',
      copy: 'Live pricing, proof, phase data, and the direct studio-support path.',
      href: '/vaultsparked/',
    },
    vaultmember: {
      eyebrow: 'Portal',
      title: 'Create your vault identity',
      copy: 'Free account, live rank, achievements, streaks, and portal access.',
      href: '/vault-member/#register',
    },
    invite: {
      eyebrow: 'Referral',
      title: 'Bring someone into the vault',
      copy: 'Referral links, reward thresholds, and recruiter recognition live here.',
      href: '/invite/',
    },
    vaultwall: {
      eyebrow: 'Community',
      title: 'Meet the vault publicly',
      copy: 'See the live wall, rank distribution, and current public member signal.',
      href: '/vault-wall/',
    },
    universe: {
      eyebrow: 'Universe',
      title: 'Enter the story layer',
      copy: 'Worldbuilding, transmissions, and the classified archive start here.',
      href: '/universe/',
    },
    journal: {
      eyebrow: 'Signal Log',
      title: 'Read what the studio ships and learns',
      copy: 'Journal posts and dispatches explain where the vault is heading next.',
      href: '/journal/',
    },
    changelog: {
      eyebrow: 'Changelog',
      title: 'See recent shipped work',
      copy: 'The delivery trail is public. Review what changed recently.',
      href: '/changelog/',
    },
    studiopulse: {
      eyebrow: 'Studio Pulse',
      title: 'Read the operating signal',
      copy: 'Current focus, next milestones, and public studio truth in one place.',
      href: '/studio-pulse/',
    },
    games: {
      eyebrow: 'Games',
      title: 'Jump straight into live worlds',
      copy: 'Playable projects and active worlds are collected here.',
      href: '/games/',
    },
    vaultfront: {
      eyebrow: 'VaultFront',
      title: 'Read the VaultFront signal',
      copy: 'RTS pressure, convoy timing, and the vault-capture front line live here.',
      href: '/games/vaultfront/',
    },
    solara: {
      eyebrow: 'Solara',
      title: 'Follow Solara: Sunfall',
      copy: 'Track the solar collapse world, atmospheric art, and browser-first action layer.',
      href: '/games/solara/',
    },
    mindframe: {
      eyebrow: 'MindFrame',
      title: 'Step into MindFrame',
      copy: 'Cognitive puzzles, perception pressure, and the deeper concept layer start here.',
      href: '/games/mindframe/',
    },
    theexodus: {
      eyebrow: 'The Exodus',
      title: 'Enter The Exodus',
      copy: 'Narrative survival, fracture-state decisions, and the long-form world stakes begin here.',
      href: '/games/the-exodus/',
    },
    voidfall: {
      eyebrow: 'Voidfall',
      title: 'Read the Voidfall saga',
      copy: 'Transmission archives, entities, and the wrong signal that changed everything.',
      href: '/universe/voidfall/',
    },
    dreadspike: {
      eyebrow: 'DreadSpike',
      title: 'Open the DreadSpike file',
      copy: 'The classified entity profile, intercept log, and first signal record are here.',
      href: '/universe/dreadspike/',
    },
  };

  var HEADINGS = {
    home: {
      title: 'Continue through the vault with intent.',
      copy: 'Move from atmosphere into the next surface that actually compounds your interest.'
    },
    membership: {
      title: 'Turn identity into the next concrete step.',
      copy: 'Follow membership into pricing, proof, community, or activation instead of resetting your momentum.'
    },
    vaultsparked: {
      title: 'Support should keep handing you into proof.',
      copy: 'Paid intent is strongest when it points back into identity, community, and visible operating signal.'
    },
    join: {
      title: 'Activation should not be a dead end.',
      copy: 'After join intent, the next best move is usually identity, proof, or a world worth following.'
    },
    invite: {
      title: 'Referral energy should keep compounding.',
      copy: 'Use the invite page as a handoff into public proof, membership, and visible shared progress.'
    },
    studio: {
      title: 'Operating signal should route into the vault.',
      copy: 'Studio truth matters most when it keeps pointing into products, worlds, and the community layer.'
    },
    games: {
      title: 'Turn game curiosity into a broader vault path.',
      copy: 'If a world catches interest, the next move should deepen identity, support, or story instead of stopping at the page.'
    },
    universe: {
      title: 'Let lore spill into identity and support.',
      copy: 'World pages work best when they hand off into the account, membership, and adjacent signal surfaces.'
    },
    vaultfront: {
      title: 'Keep the VaultFront signal hot.',
      copy: 'From the game page, the next move should deepen identity, support, or the adjacent world layer.'
    },
    solara: {
      title: 'Carry Solara into the rest of the vault.',
      copy: 'The page should lead naturally into account creation, support, and the wider studio/world graph.'
    },
    mindframe: {
      title: 'Let MindFrame open a broader route.',
      copy: 'Concept-heavy pages should point into identity, proof, and other worlds instead of ending at intrigue.'
    },
    'the-exodus': {
      title: 'Move from concept to commitment.',
      copy: 'Narrative survival interest should keep flowing into early signal access, support, and the adjacent saga surfaces.'
    },
    voidfall: {
      title: 'Stay inside the wrong transmission a little longer.',
      copy: 'The Voidfall page should hand you into DreadSpike, membership, and the studio signal instead of leaving the saga isolated.'
    },
    dreadspike: {
      title: 'Push the DreadSpike signal deeper.',
      copy: 'From the entity file, the next move should deepen saga context, account identity, or ongoing signal tracking.'
    }
  };

  var MAP = {
    home: ['games', 'membership', 'universe', 'studiopulse'],
    membership: ['vaultsparked', 'vaultmember', 'vaultwall', 'invite'],
    vaultsparked: ['membership', 'vaultmember', 'vaultwall', 'studiopulse'],
    join: ['vaultmember', 'membership', 'vaultwall', 'universe'],
    invite: ['vaultwall', 'membership', 'vaultmember', 'changelog'],
    studio: ['studiopulse', 'journal', 'membership', 'games'],
    games: ['vaultmember', 'membership', 'universe', 'studiopulse'],
    universe: ['voidfall', 'dreadspike', 'vaultmember', 'membership'],
    vaultfront: ['vaultmember', 'vaultsparked', 'voidfall', 'changelog'],
    solara: ['vaultmember', 'vaultsparked', 'games', 'journal'],
    mindframe: ['vaultmember', 'vaultsparked', 'dreadspike', 'studiopulse'],
    'the-exodus': ['vaultmember', 'vaultsparked', 'voidfall', 'journal'],
    voidfall: ['dreadspike', 'vaultmember', 'membership', 'journal'],
    dreadspike: ['voidfall', 'vaultmember', 'membership', 'studiopulse'],
  };

  function inferContext(root) {
    if (root && root.dataset.relatedContext) return root.dataset.relatedContext;
    var path = window.location.pathname;
    if (path === '/') return 'home';
    if (path.indexOf('/membership') === 0) return 'membership';
    if (path.indexOf('/vaultsparked') === 0) return 'vaultsparked';
    if (path.indexOf('/join') === 0) return 'join';
    if (path.indexOf('/invite') === 0) return 'invite';
    if (path.indexOf('/games/vaultfront') === 0) return 'vaultfront';
    if (path.indexOf('/games/solara') === 0) return 'solara';
    if (path.indexOf('/games/mindframe') === 0) return 'mindframe';
    if (path.indexOf('/games/the-exodus') === 0) return 'the-exodus';
    if (path.indexOf('/games') === 0) return 'games';
    if (path.indexOf('/universe/voidfall') === 0) return 'voidfall';
    if (path.indexOf('/universe/dreadspike') === 0) return 'dreadspike';
    if (path.indexOf('/universe') === 0) return 'universe';
    if (path.indexOf('/studio') === 0 || path.indexOf('/studio-pulse') === 0) return 'studio';
    return 'home';
  }

  function selectedPathwayKey(state) {
    var selected = state ? state.pathway : null;
    if (selected === 'lore') return 'universe';
    if (selected === 'player') return 'games';
    if (selected === 'supporter') return 'vaultsparked';
    if (selected === 'member') return 'vaultmember';
    if (selected === 'investor') return 'studiopulse';
    return null;
  }

  function affinityKey(state) {
    var affinity = state ? state.world_affinity : '';
    var map = {
      vaultfront: 'vaultfront',
      solara: 'solara',
      mindframe: 'mindframe',
      'the-exodus': 'theexodus',
      voidfall: 'voidfall',
      dreadspike: 'dreadspike',
      universe: 'universe',
      games: 'games'
    };
    return map[affinity] || null;
  }

  function contextKey(context) {
    if (context === 'the-exodus') return 'theexodus';
    return ITEMS[context] ? context : null;
  }

  function itemsForContext(context, limit, state) {
    var keys = (MAP[context] || MAP.home).slice();
    var selected = selectedPathwayKey(state);
    var affinity = affinityKey(state);
    var current = contextKey(context);

    if (selected && selected !== current && keys.indexOf(selected) > 0) {
      keys = [selected].concat(keys.filter(function (key) { return key !== selected; }));
    }
    if (affinity && affinity !== current && keys.indexOf(affinity) > 0) {
      keys = [affinity].concat(keys.filter(function (key) { return key !== affinity; }));
    }

    return keys.filter(function (key) {
      return key !== current;
    }).slice(0, limit).map(function (key) {
      return ITEMS[key];
    });
  }

  function renderRoot(root) {
    var context = inferContext(root);
    var limit = Number(root.dataset.relatedLimit || 3);
    var state = window.VSIntentState ? window.VSIntentState.getState() : null;
    var items = itemsForContext(context, limit, state);
    var heading = HEADINGS[context] || HEADINGS.home;

    root.innerHTML =
      '<div class="related-rail-shell">' +
        '<div class="related-rail-head">' +
          '<p class="related-rail-kicker">Keep Moving</p>' +
          '<h3 class="related-rail-title">' + heading.title + '</h3>' +
          '<p class="trust-depth-copy">' + heading.copy + '</p>' +
        '</div>' +
        '<div class="related-rail-grid">' +
          items.map(function (item) {
            return (
              '<a class="related-rail-card" href="' + item.href + '">' +
                '<span class="related-rail-tag">' + item.eyebrow + '</span>' +
                '<strong>' + item.title + '</strong>' +
                '<p>' + item.copy + '</p>' +
                '<span class="related-rail-cta">Open →</span>' +
              '</a>'
            );
          }).join('') +
        '</div>' +
      '</div>';

    if (window.VSIntentState) {
      window.VSIntentState.noteExposure('related_rail_' + context);
    }
  }

  function init() {
    var roots = document.querySelectorAll('[data-related-root]');
    if (!roots.length) return;
    roots.forEach(renderRoot);

    document.addEventListener('vs:intent-state-change', function () {
      roots.forEach(renderRoot);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
