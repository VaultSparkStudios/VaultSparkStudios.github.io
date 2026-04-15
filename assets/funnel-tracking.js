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
    track: track
  };

  function buildPayload(el) {
    return {
      event_category: el.dataset.trackCategory || 'funnel',
      event_label: el.dataset.trackLabel || '',
      location: el.dataset.trackLocation || window.location.pathname,
      plan: el.dataset.trackPlan || '',
      destination: el.dataset.trackDestination || '',
      page_path: window.location.pathname
    };
  }

  document.addEventListener('click', function (event) {
    var target = event.target.closest('[data-track-event]');
    if (!target) return;
    track(target.dataset.trackEvent, buildPayload(target));
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
