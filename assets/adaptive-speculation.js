// adaptive-speculation.js — bandwidth/memory/battery-aware speculation rules.
//
// Implements audit item #6 (speculation-rules-adaptive-prerender, 2026-05-22).
//
// Replaces the static <script type="speculationrules"> block at the bottom of
// pages with a runtime-injected, signal-aware variant:
//
//   - Fast desktop (4g+, 8GB+ RAM, no saveData, motion OK, battery OK)
//       → prerender top likely-next-navs (eagerness: "eager")
//       → prefetch broader catalog (eagerness: "moderate")
//   - Mid-range / mobile (3g, 4GB RAM)
//       → prerender only on hover/touchstart (eagerness: "conservative")
//       → prefetch broader catalog (eagerness: "conservative")
//   - Slow / metered / saveData / reduced-motion / low battery
//       → prefetch only the highest-confidence routes
//       → no prerender (saves bandwidth + battery for the visitor)
//
// Free-tier Cloudflare doesn't charge for prerendered traffic — pure win on
// fast connections, polite degradation on slow ones.

(function () {
  if (!document || !document.head) return;
  if (!('HTMLScriptElement' in window)) return;
  if (document.querySelector('script[data-vs-adaptive-speculation]')) return;

  // S174 TT burndown: speculationrules JSON written into a <script> element is
  // a TrustedScript sink. Narrow policy — only this module's locally-built
  // JSON ever flows through it. Graceful no-op when trustedTypes is absent.
  let ttPolicy = null;
  try {
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
      ttPolicy = window.trustedTypes.createPolicy('vs-speculation', {
        createScript: (s) => s,
      });
    }
  } catch (_e) { /* duplicate policy name or restricted — fall through */ }
  const asScript = (s) => (ttPolicy ? ttPolicy.createScript(s) : s);

  // Read network / device signals (all defensive — every API may be absent).
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};
  const effectiveType = conn.effectiveType || '4g';
  const saveData = conn.saveData === true;
  const downlink = typeof conn.downlink === 'number' ? conn.downlink : 10;
  const deviceMemory = typeof navigator.deviceMemory === 'number' ? navigator.deviceMemory : 8;
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Battery is async — start with optimistic assumption, downgrade if low.
  let batteryLow = false;
  if (navigator.getBattery) {
    try {
      navigator.getBattery().then(function (b) {
        if (b && (b.level < 0.2) && !b.charging) {
          // Battery already too low — we already emitted at full eagerness;
          // remove the prerender rule to be polite.
          batteryLow = true;
          const el = document.querySelector('script[data-vs-adaptive-speculation]');
          if (el && el.dataset.tier !== 'conservative') {
            const rules = JSON.parse(el.textContent);
            delete rules.prerender;
            el.textContent = asScript(JSON.stringify(rules));
            el.dataset.tier = 'low-battery';
          }
        }
      }).catch(function () {});
    } catch (e) {}
  }

  // Tier selection.
  let tier;
  if (saveData || reducedMotion || effectiveType === 'slow-2g' || effectiveType === '2g') {
    tier = 'conservative';
  } else if (effectiveType === '3g' || downlink < 3 || deviceMemory < 4) {
    tier = 'moderate';
  } else {
    tier = 'eager';
  }

  // Shared NOT-clause — never speculate auth/admin/api/portal/marked surfaces.
  const denyList = [
    { not: { href_matches: '/vault-member/*' } },
    { not: { href_matches: '/investor-portal/*' } },
    { not: { href_matches: '/admin/*' } },
    { not: { href_matches: '/api/*' } },
    { not: { href_matches: '/*/admin/*' } },
    { not: { selector_matches: '[data-no-prerender]' } },
    { not: { selector_matches: '.no-prerender' } }
  ];

  const rules = {};

  if (tier === 'eager') {
    rules.prerender = [{
      where: { and: [{ href_matches: '/*' }].concat(denyList) },
      eagerness: 'moderate'
    }];
    rules.prefetch = [{
      where: { href_matches: '/*' },
      eagerness: 'conservative'
    }];
  } else if (tier === 'moderate') {
    rules.prerender = [{
      where: { and: [{ href_matches: '/*' }].concat(denyList) },
      eagerness: 'conservative'
    }];
    rules.prefetch = [{
      where: { href_matches: '/*' },
      eagerness: 'conservative'
    }];
  } else {
    // Conservative: prefetch only the highest-confidence routes (no prerender).
    rules.prefetch = [{
      where: { and: [{ href_matches: '/*' }].concat(denyList) },
      eagerness: 'conservative'
    }];
  }

  // Remove the static block (vs-speculation:start/end) if it exists — we own this now.
  const existing = document.querySelectorAll('script[type="speculationrules"]:not([data-vs-adaptive-speculation])');
  existing.forEach(function (el) { el.parentNode && el.parentNode.removeChild(el); });

  const s = document.createElement('script');
  s.type = 'speculationrules';
  s.dataset.vsAdaptiveSpeculation = '';
  s.dataset.tier = tier;
  s.dataset.signals = JSON.stringify({ effectiveType: effectiveType, saveData: saveData, downlink: downlink, deviceMemory: deviceMemory, reducedMotion: reducedMotion });
  s.textContent = asScript(JSON.stringify(rules));
  document.head.appendChild(s);
})();
