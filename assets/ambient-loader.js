// ambient-loader.js — conditional loader for guarded ambient modules.
(function () {
  const loaded = new Set();
  const modules = [
    {
      src: '/assets/nav-sheet.js',
      when: function () {
        return location.search.includes('nav=sheet') || (window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
      }
    },
    {
      src: '/assets/exit-intent.js',
      when: function () {
        return !document.documentElement.hasAttribute('data-vs-signed-in') && !window.matchMedia('(pointer: coarse)').matches;
      },
      idle: true
    },
    {
      src: '/assets/visit-depth.js',
      when: function () {
        return !document.documentElement.hasAttribute('data-vs-signed-in');
      },
      idle: true
    },
    {
      src: '/assets/presence-badge.js',
      when: function () {
        return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      },
      idle: true
    },
    {
      src: '/assets/favicon-pulse.js',
      when: function () {
        return document.visibilityState === 'visible';
      },
      idle: true
    },
    {
      // Studio-health genome strip — top-of-page SIL mini-bars. Off the cold-cache
      // path (S178 split); skips the same surfaces the script itself does, so it
      // never even fetches on portals/admin/api or [data-no-strip] pages.
      src: '/assets/vault-genome-strip.js',
      when: function () {
        var p = location.pathname || '/';
        if (/^\/(vault-member|investor-portal|admin|api)\//.test(p)) return false;
        if (document.documentElement.hasAttribute('data-no-strip')) return false;
        if (document.body && document.body.hasAttribute('data-no-strip')) return false;
        return true;
      },
      idle: true
    },
    {
      // Returning-visitor momentum digest. Loads once a prior visit is recorded
      // (it sets its own baseline on first run, then shows on the next visit);
      // the script re-checks eligibility and bails honestly when <2 ships landed.
      src: '/assets/returning-visitor-digest.js',
      when: function () {
        try { return parseInt(localStorage.getItem('vs_visit_count') || '0', 10) >= 1; }
        catch (_) { return false; }
      },
      idle: true
    }
  ];

  // S174 TT burndown (proactive): same TrustedScriptURL sink class as
  // home-idle-loader — fix before it starts reporting. Same-origin only.
  let ttPolicy = null;
  try {
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
      ttPolicy = window.trustedTypes.createPolicy('vs-ambient-loader', {
        createScriptURL: function (u) { return u.indexOf('/assets/') === 0 ? u : ''; },
      });
    }
  } catch (_e) { /* duplicate policy name or restricted — fall through */ }

  function load(src) {
    if (loaded.has(src) || document.querySelector('script[src="' + src + '"]')) return;
    loaded.add(src);
    const script = document.createElement('script');
    script.src = ttPolicy ? ttPolicy.createScriptURL(src) : src;
    script.defer = true;
    script.dataset.vsAmbientLoaded = 'true';
    document.head.appendChild(script);
  }

  function maybeLoad(moduleDef) {
    try {
      if (moduleDef.when()) load(moduleDef.src);
    } catch (_) {}
  }

  function run() {
    modules.forEach(function (moduleDef) {
      if (moduleDef.idle && 'requestIdleCallback' in window) {
        requestIdleCallback(function () { maybeLoad(moduleDef); }, { timeout: 2500 });
      } else if (moduleDef.idle) {
        setTimeout(function () { maybeLoad(moduleDef); }, 1200);
      } else {
        maybeLoad(moduleDef);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }

  window.VSAmbientLoader = { load: load };
})();
