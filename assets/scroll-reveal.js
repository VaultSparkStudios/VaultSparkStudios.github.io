// scroll-reveal.js — IntersectionObserver-powered fade-up reveals
// Targets any element with data-reveal="fade-up".
// CSS lives in assets/style.css under /* scroll-reveal */.

(function () {
  // Mobile browsers already have to lay out a dense, semantic homepage. Asking
  // one observer to resolve every below-fold reveal target defeats
  // content-visibility and turns a purely decorative effect into long layout
  // tasks. Mobile keeps the same content and reading order without the motion.
  if (window.matchMedia && window.matchMedia('(max-width: 900px)').matches) return;

  var els = document.querySelectorAll('[data-reveal]');
  if (!els.length || !window.IntersectionObserver) {
    // No targets or no support — make everything visible immediately
    els.forEach(function (el) { el.classList.add('revealed'); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });

  els.forEach(function (el) { io.observe(el); });
})();
