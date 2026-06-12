/**
 * VaultSpark — Schema.org JSON-LD Injector.
 *
 * Adds VideoGame, FAQPage, and BreadcrumbList JSON-LD at runtime on pages
 * declaring the appropriate signals. Runs before SEO crawlers re-render JS-heavy pages.
 *
 * Static authoring is preferred for primary surfaces (already done on /ignis/), but this
 * progressive layer covers every game/journal/lore page without per-page hand-edits.
 *
 * Signals consumed:
 *   <body data-schema-type="game" data-game-name="…" data-game-status="forge|sparked|vaulted"
 *         data-game-platforms="web,iOS,Android" data-game-genre="Sports Sim">
 *   <body data-schema-type="faq">  + .vs-faq-q / .vs-faq-a pairs OR <details>/<summary>
 *   Always: a BreadcrumbList derived from the URL path.
 */
(function () {
  'use strict';

  // TT audit note (S190): type='application/ld+json' is not an executable MIME type,
  // so script.appendChild(createTextNode) is NOT a TrustedTypes sink — no policy required.
  // Confirmed by S185 policy wave + lint-tt-policies.mjs gate.
  function inject(obj) {
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.appendChild(document.createTextNode(JSON.stringify(obj)));
    document.head.appendChild(s);
  }

  function alreadyHas(typeName) {
    var existing = document.querySelectorAll('script[type="application/ld+json"]');
    for (var i = 0; i < existing.length; i++) {
      try {
        var parsed = JSON.parse(existing[i].textContent || '{}');
        if (parsed && parsed['@type'] === typeName) return true;
      } catch (_e) {}
    }
    return false;
  }

  function origin() { return location.origin || 'https://vaultsparkstudios.com'; }

  function buildBreadcrumb() {
    if (alreadyHas('BreadcrumbList')) return null;
    var parts = location.pathname.split('/').filter(Boolean);
    var items = [{ '@type': 'ListItem', position: 1, name: 'Home', item: origin() + '/' }];
    var acc = '';
    parts.forEach(function (seg, i) {
      acc += '/' + seg;
      var name = seg
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
      items.push({ '@type': 'ListItem', position: i + 2, name: name, item: origin() + acc + '/' });
    });
    if (items.length < 2) return null;
    return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items };
  }

  function buildVideoGame() {
    var body = document.body;
    if (body.getAttribute('data-schema-type') !== 'game') return null;
    if (alreadyHas('VideoGame')) return null;
    var name = body.getAttribute('data-game-name') || (document.title || '').split(/[—|·]/)[0].trim();
    var status = body.getAttribute('data-game-status') || 'forge';
    var platforms = (body.getAttribute('data-game-platforms') || 'Web Browser').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var genre = body.getAttribute('data-game-genre') || 'Indie';
    var description = (document.querySelector('meta[name="description"]') || {}).content || '';
    var image = (document.querySelector('meta[property="og:image"]') || {}).content;
    return {
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      name: name,
      description: description,
      url: origin() + location.pathname,
      gamePlatform: platforms,
      genre: genre,
      applicationCategory: 'Game',
      publisher: { '@type': 'Organization', name: 'VaultSpark Studios', url: origin() + '/' },
      author: { '@type': 'Organization', name: 'VaultSpark Studios', url: origin() + '/' },
      operatingSystem: platforms.join(', '),
      image: image || undefined,
      additionalProperty: [{ '@type': 'PropertyValue', name: 'Vault Status', value: status.toUpperCase() }],
    };
  }

  function buildFAQ() {
    var body = document.body;
    if (body.getAttribute('data-schema-type') !== 'faq') return null;
    if (alreadyHas('FAQPage')) return null;
    var pairs = [];
    document.querySelectorAll('details').forEach(function (d) {
      var q = (d.querySelector('summary') || {}).textContent;
      var a = '';
      d.childNodes.forEach(function (n) {
        if (n.nodeType === 1 && n.tagName.toLowerCase() === 'summary') return;
        a += (n.textContent || '');
      });
      q = (q || '').trim();
      a = (a || '').trim();
      if (q && a) pairs.push({ q: q, a: a });
    });
    if (!pairs.length) {
      var qs = document.querySelectorAll('.vs-faq-q');
      qs.forEach(function (qel) {
        var ael = qel.nextElementSibling;
        if (ael && ael.classList.contains('vs-faq-a')) {
          pairs.push({ q: (qel.textContent || '').trim(), a: (ael.textContent || '').trim() });
        }
      });
    }
    if (!pairs.length) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: pairs.map(function (p) {
        return {
          '@type': 'Question',
          name: p.q,
          acceptedAnswer: { '@type': 'Answer', text: p.a }
        };
      })
    };
  }

  function buildOrganization() {
    if (alreadyHas('Organization')) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': origin() + '/#organization',
      name: 'VaultSpark Studios',
      legalName: 'VaultSpark Studios LLC',
      url: origin() + '/',
      logo: origin() + '/assets/vaultspark-logo.webp',
      sameAs: [
        'https://x.com/VaultSpark',
        'https://www.reddit.com/r/VaultSparkStudios/',
        'https://www.youtube.com/@VaultSparkStudios',
        'https://discord.com/users/vaultsparkstudios'
      ],
      foundingDate: '2024',
      founder: { '@id': origin() + '/#founder' },
      description: 'Independent game studio building worlds under the VaultSpark banner. Home of Call of Doodie, Gridiron GM, Solara, and 27 initiatives.',
      contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', url: origin() + '/contact/' }
    };
  }

  function buildFounder() {
    if (alreadyHas('Person')) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'Person',
      '@id': origin() + '/#founder',
      name: 'VaultSpark Founder',
      affiliation: { '@id': origin() + '/#organization' },
      worksFor: { '@id': origin() + '/#organization' }
    };
  }

  function buildWebSite() {
    if (location.pathname !== '/' && location.pathname !== '') return null;
    if (alreadyHas('WebSite')) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': origin() + '/#website',
      name: 'VaultSpark Studios',
      url: origin() + '/',
      publisher: { '@id': origin() + '/#organization' },
      description: 'Independent game studio — games, membership, and lore under the VaultSpark vault.',
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: origin() + '/search/?q={search_term_string}' },
        'query-input': 'required name=search_term_string'
      }
    };
  }

  function buildSoftwareApp() {
    var body = document.body;
    if (body.getAttribute('data-schema-type') !== 'app') return null;
    if (alreadyHas('SoftwareApplication')) return null;
    var name = body.getAttribute('data-app-name') || (document.title || '').split(/[—|·]/)[0].trim();
    var desc = (document.querySelector('meta[name="description"]') || {}).content || '';
    return {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: name,
      description: desc,
      url: origin() + location.pathname,
      applicationCategory: 'GameApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      author: { '@type': 'Organization', name: 'VaultSpark Studios', url: origin() + '/' }
    };
  }

  // Changelog → ItemList of Article objects, one per <article class="cl-phase">.
  // Each entry advertises datePublished + headline + bullet summary so Google
  // surfaces "Updates from VaultSpark" as a structured news feed.
  function buildChangelog() {
    if (alreadyHas('ItemList')) return null;
    var entries = document.querySelectorAll('article.cl-phase, article[data-changelog-entry]');
    if (!entries.length) return null;
    var items = [];
    entries.forEach(function (article, i) {
      var dateEl = article.querySelector('.cl-phase-date, [data-cl-date]');
      var titleEl = article.querySelector('.cl-phase-title, [data-cl-title]');
      var bullets = Array.prototype.slice.call(article.querySelectorAll('.cl-items li, [data-cl-item]'))
        .map(function (li) { return (li.textContent || '').trim(); })
        .filter(Boolean);
      if (!titleEl || !dateEl) return;
      var date = (dateEl.textContent || '').trim();
      var title = (titleEl.textContent || '').trim();
      items.push({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Article',
          headline: title,
          datePublished: date,
          author: { '@type': 'Organization', name: 'VaultSpark Studios' },
          publisher: { '@type': 'Organization', name: 'VaultSpark Studios', url: origin() + '/' },
          description: bullets.slice(0, 3).join(' · '),
          articleBody: bullets.join('\n'),
          mainEntityOfPage: origin() + location.pathname,
        },
      });
    });
    if (!items.length) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'VaultSpark Studios Changelog',
      itemListElement: items,
    };
  }

  function init() {
    [buildOrganization(), buildFounder(), buildWebSite(), buildBreadcrumb(), buildVideoGame(), buildFAQ(), buildSoftwareApp(), buildChangelog()].forEach(function (obj) {
      if (obj) inject(obj);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
