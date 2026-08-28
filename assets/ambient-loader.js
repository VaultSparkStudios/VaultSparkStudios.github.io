// ambient-loader.js — conditional loader for guarded ambient modules.
(function () {
  const loaded = new Set();
  const attentionSurfaces = new Set(['exit-intent', 'visit-depth', 'journey-tour', 'decision-feedback', 'returning-digest']);
  function attentionDepth() {
    try {
      const visits = parseInt(localStorage.getItem('vs_visit_count') || '0', 10);
      if (!Number.isFinite(visits) || visits < 1) return 'unknown';
      return visits === 1 ? 'first' : visits <= 4 ? 'returning' : 'established';
    } catch (_) { return 'unknown'; }
  }
  function sendAttentionClaim(name) {
    if (!attentionSurfaces.has(name)) return;
    try {
      const body = JSON.stringify({
        route: location.pathname || '/',
        ux: 'attention:claimed',
        label: name + '|' + attentionDepth()
      });
      if (navigator.sendBeacon) navigator.sendBeacon('/v/rum', new Blob([body], { type: 'application/json' }));
    } catch (_) {}
  }
  // Automatic overlays share one attention budget per browser tab. This keeps
  // independently loaded engagement modules from stacking or taking turns
  // nagging a visitor during the same session.
  if (!window.VSAttention) {
    const attentionKey = 'vs_attention_surface_v1';
    const selectors = ['#cookieConsent', '#pwa-install-banner', '.vs-exit-panel', '.vs-vd', '.vs-journey'];
    const visible = function (selector) {
      const el = document.querySelector(selector);
      if (!el) return false;
      const style = window.getComputedStyle ? window.getComputedStyle(el) : null;
      return !el.hidden && (!style || (style.display !== 'none' && style.visibility !== 'hidden'));
    };
    window.VSAttention = {
      current: function () {
        try { return sessionStorage.getItem(attentionKey) || ''; } catch (_) { return ''; }
      },
      claim: function (name) {
        try {
          const current = sessionStorage.getItem(attentionKey);
          if (current) return current === name;
          if (selectors.some(visible)) return false;
          sessionStorage.setItem(attentionKey, name);
          sendAttentionClaim(name);
          document.dispatchEvent(new CustomEvent('vs:attention-claimed', { detail: { name: name } }));
          return true;
        } catch (_) {
          return !selectors.some(visible);
        }
      }
    };
  }
  const modules = [
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
      // S210 #2: returning-visitor signal strip — voice-driven changelog headlines
      // "What sparked since your last visit" on the homepage for ≥2 visits.
      // Additive to the digest (count vs narrative); homepage-only; idle-loaded.
      src: '/assets/returning-signal-strip.js',
      when: function () {
        try {
          var p = (window.location.pathname || '/').replace(/\/?$/, '/');
          return p === '/' && parseInt(localStorage.getItem('vs_visit_count') || '0', 10) >= 2;
        } catch (_) { return false; }
      },
      idle: true
    },
    {
      // S211 Wave 6: game discovery quiz — 3-question match flow on /games/.
      // Routes to Call of Doodie, Franchise Architect, or Forge previews; also triggers
      // the catalog genre/status filter via data-filter buttons.
      src: '/assets/game-discovery-quiz.js',
      when: function () {
        return !!document.querySelector('[data-game-discovery-quiz]');
      },
      idle: true
    },
    {
      // S211 Wave 1: web-push subscribe UI — wires the #toggle-push in the vault-member
      // portal and any [data-push-subscribe] containers (e.g. /changelog/).
      // S229: also loads on /games/ to listen for vs:quiz-complete and show a
      // post-quiz contextual subscribe prompt.
      // PushManager guard prevents loading on unsupported browsers (Safari <16.4, etc.).
      src: '/assets/push-subscribe.js',
      when: function () {
        if (!('PushManager' in window) || !('serviceWorker' in navigator)) return false;
        var p = (window.location.pathname || '/').replace(/\/?$/, '/');
        return p === '/vault-member/' || p === '/games/' || !!document.querySelector('[data-push-subscribe]');
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
      // S206 #3: vault-momentum social proof strip — /membership/ only.
      // Fetches api/vault-momentum.json; honest-dark when unavailable.
      src: '/assets/membership-social-proof.js',
      when: function () {
        return (location.pathname || '/').indexOf('/membership') === 0;
      },
      idle: true
    },
    {
      // S206 #1: adaptive oracle intro — /ignis/ only. Personalizes the
      // Ask IGNIS heading + context p for visitors with query history.
      src: '/assets/ignis-personalize-intro.js',
      when: function () {
        return (location.pathname || '/').indexOf('/ignis') === 0;
      },
      idle: true
    },
    {
      // S206 #8: adaptive pricing reveal — /membership/ only. Highlights
      // the most relevant tier based on referrer + localStorage signals.
      src: '/assets/adaptive-pricing.js',
      when: function () {
        return (location.pathname || '/').indexOf('/membership') === 0;
      },
      idle: true
    },
    {
      // S206 #4: membership tier scroll-reveal — /membership/ only. Activates
      // staggered IntersectionObserver animation on .tier-reveal cards.
      src: '/assets/membership-tier-reveal.js',
      when: function () {
        return (location.pathname || '/').indexOf('/membership') === 0;
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
        return /^\/games\//.test(p) || p.indexOf('/franchise-architect') === 0 ||
          !!document.querySelector('.game-hero, [data-share-game]');
      },
      idle: true
    },
    {
      // S216: game-welcome-back — returning-visitor gold badge on individual game pages.
      // Shows "Welcome back · Nth visit" when the visitor's last-game matches this page.
      // Requires ≥2 visits to this game to activate (count stored in vs_game_visits_<slug>).
      src: '/assets/game-welcome-back.js',
      when: function () {
        try {
          var p = location.pathname || '/';
          if (!/^\/games\/[^/]+\//.test(p)) return false;
          return parseInt(localStorage.getItem('vs_visit_count') || '0', 10) >= 1;
        } catch (_) { return false; }
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
        // live games also live at the site root (/call-of-doodie/, /franchise-architect/)
        return /^\/(call-of-doodie|franchise-architect|gridiron-gm)\//.test(p) ||
          !!document.querySelector('[data-play-next]');
      },
      idle: true
    },
    {
      // S195: forge immersion — post-readiness ember canvas behind the homepage hero.
      // Capability-gated here too (so an incapable device never even fetches it);
      // the script repeats the gate + waits past readiness before doing work.
      src: '/assets/forge-immersion.js',
      when: function () {
        var p = location.pathname || '/';
        if (p !== '/' && !/\/index\.html$/i.test(p)) return false;
        try {
          if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
          var c = navigator.connection || navigator.webkitConnection;
          if (c && c.saveData) return false;
          if (typeof navigator.deviceMemory === 'number' && navigator.deviceMemory < 4) return false;
        } catch (_e) {}
        return true;
      },
      idle: true
    },
    {
      // S195: First Climb quest — client-side rank progression on /ranks/.
      src: '/assets/rank-quest.js',
      when: function () {
        return !!document.querySelector('[data-rank-quest]');
      },
      idle: true
    },
    {
      // S195: theme identity — earned-look cue + saved-confirmation. Any page
      // with the theme picker; purely cosmetic, no gating.
      src: '/assets/theme-identity.js',
      when: function () {
        return !!document.querySelector('.theme-picker');
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
    },
    {
      // S198: daily visit streak — 'Day N streak' badge above the join CTA on
      // SPARKED game pages. Runs only where game_join_from_play CTA exists.
      src: '/assets/visit-streak.js',
      when: function () {
        return !!document.querySelector('[data-track-event="game_join_from_play"]');
      },
      idle: true
    },
    {
      // S205 #15: constellation challenges — hidden page-sequence badges.
      // Tracks visited paths in localStorage; unlocks on matching a 3-page
      // constellation sequence. Data from /data/constellations.json (no rebuild
      // needed to add new constellations). Runs sitewide, idle-priority.
      src: '/assets/constellation-tracker.js',
      when: function () { return true; },
      idle: true
    },
    {
      // S306: journey conductor — game→Vault bridge, route micro-tour, and
      // sampled decision feedback. The script itself enforces second-page or
      // explicit-intent eligibility; it never interrupts immediate arrival.
      src: '/assets/journey-conductor.js',
      when: function () {
        return !document.documentElement.hasAttribute('data-no-journey');
      },
      idle: true
    },
    {
      // S229: INP attribution — beacons inp:slow_interaction for interactions >150ms.
      // Field INP is 208ms (/) and 224ms (/games/) — over the 200ms budget. This
      // script identifies WHICH element + event type causes the miss so we can target
      // the fix. Only loads when PerformanceObserver 'event' type is supported.
      src: '/assets/inp-telemetry.js',
      when: function () {
        return typeof PerformanceObserver !== 'undefined' &&
          typeof PerformanceObserver.supportedEntryTypes !== 'undefined' &&
          PerformanceObserver.supportedEntryTypes.indexOf('event') !== -1;
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

  function runIdleQueue(queue) {
    if (!queue.length) return;
    function next() {
      const moduleDef = queue.shift();
      if (!moduleDef) return;
      maybeLoad(moduleDef);
      if (queue.length) {
        if ('requestIdleCallback' in window) requestIdleCallback(next, { timeout: 1500 });
        else setTimeout(next, 120);
      }
    }
    if ('requestIdleCallback' in window) requestIdleCallback(next, { timeout: 1500 });
    else setTimeout(next, 120);
  }

  function run() {
    const idleQueue = [];
    modules.forEach(function (moduleDef) {
      if (moduleDef.idle) idleQueue.push(moduleDef);
      else maybeLoad(moduleDef);
    });

    // One requestIdleCallback per module at DOMContentLoaded looked polite but
    // launched the whole enhancement fleet together in the readiness window.
    // Start a serialized queue after genuine engagement, with a quiet-visit
    // ceiling so functionality still arrives without interaction.
    let scheduled = false;
    function scheduleIdle() {
      if (scheduled) return;
      scheduled = true;
      setTimeout(function () { runIdleQueue(idleQueue.slice()); }, 1200);
    }
    ['pointerdown', 'keydown', 'scroll'].forEach(function (type) {
      window.addEventListener(type, scheduleIdle, { once: true, passive: type !== 'keydown' });
    });
    setTimeout(scheduleIdle, 12000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }

  // S212: track last-visited game page for quiz personalization.
  // S216: extended to cover all SPARKED game slugs (was cod/fgm/forge only).
  // Writes vs_last_game on any game-family page; game-discovery-quiz + IGNIS
  // starters + game-welcome-back.js all read this for personalization.
  (function () {
    try {
      var p = location.pathname || '/';
      var key = null;
      if (/\/(games\/)?call-of-doodie\//.test(p)) key = 'cod';
      else if (/\/(games\/)?(franchise-architect|football-gm|gridiron-gm)\//.test(p)) key = 'fgm';
      else if (/\/(games\/)?mindframe\//.test(p)) key = 'mindframe';
      else if (/\/(games\/)?solara\//.test(p)) key = 'solara';
      else if (/\/(games\/)?vaultfront\//.test(p)) key = 'vaultfront';
      else if (/\/(games\/)?the-exodus\//.test(p)) key = 'the-exodus';
      else if (/^\/games\/[^/]+\//.test(p)) key = 'forge';
      if (key) localStorage.setItem('vs_last_game', key);
    } catch (_) {}
  })();

  window.VSAmbientLoader = { load: load };
})();
