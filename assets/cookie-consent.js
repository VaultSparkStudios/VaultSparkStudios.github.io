(function() {
  'use strict';
  var CONSENT_KEY = 'vs_cookie_consent';

  // Already responded — do not show banner again
  if (localStorage.getItem(CONSENT_KEY)) return;

  var banner = document.createElement('div');
  banner.id = 'cookieConsent';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Cookie consent');

  // All styling lives in style.css (.vs-cookie-banner, .vs-cookie-inner, etc.)
  banner.innerHTML =
    '<div class="vs-cookie-banner">' +
      '<div class="vs-cookie-inner">' +
        '<p class="vs-cookie-text">' +
          'We use analytics cookies to understand how visitors use this site. Essential cookies required for auth and session are always active. ' +
          '<a href="/cookies/">Cookie Policy</a> · ' +
          '<a href="/privacy/">Privacy Policy</a>' +
        '</p>' +
        '<div class="vs-cookie-actions">' +
          '<button id="cookieDecline" class="vs-cookie-decline" aria-label="Decline analytics cookies">Decline Analytics</button>' +
          '<button id="cookieAccept" class="vs-cookie-accept" aria-label="Accept analytics cookies">Accept Analytics</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  document.body.appendChild(banner);

  document.getElementById('cookieAccept').addEventListener('click', function() {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    banner.remove();
    try { window.dispatchEvent(new CustomEvent('vs:consent', { detail: { analytics: true } })); } catch (e) {}
  });

  document.getElementById('cookieDecline').addEventListener('click', function() {
    localStorage.setItem(CONSENT_KEY, 'declined');
    banner.remove();
    try { window.dispatchEvent(new CustomEvent('vs:consent', { detail: { analytics: false } })); } catch (e) {}
  });
})();
