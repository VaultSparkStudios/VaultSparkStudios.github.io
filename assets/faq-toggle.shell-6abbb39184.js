/* faq-toggle.js — FAQ accordion toggle (replaces inline onclick handlers) */
(function () {
  document.querySelectorAll('.faq-list button, .faq-item button, [data-faq-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var answer = this.nextElementSibling;
      if (!answer) return;
      var isOpen = answer.style.display !== 'none';
      answer.style.display = isOpen ? 'none' : 'block';
      var icon = this.querySelector('span');
      if (icon) icon.textContent = isOpen ? '+' : '\u2212';
    });
  });
})();
