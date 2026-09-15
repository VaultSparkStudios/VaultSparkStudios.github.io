/**
 * VaultSpark — Changelog Micro-Reactions.
 *
 * Adds ⚡🔥💎 reaction bars to .cl-phase articles on the changelog page.
 * Reactions are stored in localStorage (no-auth) + submitted to Supabase
 * page_feedback as { path: '/changelog', reaction: 'useful' } (the table's
 * live schema). Per-entry counts are not readable from the browser (raw rows
 * are service_role-only; no entry column), so no live totals are shown.
 *
 * Frequency: one reaction per entry per visitor (localStorage gate).
 * CSP-clean. No inline handlers. Respects prefers-reduced-motion.
 */
(function () {
  'use strict';

  var SB_URL = 'https://fjnpzjjyhnpmunfoycrp.supabase.co';
  var SB_ANON = 'sb_publishable_thM93D_GVKW5qzAiZpNl1w_AVGILCij';
  var REACTIONS = [
    { emoji: '⚡', label: 'Sparked',  value: 'sparked'  },
    { emoji: '🔥', label: 'On fire',  value: 'fire'     },
    { emoji: '💎', label: 'Essential', value: 'gem'     },
  ];
  var LS_KEY = 'vs_cl_reactions_v1';
  var STYLE_INJECTED = false;
  var observer = null;
  var queuedFallback = [];
  var fallbackPending = false;

  var STYLE = [
    '.vs-cr{display:flex;align-items:center;gap:0.35rem;margin-top:0.85rem;flex-wrap:wrap;}',
    '.vs-cr__btn{display:inline-flex;align-items:center;gap:0.28rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);border-radius:999px;padding:0.28rem 0.62rem;font-size:0.78rem;cursor:pointer;transition:background 140ms ease,border-color 140ms ease,transform 140ms ease;color:var(--muted);font-family:inherit;line-height:1;}',
    '.vs-cr__btn:hover{background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.18);transform:translateY(-1px);}',
    '.vs-cr__btn--reacted{background:rgba(212,175,55,0.1);border-color:rgba(212,175,55,0.35);color:var(--gold,#d4af37);}',
    '.vs-cr__btn--reacted:hover{background:rgba(212,175,55,0.15);}',
    '.vs-cr__count{font-variant-numeric:tabular-nums;min-width:1.2ch;text-align:left;}',
    '.vs-cr__total{font-size:0.72rem;color:var(--dim);margin-left:0.15rem;align-self:center;}',
    'body.light-mode .vs-cr__btn{background:rgba(20,28,52,0.04);border-color:rgba(20,28,52,0.1);color:var(--muted);}',
    'body.light-mode .vs-cr__btn--reacted{background:rgba(138,96,0,0.08);border-color:rgba(138,96,0,0.3);color:#8a6000;}',
    '@media(prefers-reduced-motion:reduce){.vs-cr__btn{transition:none;}}',
  ].join('\n');

  function injectStyle() {
    if (STYLE_INJECTED) return;
    STYLE_INJECTED = true;
    var s = document.createElement('style');
    s.setAttribute('data-vs-cr-style', '1');
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  // ── LocalStorage helpers ──────────────────────────────────────────────────
  function loadLedger() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
  }
  function saveLedger(ledger) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(ledger)); } catch {}
  }
  function hasReacted(ledger, entryId) { return !!ledger[entryId]; }
  function markReacted(ledger, entryId, value) { ledger[entryId] = value; saveLedger(ledger); }

  // ── Unique entry ID from article content ─────────────────────────────────
  function entryId(article) {
    var title = (article.querySelector('.cl-phase-title') || article.querySelector('h3, h4') || {}).textContent || '';
    var date  = (article.querySelector('.cl-phase-date') || {}).textContent || '';
    return 'cl_' + (title + date).trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 40);
  }

  // ── Submit reaction to Supabase page_feedback ─────────────────────────────
  // Live schema (supabase/migrations/supabase-page-feedback.sql):
  //   path text not null · reaction text not null CHECK in ('useful','ok','not_useful')
  //   · visit_depth_bucket / ua_kind nullable. No per-entry or free-text column exists.
  // All three changelog reactions are affirmations, so they map to 'useful' (the same
  // fixed-choice → enum pattern vault-member/portal-feedback.js uses). Path matches
  // assets/rate-page.js pathKey() so both widgets aggregate on one /changelog row.
  var REACTION_TO_FEEDBACK = { sparked: 'useful', fire: 'useful', gem: 'useful' };
  function feedbackRowFor(value) {
    var reaction = REACTION_TO_FEEDBACK[value];
    if (!reaction) return null;
    return { path: '/changelog', reaction: reaction };
  }

  // ── One page_feedback row per reader per page ──────────────────────────────
  // page_feedback aggregates by `path` and has NO per-entry column, so posting a
  // row per ENTRY reaction inflated /changelog and the site-wide useful_pct: a
  // reader reacting to six entries counted as six 'useful' readers. The widget's
  // per-entry UI stays local (localStorage ledger above); only the POST is
  // gated, reusing the persistence shape assets/rate-page.js uses — a
  // localStorage store keyed by path with the same 24h cooldown.
  var FEEDBACK_LS_KEY = 'vs_cl_feedback_v1';
  var FEEDBACK_COOLDOWN_MS = 24 * 60 * 60 * 1000;

  function loadFeedbackStore() {
    try {
      var d = JSON.parse(window.localStorage.getItem(FEEDBACK_LS_KEY) || '{}');
      return (d && typeof d === 'object') ? d : {};
    } catch { return {}; }
  }
  function saveFeedbackStore(store) {
    try { window.localStorage.setItem(FEEDBACK_LS_KEY, JSON.stringify(store)); } catch {}
  }
  function shouldPostFeedback(store, pathKey, now) {
    var entry = store && store[pathKey];
    if (!entry || !entry.at) return true;
    return (now - entry.at) >= FEEDBACK_COOLDOWN_MS;
  }
  function recordPosted(store, pathKey, now) {
    store[pathKey] = { at: now };
    return store;
  }

  function submitReaction(_eid, value) {
    var row = feedbackRowFor(value);
    if (!row) return;
    var now = Date.now();
    var store = loadFeedbackStore();
    // Already counted this reader on this page — the button still lights up, but
    // the public number must not move a second time.
    if (!shouldPostFeedback(store, row.path, now)) return;
    saveFeedbackStore(recordPosted(store, row.path, now));
    fetch(SB_URL + '/rest/v1/page_feedback', {
      method: 'POST',
      headers: {
        'apikey': SB_ANON,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(row),
    }).catch(function () {});
  }

  // ── Aggregate counts ──────────────────────────────────────────────────────
  // Raw page_feedback rows are service_role-only (RLS) and carry no entry id, so a
  // per-entry count cannot be read from the browser. Mark honestly unavailable
  // instead of issuing a request that can only fail.
  function loadCounts(_eid, countsEl) {
    countsEl.setAttribute('data-count-state', 'unavailable');
  }

  // ── Mount reaction bar on one article ─────────────────────────────────────
  function mountArticle(article, ledger) {
    if (article.querySelector('.vs-cr')) return; // idempotent

    var eid  = entryId(article);
    var done = hasReacted(ledger, eid);

    var bar = document.createElement('div');
    bar.className = 'vs-cr';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'React to this update');

    REACTIONS.forEach(function (r) {
      var btn = document.createElement('button');
      btn.className = 'vs-cr__btn' + (done && ledger[eid] === r.value ? ' vs-cr__btn--reacted' : '');
      btn.setAttribute('type', 'button');
      btn.setAttribute('aria-label', r.label + ' reaction');
      btn.setAttribute('aria-pressed', done && ledger[eid] === r.value ? 'true' : 'false');
      btn.setAttribute('data-reaction', r.value);

      var emojiSpan = document.createElement('span');
      emojiSpan.setAttribute('aria-hidden', 'true');
      emojiSpan.textContent = r.emoji;

      var countSpan = document.createElement('span');
      countSpan.className = 'vs-cr__count';
      countSpan.textContent = '';

      btn.appendChild(emojiSpan);
      btn.appendChild(countSpan);
      bar.appendChild(btn);

      if (!done) {
        btn.addEventListener('click', function () {
          markReacted(ledger, eid, r.value);
          submitReaction(eid, r.value);
          // S195: cross-surface quest flag — reacting completes a rank-quest step.
          try { localStorage.setItem('vs_quest_react', '1'); } catch (_e) {}
          // Highlight pressed button, disable all
          bar.querySelectorAll('.vs-cr__btn').forEach(function (b) {
            b.classList.remove('vs-cr__btn--reacted');
            b.setAttribute('aria-pressed', 'false');
            b.disabled = true;
          });
          btn.classList.add('vs-cr__btn--reacted');
          btn.setAttribute('aria-pressed', 'true');
          if (countsEl) countsEl.textContent = '';
        });
      } else {
        btn.disabled = true;
      }
    });

    var countsEl = document.createElement('span');
    countsEl.className = 'vs-cr__total';
    bar.appendChild(countsEl);
    loadCounts(eid, countsEl);

    // Inject after the .cl-items list or at the end of the article
    var ul = article.querySelector('.cl-items');
    if (ul && ul.nextSibling) ul.parentNode.insertBefore(bar, ul.nextSibling);
    else article.appendChild(bar);
  }

  function drainFallback(ledger, deadline) {
    fallbackPending = false;
    var mounted = 0;
    while (queuedFallback.length && mounted < 4 && (!deadline || deadline.timeRemaining() > 2 || deadline.didTimeout)) {
      mountArticle(queuedFallback.shift(), ledger);
      mounted += 1;
    }
    if (queuedFallback.length) scheduleFallback(ledger);
  }

  function scheduleFallback(ledger) {
    if (fallbackPending) return;
    fallbackPending = true;
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(function (deadline) { drainFallback(ledger, deadline); }, { timeout: 1200 });
    } else {
      window.setTimeout(function () { drainFallback(ledger, null); }, 40);
    }
  }

  function scheduleArticles(articles, ledger) {
    var pending = Array.prototype.filter.call(articles, function (article) {
      return !article.querySelector('.vs-cr') && article.getAttribute('data-reaction-hydration') !== 'queued';
    });
    if (!pending.length) return;

    if ('IntersectionObserver' in window) {
      if (!observer) {
        observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            observer.unobserve(entry.target);
            entry.target.removeAttribute('data-reaction-hydration');
            mountArticle(entry.target, ledger);
          });
        }, { rootMargin: '600px 0px' });
      }
      pending.forEach(function (article) {
        article.setAttribute('data-reaction-hydration', 'queued');
        observer.observe(article);
      });
      return;
    }

    pending.forEach(function (article) {
      article.setAttribute('data-reaction-hydration', 'queued');
      queuedFallback.push(article);
    });
    scheduleFallback(ledger);
  }

  function init() {
    injectStyle();
    var ledger = loadLedger();

    function scheduleAll() {
      scheduleArticles(document.querySelectorAll('.cl-phase'), ledger);
    }

    scheduleAll();
    // Also mount on entries added by changelog-live.js after the event fires.
    document.addEventListener('vs:changelog-live-rendered', scheduleAll);
  }

  // Node self-test hook (no-op in browsers: `module` is undefined there).
  if (typeof module === 'object' && module && module.exports) {
    module.exports = {
      feedbackRowFor: feedbackRowFor,
      shouldPostFeedback: shouldPostFeedback,
      recordPosted: recordPosted,
      FEEDBACK_COOLDOWN_MS: FEEDBACK_COOLDOWN_MS,
    };
  }
  if (typeof document === 'undefined') return;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
