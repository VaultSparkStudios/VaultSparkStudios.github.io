(function() {
  'use strict';
  var CONSENT_KEY = 'vs_cookie_consent';

  // Already responded — do not show banner again
  if (localStorage.getItem(CONSENT_KEY)) return;

  var banner = document.createElement('div');
  banner.id = 'cookieConsent';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Cookie consent');
  banner.innerHTML =
    '<div style="position:fixed;bottom:0;left:0;right:0;z-index:9000;padding:1rem 1.25rem;background:rgba(2,4,8,0.97);border-top:1px solid rgba(255,255,255,0.1);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);">' +
      '<div style="max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:1.5rem;flex-wrap:wrap;">' +
        '<p style="margin:0;font-size:0.85rem;color:#b5bfd8;line-height:1.55;flex:1;min-width:200px;">' +
          'We use analytics cookies to understand how visitors use this site. Essential cookies required for auth and session are always active. ' +
          '<a href="/cookies/" style="color:rgba(31,162,255,0.8);text-decoration:underline;">Cookie Policy</a> · ' +
          '<a href="/privacy/" style="color:rgba(31,162,255,0.6);text-decoration:underline;">Privacy Policy</a>' +
        '</p>' +
        '<div style="display:flex;gap:0.75rem;flex-shrink:0;">' +
          '<button id="cookieDecline" style="background:transparent;border:1px solid rgba(255,255,255,0.15);color:#8a93b8;padding:0.5rem 1rem;border-radius:8px;font-size:0.82rem;font-weight:600;cursor:pointer;font-family:inherit;" aria-label="Decline analytics cookies">Decline Analytics</button>' +
          '<button id="cookieAccept" style="background:#1FA2FF;border:none;color:#000;padding:0.5rem 1.25rem;border-radius:8px;font-size:0.82rem;font-weight:600;cursor:pointer;font-family:inherit;" aria-label="Accept analytics cookies">Accept Analytics</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  document.body.appendChild(banner);

  document.getElementById('cookieAccept').addEventListener('click', function() {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    banner.remove();
    // Dispatch event so any deferred analytics scripts can initialize
    try { window.dispatchEvent(new CustomEvent('vs:consent', { detail: { analytics: true } })); } catch (e) {}
  });

  document.getElementById('cookieDecline').addEventListener('click', function() {
    localStorage.setItem(CONSENT_KEY, 'declined');
    banner.remove();
    try { window.dispatchEvent(new CustomEvent('vs:consent', { detail: { analytics: false } })); } catch (e) {}
  });
})();
