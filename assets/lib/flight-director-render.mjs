/* flight-director-render.mjs — the ONE renderer for the Pathfinder panel
 * (intent-flight-director), shared by the build-time SSR generator and the client
 * (S277 CLS root-fix).
 *
 * WHY: the panel used to be built post-paint by assets/intent-flight-director.js and
 * insertBefore()'d high in <main>, pushing the page down and measuring ~0.14 CLS on
 * /games/. Rendered at build it is present at first paint (real content → correct height
 * on every viewport, sidestepping the brittle min-height reservation the audit flagged),
 * so there is zero layout shift. The client then RE-RANKS the same 3 card slots in place
 * with local personalization — same slot count → stable height → the feature's local-first
 * soul is preserved with no shift.
 *
 * Pure + isomorphic: no I/O, no Date, safe in Node and the browser. The default (no client
 * state) ordering is just the graph's context order sliced to 3 — deterministic, so the
 * committed HTML is stable and the --check drift gate is real.
 */

export const FD_ROUTES = ['/', '/membership/', '/games/', '/universe/', '/studio-pulse/', '/oracle/'];

/** route pathname → graph context key (mirrors the client routeContext()). */
export function routeContext(pathname) {
  const p = pathname || '/';
  if (p === '/') return 'home';
  if (p.indexOf('/membership') === 0) return 'membership';
  if (p.indexOf('/games') === 0) return 'games';
  if (p.indexOf('/projects') === 0) return 'projects';
  if (p.indexOf('/universe') === 0) return 'universe';
  if (p.indexOf('/studio-pulse') === 0) return 'pulse';
  if (p.indexOf('/oracle') === 0) return 'oracle';
  if (p.indexOf('/journal') === 0) return 'journal';
  if (p.indexOf('/studio') === 0) return 'studio';
  return '';
}

export function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Default (no client-state) cards for a context: the graph order, capped at 3. */
export function defaultCards(graph, context) {
  const keys = (graph.contexts && (graph.contexts[context] || graph.contexts.home)) || [];
  return keys
    .map((key) => {
      const node = graph.nodes && graph.nodes[key];
      return node && Object.assign({ key }, node);
    })
    .filter(Boolean)
    .slice(0, 3);
}

/** The inline style block — identical declarations to the legacy client ensureStyles(). */
export const FD_STYLE =
  '<style id="vs-flight-director-style">' +
  '.vs-flight-director{padding:0 0 2.4rem}.vs-flight-director__panel{display:grid;grid-template-columns:1.1fr repeat(3,1fr);gap:.75rem;padding:1rem;border:1px solid var(--line);border-radius:18px;background:linear-gradient(135deg,rgba(31,162,255,.06),rgba(255,196,0,.035));box-shadow:var(--shadow)}' +
  '.vs-flight-director__lead{padding:.2rem .4rem}.vs-flight-director__eyebrow{font-size:.72rem;text-transform:uppercase;letter-spacing:.12em;color:var(--gold);font-weight:800}.vs-flight-director h2{font-family:Georgia,serif;font-size:clamp(1.3rem,2.3vw,2rem);margin:.35rem 0 .45rem}.vs-flight-director p{color:var(--muted);font-size:.92rem;line-height:1.55}' +
  '.vs-flight-card{display:flex;flex-direction:column;gap:.45rem;min-height:148px;padding:.9rem;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.035);text-decoration:none;color:inherit;position:relative}.vs-flight-card:hover{border-color:rgba(255,196,0,.35);background:rgba(255,196,0,.06)}.vs-flight-card strong{font-size:1rem}.vs-flight-card span{font-size:.7rem;text-transform:uppercase;letter-spacing:.1em;color:var(--gold);font-weight:800}.vs-flight-card em{margin-top:auto;font-style:normal;color:var(--dim);font-size:.8rem}' +
  '.vs-flight-new{position:absolute;top:.6rem;right:.7rem;font-size:.6rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em;padding:.18em .45em;border-radius:4px;background:var(--gold);color:#000;line-height:1}' +
  '.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}' +
  '.vs-flight-hidden{display:none}' +
  '@media(max-width:860px){.vs-flight-director__panel{grid-template-columns:1fr}.vs-flight-card{min-height:0}}' +
  '</style>';

/** One card anchor (matches the client card template; data-fd-key hooks hydration). */
export function cardHtml(card) {
  const newBadge = card.new ? '<span class="vs-flight-new">New</span>' : '';
  return (
    '<a class="vs-flight-card" data-fd-key="' + esc(card.key) + '" href="' + esc(card.href) + '">' +
    newBadge +
    '<span>' + esc(card.eyebrow) + '</span>' +
    '<strong>' + esc(card.title) + '</strong>' +
    '<p>' + esc(card.copy) + '</p>' +
    '<em>Open →</em></a>'
  );
}

/**
 * The full Pathfinder section as an HTML string, or '' when there are no cards.
 * data-fd-ssr marks it as build-rendered so the client re-ranks in place.
 */
export function renderFlightPanel(cards) {
  if (!cards || !cards.length) return '';
  return (
    FD_STYLE +
    '<section class="vs-flight-director" data-fd-ssr aria-label="Recommended next steps">' +
    '<div class="container"><div class="vs-flight-director__panel">' +
    '<div class="vs-flight-director__lead"><div class="vs-flight-director__eyebrow">Pathfinder</div>' +
    '<h2>Your next clean move.</h2>' +
    '<p>Chosen locally from your current page, saved intent, and live studio signals. No account data leaves the browser.</p></div>' +
    cards.map(cardHtml).join('') +
    '</div></div></section>'
  );
}
