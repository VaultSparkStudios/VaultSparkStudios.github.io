/**
 * desk-comments.js — The Desk community comments (progressive enhancement).
 *
 * MARKUP CONTRACT — emitted by scripts/generate-news-pages.mjs on every
 * article, directly after the reaction bar:
 *
 *   <section class="desk-comments" id="community" data-desk-comments
 *            data-slug="<YYYY-MM-DD>/<slug>" aria-labelledby="desk-comments-title">
 *     <h2 id="desk-comments-title">Community</h2>
 *     <p class="desk-comments-fallback">Comments are loading…</p>
 *   </section>
 *
 * This script keeps the <h2> and replaces ONLY the fallback paragraph with the
 * thread plus composer. With JavaScript off, the fallback paragraph is what the
 * reader sees. No innerHTML and no inline styles anywhere (nonce CSP + Trusted
 * Types report-only): every node is createElement + textContent.
 *
 * Edge API (same-origin, cloudflare/desk-comments.mjs):
 *   GET  /v/desk-comments?slug=…  → { ok, count, comments: [{ …, replies: [] }] }
 *   POST /v/desk-comments         → 201 published · 202 held · 422 rejected
 *   POST /v/desk-comments/report  → { ok, message }
 * POSTs carry X-CSRF-Token (window.VSCsrf) and a Turnstile token
 * (window.VSTurnstile, rendered into this section's [data-vs-turnstile-slot]).
 * Signed-in state comes from window.VSSignedInState / data-vs-signed-in.
 */
(function () {
  'use strict';

  var ENDPOINT = '/v/desk-comments';
  var REPORT_ENDPOINT = '/v/desk-comments/report';
  var BODY_MIN = 2;
  var BODY_MAX = 1500;
  var NAME_MAX = 40;
  var SLUG_RE = /^\d{4}-\d{2}-\d{2}\/[a-z0-9-]{1,120}$/;
  var MEMBER_LINK = '/vault-member/';
  var REPORT_REASONS = [
    ['spam', 'Spam or advertising'],
    ['abuse', 'Harassment or hate'],
    ['personal', 'Personal information'],
    ['other', 'Something else']
  ];
  var CATEGORY_LABELS = {
    hate: 'hateful language',
    threat: 'threats or harassment',
    sexual: 'sexual content',
    privacy: 'personal information',
    length: 'length',
    policy: 'the community guidelines'
  };

  function relativeTime(iso, nowMs) {
    var t = Date.parse(iso);
    if (!isFinite(t)) return '';
    var now = typeof nowMs === 'number' ? nowMs : Date.now();
    var seconds = Math.max(0, Math.round((now - t) / 1000));
    if (seconds < 45) return 'just now';
    var minutes = Math.round(seconds / 60);
    if (minutes < 60) return minutes + (minutes === 1 ? ' min ago' : ' mins ago');
    var hours = Math.round(minutes / 60);
    if (hours < 24) return hours + (hours === 1 ? ' hour ago' : ' hours ago');
    var days = Math.round(hours / 24);
    if (days < 7) return days + (days === 1 ? ' day ago' : ' days ago');
    try {
      return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    } catch (_e) {
      return new Date(t).toISOString().slice(0, 10);
    }
  }

  function countLabel(total) {
    return total === 1 ? '1 comment' : total + ' comments';
  }

  function totalCount(comments) {
    var total = 0;
    (comments || []).forEach(function (c) {
      total += 1 + ((c && c.replies) ? c.replies.length : 0);
    });
    return total;
  }

  function validateDraft(body, name, isMember) {
    var text = String(body || '').trim();
    if (text.length < BODY_MIN) return 'Write at least a couple of characters.';
    if (text.length > BODY_MAX) return 'Keep it under ' + BODY_MAX + ' characters.';
    if (!isMember) {
      var handle = String(name || '').trim();
      if (!handle) return 'Add a display name so people know who is talking.';
      if (handle.length > NAME_MAX) return 'Display names are ' + NAME_MAX + ' characters or fewer.';
    }
    return '';
  }

  function sortTop(a, b) {
    var featured = (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    if (featured) return featured;
    var member = (b.author_kind === 'member' ? 1 : 0) - (a.author_kind === 'member' ? 1 : 0);
    if (member) return member;
    return (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0);
  }

  var api = {
    relativeTime: relativeTime,
    countLabel: countLabel,
    totalCount: totalCount,
    validateDraft: validateDraft,
    sortTop: sortTop,
    SLUG_RE: SLUG_RE,
    BODY_MAX: BODY_MAX,
    NAME_MAX: NAME_MAX
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  window.VSDeskComments = api;

  function el(tag, props, kids) {
    var node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (key) {
        var value = props[key];
        if (value === null || value === undefined || value === false) return;
        if (key === 'text') node.textContent = value;
        else if (key === 'className') node.className = value;
        else if (key === 'hidden') node.hidden = !!value;
        else if (key === 'disabled') node.disabled = !!value;
        else node.setAttribute(key, value === true ? '' : String(value));
      });
    }
    (kids || []).forEach(function (kid) {
      if (!kid) return;
      node.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
    });
    return node;
  }

  function say(node, message, kind) {
    node.textContent = message;
    node.className = node.getAttribute('data-base-class') + (kind ? ' is-' + kind : '');
  }

  function statusNode(baseClass, extra) {
    var props = { className: baseClass, 'data-base-class': baseClass, role: 'status', 'aria-live': 'polite' };
    Object.keys(extra || {}).forEach(function (k) { props[k] = extra[k]; });
    return el('p', props);
  }

  function readResponse(response) {
    return response.text().then(function (text) {
      var parsed = null;
      try { parsed = text ? JSON.parse(text) : null; } catch (_e) { parsed = null; }
      return { ok: response.ok, status: response.status, body: parsed };
    });
  }

  // Guests (and every reporter) carry a Turnstile token; a signed-in member
  // does not, because the edge accepts their session cookie instead and never
  // verifies a challenge for them.
  function getTokens(needTurnstile) {
    if (!window.VSCsrf || (needTurnstile && !window.VSTurnstile)) {
      var err = new Error('verification_loading');
      err.code = 'verification_loading';
      return Promise.reject(err);
    }
    var turnstile = needTurnstile ? window.VSTurnstile.getToken() : Promise.resolve('');
    return Promise.all([turnstile, window.VSCsrf.getToken()]);
  }

  function messageFor(result) {
    var payload = result.body || {};
    if (result.status === 429) return payload.message || 'You are commenting quickly — take a short breather and try again in a few minutes.';
    if (payload.error === 'csrf_invalid') {
      try { if (window.VSCsrf && window.VSCsrf.invalidate) window.VSCsrf.invalidate(); } catch (_e) {}
      return payload.message || 'Your session timed out. Please try again.';
    }
    if (payload.error && payload.error.indexOf('turnstile') === 0) return 'We could not verify you are human. Please try again.';
    if (!result.body && (result.status === 404 || result.status === 405)) return 'Comments are not available yet.';
    if (payload.message) return payload.message;
    return 'Something went wrong. Please try again shortly.';
  }

  function networkMessage(error) {
    if (error && error.code === 'verification_loading') return 'Verification is still loading. Please retry in a moment.';
    return 'Could not reach the comments service. Please try again shortly.';
  }

  var sequence = 0;

  function mount(section) {
    if (section.getAttribute('data-desk-comments-ready') === 'true') return;
    section.setAttribute('data-desk-comments-ready', 'true');

    var uid = ++sequence;
    var slug = section.getAttribute('data-slug') || '';
    var fallback = section.querySelector('.desk-comments-fallback');
    var root = el('div', { className: 'desk-comments-body' });
    if (fallback && fallback.parentNode === section) section.replaceChild(root, fallback);
    else section.appendChild(root);

    if (!SLUG_RE.test(slug)) {
      root.appendChild(el('p', { className: 'desk-comments-note', text: 'Comments are not available for this story.' }));
      return;
    }

    var state = { member: false, comments: [], replyTo: null, busy: false, reported: {} };

    var summary = el('p', { className: 'desk-comments-summary' });
    var loadStatus = statusNode('desk-comments-status');
    var retry = el('button', { type: 'button', className: 'desk-comments-button is-secondary', hidden: true, text: 'Try again' });
    var list = el('ol', { className: 'desk-comments-list', 'aria-label': 'Comments', hidden: true });
    var empty = el('p', { className: 'desk-comments-empty', hidden: true, text: 'Be the first to weigh in.' });

    var bodyId = 'desk-comment-body-' + uid;
    var nameId = 'desk-comment-name-' + uid;
    var counterId = 'desk-comment-counter-' + uid;
    var guideId = 'desk-comment-guide-' + uid;
    var hintId = 'desk-comment-hint-' + uid;
    var composeId = 'desk-comment-compose-' + uid;

    var composeTitle = el('h3', { id: composeId, className: 'desk-comments-compose-title', text: 'Join the conversation' });
    var replyingText = el('p', { className: 'desk-comments-replying-text' });
    var cancelReply = el('button', { type: 'button', className: 'desk-comments-button is-secondary', text: 'Cancel reply' });
    var replying = el('div', { className: 'desk-comments-replying', hidden: true }, [replyingText, cancelReply]);
    var identityNote = el('p', {
      className: 'desk-comments-identity',
      hidden: true,
      text: 'Posting as a Vault member — your comments are badged and sort first.'
    });
    var textarea = el('textarea', {
      id: bodyId,
      name: 'body',
      rows: '4',
      maxlength: String(BODY_MAX),
      required: true,
      'aria-describedby': counterId + ' ' + guideId
    });
    var counter = el('p', { id: counterId, className: 'desk-comments-counter', text: '0 / ' + BODY_MAX });
    var guide = el('p', {
      id: guideId,
      className: 'desk-comments-guide',
      text: 'Be straight with people and stay on the story. Links, contact details and strong language are held for a quick review.'
    });
    var nameInput = el('input', {
      id: nameId,
      name: 'displayName',
      type: 'text',
      maxlength: String(NAME_MAX),
      autocomplete: 'nickname',
      'aria-describedby': hintId
    });
    var nameField = el('div', { className: 'desk-comments-field' }, [
      el('label', { className: 'desk-comments-label', for: nameId, text: 'Display name' }),
      nameInput,
      el('p', { id: hintId, className: 'desk-comments-hint', text: 'Shown next to a Guest label.' })
    ]);
    var nudge = el('p', { className: 'desk-comments-nudge' }, [
      el('a', { href: MEMBER_LINK, text: 'Sign in to your Vault account to have your comments featured' })
    ]);
    var turnstileSlot = el('div', { className: 'desk-comments-turnstile', 'data-vs-turnstile-slot': true });
    var submit = el('button', { type: 'submit', className: 'desk-comments-button is-primary', text: 'Post comment' });
    var formStatus = statusNode('desk-comments-form-status');

    var form = el('form', { className: 'desk-comments-form', novalidate: true, 'aria-labelledby': composeId, hidden: true }, [
      composeTitle,
      replying,
      identityNote,
      el('div', { className: 'desk-comments-field' }, [
        el('label', { className: 'desk-comments-label', for: bodyId, text: 'Your comment' }),
        textarea,
        counter
      ]),
      guide,
      nameField,
      nudge,
      turnstileSlot,
      el('div', { className: 'desk-comments-actions' }, [submit]),
      formStatus
    ]);

    root.appendChild(summary);
    root.appendChild(loadStatus);
    root.appendChild(retry);
    root.appendChild(empty);
    root.appendChild(list);
    root.appendChild(form);

    function updateCounter() {
      var length = textarea.value.length;
      counter.textContent = length + ' / ' + BODY_MAX;
      counter.className = 'desk-comments-counter' + (length > BODY_MAX - 100 ? ' is-near' : '');
    }
    textarea.addEventListener('input', updateCounter);

    function applyIdentity(isMember) {
      state.member = !!isMember;
      nameField.hidden = state.member;
      nudge.hidden = state.member;
      identityNote.hidden = !state.member;
      if (state.member) nameInput.removeAttribute('required');
      else nameInput.setAttribute('required', '');
    }
    applyIdentity(document.documentElement.getAttribute('data-vs-signed-in') === 'true');

    function readSignedInState() {
      var signedIn = document.documentElement.getAttribute('data-vs-signed-in') === 'true';
      if (window.VSSignedInState && typeof window.VSSignedInState.whenReady === 'function') {
        window.VSSignedInState.whenReady().then(function (session) {
          applyIdentity(!!(session && session.userId));
        }, function () { applyIdentity(signedIn); });
      } else {
        applyIdentity(signedIn);
      }
    }
    readSignedInState();
    document.addEventListener('vs:session-ready', readSignedInState);

    function clearReply() {
      state.replyTo = null;
      replying.hidden = true;
      replyingText.textContent = '';
      composeTitle.textContent = 'Join the conversation';
      submit.textContent = 'Post comment';
    }

    function startReply(comment) {
      state.replyTo = { id: comment.id, name: comment.display_name };
      replyingText.textContent = 'Replying to ' + comment.display_name;
      replying.hidden = false;
      composeTitle.textContent = 'Write a reply';
      submit.textContent = 'Post reply';
      textarea.focus();
    }
    cancelReply.addEventListener('click', function () {
      clearReply();
      textarea.focus();
    });

    function sendReport(comment, reason, status, sendButton, panel, reportButton) {
      sendButton.disabled = true;
      say(status, 'Sending…', '');
      getTokens(true).then(function (tokens) {
        return fetch(REPORT_ENDPOINT, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': tokens[1] },
          body: JSON.stringify({ commentId: comment.id, reason: reason, turnstileToken: tokens[0] })
        });
      }).then(readResponse).then(function (result) {
        if (result.ok && result.body && result.body.ok) {
          state.reported[comment.id] = true;
          reportButton.textContent = 'Reported';
          reportButton.disabled = true;
          reportButton.setAttribute('aria-expanded', 'false');
          var done = statusNode('desk-comment-reported');
          panel.parentNode.replaceChild(done, panel);
          say(done, (result.body && result.body.message) || 'Thanks — a moderator will take a look.', 'ok');
          return;
        }
        sendButton.disabled = false;
        say(status, messageFor(result), 'error');
      }).catch(function (error) {
        sendButton.disabled = false;
        say(status, networkMessage(error), 'error');
      });
    }

    function buildReportPanel(comment, reportButton, close) {
      var selectId = 'desk-comment-report-' + comment.id;
      var select = el('select', { id: selectId, className: 'desk-comment-report-reason' });
      REPORT_REASONS.forEach(function (pair) {
        select.appendChild(el('option', { value: pair[0], text: pair[1] }));
      });
      var status = statusNode('desk-comment-report-status');
      var send = el('button', { type: 'button', className: 'desk-comments-button is-primary', text: 'Send report' });
      var cancel = el('button', { type: 'button', className: 'desk-comments-button is-secondary', text: 'Cancel' });
      var panel = el('div', { className: 'desk-comment-report', role: 'group', 'aria-label': 'Report this comment' }, [
        el('label', { className: 'desk-comments-label', for: selectId, text: 'Why are you reporting this?' }),
        select,
        el('div', { className: 'desk-comments-actions' }, [send, cancel]),
        status
      ]);
      cancel.addEventListener('click', function () {
        close();
        reportButton.focus();
      });
      send.addEventListener('click', function () {
        sendReport(comment, select.value, status, send, panel, reportButton);
      });
      return panel;
    }

    function renderComment(comment, isReply) {
      var isMember = comment.author_kind === 'member';
      var name = comment.display_name || (isMember ? 'Vault member' : 'Guest');
      var authorId = 'desk-comment-author-' + comment.id;
      var item = el('li', {
        className: 'desk-comment' + (isMember ? ' is-member' : ' is-guest')
          + (comment.featured ? ' is-featured' : '') + (isReply ? ' is-reply' : ''),
        'data-comment-id': comment.id
      });
      var card = el('article', { className: 'desk-comment-card', 'aria-labelledby': authorId });
      var meta = el('p', { className: 'desk-comment-meta' }, [
        el('span', { id: authorId, className: 'desk-comment-author', text: name }),
        el('span', {
          className: 'desk-comment-badge ' + (isMember ? 'is-member' : 'is-guest'),
          text: isMember ? 'Vault member' : 'Guest'
        }),
        comment.featured ? el('span', { className: 'desk-comment-badge is-featured', text: 'Featured' }) : null,
        el('time', {
          className: 'desk-comment-time',
          datetime: comment.created_at,
          title: comment.created_at,
          text: relativeTime(comment.created_at)
        })
      ]);
      card.appendChild(meta);

      var bodyWrap = el('div', { className: 'desk-comment-body' });
      String(comment.body || '').split(/\n{2,}/).forEach(function (paragraph) {
        bodyWrap.appendChild(el('p', { text: paragraph }));
      });
      card.appendChild(bodyWrap);

      var actions = el('div', { className: 'desk-comment-actions' });
      if (!isReply) {
        var replyButton = el('button', {
          type: 'button',
          className: 'desk-comments-button is-quiet',
          text: 'Reply',
          'aria-label': 'Reply to ' + name
        });
        replyButton.addEventListener('click', function () { startReply(comment); });
        actions.appendChild(replyButton);
      }
      var reportButton = el('button', {
        type: 'button',
        className: 'desk-comments-button is-quiet',
        text: state.reported[comment.id] ? 'Reported' : 'Report',
        disabled: !!state.reported[comment.id],
        'aria-expanded': 'false',
        'aria-label': 'Report comment by ' + name
      });
      var panel = null;
      function closePanel() {
        if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
        panel = null;
        reportButton.setAttribute('aria-expanded', 'false');
      }
      reportButton.addEventListener('click', function () {
        if (state.reported[comment.id]) return;
        if (panel) { closePanel(); return; }
        panel = buildReportPanel(comment, reportButton, closePanel);
        card.appendChild(panel);
        reportButton.setAttribute('aria-expanded', 'true');
        var select = panel.querySelector('select');
        if (select) select.focus();
      });
      actions.appendChild(reportButton);
      card.appendChild(actions);
      item.appendChild(card);

      if (!isReply && comment.replies && comment.replies.length) {
        var replies = el('ol', { className: 'desk-comment-replies', 'aria-label': 'Replies to ' + name });
        comment.replies.forEach(function (reply) { replies.appendChild(renderComment(reply, true)); });
        item.appendChild(replies);
      }
      return item;
    }

    function render() {
      while (list.firstChild) list.removeChild(list.firstChild);
      state.comments.forEach(function (comment) { list.appendChild(renderComment(comment, false)); });
      var total = totalCount(state.comments);
      summary.textContent = total ? countLabel(total) : '';
      list.hidden = total === 0;
      empty.hidden = total > 0;
    }

    function addComment(comment) {
      if (comment.parent_id) {
        for (var i = 0; i < state.comments.length; i++) {
          if (state.comments[i].id === comment.parent_id) {
            state.comments[i].replies = (state.comments[i].replies || []).concat([comment]);
            render();
            return;
          }
        }
      }
      comment.replies = comment.replies || [];
      state.comments = state.comments.concat([comment]).sort(sortTop);
      render();
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (state.busy) return;
      var problem = validateDraft(textarea.value, nameInput.value, state.member);
      if (problem) {
        say(formStatus, problem, 'error');
        (problem.indexOf('display name') >= 0 ? nameInput : textarea).focus();
        return;
      }
      state.busy = true;
      submit.disabled = true;
      say(formStatus, 'Posting…', '');
      getTokens(!state.member).then(function (tokens) {
        var payload = { slug: slug, body: textarea.value.trim(), turnstileToken: tokens[0] };
        if (!state.member) payload.displayName = nameInput.value.trim();
        if (state.replyTo) payload.parentId = state.replyTo.id;
        return fetch(ENDPOINT, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': tokens[1] },
          body: JSON.stringify(payload)
        });
      }).then(readResponse).then(function (result) {
        var payload = result.body || {};
        if (payload.status === 'published' && payload.comment) {
          addComment(payload.comment);
          textarea.value = '';
          updateCounter();
          clearReply();
          say(formStatus, payload.message || 'Your comment is live.', 'ok');
          return;
        }
        if (payload.status === 'held') {
          textarea.value = '';
          updateCounter();
          clearReply();
          say(formStatus, payload.message || 'Thanks — your comment is waiting for a quick review.', 'held');
          return;
        }
        if (payload.status === 'rejected') {
          var label = CATEGORY_LABELS[payload.category];
          say(formStatus, (payload.message || "This comment can't be posted.") + (label ? ' Flagged for ' + label + '.' : ''), 'error');
          return;
        }
        if (payload.error === 'display_name_required') applyIdentity(false);
        // The edge did not see a member session (expired while the page was
        // open), so it asked for a guest's proof instead. Fall back to the guest
        // composer rather than looping on a challenge the member never gets.
        if (state.member && payload.error && payload.error.indexOf('turnstile') === 0) {
          applyIdentity(false);
          say(formStatus, 'Your Vault session expired. Add a display name to post as a guest, or sign in again.', 'error');
          return;
        }
        say(formStatus, messageFor(result), 'error');
      }).catch(function (error) {
        say(formStatus, networkMessage(error), 'error');
      }).then(function () {
        state.busy = false;
        submit.disabled = false;
      });
    });

    function failLoad(message, canRetry) {
      say(loadStatus, message, 'error');
      loadStatus.hidden = false;
      retry.hidden = !canRetry;
      form.hidden = true;
      list.hidden = true;
      empty.hidden = true;
    }

    function load() {
      say(loadStatus, 'Loading comments…', '');
      loadStatus.hidden = false;
      retry.hidden = true;
      fetch(ENDPOINT + '?slug=' + encodeURIComponent(slug), {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      }).then(readResponse).then(function (result) {
        var payload = result.body;
        if (result.ok && payload && payload.ok && Object.prototype.toString.call(payload.comments) === '[object Array]') {
          state.comments = payload.comments;
          loadStatus.hidden = true;
          loadStatus.textContent = '';
          form.hidden = false;
          render();
          return;
        }
        if (!payload && (result.status === 404 || result.status === 405)) {
          failLoad('Comments are not available yet.', false);
          return;
        }
        failLoad('Comments are temporarily unavailable.', true);
      }).catch(function () {
        failLoad('Could not load comments. Check your connection and try again.', true);
      });
    }
    retry.addEventListener('click', load);
    load();
  }

  function init() {
    var sections = document.querySelectorAll('[data-desk-comments]');
    if (!sections.length) return;
    if (typeof IntersectionObserver !== 'function') {
      Array.prototype.forEach.call(sections, mount);
      return;
    }
    // Comments sit below the article, so nothing is fetched until the reader is
    // close to them — one fewer edge + Supabase read per drive-by pageview.
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        mount(entry.target);
      });
    }, { rootMargin: '800px 0px' });
    Array.prototype.forEach.call(sections, function (section) { observer.observe(section); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
