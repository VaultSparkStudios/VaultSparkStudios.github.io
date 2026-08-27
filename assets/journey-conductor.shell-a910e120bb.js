/* journey-conductor.js — one local-first layer for earned progression.
 * Mounts a game→Vault bridge and offers a route-specific micro-tour only
 * after demonstrated intent. Decision feedback is sampled after an action,
 * never on arrival. No identity data or server-side visitor state. */
(function () {
  'use strict';

  var PAGE_KEY = 'vs_journey_pages_v1';
  var OFFER_KEY = 'vs_journey_offer_v1';
  var FEEDBACK_KEY = 'vs_decision_feedback_v1';
  var FEEDBACK_PENDING_KEY = 'vs_decision_feedback_pending_v1';
  var STARTED_AT = Date.now();
  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var TOURS = {
    game: [
      ['Play the world', 'Start with the game itself; every live build is clearly marked.'],
      ['Verify the work', 'Open Proof for dated, machine-readable shipping receipts.'],
      ['Carry it into the Vault', 'Membership connects your studio journey across worlds.']
    ],
    membership: [
      ['See what is free', 'The free Vault account is the starting layer, not a trial.'],
      ['Compare the signal', 'Use proof and value tools before choosing any paid layer.'],
      ['Use one identity', 'Obelisk is the identity plane behind the studio account.']
    ],
    studio: [
      ['Read the pulse', 'See what shipped, what is being forged, and what is held.'],
      ['Inspect proof', 'Receipts make every public status independently checkable.'],
      ['Choose a world', 'Move from studio context into something playable.']
    ],
    general: [
      ['Find your route', 'Play, follow the studio, or inspect its proof.'],
      ['Use the command bar', 'Press Ctrl or Command + K for outcome-first navigation.'],
      ['Resume anytime', 'Your path stays in this browser—no account required.']
    ]
  };

  function get(key, fallback) {
    try { var parsed = JSON.parse(localStorage.getItem(key)); return parsed == null ? fallback : parsed; }
    catch (_) { return fallback; }
  }
  function set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }
  function path() { return ('/' + (location.pathname || '/').replace(/^\/+|\/+$/g, '') + '/').replace(/\/\//g, '/'); }
  function family(p) {
    if (/^\/(games\/[^/]+|call-of-doodie|franchise-architect|gridiron-gm)\//.test(p)) return 'game';
    if (/^\/(membership|vaultsparked|join|vault-member)\//.test(p)) return 'membership';
    if (/^\/(studio|studio-pulse|proof|changelog|journal)\//.test(p)) return 'studio';
    return 'general';
  }
  function slug(p) {
    var pieces = p.split('/').filter(Boolean);
    return (pieces[0] === 'games' ? pieces[1] : pieces[0] || 'game').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32);
  }
  function emitUx(name) {
    try {
      var body = new Blob([JSON.stringify({ ux: name, route: path(), ts: Date.now() })], { type: 'application/json' });
      navigator.sendBeacon('/v/rum', body);
    } catch (_) {}
  }
  function signal(type) {
    document.dispatchEvent(new CustomEvent('vs:journey-intent', { detail: { type: type } }));
  }

  function style() {
    if (document.getElementById('vs-journey-css')) return;
    var sheet = document.createElement('style');
    sheet.id = 'vs-journey-css';
    sheet.textContent =
      '.vs-vault-bridge{max-width:1120px;margin:clamp(2rem,6vw,5rem) auto;padding:clamp(1.2rem,3vw,2rem);border:1px solid color-mix(in srgb,var(--gold,#ffc400) 38%,transparent);border-radius:24px;background:var(--panel-strong,#0f1120);box-shadow:0 20px 70px rgba(0,0,0,.18)}' +
      '.vs-vault-bridge__eyebrow,.vs-journey__eyebrow{font:800 .68rem/1.2 system-ui;letter-spacing:.14em;text-transform:uppercase;color:var(--gold,#ffc400)}' +
      '.vs-vault-bridge h2{margin:.45rem 0 .55rem;font-size:clamp(1.45rem,3vw,2.2rem);color:var(--text,#f8fafc)}.vs-vault-bridge p{max-width:62ch;color:var(--muted,#a8b4d0);line-height:1.65}' +
      '.vs-vault-bridge__actions{display:flex;gap:.7rem;flex-wrap:wrap;margin-top:1rem}.vs-vault-bridge__actions a,.vs-journey__action{display:inline-flex;align-items:center;min-height:44px;padding:.7rem 1rem;border-radius:999px;text-decoration:none;font-weight:800}' +
      '.vs-vault-bridge__primary,.vs-journey__action{background:var(--gold,#ffc400);color:#171103}.vs-vault-bridge__secondary{border:1px solid color-mix(in srgb,var(--text,#fff) 25%,transparent);color:var(--text,#fff)}' +
      '.vs-journey{position:fixed;right:clamp(.75rem,3vw,1.5rem);bottom:clamp(.75rem,3vw,1.5rem);z-index:10020;width:min(390px,calc(100vw - 1.5rem));padding:1.1rem;border:1px solid color-mix(in srgb,var(--gold,#ffc400) 42%,transparent);border-radius:22px;background:var(--panel-strong,#0f1120);color:var(--text,#f8fafc);box-shadow:0 24px 80px rgba(0,0,0,.32);backdrop-filter:blur(18px)}' +
      '.vs-journey h2{font-size:1.12rem;margin:.35rem 2rem .45rem 0}.vs-journey p{font-size:.86rem;line-height:1.55;color:var(--muted,#a8b4d0)}.vs-journey__close{position:absolute;right:.7rem;top:.65rem;border:0;background:transparent;color:var(--muted,#a8b4d0);font-size:1.15rem;min-width:44px;min-height:44px;cursor:pointer}' +
      '.vs-journey__steps{list-style:none;padding:0;margin:.8rem 0;display:grid;gap:.55rem}.vs-journey__steps li{display:grid;grid-template-columns:1.7rem 1fr;gap:.5rem;align-items:start}.vs-journey__steps b{display:grid;place-items:center;width:1.55rem;height:1.55rem;border-radius:50%;background:color-mix(in srgb,var(--gold,#ffc400) 18%,transparent);color:var(--gold,#ffc400);font-size:.72rem}.vs-journey__steps strong{display:block;font-size:.84rem}.vs-journey__steps span{font-size:.75rem;color:var(--muted,#a8b4d0)}' +
      '.vs-decision-choices{display:grid;grid-template-columns:repeat(3,1fr);gap:.45rem}.vs-decision-choices button{min-height:44px;border:1px solid color-mix(in srgb,var(--text,#fff) 20%,transparent);border-radius:12px;background:transparent;color:var(--text,#fff);font-weight:700;cursor:pointer}' +
      '@media(max-width:430px){.vs-journey{left:.75rem;right:.75rem;width:auto}.vs-decision-choices{grid-template-columns:1fr}.vs-vault-bridge{margin-inline:.75rem}}' +
      '@media(prefers-reduced-motion:reduce){.vs-journey,.vs-vault-bridge{scroll-behavior:auto!important;animation:none!important}}';
    document.head.appendChild(sheet);
  }

  function mountBridge() {
    var p = path();
    if (family(p) !== 'game' || document.querySelector('[data-vault-bridge]')) return;
    var main = document.querySelector('main');
    if (!main) return;
    var titleNode = document.querySelector('main h1, .game-hero h1');
    var game = titleNode ? titleNode.textContent.trim() : 'this world';
    var source = slug(p);
    var section = document.createElement('section');
    section.className = 'vs-vault-bridge';
    section.dataset.vaultBridge = source;
    var eyebrow = document.createElement('span'); eyebrow.className = 'vs-vault-bridge__eyebrow'; eyebrow.textContent = 'Carry the signal forward';
    var heading = document.createElement('h2'); heading.textContent = 'Make ' + game + ' part of your Vault path.';
    var copy = document.createElement('p'); copy.textContent = 'A free Vault account connects the worlds you follow, studio ranks, and future participation. Verify the studio first if you want the receipts before the invitation.';
    var actions = document.createElement('div'); actions.className = 'vs-vault-bridge__actions';
    var primary = document.createElement('a'); primary.className = 'vs-vault-bridge__primary'; primary.href = '/membership/?from=' + encodeURIComponent(source); primary.textContent = 'See the Vault path';
    var proof = document.createElement('a'); proof.className = 'vs-vault-bridge__secondary'; proof.href = '/proof/?from=' + encodeURIComponent(source); proof.textContent = 'Verify the work';
    var sourceEvent = source.replace(/-/g, '_').slice(0, 20);
    primary.addEventListener('click', function () { emitUx('funnel:vault_bridge_membership_' + sourceEvent); signal('vault-bridge'); });
    proof.addEventListener('click', function () { emitUx('funnel:vault_bridge_proof_' + sourceEvent); signal('vault-bridge'); });
    actions.append(primary, proof); section.append(eyebrow, heading, copy, actions); main.appendChild(section);
    emitUx('funnel:vault_bridge_shown_' + sourceEvent);
  }

  function panelBase(label, title) {
    style();
    var panel = document.createElement('aside'); panel.className = 'vs-journey'; panel.setAttribute('role', 'complementary'); panel.setAttribute('aria-label', title);
    var close = document.createElement('button'); close.className = 'vs-journey__close'; close.type = 'button'; close.setAttribute('aria-label', 'Dismiss'); close.textContent = '×';
    var eyebrow = document.createElement('span'); eyebrow.className = 'vs-journey__eyebrow'; eyebrow.textContent = label;
    var heading = document.createElement('h2'); heading.textContent = title;
    panel.append(close, eyebrow, heading);
    return { panel: panel, close: close };
  }

  function showTour(reason) {
    var p = path(); var f = family(p); var key = f + ':' + p;
    var offers = get(OFFER_KEY, {});
    if (offers[key] || document.querySelector('.vs-journey')) return;
    if (window.VSAttention && window.VSAttention.claim && !window.VSAttention.claim('journey-tour')) return;
    offers[key] = { state: 'offered', reason: reason, at: Date.now() }; set(OFFER_KEY, offers);
    var base = panelBase('Your route · 3 short steps', f === 'game' ? 'Turn this world into a path' : f === 'membership' ? 'See the Vault before you join it' : f === 'studio' ? 'Read the studio like a system' : 'Find your way through the Vault');
    var intro = document.createElement('p'); intro.textContent = 'You have shown enough intent for context—not an arrival-time interruption.';
    var list = document.createElement('ol'); list.className = 'vs-journey__steps';
    TOURS[f].forEach(function (step, index) { var li = document.createElement('li'); var n = document.createElement('b'); n.textContent = String(index + 1); var body = document.createElement('div'); var strong = document.createElement('strong'); strong.textContent = step[0]; var span = document.createElement('span'); span.textContent = step[1]; body.append(strong, span); li.append(n, body); list.appendChild(li); });
    var start = document.createElement('a'); start.className = 'vs-journey__action'; start.href = f === 'game' ? '/proof/' : f === 'membership' ? '/membership-value/' : f === 'studio' ? '/studio-pulse/' : '/games/'; start.textContent = 'Start this route';
    start.addEventListener('click', function () { offers[key].state = 'started'; offers[key].target = start.getAttribute('href'); offers[key].at = Date.now(); set(OFFER_KEY, offers); emitUx('funnel:onboard_started'); });
    base.close.addEventListener('click', function () { offers[key].state = 'dismissed'; offers[key].at = Date.now(); set(OFFER_KEY, offers); emitUx('funnel:onboard_dismissed'); base.panel.remove(); });
    base.panel.append(intro, list, start); document.body.appendChild(base.panel); emitUx('funnel:onboard_offered');
  }

  function qualifyIntent() {
    var pages = get(PAGE_KEY, []); var p = path();
    var offers = get(OFFER_KEY, {});
    Object.keys(offers).forEach(function (key) {
      var offer = offers[key];
      if (offer && offer.state === 'started' && offer.target && p.indexOf(offer.target) === 0) {
        offer.state = 'completed'; offer.at = Date.now(); emitUx('funnel:onboard_completed');
      }
    });
    set(OFFER_KEY, offers);
    if (pages.indexOf(p) < 0) pages.push(p);
    set(PAGE_KEY, pages.slice(-20));
    var secondPage = pages.length >= 2;
    function offer(reason) { if (Date.now() - STARTED_AT < 2200) return setTimeout(function () { offer(reason); }, 2300); showTour(reason); }
    if (secondPage) offer('second-page');
    document.addEventListener('vs:journey-intent', function (event) { offer(event.detail?.type || 'action'); }, { once: true });
    document.addEventListener('vs:command-palette-intent', function () { offer('command-palette'); }, { once: true });
    var scrollHandled = false;
    window.addEventListener('scroll', function () {
      if (scrollHandled) return;
      var denominator = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      if (scrollY / denominator >= .5) { scrollHandled = true; offer('engaged-scroll'); }
    }, { passive: true });
    document.addEventListener('click', function (event) {
      if (event.target.closest('[data-track-event], .game-hero a, [data-game-card] a')) signal('project-action');
    }, { passive: true });
  }

  function maybeFeedback(trigger) {
    if (document.querySelector('.vs-journey')) return;
    var record = get(FEEDBACK_KEY, { last: 0, responses: [] });
    if (Date.now() - (record.last || 0) < 7 * 86400000) return;
    var day = Math.floor(Date.now() / 86400000); var sample = 0; var token = path() + ':' + day;
    for (var i = 0; i < token.length; i++) sample = (sample * 31 + token.charCodeAt(i)) % 97;
    if (sample % 3 !== 0 && !document.documentElement.hasAttribute('data-vs-feedback-preview')) return;
    if (window.VSAttention && window.VSAttention.claim && !window.VSAttention.claim('decision-feedback')) return;
    var base = panelBase('One bounded question', 'What helped you decide?');
    var copy = document.createElement('p'); copy.textContent = 'Choose one signal. Results are only surfaced in aggregate after at least five responses.';
    var choices = document.createElement('div'); choices.className = 'vs-decision-choices';
    [['clarity', 'Clear path'], ['proof', 'Proof'], ['value', 'Value']].forEach(function (choice) {
      var button = document.createElement('button'); button.type = 'button'; button.textContent = choice[1];
      button.addEventListener('click', function () { record.last = Date.now(); record.responses = (record.responses || []).concat([{ choice: choice[0], context: trigger, at: Date.now() }]).slice(-12); set(FEEDBACK_KEY, record); emitUx('funnel:decision_feedback_' + choice[0]); base.panel.remove(); });
      choices.appendChild(button);
    });
    base.close.addEventListener('click', function () { record.last = Date.now(); set(FEEDBACK_KEY, record); emitUx('funnel:decision_feedback_skip'); base.panel.remove(); });
    base.panel.append(copy, choices); document.body.appendChild(base.panel); emitUx('funnel:decision_feedback_shown');
  }

  function boot() {
    style(); mountBridge(); qualifyIntent();
    try {
      var pending = sessionStorage.getItem(FEEDBACK_PENDING_KEY);
      if (pending) { sessionStorage.removeItem(FEEDBACK_PENDING_KEY); setTimeout(function () { maybeFeedback(pending); }, reduced ? 0 : 900); }
    } catch (_) {}
    document.addEventListener('vs:decision-complete', function (event) { maybeFeedback(event.detail?.type || 'decision'); });
    document.addEventListener('click', function (event) {
      var decision = event.target.closest('[data-vault-bridge] a, [data-proof-verify], [data-membership-tier] a, [data-oracle-feedback]');
      if (decision) {
        try { sessionStorage.setItem(FEEDBACK_PENDING_KEY, 'decision-action'); } catch (_) {}
        setTimeout(function () { maybeFeedback('action'); }, reduced ? 0 : 500);
      }
    });
  }

  window.VSJourneyConductor = { family: family, path: path, signal: signal, previewFeedback: function () { maybeFeedback('preview'); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
