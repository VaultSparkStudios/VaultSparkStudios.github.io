/**
 * command-palette — global Cmd/Ctrl+K palette with fuzzy search + AI synthesis.
 *
 * Two layers:
 *   1. Local fuzzy match — instant, no network. Indexes pages, games, projects
 *      pulled once from /api/public-intelligence.json (5-min cache).
 *   2. AI synthesis — Cmd+Enter (or "Ask IGNIS for an answer" CTA) calls the
 *      semantic-search edge fn for a 1–3 sentence answer + source links.
 *
 * Keyboard:
 *   Cmd/Ctrl+K  — open / close
 *   ↑ ↓        — navigate results
 *   Enter      — open selected
 *   Cmd+Enter  — AI synthesize current query
 *   Esc        — close
 *
 * Mobile: full-screen sheet variant.
 *
 * Self-mounting on every page via the ambient block (propagate-nav).
 */
(function () {
  'use strict';

  var INTEL_URL = '/api/public-intelligence.json';
  var INTENT_URL = '/api/intent-map.json';
  var SEARCH_FN_URL = 'https://fjnpzjjyhnpmunfoycrp.supabase.co/functions/v1/semantic-search';
  var SUPABASE_ANON = 'sb_publishable_thM93D_GVKW5qzAiZpNl1w_AVGILCij';
  var INTEL_TTL_MS = 5 * 60 * 1000;
  var RECENT_KEY = 'vs_palette_recent_v1';
  var RECENT_MAX = 5;
  var QUERY_CACHE_KEY_PREFIX = 'vs_ignis_q_';
  var QUERY_CACHE_TTL_MS = 15 * 60 * 1000;

  function queryHash(q) {
    try { return btoa(q.toLowerCase().trim()).slice(0, 16); } catch (e) { return null; }
  }
  function readQueryCache(q) {
    var k = queryHash(q);
    if (!k) return null;
    try {
      var raw = window.localStorage.getItem(QUERY_CACHE_KEY_PREFIX + k);
      if (!raw) return null;
      var entry = JSON.parse(raw);
      return (Date.now() - entry.ts < QUERY_CACHE_TTL_MS) ? entry : null;
    } catch (e) { return null; }
  }
  function writeQueryCache(q, result) {
    var k = queryHash(q);
    if (!k) return;
    try { window.localStorage.setItem(QUERY_CACHE_KEY_PREFIX + k, JSON.stringify({ ts: Date.now(), result: result })); } catch (e) {}
  }

  function loadRecent() {
    try {
      var raw = window.localStorage.getItem(RECENT_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }
  function pushRecent(query) {
    if (!query || query.length < 3) return;
    try {
      var existing = loadRecent().filter(function (q) { return q !== query; });
      existing.unshift(query);
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(existing.slice(0, RECENT_MAX)));
    } catch {}
  }

  var STYLE = [
    '.vs-palette-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);z-index:9000;display:none;align-items:flex-start;justify-content:center;padding:8vh 1rem 1rem;animation:vs-palette-fade 140ms ease;}',
    '.vs-palette-overlay[data-open="true"]{display:flex;}',
    '@keyframes vs-palette-fade{from{opacity:0;}to{opacity:1;}}',
    '.vs-palette{width:100%;max-width:640px;background:rgba(13,16,28,0.96);border:1px solid rgba(255,255,255,0.1);border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,0.5);overflow:hidden;color:var(--text);font-family:inherit;}',
    'body.light-mode .vs-palette{background:rgba(255,253,247,0.99);border-color:rgba(20,28,52,0.12);}',
    '.vs-palette-input-wrap{padding:0.85rem 1rem;display:flex;align-items:center;gap:0.6rem;border-bottom:1px solid rgba(255,255,255,0.08);}',
    'body.light-mode .vs-palette-input-wrap{border-color:rgba(20,28,52,0.1);}',
    '.vs-palette-input{flex:1;background:transparent;border:none;outline:none;color:var(--text);font-size:1rem;font-family:inherit;min-height:32px;}',
    '.vs-palette-input::placeholder{color:var(--text-muted,#889);}',
    '.vs-palette-hint{font-size:0.7rem;color:var(--text-muted,#889);font-family:Georgia,serif;letter-spacing:0.04em;white-space:nowrap;}',
    '.vs-palette-hint kbd{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:4px;padding:0.05rem 0.35rem;font-size:0.7rem;font-family:inherit;}',
    '.vs-palette-results{max-height:50vh;overflow-y:auto;padding:0.4rem 0;}',
    '.vs-palette-section{padding:0.4rem 1rem 0.2rem;font-size:0.68rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted,#889);font-family:Georgia,serif;}',
    '.vs-palette-item{display:flex;align-items:center;gap:0.7rem;padding:0.6rem 1rem;cursor:pointer;text-decoration:none;color:var(--text);transition:background 80ms ease;border:none;background:transparent;width:100%;text-align:left;font-family:inherit;font-size:0.92rem;min-height:44px;}',
    '.vs-palette-item:hover,.vs-palette-item[aria-selected="true"]{background:rgba(212,175,55,0.1);}',
    '.vs-palette-item__kind{font-size:0.7rem;color:var(--gold,#d4af37);font-family:Georgia,serif;letter-spacing:0.05em;text-transform:uppercase;flex:0 0 auto;width:60px;}',
    '.vs-palette-item__name{flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.vs-palette-item__hint{font-size:0.7rem;color:var(--text-muted,#889);flex:0 0 auto;}',
    '.vs-palette-empty{padding:2rem 1rem;text-align:center;color:var(--text-muted,#889);font-style:italic;}',
    '.vs-palette-ai{padding:0.85rem 1rem;background:linear-gradient(135deg,rgba(212,175,55,0.08),rgba(126,201,255,0.04));border-top:1px solid rgba(212,175,55,0.18);font-family:Georgia,serif;}',
    '.vs-palette-ai__synth{font-size:0.95rem;line-height:1.55;}',
    '.vs-palette-ai__sources{margin-top:0.55rem;display:flex;flex-wrap:wrap;gap:0.4rem;}',
    '.vs-palette-ai__source{font-size:0.74rem;color:var(--text);background:rgba(212,175,55,0.1);border:1px solid rgba(212,175,55,0.3);border-radius:999px;padding:0.25rem 0.65rem;text-decoration:none;}',
    '.vs-palette-ai__source:hover{background:rgba(212,175,55,0.2);}',
    '.vs-palette-ai__loading{font-style:italic;color:var(--text-muted,#889);font-size:0.85rem;}',
    '.vs-palette-trigger{position:fixed;bottom:1rem;right:1rem;z-index:50;padding:0.55rem 0.95rem;background:rgba(13,16,28,0.92);border:1px solid rgba(255,255,255,0.12);border-radius:999px;color:var(--text);font-size:0.8rem;font-family:Georgia,serif;cursor:pointer;backdrop-filter:blur(8px);min-height:44px;display:none;align-items:center;gap:0.45rem;}',
    'body.light-mode .vs-palette-trigger{background:rgba(255,253,247,0.95);border-color:rgba(20,28,52,0.15);}',
    '@media (max-width: 720px){.vs-palette-overlay{padding:0;align-items:stretch;}.vs-palette{max-width:100%;border-radius:0;height:100vh;display:flex;flex-direction:column;}.vs-palette-results{flex:1;max-height:none;}.vs-palette-trigger{display:inline-flex;}.vs-palette-hint kbd{display:none;}}',
    '@media (prefers-reduced-motion: reduce){.vs-palette-overlay{animation:none;}}',
  ].join('\n');

  function injectStyle() {
    if (document.getElementById('vs-palette-style')) return;
    var s = document.createElement('style');
    s.id = 'vs-palette-style';
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function escape(t) {
    return String(t || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // Static page index — every public top-level surface. Game/project/changelog
  // entries get added dynamically from public-intelligence.json.
  var STATIC_INDEX = [
    { kind: 'page', name: 'Home', href: '/', tags: 'home main landing' },
    { kind: 'page', name: 'Games', href: '/games/', tags: 'games catalog play' },
    { kind: 'page', name: 'Projects', href: '/projects/', tags: 'projects tools' },
    { kind: 'page', name: 'Membership', href: '/membership/', tags: 'membership tiers join' },
    { kind: 'page', name: 'Choose Your Tier', href: '/vaultsparked/', tags: 'tiers pricing sparked eternal' },
    { kind: 'page', name: 'Vault Member Portal', href: '/vault-member/', tags: 'portal account dashboard sign in' },
    { kind: 'page', name: 'Vault Wall', href: '/community/#wall', tags: 'wall public profile standings rank' },
    { kind: 'page', name: 'Universe', href: '/universe/', tags: 'universe lore voidfall dreadspike' },
    { kind: 'page', name: 'Voidfall', href: '/universe/voidfall/', tags: 'voidfall cosmic horror saga novel' },
    { kind: 'page', name: 'DreadSpike', href: '/universe/dreadspike/', tags: 'dreadspike lore' },
    { kind: 'page', name: 'Studio Pulse', href: '/studio-pulse/', tags: 'pulse forge window heartbeat' },
    { kind: 'page', name: 'Studio Nervous System', href: '/nervous-system/', tags: 'nervous system studio os health feedback ci rum social' },
    { kind: 'page', name: 'IGNIS', href: '/ignis/', tags: 'ignis oracle ai' },
    { kind: 'action', name: 'Ask IGNIS', href: '/search/#ask-ignis', tags: 'ask ignis answer search local ai' },
    { kind: 'action', name: 'Open My Portal', href: '/vault-member/', tags: 'account portal member signed in' },
    { kind: 'action', name: 'Compare Tiers', href: '/vaultsparked/', tags: 'pricing membership tier sparked eternal' },
    { kind: 'action', name: 'Read Latest Ships', href: '/changelog/', tags: 'latest shipped changelog forge ledger' },
    { kind: 'action', name: 'Copy Press Link', href: '/press/', tags: 'press media brand kit' },
    { kind: 'page', name: 'Pathways', href: '/pathways/', tags: 'players supporters lore builders press investors routes' },
    { kind: 'page', name: 'Changelog', href: '/changelog/', tags: 'changelog updates shipped' },
    { kind: 'page', name: 'Press Kit', href: '/press/', tags: 'press media kit' },
    { kind: 'page', name: 'Roadmap', href: '/roadmap/', tags: 'roadmap pipeline next' },
    { kind: 'page', name: 'Studio', href: '/studio/', tags: 'studio about team' },
    { kind: 'page', name: 'Contact', href: '/contact/', tags: 'contact reach support' },
    { kind: 'page', name: 'Ranks', href: '/ranks/', tags: 'ranks score progression' },
    { kind: 'page', name: 'Leaderboards', href: '/leaderboards/', tags: 'leaderboard ranking' },
    { kind: 'page', name: 'Feedback Insights', href: '/changelog/#requests', tags: 'feedback insights public' },
    { kind: 'page', name: 'FAQ', href: '/faq/', tags: 'faq questions help' },
  ];

  var indexCache = { items: STATIC_INDEX.slice(), fetchedAt: 0 };

  async function ensureIndex() {
    if (indexCache.fetchedAt && (Date.now() - indexCache.fetchedAt) < INTEL_TTL_MS) return indexCache.items;
    try {
      var responses = await Promise.all([
        fetch(INTEL_URL, { cache: 'default' }),
        fetch(INTENT_URL, { cache: 'default' }).catch(function () { return null; }),
      ]);
      if (!responses[0].ok) throw new Error('intel fetch');
      var data = await responses[0].json();
      var intentMap = responses[1] && responses[1].ok ? await responses[1].json() : { intents: [] };
      var items = STATIC_INDEX.slice();
      (intentMap.intents || []).forEach(function (intent) {
        var target = intent.primary && intent.primary.url ? intent.primary.url : (intent.fallback && intent.fallback.url);
        if (!target) return;
        items.push({
          kind: 'action',
          name: intent.label,
          href: target.replace(/^https:\/\/vaultsparkstudios\.com/, '') || '/',
          tags: [intent.id].concat(intent.aliases || [], intent.audience || [], [intent.freshness && intent.freshness.state]).filter(Boolean).join(' ').toLowerCase(),
        });
      });
      (data.catalog || []).forEach(function (c) {
        var href = c.deployedUrl || (c.type === 'game' ? '/games/' + c.id + '/' : '/projects/' + c.id + '/');
        items.push({
          kind: c.type === 'game' ? 'game' : (c.type === 'tool' || c.type === 'platform' ? 'project' : 'world'),
          name: c.name,
          href: href,
          tags: [c.id, c.type, c.note, c.status].filter(Boolean).join(' ').toLowerCase(),
        });
      });
      indexCache = { items: items, fetchedAt: Date.now() };
    } catch {
      // keep static
    }
    return indexCache.items;
  }

  function fuzzyScore(query, item) {
    if (!query) return 0;
    var q = query.toLowerCase();
    var name = (item.name || '').toLowerCase();
    var tags = (item.tags || '').toLowerCase();
    if (name === q) return 100;
    if (name.indexOf(q) === 0) return 80;
    if (name.indexOf(q) !== -1) return 60;
    var qWords = q.split(/\s+/).filter(Boolean);
    var hits = 0;
    qWords.forEach(function (w) {
      if (w.length < 2) return;
      if (name.indexOf(w) !== -1) hits += 2;
      else if (tags.indexOf(w) !== -1) hits += 1;
    });
    return hits;
  }

  function search(query, items) {
    if (!query) return items.slice(0, 8);
    return items
      .map(function (i) { return { item: i, score: fuzzyScore(query, i) }; })
      .filter(function (r) { return r.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 12)
      .map(function (r) { return r.item; });
  }

  // ─── Palette UI ──────────────────────────────────────────────────────────
  var refs = null;
  var selectedIdx = 0;
  var lastResults = [];

  function build() {
    var overlay = document.createElement('div');
    overlay.className = 'vs-palette-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Site search');
    overlay.dataset.open = 'false';
    overlay.innerHTML = [
      '<div class="vs-palette" role="combobox" aria-haspopup="listbox" aria-expanded="true">',
        '<div class="vs-palette-input-wrap">',
          '<span aria-hidden="true">⌕</span>',
          '<input class="vs-palette-input" type="text" placeholder="Search games, projects, pages — or ask IGNIS…" aria-label="Search query" autocomplete="off" />',
          '<span class="vs-palette-hint"><kbd>↑↓</kbd> nav · <kbd>↵</kbd> open · <kbd>⌘↵</kbd> ask</span>',
        '</div>',
        '<div class="vs-palette-results" role="listbox" aria-label="Search results"></div>',
        '<div class="vs-palette-ai" hidden></div>',
      '</div>',
    ].join('');

    document.body.appendChild(overlay);
    refs = {
      overlay: overlay,
      input: overlay.querySelector('.vs-palette-input'),
      results: overlay.querySelector('.vs-palette-results'),
      ai: overlay.querySelector('.vs-palette-ai'),
    };

    refs.input.addEventListener('input', onInput);
    refs.input.addEventListener('keydown', onKey);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

    return refs;
  }

  function open() {
    if (!refs) refs = build();
    refs.overlay.dataset.open = 'true';
    refs.input.value = '';
    refs.input.focus();
    refs.ai.hidden = true;
    onInput();
  }

  function close() {
    if (!refs) return;
    refs.overlay.dataset.open = 'false';
  }

  async function onInput() {
    var q = refs.input.value.trim();
    if (q && !refs.input.dataset.intentSignaled) {
      refs.input.dataset.intentSignaled = 'true';
      document.dispatchEvent(new CustomEvent('vs:command-palette-intent', { detail: { kind: 'query' } }));
    }
    var items = await ensureIndex();
    lastResults = search(q, items);
    selectedIdx = 0;
    renderResults(lastResults, q);
    maybeInlineIgnis(q);
  }

  // S195 (item 5): the palette already does navigation; this makes it also ANSWER.
  // For a question-shaped query we render IGNIS's top match inline — entirely
  // client-side via VSIgnisAnswer.ask (the item-1 retrieval over the static
  // index), so it costs zero API calls (CANON-029). Cmd+Enter still triggers the
  // deeper, grandfathered paid synthesis for users who want it.
  var inlineTimer = null;
  function isQuestionShaped(q) {
    if (!q || q.length < 6) return false;
    if (/\?\s*$/.test(q)) return true;
    return /^(what|how|why|who|when|where|can|does|do|is|are|should|which|tell me)\b/i.test(q);
  }
  function maybeInlineIgnis(q) {
    if (inlineTimer) { clearTimeout(inlineTimer); inlineTimer = null; }
    var api = window.VSIgnisAnswer;
    if (!isQuestionShaped(q) || !api || typeof api.ask !== 'function') {
      // Not a question (or engine absent) → don't keep a stale inline answer up.
      if (refs && refs.ai && refs.ai.dataset.mode === 'inline') refs.ai.hidden = true;
      return;
    }
    inlineTimer = setTimeout(function () {
      api.ask(q).then(function (result) {
        // Race guard: only paint if this is still the live query.
        if (!result || !refs || refs.input.value.trim() !== q) return;
        renderInlineIgnis(result);
      }).catch(function () {});
    }, 260);
  }
  function renderInlineIgnis(result) {
    var sources = (result.sources || []).slice(0, 3).map(function (s) {
      return '<a class="vs-palette-ai__source" href="' + escape(s.url || s.href || '/') + '">' + escape(s.title || s.url || 'source') + '</a>';
    }).join('');
    refs.ai.hidden = false;
    refs.ai.dataset.mode = 'inline';
    refs.ai.innerHTML = [
      '<div class="vs-palette-ai__synth"><strong>IGNIS reads:</strong> ', escape(result.text), '</div>',
      sources ? '<div class="vs-palette-ai__sources">' + sources + '</div>' : '',
      '<div class="vs-palette-ai__loading" style="margin-top:0.45rem">Press <kbd>⌘↵</kbd> / <kbd>Ctrl+↵</kbd> for a deeper synthesis.</div>',
    ].join('');
  }

  function renderResults(results, query) {
    // Empty input → surface recent searches above the default page index.
    if (!query) {
      var recent = loadRecent();
      var built = renderResultsHtml(results);
      lastResults = built.flat;
      if (recent.length) {
        var recentHtml = '<div class="vs-palette-section">Recent searches</div>'
          + recent.map(function (q) {
              return '<button class="vs-palette-item" type="button" data-recent="' + escape(q) + '">'
                + '<span class="vs-palette-item__kind">recent</span>'
                + '<span class="vs-palette-item__name">' + escape(q) + '</span>'
                + '<span class="vs-palette-item__hint">↵ search · ⌘↵ ask</span>'
              + '</button>';
            }).join('');
        refs.results.innerHTML = recentHtml + built.html;
        bindRecentClicks();
        return;
      }
      refs.results.innerHTML = built.html;
      return;
    }
    if (!results.length) {
      refs.results.innerHTML = '<div class="vs-palette-empty">No matches. Press <kbd>⌘↵</kbd> / <kbd>Ctrl+↵</kbd> to ask IGNIS.</div>';
      lastResults = [];
      return;
    }
    var rendered = renderResultsHtml(results);
    refs.results.innerHTML = rendered.html;
    lastResults = rendered.flat;
  }

  function bindRecentClicks() {
    var btns = refs.results.querySelectorAll('[data-recent]');
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var q = b.getAttribute('data-recent');
        refs.input.value = q;
        onInput();
      });
    });
  }

  // Pure: returns HTML string and the flattened result order, no side effects.
  function renderResultsHtml(results) {
    if (!results.length) return { html: '', flat: [] };
    var grouped = { page: [], game: [], project: [], world: [] };
    results.forEach(function (r) {
      var bucket = grouped[r.kind] || grouped.page;
      bucket.push(r);
    });
    var html = [];
    var flat = [];
    var labels = { page: 'Pages', game: 'Games', project: 'Projects', world: 'Worlds' };
    Object.keys(labels).forEach(function (k) {
      var group = grouped[k];
      if (!group.length) return;
      html.push('<div class="vs-palette-section">' + labels[k] + '</div>');
      group.forEach(function (r) {
        var index = flat.length;
        var sel = (index === selectedIdx) ? 'true' : 'false';
        html.push([
          '<a class="vs-palette-item" role="option" aria-selected="', sel, '" data-idx="', index, '" href="', escape(r.href), '">',
            '<span class="vs-palette-item__kind">', escape(k), '</span>',
            '<span class="vs-palette-item__name">', escape(r.name), '</span>',
            '<span class="vs-palette-item__hint">', escape(r.href), '</span>',
          '</a>',
        ].join(''));
        flat.push(r);
      });
    });
    return { html: html.join(''), flat: flat };
  }

  function moveSelection(delta) {
    var max = lastResults.length - 1;
    if (max < 0) return;
    selectedIdx = Math.max(0, Math.min(max, selectedIdx + delta));
    var items = refs.results.querySelectorAll('[role="option"]');
    items.forEach(function (el, i) { el.setAttribute('aria-selected', i === selectedIdx ? 'true' : 'false'); });
    var sel = items[selectedIdx];
    if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest' });
  }

  function activateSelection() {
    var sel = lastResults[selectedIdx];
    if (sel && sel.href) {
      // Remember the query that led here so reopening shows it as recent.
      var q = refs.input.value.trim();
      if (q) pushRecent(q);
      window.location.href = sel.href;
    }
  }

  function renderIgnisResult(json, fromCache) {
    if (refs && refs.ai) refs.ai.dataset.mode = 'paid';
    var sources = (json.sources || []).slice(0, 3).map(function (s) {
      return '<a class="vs-palette-ai__source" href="' + escape(s.href) + '">' + escape(s.title) + '</a>';
    }).join('');
    refs.ai.innerHTML = [
      fromCache ? '<div class="vs-palette-ai__cached">↺ cached result</div>' : '',
      '<div class="vs-palette-ai__synth">', escape(json.synthesis || ''), '</div>',
      sources ? '<div class="vs-palette-ai__sources">' + sources + '</div>' : '',
    ].join('');
  }

  async function askIgnis() {
    var q = refs.input.value.trim();
    if (q.length < 3) return;
    refs.ai.hidden = false;

    var cached = readQueryCache(q);
    if (cached) {
      renderIgnisResult(cached.result, true);
      return;
    }

    refs.ai.innerHTML = '<div class="vs-palette-ai__loading">IGNIS is searching the studio knowledge…</div>';
    try {
      var res = await fetch(SEARCH_FN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON,
          Authorization: 'Bearer ' + SUPABASE_ANON,
        },
        body: JSON.stringify({ query: q }),
      });
      var json = await res.json();
      if (!res.ok) throw new Error(json.error || 'search failed');
      // Successful AI search → remember the query and cache the result.
      pushRecent(q);
      writeQueryCache(q, json);
      renderIgnisResult(json, false);
    } catch (err) {
      refs.ai.innerHTML = '<div class="vs-palette-ai__loading">IGNIS could not synthesize this query right now.</div>';
    }
  }

  function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveSelection(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveSelection(-1); }
    else if (e.key === 'Enter') {
      if (e.metaKey || e.ctrlKey) { e.preventDefault(); askIgnis(); }
      else if (lastResults[selectedIdx]) { e.preventDefault(); activateSelection(); }
    }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  }

  function onGlobalKey(e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      if (refs && refs.overlay.dataset.open === 'true') close();
      else open();
    }
  }

  function buildTrigger() {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vs-palette-trigger';
    btn.setAttribute('aria-label', 'Open search palette');
    btn.innerHTML = '⌕ <span>Search</span>';
    btn.addEventListener('click', open);
    document.body.appendChild(btn);
  }

  function init() {
    injectStyle();
    document.addEventListener('keydown', onGlobalKey);
    var loaderTrigger = document.querySelector('[data-vs-palette-loader-trigger]');
    if (loaderTrigger && loaderTrigger.parentNode) loaderTrigger.parentNode.removeChild(loaderTrigger);
    buildTrigger();
    window.VSCommandPalette = { open: open, close: close };
    document.addEventListener('vs:command-palette-open', open);
    if (window.__VSCommandPaletteOpenRequested) {
      window.__VSCommandPaletteOpenRequested = false;
      setTimeout(open, 0);
    }
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
