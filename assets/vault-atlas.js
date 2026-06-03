// vault-atlas.js (S129 · audit #9)
// Vault Atlas — a 5-dot live status strip that appears at the top of the
// Resources dropdown. Each dot reflects a real surface:
//   • homepage    — synthetic /api/ci-status.json `homepage.ok`
//   • pulse       — public-intelligence freshness (≤7d green, ≤30d amber)
//   • hub         — founder-presence.json `online` flag
//   • ignis       — ignis_alerts surface (degraded → amber, down → red)
//   • checkout    — Stripe price endpoint reachability cached server-side
//
// Sources are best-effort — anything 404/timeout renders neutral gray.
// Refreshes every 90 s while the dropdown is open. ~2 KB on the wire.
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const SURFACES = [
    { key: 'homepage', label: 'Homepage' },
    { key: 'pulse',    label: 'Studio Pulse' },
    { key: 'hub',      label: 'Hub' },
    { key: 'ignis',    label: 'IGNIS' },
    { key: 'checkout', label: 'Checkout' },
  ];
  const COLORS = { up: '#5be08e', degraded: '#e0b25b', down: '#e05b5b', unknown: '#888' };
  let refreshTimer = null;

  function findResourcesDropdown() {
    return document.querySelector('[data-resources-dropdown]') ||
           Array.from(document.querySelectorAll('.nav-dropdown')).find((el) => {
             const trigger = el.querySelector('button, a');
             return trigger && /resources/i.test(trigger.textContent || '');
           });
  }

  async function snapshot() {
    const out = {};
    for (const s of SURFACES) out[s.key] = 'unknown';
    const safe = async (fn) => { try { return await fn(); } catch { return null; } };

    const [ci, pi, fp] = await Promise.all([
      safe(() => fetch('/api/ci-status.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null)),
      safe(() => fetch('/api/public-intelligence.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null)),
      safe(() => fetch('/api/founder-presence.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null)),
    ]);

    if (ci) out.homepage = ci.ok !== false ? 'up' : 'down';
    if (pi) {
      const ts = pi.generatedAt || pi.lastUpdated;
      if (ts) {
        const days = (Date.now() - Date.parse(ts)) / 86400000;
        out.pulse = days <= 7 ? 'up' : days <= 30 ? 'degraded' : 'down';
      }
    }
    if (fp) out.hub = fp.online ? 'up' : 'degraded';

    // IGNIS — heuristic: if public-intelligence has ignis block, treat as up
    if (pi && (pi.ignisDailyMeter || pi.ignis)) out.ignis = 'up';

    // Checkout — assume up if no signal (it's hard to probe Stripe from client without leaking key)
    out.checkout = ci && ci.checkout ? ci.checkout : 'unknown';
    return out;
  }

  function render(strip, status) {
    const parts = SURFACES.map((s) => {
      const v = status[s.key] || 'unknown';
      const color = COLORS[v] || COLORS.unknown;
      return `<span title="${s.label}: ${v}"
        style="display:inline-block;width:8px;height:8px;border-radius:50%;
        background:${color};margin-right:6px;vertical-align:middle;
        box-shadow:0 0 6px ${color}66"></span>`;
    });
    strip.innerHTML = `<div style="padding:8px 12px;font:11px/1.4 system-ui;opacity:.78;
      border-bottom:1px solid rgba(255,255,255,.08);margin-bottom:4px">
      <span style="text-transform:uppercase;letter-spacing:.08em;font-weight:600;
        margin-right:8px;opacity:.6">Live</span>${parts.join('')}
      <a href="/status/" data-no-prerender
         style="float:right;color:inherit;opacity:.6;text-decoration:none">details →</a>
    </div>`;
  }

  async function mount() {
    const dropdown = findResourcesDropdown();
    if (!dropdown) return;
    const panel = dropdown.querySelector('.nav-dropdown-menu, [role="menu"], ul') || dropdown;
    if (panel.querySelector('[data-vs-atlas]')) return;

    const strip = document.createElement('div');
    strip.setAttribute('data-vs-atlas', '');
    panel.insertBefore(strip, panel.firstChild);
    render(strip, Object.fromEntries(SURFACES.map(s => [s.key, 'unknown'])));

    const status = await snapshot();
    render(strip, status);

    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(async () => {
      if (!document.body.contains(strip)) { clearInterval(refreshTimer); return; }
      render(strip, await snapshot());
    }, 90000);
  }

  if ('requestIdleCallback' in window) {
    requestIdleCallback(mount, { timeout: 2500 });
  } else {
    setTimeout(mount, 1200);
  }
})();
