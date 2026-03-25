/* VaultSpark Studios — Dark/Light mode toggle
   Persists preference in localStorage as vs_theme ('dark' | 'light').
   Injects a ☀/🌙 button into .nav-right before .hamburger.
*/
(function () {
  var STORAGE_KEY = 'vs_theme';
  var LIGHT_CLASS = 'light-mode';

  function applyTheme(theme) {
    if (theme === 'light') {
      document.body.classList.add(LIGHT_CLASS);
    } else {
      document.body.classList.remove(LIGHT_CLASS);
    }
  }

  function getTheme() {
    return localStorage.getItem(STORAGE_KEY) || 'dark';
  }

  function injectButton() {
    var navRight = document.querySelector('.nav-right');
    if (!navRight || document.getElementById('theme-toggle-btn')) return;

    var btn = document.createElement('button');
    btn.id = 'theme-toggle-btn';
    btn.className = 'theme-toggle-btn';
    btn.setAttribute('aria-label', 'Toggle dark/light mode');
    btn.title = 'Toggle dark/light mode';

    function syncIcon() {
      btn.textContent = document.body.classList.contains(LIGHT_CLASS) ? '\uD83C\uDF19' : '\u2600\uFE0F';
    }
    syncIcon();

    btn.addEventListener('click', function () {
      var next = document.body.classList.contains(LIGHT_CLASS) ? 'dark' : 'light';
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
      syncIcon();
    });

    // Insert before hamburger (last child) so it doesn't push hamburger out of position
    var hamburger = navRight.querySelector('.hamburger');
    if (hamburger) {
      navRight.insertBefore(btn, hamburger);
    } else {
      navRight.appendChild(btn);
    }
  }

  // Apply theme immediately (before paint) to avoid flash
  applyTheme(getTheme());

  // Inject button after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButton);
  } else {
    injectButton();
  }
})();
