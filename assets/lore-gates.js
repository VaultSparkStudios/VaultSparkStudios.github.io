/**
 * VaultSpark — Adaptive Lore Gates.
 *
 * Progressively reveals deeper lore fragments on lore pages based on vault rank.
 *
 * Markup contract on host pages — author hidden fragments inline as:
 *   <div data-lore-gate data-rank-required="3" data-rank-title="Spark Adept">
 *     …deeper fragment…
 *   </div>
 *
 * data-rank-required:  1=public, 2=member, 3=adept, 4=warden, 5=witness …
 * data-rank-title:     friendly name displayed in the locked state
 *
 * Reads vault rank from VSPublic membership lookup (existing). Honest locked-state UX:
 *   - Anonymous: "Locked — visible to vault members."
 *   - Member, rank too low: "Locked — visible to {required title}+ ranks."
 *   - Member, rank ≥ required: revealed.
 *
 * No inline scripts/styles. CSP-clean. prefers-reduced-motion honored.
 */
(function () {
  'use strict';

  var STYLE = [
    '.vs-lore-gate{position:relative;border:1px dashed rgba(212,175,55,0.32);background:rgba(13,16,28,0.55);border-radius:14px;padding:1.05rem 1.15rem;margin:1.2rem 0;}',
    '.vs-lore-gate--locked > *:not(.vs-lore-gate__lock){filter:blur(4px) saturate(0.4);user-select:none;pointer-events:none;}',
    '.vs-lore-gate__lock{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:linear-gradient(180deg,rgba(13,16,28,0.92),rgba(13,16,28,0.84));border-radius:14px;padding:1rem;}',
    '.vs-lore-gate__lock svg{width:32px;height:32px;margin-bottom:0.5rem;opacity:0.7;}',
    '.vs-lore-gate__title{font-family:Georgia,serif;font-size:0.95rem;color:var(--gold,#d4af37);letter-spacing:0.05em;text-transform:uppercase;margin:0 0 0.35rem;}',
    '.vs-lore-gate__sub{font-size:0.83rem;color:var(--muted);margin:0 0 0.65rem;max-width:38ch;line-height:1.5;}',
    '.vs-lore-gate__cta{display:inline-block;padding:0.45rem 0.95rem;border-radius:999px;background:var(--gold,#d4af37);color:#0c0d12;font-size:0.78rem;font-weight:600;text-decoration:none;}',
    '.vs-lore-gate--unlocked{border-style:solid;border-color:rgba(126,201,255,0.32);background:rgba(126,201,255,0.05);transition:border-color 800ms ease,background 800ms ease;}',
    '.vs-lore-gate__reveal{font-family:Georgia,serif;font-size:0.72rem;color:#7EC9FF;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:0.55rem;display:block;}',
    'body.light-mode .vs-lore-gate{background:rgba(255,253,247,0.92);}',
    'body.light-mode .vs-lore-gate__lock{background:linear-gradient(180deg,rgba(255,253,247,0.96),rgba(255,253,247,0.92));}',
    'body.light-mode .vs-lore-gate--unlocked{background:rgba(126,201,255,0.08);}',
    '@media (prefers-reduced-motion: reduce){.vs-lore-gate--unlocked{transition:none;}}'
  ].join('\n');

  var LOCK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="16" r="1.4"/></svg>';

  function injectStyle() {
    if (document.querySelector('style[data-lore-gates-style]')) return;
    var s = document.createElement('style');
    s.setAttribute('data-lore-gates-style', '1');
    s.appendChild(document.createTextNode(STYLE));
    document.head.appendChild(s);
  }

  function getRank() {
    // VSPublic exposes session/profile; fall back to local cache then anonymous (rank=1).
    try {
      var raw = localStorage.getItem('vs_member_rank') || sessionStorage.getItem('vs_member_rank');
      if (raw) {
        var n = Number(JSON.parse(raw));
        if (!isNaN(n) && n >= 1) return n;
      }
    } catch (_e) {}
    if (window.VSMember && typeof window.VSMember.currentRank === 'function') {
      try { return Number(window.VSMember.currentRank()) || 1; } catch (_e) {}
    }
    return 1; // anonymous = public
  }

  function lockedHTML(requiredTitle, isAnon) {
    var sub = isAnon
      ? 'Sign in to your vault and reach ' + requiredTitle + ' to read this fragment.'
      : 'Reach ' + requiredTitle + ' rank to read this fragment.';
    var cta = isAnon
      ? '<a class="vs-lore-gate__cta" href="/vault-member/">Open the vault</a>'
      : '<a class="vs-lore-gate__cta" href="/ranks/">See rank path</a>';
    return '<div class="vs-lore-gate__lock">' +
      LOCK_SVG +
      '<div class="vs-lore-gate__title">Sealed Fragment</div>' +
      '<p class="vs-lore-gate__sub">' + sub + '</p>' +
      cta +
      '</div>';
  }

  function applyGate(gate, currentRank, isAnon) {
    var required = Number(gate.getAttribute('data-rank-required') || '2');
    var requiredTitle = gate.getAttribute('data-rank-title') || ('rank ' + required);
    gate.classList.add('vs-lore-gate');
    if (currentRank >= required) {
      gate.classList.remove('vs-lore-gate--locked');
      gate.classList.add('vs-lore-gate--unlocked');
      var existingLock = gate.querySelector('.vs-lore-gate__lock');
      if (existingLock) existingLock.remove();
      if (!gate.querySelector('.vs-lore-gate__reveal')) {
        var reveal = document.createElement('span');
        reveal.className = 'vs-lore-gate__reveal';
        reveal.textContent = 'Fragment unlocked · ' + requiredTitle;
        gate.insertBefore(reveal, gate.firstChild);
      }
    } else {
      gate.classList.add('vs-lore-gate--locked');
      if (!gate.querySelector('.vs-lore-gate__lock')) {
        var lock = document.createElement('div');
        lock.innerHTML = lockedHTML(requiredTitle, isAnon);
        gate.appendChild(lock.firstChild);
      }
    }
  }

  function init() {
    var gates = document.querySelectorAll('[data-lore-gate]');
    if (!gates.length) return;
    injectStyle();
    var rank = getRank();
    var isAnon = rank <= 1;
    gates.forEach(function (g) { applyGate(g, rank, isAnon); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.VSLoreGates = { refresh: init };
})();
