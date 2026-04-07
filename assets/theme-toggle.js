/* VaultSpark Studios — Theme selector
   Persists preference in localStorage as vs_theme.
   When a Vault Member session exists, also stores the theme in vault_members.prefs.site_theme.
   Local device choice wins on the current device; account theme hydrates new devices.
*/
(function () {
  var STORAGE_KEY = 'vs_theme';
  var ACCOUNT_PREF_KEY = 'site_theme';
  var DEFAULT_THEME = 'dark';
  var SUPABASE_URL = 'https://fjnpzjjyhnpmunfoycrp.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_thM93D_GVKW5qzAiZpNl1w_AVGILCij';
  var SUPABASE_SESSION_KEYS = [
    'sb-fjnpzjjyhnpmunfoycrp-auth-token',
    'supabase.auth.token'
  ];
  var THEMES = [
    { value: 'dark',          label: 'Dark',               color: '#07080f' },
    { value: 'light',         label: 'Light',              color: '#f6efe5' },
    { value: 'ambient',       label: 'Ambient',            color: '#08121c' },
    { value: 'warm',          label: 'Warm',               color: '#1f120b' },
    { value: 'cool',          label: 'Cool',               color: '#0a1830' },
    { value: 'lava',          label: 'Lava',               color: '#200a08' },
    { value: 'high-contrast', label: 'High Contrast',      color: '#000000' }
  ];
  var THEME_CLASSES = {
    dark: 'dark-mode',
    light: 'light-mode',
    ambient: 'ambient-mode',
    warm: 'warm-mode',
    cool: 'cool-mode',
    lava: 'lava-mode',
    'high-contrast': 'high-contrast-mode'
  };
  var THEME_COLORS = {
    dark: '#06070b',
    light: '#f6efe5',
    ambient: '#08121c',
    warm: '#1f120b',
    cool: '#0a1830',
    lava: '#200a08',
    'high-contrast': '#000000'
  };

  var accountPrefsCache = null;
  var authWatchAttached = false;
  var syncPromise = null;

  function isThemeValid(theme) {
    return THEMES.some(function (entry) {
      return entry.value === theme;
    });
  }

  function normalizeTheme(theme) {
    return isThemeValid(theme) ? theme : DEFAULT_THEME;
  }

  function getStorageValue(key) {
    try {
      return localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function setStorageValue(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_) {}
  }

  function getDeviceTheme() {
    var stored = getStorageValue(STORAGE_KEY);
    return isThemeValid(stored) ? stored : null;
  }

  function updateThemeMeta(theme) {
    var tag = document.querySelector('meta[name="theme-color"]');
    if (tag) {
      tag.setAttribute('content', THEME_COLORS[theme] || THEME_COLORS.dark);
    }
    document.documentElement.style.colorScheme = theme === 'light' ? 'light' : 'dark';
  }

  function refreshPicker(theme) {
    // Update desktop premium picker button swatch + label
    var btn = document.getElementById('theme-picker-btn');
    if (btn) {
      var swatch = btn.querySelector('.theme-picker-swatch');
      var labelEl = btn.querySelector('.theme-picker-label');
      var entry = THEMES.find(function (t) { return t.value === theme; });
      if (swatch && entry) swatch.style.background = entry.color;
      if (labelEl && entry && !labelEl.textContent.startsWith('✓')) labelEl.textContent = entry.label;
    }
    // Update desktop option active states + DEFAULT badge
    document.querySelectorAll('.theme-option').forEach(function (opt) {
      var isActive = opt.dataset.theme === theme;
      opt.classList.toggle('active', isActive);
      opt.setAttribute('aria-selected', isActive ? 'true' : 'false');
      var badge = opt.querySelector('.theme-opt-default');
      if (badge) badge.style.display = isActive ? '' : 'none';
    });
    // Sync mobile pills
    document.querySelectorAll('.mobile-theme-pill').forEach(function (pill) {
      pill.classList.toggle('active', pill.dataset.theme === theme);
    });
  }

  function applyTheme(theme) {
    var resolvedTheme = normalizeTheme(theme);
    var body = document.body;
    var root = document.documentElement;

    updateThemeMeta(resolvedTheme);

    // Apply to <html> immediately (always available — prevents FOUC before <body> ready)
    Object.keys(THEME_CLASSES).forEach(function (key) {
      root.classList.remove(THEME_CLASSES[key]);
    });
    if (THEME_CLASSES[resolvedTheme]) {
      root.classList.add(THEME_CLASSES[resolvedTheme]);
    }
    root.dataset.theme = resolvedTheme;

    // Also apply to <body> when available
    if (body) {
      Object.keys(THEME_CLASSES).forEach(function (key) {
        body.classList.remove(THEME_CLASSES[key]);
      });
      if (THEME_CLASSES[resolvedTheme]) {
        body.classList.add(THEME_CLASSES[resolvedTheme]);
      }
      body.dataset.theme = resolvedTheme;
      refreshPicker(resolvedTheme);
      window.dispatchEvent(new CustomEvent('vs:theme-changed', {
        detail: { theme: resolvedTheme }
      }));
    }

    return resolvedTheme;
  }

  function getTheme() {
    return normalizeTheme(getDeviceTheme() || DEFAULT_THEME);
  }

  function getSession() {
    var raw = null;
    var parsed;
    var candidates;

    for (var i = 0; i < SUPABASE_SESSION_KEYS.length; i += 1) {
      raw = getStorageValue(SUPABASE_SESSION_KEYS[i]);
      if (raw) break;
    }
    if (!raw) return null;

    try {
      parsed = JSON.parse(raw);
    } catch (_) {
      return null;
    }

    candidates = [];
    if (parsed && typeof parsed === 'object') {
      if (parsed.currentSession) candidates.push(parsed.currentSession);
      if (parsed.session) candidates.push(parsed.session);
      candidates.push(parsed);
      if (Array.isArray(parsed)) {
        candidates = candidates.concat(parsed);
      }
    }

    for (var j = 0; j < candidates.length; j += 1) {
      var session = candidates[j];
      if (session && session.access_token && session.user && session.user.id) {
        return session;
      }
    }

    return null;
  }

  async function loadAccountPrefs(session) {
    if (!session || !session.user || !session.user.id) return null;
    if (accountPrefsCache && accountPrefsCache.userId === session.user.id) {
      return accountPrefsCache.prefs;
    }

    var prefs = null;

    if (window.VSSupabase && typeof window.VSSupabase.from === 'function') {
      var result = await window.VSSupabase
        .from('vault_members')
        .select('prefs')
        .eq('id', session.user.id)
        .single();

      if (result.error) throw result.error;
      prefs = result.data && result.data.prefs ? result.data.prefs : {};
    } else {
      var response = await fetch(
        SUPABASE_URL + '/rest/v1/vault_members?select=prefs&id=eq.' + encodeURIComponent(session.user.id),
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: 'Bearer ' + session.access_token,
            Accept: 'application/json'
          }
        }
      );

      if (!response.ok) throw new Error('Theme account load failed');
      var rows = await response.json();
      prefs = rows && rows[0] && rows[0].prefs ? rows[0].prefs : {};
    }

    accountPrefsCache = {
      userId: session.user.id,
      prefs: prefs || {}
    };
    return accountPrefsCache.prefs;
  }

  async function saveAccountTheme(theme) {
    var session = getSession();
    var nextTheme = normalizeTheme(theme);
    if (!session || !session.user || !session.user.id) return false;

    var existingPrefs = await loadAccountPrefs(session);
    var nextPrefs = Object.assign({}, existingPrefs || {});

    if (nextPrefs[ACCOUNT_PREF_KEY] === nextTheme) return true;

    nextPrefs[ACCOUNT_PREF_KEY] = nextTheme;

    if (window.VSSupabase && typeof window.VSSupabase.from === 'function') {
      var result = await window.VSSupabase
        .from('vault_members')
        .update({ prefs: nextPrefs })
        .eq('id', session.user.id);

      if (result.error) throw result.error;
    } else {
      var response = await fetch(
        SUPABASE_URL + '/rest/v1/vault_members?id=eq.' + encodeURIComponent(session.user.id),
        {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: 'Bearer ' + session.access_token,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal'
          },
          body: JSON.stringify({ prefs: nextPrefs })
        }
      );

      if (!response.ok) throw new Error('Theme account save failed');
    }

    accountPrefsCache = {
      userId: session.user.id,
      prefs: nextPrefs
    };
    window.dispatchEvent(new CustomEvent('vs:theme-account-synced', {
      detail: { theme: nextTheme }
    }));
    return true;
  }

  function setTheme(theme, options) {
    var resolvedTheme = applyTheme(theme);
    var config = options || {};

    if (config.persist !== false) {
      setStorageValue(STORAGE_KEY, resolvedTheme);
    }

    if (config.accountSync !== false) {
      saveAccountTheme(resolvedTheme).catch(function () {});
    }

    return resolvedTheme;
  }

  function syncThemeWithAccount() {
    if (syncPromise) return syncPromise;

    syncPromise = (async function () {
      var session = getSession();
      var deviceTheme = getDeviceTheme();

      if (!session) {
        accountPrefsCache = null;
        return getTheme();
      }

      var prefs = await loadAccountPrefs(session);
      var accountTheme = prefs && isThemeValid(prefs[ACCOUNT_PREF_KEY]) ? prefs[ACCOUNT_PREF_KEY] : null;

      if (deviceTheme) {
        applyTheme(deviceTheme);
        if (accountTheme !== deviceTheme) {
          await saveAccountTheme(deviceTheme);
        }
        return deviceTheme;
      }

      if (accountTheme) {
        setStorageValue(STORAGE_KEY, accountTheme);
        return applyTheme(accountTheme);
      }

      return getTheme();
    })().catch(function () {
      return getTheme();
    }).finally(function () {
      syncPromise = null;
    });

    return syncPromise;
  }

  function attachAuthWatcher() {
    if (authWatchAttached) return;
    if (!window.VSSupabase || !window.VSSupabase.auth || typeof window.VSSupabase.auth.onAuthStateChange !== 'function') {
      return;
    }

    authWatchAttached = true;
    window.VSSupabase.auth.onAuthStateChange(function (_event, session) {
      accountPrefsCache = null;
      if (session && session.user) {
        syncThemeWithAccount();
      }
    });
  }

  /* ── Premium Theme Picker (replaces bare <select>) ── */
  function injectThemePicker() {
    var navRight = document.querySelector('.nav-right');
    if (!navRight || document.getElementById('theme-picker-btn')) return;

    var currentTheme = getTheme();
    var currentEntry = THEMES.find(function (t) { return t.value === currentTheme; }) || THEMES[0];
    var _labelResetTimer = null;

    // Wrapper
    var wrapper = document.createElement('div');
    wrapper.className = 'theme-picker';
    wrapper.id = 'theme-picker';
    wrapper.setAttribute('aria-label', 'Theme selector');

    // Toggle button
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'theme-picker-btn';
    btn.className = 'theme-picker-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Select theme: ' + currentEntry.label);

    var swatch = document.createElement('span');
    swatch.className = 'theme-picker-swatch';
    swatch.style.background = currentEntry.color;
    swatch.setAttribute('aria-hidden', 'true');

    var labelEl = document.createElement('span');
    labelEl.className = 'theme-picker-label';
    labelEl.textContent = currentEntry.label;

    var arrow = document.createElement('span');
    arrow.className = 'theme-picker-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.innerHTML = '&#9660;';

    btn.appendChild(swatch);
    btn.appendChild(labelEl);
    btn.appendChild(arrow);

    // Dropdown
    var dropdown = document.createElement('div');
    dropdown.className = 'theme-picker-dropdown';
    dropdown.setAttribute('role', 'listbox');
    dropdown.setAttribute('aria-label', 'Available themes');

    // Section header
    var header = document.createElement('div');
    header.className = 'theme-picker-header';
    header.textContent = 'Choose Theme';
    dropdown.appendChild(header);

    THEMES.forEach(function (theme) {
      var opt = document.createElement('button');
      opt.type = 'button';
      opt.className = 'theme-option' + (theme.value === currentTheme ? ' active' : '');
      opt.dataset.theme = theme.value;
      opt.setAttribute('role', 'option');
      opt.setAttribute('aria-selected', theme.value === currentTheme ? 'true' : 'false');

      var optSwatch = document.createElement('span');
      optSwatch.className = 'theme-opt-swatch';
      optSwatch.style.background = theme.color;
      optSwatch.setAttribute('aria-hidden', 'true');

      var optLabel = document.createElement('span');
      optLabel.className = 'theme-opt-label';
      optLabel.textContent = theme.label;

      var defaultBadge = document.createElement('span');
      defaultBadge.className = 'theme-opt-default';
      defaultBadge.textContent = 'DEFAULT';
      defaultBadge.style.display = theme.value === currentTheme ? '' : 'none';

      opt.appendChild(optSwatch);
      opt.appendChild(optLabel);
      opt.appendChild(defaultBadge);

      // Hover: preview theme without saving
      opt.addEventListener('mouseenter', function () {
        applyTheme(theme.value);
      });

      opt.addEventListener('click', function () {
        setTheme(theme.value);
        closeThemePicker();
        btn.setAttribute('aria-label', 'Select theme: ' + theme.label);
        // Pulse the swatch to reinforce "saved" feedback
        swatch.classList.remove('swatch-pulse');
        void swatch.offsetWidth; // force reflow to restart animation
        swatch.classList.add('swatch-pulse');
        // Flash "✓ Default saved" in button label
        if (_labelResetTimer) clearTimeout(_labelResetTimer);
        labelEl.textContent = '✓ Default saved';
        _labelResetTimer = setTimeout(function () {
          var saved = THEMES.find(function (t) { return t.value === getTheme(); });
          if (saved) labelEl.textContent = saved.label;
          swatch.classList.remove('swatch-pulse');
          _labelResetTimer = null;
        }, 1800);
      });

      dropdown.appendChild(opt);
    });

    // Restore saved theme when mouse leaves dropdown without clicking
    dropdown.addEventListener('mouseleave', function () {
      applyTheme(getTheme());
    });

    wrapper.appendChild(btn);
    wrapper.appendChild(dropdown);

    // Insert before hamburger
    var hamburger = navRight.querySelector('.hamburger');
    if (hamburger) {
      navRight.insertBefore(wrapper, hamburger);
    } else {
      navRight.appendChild(wrapper);
    }

    // Toggle open/close
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (wrapper.classList.contains('open')) {
        closeThemePicker();
      } else {
        openThemePicker();
      }
    });

    // Close on outside click
    document.addEventListener('click', function (e) {
      if (!wrapper.contains(e.target)) {
        closeThemePicker();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (wrapper.classList.contains('open')) {
          applyTheme(getTheme()); // restore if previewing
          closeThemePicker();
        }
      }
    });

    refreshPicker(currentTheme);

    // Mobile pill switcher (inside the nav overlay footer)
    injectMobileThemePills();
  }

  function openThemePicker() {
    var wrapper = document.getElementById('theme-picker');
    var btn = document.getElementById('theme-picker-btn');
    if (!wrapper) return;
    wrapper.classList.add('open');
    if (btn) btn.setAttribute('aria-expanded', 'true');
  }

  function closeThemePicker() {
    var wrapper = document.getElementById('theme-picker');
    var btn = document.getElementById('theme-picker-btn');
    if (!wrapper) return;
    wrapper.classList.remove('open');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function injectMobileThemePills() {
    if (document.getElementById('mobile-theme-bar')) return;
    var footer = document.querySelector('.mobile-nav-footer');
    if (!footer) return;

    var bar = document.createElement('div');
    bar.id = 'mobile-theme-bar';
    bar.className = 'mobile-theme-bar';

    var label = document.createElement('span');
    label.className = 'mobile-theme-label';
    label.textContent = 'Theme';
    bar.appendChild(label);

    var pills = document.createElement('div');
    pills.className = 'mobile-theme-pills';

    var SHORT = { dark: 'Dark', light: 'Light', ambient: 'Ambient', warm: 'Warm', cool: 'Cool', lava: 'Lava', 'high-contrast': 'Hi-Con' };

    THEMES.forEach(function (theme) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mobile-theme-pill';
      btn.dataset.theme = theme.value;
      btn.textContent = SHORT[theme.value] || theme.label;
      btn.setAttribute('aria-label', 'Theme: ' + theme.label);
      btn.addEventListener('click', function () {
        setTheme(theme.value);
      });
      pills.appendChild(btn);
    });

    bar.appendChild(pills);
    footer.insertBefore(bar, footer.firstChild);
    refreshPicker(getTheme());
  }

  // Apply immediately — also targets <html> so it fires before <body> exists
  applyTheme(getTheme());

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      injectThemePicker();
      attachAuthWatcher();
      syncThemeWithAccount();
    });
  } else {
    injectThemePicker();
    attachAuthWatcher();
    syncThemeWithAccount();
  }
})();
