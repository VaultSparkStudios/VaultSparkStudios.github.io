/* nav-toggle.js — mobile hamburger menu + backdrop + dropdown toggle + desktop keyboard a11y */
(function () {
  var hamburger = document.getElementById('hamburger');
  var navMenu   = document.getElementById('nav-menu');
  if (!hamburger || !navMenu) return;

  /* Remember nav-menu's home so we can restore it on desktop / on close.
     We portal to <body> only while the mobile drawer is open — see
     openMenu/closeMenu below. The header stacking-context trap
     (`.site-header { position: sticky; z-index: 100 }`) bounds any
     fixed descendant at z:100 in document order, so the z:199 backdrop
     would render ABOVE the drawer and swallow taps. Portaling to <body>
     makes drawer + backdrop siblings in the root stacking context. */
  var navHome = navMenu.parentNode;
  var navHomeNext = navMenu.nextSibling;

  /* ── Backdrop overlay (tap outside to close) ── */
  var backdrop = document.createElement('div');
  backdrop.id = 'nav-backdrop';
  document.body.appendChild(backdrop);

  /* S274: the in-drawer close button was removed — the header hamburger stays
     visible above the drawer (drawer top = --nav-height) and already morphs
     into an X, so two stacked close affordances read as UI noise. */

  function isMobile() {
    return window.getComputedStyle(hamburger).display !== 'none';
  }

  /* iOS-safe scroll lock: `overflow:hidden` on body can swallow taps on
     fixed overlays in iOS Safari. Pin body with `position:fixed` + restored
     scroll offset on close — drawer stays fully interactive. */
  var savedScrollY = 0;
  function lockScroll() {
    savedScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.style.position = 'fixed';
    document.body.style.top = '-' + savedScrollY + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }
  function unlockScroll() {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    window.scrollTo(0, savedScrollY);
  }

  function openMenu() {
    /* Portal to <body> so the drawer escapes the header stacking context */
    if (navMenu.parentNode !== document.body) document.body.appendChild(navMenu);
    navMenu.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    lockScroll();
    backdrop.classList.add('visible');
  }

  function closeMenu() {
    navMenu.classList.remove('open');
    /* Restore to original parent so desktop nav still renders inline */
    if (navHome && navMenu.parentNode !== navHome) {
      navHome.insertBefore(navMenu, navHomeNext);
    }
    hamburger.setAttribute('aria-expanded', 'false');
    unlockScroll();
    backdrop.classList.remove('visible');
    navMenu.querySelectorAll('.nav-item.dropdown-open').forEach(function (item) {
      item.classList.remove('dropdown-open');
      var trigger = item.querySelector(':scope > a');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    });
  }

  hamburger.addEventListener('click', function () {
    navMenu.classList.contains('open') ? closeMenu() : openMenu();
  });
  backdrop.addEventListener('click', closeMenu);

  /* ── Dropdown triggers: ARIA + keyboard a11y ──
     - aria-haspopup + aria-expanded on each trigger <a>
     - Mobile: tap toggles
     - Desktop: Enter/Space follows the link (parent page is the natural target)
     - Desktop: ArrowDown opens dropdown and moves focus to the first item
     - ESC closes any open dropdown and returns focus to the trigger */
  var dropdownItems = navMenu.querySelectorAll('.nav-item.has-dropdown');
  dropdownItems.forEach(function (item) {
    var trigger = item.querySelector(':scope > a');
    var dropdown = item.querySelector(':scope > .nav-dropdown');
    if (!trigger || !dropdown) return;

    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    if (!dropdown.id) dropdown.id = 'nav-dropdown-' + Math.random().toString(36).slice(2, 8);
    trigger.setAttribute('aria-controls', dropdown.id);

    trigger.addEventListener('click', function (e) {
      if (!isMobile()) return;
      e.preventDefault();
      var wasOpen = item.classList.contains('dropdown-open');
      navMenu.querySelectorAll('.nav-item.dropdown-open').forEach(function (other) {
        other.classList.remove('dropdown-open');
        var t = other.querySelector(':scope > a');
        if (t) t.setAttribute('aria-expanded', 'false');
      });
      if (!wasOpen) {
        item.classList.add('dropdown-open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });

    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        item.classList.add('dropdown-open');
        trigger.setAttribute('aria-expanded', 'true');
        var first = dropdown.querySelector('a');
        if (first) first.focus();
      } else if (e.key === 'Escape') {
        item.classList.remove('dropdown-open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });

    dropdown.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        item.classList.remove('dropdown-open');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.focus();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        var links = Array.prototype.slice.call(dropdown.querySelectorAll('a'));
        var idx = links.indexOf(document.activeElement);
        if (idx === -1) idx = 0;
        else idx += (e.key === 'ArrowDown') ? 1 : -1;
        if (idx < 0) idx = links.length - 1;
        if (idx >= links.length) idx = 0;
        if (links[idx]) links[idx].focus();
      }
    });

    item.addEventListener('focusin', function () {
      if (!isMobile()) trigger.setAttribute('aria-expanded', 'true');
    });
    item.addEventListener('focusout', function (e) {
      if (!item.contains(e.relatedTarget)) {
        trigger.setAttribute('aria-expanded', 'false');
        item.classList.remove('dropdown-open');
      }
    });
  });

  /* ── Global ESC closes mobile menu ── */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && navMenu.classList.contains('open')) {
      closeMenu();
      hamburger.focus();
    }
  });

  /* ── Close menu on link click (mobile) ── */
  navMenu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      if (link.parentElement.classList.contains('has-dropdown') && isMobile()) return;
      closeMenu();
    });
  });
})();

/* ── Dynamic copyright year ── */
document.querySelectorAll('.copyright-year').forEach(function (el) {
  el.textContent = new Date().getFullYear();
});
