(function (window) {
  'use strict';
  // The idle loader may execute after DOMContentLoaded, or load this file twice.
  if (window.__vsTelemetryMatrixLoaded) return;
  window.__vsTelemetryMatrixLoaded = true;
  var started = false;
  var generation = 0;
  var queued = false;
  var roots = [];
  var rendered = new WeakMap();

  function contextFor(root) {
    if (root.dataset.telemetryContext === 'membership' || root.dataset.telemetryContext === 'vaultsparked') return root.dataset.telemetryContext;
    return 'home';
  }

  function preference() {
    var state;
    try { state = window.VSIntentState && window.VSIntentState.getState(); } catch (_) {}
    // Only an explicitly recorded entry choice is used. Derived intent, trust,
    // confidence and logged_in are not identity or preference evidence.
    var choices = {
      player: { title: 'Explore the games', copy: 'Your saved entry choice is games.', href: '/games/', cta: 'Browse games' },
      lore: { title: 'Explore the universe', copy: 'Your saved entry choice is stories and worlds.', href: '/universe/', cta: 'Explore worlds' },
      investor: { title: 'Read the studio updates', copy: 'Your saved entry choice is studio updates.', href: '/studio/#pulse', cta: 'Open Studio Pulse' },
      member: { title: 'Explore website membership', copy: 'Your saved entry choice is membership.', href: '/membership/', cta: 'See membership' },
      supporter: { title: 'Compare membership tiers', copy: 'Your saved entry choice is supporting the studio.', href: '/membership/#tiers', cta: 'Compare tiers' }
    };
    return state && Object.hasOwn(choices, state.pathway) ? choices[state.pathway] : null;
  }

  function enrollment(intel) {
    var mode = intel && intel.availability && intel.availability.signup && intel.availability.signup.mode;
    switch (mode) {
      case 'open': return { title: 'Explore free website membership', copy: 'New website memberships are currently open. Shared Studio sign-in uses Obelisk; project access is described separately.', href: '/vault-member/#register', cta: 'Create a website profile' };
      case 'invitation': return { title: 'Request a website membership invitation', copy: 'New website memberships are currently opened by invitation. Shared Studio sign-in is separate from website enrollment.', href: '/invite/', cta: 'Request your Vault invite' };
      case 'closed': return { title: 'Check website membership information', copy: 'New website membership enrollment is currently closed. Public project pages remain available to explore.', href: '/membership/', cta: 'See membership' };
      default: return { title: 'Check current website membership information', copy: 'See the membership page for the current enrollment path and available features.', href: '/membership/', cta: 'See membership' };
    }
  }

  function nextActionFor(context, selected, intel) {
    if (context === 'membership') return enrollment(intel);
    if (context === 'vaultsparked') return { title: 'Compare the monthly membership tiers', copy: 'Review the current features and enrollment information before choosing a tier.', href: '/membership/#tiers', cta: 'Compare tiers' };
    return selected || { title: 'Find something to explore', copy: 'Browse the games, or open a project page to see its current release and access details.', href: '/games/', cta: 'Browse games' };
  }

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function card(label, action, primary) {
    var node = element('article', 'telemetry-card' + (primary ? ' telemetry-card-primary' : ''));
    node.appendChild(element('span', 'telemetry-card-label', label));
    node.appendChild(element('strong', '', action.title));
    node.appendChild(element('p', '', action.copy));
    var link = element('a', 'telemetry-card-cta', action.cta);
    link.href = action.href;
    node.appendChild(link);
    return node;
  }

  function renderRoot(root, intel) {
    var selected = preference();
    var next = nextActionFor(contextFor(root), selected, intel);
    var membership = enrollment(intel);
    var key = JSON.stringify([next, selected, membership]);
    if (rendered.get(root) === key) return;
    var shell = element('div', 'telemetry-matrix-shell');
    var head = element('div', 'telemetry-matrix-head');
    head.appendChild(element('p', 'telemetry-matrix-kicker', 'Explore the vault'));
    head.appendChild(element('h3', 'telemetry-matrix-title', 'Choose your next step.'));
    head.appendChild(element('p', 'telemetry-matrix-copy', selected ? 'These links reflect an entry choice saved in this browser.' : 'Start with a game, a world, or current membership information.'));
    head.appendChild(element('p', 'telemetry-matrix-copy', membership.copy));
    shell.appendChild(head);
    var grid = element('div', 'telemetry-matrix-grid');
    grid.appendChild(card('Suggested next step', next, true));
    grid.appendChild(card('Your Studio account', { title: 'Open the Vault Member portal', copy: 'Sign in through Obelisk to return to your website profile. New website enrollment follows the current membership path.', href: '/vault-member/', cta: 'Open the portal' }, false));
    shell.appendChild(grid);
    root.replaceChildren(shell);
    rendered.set(root, key);
    // Rendering does not write exposure/preference state or emit change events.
  }

  function refresh() {
    if (queued) return;
    queued = true;
    Promise.resolve().then(function () {
      queued = false;
      var attempt = ++generation;
      return Promise.resolve().then(function () {
        return window.VSPublicIntel && typeof window.VSPublicIntel.get === 'function' ? window.VSPublicIntel.get() : null;
      }).catch(function () { return null; }).then(function (intel) {
        if (attempt !== generation) return;
        roots.forEach(function (root) { renderRoot(root, intel); });
      });
    });
  }

  function init() {
    if (started) return;
    started = true;
    roots = Array.prototype.slice.call(document.querySelectorAll('[data-telemetry-matrix]'));
    if (!roots.length) return;
    // Public feed failure or delay must not leave a reserved empty panel. The
    // initial neutral links make no claim about open enrollment.
    roots.forEach(function (root) { renderRoot(root, null); });
    refresh();
    document.addEventListener('vs:intent-state-change', refresh);
    document.addEventListener('vs:feedback-change', refresh);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})(window);
