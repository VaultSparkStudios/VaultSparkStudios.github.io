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
 * 3. One request per bar is in flight at a time, and a "take back" is only sent
 *    to a Worker that has proven it understands one. The tally, the reader's
 *    stored choice and the daily budget are three separate server writes with
 *    no transaction around them, so overlapping taps could otherwise lose an
 *    update and leave a stored choice disagreeing with the tally — at which
 *    point a later retract would decrement a stranger's vote.
 *
 * One choice per row. Each bar has single-choice groups — the editorial row
 * ("story"), the whose-take-landed row ("voice") and the illustration row
 * ("panel"). Clicking a different button switches your choice; clicking the lit
 * one takes it back. The pressed state flips instantly and rolls back if the
 * server does not confirm; counts still only ever come from the server.
 *
 * Identity-free: no account, no cookie, no stored identifier. The server dedupes
 * on a non-reversible daily hash it never keeps in plain form.
 */
(function () {
  'use strict';
  var ENDPOINT = '/v/desk-reaction';
  var roots = document.querySelectorAll('[data-desk-reactions]');
  if (!roots.length) return;
  for (var rootIndex = 0; rootIndex < roots.length; rootIndex++) initRoot(roots[rootIndex]);
  yieldFloatingWidgets(roots);

  function groupOf(id) {
    id = String(id || '');
    if (id.indexOf('voice:') === 0) return 'voice';
    if (id.indexOf('panel-') === 0) return 'panel';
    return 'story';
  }

  /**
   * Stored shape: { story: id, voice: id, panel: id }. Builds before the toggle
   * stored { <id>: 1, ... } for every button ever clicked (the multi-select
   * bug); keep only the most recent id per group so an old visitor is not
   * shown several lit buttons in one row.
   */
  function readMine(key) {
    var raw;
    try { raw = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch (e) { raw = {}; }
    var out = {};
    for (var k in raw) {
      if (!Object.prototype.hasOwnProperty.call(raw, k)) continue;
      if (k === 'story' || k === 'voice' || k === 'panel') {
        if (typeof raw[k] === 'string' && raw[k] && groupOf(raw[k]) === k) out[k] = raw[k];
      } else if (raw[k]) {
        out[groupOf(k)] = k;
      }
    }
    return out;
  }

  function initRoot(root) {
  var slug = root.getAttribute('data-desk-reactions') || '';
  if (!slug) return;

  var mineKey = 'vs_desk_react_' + slug;
  var status = root.querySelector('[data-reaction-status]');
  var mine = readMine(mineKey);
  // ONE in-flight request per BAR. The server writes the tally, the stored
  // choice and the daily budget as three separate KV puts with no transaction
  // around them, so two taps in flight against the same bar can interleave and
  // lose an update — after which a retract would decrement a count that no
  // longer represents this reader. Serialising per bar removes the race at the
  // source; extra taps are ignored (and said so) rather than queued, because
  // the reader's intent is a single current choice, not a replay of races.
  var pending = false;
  // Which contract the Worker has PROVEN it speaks. A pre-toggle Worker ignores
  // `on` entirely and treats every POST as an add, so a "take back" tap would
  // ADD a vote. Pages can ship before the Worker does, so a retract is only
  // ever sent once a response has shown the current shape (`mine`/`action`).
  var serverShape = 'unknown';
  var lastCounts = null;

  function saveMine() {
    var keep = {};
    var any = false;
    for (var g in mine) {
      if (Object.prototype.hasOwnProperty.call(mine, g) && mine[g]) { keep[g] = mine[g]; any = true; }
    }
    try {
      if (any) localStorage.setItem(mineKey, JSON.stringify(keep));
      else localStorage.removeItem(mineKey);
    } catch (e) { /* private mode */ }
  }

  function announce(message, state) {
    if (!status) return;
    status.textContent = message;
    status.setAttribute('data-state', state || 'idle');
  }

  function paintPressed() {
    var buttons = root.querySelectorAll('[data-reaction]');
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var id = btn.getAttribute('data-reaction');
      var lit = mine[groupOf(id)] === id;
      btn.setAttribute('aria-pressed', lit ? 'true' : 'false');
      if (lit) btn.setAttribute('data-mine', 'true');
      else btn.removeAttribute('data-mine');
    }
  }

  function paint(counts) {
    if (counts) lastCounts = counts;
    var buttons = root.querySelectorAll('[data-reaction]');
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var id = btn.getAttribute('data-reaction');
      var out = btn.querySelector('.desk-react-n');
      var n = lastCounts && Object.prototype.hasOwnProperty.call(lastCounts, id) ? Number(lastCounts[id]) : null;
      if (out) {
        // Absent count renders as nothing, never as "0 people agree" — an empty
        // state is information; a fabricated one is not.
        out.textContent = n && n > 0 ? String(n) : '';
        out.hidden = !(n && n > 0);
      }
    }
    paintPressed();
  }

  /** The whole bar is busy while its one request is in flight. */
  function setBarBusy(busy) {
    var buttons = root.querySelectorAll('[data-reaction]');
    for (var i = 0; i < buttons.length; i++) {
      if (busy) buttons[i].setAttribute('aria-busy', 'true');
      else buttons[i].removeAttribute('aria-busy');
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

  function send(id) {
    var group = groupOf(id);
    var previous = mine[group] || null;
    var on = previous !== id;

    // One request per bar at a time (see `pending` above).
    if (pending) {
      announce('One moment — your last signal is still being recorded.', 'sending');
      return;
    }

    // Release ordering: the content lane can put this page in front of readers
    // before the Worker that understands `on:false` is deployed. Sending a
    // retract to that older Worker would add a vote instead of removing one, so
    // until the contract is proven the retract is not sent at all: the button
    // stays lit and the reader is told the change lands shortly. A vote is never
    // manufactured by our own deploy ordering.
    if (!on && serverShape !== 'modern') {
      announce('Your pick is saved. Taking it back isn’t available just yet — it will apply shortly.', 'already-counted');
      return;
    }

    // Optimistic pressed state only — never an optimistic count.
    pending = true;
    mine[group] = on ? id : null;
    paintPressed();
    setBarBusy(true);
    announce(on ? 'Sending your signal…' : 'Taking your signal back…', 'sending');

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: slug, reaction: id, on: on }),
    })
      .then(function (r) {
        return r.json().catch(function () { return null; }).then(function (body) {
          // S317: preserve WHICH failure this was. Previously every non-2xx
          // collapsed to 'request_failed' and the user was told to check their
          // connection — even when the endpoint was absent from the deployed
          // Worker (404/403 from the static origin) and their connection was
          // perfectly fine. Blaming the visitor for our deploy state is the
          // one thing this panel must never do.
          if (!r.ok) {
            if (body && body.error) throw new Error(body.error);
            throw new Error(r.status === 404 || r.status === 403 || r.status === 405 ? 'endpoint_unavailable' : 'request_failed');
          }
          return body;
        });
      })
      .then(function (d) {
        if (!d || !d.ok) throw new Error('request_failed');
        pending = false;
        setBarBusy(false);
        // A response carrying `mine` or `action` proves the toggle-aware Worker
        // is live; anything else is the legacy shape, and this bar will not send
        // a retract to it for the rest of the page's life.
        serverShape = (Object.prototype.hasOwnProperty.call(d, 'mine') || Object.prototype.hasOwnProperty.call(d, 'action'))
          ? 'modern'
          : 'legacy';
        // Reconcile with the server's record when it sends one; otherwise keep
        // the choice the request asked for.
        if (d.mine && Object.prototype.hasOwnProperty.call(d.mine, group)) {
          var confirmed = d.mine[group];
          mine[group] = typeof confirmed === 'string' && groupOf(confirmed) === group ? confirmed : null;
        }
        saveMine();
        paint(d.counts || {});
        var message, state;
        if (d.action === 'retract') {
          message = 'Signal taken back. Your count has been removed.';
          state = 'submitted';
        } else if (d.action === 'repair') {
          // The server held a choice with no matching tally (a concurrent write
          // landed between its separate puts). It cleared the stale marker and
          // left the count alone rather than taking a vote off someone else.
          message = 'Highlight cleared. Nothing of yours was in this tally, so no count changed.';
          state = 'already-counted';
        } else if (d.action === 'switch') {
          message = 'Signal switched. Only your new choice counts.';
          state = 'submitted';
        } else if (d.action === 'noop' && !on) {
          // The daily hash rotated, so the server cannot link an earlier
          // signal to this browser. Say so rather than pretend it was removed.
          message = 'Highlight cleared. A signal sent on an earlier day stays counted — the Desk cannot link it back to you.';
          state = 'already-counted';
        } else if (d.alreadyCounted) {
          message = 'Already counted today — your earlier signal is still on the record.';
          state = 'already-counted';
        } else {
          message = 'Signal delivered. Thank you for telling the Desk what landed.';
          state = 'submitted';
        }
        announce(message, state);
      })
      .catch(function (error) {
        pending = false;
        setBarBusy(false);
        mine[group] = previous; // roll back the optimistic pressed state
        paintPressed();
        var code = error && error.message;
        var message, state;
        if (code === 'rate_limited') {
          message = 'Signal limit reached for today. Nothing was changed.';
          state = 'already-counted';
        } else if (code === 'endpoint_unavailable' || code === 'storage_unavailable') {
          // A site-side state, described as one. Nothing the reader can retry.
          message = 'Reader signals aren’t available right now. This is on our side, not yours — nothing was sent.';
          state = 'unavailable';
        } else {
          message = 'Signal not delivered. Check your connection and try again.';
          state = 'retry';
        }
        announce(message, state);
      });
  }

  root.addEventListener('click', function (ev) {
    var btn = ev.target && ev.target.closest ? ev.target.closest('[data-reaction]') : null;
    if (!btn || !root.contains(btn)) return;
    ev.preventDefault();
    send(btn.getAttribute('data-reaction'));
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

  paintPressed();
  load();
  }

  /**
   * Floating page widgets ("How's this page?", the feedback toggle) are fixed
   * to the bottom corners and sat on top of the first reaction button. While a
   * reaction bar actually overlaps one, mark the widget so news-desk.css hides
   * it; it returns as soon as the bar scrolls clear. Geometry is only measured
   * while a bar is on screen.
   */
  function yieldFloatingWidgets(bars) {
    var SELECTOR = '.vs-rate-page, [data-micro-feedback-root]';
    var PAD = 8;
    var visible = [];
    var queued = false;

    function overlaps(a, b) {
      return a.left < b.right + PAD && a.right > b.left - PAD && a.top < b.bottom + PAD && a.bottom > b.top - PAD;
    }

    function check() {
      queued = false;
      var widgets = document.querySelectorAll(SELECTOR);
      for (var w = 0; w < widgets.length; w++) {
        var widget = widgets[w];
        // The micro-feedback root spans a wide transparent box; measure what is drawn.
        var target = widget.querySelector('.micro-feedback-toggle') || widget;
        var rect = target.getBoundingClientRect();
        var hit = false;
        if (rect.width && rect.height) {
          for (var i = 0; i < visible.length && !hit; i++) hit = overlaps(rect, visible[i].getBoundingClientRect());
        }
        if (hit) widget.setAttribute('data-desk-yield', 'true');
        else if (widget.hasAttribute('data-desk-yield')) widget.removeAttribute('data-desk-yield');
      }
    }

    function schedule() {
      if (queued) return;
      queued = true;
      (window.requestAnimationFrame || setTimeout)(check);
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          var at = visible.indexOf(entries[i].target);
          if (entries[i].isIntersecting && at === -1) visible.push(entries[i].target);
          if (!entries[i].isIntersecting && at !== -1) visible.splice(at, 1);
        }
        schedule();
      });
      for (var b = 0; b < bars.length; b++) io.observe(bars[b]);
    } else {
      for (var c = 0; c < bars.length; c++) visible.push(bars[c]);
    }

    var onMove = function () { if (visible.length || document.querySelector('[data-desk-yield]')) schedule(); };
    window.addEventListener('scroll', onMove, { passive: true });
    window.addEventListener('resize', onMove, { passive: true });
    // The widget mounts late (ambient loader) and can expand/collapse in place.
    if ('MutationObserver' in window && document.body) {
      // Filter excludes data-desk-yield, so our own marker cannot re-trigger this.
      new MutationObserver(onMove).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-collapsed', 'hidden'] });
    }
    schedule();
  }
}());
