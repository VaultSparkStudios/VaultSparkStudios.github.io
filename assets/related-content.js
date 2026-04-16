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
  };

  var MAP = {
    home: ['games', 'membership', 'universe', 'studiopulse'],
    membership: ['vaultsparked', 'vaultmember', 'vaultwall', 'invite'],
    vaultsparked: ['membership', 'vaultmember', 'vaultwall', 'studiopulse'],
    join: ['vaultmember', 'membership', 'vaultwall', 'universe'],
    invite: ['vaultwall', 'membership', 'vaultmember', 'changelog'],
    studio: ['studiopulse', 'journal', 'membership', 'games'],
  };

  function inferContext(root) {
    if (root && root.dataset.relatedContext) return root.dataset.relatedContext;
    var path = window.location.pathname;
    if (path === '/') return 'home';
    if (path.indexOf('/membership') === 0) return 'membership';
    if (path.indexOf('/vaultsparked') === 0) return 'vaultsparked';
    if (path.indexOf('/join') === 0) return 'join';
    if (path.indexOf('/invite') === 0) return 'invite';
    if (path.indexOf('/studio') === 0 || path.indexOf('/studio-pulse') === 0) return 'studio';
    return 'home';
  }

  function selectedPathwayKey() {
    var selected = window.VSIntentState ? window.VSIntentState.getState().pathway : null;
    if (selected === 'lore') return 'universe';
    if (selected === 'player') return 'games';
    if (selected === 'supporter') return 'vaultsparked';
    if (selected === 'member') return 'vaultmember';
    if (selected === 'investor') return 'studiopulse';
    return null;
  }

  function itemsForContext(context, limit) {
    var keys = (MAP[context] || MAP.home).slice();
    var selected = selectedPathwayKey();
    if (selected && keys.indexOf(selected) > 0) {
      keys = [selected].concat(keys.filter(function (key) { return key !== selected; }));
    }
    return keys.slice(0, limit).map(function (key) {
      return ITEMS[key];
    });
  }

  function renderRoot(root) {
    var context = inferContext(root);
    var limit = Number(root.dataset.relatedLimit || 3);
    var items = itemsForContext(context, limit);

    root.innerHTML =
      '<div class="related-rail-shell">' +
        '<div class="related-rail-head">' +
          '<p class="related-rail-kicker">Keep Moving</p>' +
          '<h3 class="related-rail-title">Continue through the vault with intent.</h3>' +
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
