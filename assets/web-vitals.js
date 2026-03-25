/**
 * VaultSpark Studios — Core Web Vitals Reporting
 * Reports LCP, CLS, FID/INP, FCP, TTFB to Google Analytics 4
 * as custom events. Uses the web-vitals attribution build.
 */
(function() {
  'use strict';

  function sendToGA(metric) {
    if (typeof gtag !== 'function') return;
    gtag('event', metric.name, {
      event_category:    'Web Vitals',
      event_label:       metric.id,
      value:             Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      non_interaction:   true,
      metric_rating:     metric.rating || 'unknown',
      metric_delta:      Math.round(metric.delta),
      metric_navigationType: metric.navigationType || 'navigate',
    });
  }

  // Polyfill-free CLS measurement
  function measureCLS() {
    let clsValue = 0;
    let clsEntries = [];
    let sessionValue = 0;
    let sessionEntries = [];

    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          const firstEntry = sessionEntries[0];
          const lastEntry = sessionEntries[sessionEntries.length - 1];
          if (
            sessionValue &&
            entry.startTime - lastEntry.startTime < 1000 &&
            entry.startTime - firstEntry.startTime < 5000
          ) {
            sessionValue += entry.value;
            sessionEntries.push(entry);
          } else {
            sessionValue = entry.value;
            sessionEntries = [entry];
          }
          if (sessionValue > clsValue) {
            clsValue = sessionValue;
            clsEntries = sessionEntries.slice();
          }
        }
      }
    });
    try { observer.observe({ type: 'layout-shift', buffered: true }); } catch(e) {}

    // Report on page hide
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        sendToGA({ name: 'CLS', id: 'v3-cls', value: clsValue, delta: clsValue, rating: clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor' });
      }
    }, { once: true });
  }

  // LCP
  function measureLCP() {
    if (!('PerformanceObserver' in window)) return;
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) {
        const value = last.startTime;
        sendToGA({ name: 'LCP', id: 'v3-lcp', value, delta: value, rating: value < 2500 ? 'good' : value < 4000 ? 'needs-improvement' : 'poor' });
      }
    });
    try { observer.observe({ type: 'largest-contentful-paint', buffered: true }); } catch(e) {}
    document.addEventListener('visibilitychange', () => { try { observer.takeRecords(); observer.disconnect(); } catch(e) {} }, { once: true });
  }

  // FCP
  function measureFCP() {
    if (!('PerformanceObserver' in window)) return;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          observer.disconnect();
          const value = entry.startTime;
          sendToGA({ name: 'FCP', id: 'v3-fcp', value, delta: value, rating: value < 1800 ? 'good' : value < 3000 ? 'needs-improvement' : 'poor' });
        }
      }
    });
    try { observer.observe({ type: 'paint', buffered: true }); } catch(e) {}
  }

  // TTFB
  function measureTTFB() {
    if (!('performance' in window)) return;
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav) {
      const value = nav.responseStart;
      sendToGA({ name: 'TTFB', id: 'v3-ttfb', value, delta: value, rating: value < 800 ? 'good' : value < 1800 ? 'needs-improvement' : 'poor' });
    }
  }

  // Run after page load
  if (document.readyState === 'complete') {
    measureCLS(); measureLCP(); measureFCP(); measureTTFB();
  } else {
    window.addEventListener('load', () => { measureCLS(); measureLCP(); measureFCP(); measureTTFB(); });
  }
})();
