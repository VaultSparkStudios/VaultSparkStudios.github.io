(function () {
  'use strict';

  var TOAST_DURATION = 7000;
  var toast;
  var toastClose;
  var toastProgress;
  var toastIcon;
  var toastTitle;
  var toastMsg;
  var feedback;
  var dismissTimer;

  function showFeedback(type, title, copy) {
    if (!feedback) return;
    feedback.className = 'feedback-panel show ' + type;
    feedback.innerHTML =
      '<strong class="feedback-panel-title">' + title + '</strong>' +
      '<div class="feedback-panel-copy">' + copy + '</div>';
  }

  function showToast(isError) {
    clearTimeout(dismissTimer);
    toast.classList.remove('toast-leaving', 'toast-visible');
    toast.style.borderColor = '';
    toastIcon.style.background = '';
    toastIcon.style.borderColor = '';
    if (isError) {
      toast.style.borderColor = 'rgba(248,113,113,0.35)';
      toastIcon.style.background = 'rgba(248,113,113,0.12)';
      toastIcon.style.borderColor = 'rgba(248,113,113,0.3)';
      toastIcon.textContent = '✕';
      toastTitle.style.color = '#f87171';
      toastTitle.textContent = 'Transmission failed.';
      toastMsg.textContent = 'Something went wrong — please email founder@vaultsparkstudios.com directly.';
    } else {
      toastIcon.textContent = '✓';
      toastTitle.style.color = '';
      toastTitle.textContent = 'Signal transmitted.';
      toastMsg.textContent = 'Your message is in the vault. Response time is typically within 48 hours.';
    }
    toast.classList.add('toast-visible');
    toastProgress.style.transition = 'none';
    toastProgress.style.transform = 'scaleX(1)';
    toastProgress.getBoundingClientRect();
    toastProgress.style.transition = 'transform ' + TOAST_DURATION + 'ms linear';
    toastProgress.style.transform = 'scaleX(0)';
    dismissTimer = setTimeout(dismissToast, TOAST_DURATION);
  }

  function dismissToast() {
    clearTimeout(dismissTimer);
    toast.classList.add('toast-leaving');
    toast.addEventListener('transitionend', function onEnd() {
      toast.classList.remove('toast-visible', 'toast-leaving');
      toastProgress.style.transition = 'none';
      toastProgress.style.transform = 'scaleX(1)';
      toast.removeEventListener('transitionend', onEnd);
    }, { once: true });
  }

  async function onSubmit(event) {
    event.preventDefault();
    var form = event.currentTarget;
    var name = document.getElementById('contact-name').value.trim();
    var email = document.getElementById('contact-email').value.trim();
    var subject = document.getElementById('contact-subject').value.trim();
    var message = document.getElementById('contact-message').value.trim();
    if (!name || !email || !subject || !message) return;

    var submitBtn = form.querySelector('button[type="submit"]');
    var originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Transmitting…';
    showFeedback('neutral', 'Signal in transit', 'Your message is being transmitted directly to the studio inbox.');
    if (window.VSFunnel) {
      window.VSFunnel.track('contact_submit_started', { page_path: window.location.pathname });
      window.VSFunnel.trackStage('contact_signal', 'started', { page_path: window.location.pathname });
    }

    var data = new FormData(form);
    data.set('message', 'Subject: ' + subject + '\n\nFrom: ' + name + ' <' + email + '>\n\n' + message);

    try {
      var response = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: data });
      var json = await response.json();
      if (!json.success) throw new Error(json.message || 'Submission failed');
      form.reset();
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      showFeedback('good', 'Signal transmitted', 'Response time is typically within 48 hours. If this is time-sensitive, email founder@vaultsparkstudios.com directly.');
      showToast(false);
      if (typeof gtag === 'function') gtag('event', 'form_submit', { form_id: 'contact' });
      if (window.VSFunnel) {
        window.VSFunnel.track('contact_submit_success', { page_path: window.location.pathname });
        window.VSFunnel.trackStage('contact_signal', 'success', { page_path: window.location.pathname });
      }
    } catch (error) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      showFeedback('bad', 'Transmission failed', 'Please retry, or email founder@vaultsparkstudios.com directly if the issue continues.');
      showToast(true);
      if (typeof gtag === 'function') gtag('event', 'form_error', { form_id: 'contact', error: error.message });
      if (window.VSFunnel) {
        window.VSFunnel.track('contact_submit_error', { page_path: window.location.pathname, error: error.message || 'unknown' });
        window.VSFunnel.trackStage('contact_signal', 'error', { page_path: window.location.pathname, error: error.message || 'unknown' });
      }
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    toast = document.getElementById('contact-toast');
    toastClose = document.getElementById('toast-close');
    toastProgress = document.getElementById('toast-progress');
    toastIcon = toast.querySelector('.toast-icon');
    toastTitle = toast.querySelector('.toast-title');
    toastMsg = toast.querySelector('.toast-msg');
    feedback = document.getElementById('contact-feedback');

    toastClose.addEventListener('click', dismissToast);
    document.getElementById('contact-form').addEventListener('submit', onSubmit);
  });
})();
