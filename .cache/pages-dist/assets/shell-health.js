(function () {
  var hasReported = false;
  var SESSION_KEY = 'vs_shell_health_last_issue';

  function readSessionIssue() {
    try {
      return window.sessionStorage ? window.sessionStorage.getItem(SESSION_KEY) : null;
    } catch (error) {
      return null;
    }
  }

  function writeSessionIssue(code) {
    try {
      if (window.sessionStorage) {
        window.sessionStorage.setItem(SESSION_KEY, code);
      }
    } catch (error) {}
  }

  function sendIssue(code, detail) {
    if (hasReported) return;
    if (readSessionIssue() === code) return;
    hasReported = true;
    writeSessionIssue(code);

    window.VSShellHealth = {
      status: 'issue',
      code: code,
      detail: detail || '',
      at: new Date().toISOString()
    };

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'shell_health_issue', {
        issue_code: code,
        issue_detail: detail || '',
        page_path: window.location.pathname
      });
    }

    console.warn('[VSShellHealth]', code, detail || '');
  }

  function revealHeroFallback() {
    document.querySelectorAll('.forge-letter').forEach(function (letter) {
      letter.style.opacity = '1';
      letter.style.animation = 'none';
      letter.style.transform = 'none';
    });

    document.querySelectorAll('.hero-reveal').forEach(function (item) {
      item.style.opacity = '1';
      item.style.transform = 'none';
      item.style.animation = 'none';
    });
  }

  function hasShellStylesheet() {
    return Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some(function (link) {
      var href = link.getAttribute('href') || '';
      return /assets\/style\.shell-[a-f0-9]{10}\.css$/.test(href);
    });
  }

  function checkHeroShell() {
    var brand = document.querySelector('.brand');
    var heroHeading = document.querySelector('#hero-heading');
    var letters = Array.from(document.querySelectorAll('.forge-letter'));

    if (!brand) {
      sendIssue('brand_missing', 'Header brand element not found');
      return;
    }

    if (!heroHeading) {
      sendIssue('hero_heading_missing', 'Homepage hero heading not found');
      return;
    }

    if (!hasShellStylesheet()) {
      sendIssue('shell_stylesheet_missing', 'Expected fingerprinted shell stylesheet is not attached');
      return;
    }

    if (!letters.length) {
      sendIssue('hero_letters_missing', 'Forge letters did not render');
      return;
    }

    var hiddenLetters = letters.filter(function (letter) {
      return Number.parseFloat(getComputedStyle(letter).opacity || '1') < 0.95;
    });

    if (hiddenLetters.length) {
      revealHeroFallback();
      sendIssue('hero_letters_stuck_hidden', hiddenLetters.length + ' forge letters were still hidden after intro window');
      return;
    }

    window.VSShellHealth = {
      status: 'ok',
      at: new Date().toISOString()
    };
  }

  window.addEventListener('load', function () {
    window.setTimeout(checkHeroShell, 2600);
  });
})();
