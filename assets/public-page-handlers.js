(function () {
  'use strict';

  function toggleNextElement(btn) {
    if (!btn) return;
    var body = btn.nextElementSibling;
    if (!body) return;
    var isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : 'block';
    var icon = btn.querySelector('span');
    if (icon) icon.textContent = isOpen ? '+' : '\u2212';
  }

  function copyFromDataset(btn) {
    var url = btn && btn.dataset ? btn.dataset.copyUrl : '';
    if (!url || !navigator.clipboard) return;
    var defaultLabel = btn.dataset.copyLabel || btn.textContent;
    navigator.clipboard.writeText(url).then(function () {
      btn.textContent = btn.dataset.copySuccess || 'Copied!';
      setTimeout(function () {
        btn.textContent = defaultLabel;
      }, 2000);
    }).catch(function () {
      btn.textContent = btn.dataset.copyFailure || 'Copy failed';
      setTimeout(function () {
        btn.textContent = defaultLabel;
      }, 2000);
    });
  }

  document.addEventListener('submit', function (event) {
    if (event.target && event.target.id === 'askForm') {
      event.preventDefault();
    }
  }, true);

  document.addEventListener('click', function (event) {
    var btn = event.target.closest('button');
    if (!btn) return;

    if (btn.classList.contains('patch-toggle')) {
      event.preventDefault();
      if (window.vsTogglePatch) window.vsTogglePatch(btn);
      return;
    }

    if (btn.classList.contains('faq-toggle-inline') || btn.hasAttribute('data-faq-toggle')) {
      event.preventDefault();
      if (window.vsToggleFaq) {
        window.vsToggleFaq(btn);
      } else {
        toggleNextElement(btn);
      }
      return;
    }

    if (btn.id === 'vs-score-btn' && typeof window.vsSubmitScore === 'function') {
      event.preventDefault();
      window.vsSubmitScore();
      return;
    }

    if (btn.classList.contains('share-chip') && btn.dataset.copyUrl) {
      event.preventDefault();
      if (typeof window.copyJournalLink === 'function') {
        window.copyJournalLink(btn);
      } else {
        copyFromDataset(btn);
      }
      return;
    }

    if (btn.classList.contains('reaction-btn') && typeof window.jrnReact === 'function') {
      event.preventDefault();
      window.jrnReact(btn);
      return;
    }

    if (btn.classList.contains('copy-link-btn') && btn.dataset.copyUrl) {
      event.preventDefault();
      copyFromDataset(btn);
      return;
    }

    if (btn.classList.contains('tag-filter-btn')) {
      event.preventDefault();
      if (typeof window.filterJournal === 'function') {
        window.filterJournal(btn);
      }
      return;
    }

    if (btn.classList.contains('try-again-btn')) {
      event.preventDefault();
      window.location.reload();
      return;
    }

    if (btn.classList.contains('login-tab') && btn.dataset.tabTarget && typeof window.switchTab === 'function') {
      event.preventDefault();
      window.switchTab(btn.dataset.tabTarget);
    }
  });
})();
