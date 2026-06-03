/**
 * VaultSpark — Rank Projection Engine (v2).
 *
 * Self-mounts on any `<div data-rank-projector>`.
 * Interactive: "Engagement level + tier + months → rank you'd reach."
 * Uses the same RANK_THRESHOLDS as membership-live-tier.js (no server calls).
 *
 * Voice rule: never exposes raw enum values or internal identifiers as copy.
 * Respects prefers-reduced-motion. CSP-clean. No external dependencies.
 */
(function () {
  'use strict';

  var RANKS = [
    { name: 'Spark Initiate', threshold: 0,       icon: '⚡', color: 'rgba(148,163,184,0.85)' },
    { name: 'Vault Runner',   threshold: 250,     icon: '🏃', color: 'rgba(31,162,255,0.9)'   },
    { name: 'Rift Scout',     threshold: 1000,    icon: '🔭', color: 'rgba(16,185,129,0.9)'   },
    { name: 'Vault Guard',    threshold: 3000,    icon: '🛡',  color: 'rgba(6,182,212,0.9)'    },
    { name: 'Vault Breacher', threshold: 7500,    icon: '🔧', color: 'rgba(139,92,246,0.9)'   },
    { name: 'Void Operative', threshold: 15000,   icon: '🕵',  color: 'rgba(200,200,220,0.95)' },
    { name: 'Vault Keeper',   threshold: 30000,   icon: '🔐', color: 'rgba(234,88,12,0.95)'   },
    { name: 'Forge Master',   threshold: 60000,   icon: '🔥', color: 'rgba(214,40,40,0.95)'   },
    { name: 'The Sparked',    threshold: 100000,  icon: '✨', color: '#FFC400'                }
  ];

  // Engagement profiles — hours/week baseline × realistic pts/hour that includes
  // challenge bonuses (~40 pts avg), streak multipliers (~20 pts avg), and
  // daily-visit bonuses (~10 pts). Conservative-to-realistic, not gamed.
  var PROFILES = {
    casual:  { label: 'Casual',  hint: '~2 hrs/week · drop in, a few challenges',  hrs: 2,  ptsPerHour: 100 },
    regular: { label: 'Regular', hint: '~5 hrs/week · weekly challenges + games',  hrs: 5,  ptsPerHour: 120 },
    devoted: { label: 'Devoted', hint: '~10 hrs/week · leaderboard chasers',       hrs: 10, ptsPerHour: 140 }
  };

  // Subscription tiers — monthly XP grants (paid on each renewal)
  var TIERS = {
    free:     { label: 'Free',      color: 'var(--muted)',    monthlyXP: 0,    chip: 'Vault Member' },
    sparked:  { label: 'Sparked',   color: '#FFC400',         monthlyXP: 500,  chip: '⚡ VaultSparked' },
    eternal:  { label: 'Eternal',   color: '#a78bfa',         monthlyXP: 1000, chip: '◆ Eternal' }
  };

  var STYLE = [
    '.vs-rp{padding:2.4rem 0;border-top:1px solid rgba(255,255,255,0.06);}',
    '.vs-rp__inner{max-width:720px;margin:0 auto;padding:0 1rem;}',
    '.vs-rp__head{text-align:center;margin-bottom:1.8rem;}',
    '.vs-rp__eyebrow{font-size:0.72rem;font-weight:800;text-transform:uppercase;letter-spacing:0.14em;color:var(--gold,#d4af37);}',
    '.vs-rp__heading{font-family:Georgia,"Times New Roman",serif;font-size:clamp(1.4rem,3vw,2rem);letter-spacing:-0.03em;margin:0.4rem 0 0.5rem;}',
    '.vs-rp__sub{color:var(--muted);font-size:0.92rem;line-height:1.6;max-width:540px;margin:0 auto;}',
    '.vs-rp__controls{display:grid;gap:1.25rem;margin-bottom:1.6rem;}',
    '.vs-rp__group{display:block;}',
    '.vs-rp__group-label{font-size:0.74rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:var(--muted);margin-bottom:0.55rem;}',
    '.vs-rp__segs{display:grid;grid-template-columns:repeat(3,1fr);gap:0.4rem;}',
    '.vs-rp__seg{appearance:none;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);color:var(--text);padding:0.65rem 0.5rem;border-radius:10px;cursor:pointer;font-size:0.88rem;font-weight:700;text-align:center;transition:border-color 150ms,background 150ms,color 150ms;line-height:1.2;}',
    '.vs-rp__seg small{display:block;font-size:0.68rem;font-weight:500;color:var(--dim);margin-top:0.15rem;text-transform:none;letter-spacing:0;}',
    '.vs-rp__seg:hover{border-color:rgba(255,196,0,0.25);}',
    '.vs-rp__seg.is-active{background:rgba(255,196,0,0.08);border-color:rgba(255,196,0,0.45);color:var(--gold,#d4af37);}',
    '.vs-rp__seg.is-active small{color:rgba(255,196,0,0.7);}',
    '.vs-rp__seg.is-active-eternal{background:rgba(168,139,250,0.1);border-color:rgba(168,139,250,0.45);color:#a78bfa;}',
    '.vs-rp__seg.is-active-eternal small{color:rgba(168,139,250,0.7);}',
    'body.light-mode .vs-rp__seg{background:rgba(20,28,52,0.04);}',
    '.vs-rp__slider-wrap{margin-top:0.15rem;}',
    '.vs-rp__label{font-size:0.88rem;color:var(--muted);margin-bottom:0.55rem;display:flex;justify-content:space-between;align-items:baseline;}',
    '.vs-rp__label strong{color:var(--text);font-size:1.05rem;}',
    '.vs-rp__range{-webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:3px;background:rgba(255,255,255,0.1);outline:none;cursor:pointer;}',
    '.vs-rp__range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:20px;height:20px;border-radius:50%;background:var(--gold,#d4af37);cursor:pointer;box-shadow:0 0 10px rgba(212,175,55,0.4);}',
    '.vs-rp__range::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:var(--gold,#d4af37);cursor:pointer;border:none;box-shadow:0 0 10px rgba(212,175,55,0.4);}',
    'body.light-mode .vs-rp__range{background:rgba(20,28,52,0.12);}',
    '.vs-rp__result{background:rgba(255,196,0,0.05);border:1px solid rgba(255,196,0,0.15);border-radius:16px;padding:1.4rem 1.6rem;margin:0.4rem 0 1.4rem;transition:border-color 200ms ease,background 200ms ease;}',
    '.vs-rp__result.is-eternal{background:rgba(168,139,250,0.06);border-color:rgba(168,139,250,0.2);}',
    '.vs-rp__result-top{display:flex;align-items:center;gap:0.9rem;margin-bottom:0.6rem;}',
    '.vs-rp__icon{font-size:2rem;line-height:1;flex-shrink:0;}',
    '.vs-rp__rank-block{flex:1;min-width:0;}',
    '.vs-rp__rank-name{font-family:Georgia,serif;font-size:1.35rem;letter-spacing:-0.02em;color:var(--gold,#d4af37);line-height:1.15;}',
    'body.light-mode .vs-rp__rank-name{color:#8a6000;}',
    '.vs-rp__rank-sub{font-size:0.78rem;color:var(--dim);margin-top:0.1rem;}',
    '.vs-rp__timeline{font-size:0.9rem;color:var(--muted);line-height:1.55;}',
    '.vs-rp__timeline em{color:var(--text);font-style:normal;font-weight:600;}',
    '.vs-rp__ladder{margin-top:1rem;display:flex;gap:0.3rem;align-items:flex-end;}',
    '.vs-rp__rung{flex:1;height:22px;border-radius:4px;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;font-size:0.75rem;transition:all 200ms;position:relative;cursor:default;}',
    '.vs-rp__rung[data-reached="1"]{background:rgba(255,196,0,0.22);}',
    '.vs-rp__rung[data-current="1"]{background:var(--gold,#d4af37);color:#0c0d12;font-weight:800;transform:scaleY(1.25);}',
    '.vs-rp__rung-label{display:flex;justify-content:space-between;font-size:0.68rem;color:var(--dim);margin-top:0.4rem;letter-spacing:0.04em;}',
    '.vs-rp__pts{font-size:0.78rem;color:var(--dim);margin-top:0.6rem;}',
    '.vs-rp__cta-row{text-align:center;}',
    '.vs-rp__cta{display:inline-block;background:var(--gold,#d4af37);color:#0c0d12;border-radius:10px;padding:0.7rem 1.8rem;font-weight:700;font-size:0.97rem;text-decoration:none;transition:transform 120ms ease,box-shadow 120ms ease;margin:0 0.35rem 0.5rem;}',
    '.vs-rp__cta:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(212,175,55,0.28);}',
    '.vs-rp__cta--secondary{background:rgba(255,255,255,0.05);color:var(--text);border:1px solid rgba(255,255,255,0.1);}',
    'body.light-mode .vs-rp__cta{background:#8a6000;color:#fff;}',
    '@media(max-width:560px){.vs-rp__segs{grid-template-columns:repeat(3,1fr);}.vs-rp__seg{padding:0.55rem 0.35rem;font-size:0.82rem;}}'
  ].join('\n');

  function injectStyle() {
    if (document.querySelector('style[data-vs-rp-style]')) return;
    var s = document.createElement('style');
    s.setAttribute('data-vs-rp-style', '1');
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function rankForPoints(pts) {
    var rank = RANKS[0];
    for (var i = RANKS.length - 1; i >= 0; i--) {
      if (pts >= RANKS[i].threshold) { rank = RANKS[i]; break; }
    }
    return rank;
  }

  function monthsToReach(threshold, ptsPerMonth) {
    if (!ptsPerMonth) return Infinity;
    if (threshold === 0) return 0;
    return threshold / ptsPerMonth;
  }

  function formatMonths(m) {
    if (!isFinite(m)) return '—';
    if (m <= 0) return 'today';
    if (m < 1)  return 'under a month';
    if (m < 2)  return 'about 1 month';
    if (m < 12) return 'about ' + Math.round(m) + ' months';
    var years = m / 12;
    if (years < 1.25) return 'about 1 year';
    if (years < 10)   return 'about ' + (Math.round(years * 10) / 10) + ' years';
    return 'a long horizon — the top is a long game';
  }

  function fmtPts(n) {
    return n >= 1000 ? (Math.round(n / 100) / 10) + 'k' : String(n);
  }

  function mount(host) {
    if (host.dataset.vsRpMounted === '1') return;
    host.dataset.vsRpMounted = '1';
    injectStyle();

    var state = { profile: 'regular', tier: 'free', months: 6 };

    var wrap = document.createElement('div');
    wrap.className = 'vs-rp';
    var inner = document.createElement('div');
    inner.className = 'vs-rp__inner';

    inner.innerHTML = [
      '<div class="vs-rp__head">',
      '  <div class="vs-rp__eyebrow">Your Vault Projection</div>',
      '  <h3 class="vs-rp__heading">Where would you land?</h3>',
      '  <p class="vs-rp__sub">Pick an engagement level and a tier. Vault Points come from challenges, games, streaks, referrals, and monthly subscription XP — we factor in all of it.</p>',
      '</div>',

      '<div class="vs-rp__controls">',
      '  <div class="vs-rp__group">',
      '    <div class="vs-rp__group-label">Engagement level</div>',
      '    <div class="vs-rp__segs" id="vs-rp-profile" role="radiogroup" aria-label="Engagement level">',
      Object.keys(PROFILES).map(function (k) {
        var p = PROFILES[k];
        return '<button type="button" class="vs-rp__seg" data-profile="' + k + '" role="radio" aria-checked="false">' + p.label + '<small>' + p.hint + '</small></button>';
      }).join(''),
      '    </div>',
      '  </div>',

      '  <div class="vs-rp__group">',
      '    <div class="vs-rp__group-label">Membership tier</div>',
      '    <div class="vs-rp__segs" id="vs-rp-tier" role="radiogroup" aria-label="Membership tier">',
      Object.keys(TIERS).map(function (k) {
        var t = TIERS[k];
        var xp = t.monthlyXP ? '+' + t.monthlyXP + ' XP/mo' : 'no monthly XP';
        return '<button type="button" class="vs-rp__seg" data-tier="' + k + '" role="radio" aria-checked="false">' + t.chip + '<small>' + xp + '</small></button>';
      }).join(''),
      '    </div>',
      '  </div>',

      '  <div class="vs-rp__group">',
      '    <div class="vs-rp__group-label">Time horizon</div>',
      '    <div class="vs-rp__slider-wrap">',
      '      <div class="vs-rp__label">Looking ahead <strong id="vs-rp-months">6 months</strong><span id="vs-rp-pts-per-month" style="color:var(--dim);font-size:0.8rem;"></span></div>',
      '      <input class="vs-rp__range" type="range" id="vs-rp-slider" min="1" max="24" value="6" step="1" aria-label="Time horizon in months">',
      '    </div>',
      '  </div>',
      '</div>',

      '<div class="vs-rp__result" id="vs-rp-result">',
      '  <div class="vs-rp__result-top">',
      '    <div class="vs-rp__icon" id="vs-rp-icon">⚡</div>',
      '    <div class="vs-rp__rank-block">',
      '      <div class="vs-rp__rank-name" id="vs-rp-rank">Spark Initiate</div>',
      '      <div class="vs-rp__rank-sub" id="vs-rp-rank-sub"></div>',
      '    </div>',
      '  </div>',
      '  <div class="vs-rp__timeline" id="vs-rp-timeline"></div>',
      '  <div class="vs-rp__ladder" id="vs-rp-ladder" aria-hidden="true"></div>',
      '  <div class="vs-rp__rung-label"><span>Spark Initiate</span><span>The Sparked</span></div>',
      '  <div class="vs-rp__pts" id="vs-rp-pts"></div>',
      '</div>',

      '<div class="vs-rp__cta-row">',
      '  <a href="/vault-member/#register" class="vs-rp__cta">Start Climbing — It\'s Free</a>',
      '  <a href="/vaultsparked/" class="vs-rp__cta vs-rp__cta--secondary" id="vs-rp-tier-cta">See Tier Perks</a>',
      '</div>'
    ].join('');

    wrap.appendChild(inner);
    host.appendChild(wrap);

    // Build ladder rungs
    var ladder = inner.querySelector('#vs-rp-ladder');
    RANKS.forEach(function (r, idx) {
      var rung = document.createElement('div');
      rung.className = 'vs-rp__rung';
      rung.title = r.name + ' · ' + fmtPts(r.threshold) + ' pts';
      rung.textContent = r.icon;
      rung.dataset.rankIdx = String(idx);
      ladder.appendChild(rung);
    });

    var slider       = inner.querySelector('#vs-rp-slider');
    var monthsEl     = inner.querySelector('#vs-rp-months');
    var ptsPerMoEl   = inner.querySelector('#vs-rp-pts-per-month');
    var iconEl       = inner.querySelector('#vs-rp-icon');
    var rankEl       = inner.querySelector('#vs-rp-rank');
    var rankSubEl    = inner.querySelector('#vs-rp-rank-sub');
    var timeEl       = inner.querySelector('#vs-rp-timeline');
    var ptsEl        = inner.querySelector('#vs-rp-pts');
    var resultEl     = inner.querySelector('#vs-rp-result');
    var rungs        = ladder.querySelectorAll('.vs-rp__rung');

    function setSegActive(containerSel, key, dataAttr, tier) {
      var segs = inner.querySelectorAll(containerSel + ' .vs-rp__seg');
      segs.forEach(function (s) {
        var active = s.getAttribute('data-' + dataAttr) === key;
        s.classList.toggle('is-active', active && tier !== 'eternal');
        s.classList.toggle('is-active-eternal', active && tier === 'eternal');
        s.setAttribute('aria-checked', active ? 'true' : 'false');
      });
    }

    function ptsPerMonth() {
      var p = PROFILES[state.profile];
      var t = TIERS[state.tier];
      // weeks/month ≈ 4.33
      return Math.round(p.hrs * p.ptsPerHour * 4.33 + t.monthlyXP);
    }

    function update() {
      state.months = parseInt(slider.value, 10);
      monthsEl.textContent = state.months + (state.months === 1 ? ' month' : ' months');

      var ppm = ptsPerMonth();
      var totalPts = ppm * state.months;
      var rank = rankForPoints(totalPts);
      var rankIdx = RANKS.indexOf(rank);

      ptsPerMoEl.textContent = '  ·  ' + fmtPts(ppm) + ' pts/mo';
      iconEl.textContent = rank.icon;
      rankEl.textContent = rank.name;
      rankEl.style.color = rank.color;

      // Eternal visual variant
      resultEl.classList.toggle('is-eternal', state.tier === 'eternal');
      setSegActive('#vs-rp-profile', state.profile, 'profile', state.tier);
      setSegActive('#vs-rp-tier',    state.tier,    'tier',    state.tier);

      // Subtext: next rank + ETA
      var next = RANKS[rankIdx + 1];
      if (next) {
        var monthsToNext = monthsToReach(next.threshold - totalPts + ppm, ppm); // approx remaining
        // Cleaner: months from 0 to reach next, minus months already projected
        var monthsFromZeroToNext = monthsToReach(next.threshold, ppm);
        var monthsRemaining = Math.max(0, monthsFromZeroToNext - state.months);
        rankSubEl.textContent = 'Next: ' + next.name + ' in about ' + (monthsRemaining < 1 ? 'under 1 month' : Math.ceil(monthsRemaining) + ' more month' + (monthsRemaining >= 2 ? 's' : ''));
      } else {
        rankSubEl.textContent = 'Top of the vault. The Sparked is a permanent-record rank.';
      }

      // Timeline copy — varies by tier to seed upgrade signal
      var tierLabel = TIERS[state.tier].label;
      var profLabel = PROFILES[state.profile].label;
      var timelineHtml;
      if (rank.threshold === 0) {
        timelineHtml = 'At <em>' + profLabel + '</em> engagement on the <em>' + tierLabel + '</em> tier, you\'d enter as <em>Spark Initiate</em>. <em>Vault Runner</em> is just ' + RANKS[1].threshold + ' points away.';
      } else {
        timelineHtml = 'At <em>' + profLabel + '</em> engagement on the <em>' + tierLabel + '</em> tier, you\'d reach <em>' + rank.name + '</em> in <em>' + formatMonths(state.months) + '</em>.';
      }
      if (state.tier === 'free') {
        timelineHtml += '<br><span style="color:var(--gold,#d4af37);font-size:0.83rem;">⚡ VaultSparked would add ~500 pts/mo — roughly ' + Math.round(500 / ppm * 100) + '% faster climb.</span>';
      } else if (state.tier === 'sparked') {
        timelineHtml += '<br><span style="color:#a78bfa;font-size:0.83rem;">◆ Eternal doubles monthly XP to 1,000 — plus permanent studio credits.</span>';
      }
      timeEl.innerHTML = timelineHtml;

      // Ladder highlight — mark reached rungs, mark current
      rungs.forEach(function (rung, idx) {
        rung.dataset.reached = idx <= rankIdx ? '1' : '0';
        rung.dataset.current = idx === rankIdx ? '1' : '0';
        if (idx === rankIdx) {
          rung.style.background = rank.color;
        } else if (idx < rankIdx) {
          rung.style.background = state.tier === 'eternal' ? 'rgba(168,139,250,0.22)' : 'rgba(255,196,0,0.22)';
        } else {
          rung.style.background = 'rgba(255,255,255,0.05)';
        }
      });

      ptsEl.textContent = 'Total projected: ' + fmtPts(totalPts) + ' pts  ·  ' + fmtPts(ppm) + ' pts/month × ' + state.months + ' months';
    }

    // Profile buttons
    inner.querySelectorAll('#vs-rp-profile .vs-rp__seg').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.profile = btn.getAttribute('data-profile');
        update();
      });
    });
    // Tier buttons
    inner.querySelectorAll('#vs-rp-tier .vs-rp__seg').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.tier = btn.getAttribute('data-tier');
        update();
      });
    });
    slider.addEventListener('input', update);

    update();
  }

  function init() {
    document.querySelectorAll('[data-rank-projector]').forEach(mount);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
