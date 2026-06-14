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
    },
    {
      // S179 ambient-split wave 2 — route-scoped widgets that self-mount on a
      // single surface. Each predicate mirrors the script's own mount guard, so
      // behavior is identical; they just no longer parse on the ~95% of pages
      // where they would bail. Also honor an explicit data-hook if a page ever
      // places one off-route (preserves the scripts' second mount path).
      src: '/assets/social-dashboard-public.js',
      when: function () {
        return (location.pathname || '/').indexOf('/social') === 0 ||
          !!document.querySelector('[data-social-dashboard-public]');
      },
      idle: true
    },
    {
      src: '/assets/security-posture.js',
      when: function () {
        return (location.pathname || '/').indexOf('/security') === 0 ||
          !!document.querySelector('[data-security-posture]');
      },
      idle: true
    },
    {
      src: '/assets/feedback-decision-board.js',
      when: function () {
        return (location.pathname || '/').indexOf('/feedback') === 0 ||
          !!document.querySelector('[data-feedback-decision-board]');
      },
      idle: true
    },
    {
      src: '/assets/rank-economy-simulator.js',
      when: function () {
        var p = location.pathname || '/';
        return p.indexOf('/membership') === 0 || p.indexOf('/ranks') === 0 ||
          !!document.querySelector('[data-rank-economy]');
      },
      idle: true
    },
    {
      // S180 ambient-split wave 3 — the pathfinder only runs on these exact
      // information-finding routes, so keep it off every other cold page.
      src: '/assets/intent-flight-director.js',
      when: function () {
        var p = location.pathname || '/';
        return ['/', '/membership/', '/games/', '/universe/', '/studio-pulse/', '/oracle/'].indexOf(p) !== -1;
      },
      idle: true
    },
    {
      // S185 ambient-split wave 4 — 4 scripts extracted from feature bundle.
      // ignis-lens: Ask IGNIS floating pill — game/project/universe pages only.
      src: '/assets/ignis-lens.js',
      when: function () {
        var p = location.pathname || '/';
        if (document.querySelector('[data-vault-oracle]')) return false;
        return /^\/(games|projects|universe|ignis|search)/.test(p);
      },
      idle: true
    },
    {
      // S194: share-game — one-tap Web Share / clipboard control on game heroes.
      // Game pages are the studio's prime viral surface; pairs with the OG-raster
      // fix so each share carries a real card. Self-mounts on a .game-hero.
      src: '/assets/share-game.js',
      when: function () {
        var p = location.pathname || '/';
        return /^\/games\//.test(p) || p.indexOf('/vaultspark-football-gm') === 0 ||
          !!document.querySelector('.game-hero, [data-share-game]');
      },
      idle: true
    },
    {
      // rank-orb: member rank progress orb in nav — non-portal, non-admin pages.
      src: '/assets/rank-orb.js',
      when: function () {
        var p = location.pathname || '/';
        return !/^\/(vault-member|investor-portal|admin|api)\//.test(p);
      },
      idle: true
    },
    {
      // rate-page: emoji feedback widget — content pages, skip portals/admin/api.
      src: '/assets/rate-page.js',
      when: function () {
        var p = location.pathname || '/';
        return !/^\/(vault-member|investor-portal|admin|api)\//.test(p);
      },
      idle: true
    },
    {
      // vault-rank-bar: 2px rank progress bar at viewport bottom — signed-in only.
      src: '/assets/vault-rank-bar.js',
      when: function () {
        try {
          return !!(document.body && document.body.hasAttribute('data-vs-signed-in')) ||
            !!(window.sessionStorage && sessionStorage.getItem('vs_session_ready'));
        } catch (_) { return false; }
      },
      idle: true
    },
    {
      // Vault Kinesis — SVG ship-pulse waveform on Studio Pulse page.
      src: '/assets/vault-kinesis.js',
      when: function () {
        var p = location.pathname || '/';
        return p.indexOf('/studio-pulse') === 0;
      },
      idle: true
    },
    {
      // Static Ask IGNIS retrieval mounts on explicit hooks plus /search|/oracle.
      src: '/assets/ignis-answer-engine.js',
      when: function () {
        var p = location.pathname || '/';
        return !!document.querySelector('[data-ask-ignis]') ||
          p.indexOf('/search') === 0 || p.indexOf('/oracle') === 0;
      },
      idle: true
    },
    {
      // S186: proof-to-conversion bridge — earned trust microline at the signup
      // decision point. Mounts only where the hook exists (the vault-member
      // register card); honest-dark when no proof is fresh.
      src: '/assets/proof-conversion-line.js',
      when: function () {
        return !!document.querySelector('[data-vs-proof-cta]');
      },
      idle: true
    },
    {
      // S187: honest traction scoreboard — live, dated, externally-meaningful
      // counts (live / in-forge / sealed / sessions-in-the-open) from the
      // deployed public-intelligence feed. Mounts only on its hook; honest-dark
      // below a breadth floor so it never fabricates momentum.
      src: '/assets/honest-traction-scoreboard.js',
      when: function () {
        return !!document.querySelector('[data-vs-traction]');
      },
      idle: true
    },
    {
      // S187: cross-game "play next" — routes attention across the catalog so a
      // game page (live or forge) never dead-ends. Game routes only; honest-dark
      // when no playable recommendation exists.
      src: '/assets/cross-game-play-next.js',
      when: function () {
        var p = location.pathname || '/';
        if (/^\/games\/[^/]+\//.test(p)) return true;
        // live games also live at the site root (/call-of-doodie/, /vaultspark-football-gm/)
        return /^\/(call-of-doodie|vaultspark-football-gm|gridiron-gm)\//.test(p) ||
          !!document.querySelector('[data-play-next]');
      },
      idle: true
    },
    {
      // S195: Studio Now — live presence + last-ship + weekly cadence strip.
      // Homepage hero region only (its hook lives there); honest-dark otherwise.
      src: '/assets/studio-now.js',
      when: function () {
        return !!document.querySelector('[data-studio-now]');
      },
      idle: true
    },
    {
      // S195: you-asked → we-shipped — the public closed-feedback-loop panel.
      // Mounts on the changelog hook; honest-dark when no themed receipt carries
      // a feedback signal.
      src: '/assets/you-asked-shipped.js',
      when: function () {
        return !!document.querySelector('[data-you-asked-shipped]');
      },
      idle: true
    },
    {
      // S187: footer dispatch — activates the dead VaultKit.wireForm('footer-email-form')
      // wiring through the EXISTING ConvertKit/Kit ESP (no new vendor). Mounts only
      // where the footer form exists; honest-dark + honest-fail (no faked success).
      src: '/assets/footer-dispatch.js',
      when: function () {
        return !!document.getElementById('footer-email-form');
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
