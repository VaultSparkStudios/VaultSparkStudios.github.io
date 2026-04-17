(function () {
  'use strict';

  var WORLD_LABELS = {
    vaultfront:   { label: 'VaultFront',       href: '/games/vaultfront/' },
    solara:       { label: 'Solara',           href: '/games/solara/' },
    mindframe:    { label: 'MindFrame',        href: '/games/mindframe/' },
    'the-exodus': { label: 'The Exodus',       href: '/games/the-exodus/' },
    voidfall:     { label: 'Voidfall',         href: '/universe/voidfall/' },
    dreadspike:   { label: 'DreadSpike',       href: '/universe/dreadspike/' },
    games:        { label: 'the game catalog', href: '/games/' },
    universe:     { label: 'the universe',     href: '/universe/' }
  };

  var STAGE_COPY = {
    pricing:     { eyebrow: 'Last seen pricing',          cta: 'Resume VaultSparked',   href: '/vaultsparked/' },
    considering: { eyebrow: 'Still weighing membership',  cta: 'See membership value',  href: '/membership-value/' },
    activation:  { eyebrow: 'Mid-signup',                 cta: 'Finish joining',        href: '/vault-member/#register' },
    member:      { eyebrow: 'Welcome back, member',       cta: 'Open the Vault',        href: '/vault-member/' },
    exploring:   { eyebrow: 'Welcome back',               cta: 'See what shipped',      href: '/studio-pulse/' }
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function buildLineHtml(state) {
    var world = WORLD_LABELS[state.world_affinity];
    var parts = [];
    if (world) {
      parts.push('Last time you were exploring <a href="' + esc(world.href) + '">' + esc(world.label) + '</a>.');
    }
    var visits = state.visit_count > 1 ? ' · visit ' + state.visit_count : '';
    parts.push('You were at the <strong>' + esc(state.trust_level) + '-trust</strong> stage' + esc(visits) + '.');
    return parts.join(' ');
  }

  function render(root, state) {
    var stage = STAGE_COPY[state.journey_stage] || STAGE_COPY.exploring;

    var wrapper = document.createElement('div');
    wrapper.className = 'home-return-band';
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', 'Personalized welcome back');

    var inner = document.createElement('div');
    inner.className = 'container home-return-inner';

    var text = document.createElement('div');
    text.className = 'home-return-text';
    var eyebrow = document.createElement('span');
    eyebrow.className = 'home-return-eyebrow';
    eyebrow.textContent = stage.eyebrow;
    var line = document.createElement('p');
    line.className = 'home-return-line';
    line.innerHTML = buildLineHtml(state);
    text.appendChild(eyebrow);
    text.appendChild(line);

    var actions = document.createElement('div');
    actions.className = 'home-return-actions';
    var cta = document.createElement('a');
    cta.className = 'home-return-cta';
    cta.href = stage.href;
    cta.textContent = stage.cta + ' →';
    var dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'home-return-dismiss';
    dismiss.setAttribute('aria-label', 'Dismiss personalized welcome');
    dismiss.textContent = 'Dismiss';
    dismiss.addEventListener('click', function () {
      try { window.sessionStorage.setItem('vs_home_return_dismissed', '1'); } catch (_) {}
      root.innerHTML = '';
    });
    actions.appendChild(cta);
    actions.appendChild(dismiss);

    inner.appendChild(text);
    inner.appendChild(actions);
    wrapper.appendChild(inner);
    root.innerHTML = '';
    root.appendChild(wrapper);

    if (window.VSIntentState && typeof window.VSIntentState.noteExposure === 'function') {
      window.VSIntentState.noteExposure('home_return_band');
    }
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'personalized_welcome_shown', {
          journey_stage: state.journey_stage,
          world_affinity: state.world_affinity,
          trust_level: state.trust_level
        });
      }
    } catch (_) {}
  }

  function boot() {
    var root = document.getElementById('home-personalized-welcome');
    if (!root) return;
    if (!window.VSIntentState || typeof window.VSIntentState.getState !== 'function') return;

    try {
      if (window.sessionStorage.getItem('vs_home_return_dismissed') === '1') return;
    } catch (_) {}

    var state = window.VSIntentState.getState();

    // Honest empty state: do nothing for brand-new anonymous visitors.
    if (state.returning_status !== 'returning' && !state.logged_in && !state.pathway && !state.membership_intent) {
      return;
    }

    render(root, state);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
