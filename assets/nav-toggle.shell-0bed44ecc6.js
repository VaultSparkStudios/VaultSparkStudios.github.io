/* nav-toggle.js — mobile hamburger menu + backdrop + dropdown toggle */
(function () {
  var hamburger = document.getElementById('hamburger');
  var navMenu   = document.getElementById('nav-menu');
  if (!hamburger || !navMenu) return;

  /* ── Backdrop overlay (tap outside to close) ── */
  var backdrop = document.createElement('div');
  backdrop.id = 'nav-backdrop';
  document.body.appendChild(backdrop);

  /* ── Close button inside overlay ── */
  var closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'nav-close-btn';
  closeBtn.setAttribute('aria-label', 'Close navigation');
  closeBtn.innerHTML = '&#x2715;'; // ×
  navMenu.insertBefore(closeBtn, navMenu.firstChild);

  function openMenu() {
    navMenu.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    backdrop.classList.add('visible');
  }

  function closeMenu() {
    navMenu.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    backdrop.classList.remove('visible');
    navMenu.querySelectorAll('.nav-item.dropdown-open').forEach(function (item) {
      item.classList.remove('dropdown-open');
    });
  }

  /* ── Hamburger toggle ── */
  hamburger.addEventListener('click', function () {
    navMenu.classList.contains('open') ? closeMenu() : openMenu();
  });

  /* ── Close button click ── */
  closeBtn.addEventListener('click', closeMenu);

  /* ── Backdrop click ── */
  backdrop.addEventListener('click', closeMenu);

  /* ── Mobile dropdown tap-to-toggle ── */
  navMenu.querySelectorAll('.nav-item.has-dropdown > a').forEach(function (link) {
    link.addEventListener('click', function (e) {
      if (window.getComputedStyle(hamburger).display === 'none') return;
      e.preventDefault();
      var item = link.parentElement;
      var wasOpen = item.classList.contains('dropdown-open');
      navMenu.querySelectorAll('.nav-item.dropdown-open').forEach(function (other) {
        other.classList.remove('dropdown-open');
      });
      if (!wasOpen) item.classList.add('dropdown-open');
    });
  });

  /* ── Close menu on link click ── */
  navMenu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      if (link.parentElement.classList.contains('has-dropdown') &&
          window.getComputedStyle(hamburger).display !== 'none') return;
      closeMenu();
    });
  });
})();

/* ── Dynamic copyright year ── */
document.querySelectorAll('.copyright-year').forEach(function (el) {
  el.textContent = new Date().getFullYear();
});
