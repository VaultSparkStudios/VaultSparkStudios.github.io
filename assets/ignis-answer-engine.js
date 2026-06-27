/* ignis-answer-engine.js — static Ask IGNIS retrieval with citations. */
(function () {
  'use strict';

  // TT-safe HTML: named policy for this module's innerHTML sinks.
  var _ttPolicy = null;
  function vsHtml(s) {
    try {
      if (window.trustedTypes && window.trustedTypes.createPolicy) {
        _ttPolicy = _ttPolicy || window.trustedTypes.createPolicy('vs-ignis-answer', { createHTML: function (h) { return h; } });
        return _ttPolicy.createHTML(s);
      }
    } catch (_e) {}
    return s;
  }

  var INDEX_URL = '/data/ignis-search-index.json';
  var indexPromise = null;
  var _indexDocCount = 0; // S210 #4: cached doc count for loading animation

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // S186: measure the Oracle funnel. Mirrors the nav-sheet telemetry transport
  // exactly — a privacy-minimized, fire-and-forget /v/rum beacon carrying a
  // single allowlisted `ux` event name (no IDs, no free text). The Worker
  // allowlists these names in RUM_UX_EVENTS; unknown names are dropped server-side.
  function emitUx(event) {
    try {
      var body = JSON.stringify({ route: location.pathname || '/', ux: event });
      if (navigator.sendBeacon) navigator.sendBeacon('/v/rum', new Blob([body], { type: 'application/json' }));
    } catch (_e) {}
  }

  function tokens(q) {
    return String(q || '').toLowerCase().split(/[^a-z0-9]+/).filter(function (t) { return t.length > 2; });
  }

  // S192: bound a cluster key to the Worker prefixAllowlist charset ([a-z0-9-], <=24)
  // so a per-cluster feedback name (oracle-answer:helpful:<id>) is admitted at the
  // edge instead of silently dropped. Returns '' when nothing usable remains.
  function clusterSlug(key) {
    return String(key || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
  }

  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch(INDEX_URL, { cache: 'default' }).then(function (r) { return r.json(); }).then(function (idx) { if (idx && idx.documents) _indexDocCount = idx.documents.length; return idx; }).catch(function () { return { documents: [], _offline: true }; }); // S210 #4+#5
    }
    return indexPromise;
  }

  // Voice firewall (defense-in-depth): the index is sanitized at build time
  // (build-ignis-search-index.mjs + --self-test gate), but scrub here too so a
  // stale/cached index can never surface Studio-OS session jargon to a visitor.
  function scrub(s) {
    return String(s || '')
      .replace(/\bS\d{2,3}\b/g, '')
      .replace(/goal[\s-]*chain/gi, '')
      .replace(/\/(start|audit|implement|closeout|go)\b/gi, '')
      .replace(/build:check/gi, 'automated checks')
      .replace(/\d+\s+shipped\b/gi, '')
      .replace(/deferred[\s-]*(?:with[\s-]*evidence)?/gi, '')
      .replace(/[#>]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  // S195: conversational memory — entirely client-side, zero added API cost
  // (CANON-029). We keep only the prior turn's topic tokens + top URL so a
  // follow-up ("tell me more", "what about the free tier") resolves against the
  // last answer instead of starting cold. Reset on a fresh, unrelated query.
  var convo = { tokens: [], topUrl: '' };

  // S206 #15: prefix-sharing query cache. First 3 words of a query become a key;
  // successful answers write an excerpt + ts. On a new query, a prefix match
  // surfaces "Continuing from your earlier search" to bridge multi-visit threads.
  var PREFIX_CACHE_KEY = 'vs_ignis_prefix_cache';
  var PREFIX_TTL_MS = 24 * 60 * 60 * 1000; // 24h
  var PREFIX_MAX = 20;
  var DEPLOY_SHA_KEY = 'vs_ignis_deploy_sha';

  function prefixKey(q) {
    return tokens(q).slice(0, 3).join(' ');
  }

  function readPrefixCache() {
    try { return JSON.parse(localStorage.getItem(PREFIX_CACHE_KEY) || '[]'); }
    catch (_) { return []; }
  }

  function writePrefixCache(q, excerpt) {
    try {
      var key = prefixKey(q);
      if (!key) return;
      var cache = readPrefixCache().filter(function (e) { return e.key !== key; });
      cache.unshift({ key: key, excerpt: excerpt, ts: Date.now(), q: q.slice(0, 80) });
      if (cache.length > PREFIX_MAX) cache.length = PREFIX_MAX;
      localStorage.setItem(PREFIX_CACHE_KEY, JSON.stringify(cache));
    } catch (_) {}
  }

  function lookupPrefixCache(q) {
    var key = prefixKey(q);
    if (!key) return null;
    var now = Date.now();
    return readPrefixCache().find(function (e) {
      return e.key === key && (now - e.ts) < PREFIX_TTL_MS;
    }) || null;
  }

  // S227: deploy-hash invalidation. Fetches api/build-sha.json once per page load;
  // if the deploy SHA changed since the last visit, the 24h prefix cache is stale
  // (index docs may have changed) and is wiped. Fire-and-forget — never blocks search.
  (function () {
    try {
      fetch('/api/build-sha.json').then(function (r) { return r.json(); }).then(function (d) {
        var sha = d && d.sha;
        if (!sha) return;
        var stored = localStorage.getItem(DEPLOY_SHA_KEY);
        if (stored && stored !== sha) {
          localStorage.removeItem(PREFIX_CACHE_KEY);
        }
        localStorage.setItem(DEPLOY_SHA_KEY, sha);
      }).catch(function () {});
    } catch (_) {}
  }());

  // S201 ignis-synthesis-mode: session-scoped query log (cleared on page load).
  var sessionQueries = [];
  var FOLLOWUP_RE = /^(tell me more|more\b|go on|continue|why\b|how about|what about|and |elaborate|explain|details?|keep going|then\b)/i;
  function isFollowUp(q) {
    q = String(q || '').trim();
    if (!q || !convo.tokens.length) return false;
    if (FOLLOWUP_RE.test(q)) return true;
    // A bare pronoun / single short word with live context reads as a follow-up.
    return tokens(q).length <= 1;
  }

  function answer(query, index, opts) {
    opts = opts || {};
    var qTokens = tokens(query);
    var priorTokens = opts.followUp ? (opts.priorTokens || convo.tokens) : [];
    // On a follow-up, fold in the prior topic so "more" / pronouns have substance.
    if (opts.followUp && priorTokens.length) qTokens = priorTokens.concat(qTokens);
    if (!qTokens.length) return null;
    // S227: session-context boost — if ≥2 prior in-session queries exist, extract top
    // keywords from sessionQueries and boost documents matching them by +0.15 each.
    // Prevents single-query over-specialization; caps at 2× raw score.
    var ctxTokens = [];
    if (sessionQueries.length >= 2) {
      sessionQueries.slice(0, 5).forEach(function (e) {
        tokens(e.q || '').forEach(function (t) { if (t && !ctxTokens.includes(t)) ctxTokens.push(t); });
      });
    }
    // S229 oracle-context-ranking: domain-tag boost — extract top-level URL path
    // segments from prior result URLs (e.g. '/games/' → 'games'). New results
    // sharing a domain tag with prior results get +0.12, keeping multi-turn threads
    // topically coherent without hard-filtering unrelated useful docs.
    var ctxDomains = [];
    if (sessionQueries.length >= 2) {
      sessionQueries.slice(0, 5).forEach(function (e) {
        var seg = (e.url || '').replace(/^https?:\/\/[^/]+/, '').split('/').filter(Boolean)[0];
        if (seg && seg.length > 1 && !ctxDomains.includes(seg)) ctxDomains.push(seg);
      });
    }
    var scored = (index.documents || []).map(function (doc) {
      var hay = [doc.title, doc.summary, doc.body, doc.url].join(' ').toLowerCase();
      var score = qTokens.reduce(function (acc, t) { return acc + (hay.indexOf(t) !== -1 ? 1 : 0); }, 0);
      // Bias toward the prior answer's topic so a thread stays coherent (half-weight).
      if (priorTokens.length) score += priorTokens.reduce(function (acc, t) { return acc + (hay.indexOf(t) !== -1 ? 0.5 : 0); }, 0);
      // Session-context boost: +0.15 per matched session keyword, capped at 2× raw score.
      if (ctxTokens.length && score > 0) {
        var boost = ctxTokens.reduce(function (acc, t) { return acc + (hay.indexOf(t) !== -1 ? 0.15 : 0); }, 0);
        score = Math.min(score * 2, score + boost);
      }
      // Domain-tag coherence: +0.12 per shared top-level path segment with prior results.
      if (ctxDomains.length && score > 0) {
        var urlPath = (doc.url || '').replace(/^https?:\/\/[^/]+/, '');
        var domBoost = ctxDomains.reduce(function (acc, seg) {
          return acc + (urlPath.indexOf('/' + seg + '/') !== -1 || urlPath.indexOf('/' + seg) === 0 ? 0.12 : 0);
        }, 0);
        if (domBoost > 0) score = Math.min(score * 2, score + domBoost);
      }
      return { doc: doc, score: score };
    }).filter(function (row) { return row.score > 0; }).sort(function (a, b) { return b.score - a.score; }).slice(0, 4);
    if (!scored.length) return null;
    // S228: emit once per answer when session-context boost was active.
    if (ctxTokens.length) emitUx('oracle:context_boost');
    var top = scored[0].doc;
    return {
      text: scrub(top.summary || top.body) || ('IGNIS found the strongest public match in ' + top.title + '.'),
      sources: scored.map(function (row) { return row.doc; })
    };
  }

  // Public, cost-neutral one-shot retrieval used by the command palette (item 5).
  function ask(query) {
    return loadIndex().then(function (idx) { return answer(query, idx, {}); });
  }

  function ensureStyles() {
    if (document.getElementById('vs-ignis-answer-style')) return;
    var s = document.createElement('style');
    s.id = 'vs-ignis-answer-style';
    s.textContent = '.vs-ask-ignis{margin:2rem 0;padding:1rem;border:1px solid var(--line);border-radius:16px;background:rgba(255,255,255,.035)}.vs-ask-ignis form{display:flex;gap:.6rem;flex-wrap:wrap}.vs-ask-ignis input{flex:1;min-width:220px;border:1px solid var(--line);background:rgba(0,0,0,.18);color:var(--text);border-radius:10px;padding:.8rem;font:inherit}.vs-ask-ignis button{border:0;border-radius:10px;padding:.8rem 1rem;background:linear-gradient(90deg,#ff7a00,#ffc400);font-weight:800;color:#10131f}.vs-ask-ignis__chips{display:flex;gap:.45rem;flex-wrap:wrap;margin-top:.7rem}.vs-ask-ignis__chip{font-size:.8rem;border:1px solid rgba(255,196,0,.3);border-radius:999px;padding:.4rem .8rem;background:rgba(255,196,0,.06);color:var(--gold);cursor:pointer;font:inherit;font-size:.8rem;text-align:left}.vs-ask-ignis__chip:hover{background:rgba(255,196,0,.14)}.vs-ask-ignis__answer{margin-top:1rem;color:var(--muted);line-height:1.65}.vs-ask-ignis__sources{display:flex;gap:.45rem;flex-wrap:wrap;margin-top:.7rem}.vs-ask-ignis__sources a{font-size:.78rem;border:1px solid rgba(255,196,0,.25);border-radius:999px;padding:.3rem .65rem;color:var(--gold)}.vs-ask-ignis__feedback{display:flex;align-items:center;gap:.5rem;margin-top:.85rem;font-size:.8rem;color:var(--dim)}.vs-ask-ignis__feedback-q{letter-spacing:.04em}.vs-ask-ignis__vote{border:1px solid var(--line);background:rgba(255,255,255,.04);border-radius:10px;min-width:44px;min-height:44px;cursor:pointer;font-size:1rem;line-height:1;color:var(--text)}.vs-ask-ignis__vote:hover{background:rgba(255,196,0,.12);border-color:rgba(255,196,0,.35)}.vs-ignis-proactive{margin-top:.65rem;padding:.5rem .75rem;border-radius:10px;background:rgba(155,140,255,0.07);border:1px solid rgba(155,140,255,0.18);font-size:.8rem;color:#c4bcff;display:flex;align-items:center;gap:.5rem}.vs-ignis-proactive__label{flex:0 0 auto;font-weight:700;color:#9b8cff}.vs-ignis-proactive__link{color:#c4bcff;text-decoration:underline;text-decoration-color:rgba(155,140,255,0.4);flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.vs-ignis-proactive__msg{flex:1 1 auto}.vs-ignis-proactive__close{flex:0 0 auto;background:none;border:none;color:#9b8cff;font-size:1rem;cursor:pointer;padding:0;line-height:1}.vs-ask-ignis__followups{display:flex;gap:.45rem;flex-wrap:wrap;margin-top:.85rem}.vs-ask-ignis__followup{font-size:.8rem;border:1px solid rgba(155,140,255,.3);border-radius:999px;padding:.4rem .8rem;background:rgba(155,140,255,.07);color:#c4bcff;cursor:pointer;font:inherit;font-size:.8rem;text-align:left}.vs-ask-ignis__followup:hover{background:rgba(155,140,255,.16)}' +
      '.vs-ask-ignis__history{margin-top:.7rem}.vs-ask-ignis__history-label{display:block;font-size:.7rem;letter-spacing:.07em;text-transform:uppercase;color:var(--dim,#6272a0);margin-bottom:.4rem}.vs-ask-ignis__history-row{display:flex;gap:.4rem;flex-wrap:wrap;align-items:center}.vs-ask-ignis__history-chip{font-size:.8rem;border:1px solid rgba(100,200,255,.25);border-radius:999px;padding:.35rem .75rem;background:rgba(100,200,255,.06);color:#7cc8ff;cursor:pointer;font:inherit;text-align:left}.vs-ask-ignis__history-chip:hover{background:rgba(100,200,255,.15)}.vs-ask-ignis__history-clear{background:none;border:none;color:var(--dim,#6272a0);cursor:pointer;font-size:.8rem;padding:.3rem .5rem;border-radius:6px;line-height:1}.vs-ask-ignis__history-clear:hover{color:var(--muted,#a8b4d0)}' +
      '.vs-ask-ignis__deepdive{display:inline-flex;align-items:center;gap:.35rem;margin-top:.9rem;font-size:.78rem;font-weight:700;color:var(--gold,#ffc400);text-decoration:none;opacity:.75;transition:opacity .15s}.vs-ask-ignis__deepdive:hover{opacity:1}' +
      '.vs-ignis-synthesis-card{margin-top:1rem;padding:.9rem 1rem;border-radius:12px;background:rgba(255,196,0,.04);border:1px solid rgba(255,196,0,.18)}.vs-ignis-synthesis-card__header{display:flex;align-items:center;gap:.7rem;margin-bottom:.7rem}.vs-ignis-synthesis-card__badge{display:inline-block;padding:.15rem .5rem;border-radius:5px;background:rgba(255,196,0,.12);border:1px solid rgba(255,196,0,.28);font-size:.65rem;font-weight:900;letter-spacing:.12em;color:#ffc400}.vs-ignis-synthesis-card__count{font-size:.78rem;color:var(--muted,#a8b4d0)}.vs-ignis-synthesis-card__list{display:flex;flex-direction:column;gap:.5rem}.vs-ignis-synthesis-card__row{display:flex;flex-direction:column;gap:.15rem}.vs-ignis-synthesis-card__q{font-size:.85rem;color:var(--text,#eef2ff)}.vs-ignis-synthesis-card__src{font-size:.75rem;color:rgba(255,196,0,.7);text-decoration:none}.vs-ignis-synthesis-card__src:hover{text-decoration:underline}.vs-ignis-synthesis-card__reads-label{margin-top:.75rem;font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;color:var(--dim,#6272a0);font-weight:700}.vs-ignis-synthesis-card__reads{display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.35rem}' +
      '.vs-ask-ignis__related{display:flex;align-items:center;flex-wrap:wrap;gap:.4rem;margin-top:.75rem;padding-top:.7rem;border-top:1px solid rgba(255,196,0,.1)}.vs-ask-ignis__related-label{font-size:.7rem;font-weight:700;color:var(--dim,#6272a0);text-transform:uppercase;letter-spacing:.05em;margin-right:.15rem;white-space:nowrap}.vs-ask-ignis__related-chip{display:inline-flex;align-items:center;padding:.2rem .65rem;border-radius:100px;font-size:.76rem;font-weight:600;background:rgba(255,196,0,.06);border:1px solid rgba(255,196,0,.2);color:var(--gold,#ffc400);cursor:pointer;font:inherit;line-height:1.4;transition:background .12s,border-color .12s}.vs-ask-ignis__related-chip:hover{background:rgba(255,196,0,.16);border-color:rgba(255,196,0,.4)}.vs-ask-ignis__related-chip[aria-expanded="true"]{background:rgba(255,196,0,.2);border-color:rgba(255,196,0,.5)}' +
      '.vs-ignis-catalog{margin-top:.7rem;display:grid;gap:.5rem}.vs-ignis-catalog__card{display:block;padding:.65rem .8rem;border-radius:12px;border:1px solid rgba(255,196,0,.16);background:rgba(255,196,0,.04);text-decoration:none}.vs-ignis-catalog__card:hover{background:rgba(255,196,0,.09);border-color:rgba(255,196,0,.32)}.vs-ignis-catalog__name{font-size:.86rem;font-weight:800;color:var(--text,#eef2ff);display:flex;align-items:center;gap:.45rem}.vs-ignis-catalog__status{font-size:.62rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--gold,#ffc400);border:1px solid rgba(255,196,0,.3);border-radius:999px;padding:.05rem .45rem}.vs-ignis-catalog__note{font-size:.78rem;color:var(--muted,#a8b4d0);margin:.25rem 0 0;line-height:1.5}.vs-ignis-catalog__ask{font-size:.76rem;color:var(--dim,#6272a0);background:none;border:none;cursor:pointer;font:inherit;padding:.2rem 0 0;text-decoration:underline;text-decoration-color:rgba(255,196,0,.3)}.vs-ignis-catalog__ask:hover{color:var(--gold,#ffc400)}' +
      '.vs-ignis-cache-label{font-size:.78rem;color:var(--dim,#6272a0)}.vs-ignis-cache-hint{font-size:.75rem;color:var(--dim,#6272a0)}' +
      '.vs-ignis-fb-form{display:flex;flex-direction:column;gap:.4rem;width:100%}.vs-ignis-fb-lbl{font-size:.78rem;color:var(--muted,#9aa3b2)}.vs-ignis-fb-row{display:flex;gap:.4rem}.vs-ignis-fb-inp{flex:1;border:1px solid var(--line,rgba(255,255,255,.12));background:rgba(0,0,0,.18);color:var(--text,#e8eaf0);border-radius:8px;padding:.45rem .7rem;font:inherit;font-size:.82rem}.vs-ignis-fb-btn{border:0;border-radius:8px;padding:.45rem .8rem;background:rgba(255,196,0,.18);color:var(--gold,#ffc400);font-weight:700;font-size:.82rem;cursor:pointer}' +
      '.vs-ask-ignis__chip--context{border-color:rgba(255,196,0,.45);background:rgba(255,196,0,.1);color:var(--gold,#ffc400);font-weight:600}' +
      '.vs-ask-ignis__chip-tray{margin-top:.7rem}.vs-ask-ignis__tray-tabs{display:flex;gap:.3rem;margin-bottom:.45rem}.vs-ask-ignis__tray-tab{background:none;border:1px solid rgba(255,255,255,.08);border-radius:999px;color:var(--dim,#6272a0);font:600 .72rem/1 inherit;padding:.28rem .7rem;min-height:44px;display:inline-flex;align-items:center;cursor:pointer;transition:background .12s,color .12s}.vs-ask-ignis__tray-tab:hover{color:var(--muted,#a8b4d0);background:rgba(255,255,255,.05)}.vs-ask-ignis__tray-tab--active{border-color:rgba(255,196,0,.35);background:rgba(255,196,0,.07);color:var(--gold,#ffc400)}' +
      '.vs-ask-ignis__followups--entities{margin-top:.4rem;display:flex;flex-wrap:wrap;align-items:baseline;gap:.3rem}.vs-ask-ignis__followup-label{font-size:.72rem;color:var(--dim,#6272a0);white-space:nowrap}' +
      '.vs-ask-ignis__cluster-group{margin-top:.55rem}.vs-ask-ignis__cluster-label{display:block;font-size:.68rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--dim,#6272a0);margin-bottom:.3rem}' +
      '.vs-ignis-offline{padding:.6rem 0}.vs-ignis-offline__msg{font-size:.82rem;color:var(--muted,#a8b4d0);margin:0 0 .6rem}.vs-ignis-offline__list{display:flex;flex-direction:column;gap:.5rem;margin-bottom:.75rem}.vs-ignis-offline__row{border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:.55rem .75rem}.vs-ignis-offline__q{display:block;font-size:.82rem;font-weight:600;color:var(--text,#eef2ff);margin-bottom:.2rem}.vs-ignis-offline__excerpt{display:block;font-size:.78rem;color:var(--muted,#a8b4d0);overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.vs-ignis-offline__retry{background:none;border:1px solid rgba(255,196,0,.3);border-radius:999px;color:var(--gold,#ffc400);font:inherit;font-size:.82rem;cursor:pointer;padding:.4rem .9rem}' +
      '.vs-ignis-starters{margin-top:.8rem;padding-top:.8rem;border-top:1px solid rgba(255,255,255,.06)}.vs-ignis-starters__label{font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--dim,#6272a0);margin-bottom:.5rem}.vs-ignis-starters__chips{display:flex;flex-direction:column;gap:.35rem}.vs-ignis-starters__chip{text-align:left;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:.55rem .85rem;color:var(--muted,#a8b4d0);font:inherit;font-size:.85rem;cursor:pointer;line-height:1.4;transition:background .12s,border-color .12s,color .12s}.vs-ignis-starters__chip:hover{background:rgba(255,196,0,.06);border-color:rgba(255,196,0,.22);color:var(--text,#eef2ff)}' +
      '.vs-ignis-live{display:flex;align-items:center;gap:.5rem;margin-bottom:.7rem;padding:.6rem .85rem;border-radius:10px;background:rgba(110,243,170,.07);border:1px solid rgba(110,243,170,.22);color:#aef5cf;font-size:.86rem;line-height:1.5;font-weight:600}.vs-ignis-live__dot{flex:0 0 auto;width:8px;height:8px;border-radius:50%;background:#6ef3aa;box-shadow:0 0 0 0 rgba(110,243,170,.6);animation:vs-ignis-live-pulse 2s infinite}@keyframes vs-ignis-live-pulse{0%{box-shadow:0 0 0 0 rgba(110,243,170,.5)}70%{box-shadow:0 0 0 7px rgba(110,243,170,0)}100%{box-shadow:0 0 0 0 rgba(110,243,170,0)}}@media (prefers-reduced-motion:reduce){.vs-ignis-live__dot{animation:none}}.vs-ignis-proactive__more{flex:0 0 auto!important;white-space:nowrap}' +
      '.vs-ignis-community{margin-top:.8rem;padding-top:.8rem;border-top:1px solid rgba(255,196,0,.1)}.vs-ignis-community__label{font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--dim,#6272a0);margin-bottom:.5rem}.vs-ignis-community__chips{display:flex;gap:.45rem;flex-wrap:wrap}.vs-ignis-community__chip{font-size:.8rem;border:1px solid rgba(255,196,0,.25);border-radius:999px;padding:.4rem .8rem;background:rgba(255,196,0,.06);color:var(--gold,#ffc400);cursor:pointer;font:inherit;text-align:left;transition:background .12s,border-color .12s}.vs-ignis-community__chip:hover{background:rgba(255,196,0,.16);border-color:rgba(255,196,0,.4)}';
    document.head.appendChild(s);
  }

  function mount(root, contextQueries) { // S210 #1: contextQueries = page-aware chips
    ensureStyles();
    loadInsights(); // S219: warm oracle-insights so live answers are ready on first ask
    root.innerHTML = vsHtml('<div class="vs-ask-ignis"><form><input name="q" placeholder="Ask IGNIS about games, membership, security, feedback, or recent ships…" autocomplete="off"><button type="submit">Ask IGNIS</button></form><div class="vs-ask-ignis__chip-tray" hidden><div class="vs-ask-ignis__tray-tabs"><button type="button" class="vs-ask-ignis__tray-tab" data-tab="recent">Recent</button><button type="button" class="vs-ask-ignis__tray-tab" data-tab="topics">Topics</button></div><div class="vs-ask-ignis__history" hidden></div><div class="vs-ask-ignis__chips" hidden></div></div><div class="vs-ask-ignis__answer" aria-live="polite"></div></div>');
    var form = root.querySelector('form');
    var out = root.querySelector('.vs-ask-ignis__answer');
    var chips = root.querySelector('.vs-ask-ignis__chips');
    var histEl = root.querySelector('.vs-ask-ignis__history');
    var tray = root.querySelector('.vs-ask-ignis__chip-tray');

    // S212 W4: curated starter prompts — first-time / no-history visitors.
    // S213 W2a: per-starter slug for analytics attribution.
    // S213 W2b: vs_last_game personalization — game visitors see relevant starters.
    var STARTERS_ALL = [
      { q: 'What\'s currently being built in the Forge?', slug: 'forge-builds' },
      { q: 'Which games can I play right now for free?', slug: 'free-games' },
      { q: 'How does the Vault rank system work?', slug: 'rank-system' },
      { q: 'What makes VaultSpark Studios different?', slug: 'studio-diff' },
      { q: 'What shipped in the studio recently?', slug: 'recent-ships' },
    ];
    var STARTERS_GAME = {
      cod:          [{ q: 'What makes Call of Doodie different?', slug: 'cod-diff' },
                     { q: 'What\'s new in Call of Doodie?', slug: 'cod-new' }],
      fgm:          [{ q: 'How deep is Football GM\'s franchise mode?', slug: 'fgm-depth' },
                     { q: 'What\'s unique about VaultSpark Football GM?', slug: 'fgm-diff' }],
      forge:        [{ q: 'What\'s being built in the Forge right now?', slug: 'forge-now' },
                     { q: 'Which Forge project launches next?', slug: 'forge-launch' }],
      // S216: extend to all SPARKED game slugs
      mindframe:    [{ q: 'How does MindFrame\'s Mind Model work?', slug: 'mindframe-model' },
                     { q: 'What are MindFrame\'s 15 cognitive modes?', slug: 'mindframe-modes' }],
      solara:       [{ q: 'How does Solara\'s shared-sun mechanic work?', slug: 'solara-sun' },
                     { q: 'What happens to the world when you die in Solara?', slug: 'solara-death' }],
      vaultfront:   [{ q: 'How does VaultFront\'s convoy-timing strategy work?', slug: 'vaultfront-convoy' },
                     { q: 'What makes VaultFront\'s RTS asymmetric?', slug: 'vaultfront-rts' }],
      'the-exodus': [{ q: 'How does The Exodus engine-building work?', slug: 'exodus-engine' },
                     { q: 'How does your legacy carry across Exodus runs?', slug: 'exodus-legacy' }],
    };
    var starterWrap = null;
    // S220: returning visitors (have history) get no curated starters, but if they
    // have a recent in-window query cached, offer ONE re-entry chip to resume the
    // thread — turns the otherwise-invisible prefix cache into a visible hook.
    function renderResumeChip() {
      var recent = null;
      try {
        var now = Date.now();
        recent = readPrefixCache().find(function (e) {
          return e && e.q && (now - e.ts) < PREFIX_TTL_MS;
        });
      } catch (_) {}
      if (!recent) return;
      starterWrap = document.createElement('div');
      starterWrap.className = 'vs-ignis-starters';
      var lbl = document.createElement('div');
      lbl.className = 'vs-ignis-starters__label';
      lbl.textContent = 'Pick up where you left off';
      starterWrap.appendChild(lbl);
      var resumeList = document.createElement('div');
      resumeList.className = 'vs-ignis-starters__chips';
      var slug = 'resume';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vs-ignis-starters__chip';
      btn.setAttribute('data-slug', slug);
      btn.textContent = recent.q;
      btn.addEventListener('click', function () {
        form.q.value = recent.q;
        emitUx('oracle:starter_click:' + slug);
        if (starterWrap) starterWrap.hidden = true;
        runQuery(recent.q, 'resume');
      });
      resumeList.appendChild(btn);
      starterWrap.appendChild(resumeList);
      var trayEl0 = root.querySelector('.vs-ask-ignis__chip-tray');
      var container0 = root.querySelector('.vs-ask-ignis');
      if (container0) container0.insertBefore(starterWrap, trayEl0 || out);
      // S227: topic-aware re-entry — cross-reference history keywords × new changelog entries.
      // Fire-and-forget: appends a contextual chip if a match is found after the resume chip.
      (function () {
        try {
          var hist = JSON.parse(localStorage.getItem('vs_ignis_history') || '[]');
          var lastVisitTs = parseInt(localStorage.getItem('vs_last_visit_ts') || '0', 10);
          if (!hist.length || !lastVisitTs) return;
          var histKeywords = [];
          hist.slice(0, 5).forEach(function (h) {
            tokens(typeof h === 'string' ? h : (h.q || '')).forEach(function (t) {
              if (t && !histKeywords.includes(t)) histKeywords.push(t);
            });
          });
          if (!histKeywords.length) return;
          fetch('/api/changelog-narrative.json').then(function (r) { return r.json(); }).then(function (data) {
            var entries = (data && data.entries) || [];
            var matchedKeyword = null;
            for (var i = 0; i < entries.length; i++) {
              var e = entries[i];
              var entryTs = new Date(e.date || '').getTime();
              if (!entryTs || entryTs <= lastVisitTs) continue;
              var title = (e.title || '').toLowerCase();
              for (var j = 0; j < histKeywords.length; j++) {
                if (histKeywords[j].length > 3 && title.includes(histKeywords[j])) {
                  matchedKeyword = histKeywords[j]; break;
                }
              }
              if (matchedKeyword) break;
            }
            if (!matchedKeyword || !starterWrap || starterWrap.hidden) return;
            var topicBtn = document.createElement('button');
            topicBtn.type = 'button';
            topicBtn.className = 'vs-ignis-starters__chip vs-ask-ignis__chip--context';
            topicBtn.textContent = 'New intel about ' + matchedKeyword + ' since your last visit';
            topicBtn.addEventListener('click', function () {
              var q = ‘What\’s new about ‘ + matchedKeyword + ‘?’;
              form.q.value = q;
              emitUx('oracle:topic_chip_click');
              if (starterWrap) starterWrap.hidden = true;
              runQuery(q, 'topic-chip');
            });
            resumeList.appendChild(topicBtn);
          }).catch(function () {});
        } catch (_) {}
      }());
    }
    (function renderStarters() {
      var hasHistory = false;
      try { hasHistory = !!(localStorage.getItem('vs_ignis_history')); } catch (_) {}
      if (hasHistory) { renderResumeChip(); return; }
      var lastGame = null;
      try { lastGame = localStorage.getItem('vs_last_game'); } catch (_) {}
      var gameStarters = (lastGame && STARTERS_GAME[lastGame]) || [];
      var starters = gameStarters.concat(STARTERS_ALL).slice(0, 5);
      starterWrap = document.createElement('div');
      starterWrap.className = 'vs-ignis-starters';
      var lbl = document.createElement('div');
      lbl.className = 'vs-ignis-starters__label';
      lbl.textContent = gameStarters.length ? 'Based on your last game' : 'Ask the vault';
      starterWrap.appendChild(lbl);
      var starterList = document.createElement('div');
      starterList.className = 'vs-ignis-starters__chips';
      starters.forEach(function (s) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'vs-ignis-starters__chip';
        btn.setAttribute('data-slug', s.slug);
        btn.textContent = s.q;
        btn.addEventListener('click', function () {
          form.q.value = s.q;
          emitUx('oracle:starter_click:' + s.slug);
          if (starterWrap) starterWrap.hidden = true;
          runQuery(s.q, 'starter');
        });
        starterList.appendChild(btn);
      });
      starterWrap.appendChild(starterList);
      var trayEl = root.querySelector('.vs-ask-ignis__chip-tray');
      var container = root.querySelector('.vs-ask-ignis');
      if (container) container.insertBefore(starterWrap, trayEl || out);
    })();

    // S227: community topic chips — surfaces oracle-feedback-themes.json as a
    // 'What the Vault is exploring' discovery row. honestDark=true → no render.
    (function renderCommunityTopics() {
      fetch('/api/oracle-feedback-themes.json').then(function (r) { return r.json(); }).then(function (d) {
        if (!d || d.honestDark || !d.themes || !d.themes.length) return;
        var section = document.createElement('div');
        section.className = 'vs-ignis-community';
        var lbl = document.createElement('div');
        lbl.className = 'vs-ignis-community__label';
        lbl.textContent = 'What the Vault is exploring';
        section.appendChild(lbl);
        var row = document.createElement('div');
        row.className = 'vs-ignis-community__chips';
        d.themes.slice(0, 5).forEach(function (theme) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'vs-ignis-community__chip';
          btn.textContent = theme.label;
          btn.addEventListener('click', function () {
            form.q.value = theme.label;
            if (starterWrap) starterWrap.hidden = true;
            section.hidden = true;
            emitUx('oracle:topic_chip_click');
            runQuery(theme.label, 'community');
          });
          row.appendChild(btn);
        });
        section.appendChild(row);
        var container = root.querySelector('.vs-ask-ignis');
        var trayEl = root.querySelector('.vs-ask-ignis__chip-tray');
        if (container) container.insertBefore(section, trayEl || out);
      }).catch(function () {});
    }());

    // S211 Wave 2: tab wiring for unified chip tray (Recent | Topics).
    function activateTab(tabName) {
      try { sessionStorage.setItem('vs_ignis_tab', tabName); } catch (_) {}
      if (tray) {
        Array.prototype.forEach.call(tray.querySelectorAll('.vs-ask-ignis__tray-tab'), function (t) {
          t.classList.toggle('vs-ask-ignis__tray-tab--active', t.dataset.tab === tabName);
        });
      }
      if (histEl) histEl.hidden = tabName !== 'recent';
      if (chips) chips.hidden = tabName !== 'topics';
    }
    function showTray(defaultTab) {
      if (!tray) return;
      var saved = null;
      try { saved = sessionStorage.getItem('vs_ignis_tab'); } catch (_) {}
      activateTab(saved || defaultTab || 'topics');
      tray.hidden = false;
    }
    if (tray) {
      Array.prototype.forEach.call(tray.querySelectorAll('.vs-ask-ignis__tray-tab'), function (t) {
        t.addEventListener('click', function () { activateTab(t.dataset.tab); });
      });
    }

    // S210 #1: render page-aware context chips immediately (sync, no fetch needed).
    // Tray visibility is deferred — showTray() is called after history is also checked.
    if (chips && contextQueries && contextQueries.length) {
      contextQueries.forEach(function (q) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'vs-ask-ignis__chip vs-ask-ignis__chip--context';
        btn.textContent = q;
        btn.addEventListener('click', function () {
          form.q.value = q;
          emitUx('oracle:suggestion_click');
          runQuery(q, 'context-chip');
        });
        chips.appendChild(btn);
      });
    }

    function runQuery(q, source, cluster) {
      q = String(q || '').trim();
      if (!q) return;
      var clusterId = clusterSlug(cluster); // '' for typed queries (no known cluster)
      var followUp = isFollowUp(q);
      if (followUp) emitUx('oracle-followup:ask');
      if (tray) tray.hidden = true; // first interaction — retire the chip tray
      if (starterWrap) starterWrap.hidden = true; // S212 W4: hide starters on first query
      // S206 #15: prefix cache hit — show excerpt while loading for continuity.
      var cacheHit = !followUp && lookupPrefixCache(q);
      // S210 #4: loading trust animation — "Searching N FORGE units…" while index loads.
      var _rafId = null;
      if (followUp) {
        out.textContent = 'Following that thread…';
      } else if (_indexDocCount > 0) {
        var _startTs = Date.now();
        var _target = _indexDocCount;
        (function _countUp() {
          var pct = Math.min((Date.now() - _startTs) / 1200, 1);
          out.textContent = 'Searching ' + Math.round(pct * _target).toLocaleString() + ' FORGE units…';
          if (pct < 1) _rafId = requestAnimationFrame(_countUp);
        }());
      } else {
        out.textContent = 'Searching the Forge…';
      }
      if (cacheHit) {
        out.innerHTML = vsHtml('<span class="vs-ignis-cache-label">Continuing from your earlier search —</span> ' + esc(cacheHit.excerpt) + '<br><span class="vs-ignis-cache-hint">Checking for updates…</span>');
      }
      loadIndex().then(function (idx) {
        if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; } // S210 #4: stop count animation
        // S210 #5: offline cache fallback — surface prefix-cache on network failure.
        if (idx && idx._offline) {
          renderOfflineFallback(out, q, runQuery);
          return;
        }
        var result = answer(q, idx, { followUp: followUp });
        if (!result) {
          // S213 W2c: dynamic no-result fallback — suggest from STARTERS_ALL so
          // suggestions stay current as the index grows; emit oracle:no_result for
          // visibility into miss rate (was completely invisible before this session).
          emitUx('oracle:no_result');
          var fallbacks = (STARTERS_ALL || []).slice(0, 3);
          var fbHtml = '<p class="vs-ignis-no-result">IGNIS didn’t find a match. Try one of these—</p>' +
            '<div class="vs-ignis-starters__chips">' +
            fallbacks.map(function (s) {
              return '<button type="button" class="vs-ignis-starters__chip" data-fb-slug="' + esc(s.slug) + '">' + esc(s.q) + '</button>';
            }).join('') + '</div>';
          out.innerHTML = vsHtml(fbHtml);
          var fbBtns = out.querySelectorAll('[data-fb-slug]');
          if (fbBtns) fbBtns.forEach(function (b) {
            b.addEventListener('click', function () { runQuery(b.textContent.trim(), 'no-result-fallback'); });
          });
          return;
        }
        // S219 oracle-live-answers: lead the answer with the CURRENT live fact for
        // this query's cluster (game counts, latest ship, leaderboard, rank tiers)
        // so the Oracle answers from live studio state, not just static page text.
        var _live = liveAnswerFor(q);
        var _liveLead = _live ? ('<div class="vs-ignis-live"><span class="vs-ignis-live__dot" aria-hidden="true"></span>' + esc(_live) + '</div>') : '';
        out.innerHTML = vsHtml(_liveLead + '<strong>IGNIS read:</strong> ' + esc(result.text) + '<div class="vs-ask-ignis__sources">' + result.sources.map(function (src) {
          return '<a href="' + esc(src.url || '/') + '">' + esc(src.title || src.url || 'source') + '</a>';
        }).join('') + '</div>' +
          // S189: close the AI feedback loop — a 1-tap helpful/unhelpful control so a
          // visitor can flag a miss and the studio can measure answer quality
          // (oracle-answer:* feeds api/funnel-summary.json). Counts only, no text.
          '<div class="vs-ask-ignis__feedback" role="group" aria-label="Was this answer helpful?">' +
            '<span class="vs-ask-ignis__feedback-q">Helpful?</span>' +
            '<button type="button" class="vs-ask-ignis__vote" data-vote="helpful" aria-label="Yes, this answer helped">👍</button>' +
            '<button type="button" class="vs-ask-ignis__vote" data-vote="unhelpful" aria-label="No, this answer missed">👎</button>' +
          '</div>');
        var fb = out.querySelector('.vs-ask-ignis__feedback');
        if (fb) {
          fb.addEventListener('click', function (e) {
            var b = e.target && e.target.closest ? e.target.closest('.vs-ask-ignis__vote') : null;
            if (!b) return;
            var part = b.getAttribute('data-vote') === 'helpful' ? 'helpful' : 'unhelpful';
            // S192: cluster-tagged vote for per-topic quality tracking.
            emitUx('oracle-answer:' + part + (clusterId ? ':' + clusterId : ''));
            if (part === 'helpful') {
              fb.textContent = 'Thanks — glad that helped.';
            } else {
              // S206 #13: thumbs-down expands to a text input so visitors can
              // describe the miss; captured as oracle:feedback_submitted via RUM
              // (no backend storage at L1 — data lands in the analytics pipeline).
              fb.innerHTML = '';
              var form = document.createElement('form');
              form.className = 'vs-ignis-fb-form';
              var lbl = document.createElement('label');
              lbl.textContent = 'What were you looking for?';
              lbl.className = 'vs-ignis-fb-lbl';
              var row = document.createElement('div');
              row.className = 'vs-ignis-fb-row';
              var inp = document.createElement('input');
              inp.type = 'text';
              inp.placeholder = 'e.g. how to cancel membership…';
              inp.maxLength = 140;
              inp.setAttribute('aria-label', 'What were you looking for?');
              inp.className = 'vs-ignis-fb-inp';
              var btn = document.createElement('button');
              btn.type = 'submit';
              btn.textContent = 'Send';
              btn.className = 'vs-ignis-fb-btn';
              row.appendChild(inp);
              row.appendChild(btn);
              form.appendChild(lbl);
              form.appendChild(row);
              form.addEventListener('submit', function (ev) {
                ev.preventDefault();
                var val = inp.value.trim();
                if (val) {
                  emitUx('oracle:feedback_submitted');
                  // S207 (oracle-feedback-themes-loop): attribute the submission to
                  // its topic cluster so we learn WHICH topics drive "tell us more"
                  // — privacy-preserving (the free text is never transmitted, only
                  // the topic key). build-oracle-feedback-themes.mjs aggregates these.
                  if (clusterId) emitUx('oracle-feedback:' + clusterId);
                }
                fb.textContent = 'Got it — we\'ll use this to improve.';
              });
              fb.appendChild(form);
              inp.focus();
            }
          });
        }

        // S195: remember this turn's topic so the next query can be a follow-up,
        // then offer follow-up chips drawn from the sibling docs of THIS answer —
        // the thread continues with one tap, never a re-typed cold-start.
        var top = result.sources[0] || {};
        convo.tokens = tokens(q).concat(tokens(top.title)).filter(function (t, i, a) { return a.indexOf(t) === i; }).slice(0, 8);
        convo.topUrl = top.url || '';
        // S195: cross-surface quest flag — asking IGNIS completes a rank-quest step.
        try { localStorage.setItem('vs_quest_ask', '1'); } catch (_e) {}
        // S206 #15: write prefix cache entry for this successful answer.
        writePrefixCache(q, result.text.slice(0, 180));
        // S199 L2: persist query + timestamp; max 10, deduplicate by text.
        try {
          var rawHist = JSON.parse(localStorage.getItem('vs_ignis_history') || '[]');
          var qText = q.slice(0, 80);
          // Normalise legacy entries (plain strings from S198) to {query, ts} objects.
          var hist = rawHist.map(function (e) { return typeof e === 'string' ? { query: e, ts: 0 } : e; });
          hist = [{ query: qText, ts: Date.now() }].concat(hist.filter(function (e) { return e.query !== qText; })).slice(0, 10);
          localStorage.setItem('vs_ignis_history', JSON.stringify(hist));
        } catch (_e) {}
        // S201 synthesis: record query + top source for session digest.
        var topDoc = result.sources[0] || {};
        sessionQueries.push({ q: q.slice(0, 80), title: scrub(topDoc.title || ''), url: topDoc.url || '' });
        renderFollowUps(out, result.sources, runQuery);
        renderEntityChips(out, result, q, idx, runQuery); // S211 Wave 3
        if (sessionQueries.length >= 2) renderSynthesisHint(out, runQuery);
        renderRelated(out, topDoc, runQuery);
        // S205 #8 L1: Cmd+K IGNIS terminal — escape hatch to /ignis/ with query pre-filled.
        // Lets inline answers escalate to the full oracle surface in one click.
        (function addDeepDiveLink() {
          var prev = out.querySelector('.vs-ask-ignis__deepdive');
          if (prev) prev.parentNode.removeChild(prev);
          var link = document.createElement('a');
          link.className = 'vs-ask-ignis__deepdive';
          link.href = '/oracle/?q=' + encodeURIComponent(q.slice(0, 200));
          link.textContent = '→ Explore this in IGNIS';
          link.setAttribute('data-track-event', 'oracle_deepdive_click');
          link.addEventListener('click', function () { try { emitUx('oracle:deepdive_click'); } catch(_){} });
          out.appendChild(link);
        })();
      });
    }

    // S201 synthesis: after 2+ queries, show a one-tap digest trigger.
    function renderSynthesisHint(container, run) {
      if (container.querySelector('.vs-ignis-synthesize')) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vs-ask-ignis__followup vs-ignis-synthesize';
      btn.textContent = 'Synthesize my session →';
      btn.addEventListener('click', function () {
        emitUx('engagement:ignis_synthesis_opened');
        renderSynthesisCard(container);
      });
      container.appendChild(btn);
    }

    function renderSynthesisCard(container) {
      var existing = container.querySelector('.vs-ignis-synthesis-card');
      if (existing) { existing.hidden = !existing.hidden; return; }

      var card = document.createElement('div');
      card.className = 'vs-ignis-synthesis-card';
      card.setAttribute('role', 'region');
      card.setAttribute('aria-label', 'IGNIS session digest');

      var header = document.createElement('div');
      header.className = 'vs-ignis-synthesis-card__header';
      var badge = document.createElement('span');
      badge.className = 'vs-ignis-synthesis-card__badge';
      badge.textContent = 'SESSION DIGEST';
      var count = document.createElement('span');
      count.className = 'vs-ignis-synthesis-card__count';
      count.textContent = sessionQueries.length + ' topic' + (sessionQueries.length === 1 ? '' : 's') + ' explored';
      header.appendChild(badge);
      header.appendChild(count);
      card.appendChild(header);

      var list = document.createElement('div');
      list.className = 'vs-ignis-synthesis-card__list';
      sessionQueries.forEach(function (entry) {
        var row = document.createElement('div');
        row.className = 'vs-ignis-synthesis-card__row';
        var q = document.createElement('span');
        q.className = 'vs-ignis-synthesis-card__q';
        q.textContent = entry.q;
        row.appendChild(q);
        if (entry.title && entry.url) {
          var src = document.createElement('a');
          src.className = 'vs-ignis-synthesis-card__src';
          src.href = entry.url;
          src.textContent = entry.title;
          row.appendChild(src);
        }
        list.appendChild(row);
      });
      card.appendChild(list);

      // Top reads: deduped URLs from session
      var seen = {};
      var topReads = sessionQueries.filter(function (e) {
        if (!e.url || seen[e.url]) return false;
        seen[e.url] = true;
        return true;
      }).slice(0, 4);
      if (topReads.length) {
        var readsLabel = document.createElement('div');
        readsLabel.className = 'vs-ignis-synthesis-card__reads-label';
        readsLabel.textContent = 'Top reads from this session';
        card.appendChild(readsLabel);
        var readsRow = document.createElement('div');
        readsRow.className = 'vs-ignis-synthesis-card__reads';
        topReads.forEach(function (e) {
          var a = document.createElement('a');
          a.className = 'vs-ask-ignis__sources a';
          a.href = e.url;
          a.textContent = e.title || e.url;
          readsRow.appendChild(a);
        });
        card.appendChild(readsRow);
      }

      container.appendChild(card);
    }

    // Build up to 3 one-tap continuations: a "Tell me more" thread-deepener plus
    // the sibling docs this answer surfaced. Keeps the conversation moving without
    // a single extra network/LLM call (CANON-029 cost-neutral).
    function renderFollowUps(container, sources, run) {
      var sibs = (sources || []).slice(1, 3);
      var wrap = document.createElement('div');
      wrap.className = 'vs-ask-ignis__followups';
      var more = document.createElement('button');
      more.type = 'button';
      more.className = 'vs-ask-ignis__followup';
      more.textContent = 'Tell me more →';
      more.addEventListener('click', function () { emitUx('oracle-followup:more'); run('tell me more', 'followup'); });
      wrap.appendChild(more);
      sibs.forEach(function (doc) {
        if (!doc || !doc.title) return;
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'vs-ask-ignis__followup';
        b.textContent = scrub(doc.title);
        b.addEventListener('click', function () { emitUx('oracle-followup:sibling'); run(scrub(doc.title), 'followup'); });
        wrap.appendChild(b);
      });
      container.appendChild(wrap);
    }

    // S211 Wave 3: entity-derived follow-up chips — terms from the answer text (not
    // in the query) that match index doc titles, surfaced as "Dig deeper:" chips.
    // Distinct from renderFollowUps (sibling docs) and the graph traversal below
    // (catalog cards). These connect vocabulary in the answer back to knowledge graph nodes.
    function renderEntityChips(container, result, q, idx, run) {
      if (!result || !result.text || !idx || !Array.isArray(idx.documents)) return;
      var aToks = tokens(result.text);
      var qSet = {};
      tokens(q).forEach(function (t) { qSet[t] = true; });
      var aSet = {};
      aToks.forEach(function (t) { aSet[t] = true; });
      var existingUrls = {};
      (result.sources || []).forEach(function (s) { if (s && s.url) existingUrls[s.url] = true; });

      var scored = [];
      idx.documents.forEach(function (doc) {
        if (!doc || !doc.title || existingUrls[doc.url]) return;
        var tToks = tokens(doc.title);
        if (!tToks.length) return;
        var hits = tToks.filter(function (t) { return aSet[t] && !qSet[t]; }).length;
        if (hits > 0) scored.push({ doc: doc, hits: hits });
      });
      scored.sort(function (a, b) { return b.hits - a.hits; });
      var top = scored.slice(0, 3);
      if (!top.length) return;

      var wrap = document.createElement('div');
      wrap.className = 'vs-ask-ignis__followups vs-ask-ignis__followups--entities';
      var label = document.createElement('span');
      label.className = 'vs-ask-ignis__followup-label';
      label.textContent = 'Dig deeper:';
      wrap.appendChild(label);
      top.forEach(function (r) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'vs-ask-ignis__followup';
        b.textContent = scrub(r.doc.title);
        b.addEventListener('click', function () {
          emitUx('oracle:followup_click');
          run(scrub(r.doc.title), 'followup');
        });
        wrap.appendChild(b);
      });
      emitUx('oracle:followup_shown');
      container.appendChild(wrap);
    }

    // S205 #12: knowledge-graph related chips — entity-linked navigation from the top result.
    // S207 (ignis-graph-depth-l3): a chip now EXPANDS an in-place mini-catalog
    // sub-panel of matching cards from api/public-intelligence.json (graph
    // traversal) instead of only re-querying — the Oracle becomes a graph you
    // browse. Each card keeps a re-query fallback link.
    var _catalogPromise = null;
    function loadCatalog() {
      if (!_catalogPromise) {
        _catalogPromise = fetch('/api/public-intelligence.json', { cache: 'default' })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (d) { return (d && Array.isArray(d.catalog)) ? d.catalog : []; })
          .catch(function () { return []; });
      }
      return _catalogPromise;
    }

    // Up to 3 catalog cards related to the clicked entity: the entity itself
    // first (slug/name match), then same-type siblings.
    function matchCatalog(catalog, entity) {
      var key = (entity.slug || entity.label || '').toLowerCase();
      var label = (entity.label || '').toLowerCase();
      var self = catalog.filter(function (c) {
        return String(c.id).toLowerCase() === key || String(c.name).toLowerCase() === label;
      });
      var siblings = catalog.filter(function (c) {
        return entity.type && c.type === entity.type && self.indexOf(c) === -1;
      });
      return self.concat(siblings).slice(0, 3);
    }

    function renderMiniCatalog(panel, entity, run) {
      panel.textContent = '';
      loadCatalog().then(function (catalog) {
        var cards = matchCatalog(catalog, entity);
        panel.textContent = '';
        if (!cards.length) {
          // Honest-dark fallback: no catalog match → offer the re-query path.
          var ask = document.createElement('button');
          ask.type = 'button';
          ask.className = 'vs-ignis-catalog__ask';
          ask.textContent = 'Ask IGNIS about ' + entity.label + ' →';
          ask.addEventListener('click', function () { run(entity.label, 'related'); });
          panel.appendChild(ask);
          return;
        }
        cards.forEach(function (c) {
          var card = document.createElement(c.deployedUrl ? 'a' : 'div');
          card.className = 'vs-ignis-catalog__card';
          if (c.deployedUrl) { card.href = c.deployedUrl; card.rel = 'noopener'; }
          var name = document.createElement('div');
          name.className = 'vs-ignis-catalog__name';
          name.appendChild(document.createTextNode(c.name || c.id));
          if (c.status) {
            var st = document.createElement('span');
            st.className = 'vs-ignis-catalog__status';
            st.textContent = c.status;
            name.appendChild(st);
          }
          card.appendChild(name);
          if (c.note) {
            var note = document.createElement('p');
            note.className = 'vs-ignis-catalog__note';
            note.textContent = c.note;
            card.appendChild(note);
          }
          panel.appendChild(card);
        });
        // Re-query fallback under the cards.
        var ask = document.createElement('button');
        ask.type = 'button';
        ask.className = 'vs-ignis-catalog__ask';
        ask.textContent = 'Ask IGNIS about ' + entity.label + ' →';
        ask.addEventListener('click', function () { run(entity.label, 'related'); });
        panel.appendChild(ask);
      });
    }

    function renderRelated(container, topDoc, run) {
      var entities = topDoc && topDoc.relatedEntities;
      if (!entities || !entities.length) return;
      var prev = container.querySelector('.vs-ask-ignis__related');
      if (prev) prev.parentNode.removeChild(prev);
      var prevCat = container.querySelector('.vs-ignis-catalog');
      if (prevCat) prevCat.parentNode.removeChild(prevCat);

      var wrap = document.createElement('div');
      wrap.className = 'vs-ask-ignis__related';
      var lbl = document.createElement('span');
      lbl.className = 'vs-ask-ignis__related-label';
      lbl.textContent = 'Related:';
      wrap.appendChild(lbl);

      var panel = document.createElement('div');
      panel.className = 'vs-ignis-catalog';
      panel.hidden = true;

      entities.slice(0, 4).forEach(function (entity) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'vs-ask-ignis__related-chip';
        btn.textContent = entity.label;
        btn.setAttribute('aria-expanded', 'false');
        btn.addEventListener('click', function () {
          var open = btn.getAttribute('aria-expanded') === 'true';
          // Collapse sibling chips.
          wrap.querySelectorAll('.vs-ask-ignis__related-chip').forEach(function (b) {
            b.setAttribute('aria-expanded', 'false');
          });
          if (open) { panel.hidden = true; return; }
          btn.setAttribute('aria-expanded', 'true');
          emitUx('oracle:related_click');
          emitUx('oracle:graph_traverse');
          panel.hidden = false;
          renderMiniCatalog(panel, entity, run);
        });
        wrap.appendChild(btn);
      });
      container.appendChild(wrap);
      container.appendChild(panel);
    }

    // S211 Wave 2: history chips shown in the "Recent" tab of the unified tray.
    // Label removed — the tab itself ("Recent") serves as the section title.
    var _hasHistory = false;
    if (histEl) {
      try {
        var rawHist2 = JSON.parse(localStorage.getItem('vs_ignis_history') || '[]');
        var prevHist = rawHist2.map(function (e) { return typeof e === 'string' ? { query: e, ts: 0 } : e; }).slice(0, 5);
        if (prevHist.length && !form.q.value) {
          var row = document.createElement('div');
          row.className = 'vs-ask-ignis__history-row';
          prevHist.forEach(function (entry) {
            var qStr = entry.query || '';
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'vs-ask-ignis__history-chip';
            btn.textContent = qStr;
            btn.addEventListener('click', function () {
              emitUx('oracle-followup:history');
              form.q.value = qStr;
              runQuery(qStr, 'history');
            });
            row.appendChild(btn);
          });
          var clearBtn = document.createElement('button');
          clearBtn.type = 'button';
          clearBtn.className = 'vs-ask-ignis__history-clear';
          clearBtn.setAttribute('aria-label', 'Clear search history');
          clearBtn.textContent = '× clear';
          clearBtn.addEventListener('click', function () {
            try { localStorage.removeItem('vs_ignis_history'); } catch (_e) {}
            if (chips && chips.children.length) {
              activateTab('topics'); // fall back to Topics when Recent is cleared
            } else {
              if (tray) tray.hidden = true;
            }
          });
          row.appendChild(clearBtn);
          histEl.appendChild(row);
          _hasHistory = true;
        }
      } catch (_e) {}
    }

    // Show the tray now if we have sync content (history or context chips). Default tab:
    // "recent" when history exists, "topics" when only context chips are present.
    var _hasContextChips = chips && chips.children.length > 0;
    if (_hasHistory || _hasContextChips) {
      showTray(_hasHistory ? 'recent' : 'topics');
    }

    // S210 #5: offline cache fallback renderer.
    function renderOfflineFallback(container, q, run) {
      var cached = readPrefixCache();
      var frag = '<div class="vs-ignis-offline">';
      if (cached.length) {
        frag += '<p class="vs-ignis-offline__msg">Network unavailable — here\'s what the Forge remembered from your earlier session:</p>';
        frag += '<div class="vs-ignis-offline__list">';
        cached.slice(0, 5).forEach(function (entry) {
          frag += '<div class="vs-ignis-offline__row"><span class="vs-ignis-offline__q">' + esc(entry.q) + '</span><span class="vs-ignis-offline__excerpt">' + esc(entry.excerpt) + '</span></div>';
        });
        frag += '</div>';
      } else {
        frag += '<p class="vs-ignis-offline__msg">Network unavailable — the Forge is unreachable right now.</p>';
      }
      frag += '<button type="button" class="vs-ignis-offline__retry">Try again →</button></div>';
      container.innerHTML = vsHtml(frag);
      var retry = container.querySelector('.vs-ignis-offline__retry');
      if (retry) {
        retry.addEventListener('click', function () {
          indexPromise = null; // reset so next call re-fetches
          run(q, 'retry');
        });
      }
      emitUx('oracle:offline_cache_shown');
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      runQuery(form.q.value, 'typed');
    });

    // S205 #8: if page loaded with ?q= (e.g. from "Explore in IGNIS" deep-dive link),
    // pre-fill the input and auto-submit so the conversation continues seamlessly.
    (function autoSubmitFromURL() {
      try {
        var uq = new URLSearchParams(location.search).get('q');
        if (!uq || !uq.trim()) return;
        form.q.value = uq.slice(0, 200);
        // Slight delay so the engine is fully mounted before the query fires.
        setTimeout(function () { runQuery(form.q.value, 'url-param'); }, 150);
      } catch (_) {}
    })();

    // S186: kill the cold-start. Seed the empty input with up to 3 one-tap
    // question chips drawn from the real Oracle query clusters, so a visitor's
    // first interaction is a click, not a typed query. Honest: chips reflect
    // what the corpus can actually answer; public-safe (anonymous tier only).
    // S211 Wave 4: semantic theme classification for oracle cluster chips.
    var CLUSTER_THEMES = [
      { label: 'Games',     words: ['game', 'play', 'challenge', 'first', 'active', 'vault right'] },
      { label: 'Community', words: ['member', 'different', 'rank', 'join', 'tier', 'community'] },
      { label: 'Studio',    words: ['building', 'forge', 'vaultspark', 'studio', 'ship', 'new'] },
    ];
    function clusterTheme(query) {
      var q = (query || '').toLowerCase();
      for (var i = 0; i < CLUSTER_THEMES.length; i++) {
        var t = CLUSTER_THEMES[i];
        for (var j = 0; j < t.words.length; j++) {
          if (q.indexOf(t.words[j]) !== -1) return t.label;
        }
      }
      return 'Explore';
    }

    if (chips) {
      loadInsights().then(function (insights) {
        var clusters = (insights && insights.clusters || []).filter(function (c) {
          return c && c.query && (!c.tier || c.tier === 'anonymous');
        });
        if (!clusters.length) return;

        // Group by semantic theme
        var groups = {};
        clusters.forEach(function (c) {
          var theme = clusterTheme(c.query);
          if (!groups[theme]) groups[theme] = [];
          groups[theme].push(c);
        });

        Object.keys(groups).forEach(function (theme) {
          var group = document.createElement('div');
          group.className = 'vs-ask-ignis__cluster-group';
          var lbl = document.createElement('span');
          lbl.className = 'vs-ask-ignis__cluster-label';
          lbl.textContent = theme;
          group.appendChild(lbl);
          groups[theme].forEach(function (c) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'vs-ask-ignis__chip';
            btn.textContent = c.query;
            btn.addEventListener('click', function () {
              form.q.value = c.query;
              emitUx('oracle-chip:click');
              runQuery(c.query, 'chip', c.key);
            });
            group.appendChild(btn);
          });
          chips.appendChild(group);
        });

        if (tray && tray.hidden) showTray('topics');
        emitUx('oracle-chip:shown');
      });
    }
  }

  // S210 #1: page-aware contextual query chips.
  var PAGE_QUERIES = {
    '/games/':       ['What games are in development?', 'Which games are playable now?', 'When does the next game launch?'],
    '/projects/':    ['What projects are currently SPARKED?', 'What\'s in The Forge right now?', 'Which projects are Vaulted?'],
    '/membership/':  ['What does Vault membership include?', 'How does the free tier work?', 'What\'s the difference between tiers?'],
    '/oracle/':      ['What can IGNIS tell me about the studio?', 'What shipped recently?', 'What\'s the most innovative project?'],
    '/ignis/':       ['What can IGNIS tell me about the studio?', 'What shipped recently?', 'What\'s the most innovative project?'],
    '/press/':       ['What is VaultSpark Studios?', 'What games has the studio shipped?', 'How do I contact the studio?'],
    '/vault-member/':['What perks do I get as a member?', 'How do I manage my membership?', 'What\'s coming for members?'],
    '/changelog/':   ['What shipped in the last month?', 'What was the biggest recent change?', 'What\'s next on the roadmap?'],
    '/':             ['What is VaultSpark Studios building?', 'What are the flagship projects?', 'How do I become a Vault member?'],
  };

  function getContextQueries() {
    var path = (window.location.pathname || '/').replace(/\/?$/, '/').toLowerCase();
    // exact match first, then prefix match (handles subpaths like /games/voidfall/)
    if (PAGE_QUERIES[path]) return PAGE_QUERIES[path];
    var keys = Object.keys(PAGE_QUERIES);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i] !== '/' && path.indexOf(keys[i]) === 0) return PAGE_QUERIES[keys[i]];
    }
    return PAGE_QUERIES['/'];
  }

  function boot() {
    var roots = Array.prototype.slice.call(document.querySelectorAll('[data-ask-ignis]'));
    if (!roots.length && (location.pathname.indexOf('/search') === 0 || location.pathname.indexOf('/oracle') === 0)) {
      var main = document.querySelector('main');
      if (main) {
        var wrap = document.createElement('section');
        wrap.className = 'container';
        wrap.id = 'ask-ignis';
        wrap.setAttribute('data-ask-ignis', '');
        main.insertBefore(wrap, main.firstElementChild ? main.firstElementChild.nextSibling : null);
        roots.push(wrap);
      }
    }
    var cq = getContextQueries(); // S210 #1
    roots.forEach(function (r) { mount(r, cq); });
  }

  var INSIGHTS_URL = '/api/oracle-insights.json';
  var insightsPromise = null;
  var _insightsData = null; // S219: resolved insights cached for synchronous live-answer lookup
  function loadInsights() {
    if (!insightsPromise) {
      insightsPromise = fetch(INSIGHTS_URL, { cache: 'default' })
        .then(function (r) { return r.json(); })
        .then(function (d) { _insightsData = d; return d; })
        .catch(function () { return { clusters: [] }; });
    }
    return insightsPromise;
  }
  // S219 oracle-live-answers: the current live one-liner for a query's cluster,
  // if insights are already warm. Returns '' when unavailable (graceful).
  function liveAnswerFor(query) {
    if (!_insightsData) return '';
    var cl = findCluster(_insightsData, query);
    return (cl && cl.liveAnswer) ? scrub(cl.liveAnswer) : '';
  }

  function findCluster(hints, query) {
    var q = String(query || '').toLowerCase();
    var clusters = hints.clusters || [];
    var best = null, bestScore = 0;
    for (var i = 0; i < clusters.length; i++) {
      var c = clusters[i];
      var tokens = c.tokens || [];
      var score = tokens.filter(function (t) { return q.indexOf(t) !== -1; }).length;
      if (score > bestScore) { bestScore = score; best = c; }
    }
    return bestScore > 0 ? best : (clusters[0] || null);
  }

  function showHint(el, hint) {
    if (el.querySelector('.vs-ignis-proactive')) return;
    var wrap = document.createElement('div');
    wrap.className = 'vs-ignis-proactive';
    var label = document.createElement('span');
    label.className = 'vs-ignis-proactive__label';
    label.textContent = 'IGNIS:';
    wrap.appendChild(label);
    // S219 oracle-live-answers: lead with the cluster's LIVE answer (current
    // game counts, latest ship, leaderboard state, rank tiers) when present —
    // the proactive hint then reflects the studio's actual live state, not a
    // static page link. Falls back to the top doc link, then a generic msg.
    if (hint && hint.liveAnswer) {
      var live = document.createElement('span');
      live.className = 'vs-ignis-proactive__msg';
      live.textContent = scrub(hint.liveAnswer);
      wrap.appendChild(live);
      if (hint.topDocs && hint.topDocs.length) {
        var more = document.createElement('a');
        more.className = 'vs-ignis-proactive__link vs-ignis-proactive__more';
        more.href = esc(hint.topDocs[0].url || '/');
        more.textContent = 'More →';
        more.addEventListener('click', function () { emitUx('ignis-hint:click'); });
        wrap.appendChild(more);
      }
    } else if (hint && hint.topDocs && hint.topDocs.length) {
      var doc = hint.topDocs[0];
      var link = document.createElement('a');
      link.className = 'vs-ignis-proactive__link';
      link.href = esc(doc.url || '/');
      link.textContent = doc.title || 'Related page';
      link.addEventListener('click', function () { emitUx('ignis-hint:click'); });
      wrap.appendChild(link);
    } else {
      var msg = document.createElement('span');
      msg.className = 'vs-ignis-proactive__msg';
      msg.textContent = 'Ask me about this project';
      wrap.appendChild(msg);
    }
    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'vs-ignis-proactive__close';
    close.setAttribute('aria-label', 'Dismiss IGNIS hint');
    close.textContent = '×';
    close.addEventListener('click', function () { emitUx('ignis-hint:dismissed'); if (wrap.parentNode) wrap.parentNode.removeChild(wrap); });
    wrap.appendChild(close);
    el.appendChild(wrap);
    emitUx('ignis-hint:shown');
  }

  function watchHints() {
    if (!('IntersectionObserver' in window)) return;
    var timers = new WeakMap();
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var el = entry.target;
        if (entry.isIntersecting) {
          if (!timers.has(el)) {
            var tid = setTimeout(function () {
              timers.delete(el);
              var hintQuery = el.dataset.ignisHint || '';
              loadInsights().then(function (insights) {
                var cluster = findCluster(insights, hintQuery);
                showHint(el, cluster);
              });
            }, 20000);
            timers.set(el, tid);
          }
        } else {
          if (timers.has(el)) { clearTimeout(timers.get(el)); timers.delete(el); }
        }
      });
    }, { threshold: 0.4 });

    function scanAndObserve() {
      var hinted = Array.prototype.slice.call(document.querySelectorAll('[data-ignis-hint]'));
      hinted.forEach(function (el) { observer.observe(el); });
    }

    scanAndObserve();
    // Re-scan after dynamic cards render (oracle page async)
    setTimeout(scanAndObserve, 2000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // Proactive hints — oracle and search pages only.
  (function () {
    var path = location.pathname;
    if (path.indexOf('/oracle') === 0 || path.indexOf('/search') === 0) {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchHints);
      else watchHints();
    }
  }());

  window.VSIgnisAnswer = { loadIndex: loadIndex, answer: answer, ask: ask, isFollowUp: isFollowUp, loadInsights: loadInsights };
})();
