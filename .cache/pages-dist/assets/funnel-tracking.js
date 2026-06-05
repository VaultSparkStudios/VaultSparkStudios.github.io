(function () {
  'use strict';

  function track(eventName, payload) {
    try {
      if (typeof gtag === 'function') {
        gtag('event', eventName, payload || {});
      }
    } catch (_) {}
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
