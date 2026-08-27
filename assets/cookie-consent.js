(function() {
  'use strict';
  var CONSENT_KEY = 'vs_cookie_consent';
  var ATTENTION_KEY = 'vs_attention_surface_v1';

  // Already responded — do not show banner again
  if (localStorage.getItem(CONSENT_KEY)) return;

  var banner = document.createElement('div');
  banner.id = 'cookieConsent';
  banner.className = 'vs-cookie-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Cookie consent');

  // All styling lives in style.css (.vs-cookie-banner, .vs-cookie-inner, etc.)
  // S172: built with DOM API instead of innerHTML — this was the highest-volume
  // Trusted Types sink on the site (fires on every first visit; caught by the
  // require-trusted-types-for report-only soak at cookie-consent.js:14).
  function el(tag, props, children) {
    var node = document.createElement(tag);
    Object.keys(props || {}).forEach(function(k) {
      if (k === 'className') node.className = props[k];
      else if (k === 'text') node.textContent = props[k];
      else node.setAttribute(k, props[k]);
    });
    (children || []).forEach(function(child) { node.appendChild(child); });
    return node;
  }

  var text = el('p', { className: 'vs-cookie-text' }, [
    document.createTextNode('We use analytics cookies to understand how visitors use this site. Essential cookies required for auth and session are always active. '),
    el('a', { href: '/cookies/', text: 'Cookie Policy' }),
    document.createTextNode(' · '),
    el('a', { href: '/privacy/', text: 'Privacy Policy' })
  ]);
  var actions = el('div', { className: 'vs-cookie-actions' }, [
    el('button', { id: 'cookieDecline', className: 'vs-cookie-decline', 'aria-label': 'Decline analytics cookies', text: 'Decline Analytics' }),
    el('button', { id: 'cookieAccept', className: 'vs-cookie-accept', 'aria-label': 'Accept analytics cookies', text: 'Accept Analytics' })
  ]);
  // The fixed surface and the animated consent node must be the same element.
  // A transformed zero-height wrapper makes a fixed child position against the
  // document on mobile, leaving the consent controls below the viewport.
  banner.appendChild(el('div', { className: 'vs-cookie-inner' }, [text, actions]));

  document.body.appendChild(banner);
  // Consent is the only automatic surface a first-time visitor should see.
  // Keep the claim for this tab's full session so install, tour, upsell, and
  // exit prompts defer until a later visit instead of replacing it immediately.
  try { sessionStorage.setItem(ATTENTION_KEY, 'cookie-consent'); } catch (_) {}

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
