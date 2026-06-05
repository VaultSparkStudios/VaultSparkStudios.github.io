// pointerdown-warm.js (S129 · audit #13)
// Between pointerdown and click on internal nav links there are ~60-200ms before
// navigation actually starts. During that gap we inject <link rel="prerender">
// for the target so the browser kicks off a head start. On pointercancel/leave
// the hint is removed so we don't waste prerender slots if the user changes mind.
//
// Composes with Speculation Rules (S126 #1) which handles hover/touch-intent —
// this layer covers the long-tail of accessibility/keyboard/precise-touch users
// whose first observable signal is the pointerdown itself.
//
// Respects: same-origin · not target=_blank · not [data-no-prerender] ·
// Save-Data · 2G/slow-2G effective type.
(() => {
  if (typeof window === 'undefined') return;
  try {
    const c = navigator.connection;
    if (c && (c.saveData || /(^|-)2g$/i.test(c.effectiveType || ''))) return;
  } catch {}

  const HINT_ATTR = 'data-vs-pointerdown-prerender';
  let pending = null;

  function clearHint() {
    if (pending && pending.parentNode) pending.parentNode.removeChild(pending);
    pending = null;
  }

  function shouldWarm(a) {
    if (!a || a.tagName !== 'A') return false;
    if (a.hasAttribute('data-no-prerender')) return false;
    if (a.target && a.target !== '_self') return false;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;
    try {
      const u = new URL(href, location.href);
      return u.origin === location.origin && u.pathname !== location.pathname;
    } catch {
      return false;
    }
  }

  document.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const a = e.target && e.target.closest && e.target.closest('a');
    if (!shouldWarm(a)) return;
    clearHint();
    try {
      const link = document.createElement('link');
      link.rel = 'prerender';
      link.href = a.href;
      link.setAttribute(HINT_ATTR, '1');
      document.head.appendChild(link);
      pending = link;
    } catch {}
  }, { passive: true, capture: true });

  // Cancel if the click never lands within ~600ms (user changed mind).
  ['pointercancel', 'pointerleave'].forEach((evt) => {
    document.addEventListener(evt, clearHint, { passive: true, capture: true });
  });
  document.addEventListener('click', () => {
    // Navigation will run; the prerender hint can stay until the page unloads.
    pending = null;
  }, { capture: true });
})();
