// page-sigil.js (S129 · audit #12)
// Tiny 32×32 sigil rendered top-right of every public page. Stroke color reflects
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

  function mount(days) {
    const wrap = document.createElement('a');
    wrap.href = '/studio-pulse/';
    wrap.setAttribute('data-vs-page-sigil', '');
    wrap.setAttribute('aria-label',
      `Page last refreshed ${days}d ago — see studio pulse`);
    wrap.title = `Last refreshed ${days}d ago`;
    Object.assign(wrap.style, {
      position: 'fixed', top: '10px', right: '10px', width: '28px', height: '28px',
      zIndex: '40', opacity: '0.55', textDecoration: 'none',
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
      const r = await fetch('/api/public-intelligence.json', { cache: 'no-store' });
      if (!r.ok) return null;
      const data = await r.json();
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
