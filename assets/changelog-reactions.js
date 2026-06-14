/**
 * VaultSpark — Changelog Micro-Reactions.
 *
 * Adds ⚡🔥💎 reaction bars to .cl-phase articles on the changelog page.
 * Reactions are stored in localStorage (no-auth) + submitted to Supabase
 * page_feedback for aggregation. Aggregated counts are loaded from Supabase
 * on page load and displayed as live totals.
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
  function submitReaction(eid, value) {
    fetch(SB_URL + '/rest/v1/page_feedback', {
      method: 'POST',
      headers: {
        'apikey': SB_ANON,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        page_path: '/changelog/',
        question: 'changelog_reaction',
        answer: eid + ':' + value,
        session_id: (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).slice(2)),
      }),
    }).catch(function () {});
  }

  // ── Load aggregate counts from Supabase (best-effort) ────────────────────
  function loadCounts(eid, countsEl) {
    fetch(SB_URL + '/rest/v1/page_feedback?page_path=eq./changelog/&question=eq.changelog_reaction&answer=like.' + encodeURIComponent(eid + ':%'), {
      headers: { 'apikey': SB_ANON, 'Prefer': 'count=exact', 'Range': '0-0' },
    }).then(function (r) {
      var count = parseInt(r.headers.get('Content-Range')?.split('/')[1] || '0', 10) || 0;
      if (count > 0 && countsEl) countsEl.textContent = count + ' reaction' + (count === 1 ? '' : 's');
    }).catch(function () {});
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

  function init() {
    injectStyle();
    var ledger = loadLedger();

    function mountAll() {
      document.querySelectorAll('.cl-phase').forEach(function (a) {
        mountArticle(a, ledger);
      });
    }

    mountAll();
    // Also mount on entries added by changelog-live.js after the event fires.
    document.addEventListener('vs:changelog-live-rendered', mountAll);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
