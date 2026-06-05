/* feedback-decision-board.js — renders public feedback operating room lanes. */
(function () {
  'use strict';

  function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function style() {
    if (document.getElementById('vs-feedback-board-style')) return;
    var s = document.createElement('style');
    s.id = 'vs-feedback-board-style';
    s.textContent = '.fb-board{padding:1rem 0 4rem}.fb-board__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.8rem}.fb-lane{border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.03);padding:.85rem}.fb-lane h2{font-size:.88rem;letter-spacing:.08em;text-transform:uppercase;color:var(--gold);margin:0 0 .65rem}.fb-ticket{padding:.75rem;border-radius:10px;background:rgba(0,0,0,.16);border:1px solid rgba(255,255,255,.06);margin:.5rem 0}.fb-ticket strong{display:block}.fb-ticket p{color:var(--muted);font-size:.82rem;line-height:1.45;margin:.3rem 0 0}.fb-vote{margin-top:.5rem;border:1px solid rgba(255,196,0,.25);background:transparent;color:var(--gold);border-radius:999px;padding:.25rem .55rem;font:inherit;font-size:.76rem;cursor:pointer}@media(max-width:900px){.fb-board__grid{grid-template-columns:1fr}}';
    document.head.appendChild(s);
  }

  function mount(root, data) {
    style();
    root.innerHTML = '<div class="container"><div class="eyebrow">Feedback Operating Room</div><h2 class="fb-board__title">Asked. Planned. Shipped. Explained.</h2><div class="fb-board__grid">' + (data.lanes || []).map(function (lane) {
      return '<section class="fb-lane"><h2>' + esc(lane.label) + '</h2>' + (lane.items || []).map(function (item) {
        return '<article class="fb-ticket"><strong>' + esc(item.title) + '</strong><p>' + esc(item.evidence || item.theme || '') + '</p><button class="fb-vote" type="button" data-feedback-board-vote="' + esc(item.title) + '">Add local signal</button></article>';
      }).join('') + '</section>';
    }).join('') + '</div></div>';
    root.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-feedback-board-vote]');
      if (!btn) return;
      try {
        var key = 'vs_feedback_board_votes';
        var votes = JSON.parse(localStorage.getItem(key) || '[]');
        votes.push({ title: btn.dataset.feedbackBoardVote, ts: Date.now(), path: location.pathname });
        localStorage.setItem(key, JSON.stringify(votes.slice(-30)));
      } catch (_) {}
      btn.textContent = 'Signal saved locally';
      btn.disabled = true;
    });
  }

  function boot() {
    var root = document.querySelector('[data-feedback-decision-board]');
    if (!root && location.pathname.indexOf('/feedback') === 0) {
      root = document.createElement('section');
      root.className = 'fb-board';
      root.setAttribute('data-feedback-decision-board', '');
      var main = document.querySelector('main');
      if (main) main.appendChild(root);
    }
    if (!root) return;
    fetch('/api/feedback-decision-board.json', { cache: 'default' }).then(function (r) { return r.json(); }).then(function (data) { mount(root, data); }).catch(function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
