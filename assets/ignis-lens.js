/**
 * VaultSpark — IGNIS Lens.
 *
 * A small floating "Ask IGNIS" pill that appears bottom-right on game/universe pages.
 * Click → expands inline Vault Oracle (lazy-loads vault-oracle.js if not already loaded).
 * Pre-seeds page context from <meta name="ignis-context"> if present, else from <title>.
 *
 * Auto-suppresses on pages with [data-vault-oracle] (already has full Oracle), and on portal pages.
 */
(function () {
  'use strict';

  var STYLE = [
    '.vs-lens{position:fixed;right:1.1rem;bottom:1.1rem;z-index:60;display:flex;flex-direction:column;align-items:flex-end;gap:0.6rem;font-family:inherit;}',
    '.vs-lens__pill{display:inline-flex;align-items:center;gap:0.45rem;background:rgba(13,16,28,0.92);color:var(--gold,#d4af37);border:1px solid rgba(212,175,55,0.4);border-radius:999px;padding:0.55rem 1rem;font-size:0.82rem;font-family:Georgia,serif;letter-spacing:0.04em;cursor:pointer;backdrop-filter:blur(8px);box-shadow:0 8px 24px rgba(0,0,0,0.35);transition:transform 160ms ease,box-shadow 160ms ease;}',
    '.vs-lens__pill:hover{transform:translateY(-2px);box-shadow:0 12px 32px rgba(212,175,55,0.25);}',
    '.vs-lens__pill:before{content:"";width:7px;height:7px;border-radius:50%;background:var(--gold,#d4af37);box-shadow:0 0 10px var(--gold,#d4af37);animation:vs-lens-pulse 2.6s ease-in-out infinite;}',
    '@keyframes vs-lens-pulse{0%,100%{opacity:0.55;}50%{opacity:1;}}',
    '@media (prefers-reduced-motion: reduce){.vs-lens__pill:before{animation:none;}}',
    '.vs-lens__panel{width:min(380px,calc(100vw - 2.2rem));max-height:60vh;overflow:auto;background:rgba(13,16,28,0.96);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:0.4rem;display:none;}',
    '.vs-lens.vs-lens--open .vs-lens__panel{display:block;}',
    'body.light-mode .vs-lens__pill{background:rgba(255,253,247,0.96);color:#7a5e0a;border-color:rgba(212,175,55,0.55);}',
    'body.light-mode .vs-lens__panel{background:rgba(255,253,247,0.98);border-color:rgba(20,28,52,0.12);}',
  ].join('\n');

  var SUPPRESS_PATHS = ['/vault-member/', '/investor-portal/', '/studio-hub/', '/admin/'];

  function shouldSuppress() {
    if (document.querySelector('[data-vault-oracle]')) return true;
    var path = location.pathname;
    return SUPPRESS_PATHS.some(function (p) { return path.indexOf(p) === 0; });
  }

  function injectStyle() {
    if (document.querySelector('style[data-ignis-lens-style]')) return;
    var s = document.createElement('style');
    s.setAttribute('data-ignis-lens-style', '1');
    s.appendChild(document.createTextNode(STYLE));
    document.head.appendChild(s);
  }

  function loadOracle() {
    if (window.VSOracle) return Promise.resolve();
    if (window.__vsOracleLoading) return window.__vsOracleLoading;
    window.__vsOracleLoading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = '/assets/vault-oracle.js';
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('Failed to load Vault Oracle')); };
      document.head.appendChild(s);
    });
    return window.__vsOracleLoading;
  }

  function pageContext() {
    var meta = document.querySelector('meta[name="ignis-context"]');
    if (meta && meta.getAttribute('content')) return meta.getAttribute('content');
    var path = location.pathname;
    var title = (document.title || '').replace(/\s*[—|·]\s*VaultSpark.*$/i, '').trim();
    return 'User is on the page "' + title + '" (path ' + path + '). Bias your reply to that subject when relevant.';
  }

  function init() {
    if (shouldSuppress()) return;
    injectStyle();

    var lens = document.createElement('div');
    lens.className = 'vs-lens';

    var pill = document.createElement('button');
    pill.className = 'vs-lens__pill';
    pill.setAttribute('type', 'button');
    pill.setAttribute('aria-expanded', 'false');
    pill.setAttribute('aria-label', 'Ask IGNIS, the Vault Oracle');
    pill.textContent = 'Ask IGNIS';

    var panel = document.createElement('div');
    panel.className = 'vs-lens__panel';

    var host = document.createElement('div');
    host.setAttribute('data-vault-oracle', '');
    host.setAttribute('data-vault-oracle-context', pageContext());
    panel.appendChild(host);

    lens.appendChild(pill);
    lens.appendChild(panel);
    document.body.appendChild(lens);

    var opened = false;
    pill.addEventListener('click', function () {
      var willOpen = !lens.classList.contains('vs-lens--open');
      lens.classList.toggle('vs-lens--open', willOpen);
      pill.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      if (willOpen && !opened) {
        opened = true;
        loadOracle().then(function () {
          if (window.VSOracle && window.VSOracle.mount) window.VSOracle.mount(host);
        }).catch(function () {
          host.textContent = 'IGNIS is offline. Try again in a moment.';
        });
        if (window.gtag) window.gtag('event', 'ignis_lens_opened');
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
