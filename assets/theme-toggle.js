/* VaultSpark Studios — Theme selector
   Persists preference in localStorage as vs_theme.
   Injects a theme picker into .nav-right before .hamburger.
*/
(function () {
  var STORAGE_KEY = 'vs_theme';
  var THEMES = [
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
    { value: 'ambient', label: 'Ambient' },
    { value: 'warm', label: 'Warm' },
    { value: 'cool', label: 'Cool' },
    { value: 'lava', label: 'Lava' },
    { value: 'high-contrast', label: 'High Contrast' }
  ];
  var THEME_CLASSES = {
    light: 'light-mode',
    ambient: 'ambient-mode',
    warm: 'warm-mode',
    cool: 'cool-mode',
    lava: 'lava-mode',
    'high-contrast': 'high-contrast-mode'
  };

  function isThemeValid(theme) {
    return THEMES.some(function (entry) {
      return entry.value === theme;
    });
  }

  function normalizeTheme(theme) {
    return isThemeValid(theme) ? theme : 'dark';
  }

  function applyTheme(theme) {
    var resolvedTheme = normalizeTheme(theme);
    var body = document.body;

    if (!body) return resolvedTheme;

    Object.keys(THEME_CLASSES).forEach(function (key) {
      body.classList.remove(THEME_CLASSES[key]);
    });

    if (THEME_CLASSES[resolvedTheme]) {
      body.classList.add(THEME_CLASSES[resolvedTheme]);
    }

    body.dataset.theme = resolvedTheme;
    return resolvedTheme;
  }

  function getTheme() {
    return normalizeTheme(localStorage.getItem(STORAGE_KEY) || 'dark');
  }

  function injectThemePicker() {
    var navRight = document.querySelector('.nav-right');
    if (!navRight || document.getElementById('theme-select')) return;

    var select = document.createElement('select');
    select.id = 'theme-select';
    select.className = 'theme-select';
    select.setAttribute('aria-label', 'Select site theme');

    THEMES.forEach(function (theme) {
      var option = document.createElement('option');
      option.value = theme.value;
      option.textContent = theme.label;
      select.appendChild(option);
    });

    select.value = getTheme();
    select.title = 'Theme: ' + select.options[select.selectedIndex].text;

    select.addEventListener('change', function () {
      var next = applyTheme(select.value);
      localStorage.setItem(STORAGE_KEY, next);
      select.value = next;
      select.title = 'Theme: ' + select.options[select.selectedIndex].text;
    });

    var hamburger = navRight.querySelector('.hamburger');
    if (hamburger) {
      navRight.insertBefore(select, hamburger);
    } else {
      navRight.appendChild(select);
    }
  }

  // Apply theme immediately (before paint) to avoid flash
  applyTheme(getTheme());

  // Inject picker after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectThemePicker);
  } else {
    injectThemePicker();
  }
})();
