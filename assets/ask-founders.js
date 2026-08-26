(function () {
  'use strict';
  function setStatus(form, message, state) {
    var status = form.querySelector('[data-ask-status]');
    status.textContent = message;
    status.dataset.state = state || '';
  }
  document.addEventListener('DOMContentLoaded', function () {
    var form = document.querySelector('[data-ask-founders]');
    if (!form) return;
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var button = form.querySelector('button[type="submit"]');
      var question = form.querySelector('[name="question"]').value.trim();
      if (question.length < 12 || question.length > 1200) {
        setStatus(form, 'Use 12–1,200 characters so the question has enough context.', 'error');
        return;
      }
      button.disabled = true;
      setStatus(form, 'Verifying and sending…', 'busy');
      try {
        if (!window.VSTurnstile || !window.VSCsrf) throw new Error('Verification is still loading. Please retry.');
        var tokens = await Promise.all([window.VSTurnstile.getToken(), window.VSCsrf.getToken()]);
        var data = new FormData(form);
        data.set('message', question);
        data.set('cf-turnstile-response', tokens[0]);
        var response = await fetch('/ask-founders/submit', {
          method: 'POST',
          body: data,
          headers: { 'X-CSRF-Token': tokens[1] },
          credentials: 'same-origin'
        });
        var body = await response.json().catch(function () { return {}; });
        if (!response.ok || body.success === false) throw new Error(body.error || body.message || 'Question was not accepted');
        form.reset();
        setStatus(form, 'Question received. If you included an email, the studio can reply directly.', 'ok');
      } catch (error) {
        setStatus(form, error.message || 'Could not send. Please try again.', 'error');
      } finally {
        button.disabled = false;
      }
    });
  });
})();
