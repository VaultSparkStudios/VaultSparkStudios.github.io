(function (window) {
  'use strict';

  // ── S131 audit #23: emoji-burst submit confirmation ────────────────────────
  var BURST_STYLE_ID = 'vs-micro-feedback-burst-styles';
  var BURST_EMOJIS = ['✨', '⚡', '★', '◈', '✦'];
  function ensureBurstStyles() {
    if (document.getElementById(BURST_STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = BURST_STYLE_ID;
    s.textContent =
      '.vs-mf-burst{position:fixed;pointer-events:none;z-index:99999;' +
      'font-size:1.2rem;line-height:1;will-change:transform,opacity;' +
      'animation:vs-mf-burst-fly 600ms cubic-bezier(.2,.7,.3,1) forwards;}' +
      '@keyframes vs-mf-burst-fly{0%{opacity:1;transform:translate(-50%,-50%) scale(0.4);}' +
      '60%{opacity:1;}100%{opacity:0;transform:translate(calc(-50% + var(--dx,0px)),calc(-50% + var(--dy,0px))) scale(1.1);}}';
    document.head.appendChild(s);
  }
  function emojiBurst(anchor) {
    if (!anchor || !anchor.getBoundingClientRect) return;
    ensureBurstStyles();
    var r = anchor.getBoundingClientRect();
    var cx = r.left + r.width / 2;
    var cy = r.top + r.height / 2;
    for (var i = 0; i < 5; i += 1) {
      var span = document.createElement('span');
      span.className = 'vs-mf-burst';
      span.textContent = BURST_EMOJIS[i % BURST_EMOJIS.length];
      span.setAttribute('aria-hidden', 'true');
      var angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      span.style.setProperty('--dx', Math.round(Math.cos(angle) * 42) + 'px');
      span.style.setProperty('--dy', Math.round(Math.sin(angle) * 42) + 'px');
      span.style.left = cx + 'px';
      span.style.top = cy + 'px';
      document.body.appendChild(span);
      window.setTimeout((function (el) { return function () { el.remove(); }; })(span), 650);
    }
  }

  var STORAGE_KEY = 'vs_micro_feedback_v1';
  var FLASH_KEY = 'vs_micro_feedback_flash';
  var MAX_ENTRIES = 30;

  // ── S329: close the loop — the usefulness signal actually leaves the browser ──
  // For 100+ sessions this widget wrote localStorage and stopped: the studio's
  // headline survey collected nothing. The anonymous usefulness enum now joins
  // the same `page_feedback` table rate-page.js writes (mapped to its CHECK
  // vocabulary), so the /changelog/#requests insights block aggregates it. goal/blocker remain
  // browser-local by design — richer server fidelity needs a migration.
  var USEFULNESS_TO_REACTION = { useful: 'useful', mixed: 'ok', not_yet: 'not_useful' };
  function visitDepthBucket() {
    try {
      var n = Number(window.localStorage.getItem('vs_visit_depth') || '1');
      if (!isFinite(n) || n <= 1) return '1';
      if (n <= 4) return '2-4';
      if (n <= 10) return '5-10';
      return '10+';
    } catch (_) { return '1'; }
  }
  function shareUsefulness(usefulness) {
    try {
      var sb = window.VSSupabase;
      var reaction = USEFULNESS_TO_REACTION[usefulness];
      if (!sb || !sb.from || !reaction) return;
      sb.from('page_feedback').insert([{
        path: (window.location.pathname.replace(/\/$/, '') || '/'),
        reaction: reaction,
        visit_depth_bucket: visitDepthBucket(),
        ua_kind: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
      }]).then(function () {}, function () {});
    } catch (_) { /* never block the local save */ }
  }

  var GOAL_LABELS = {
    play_now: 'Play something now',
    join_vault: 'Join the Vault',
    support_studio: 'Support the studio',
    follow_worlds: 'Follow the worlds',
    track_progress: 'Track studio progress'
  };

  var BLOCKER_LABELS = {
    need_proof: 'Need more proof',
    not_clear: 'Not clear enough',
    too_early: 'Too early for me',
    price_unsure: 'Not sure it is worth paying',
    want_gameplay: 'Want more gameplay/product depth'
  };

  var USEFULNESS_LABELS = {
    useful: 'Useful',
    mixed: 'Somewhat useful',
    not_yet: 'Not useful yet'
  };

  function safeGetEntries() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function safeSetEntries(entries) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
    } catch (_) {}
  }

  function safeSetFlash(message) {
    try {
      window.sessionStorage.setItem(FLASH_KEY, message);
    } catch (_) {}
  }

  function safeConsumeFlash() {
    try {
      var value = window.sessionStorage.getItem(FLASH_KEY);
      if (value) window.sessionStorage.removeItem(FLASH_KEY);
      return value || '';
    } catch (_) {
      return '';
    }
  }

  function pluralize(count, one, many) {
    return count === 1 ? one : many;
  }

  function countBy(entries, key) {
    return entries.reduce(function (acc, entry) {
      var value = entry && entry[key];
      if (!value) return acc;
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  function topKey(counts) {
    var bestKey = '';
    var bestCount = 0;
    Object.keys(counts).forEach(function (key) {
      if (counts[key] > bestCount) {
        bestKey = key;
        bestCount = counts[key];
      }
    });
    return bestKey ? { key: bestKey, count: bestCount } : null;
  }

  function buildSummary(entries) {
    var goalCounts = countBy(entries, 'goal');
    var blockerCounts = countBy(entries, 'blocker');
    var usefulnessCounts = countBy(entries, 'usefulness');
    var contextCounts = countBy(entries, 'context');
    var topGoal = topKey(goalCounts);
    var topBlocker = topKey(blockerCounts);
    var topUsefulness = topKey(usefulnessCounts);

    return {
      totalResponses: entries.length,
      lastUpdated: entries.length ? entries[entries.length - 1].submittedAt : null,
      goalCounts: goalCounts,
      blockerCounts: blockerCounts,
      usefulnessCounts: usefulnessCounts,
      contextCounts: contextCounts,
      topGoal: topGoal ? {
        key: topGoal.key,
        count: topGoal.count,
        label: GOAL_LABELS[topGoal.key] || topGoal.key
      } : null,
      topBlocker: topBlocker ? {
        key: topBlocker.key,
        count: topBlocker.count,
        label: BLOCKER_LABELS[topBlocker.key] || topBlocker.key
      } : null,
      topUsefulness: topUsefulness ? {
        key: topUsefulness.key,
        count: topUsefulness.count,
        label: USEFULNESS_LABELS[topUsefulness.key] || topUsefulness.key
      } : null
    };
  }

  function getSummary() {
    return buildSummary(safeGetEntries());
  }

  function enrichIntel(intel) {
    if (!intel) return intel;
    var summary = getSummary();
    var enriched = Object.assign({}, intel);
    enriched.feedback = Object.assign({}, intel.feedback || {}, {
      localSummary: summary
    });
    return enriched;
  }

  function inferContext(root) {
    if (root && root.dataset.feedbackContext) return root.dataset.feedbackContext;
    var path = window.location.pathname;
    if (path === '/') return 'home';
    if (path.indexOf('/membership') === 0) return 'membership';
    if (path.indexOf('/vaultsparked') === 0) return 'vaultsparked';
    if (path.indexOf('/join') === 0) return 'join';
    if (path.indexOf('/invite') === 0) return 'invite';
    if (path.indexOf('/studio-pulse') === 0) return 'pulse';
    return 'home';
  }

  function getPromptState(context) {
    var state = window.VSIntentState ? window.VSIntentState.getState() : {};
    var title = 'What would make this page more effective for you?';
    var copy = 'Answer three quick signals. Your goal and friction answers stay local to this browser; the usefulness vote is shared anonymously (no text, no IDs) and feeds the public /feedback/ loop.';

    if (context === 'vaultsparked') {
      title = 'What would help you decide whether VaultSparked is worth it?';
    } else if (context === 'membership') {
      title = 'What would help this membership layer feel clearer or stronger?';
    } else if (context === 'pulse') {
      title = 'What operating signal would make the Studio Pulse more useful?';
    } else if (state.intent === 'lore') {
      title = 'What would deepen the world signal for you?';
    }

    return {
      title: title,
      copy: copy,
      state: state
    };
  }

  function buildOptions(name, labels) {
    return Object.keys(labels).map(function (key) {
      return (
        '<button type="button" class="micro-feedback-option" data-feedback-field="' + name + '" data-feedback-value="' + key + '">' +
          labels[key] +
        '</button>'
      );
    }).join('');
  }

  function buildSummaryMarkup(summary) {
    if (!summary || !summary.totalResponses) {
      return (
        '<div class="micro-feedback-summary">' +
          '<div class="micro-feedback-summary-card micro-feedback-summary-empty">' +
            '<span class="micro-feedback-label">No local feedback yet</span>' +
            '<strong>Your answers become the first live signal.</strong>' +
            '<p>This summary is intentionally public-safe and browser-local. It helps the site adapt without storing private notes.</p>' +
          '</div>' +
        '</div>'
      );
    }

    var topGoal = summary.topGoal ? summary.topGoal.label : 'No goal trend yet';
    var topBlocker = summary.topBlocker ? summary.topBlocker.label : 'No blocker trend yet';
    var topUsefulness = summary.topUsefulness ? summary.topUsefulness.label : 'No usefulness trend yet';

    return (
      '<div class="micro-feedback-summary">' +
        '<article class="micro-feedback-summary-card">' +
          '<span class="micro-feedback-label">Top Interest</span>' +
          '<strong>' + topGoal + '</strong>' +
          '<p>' + summary.totalResponses + ' local ' + pluralize(summary.totalResponses, 'response', 'responses') + ' captured so far.</p>' +
        '</article>' +
        '<article class="micro-feedback-summary-card">' +
          '<span class="micro-feedback-label">Top Friction</span>' +
          '<strong>' + topBlocker + '</strong>' +
          '<p>The strongest hesitation pattern in this browser session history.</p>' +
        '</article>' +
        '<article class="micro-feedback-summary-card">' +
          '<span class="micro-feedback-label">Current Read</span>' +
          '<strong>' + topUsefulness + '</strong>' +
          '<p>The strongest usefulness signal feeding the local intelligence layer.</p>' +
        '</article>' +
      '</div>'
    );
  }

  function renderRoot(root, intel) {
    var context = inferContext(root);
    var prompt = getPromptState(context);
    var summary = (intel && intel.feedback && intel.feedback.localSummary) || getSummary();
    var flash = safeConsumeFlash();

    root.innerHTML =
      '<button class="micro-feedback-toggle" type="button" aria-expanded="false">' +
        '<span class="micro-feedback-toggle-dot" aria-hidden="true"></span>' +
        '<span>Feedback</span>' +
      '</button>' +
      '<div class="micro-feedback-shell" hidden>' +
        '<div class="micro-feedback-head">' +
          '<p class="micro-feedback-kicker">Signal Feedback</p>' +
          '<h3 class="micro-feedback-title">' + prompt.title + '</h3>' +
          '<p class="micro-feedback-copy">' + prompt.copy + '</p>' +
        '</div>' +
        buildSummaryMarkup(summary) +
        '<form class="micro-feedback-form" data-feedback-form="' + context + '">' +
          '<div class="micro-feedback-group">' +
            '<span class="micro-feedback-question">What are you here for?</span>' +
            '<div class="micro-feedback-options">' +
              buildOptions('goal', GOAL_LABELS) +
            '</div>' +
          '</div>' +
          '<div class="micro-feedback-group">' +
            '<span class="micro-feedback-question">What is the main friction?</span>' +
            '<div class="micro-feedback-options">' +
              buildOptions('blocker', BLOCKER_LABELS) +
            '</div>' +
          '</div>' +
          '<div class="micro-feedback-group">' +
            '<span class="micro-feedback-question">Was this page useful?</span>' +
            '<div class="micro-feedback-options">' +
              buildOptions('usefulness', USEFULNESS_LABELS) +
            '</div>' +
          '</div>' +
          '<div class="micro-feedback-actions">' +
            '<span class="micro-feedback-status" aria-live="polite">' + flash + '</span>' +
            '<button class="micro-feedback-submit" type="submit">Save Signal</button>' +
          '</div>' +
        '</form>' +
        '<p class="micro-feedback-loop-link" style="margin:0.85rem 0 0;font-size:0.78rem;color:var(--dim);">' +
          'See where this goes &rarr; <a href="/changelog/#requests" style="color:rgba(31,162,255,0.85);">the feedback loop</a>' +
        '</p>' +
      '</div>';
  }

  function setSelected(form, field, value) {
    form.querySelectorAll('[data-feedback-field="' + field + '"]').forEach(function (button) {
      var selected = button.dataset.feedbackValue === value;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
    form.dataset[field] = value;
  }

  function saveFeedback(form) {
    var goal = form.dataset.goal;
    var blocker = form.dataset.blocker;
    var usefulness = form.dataset.usefulness;
    if (!goal || !blocker || !usefulness) return false;

    var state = window.VSIntentState ? window.VSIntentState.getState() : {};
    var entries = safeGetEntries();
    entries.push({
      submittedAt: new Date().toISOString(),
      context: form.dataset.feedbackForm || 'home',
      path: window.location.pathname,
      goal: goal,
      blocker: blocker,
      usefulness: usefulness,
      intent: state.intent || '',
      journeyStage: state.journey_stage || '',
      trustLevel: state.trust_level || ''
    });
    safeSetEntries(entries);
    shareUsefulness(usefulness);
    return true;
  }

  function rerenderAll() {
    if (!window.VSPublicIntel) return;
    window.VSPublicIntel.get().then(function (intel) {
      document.querySelectorAll('[data-micro-feedback-root]').forEach(function (root) {
        renderRoot(root, intel);
      });
    });
  }

  function init() {
    var roots = document.querySelectorAll('[data-micro-feedback-root]');
    if (!roots.length) return;

    rerenderAll();

    document.addEventListener('click', function (event) {
      var toggle = event.target.closest('.micro-feedback-toggle');
      if (toggle) {
        var root = toggle.closest('[data-micro-feedback-root]');
        var shell = root && root.querySelector('.micro-feedback-shell');
        if (!shell) return;
        var expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        shell.hidden = expanded;
        root.classList.toggle('is-open', !expanded);
        return;
      }

      var option = event.target.closest('.micro-feedback-option');
      if (!option) return;
      var form = option.closest('.micro-feedback-form');
      if (!form) return;
      setSelected(form, option.dataset.feedbackField, option.dataset.feedbackValue);
    });

    document.addEventListener('submit', function (event) {
      var form = event.target.closest('.micro-feedback-form');
      if (!form) return;
      event.preventDefault();
      var status = form.querySelector('.micro-feedback-status');
      if (!saveFeedback(form)) {
        if (status) status.textContent = 'Pick one answer in each row.';
        return;
      }

      safeSetFlash('Saved — usefulness vote shared anonymously, details kept local.');
      if (status) status.textContent = 'Saved — usefulness vote shared anonymously, details kept local.';

      // S131 audit #23: emoji-burst confirmation. Closes the loop visually +
      // haptically the moment a signal is deposited — turns a "did anything
      // happen?" submit into a felt response. Respects reduced-motion.
      try {
        var submitBtn = form.querySelector('button[type="submit"], .micro-feedback-submit');
        var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (submitBtn && !reduced) emojiBurst(submitBtn);
        if (navigator.vibrate) navigator.vibrate(15);
      } catch (e) { /* never block submit */ }
      if (window.VSIntentState) {
        window.VSIntentState.noteExposure('micro_feedback_' + (form.dataset.feedbackForm || 'site'));
      }
      if (window.VSFunnel && typeof window.VSFunnel.trackStage === 'function') {
        window.VSFunnel.trackStage('micro_feedback', 'submitted', {
          event_category: 'feedback',
          page_path: window.location.pathname,
          feedback_context: form.dataset.feedbackForm || '',
          feedback_goal: form.dataset.goal || '',
          feedback_blocker: form.dataset.blocker || '',
          feedback_usefulness: form.dataset.usefulness || ''
        });
      }

      window.setTimeout(rerenderAll, 180);
      document.dispatchEvent(new CustomEvent('vs:feedback-change', {
        detail: getSummary()
      }));
    });
  }

  window.VSFeedback = {
    getEntries: safeGetEntries,
    getSummary: getSummary,
    enrichIntel: enrichIntel,
    // S329 capability marker: the live e2e suite keys on this to decide whether
    // the deployed bundle shares the usefulness vote (assert) or predates the
    // capability (explicit skip — never a silent green).
    sharesUsefulness: true
  };

  if (window.VSPublicIntel && typeof window.VSPublicIntel.registerEnricher === 'function') {
    window.VSPublicIntel.registerEnricher(enrichIntel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})(window);
