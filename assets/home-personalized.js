(function () {
  'use strict';

  // Voice rule: no internal enum values ever appear in user-facing copy.
  // "trust_level" shapes tone (warmth/familiarity), never content.
  // "visit_count" shapes cadence bucket, never a raw number.
  // "world_affinity" and "journey_stage" drive the sentence, always in vault-forge voice.

  var WORLD_COPY = {
    vaultfront:   { verb: 'walking the halls of',       label: 'VaultFront',  href: '/games/vaultfront/' },
    solara:       { verb: 'chasing light through',      label: 'Solara',      href: '/games/solara/' },
    mindframe:    { verb: 'turning the gears of',       label: 'MindFrame',   href: '/games/mindframe/' },
    'the-exodus': { verb: 'crossing',                   label: 'The Exodus',  href: '/games/the-exodus/' },
    voidfall:     { verb: 'deep in',                    label: "Voidfall's transmissions", href: '/universe/voidfall/' },
    dreadspike:   { verb: 'tracing',                    label: "DreadSpike's lore",        href: '/universe/dreadspike/' },
    games:        { verb: 'browsing',                   label: 'the worlds',  href: '/games/' },
    universe:     { verb: 'reading',                    label: 'the universe', href: '/universe/' }
  };

  // Per-stage framing. Eyebrow is warm and short; CTA matches the stage's next real move.
  var STAGE_COPY = {
    pricing:     { eyebrow: 'Ready when you are',   cta: 'Resume VaultSparked',   href: '/vaultsparked/' },
    considering: { eyebrow: 'Still thinking it over', cta: 'See what members get', href: '/membership-value/' },
    activation:  { eyebrow: 'Almost there',          cta: 'Finish joining',        href: '/vault-member/#register' },
    member:      { eyebrow: 'Welcome back, member',  cta: 'Open the Vault',        href: '/vault-member/' },
    exploring:   { eyebrow: 'Welcome back',          cta: 'See what shipped',      href: '/studio-pulse/' }
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  // Cadence bucket from raw visit count — never show the number to the user.
  // first-return / regular / frequent → drives tone, not displayed.
  function cadence(visitCount) {
    var n = Number(visitCount) || 1;
    if (n <= 2) return 'first-return';
    if (n <= 6) return 'regular';
    return 'frequent';
  }

  // Warmth tier from trust_level — drives an optional closing touch, never exposed as text.
  function warmth(trustLevel) {
    if (trustLevel === 'high' || trustLevel === 'high-trust') return 'deep';
    if (trustLevel === 'medium' || trustLevel === 'building' || trustLevel === 'medium-trust') return 'warm';
    return 'neutral';
  }

  function buildLineHtml(state) {
    var stage = state.journey_stage;
    var world = WORLD_COPY[state.world_affinity];
    var cad = cadence(state.visit_count);
    var warm = warmth(state.trust_level);

    // Member branch: always feels like a homecoming, no need to reference a world.
    if (stage === 'member') {
      return warm === 'deep'
        ? 'Your rank is where you left it. The vault remembers you.'
        : 'Your rank is where you left it. Step back in.';
    }

    // Pricing branch: speak to the decision, not the page.
    if (stage === 'pricing') {
      return world
        ? 'You were weighing VaultSparked after ' + esc(world.verb) + ' <a href="' + esc(world.href) + '">' + esc(world.label) + '</a>.'
        : 'You were weighing VaultSparked last time — still nothing hidden behind a dark pattern.';
    }

    // Activation branch: only one thing matters — the unfinished signup.
    if (stage === 'activation') {
      return 'You started the vault keys and didn\'t finish. Picks up where you left off.';
    }

    // Considering branch: soft nudge with proof.
    if (stage === 'considering') {
      return world
        ? 'Still curious about membership after ' + esc(world.verb) + ' <a href="' + esc(world.href) + '">' + esc(world.label) + '</a>? Here\'s what members actually get.'
        : 'Still weighing membership? Here\'s what members actually get — honestly, no fluff.';
    }

    // Exploring branch (default): world-anchored if we know one, cadence-flavored otherwise.
    if (world) {
      var opener = warm === 'deep'
        ? 'You\'ve been '
        : (cad === 'frequent' ? 'Back again — last time you were ' : 'Last time you were ');
      return opener + esc(world.verb) + ' <a href="' + esc(world.href) + '">' + esc(world.label) + '</a>. The forge has kept moving since.';
    }

    // No world affinity yet — generic warm return.
    if (cad === 'frequent') return 'You know the way by now. The forge has kept shipping.';
    if (cad === 'regular')  return 'Glad you\'re back. The forge has kept shipping.';
    return 'The forge has been busy since you last stopped by.';
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
