/** Voidfall progression presentation. Story bytes are public HTML, not confidential delivery.
 * Member/profile authority comes from the existing Obelisk bridge and own-profile read. */
(function () {
  'use strict';

  var STYLE = [
    '.vs-lore-gate{position:relative;border:1px dashed rgba(212,175,55,0.32);background:rgba(13,16,28,0.55);border-radius:14px;padding:1.05rem 1.15rem;margin:1.2rem 0;}',
    '.vs-lore-gate [data-lore-content][hidden]{display:none !important;}',
    '.vs-lore-gate__lock{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:linear-gradient(180deg,rgba(13,16,28,0.92),rgba(13,16,28,0.84));border-radius:14px;padding:1rem;}',
    '.vs-lore-gate__lock svg{width:32px;height:32px;margin-bottom:0.5rem;opacity:0.7;}',
    '.vs-lore-gate__title{font-family:Georgia,serif;font-size:0.95rem;color:var(--gold,#d4af37);letter-spacing:0.05em;text-transform:uppercase;margin:0 0 0.35rem;}',
    '.vs-lore-gate__sub{font-size:0.83rem;color:var(--muted);margin:0 0 0.65rem;max-width:38ch;line-height:1.5;}',
    '.vs-lore-gate__cta{display:inline-flex;align-items:center;justify-content:center;min-height:44px;box-sizing:border-box;padding:0.45rem 0.95rem;border-radius:999px;background:var(--gold,#d4af37);color:#0c0d12;font-size:0.78rem;font-weight:600;text-decoration:none;}',
    '.vs-lore-gate__retry{border:0;cursor:pointer;margin-top:0.55rem;}',
    '.vs-lore-gate--unlocked{border-style:solid;border-color:rgba(126,201,255,0.32);background:rgba(126,201,255,0.05);transition:border-color 800ms ease,background 800ms ease;}',
    '.vs-lore-gate__reveal{font-family:Georgia,serif;font-size:0.72rem;color:var(--text);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:0.55rem;display:block;}',
    'body.light-mode .vs-lore-gate{background:rgba(255,253,247,0.92);}',
    'body.light-mode .vs-lore-gate__cta{color:#fff;}',
    'body.light-mode .vs-lore-gate__lock{background:linear-gradient(180deg,rgba(255,253,247,0.96),rgba(255,253,247,0.92));}',
    'body.light-mode .vs-lore-gate--unlocked{background:rgba(126,201,255,0.08);}',
    '@media (prefers-reduced-motion: reduce){.vs-lore-gate--unlocked{transition:none;}}'
  ].join('\n');

  var LOCK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="16" r="1.4"/></svg>';

  function injectStyle() {
    if (document.querySelector('style[data-lore-gates-style]')) return;
    var s = document.createElement('style');
    s.setAttribute('data-lore-gates-style', '1');
    s.appendChild(document.createTextNode(STYLE));
    document.head.appendChild(s);
  }

  var sequence = 0;

  function rule(gate, authority) {
    var key = gate.getAttribute('data-lore-rank');
    if (gate.getAttribute('data-lore-membership') !== 'required') return null;
    if (!key) return { label: 'Website member', minimum: 0 };
    // Only the delegated rule is supported; unknown author markup fails closed.
    if (key !== 'vault_breacher' || !authority || !authority.config) return null;
    var config = authority.config;
    if (!Array.isArray(config.ranks) || !Array.isArray(config.rankThresholds) || config.ranks.length !== config.rankThresholds.length) return null;
    var index = config.ranks.findIndex(function (rank) { return rank.key === key; });
    var minimum = config.rankThresholds[index];
    return index >= 0 && Number.isSafeInteger(minimum) && minimum >= 0
      ? { label: config.ranks[index].label, minimum: minimum } : null;
  }

  function render(gate, profile, authority, state) {
    var requirement = rule(gate, authority), content = gate.querySelector('[data-lore-content]');
    if (!content) return;
    var unlocked = !!(requirement && profile && profile.points >= requirement.minimum);
    gate.classList.add('vs-lore-gate');
    gate.classList.toggle('vs-lore-gate--locked', !unlocked);
    gate.classList.toggle('vs-lore-gate--unlocked', unlocked);
    content.hidden = !unlocked;content.inert = !unlocked;
    var prior = gate.querySelector('.vs-lore-gate__lock');if (prior) prior.remove();
    var reveal = gate.querySelector('.vs-lore-gate__reveal');if (reveal) reveal.remove();
    if (unlocked) {
      reveal = document.createElement('span');reveal.className = 'vs-lore-gate__reveal';
      reveal.textContent = 'Fragment revealed · ' + requirement.label;
      gate.insertBefore(reveal, gate.firstChild);return;
    }
    var lock = document.createElement('div');lock.className = 'vs-lore-gate__lock';
    var icon = document.createElement('span');icon.innerHTML = LOCK_SVG;lock.appendChild(icon);
    var title = document.createElement('div');title.className = 'vs-lore-gate__title';title.textContent = 'Sealed Fragment';lock.appendChild(title);
    var sub = document.createElement('p');sub.className = 'vs-lore-gate__sub';
    sub.textContent = state === 'checking' ? 'Checking your website member profile…'
      : state === 'unavailable' || !requirement ? 'Your member progress could not be checked. Retry when your connection is ready.'
      : profile ? 'Reach ' + requirement.label + ' rank to reveal this fragment.'
      : 'Sign in with a website member profile to reveal this fragment.';
    lock.appendChild(sub);
    var link = document.createElement('a');link.className = 'vs-lore-gate__cta';
    link.href = profile ? '/ranks/' : '/vault-member/';link.textContent = profile ? 'See rank path' : 'Open your member profile';
    lock.appendChild(link);
    if (state === 'unavailable' || !requirement) {
      var retry = document.createElement('button');retry.type = 'button';
      retry.className = 'vs-lore-gate__cta vs-lore-gate__retry';retry.textContent = 'Try again';
      retry.addEventListener('click', init);lock.appendChild(retry);
    }
    gate.appendChild(lock);
  }

  async function currentProfile() {
    var bridge = window.VSSignedInState;
    if (!bridge || typeof bridge.readOwnProgression !== 'function') throw Error('progression_unavailable');
    return bridge.readOwnProgression();
  }

  async function init() {
    var gates = Array.from(document.querySelectorAll('[data-lore-gate]'));
    if (!gates.length) return;
    var attempt = ++sequence;injectStyle();
    gates.forEach(function (gate) { render(gate, null, null, 'checking'); });
    try {
      var results = await Promise.all([
        window.VSMembership ? Promise.resolve(window.VSMembership) : import('/assets/membership-access.js').then(function () { return window.VSMembership; }),
        currentProfile()
      ]);
      if (attempt !== sequence) return;
      gates.forEach(function (gate) { render(gate, results[1], results[0], 'ready'); });
    } catch (_) {
      if (attempt !== sequence) return;
      gates.forEach(function (gate) { render(gate, null, null, 'unavailable'); });
    }
  }
  document.addEventListener('vs:session-ready', init);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') init(); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.VSLoreGates = { refresh: init };
})();
