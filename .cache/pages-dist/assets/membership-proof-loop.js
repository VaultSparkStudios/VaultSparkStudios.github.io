// membership-proof-loop.js — local-only bridge from interview intent to first actions.
(function () {
  'use strict';
  var KEY = 'vs_membership_intent';

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function loadIntent() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function planFor(intent) {
    var tier = String(intent && intent.tier || 'Free').toLowerCase();
    var world = tier.indexOf('eternal') >= 0 ? 'Eternal channel' : tier.indexOf('sparked') >= 0 ? 'Sparked archive' : 'free Vault';
    return [
      { label: 'Create your Vault identity', detail: 'Claim the free profile so rank, challenge, and archive progress can persist.' },
      { label: 'Complete one Vault Challenge', detail: 'A first challenge gives the rank economy a real signal instead of a blank account.' },
      { label: 'Open your ' + world + ' path', detail: 'Use the recommendation as a starting point, then compare tiers after the portal is live.' }
    ];
  }

  function render(root, intent) {
    var plan = planFor(intent);
    root.innerHTML = [
      '<div class="membership-proof-loop">',
      '<div class="mem-interview-eyebrow">Your first three sparks</div>',
      '<h3>', esc(intent && intent.tier ? intent.tier + ' path' : 'Vault path'), '</h3>',
      '<ol>',
      plan.map(function (item) {
        return '<li><strong>' + esc(item.label) + '</strong><span>' + esc(item.detail) + '</span></li>';
      }).join(''),
      '</ol>',
      '<a class="button" href="/vault-member/#register">Start with the free account</a>',
      '</div>'
    ].join('');
  }

  function injectStyle() {
    if (document.getElementById('membership-proof-loop-style')) return;
    var style = document.createElement('style');
    style.id = 'membership-proof-loop-style';
    style.textContent = '.membership-proof-loop{margin:1rem auto 0;max-width:680px;border:1px solid rgba(255,196,0,.18);border-radius:18px;padding:1.1rem 1.25rem;background:rgba(255,196,0,.045)}.membership-proof-loop h3{font-family:Georgia,serif;margin:.2rem 0 .8rem}.membership-proof-loop ol{display:grid;gap:.7rem;margin:0 0 1rem;padding-left:1.25rem}.membership-proof-loop li span{display:block;color:var(--muted);font-size:.9rem;line-height:1.55;margin-top:.18rem}body.light-mode .membership-proof-loop{background:rgba(122,92,0,.055);border-color:rgba(122,92,0,.18)}';
    document.head.appendChild(style);
  }

  function boot() {
    var intent = loadIntent();
    var roots = Array.prototype.slice.call(document.querySelectorAll('[data-membership-proof-loop]'));
    if (!roots.length && intent && location.pathname.indexOf('/membership') === 0) {
      var interview = document.getElementById('mem-interview-mount');
      if (interview) {
        var created = document.createElement('div');
        created.setAttribute('data-membership-proof-loop', '');
        interview.insertAdjacentElement('afterend', created);
        roots.push(created);
      }
    }
    if (!roots.length || !intent) return;
    injectStyle();
    roots.forEach(function (root) { render(root, intent); });
  }

  window.VSMembershipProofLoop = { loadIntent: loadIntent, planFor: planFor };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
