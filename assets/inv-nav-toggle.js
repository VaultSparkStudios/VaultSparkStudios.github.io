/* inv-nav-toggle.js — investor-portal mobile nav toggle with iOS-safe body-scroll-lock.
   Matches the scroll-lock pattern used in nav-toggle.js (position:fixed + savedScrollY)
   so that fixed overlays remain fully tappable in iOS Safari. */
(function () {
  var toggle = document.getElementById('mobileToggle');
  var menu   = document.getElementById('mobileMenu');
  if (!toggle || !menu) return;

  var savedScrollY = 0;

  /* iOS-safe scroll lock: overflow:hidden on body swallows taps on fixed overlays
     in iOS Safari. Pin body with position:fixed + restore scroll offset on close. */
  function lockScroll() {
    savedScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.style.position = 'fixed';
    document.body.style.top      = '-' + savedScrollY + 'px';
    document.body.style.left     = '0';
    document.body.style.right    = '0';
    document.body.style.width    = '100%';
  }

  function unlockScroll() {
    document.body.style.position = '';
    document.body.style.top      = '';
    document.body.style.left     = '';
    document.body.style.right    = '';
    document.body.style.width    = '';
    window.scrollTo(0, savedScrollY);
  }

  function openMenu() {
    menu.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    lockScroll();
  }

  function closeMenu() {
    menu.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    unlockScroll();
  }

  toggle.addEventListener('click', function () {
    menu.classList.contains('open') ? closeMenu() : openMenu();
  });

  /* Close when a nav link is tapped */
  menu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });

  /* ESC closes the menu and returns focus */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu.classList.contains('open')) {
      closeMenu();
      toggle.focus();
    }
  });
})();
