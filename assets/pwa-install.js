/**
 * VaultSpark PWA Install Prompt
 * Shows a dismissible install banner 3s after beforeinstallprompt fires.
 * Dismissal is remembered for 7 days via localStorage.
 */
(function () {
  var DISMISS_KEY = 'vs_pwa_dismissed';
  var deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    var dismissed = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
    if (dismissed && Date.now() - dismissed < 7 * 24 * 60 * 60 * 1000) return;
    setTimeout(showInstallBanner, 3000);
  });

  function showInstallBanner() {
    if (!deferredPrompt || document.getElementById('pwa-install-banner')) return;
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
    style.textContent = '@keyframes vs-slide-up{from{transform:translateX(-50%) translateY(12px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}';
    document.head.appendChild(style);

    banner.innerHTML =
      '<img src="/assets/vaultspark-icon.webp" width="36" height="36" style="border-radius:9px;flex-shrink:0;" alt="" loading="lazy" />'
      + '<div style="flex:1;min-width:140px;">'
      + '<div style="font-size:0.87rem;font-weight:800;color:#ffffff;margin-bottom:0.1rem;letter-spacing:-0.01em;">Install VaultSpark</div>'
      + '<div style="font-size:0.76rem;color:rgba(255,255,255,0.5);line-height:1.4;">Add to home screen for instant vault access</div>'
      + '</div>'
      + '<button id="pwa-install-btn" style="padding:0.42rem 0.95rem;background:#FFC400;color:#000;font-weight:800;font-size:0.82rem;border:none;border-radius:9px;cursor:pointer;font-family:inherit;flex-shrink:0;white-space:nowrap;">Install</button>'
      + '<button id="pwa-dismiss-btn" aria-label="Dismiss install prompt" style="padding:0.42rem 0.65rem;background:transparent;border:1px solid rgba(255,255,255,0.14);color:rgba(255,255,255,0.45);font-size:0.78rem;border-radius:9px;cursor:pointer;font-family:inherit;flex-shrink:0;">Not now</button>';

    document.body.appendChild(banner);

    document.getElementById('pwa-install-btn').addEventListener('click', function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function (result) {
        deferredPrompt = null;
        banner.remove();
        if (result.outcome !== 'accepted') {
          localStorage.setItem(DISMISS_KEY, Date.now().toString());
        }
      });
    });

    document.getElementById('pwa-dismiss-btn').addEventListener('click', function () {
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
