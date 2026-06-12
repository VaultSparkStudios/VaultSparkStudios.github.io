(function () {
  'use strict';

  // S194: track() emitted ONLY through gtag('event', …) — but gtag was removed
  // site-wide at S147/S175, so `typeof gtag === 'function'` was permanently false
  // and EVERY data-track-event / data-track-view / data-funnel-form interaction
  // was silently discarded. The whole named-event funnel was dead, masked by the
  // parallel /v/rum beacon the S186-S192 work built next to it. Rewire to that
  // live transport under a bounded `funnel:` family (allowlisted in the Worker via
  // prefixAllowlist). Names only — no payload — so the internal intent enums the
  // old gtag path leaked to Google (vault_trust, journey_stage, …) never leave the
  // browser. The event NAME is the signal; the Worker stores nothing else.
  function emitUx(name) {
    try {
      if (typeof name !== 'string' || !name) return;
      // Bound the suffix to the Worker prefixAllowlist contract: [a-z0-9_], <=48.
      var suffix = name.toLowerCase().replace(/[^a-z0-9_]+/g, '_').slice(0, 48);
      if (!suffix) return;
      var body = JSON.stringify({ route: window.location.pathname || '/', ux: 'funnel:' + suffix });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/v/rum', new Blob([body], { type: 'application/json' }));
      } else {
        fetch('/v/rum', { method: 'POST', body: body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(function () {});
      }
    } catch (_) {}
  }

  // Public API unchanged (call-sites pass a payload; it is intentionally dropped
  // at the sink for privacy — only the allowlisted event name is transmitted).
  function track(eventName, _payload) {
    emitUx(eventName);
  }

  window.VSFunnel = {
    track: track,
    trackStage: function (flow, stage, payload) {
      track(flow + '_' + stage, payload || {});
    }
  };

  function buildPayload(el) {
    var state = window.VSIntentState ? window.VSIntentState.getState() : {};
    return {
      event_category: el.dataset.trackCategory || 'funnel',
      event_label: el.dataset.trackLabel || '',
      location: el.dataset.trackLocation || window.location.pathname,
      plan: el.dataset.trackPlan || '',
      destination: el.dataset.trackDestination || '',
      page_path: window.location.pathname,
      vault_intent: state.intent || '',
      vault_confidence: state.confidence || 0,
      vault_stage: state.journey_stage || '',
      vault_trust: state.trust_level || '',
      vault_membership_temperature: state.membership_temperature || '',
      vault_returning_status: state.returning_status || ''
    };
  }

  document.addEventListener('click', function (event) {
    var target = event.target.closest('[data-track-event]');
    if (!target) return;
    if (window.VSIntentState && target.dataset.trackPlan) {
      window.VSIntentState.markMembershipIntent(true);
    }
    track(target.dataset.trackEvent, buildPayload(target));
  });

  var focusedForms = Object.create(null);
  document.addEventListener('focusin', function (event) {
    var form = event.target.closest('[data-funnel-form]');
    if (!form || focusedForms[form.id || form.dataset.funnelForm]) return;
    focusedForms[form.id || form.dataset.funnelForm] = true;
    if (window.VSIntentState && (form.dataset.trackCategory === 'membership' || form.dataset.trackCategory === 'join')) {
      window.VSIntentState.markMembershipIntent(true);
    }
    track(form.dataset.funnelForm + '_engaged', {
      event_category: form.dataset.trackCategory || 'funnel',
      page_path: window.location.pathname,
      vault_intent: window.VSIntentState ? window.VSIntentState.getState().intent : ''
    });
  });

  document.addEventListener('submit', function (event) {
    var form = event.target.closest('[data-funnel-form]');
    if (!form) return;
    if (window.VSIntentState && (form.dataset.trackCategory === 'membership' || form.dataset.trackCategory === 'join')) {
      window.VSIntentState.markMembershipIntent(true);
    }
    track(form.dataset.funnelForm + '_submit_started', {
      event_category: form.dataset.trackCategory || 'funnel',
      page_path: window.location.pathname,
      vault_intent: window.VSIntentState ? window.VSIntentState.getState().intent : ''
    });
  });

  if (!window.IntersectionObserver) return;

  var seen = Object.create(null);
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      var eventName = el.dataset.trackView;
      if (!eventName || seen[eventName]) return;
      seen[eventName] = true;
      if (window.VSIntentState) {
        window.VSIntentState.noteExposure(eventName);
      }
      track(eventName, buildPayload(el));
      observer.unobserve(el);
    });
  }, { threshold: 0.35 });

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-track-view]').forEach(function (el) {
      observer.observe(el);
    });
  });
})();
