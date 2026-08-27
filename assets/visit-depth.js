/**
 * VaultSpark — Visit Depth Tier Upsell.
 *
 * Tracks distinct top-level sections visited within a session. After the
 * visitor has genuinely explored the forge (≥ 4 distinct sections across
 * the current session), surfaces a contextual, non-blocking membership
 * upsell that names WHAT they've looked at — never an enum, never spammy.
 *
 * Voice rule: no trust_level / journey_stage raw values ever reach copy.
 * Frequency rule: shown at most once per 30 days, never within 12s of page
 * load, never on portals, and never after another automatic surface.
 * Respects prefers-reduced-motion.
 *
 * Writes to sessionStorage only (no server round-trip). CSP-clean.
 */
(function () {
  'use strict';

  var KEY_SECTIONS  = 'vs_vd_sections';
  var KEY_DISMISSED = 'vs_vd_dismissed';
  var KEY_SHOWN     = 'vs_vd_shown';
  var KEY_LAST_SHOWN = 'vs_vd_last_shown';
  var MIN_SECTIONS  = 4;
  var MIN_DWELL_MS  = 12 * 1000;
  var COOLDOWN_MS   = 30 * 24 * 60 * 60 * 1000;
  var SUPPRESS_PATHS = ['/vault-member/', '/investor-portal/', '/studio-hub/', '/admin/', '/vaultsparked/', '/membership/'];

  function emitUx(event) {
    try {
      var body = JSON.stringify({ route: location.pathname, ux: event });
      if (navigator.sendBeacon) navigator.sendBeacon('/v/rum', new Blob([body], { type: 'application/json' }));
    } catch (_) {}
  }

  // Map first path segment to a human-readable section label.
  var SECTION_LABELS = {
    '':            'the home vault',
    'games':       'the games shelf',
    'projects':    'the projects library',
    'universe':    'the universe lore',
    'studio':      'the studio',
    'studio-pulse':'the forge window',
    'ignis':       'the IGNIS forge',
    'changelog':   'the changelog',
    'journal':     'the signal log',
    'leaderboards':'the leaderboards',
    'ranks':       'the vault ranks',
    'community':   'the community hub',
    'roadmap':     'the vault pipeline',
    'press':       'the press kit',
    'social':      'the social channels',
    'faq':         'the FAQ',
    'contact':     'the contact desk',
    'rights':      'technology & rights',
  };

  var STYLE = [
    '.vs-vd{position:fixed;right:1.2rem;bottom:5.5rem;z-index:55;max-width:360px;width:calc(100vw - 2.4rem);background:rgba(13,16,28,0.96);border:1px solid rgba(255,196,0,0.35);border-radius:16px;padding:1.1rem 1.2rem 1rem;box-shadow:0 18px 42px rgba(0,0,0,0.45);color:var(--text,#e2e8f0);font-family:inherit;animation:vs-vd-in 260ms cubic-bezier(0.32,0.72,0,1) both;}',
    '@keyframes vs-vd-in{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}',
    '@media(prefers-reduced-motion:reduce){.vs-vd{animation:none;}}',
    '.vs-vd__eyebrow{font-size:0.7rem;font-weight:800;text-transform:uppercase;letter-spacing:0.14em;color:var(--gold,#d4af37);margin:0 0 0.45rem;}',
    '.vs-vd__copy{font-family:Georgia,serif;font-size:0.98rem;line-height:1.5;margin:0 0 0.9rem;padding-right:1.5rem;}',
    '.vs-vd__cta{display:inline-block;background:linear-gradient(135deg,#FFC400,#FF7A00);color:#0a0e18;font-weight:700;padding:0.55rem 0.95rem;border-radius:10px;text-decoration:none;font-size:0.88rem;}',
    '.vs-vd__cta:hover{filter:brightness(1.06);}',
    '.vs-vd__dismiss{position:absolute;top:0.55rem;right:0.75rem;background:none;border:none;color:rgba(255,255,255,0.45);font-size:1.1rem;cursor:pointer;padding:0.2rem;line-height:1;}',
    '.vs-vd__dismiss:hover{color:rgba(255,255,255,0.85);}',
    'body.light-mode .vs-vd{background:rgba(255,253,247,0.98);border-color:rgba(212,175,55,0.45);color:#141c34;}',
    'body.light-mode .vs-vd__dismiss{color:rgba(20,28,52,0.5);}',
  ].join('\n');

  function suppressed() {
    var p = location.pathname;
    if (SUPPRESS_PATHS.some(function (s) { return p.indexOf(s) === 0; })) return true;
    if (document.body && document.body.getAttribute('data-vs-signed-in') === 'true') return true;
    if (window.VSSignedInState && window.VSSignedInState.getSession && window.VSSignedInState.getSession()) return true;
    try {
      if (sessionStorage.getItem(KEY_DISMISSED) === '1') return true;
      if (sessionStorage.getItem(KEY_SHOWN) === '1') return true;
      var lastShown = parseInt(localStorage.getItem(KEY_LAST_SHOWN) || '0', 10);
      if (lastShown && Date.now() - lastShown < COOLDOWN_MS) return true;
      if (window.VSAttention && window.VSAttention.current()) return true;
    } catch (_) {}
    return false;
  }

  function firstSegment() {
    var seg = (location.pathname.split('/').filter(Boolean)[0] || '').toLowerCase();
    return seg in SECTION_LABELS ? seg : null;
  }

  function loadSections() {
    try { return JSON.parse(sessionStorage.getItem(KEY_SECTIONS) || '[]') || []; } catch (_) { return []; }
  }
  function saveSections(arr) {
    try { sessionStorage.setItem(KEY_SECTIONS, JSON.stringify(arr.slice(-12))); } catch (_) {}
  }

  function record() {
    var seg = firstSegment();
    if (seg === null) return;
    var list = loadSections();
    if (list.indexOf(seg) === -1) list.push(seg);
    saveSections(list);
  }

  function phraseFor(list) {
    // Pick up to 3 most recent distinct sections for the copy.
    var parts = list.slice(-3).map(function (s) { return SECTION_LABELS[s] || s; });
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return parts[0] + ' and ' + parts[1];
    return parts[0] + ', ' + parts[1] + ', and ' + parts[2];
  }

  function inject() {
    if (document.querySelector('style[data-vs-vd-style]')) return;
    var s = document.createElement('style');
    s.setAttribute('data-vs-vd-style', '1');
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function show(list) {
    if (window.VSAttention && window.VSAttention.claim && !window.VSAttention.claim('visit-depth')) return;
    try {
      if (!window.VSAttention) {
        if (sessionStorage.getItem('vs_attention_surface_v1')) return;
        sessionStorage.setItem('vs_attention_surface_v1', 'visit-depth');
      }
      localStorage.setItem(KEY_LAST_SHOWN, Date.now().toString());
    } catch (_) {}
    inject();
    var host = document.createElement('div');
    host.className = 'vs-vd';
    host.setAttribute('role', 'complementary');
    host.setAttribute('aria-label', 'Vault membership invitation');
    var eyebrow = document.createElement('p');
    eyebrow.className = 'vs-vd__eyebrow';
    eyebrow.textContent = 'You have been through the forge';
    var copy = document.createElement('p');
    copy.className = 'vs-vd__copy';
    copy.textContent = 'You have explored ' + phraseFor(list) + '. Vault members get early signal, sealed previews, and the deeper layers first.';
    var cta = document.createElement('a');
    cta.className = 'vs-vd__cta';
    cta.href = '/membership/';
    cta.textContent = 'See what membership unlocks';
    cta.setAttribute('data-track-event', 'visit_depth_upsell_cta');
    var dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'vs-vd__dismiss';
    dismiss.setAttribute('aria-label', 'Dismiss');
    dismiss.textContent = '×';
    dismiss.addEventListener('click', function () {
      try { sessionStorage.setItem(KEY_DISMISSED, '1'); } catch (_) {}
      if (host.parentNode) host.parentNode.removeChild(host);
    });
    host.appendChild(eyebrow);
    host.appendChild(copy);
    host.appendChild(cta);
    host.appendChild(dismiss);
    document.body.appendChild(host);
    // Keyboard escape hatch — Esc dismisses the panel like the × button.
    var onKey = function (e) {
      if (e.key === 'Escape' || e.keyCode === 27) {
        document.removeEventListener('keydown', onKey);
        dismiss.click();
      }
    };
    document.addEventListener('keydown', onKey);
    try { sessionStorage.setItem(KEY_SHOWN, '1'); } catch (_) {}
    emitUx('engagement:visit_depth_upsell_shown');
  }

  function maybeShow() {
    if (suppressed()) return;
    var list = loadSections();
    if (list.length < MIN_SECTIONS) return;
    show(list);
  }

  function init() {
    record();
    document.addEventListener('vs:session-ready', function (event) {
      if (event && event.detail && event.detail.signedIn) {
        var existing = document.querySelector('.vs-vd');
        if (existing) existing.remove();
      }
    });
    // If the threshold was already crossed on prior pages this session, there
    // is no reason to make the visitor wait another 12s — fire sooner.
    var list = loadSections();
    var delay = list.length >= MIN_SECTIONS ? 2000 : MIN_DWELL_MS;
    setTimeout(maybeShow, delay);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
