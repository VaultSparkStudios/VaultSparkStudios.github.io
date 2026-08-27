/**
 * VaultSpark PWA Install Prompt
 * Shows a dismissible install banner only for an engaged returning visitor.
 * A shown or dismissed prompt is remembered for 30 days via localStorage.
 */
(function () {
  var DISMISS_KEY = 'vs_pwa_dismissed';
  var PROMPTED_KEY = 'vs_pwa_prompted_at';
  var ATTENTION_KEY = 'vs_attention_surface_v1';
  var CONSENT_KEY = 'vs_cookie_consent';
  var COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
  var AUTO_DELAY_MS = 10000;
  var deferredPrompt = null;

  function visible(selector) {
    var el = document.querySelector(selector);
    if (!el) return false;
    var style = window.getComputedStyle ? window.getComputedStyle(el) : null;
    return !el.hidden && (!style || (style.display !== 'none' && style.visibility !== 'hidden'));
  }

  function claimAttention(name) {
    try {
      var current = sessionStorage.getItem(ATTENTION_KEY);
      if (current) return current === name;
      if (['#cookieConsent', '.vs-exit-panel', '.vs-vd', '.vs-journey'].some(visible)) return false;
      sessionStorage.setItem(ATTENTION_KEY, name);
      return true;
    } catch (_) {
      return !['#cookieConsent', '.vs-exit-panel', '.vs-vd', '.vs-journey'].some(visible);
    }
  }

  function isAutoEligible() {
    try {
      if (!localStorage.getItem(CONSENT_KEY)) return false;
      if (parseInt(localStorage.getItem('vs_visit_count') || '0', 10) < 3) return false;
      var lastPrompted = parseInt(localStorage.getItem(PROMPTED_KEY) || localStorage.getItem(DISMISS_KEY) || '0', 10);
      if (lastPrompted && Date.now() - lastPrompted < COOLDOWN_MS) return false;
      return true;
    } catch (_) { return false; }
  }

  function emitUx(event) {
    try {
      var body = JSON.stringify({ route: location.pathname, ux: event });
      if (navigator.sendBeacon) navigator.sendBeacon('/v/rum', new Blob([body], { type: 'application/json' }));
    } catch (_) {}
  }

  // Detect already-installed state on page load (standalone display mode).
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    emitUx('pwa:already_installed');
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    if (!isAutoEligible()) return;
    setTimeout(showInstallBanner, AUTO_DELAY_MS);
  });

  function showInstallBanner() {
    if (!deferredPrompt || document.getElementById('pwa-install-banner') || !isAutoEligible()) return;
    if (!claimAttention('pwa-install')) return;
    localStorage.setItem(PROMPTED_KEY, Date.now().toString());
    var banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Install VaultSpark app');
    banner.style.cssText = [
      'position:fixed', 'bottom:1.5rem', 'left:50%', 'transform:translateX(-50%)',
      'z-index:9100', 'display:flex', 'align-items:center', 'gap:0.75rem',
      'padding:0.75rem 1rem 0.75rem 0.85rem',
      'background:rgba(13,17,28,0.98)',
      'border:1px solid rgba(255,196,0,0.3)',
      'border-radius:16px',
      'box-shadow:0 8px 32px rgba(0,0,0,0.6)',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      'max-width:calc(100vw - 2rem)',
      'flex-wrap:wrap',
      'animation:vs-slide-up 0.3s ease',
    ].join(';');

    var style = document.createElement('style');
    // Transform-only entrance (no opacity fade). An opacity transition on the
    // banner composites its gold Install button at partial alpha mid-animation,
    // which Lighthouse/axe can sample as a sub-4.5:1 color-contrast failure
    // (effective bg ~#795e05 instead of #FFC400). Sliding without fading keeps the
    // button at full opacity — real 11:1 contrast — for the entire animation.
    style.textContent = '@keyframes vs-slide-up{from{transform:translateX(-50%) translateY(12px)}to{transform:translateX(-50%) translateY(0)}}';
    document.head.appendChild(style);

    banner.innerHTML =
      '<img src="/assets/vaultspark-icon.webp" width="36" height="36" style="border-radius:9px;flex-shrink:0;" alt="" loading="lazy" />'
      + '<div style="flex:1;min-width:140px;">'
      + '<div style="font-size:0.87rem;font-weight:800;color:#ffffff;margin-bottom:0.1rem;letter-spacing:-0.01em;">Install VaultSpark</div>'
      + '<div style="font-size:0.76rem;color:rgba(255,255,255,0.5);line-height:1.4;">Add to home screen for instant vault access</div>'
      + '</div>'
      + '<button id="pwa-install-btn" style="padding:0.42rem 0.95rem;background:#FFC400;color:#000;font-weight:800;font-size:0.82rem;border:none;border-radius:9px;cursor:pointer;font-family:inherit;flex-shrink:0;white-space:nowrap;">Install</button>'
      + '<button id="pwa-dismiss-btn" aria-label="Not now — dismiss install prompt" style="padding:0.42rem 0.65rem;background:transparent;border:1px solid rgba(255,255,255,0.14);color:rgba(255,255,255,0.45);font-size:0.78rem;border-radius:9px;cursor:pointer;font-family:inherit;flex-shrink:0;">Not now</button>';

    document.body.appendChild(banner);
    emitUx('pwa:banner_shown');

    document.getElementById('pwa-install-btn').addEventListener('click', function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function (result) {
        deferredPrompt = null;
        banner.remove();
        if (result.outcome === 'accepted') {
          emitUx('pwa:install_accepted');
        } else {
          emitUx('pwa:install_dismissed');
          localStorage.setItem(DISMISS_KEY, Date.now().toString());
        }
      });
    });

    document.getElementById('pwa-dismiss-btn').addEventListener('click', function () {
      emitUx('pwa:install_dismissed');
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
      banner.remove();
    });
  }

  window.addEventListener('appinstalled', function () {
    var banner = document.getElementById('pwa-install-banner');
    if (banner) banner.remove();
    deferredPrompt = null;
    window.dispatchEvent(new CustomEvent('vsPwaInstalled'));
  });

  // Public API for settings page and other callers
  window.vsPwaInstall = function () {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function (result) {
      deferredPrompt = null;
      if (result.outcome !== 'accepted') {
        localStorage.setItem(DISMISS_KEY, Date.now().toString());
      }
    });
    return true;
  };

  window.vsPwaState = function () {
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return 'installed';
    var isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    if (isIos) return 'ios';
    if (deferredPrompt) return 'ready';
    return 'unavailable';
  };
})();
