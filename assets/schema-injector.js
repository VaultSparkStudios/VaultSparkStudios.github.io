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

  function init() {
    [buildBreadcrumb(), buildVideoGame(), buildFAQ()].forEach(function (obj) {
      if (obj) inject(obj);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
