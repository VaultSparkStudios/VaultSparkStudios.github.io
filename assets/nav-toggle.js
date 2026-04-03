/* nav-toggle.js — mobile hamburger menu + dropdown toggle (shared across all pages) */
(function () {
  var hamburger = document.getElementById('hamburger');
  var navMenu = document.getElementById('nav-menu');
  if (!hamburger || !navMenu) return;

  /* ── Hamburger toggle ── */
  hamburger.addEventListener('click', function () {
    var isOpen = navMenu.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
    // Collapse all dropdowns when closing menu
    if (!isOpen) {
      navMenu.querySelectorAll('.nav-item.dropdown-open').forEach(function (item) {
        item.classList.remove('dropdown-open');
      });
    }
  });

  /* ── Mobile dropdown tap-to-toggle ── */
  navMenu.querySelectorAll('.nav-item.has-dropdown > a').forEach(function (link) {
    link.addEventListener('click', function (e) {
      // Only intercept on mobile (when hamburger is visible)
      if (window.getComputedStyle(hamburger).display === 'none') return;
      e.preventDefault();
      var item = link.parentElement;
      var wasOpen = item.classList.contains('dropdown-open');
      // Close all other dropdowns
      navMenu.querySelectorAll('.nav-item.dropdown-open').forEach(function (other) {
        other.classList.remove('dropdown-open');
      });
      // Toggle this one
      if (!wasOpen) item.classList.add('dropdown-open');
    });
  });

  /* ── Close menu on link click ── */
  navMenu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      // Skip dropdown parent links on mobile (handled above)
      if (link.parentElement.classList.contains('has-dropdown') &&
          window.getComputedStyle(hamburger).display !== 'none') return;
      navMenu.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      navMenu.querySelectorAll('.nav-item.dropdown-open').forEach(function (item) {
        item.classList.remove('dropdown-open');
      });
    });
  });
})();

/* ── Dynamic copyright year ── */
document.querySelectorAll('.copyright-year').forEach(function (el) {
  el.textContent = new Date().getFullYear();
});
