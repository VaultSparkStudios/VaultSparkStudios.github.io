/* notify-me.js — Shared "Notify Me When This Launches" form handler
   Handles all forms with class `notify-me-form`.
   CSP-safe: no inline handlers, loaded via <script defer> from HTML. */
(function () {
  'use strict';

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var ENDPOINT = 'https://api.web3forms.com/submit';
  var ACCESS_KEY = 'af76f2ed-d5fd-4b28-8b73-a2e47be2bb71';

  function handleSubmit(form) {
    var feedback = form.querySelector('.notify-me-feedback');
    var btn = form.querySelector('button[type="submit"]');
    var emailInput = form.querySelector('input[type="email"]');

    if (!feedback || !btn || !emailInput) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      /* Prevent double-submission */
      if (btn.disabled) return;

      var email = emailInput.value.trim();

      /* Email validation */
      if (!EMAIL_RE.test(email)) {
        feedback.textContent = 'Please enter a valid email address.';
        feedback.className = 'notify-me-feedback notify-me-error';
        feedback.hidden = false;
        emailInput.focus();
        return;
      }

      var gameName = form.dataset.game || 'this game';
      var subject = gameName + ' \u2014 Early Access Notification';

      btn.disabled = true;
      btn.textContent = 'Sending\u2026';
      feedback.hidden = true;

      var payload = {
        access_key: ACCESS_KEY,
        subject: subject,
        from_name: 'VaultSpark Notify Me',
        game: gameName,
        email: email
      };

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (res.ok) {
            feedback.textContent = "\u2713 You're on the list! We'll notify you the moment " + gameName + ' opens for early access.';
            feedback.className = 'notify-me-feedback notify-me-success';
            feedback.hidden = false;
            form.querySelector('.notify-me-fields').style.display = 'none';
          } else {
            throw new Error('non-ok');
          }
        })
        .catch(function () {
          feedback.textContent = 'Something went wrong. Please try again or contact us.';
          feedback.className = 'notify-me-feedback notify-me-error';
          feedback.hidden = false;
          btn.disabled = false;
          btn.textContent = 'Notify Me';
        });
    });
  }

  function init() {
    var forms = document.querySelectorAll('form.notify-me-form');
    for (var i = 0; i < forms.length; i++) {
      handleSubmit(forms[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
