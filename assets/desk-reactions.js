/**
 * desk-reactions.js — reader signal for THE DESK.
 *
 * Two honesty rules drive the whole design:
 *
 * 1. A count is shown only when the server returns one. There is no seeding, no
 *    optimistic "+1" that survives a failed request, and no localStorage tally
 *    dressed up as a global number. If the endpoint is unreachable the buttons
 *    still work and simply show no counts — a desk that sells verifiable claims
 *    cannot decorate itself with invented engagement. A failed request is
 *    shown as failed; a highlighted local choice is never a delivery receipt.
 *
 * 2. Your own choice is remembered locally so the UI can reflect it instantly,
 *    but that local memory is never presented as anyone else's opinion.
 *
 * Identity-free: no account, no cookie, no stored identifier. The server dedupes
 * on a non-reversible daily hash it never keeps in plain form.
 */
(function () {
  'use strict';
  var ENDPOINT = '/v/desk-reaction';
  var root = document.querySelector('[data-desk-reactions]');
  if (!root) return;
  var slug = root.getAttribute('data-desk-reactions') || '';
  if (!slug) return;

  var mineKey = 'vs_desk_react_' + slug;
  var status = root.querySelector('[data-reaction-status]');
  var mine = {};
  try { mine = JSON.parse(localStorage.getItem(mineKey) || '{}') || {}; } catch (e) { mine = {}; }

  function rememberMine(id) {
    mine[id] = 1;
    try { localStorage.setItem(mineKey, JSON.stringify(mine)); } catch (e) { /* private mode */ }
  }

  function announce(message, state) {
    if (!status) return;
    status.textContent = message;
    status.setAttribute('data-state', state || 'idle');
  }

  function paint(counts) {
    var buttons = root.querySelectorAll('[data-reaction]');
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var id = btn.getAttribute('data-reaction');
      var out = btn.querySelector('.desk-react-n');
      var n = counts && Object.prototype.hasOwnProperty.call(counts, id) ? Number(counts[id]) : null;
      if (out) {
        // Absent count renders as nothing, never as "0 people agree" — an empty
        // state is information; a fabricated one is not.
        out.textContent = n && n > 0 ? String(n) : '';
        out.hidden = !(n && n > 0);
      }
      if (mine[id]) btn.setAttribute('data-mine', 'true');
      btn.removeAttribute('aria-busy');
    }
  }

  function load() {
    fetch(ENDPOINT + '?slug=' + encodeURIComponent(slug), { method: 'GET' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && d.ok) paint(d.counts || {});
        else announce('Reader signals are unavailable right now. Nothing has been sent.', 'unavailable');
      })
      .catch(function () {
        announce('Reader signals are unavailable right now. Nothing has been sent.', 'unavailable');
      });
  }

  function send(btn, id) {
    if (btn.getAttribute('aria-busy') === 'true') return;
    btn.setAttribute('aria-busy', 'true');
    announce('Sending your signal…', 'sending');
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: slug, reaction: id }),
    })
      .then(function (r) {
        return r.json().catch(function () { return null; }).then(function (body) {
          if (!r.ok) throw new Error(body && body.error ? body.error : 'request_failed');
          return body;
        });
      })
      .then(function (d) {
        if (!d || !d.ok) throw new Error('request_failed');
        rememberMine(id);
        btn.setAttribute('data-mine', 'true');
        paint(d.counts || {});
        announce(d.alreadyCounted
          ? 'Already counted today — your earlier signal is still on the record.'
          : 'Signal delivered. Thank you for telling the Desk what landed.',
        d.alreadyCounted ? 'already-counted' : 'submitted');
      })
      .catch(function (error) {
        btn.removeAttribute('aria-busy');
        announce(error && error.message === 'rate_limited'
          ? 'Signal limit reached for today. Nothing new was added.'
          : 'Signal not delivered. Check your connection and try again.',
        error && error.message === 'rate_limited' ? 'already-counted' : 'retry');
      });
  }

  root.addEventListener('click', function (ev) {
    var btn = ev.target && ev.target.closest ? ev.target.closest('[data-reaction]') : null;
    if (!btn || !root.contains(btn)) return;
    ev.preventDefault();
    send(btn, btn.getAttribute('data-reaction'));
  });

  // Share / copy are pure client actions with no server claim attached.
  var share = root.querySelector('[data-desk-share]');
  if (share) {
    share.addEventListener('click', function () {
      var url = location.href;
      var title = document.title;
      if (navigator.share) {
        navigator.share({ title: title, url: url }).catch(function () { /* dismissed */ });
        return;
      }
      var done = function () {
        var label = share.querySelector('.desk-react-k');
        if (!label) return;
        var prev = label.textContent;
        label.textContent = 'Link copied';
        setTimeout(function () { label.textContent = prev; }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done).catch(function () { /* blocked */ });
      }
    });
  }

  load();
}());
