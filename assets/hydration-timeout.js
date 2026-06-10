(function () {
  'use strict';

  var TIMEOUT_MS = 4000;

  var FALLBACK_COPY = {
    'telemetry-matrix': {
      title: 'Journey telemetry unavailable',
      body: 'Live signals didn\'t load. Repo-truth metrics are published at',
      links: [
        { href: '/studio-pulse/', label: 'Studio Pulse' },
        { href: '/ignis/', label: 'IGNIS' }
      ]
    },
    'trust-depth': {
      title: 'Proof layer didn\'t load',
      body: 'See the public studio posture directly at',
      links: [
        { href: '/studio/', label: 'Studio' },
        { href: '/changelog/', label: 'Changelog' },
        { href: '/ignis/', label: 'IGNIS' }
      ]
    },
    'micro-feedback': {
      title: 'Feedback widget didn\'t load',
      body: 'You can still reach us at',
      links: [
        { href: '/contact/', label: 'Contact form' },
        { href: 'mailto:founder@vaultsparkstudios.com', label: 'Email the founder' }
      ]
    },
    'network-spine': {
      title: 'Ecosystem feed didn\'t load',
      body: 'Jump into the network directly at',
      links: [
        { href: '/studio-hub/', label: 'Studio Hub' },
        { href: '/studio-pulse/', label: 'Studio Pulse' },
        { href: 'https://github.com/VaultSparkStudios', label: 'GitHub' }
      ]
    },
    'related': {
      title: 'Related surfaces didn\'t load',
      body: 'Continue through the vault at',
      links: [
        { href: '/games/', label: 'Games' },
        { href: '/universe/', label: 'Universe' },
        { href: '/membership/', label: 'Membership' },
        { href: '/journal/', label: 'Journal' }
      ]
    }
  };

  function isEmptyRoot(el) {
    var kids = el.children;
    if (!kids.length) return true;
    for (var i = 0; i < kids.length; i++) {
      var tag = kids[i].tagName;
      if (tag !== 'NOSCRIPT' && tag !== 'TEMPLATE') return false;
    }
    return true;
  }

  function renderFallback(el, key) {
    var copy = FALLBACK_COPY[key];
    if (!copy) return;

    var wrap = document.createElement('div');
    wrap.className = 'hydration-fallback';
    wrap.setAttribute('role', 'status');
    wrap.setAttribute('aria-live', 'polite');
    wrap.style.cssText = 'padding:1rem 1.25rem;border:1px solid rgba(255,196,0,0.25);border-radius:8px;background:rgba(255,196,0,0.05);';

    var title = document.createElement('p');
    title.className = 'eyebrow';
    title.style.cssText = 'margin:0 0 0.4rem;';
    title.textContent = copy.title;
    wrap.appendChild(title);

    var body = document.createElement('p');
    body.style.cssText = 'margin:0;font-size:0.95rem;color:var(--muted);';
    body.textContent = copy.body + ' ';

    copy.links.forEach(function (link, idx) {
      var a = document.createElement('a');
      a.href = link.href;
      a.textContent = link.label;
      if (/^https?:/.test(link.href)) a.rel = 'noopener';
      body.appendChild(a);
      if (idx < copy.links.length - 1) {
        body.appendChild(document.createTextNode(' · '));
      }
    });
    wrap.appendChild(body);

    el.appendChild(wrap);

    if (window.gtag) {
      try {
        window.gtag('event', 'hydration_timeout', {
          surface: key,
          page: location.pathname
        });
      } catch (_) {}
    }
  }

  function sweep() {
    var roots = document.querySelectorAll('[data-js-hydrate]');
    for (var i = 0; i < roots.length; i++) {
      var el = roots[i];
      if (isEmptyRoot(el)) {
        renderFallback(el, el.getAttribute('data-js-hydrate'));
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(sweep, TIMEOUT_MS);
    });
  } else {
    setTimeout(sweep, TIMEOUT_MS);
  }
})();
