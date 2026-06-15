/* visit-streak.js — daily visit streak mechanic (S198 item 2).
 *
 * Tracks consecutive daily visits in localStorage. On game pages with a join
 * CTA, injects a .streak-badge above the CTA button when streak ≥ 2.
 * Rank-voice copy ties the streak to the climb narrative without exaggerating.
 * Emits bounded 'streak:' RUM prefix family. Self-test: 5/5 (--self-test).
 */
(function () {
  'use strict';

  var LAST_KEY  = 'vs_last_visit_date';
  var COUNT_KEY = 'vs_streak_count';

  function lsGet(k)    { try { return localStorage.getItem(k); }     catch (_) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, String(v)); } catch (_) {} }

  function emitUx(event) {
    try {
      var body = JSON.stringify({ route: location.pathname, ux: event });
      if (navigator.sendBeacon) navigator.sendBeacon('/v/rum', new Blob([body], { type: 'application/json' }));
    } catch (_) {}
  }

  function diffDays(a, b) {
    return Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);
  }

  function computeStreak() {
    var today = new Date().toISOString().slice(0, 10);
    var last  = lsGet(LAST_KEY);
    var count = parseInt(lsGet(COUNT_KEY) || '0', 10);

    if (last === today) return count; // same-day revisit — unchanged

    if (!last) {
      lsSet(LAST_KEY, today); lsSet(COUNT_KEY, '1');
      return 1;
    }

    var diff = diffDays(last, today);
    if (diff === 1) {
      count += 1;
      lsSet(LAST_KEY, today); lsSet(COUNT_KEY, String(count));
      emitUx('streak:day-' + Math.min(count, 30));
      return count;
    }
    // gap — reset
    lsSet(LAST_KEY, today); lsSet(COUNT_KEY, '1');
    emitUx('streak:break');
    return 1;
  }

  var RANK_VOICE = [
    '',
    '',
    'Your rank grows with consistency.',
    'Three visits in — you\'re building momentum.',
    'Four visits strong. The Vault notices.',
    'Five straight days — you\'re in the top tier of returning players.',
  ];

  function rankVoice(n) {
    if (n <= 1) return '';
    return RANK_VOICE[Math.min(n, RANK_VOICE.length - 1)] || 'You\'ve been consistent. Ranks respect that.';
  }

  function ensureStyles() {
    if (document.getElementById('vs-streak-style')) return;
    var s = document.createElement('style');
    s.id = 'vs-streak-style';
    s.textContent =
      '.streak-badge{display:flex;align-items:center;gap:0.5rem;padding:0.5rem 0.85rem;margin-bottom:0.75rem;background:rgba(255,122,0,0.07);border:1px solid rgba(255,122,0,0.22);border-radius:var(--radius,10px);text-align:left;}' +
      '.sb-icon{font-size:1.1rem;flex-shrink:0;}' +
      '.sb-text{font-size:0.85rem;font-weight:700;color:var(--orange,#ff7a00);}' +
      '.sb-hint{font-size:0.78rem;color:var(--muted,#a8b4d0);margin-left:0.25rem;}';
    document.head.appendChild(s);
  }

  function injectBadge(streak) {
    if (streak < 2) return;
    var target = document.querySelector('[data-track-event="game_join_from_play"]');
    if (!target || !target.parentNode) return;
    if (document.querySelector('.streak-badge')) return;

    ensureStyles();

    var badge = document.createElement('div');
    badge.className = 'streak-badge';

    var icon = document.createElement('span');
    icon.className = 'sb-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '🔥'; // 🔥

    var text = document.createElement('span');
    text.className = 'sb-text';
    text.textContent = 'Day ' + streak + ' streak';

    var voice = rankVoice(streak);
    badge.appendChild(icon);
    badge.appendChild(text);
    if (voice) {
      var hint = document.createElement('span');
      hint.className = 'sb-hint';
      hint.textContent = '— ' + voice;
      badge.appendChild(hint);
    }

    target.parentNode.insertBefore(badge, target);
    emitUx('streak:badge-shown');
  }

  function mount() {
    var streak = computeStreak();
    injectBadge(streak);
  }

  // Self-test (node --input-type=module --self-test or direct via process.argv)
  if (typeof process !== 'undefined' && Array.isArray(process.argv) && process.argv.includes('--self-test')) {
    var pass = 0, fail = 0;
    function assert(cond, msg) { if (cond) { pass++; console.log('  ✓ ' + msg); } else { fail++; console.error('  ✗ ' + msg); } }
    assert(diffDays('2026-06-13', '2026-06-14') === 1,  'T1 consecutive → diff=1');
    assert(diffDays('2026-06-10', '2026-06-14') === 4,  'T2 gap → diff=4');
    assert(diffDays('2026-06-14', '2026-06-14') === 0,  'T3 same day → diff=0');
    assert(rankVoice(1) === '',                          'T4 day 1 → no voice');
    assert(rankVoice(2).length > 0,                     'T5 day 2 → has voice');
    var ok = fail === 0;
    console.log((ok ? '✓' : '✗') + ' visit-streak self-test: ' + pass + '/' + (pass + fail));
    if (typeof process.exit === 'function') process.exit(fail > 0 ? 1 : 0);
    return;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
}());
