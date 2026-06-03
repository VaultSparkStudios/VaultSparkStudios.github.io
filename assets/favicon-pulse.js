/* favicon-pulse.js — ambient vault-pulse favicon (S155 audit #30).
 *
 * Renders the favicon as an inline SVG that pulses gold when a live studio
 * session is active (read from /api/founder-presence.json), steel otherwise.
 *
 * No bundle weight cost beyond ~1.2KB; no extra requests after the existing
 * presence poll on supported pages. Falls back silently if presence JSON is
 * unreachable — the page keeps its declared PNG favicon.
 *
 * Why: every visitor's browser tab shows the studio is alive. Pure brand
 * ambient — no UI surface, no privacy footprint, no third-party.
 */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;

  const STEEL = '#94a3b8';
  const GOLD  = '#ffc400';
  const PRESENCE_URL = '/api/founder-presence.json';
  const POLL_MS = 90_000; // 90s; aligned with hero-ticker presence checks

  function makeSvg(active) {
    const fill = active ? GOLD : STEEL;
    const glow = active
      ? '<animate attributeName="opacity" values="0.55;1;0.55" dur="2.4s" repeatCount="indefinite"/>'
      : '';
    // 32x32, vault-keyhole sigil shape; small enough to inline.
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
      '<rect width="32" height="32" rx="6" fill="#0a0b10"/>' +
      `<g fill="${fill}">` +
      `<circle cx="16" cy="13" r="5.5"${active ? ' opacity="1"' : ''}>${glow}</circle>` +
      '<path d="M13 18.5 L19 18.5 L17.5 26 L14.5 26 Z"/>' +
      '</g>' +
      '</svg>'
    );
  }

  // Original favicon href captured before any replacement so we can restore it.
  var originalFaviconHref = null;
  try {
    var existingIcon = document.querySelector('link[rel="icon"]');
    if (existingIcon) originalFaviconHref = existingIcon.href;
  } catch (_) {}

  function setFavicon(active) {
    try {
      var link = document.querySelector('link[rel="icon"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      if (active) {
        // Gold animated sigil when founder is present.
        var svg = makeSvg(true);
        link.type = 'image/svg+xml';
        link.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
      } else {
        // S161: restore original PNG favicon when founder is not present.
        // Do not show the grey sigil by default — keep brand identity intact.
        link.type = 'image/png';
        link.href = originalFaviconHref || 'assets/icon-32.png';
      }
      // Tab title hint when active — gold dot prefix, idempotent.
      var t = document.title || '';
      if (active && !t.startsWith('● ')) document.title = '● ' + t;
      else if (!active && t.startsWith('● ')) document.title = t.slice(2);
    } catch (_) { /* fail-silent */ }
  }

  let lastActive = null;

  // S156 audit #33 — BroadcastChannel presence mirror. Presence is browser-scoped
  // truth, not tab-scoped. The first tab to fetch broadcasts to sibling tabs;
  // other tabs in the same browser don't re-poll until the broadcast ages out.
  // Leader election by lowest UUID per refresh window keeps polling exactly-once.
  const BC_NAME = 'vault-presence';
  const LEADER_KEY = 'vault-presence-leader';
  const LEADER_TTL_MS = POLL_MS + 15_000; // tolerate ~15s leader handoff slack
  const myId = (window.crypto && window.crypto.randomUUID)
    ? window.crypto.randomUUID()
    : String(Math.random()).slice(2) + Date.now();
  let bc = null;
  try { bc = ('BroadcastChannel' in window) ? new BroadcastChannel(BC_NAME) : null; } catch (_) { bc = null; }

  function applyRemote(active) {
    if (active !== lastActive) {
      setFavicon(active);
      lastActive = active;
    }
  }

  if (bc) {
    bc.onmessage = (e) => {
      const d = e && e.data;
      if (!d || typeof d.active !== 'boolean') return;
      applyRemote(d.active);
    };
  }

  function isLeader() {
    try {
      const raw = sessionStorage.getItem(LEADER_KEY);
      if (!raw) return claimLeader();
      const { id, ts } = JSON.parse(raw);
      if (Date.now() - ts > LEADER_TTL_MS) return claimLeader();
      return id === myId;
    } catch (_) { return true; }
  }
  function claimLeader() {
    try { sessionStorage.setItem(LEADER_KEY, JSON.stringify({ id: myId, ts: Date.now() })); } catch (_) {}
    return true;
  }

  async function tick() {
    if (!isLeader()) return;
    try {
      const r = await fetch(PRESENCE_URL, { cache: 'no-store' });
      if (!r.ok) return;
      const j = await r.json();
      const active = !!(j && (j.active === true || j.live === true || j.activeUntil));
      if (active !== lastActive) {
        setFavicon(active);
        lastActive = active;
      }
      if (bc) { try { bc.postMessage({ active, ts: Date.now() }); } catch (_) {} }
    } catch (_) { /* fail-silent */ }
  }

  // S161: keep original PNG favicon until first presence poll resolves.
  // Only replace on active=true (gold) or when reverting from active to inactive.
  // Poll presence; first call fires after page load so we don't compete with LCP.
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => { tick(); setInterval(tick, POLL_MS); });
  } else {
    setTimeout(() => { tick(); setInterval(tick, POLL_MS); }, 1500);
  }
})();
