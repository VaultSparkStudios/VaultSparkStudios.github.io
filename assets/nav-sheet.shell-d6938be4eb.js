/* nav-sheet.js — opt-in mobile bottom-sheet alternative to the left drawer.
 *
 * The drawer (nav-toggle.js) has been rebuilt 3× and is now stable; this
 * sheet variant ships behind a feature flag so the proven drawer remains
 * the default while the bottom-sheet UX bakes.
 *
 * Activation (any of):
 *   - URL contains `?nav=sheet`
 *   - localStorage `vs-nav-style` === 'sheet'
 *
 * When active, the hamburger opens a portal-to-body bottom sheet instead of
 * the left drawer. Same nav links — sourced by cloning `#nav-menu` items so
 * propagate-nav.mjs is the single source of truth.
 *
 * Why bottom sheet: iPhone 11+ thumb-reach is the bottom third; left drawer
 * forces a stretch. Audit S159 #9. Sheet caps at 60dvh with a drag handle.
 *
 * Why opt-in: 3 prior drawer rebuilds (S130/S132/S134 contract gates) mean
 * any nav rewrite carries regression risk. Flag-gating lets the founder
 * verify mobile flows before flipping default.
 */
(function () {
  'use strict';

  function shouldActivate() {
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.get('nav') === 'sheet') {
        try { localStorage.setItem('vs-nav-style', 'sheet'); } catch (_) {}
        return true;
      }
      if (params.get('nav') === 'drawer') {
        try { localStorage.removeItem('vs-nav-style'); } catch (_) {}
        return false;
      }
      // S195 (item 10): explicit, durable kill-switch. `?nav=classic` (or a stored
      // 'classic') permanently opts a device back to the legacy drawer — the
      // reversible escape hatch that makes graduating the default safe.
      if (params.get('nav') === 'classic') {
        try { localStorage.setItem('vs-nav-style', 'classic'); } catch (_) {}
        return false;
      }
      if (localStorage.getItem('vs-nav-style') === 'classic') return false;
      if (localStorage.getItem('vs-nav-style') === 'sheet') return true;
      if (!window.matchMedia || !window.matchMedia('(max-width: 768px)').matches) return false;
      // S195: graduation ramp. S174 ran 5%, S185 raised to 25%; with the kill-switch
      // now in place the canary moves to 50% to gather the data the full default
      // swap needs. The 100% flip stays founder-device-verify-gated (flag-gated
      // UX-swap discipline) — that real-device pass is the remaining human step.
      // Default remains the proven full-height drawer until the sheet cohort is
      // explicitly enabled on a page or with ?nav=sheet.
      var canary = Number(document.documentElement.getAttribute('data-nav-sheet-canary') || 0);
      if (canary <= 0) return false;
      var key = localStorage.getItem('vs-nav-canary-key');
      if (!key) {
        key = String(Math.floor(Math.random() * 100));
        localStorage.setItem('vs-nav-canary-key', key);
      }
      return Number(key) < canary;
    } catch (_) { return false; }
  }

  if (!shouldActivate()) return;

  function init(openImmediately) {
    var hamburger = document.getElementById('hamburger');
    var navMenu   = document.getElementById('nav-menu');
    if (!hamburger || !navMenu) return;

    // Hide the original drawer's overlay so the legacy nav-toggle.js code path
    // stops firing visually. We still want the hamburger button itself — just
    // intercept its click before nav-toggle.js bubbles it.
    hamburger.setAttribute('data-nav-sheet', 'active');

    // Build the sheet DOM once.
    var backdrop = document.createElement('div');
    backdrop.className = 'vs-nav-sheet-backdrop';
    var sheet = document.createElement('aside');
    sheet.className = 'vs-nav-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', 'Site navigation');
    sheet.setAttribute('hidden', '');
    // Trusted Types is enforced across the site: construct the sheet with DOM
    // APIs rather than assigning HTML strings, so the canary never becomes a
    // CSP-only dead feature.
    var handle = document.createElement('div');
    handle.className = 'vs-nav-sheet-handle';
    handle.setAttribute('aria-hidden', 'true');
    var head = document.createElement('header');
    head.className = 'vs-nav-sheet-head';
    var eyebrow = document.createElement('span');
    eyebrow.className = 'vs-nav-sheet-eyebrow';
    eyebrow.textContent = 'Navigation';
    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'vs-nav-sheet-close';
    close.setAttribute('aria-label', 'Close navigation');
    close.textContent = '\xD7';
    head.appendChild(eyebrow);
    head.appendChild(close);
    var body = document.createElement('nav');
    body.className = 'vs-nav-sheet-body';
    body.id = 'vsNavSheetBody';
    sheet.appendChild(handle);
    document.body.appendChild(backdrop);
    sheet.appendChild(head);
    sheet.appendChild(body);
    document.body.appendChild(sheet);

    // Inject styles inline so the sheet never depends on a shell-asset hash flip.
    var styleId = 'vs-nav-sheet-styles';
    if (!document.getElementById(styleId)) {
      var st = document.createElement('style');
      st.id = styleId;
      st.textContent =
        '.vs-nav-sheet-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:2147483640;opacity:0;pointer-events:none;transition:opacity 240ms ease}' +
        '.vs-nav-sheet-backdrop.open{opacity:1;pointer-events:auto}' +
        '.vs-nav-sheet{position:fixed;left:0;right:0;bottom:0;max-height:60dvh;background:var(--mobile-nav-bg,rgba(5,6,14,0.99));border-top:1px solid var(--mobile-nav-border,rgba(255,255,255,0.06));border-radius:18px 18px 0 0;z-index:2147483641;transform:translateY(100%);transition:transform 280ms cubic-bezier(.4,0,.2,1);overflow:auto;padding:0.6rem 1.1rem calc(1.4rem + env(safe-area-inset-bottom,0px));color:var(--text);display:flex;flex-direction:column;box-shadow:0 -18px 60px rgba(0,0,0,0.6)}' +
        '.vs-nav-sheet[hidden]{display:none}' +
        '.vs-nav-sheet.open{transform:translateY(0)}' +
        '.vs-nav-sheet-handle{width:42px;height:4px;border-radius:2px;background:rgba(255,255,255,0.18);margin:0 auto 0.6rem}' +
        '.vs-nav-sheet-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:0.8rem}' +
        '.vs-nav-sheet-eyebrow{font-size:0.74rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted)}' +
        '.vs-nav-sheet-close{background:transparent;border:0;color:var(--text);font-size:1.5rem;line-height:1;width:44px;height:44px;border-radius:10px}' +
        '.vs-nav-sheet-close:hover{background:rgba(255,255,255,0.06)}' +
        '.vs-nav-sheet-body{display:flex;flex-direction:column;gap:0.1rem}' +
        '.vs-nav-sheet-body a{padding:0.9rem 0.4rem;color:var(--text);font-weight:500;font-size:1rem;border-radius:8px;display:block}' +
        '.vs-nav-sheet-body a:hover,.vs-nav-sheet-body a:active{background:rgba(255,255,255,0.05)}' +
        '.vs-nav-sheet-body .vs-nav-sheet-section{font-size:0.74rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em;margin:0.9rem 0 0.2rem;padding:0 0.4rem}' +
        '.vs-nav-sheet-themes{display:flex;flex-wrap:wrap;gap:0.4rem;padding:0.2rem 0.4rem 1rem}' +
        '.vs-nav-sheet-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0.55rem;padding:0.2rem 0.4rem 1rem}' +
        '.vs-nav-sheet-action{display:flex;align-items:center;justify-content:center;min-height:44px;padding:0.65rem 0.8rem;border:1px solid rgba(255,255,255,0.14);border-radius:10px;color:var(--text);background:rgba(255,255,255,0.04);font:600 0.88rem/1.15 inherit;text-align:center}' +
        '.vs-nav-sheet-action.vs-nav-sheet-action-primary{border-color:var(--gold,#ffc400);background:rgba(255,196,0,0.12)}' +
        '.vs-nav-sheet-theme-pill{display:inline-flex;align-items:center;gap:0.4rem;min-height:44px;padding:0.3rem 0.8rem;border-radius:999px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);color:var(--text);font:600 0.82rem/1 inherit;font-family:inherit;cursor:pointer}' +
        '.vs-nav-sheet-theme-pill.active{border-color:var(--gold,#ffc400);background:rgba(255,196,0,0.12)}' +
        '.vs-nav-sheet-theme-dot{width:12px;height:12px;border-radius:50%;border:1px solid rgba(255,255,255,0.25);flex-shrink:0}' +
        '@media(min-width:981px){.vs-nav-sheet,.vs-nav-sheet-backdrop{display:none !important}}' +
        '';
      document.head.appendChild(st);
    }

    function buildBody() {
      var body = sheet.querySelector('#vsNavSheetBody');
      while (body.firstChild) body.removeChild(body.firstChild);
      // Clone top-level nav-center links (and the items inside the .nav-dropdown
      // panels) into the sheet, flattened. Cheap, preserves source-of-truth.
      var seen = {};
      // S275: bare top-level anchors (Home) are direct children of #nav-menu,
      // not .nav-item wrappers — the drawer cohort shows them but the sheet
      // dropped them. Prepend them so both mobile cohorts expose the same set.
      var bare = navMenu.querySelectorAll(':scope > a');
      bare.forEach(function (link) {
        var bHref = link.getAttribute('href');
        var bLabel = (link.textContent || '').replace(/[▼▾]/g, '').trim();
        if (bHref && bLabel && !seen[bHref]) {
          var a = document.createElement('a');
          a.href = bHref;
          a.textContent = bLabel;
          body.appendChild(a);
          seen[bHref] = true;
        }
      });
      var groups = navMenu.querySelectorAll('.nav-item');
      groups.forEach(function (group) {
        var topAnchor = group.querySelector(':scope > a');
        if (topAnchor) {
          var href = topAnchor.getAttribute('href');
          var label = (topAnchor.textContent || '').replace(/[▼▾]/g, '').trim();
          if (href && label && !seen[href]) {
            var section = document.createElement('div');
            section.className = 'vs-nav-sheet-section';
            section.textContent = label;
            body.appendChild(section);
            var a = document.createElement('a');
            a.href = href;
            a.textContent = 'Overview';
            body.appendChild(a);
            seen[href] = true;
          }
        }
        var subs = group.querySelectorAll('.nav-dropdown a');
        subs.forEach(function (sub) {
          var sHref = sub.getAttribute('href');
          var sLabel = (sub.textContent || '').trim();
          if (sHref && sLabel && !seen[sHref] && sLabel !== 'Overview') {
            var a = document.createElement('a');
            a.href = sHref;
            a.textContent = sLabel;
            body.appendChild(a);
            seen[sHref] = true;
          }
        });
      });
      buildThemeRow(body);
      buildAccessRow(body);
    }

    // S274: CANON-047 theme parity for the sheet cohort — the desktop theme
    // picker is hidden ≤640px and the drawer pills live in the classic drawer,
    // so sheet users previously had NO theme control. Uses the VSTheme API
    // exposed by theme-toggle.js (single source of theme state).
    // The drawer's conversion/auth actions live in .mobile-nav-footer rather
    // than in the primary link tree. Mirror that source here so the sheet
    // cohort never loses Sign In, Membership, or Join The Vault.
    function buildAccessRow(body) {
      var source = navMenu.querySelector('.mobile-nav-footer');
      if (!source) return;
      var links = Array.prototype.slice.call(source.querySelectorAll('a[href]'));
      if (!links.length) return;
      var section = document.createElement('div');
      section.className = 'vs-nav-sheet-section';
      section.textContent = 'Vault Access';
      body.appendChild(section);
      var row = document.createElement('div');
      row.className = 'vs-nav-sheet-actions';
      links.forEach(function (sourceLink) {
        var link = document.createElement('a');
        link.className = 'vs-nav-sheet-action' + (sourceLink.classList.contains('mobile-nav-join') ? ' vs-nav-sheet-action-primary' : '');
        link.href = sourceLink.href;
        link.textContent = (sourceLink.textContent || '').trim();
        if (sourceLink.target) link.target = sourceLink.target;
        if (sourceLink.rel) link.rel = sourceLink.rel;
        row.appendChild(link);
      });
      body.appendChild(row);
    }
    function buildThemeRow(body) {
      var api = window.VSTheme;
      if (!api || !api.themes || !api.themes.length) return;
      var section = document.createElement('div');
      section.className = 'vs-nav-sheet-section';
      section.textContent = 'Theme';
      body.appendChild(section);
      var row = document.createElement('div');
      row.className = 'vs-nav-sheet-themes';
      api.themes.forEach(function (t) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'vs-nav-sheet-theme-pill' + (api.get() === t.value ? ' active' : '');
        btn.setAttribute('aria-label', 'Theme: ' + t.label);
        var dot = document.createElement('span');
        dot.className = 'vs-nav-sheet-theme-dot';
        dot.style.background = t.color;
        btn.appendChild(dot);
        btn.appendChild(document.createTextNode(t.label));
        btn.addEventListener('click', function () {
          api.set(t.value);
          row.querySelectorAll('.vs-nav-sheet-theme-pill').forEach(function (p) { p.classList.remove('active'); });
          btn.classList.add('active');
        });
        row.appendChild(btn);
      });
      body.appendChild(row);
    }

    var open = false;
    var backgroundState = [];
    var bodyScrollState = null;
    var backgroundObserver = null;
    // S163 (audit #8 mobile-sheet-graduation-telemetry): privacy-minimized,
    // fire-and-forget usage signal so the founder default-swap is a data
    // decision (open rate · drag-close vs backdrop-close) rather than blocked on
    // one device. No IDs, no free text — the Worker allowlists the event names.
    function emit(event) {
      try {
        var body = JSON.stringify({ route: location.pathname || '/', ux: event });
        if (navigator.sendBeacon) navigator.sendBeacon('/v/rum', new Blob([body], { type: 'application/json' }));
      } catch (_) {}
    }

    function focusableElements() {
      return Array.prototype.slice.call(sheet.querySelectorAll(
        'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])'
      )).filter(function (node) {
        return !node.hidden && node.getAttribute('aria-hidden') !== 'true';
      });
    }

    function isolateNode(node) {
      if (!node || node.nodeType !== 1 || node === sheet || node === backdrop) return;
      if (backgroundState.some(function (state) { return state.node === node; })) return;
      backgroundState.push({
        node: node,
        inert: Boolean(node.inert),
        ariaHidden: node.getAttribute('aria-hidden'),
      });
      if ('inert' in node) node.inert = true;
      else node.setAttribute('aria-hidden', 'true');
    }

    function isolateSheet() {
      backgroundState = [];
      Array.prototype.slice.call(document.body.children).forEach(isolateNode);
      // Ambient widgets may mount after the tap that opens the modal. Keep new
      // body children isolated too so focus/background ownership cannot race an
      // asynchronous append during the opening animation.
      backgroundObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          Array.prototype.slice.call(mutation.addedNodes).forEach(isolateNode);
        });
      });
      backgroundObserver.observe(document.body, { childList: true });
      bodyScrollState = {
        overflow: document.body.style.overflow,
        paddingRight: document.body.style.paddingRight,
      };
      var scrollbar = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
      document.body.style.overflow = 'hidden';
      if (scrollbar) document.body.style.paddingRight = scrollbar + 'px';
    }

    function restorePage() {
      if (backgroundObserver) {
        backgroundObserver.disconnect();
        backgroundObserver = null;
      }
      backgroundState.forEach(function (state) {
        if ('inert' in state.node) state.node.inert = state.inert;
        if (state.ariaHidden == null) state.node.removeAttribute('aria-hidden');
        else state.node.setAttribute('aria-hidden', state.ariaHidden);
      });
      backgroundState = [];
      if (bodyScrollState) {
        document.body.style.overflow = bodyScrollState.overflow;
        document.body.style.paddingRight = bodyScrollState.paddingRight;
        bodyScrollState = null;
      }
    }

    function openSheet() {
      if (open) return;
      open = true;
      buildBody();
      sheet.hidden = false;
      // Force a reflow so the transform transition lands.
      void sheet.offsetWidth;
      backdrop.classList.add('open');
      sheet.classList.add('open');
      hamburger.setAttribute('aria-expanded', 'true');
      isolateSheet();
      window.requestAnimationFrame(function () {
        var first = focusableElements()[0];
        if (first) first.focus();
      });
      emit('nav-sheet:open');
    }
    function closeSheet(cause) {
      if (!open) return;
      open = false;
      backdrop.classList.remove('open');
      sheet.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      restorePage();
      hamburger.focus();
      setTimeout(function () { if (!open) sheet.hidden = true; }, 320);
      emit('nav-sheet:' + (cause || 'close'));
    }

    // Intercept hamburger ahead of nav-toggle.js by capturing the event.
    hamburger.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (open) closeSheet(); else openSheet();
    }, true);

    backdrop.addEventListener('click', function () { closeSheet('backdrop-close'); });
    sheet.querySelector('.vs-nav-sheet-close').addEventListener('click', function () { closeSheet('close'); });
    document.addEventListener('keydown', function (e) {
      if (!open) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSheet('close');
        return;
      }
      if (e.key !== 'Tab') return;
      var focusable = focusableElements();
      if (!focusable.length) {
        e.preventDefault();
        sheet.focus();
        return;
      }
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (!sheet.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    // Drag-to-close on the handle (touch).
    var startY = null;
    var handle = sheet.querySelector('.vs-nav-sheet-handle');
    handle.addEventListener('touchstart', function (e) { startY = e.touches[0].clientY; }, { passive: true });
    handle.addEventListener('touchmove', function (e) {
      if (startY == null) return;
      var dy = e.touches[0].clientY - startY;
      if (dy > 0) { sheet.style.transform = 'translateY(' + dy + 'px)'; }
    }, { passive: true });
    handle.addEventListener('touchend', function (e) {
      if (startY == null) return;
      var endY = e.changedTouches[0].clientY;
      var dy = endY - startY;
      sheet.style.transform = '';
      startY = null;
      if (dy > 80) closeSheet('drag-close');
    }, { passive: true }); // S231: never preventDefaults — passive for consistency with start/move

    if (openImmediately) openSheet();
  }

  // Building and styling the full alternate navigation used to force a large
  // mobile layout during startup even when nobody opened it. Arm the existing
  // hamburger now, then construct the sheet only on the first real request.
  function arm() {
    var hamburger = document.getElementById('hamburger');
    var navMenu = document.getElementById('nav-menu');
    if (!hamburger || !navMenu) return;
    function prime(e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      hamburger.removeEventListener('click', prime, true);
      init(true);
    }
    hamburger.addEventListener('click', prime, true);
  }

  if (document.readyState !== 'loading') arm();
  else document.addEventListener('DOMContentLoaded', arm);
})();
