// page-sigil.js (S129 · audit #12)
// Tiny 28px sigil with a 44×44 touch target at the top-right of every public page.
// last-update-age (green ≤14d, amber ≤60d, red >60d). Tooltip "Last refreshed Nd ago".
// Reads /api/public-intelligence.json `pages[<path>].lastTouched`; falls back to a
// page-level `<meta name="vs:last-touched">` tag; silently noop if neither exists.
//
// ~500 bytes inline. Doesn't ship a full SVG sprite — single circle path,
// stroke-dasharray ring fills relative to (1 - age/cap) so fresh pages look
// "fuller." Links to /studio-pulse/ for the global view.
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (document.documentElement.dataset.motion === 'reduced' && location.pathname === '/') {
    // Don't add visual flair on reduced-motion home — respect user preference.
  }
  if (document.querySelector('[data-vs-page-sigil]')) return;

  const FRESH_DAYS = 14;
  const STALE_DAYS = 60;

  function colorFor(days) {
    if (days <= FRESH_DAYS) return '#5be08e'; // green
    if (days <= STALE_DAYS) return '#e0b25b'; // amber
    return '#e05b5b';                          // red
  }

  // S357 (audit P0-1): the sigil used to sit at top:2px/right:2px — INSIDE the
  // header's own hit area. At 390px its 44×44 box covered ~30×29px (~45%) of
  // button#hamburger on 134 pages, so a tap meant for the nav navigated to
  // /studio-pulse/ instead. It now anchors below the header and re-verifies
  // itself against real header geometry, so no width can put it back on top of
  // a header control.
  const HEADER_CONTROL_SELECTOR = [
    '.site-header', '#hamburger', '.hamburger', '.site-header a',
    '.site-header button', '.site-header input', '.theme-picker', '.vs-account-chip'
  ].join(',');
  // S356: clearing the header alone was not enough. On the Studio pages an
  // intelligence rail is injected at runtime as UNCLASSED <a> chips directly
  // under the header (measured: header ends 115px, first chip spans 157–201px),
  // so no selector list could match it and the sigil landed on the rail. Any
  // interactive element anchored in the top zone counts as a collision now,
  // which also survives future markup it cannot know about.
  const TOP_ZONE_INTERACTIVE = 'a,button,[role="button"],input,select';
  const HEADER_ZONE_PX = 260; // only chrome anchored near the top can collide

  function overlaps(a, b) {
    return Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0
        && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0;
  }

  // Walk the sigil down until it clears every header control. Bounded passes —
  // a pathological header can never spin this.
  function place(wrap) {
    let top = 8;
    for (let pass = 0; pass < 8; pass++) {
      wrap.style.top = top + 'px';
      const me = wrap.getBoundingClientRect();
      let pushed = false;
      document.querySelectorAll(HEADER_CONTROL_SELECTOR + ',' + TOP_ZONE_INTERACTIVE).forEach((el) => {
        if (el === wrap || el.contains(wrap) || wrap.contains(el)) return;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0 || r.top > HEADER_ZONE_PX) return;
        if (overlaps(me, r)) {
          const next = Math.round(r.bottom) + 8;
          if (next > top) { top = next; pushed = true; }
        }
      });
      if (!pushed) break;
    }
    wrap.style.top = top + 'px';
  }

  function mount(days) {
    const wrap = document.createElement('a');
    wrap.href = '/studio-pulse/';
    wrap.setAttribute('data-vs-page-sigil', '');
    wrap.setAttribute('aria-label',
      `Page last refreshed ${days}d ago — see studio pulse`);
    wrap.title = `Last refreshed ${days}d ago`;
    Object.assign(wrap.style, {
      // top is computed by place() once the header's real box is measurable.
      position: 'fixed', top: '8px', right: '10px', width: '44px', height: '44px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      // Below the header (201) and the mobile drawer (200): the nav always wins.
      zIndex: '30', opacity: '0.55', textDecoration: 'none',
      transition: 'opacity 180ms ease', pointerEvents: 'auto'
    });
    wrap.addEventListener('mouseenter', () => { wrap.style.opacity = '0.95'; });
    wrap.addEventListener('mouseleave', () => { wrap.style.opacity = '0.55'; });

    const color = colorFor(days);
    const fillRatio = Math.max(0.12, 1 - Math.min(days, 90) / 90);
    const circumference = 2 * Math.PI * 11; // r=11
    const dash = circumference * fillRatio;
    // S174 TT burndown: SVG via createElementNS instead of innerHTML.
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 28 28');
    svg.setAttribute('width', '28');
    svg.setAttribute('height', '28');
    svg.setAttribute('aria-hidden', 'true');
    const circle = (attrs) => {
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('cx', '14');
      c.setAttribute('cy', '14');
      for (const [k, v] of Object.entries(attrs)) c.setAttribute(k, v);
      return c;
    };
    svg.appendChild(circle({ r: '11', fill: 'none', stroke: `${color}33`, 'stroke-width': '2' }));
    svg.appendChild(circle({
      r: '11', fill: 'none', stroke: color, 'stroke-width': '2',
      'stroke-dasharray': `${dash.toFixed(1)} ${circumference.toFixed(1)}`,
      'stroke-linecap': 'round', transform: 'rotate(-90 14 14)',
    }));
    svg.appendChild(circle({ r: '2.4', fill: color }));
    wrap.appendChild(svg);
    document.body.appendChild(wrap);
    place(wrap);
    let timer = 0;
    const replace = () => {
      clearTimeout(timer);
      timer = setTimeout(() => place(wrap), 120);
    };
    window.addEventListener('resize', replace, { passive: true });
    window.addEventListener('orientationchange', replace, { passive: true });
    // S356: resize alone was not enough. The Studio pages inject their
    // intelligence rail AFTER mount, so the one placement pass measured a page
    // that did not contain the chips yet and the sigil settled on top of them
    // (measured: sigil top 123, first chip 157–201). Re-place on DOM changes for
    // a bounded settle window, then stop — this must never become a live
    // observer on every page.
    if (typeof MutationObserver === 'function') {
      const observer = new MutationObserver(replace);
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => { observer.disconnect(); replace(); }, 5000);
    }
    window.addEventListener('load', replace, { once: true, passive: true });
  }

  function fromMeta() {
    const m = document.querySelector('meta[name="vs:last-touched"]');
    if (!m) return null;
    const t = Date.parse(m.getAttribute('content'));
    if (Number.isNaN(t)) return null;
    return Math.max(0, Math.round((Date.now() - t) / 86400000));
  }

  async function fromAPI() {
    try {
      const data = window.VSPublicSignals
        ? await window.VSPublicSignals.get('/api/public-intelligence.json')
        : await fetch('/api/public-intelligence.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null);
      if (!data) return null;
      const ts = data?.generatedAt || data?.lastUpdated || data?.updated;
      if (!ts) return null;
      const t = Date.parse(ts);
      if (Number.isNaN(t)) return null;
      return Math.max(0, Math.round((Date.now() - t) / 86400000));
    } catch { return null; }
  }

  // Skip portals/admin and pages that opt-out.
  const skip = /^\/(vault-member|investor-portal|studio-hub|admin)/.test(location.pathname);
  if (skip || document.body.hasAttribute('data-no-sigil')) return;

  if ('requestIdleCallback' in window) {
    requestIdleCallback(async () => {
      const days = fromMeta() ?? await fromAPI();
      if (days === null) return;
      mount(days);
    }, { timeout: 2000 });
  } else {
    setTimeout(async () => {
      const days = fromMeta() ?? await fromAPI();
      if (days === null) return;
      mount(days);
    }, 800);
  }
})();
