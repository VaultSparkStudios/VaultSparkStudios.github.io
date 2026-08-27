/**
 * VaultSpark — Exit Intent Capture.
 *
 * Detects two exit signals:
 *  Desktop: mouseleave toward the top of the viewport (tab/address-bar hover).
 *  Mobile:  rapid upward scroll past the page fold (scroll-up velocity threshold).
 *
 * On trigger → shows a lightweight bottom-right prompt asking one question.
 * Answer is stored in micro-feedback localStorage + queued to Supabase page_feedback.
 *
 * Rules:
 *  · Only fires once per 30 days and never after another automatic surface.
 *  · Never fires on portal/hub/investor pages.
 *  · Respects prefers-reduced-motion (no slide animation).
 *  · Self-removes after answer or explicit dismiss.
 *  · Minimum 12 seconds on page before it can trigger.
 */
(function () {
  'use strict';

  var SESSION_KEY = 'vs_exit_intent_shown';
  var LAST_SHOWN_KEY = 'vs_exit_intent_last_shown';
  var STORAGE_KEY = 'vs_micro_feedback_v1';
  var MAX_ENTRIES = 30;
  var MIN_TIME_MS = 25000;
  var COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
  var SUPPRESS_PATHS = ['/vault-member/', '/investor-portal/', '/studio-hub/', '/admin/', '/offline', '/404'];

  var startTime = Date.now();
  var userEngaged = false;

  function shouldSuppress() {
    var path = location.pathname;
    if (SUPPRESS_PATHS.some(function (p) { return path.indexOf(p) === 0; })) return true;
    try {
      if (!localStorage.getItem('vs_cookie_consent')) return true;
      if (sessionStorage.getItem(SESSION_KEY) === '1') return true;
      var lastShown = parseInt(localStorage.getItem(LAST_SHOWN_KEY) || '0', 10);
      if (lastShown && Date.now() - lastShown < COOLDOWN_MS) return true;
      if (window.VSAttention && window.VSAttention.current()) return true;
      return false;
    } catch (_) { return false; }
  }

  function markShown() {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (_) {}
    try { localStorage.setItem(LAST_SHOWN_KEY, Date.now().toString()); } catch (_) {}
  }

  function claimAttention() {
    if (window.VSAttention && window.VSAttention.claim) return window.VSAttention.claim('exit-intent');
    try {
      if (sessionStorage.getItem('vs_attention_surface_v1')) return false;
      sessionStorage.setItem('vs_attention_surface_v1', 'exit-intent');
      return true;
    } catch (_) { return true; }
  }

  function readyToFire() {
    return userEngaged && (Date.now() - startTime >= MIN_TIME_MS);
  }

  function storeAnswer(answer) {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var entries = Array.isArray(JSON.parse(raw || '[]')) ? JSON.parse(raw) : [];
      entries.push({ type: 'exit_intent', answer: answer, page: location.pathname, ts: Date.now() });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
    } catch (_) {}
    // Best-effort Supabase insert
    try {
      var SB_URL = 'https://fjnpzjjyhnpmunfoycrp.supabase.co';
      var SB_KEY = 'sb_publishable_thM93D_GVKW5qzAiZpNl1w_AVGILCij';
      fetch(SB_URL + '/rest/v1/page_feedback', {
        method: 'POST',
        headers: { 'apikey': SB_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ page: location.pathname, type: 'exit_intent', answer: answer, referrer: document.referrer || null })
      }).catch(function () {});
    } catch (_) {}
  }

  var STYLE = [
    '.vs-exit-panel{position:fixed;bottom:1.2rem;right:1.2rem;z-index:9999;',
    'width:min(320px,calc(100vw - 2rem));',
    'background:rgba(13,16,28,0.97);border:1px solid rgba(212,175,55,0.35);',
    'border-radius:18px;padding:1.2rem 1.4rem 1rem;',
    'box-shadow:0 20px 60px rgba(0,0,0,0.5);',
    'font-family:inherit;',
    'animation:vs-exit-slide-in 260ms cubic-bezier(0.32,0.72,0,1) both;}',
    '@keyframes vs-exit-slide-in{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}',
    '@media(prefers-reduced-motion:reduce){.vs-exit-panel{animation:none;}}',
    'body.light-mode .vs-exit-panel{background:rgba(255,253,247,0.98);border-color:rgba(212,175,55,0.4);}',
    '.vs-exit-panel__dismiss{position:absolute;top:0.7rem;right:0.9rem;',
    'background:none;border:none;color:rgba(255,255,255,0.4);font-size:1.1rem;cursor:pointer;padding:0.2rem;}',
    'body.light-mode .vs-exit-panel__dismiss{color:rgba(20,28,52,0.4);}',
    '.vs-exit-panel__q{font-family:Georgia,serif;font-size:0.95rem;line-height:1.45;margin:0 0 1rem;padding-right:1rem;}',
    '.vs-exit-panel__btns{display:flex;flex-direction:column;gap:0.5rem;}',
    '.vs-exit-panel__btn{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);',
    'border-radius:10px;padding:0.55rem 0.9rem;text-align:left;font:inherit;font-size:0.88rem;',
    'color:var(--text,#e2e8f0);cursor:pointer;transition:background 140ms,border-color 140ms;}',
    '.vs-exit-panel__btn:hover,.vs-exit-panel__btn:focus-visible{background:rgba(212,175,55,0.1);border-color:rgba(212,175,55,0.4);outline:none;}',
    'body.light-mode .vs-exit-panel__btn{background:rgba(20,28,52,0.04);border-color:rgba(20,28,52,0.1);color:#141c34;}',
    '.vs-exit-panel__thanks{font-size:0.88rem;color:var(--gold,#d4af37);font-family:Georgia,serif;text-align:center;padding:0.5rem 0;}'
  ].join('');

  var ANSWERS = [
    { key: 'yes',      label: '✓  Yes, found what I needed' },
    { key: 'no',       label: '✗  No, not quite' },
    { key: 'not_sure', label: '◎  Not sure yet' }
  ];

  function injectStyle() {
    if (document.querySelector('style[data-vs-exit-style]')) return;
    var s = document.createElement('style');
    s.setAttribute('data-vs-exit-style', '1');
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function showPanel() {
    if (document.querySelector('.vs-exit-panel')) return;
    if (!claimAttention()) return;
    markShown();
    injectStyle();

    var panel = document.createElement('div');
    panel.className = 'vs-exit-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-label', 'Quick feedback');

    var dismiss = document.createElement('button');
    dismiss.className = 'vs-exit-panel__dismiss';
    dismiss.type = 'button';
    dismiss.setAttribute('aria-label', 'Dismiss');
    dismiss.textContent = '×';

    var q = document.createElement('p');
    q.className = 'vs-exit-panel__q';
    q.textContent = 'Before you go — did you find what you were looking for?';

    var btns = document.createElement('div');
    btns.className = 'vs-exit-panel__btns';

    function answer(key) {
      storeAnswer(key);
      btns.innerHTML = '';
      dismiss.remove();
      var thanks = document.createElement('p');
      thanks.className = 'vs-exit-panel__thanks';
      thanks.textContent = 'Thanks — the vault heard you.';
      q.textContent = '';
      panel.appendChild(thanks);
      setTimeout(function () { if (panel.parentNode) panel.parentNode.removeChild(panel); }, 2200);
      try { if (navigator.sendBeacon) navigator.sendBeacon('/v/rum', new Blob([JSON.stringify({ ux: 'engagement:exit_intent_answered', answer: key })], { type: 'application/json' })); } catch (_) {}
    }

    ANSWERS.forEach(function (opt) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vs-exit-panel__btn';
      btn.textContent = opt.label;
      btn.addEventListener('click', function () { answer(opt.key); });
      btns.appendChild(btn);
    });

    dismiss.addEventListener('click', function () {
      if (panel.parentNode) panel.parentNode.removeChild(panel);
    });

    panel.appendChild(dismiss);
    panel.appendChild(q);
    panel.appendChild(btns);
    document.body.appendChild(panel);

    try { if (navigator.sendBeacon) navigator.sendBeacon('/v/rum', new Blob([JSON.stringify({ ux: 'engagement:exit_intent_shown' })], { type: 'application/json' })); } catch (_) {}
  }

  function bindDesktop() {
    // Only fire on true top-edge exit from the document, not from child element transitions.
    document.addEventListener('mouseleave', function (e) {
      if (e.target !== document.documentElement && e.target !== document.body) return;
      if (e.clientY > 10) return;
      if (shouldSuppress() || !readyToFire()) return;
      showPanel();
    });
  }

  function bindMobile() {
    if (!('ontouchstart' in window)) return;
    // Seed with the current scroll position so the first scroll event never reads dy from zero.
    var lastY = window.scrollY || 0;
    var lastTs = Date.now();
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      var now = Date.now();
      var dy = y - lastY;
      var dt = now - lastTs;
      lastY = y;
      lastTs = now;
      if (dt < 16 || dt > 2000) return; // debounce + ignore stale deltas (e.g., tab backgrounded)
      var velocityPx = (dy / Math.max(dt, 1)) * 1000;
      if (velocityPx < -600 && y < window.innerHeight * 0.4) {
        if (!shouldSuppress() && readyToFire()) showPanel();
      }
    }, { passive: true });
  }

  function bindEngagement() {
    // Require at least one real interaction before exit-intent is allowed to fire.
    // Prevents the panel from appearing before the visitor has actually looked at anything.
    var markEngaged = function () { userEngaged = true; };
    ['scroll', 'click', 'keydown', 'touchstart', 'pointermove'].forEach(function (evt) {
      window.addEventListener(evt, markEngaged, { passive: true, once: true });
    });
  }

  function init() {
    if (shouldSuppress()) return;
    bindEngagement();
    bindDesktop();
    bindMobile();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
