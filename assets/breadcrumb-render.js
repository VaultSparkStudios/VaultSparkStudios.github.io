/**
 * breadcrumb-render — auto-render visual breadcrumb + BreadcrumbList JSON-LD
 *
 * Strategy: build trail from window.location.pathname, drop empty segments,
 * humanize each segment, link all but the last, inject before <main> or below
 * <header>. Idempotent (won't double-render if already mounted).
 *
 * Skips the homepage (single segment) and any page that already declares its
 * own BreadcrumbList JSON-LD or has an existing .breadcrumb / .vs-breadcrumb
 * element.
 *
 * SEO: also emits a BreadcrumbList JSON-LD <script> so Google picks it up
 * everywhere — covers P9 (SEO schema) automatically across the site.
 */
(function () {
  'use strict';

  // TrustedScript policy for the BreadcrumbList JSON-LD <script> injection.
  // Uses getPolicy first so duplicate-registration never silences the policy.
  var _ttJsonLd = null;
  try {
    if (window.trustedTypes) {
      _ttJsonLd = (typeof trustedTypes.getPolicy === 'function' && trustedTypes.getPolicy('vs-breadcrumb'))
        || window.trustedTypes.createPolicy('vs-breadcrumb', { createScript: function (s) { return s; } });
    }
  } catch (_e) { _ttJsonLd = null; }

  // Pretty names for known slugs that don't humanize cleanly. Keeps the visible
  // breadcrumb trail readable without hand-authoring per-page.
  var PRETTY = {
    'vault-member': 'Vault Member',
    'vaultsparked': 'VaultSparked',
    'franchise-architect': 'Franchise Architect',
    'studio-pulse': 'Studio Pulse',
    'studio-hub': 'Studio Hub',
    'investor-portal': 'Investor Portal',
    'call-of-doodie': 'Call of Doodie',
    'gridiron-gm': 'Gridiron GM',
    'the-exodus': 'The Exodus',
    'membership-value': 'Membership Value',
    'data-deletion': 'Data Deletion',
    'open-source': 'Open Source',
    'sitemap-page': 'Sitemap',
    'ignis-health': 'IGNIS Health',
    'admin': 'Admin',
    'ignis-spend': 'IGNIS Spend',
  };

  // Slugs that should NOT appear as breadcrumb segments (private/internal).
  var HIDDEN = new Set(['admin']);

  function humanize(slug) {
    if (PRETTY[slug]) return PRETTY[slug];
    return slug
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function buildTrail(pathname) {
    var parts = pathname.replace(/\/$/, '').split('/').filter(Boolean);
    if (!parts.length) return [];
    var trail = [{ name: 'Home', href: '/' }];
    var path = '';
    for (var i = 0; i < parts.length; i++) {
      var slug = parts[i];
      path += '/' + slug;
      if (HIDDEN.has(slug)) continue;
      trail.push({
        name: humanize(slug),
        href: path + '/',
        last: i === parts.length - 1,
      });
    }
    return trail;
  }

  function alreadyMounted() {
    if (document.querySelector('.vs-breadcrumb, .breadcrumb, nav.breadcrumb, .post-breadcrumb')) return true;
    var ld = document.querySelectorAll('script[type="application/ld+json"]');
    for (var i = 0; i < ld.length; i++) {
      var t = ld[i].textContent || '';
      if (t.indexOf('BreadcrumbList') !== -1) return true;
    }
    return false;
  }

  function renderVisual(trail) {
    var nav = document.createElement('nav');
    nav.className = 'vs-breadcrumb';
    nav.setAttribute('aria-label', 'Breadcrumb');
    for (var i = 0; i < trail.length; i++) {
      var t = trail[i];
      if (i > 0) {
        var sep = document.createElement('span');
        sep.className = 'vs-breadcrumb__sep';
        sep.setAttribute('aria-hidden', 'true');
        sep.textContent = '›';
        nav.appendChild(sep);
      }
      if (t.last) {
        var cur = document.createElement('span');
        cur.className = 'vs-breadcrumb__current';
        cur.setAttribute('aria-current', 'page');
        cur.textContent = t.name;
        nav.appendChild(cur);
      } else {
        var link = document.createElement('a');
        link.href = t.href;
        link.textContent = t.name;
        nav.appendChild(link);
      }
    }

    var anchor = document.querySelector('main') || document.querySelector('.site-main') || document.body.firstElementChild;
    if (!anchor) return;
    // Insert as the first child of the anchor's parent before the anchor itself,
    // wrapped in a container that matches the site's content width.
    var container = document.createElement('div');
    container.className = 'container vs-breadcrumb-wrap';
    container.style.paddingTop = '0.5rem';
    container.appendChild(nav);
    anchor.insertBefore(container, anchor.firstChild);
  }

  function emitJsonLd(trail) {
    var origin = window.location.origin;
    var items = trail.map(function (t, i) {
      return {
        '@type': 'ListItem',
        position: i + 1,
        name: t.name,
        item: origin + t.href,
      };
    });
    var ld = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items,
    };
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    var json = JSON.stringify(ld);
    s.textContent = _ttJsonLd ? _ttJsonLd.createScript(json) : json;
    document.head.appendChild(s);
  }

  function escape(text) {
    return String(text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function run() {
    var trail = buildTrail(window.location.pathname);
    if (trail.length < 2) return; // homepage — no breadcrumb
    if (alreadyMounted()) return;
    renderVisual(trail);
    emitJsonLd(trail);
  }

  if (document.readyState !== 'loading') run();
  else document.addEventListener('DOMContentLoaded', run);
})();
