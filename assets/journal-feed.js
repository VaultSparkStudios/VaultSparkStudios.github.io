(function () {
  const root = document.querySelector('[data-journal-feed]');
  if (!root) return;

  const src = root.dataset.feedSrc || '/data/journal-feed.json';
  const reactions = ['fire', 'love', 'gaming', 'sparked'];
  const reactionGlyphs = {
    fire: '\uD83D\uDD25',
    love: '\u2764\uFE0F',
    gaming: '\uD83C\uDFAE',
    sparked: '\u26A1'
  };

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char];
    });
  }

  function renderPost(post) {
    const tags = Array.isArray(post.tags) ? post.tags : [];
    const tagText = tags.join(',');
    const tagPills = tags.map(function (tag) {
      return '<span class="entry-tag">' + escapeHtml(tag) + '</span>';
    }).join('');
    const shareText = encodeURIComponent((post.title || 'Signal Log') + ' - VaultSpark Studios');
    const shareUrl = 'https://twitter.com/intent/tweet?url=https://vaultsparkstudios.com' +
      encodeURIComponent(post.url || '/journal/') + '&text=' + shareText;
    const reactionButtons = reactions.map(function (name) {
      return '<button type="button" class="reaction-btn" data-emoji="' + name + '" onclick="jrnReact(this)"><span class="reaction-emoji">' +
        reactionGlyphs[name] + '</span><span class="reaction-count">0</span></button>';
    }).join('');

    return '<article class="entry" id="' + escapeHtml(post.slug) + '" data-tags="' + escapeHtml(tagText) + '">' +
      '<div class="entry-meta">' +
      '<span class="entry-date">' + escapeHtml(post.date) + '</span>' +
      '<span class="entry-readtime">· ' + escapeHtml(post.readTime) + '</span>' +
      tagPills +
      '</div>' +
      '<h2><a class="entry-link" href="' + escapeHtml(post.url) + '">' + escapeHtml(post.title) + '</a></h2>' +
      '<div class="entry-body"><p>' + escapeHtml(post.excerpt) + '</p></div>' +
      '<div class="share-row">' +
      '<span class="share-label">Share:</span>' +
      '<a class="share-chip" href="' + shareUrl + '" target="_blank" rel="noopener">X Share</a>' +
      '<button type="button" class="share-chip" data-copy-url="https://vaultsparkstudios.com' + escapeHtml(post.url) + '" onclick="copyJournalLink(this)">Copy link</button>' +
      '</div>' +
      '<div class="reaction-row" id="reactions-' + escapeHtml(post.slug) + '" data-slug="' + escapeHtml(post.slug) + '">' +
      reactionButtons +
      '</div>' +
      '</article>';
  }

  fetch(src, { headers: { Accept: 'application/json' } })
    .then(function (response) {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    })
    .then(function (feed) {
      const posts = Array.isArray(feed.posts) ? feed.posts : [];
      if (!posts.length) throw new Error('empty-feed');
      root.innerHTML = posts.map(renderPost).join('');
      if (typeof window.loadJournalReactions === 'function') {
        window.loadJournalReactions();
      }
    })
    .catch(function () {
      root.innerHTML = '<article class="entry"><div class="entry-body"><p>More dispatches are available in the Signal Log archive links.</p></div></article>';
    });
})();
