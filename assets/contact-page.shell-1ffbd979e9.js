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
  var generalPlaceholder;
  var generalHiddenSubject;

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
    if (form.getAttribute('aria-busy') === 'true') return;
    var reportMode = document.getElementById('contact-kind').value === 'report';
    var name = document.getElementById('contact-name').value.trim();
    var email = document.getElementById('contact-email').value.trim();
    var subject = document.getElementById('contact-subject').value.trim();
    var message = document.getElementById('contact-message').value.trim();
    form.querySelectorAll('[aria-invalid="true"]').forEach(function (input) { input.removeAttribute('aria-invalid'); input.setCustomValidity(''); });
    var report;
    if (reportMode) {
      if (!window.VSContentReport) {
        showFeedback('bad', 'Reporting is still loading', 'Reload the page and try again. No report has been submitted.');
        return;
      }
      report = window.VSContentReport.buildReport({
        name: name, email: email, details: message,
        url: document.getElementById('contact-report-url').value,
        reason: document.getElementById('contact-report-reason').value
      });
      if (!report.ok) {
        var ids = { name: 'contact-name', email: 'contact-email', url: 'contact-report-url', reason: 'contact-report-reason', details: 'contact-message' };
        validationError(document.getElementById(ids[report.field]), report.message, true);
        return;
      }
    } else {
      var checks = [
        ['contact-name', name && Array.from(name).length <= 80 && !/[\u0000-\u001f\u007f]/.test(name), 'Enter your name in 80 characters or fewer.'],
        ['contact-email', email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'Enter a valid email address so we can reply.'],
        ['contact-subject', subject && Array.from(subject).length <= 200 && !/[\u0000-\u001f\u007f]/.test(subject), 'Add a subject in 200 characters or fewer.'],
        ['contact-message', message && Array.from(message).length <= 10000, 'Add a message in 10,000 characters or fewer.']
      ];
      for (var i = 0; i < checks.length; i++) {
        if (!checks[i][1]) { validationError(document.getElementById(checks[i][0]), checks[i][2], false); return; }
      }
    }

    var data = new FormData(form);
    if (reportMode) {
      data.set('name', report.name); data.set('email', report.email);
      data.set('subject', report.subject); data.set('inquiry_subject', report.inquirySubject);
      data.set('message', report.message);
    } else data.set('message', 'Subject: ' + subject + '\n\nFrom: ' + name + ' <' + email + '>\n\n' + message);

    var submitBtn = form.querySelector('button[type="submit"]');
    var originalText = submitBtn.textContent;
    var controls = Array.prototype.map.call(form.elements, function (control) { return { control: control, disabled: control.disabled }; });
    controls.forEach(function (entry) { entry.control.disabled = true; });
    form.setAttribute('aria-busy', 'true');
    submitBtn.textContent = reportMode ? 'Submitting report…' : 'Transmitting…';
    showFeedback('neutral', reportMode ? 'Submitting your report' : 'Signal in transit', reportMode ? 'Your report is being checked before it is sent to the contact service.' : 'Your message is being transmitted directly to the studio inbox.');
    if (window.VSFunnel) {
      window.VSFunnel.track('contact_submit_started', { page_path: window.location.pathname });
      window.VSFunnel.trackStage('contact_signal', 'started', { page_path: window.location.pathname });
    }

    var submitted = false;
    var requestTimer;
    try {
      if (!window.VSTurnstile || !window.VSCsrf) throw new Error('Verification is still loading. Please retry.');
      showFeedback('neutral', reportMode ? 'Checking your report' : 'Verifying signal', 'A privacy-preserving bot check is protecting the studio inbox.');
      var tokens = await withDeadline(Promise.all([window.VSTurnstile.getToken(), window.VSCsrf.getToken()]), 15000);
      if (tokens.some(function (token) { return typeof token !== 'string' || !token.trim(); })) throw new Error('Verification did not complete');
      data.set('cf-turnstile-response', tokens[0]);
      var controller = new AbortController();
      requestTimer = setTimeout(function () { controller.abort(); }, 15000);
      var response = await fetch('/contact/submit', {
        method: 'POST',
        body: data,
        headers: { 'X-CSRF-Token': tokens[1] },
        credentials: 'same-origin',
        signal: controller.signal
      });
      var json = await response.json();
      if (!response.ok || json.success !== true) throw new Error('Submission was not accepted');
      submitted = true;
      if (reportMode) {
        showFeedback('good', 'Report submitted', 'The contact service accepted your report. Email delivery and content review are not yet confirmed.');
        feedback.focus();
      } else {
        showFeedback('good', 'Signal transmitted', 'Response time is typically within 48 hours. If this is time-sensitive, email founder@vaultsparkstudios.com directly.');
        showToast(false);
      }
      if (typeof gtag === 'function') gtag('event', 'form_submit', { form_id: 'contact' });
      if (window.VSFunnel) {
        window.VSFunnel.track('contact_submit_success', { page_path: window.location.pathname });
        window.VSFunnel.trackStage('contact_signal', 'success', { page_path: window.location.pathname });
      }
    } catch (error) {
      showFeedback('bad', reportMode ? 'Report not submitted' : 'Transmission failed', reportMode ? 'We could not confirm acceptance. Your details are still here. Retry, or email founder@vaultsparkstudios.com with the public page address and concern.' : 'Please retry, or email founder@vaultsparkstudios.com directly if the issue continues.');
      if (reportMode) feedback.focus(); else showToast(true);
      if (typeof gtag === 'function') gtag('event', 'form_error', { form_id: 'contact', error: 'submission_failed' });
      if (window.VSFunnel) {
        window.VSFunnel.track('contact_submit_error', { page_path: window.location.pathname, error: 'submission_failed' });
        window.VSFunnel.trackStage('contact_signal', 'error', { page_path: window.location.pathname, error: 'submission_failed' });
      }
    } finally {
      clearTimeout(requestTimer);
      controls.forEach(function (entry) { entry.control.disabled = entry.disabled; });
      form.setAttribute('aria-busy', 'false');
      submitBtn.textContent = originalText;
      if (submitted) {
        form.reset();
        document.getElementById('contact-kind').value = reportMode ? 'report' : 'message';
        applyReportMode();
      }
    }
  }

  function withDeadline(promise, ms) {
    var timer;
    return Promise.race([promise, new Promise(function (_, reject) { timer = setTimeout(function () { reject(new Error('Verification timed out')); }, ms); })])
      .finally(function () { clearTimeout(timer); });
  }

  function validationError(input, copy, reportMode) {
    input.setAttribute('aria-invalid', 'true');
    input.setCustomValidity(copy);
    showFeedback('bad', reportMode ? 'Check your report' : 'Check your message', copy);
    input.focus();
  }

  function applyReportMode() {
    var reportMode = document.getElementById('contact-kind').value === 'report';
    var fields = document.getElementById('contact-report-fields');
    fields.hidden = !reportMode; fields.disabled = !reportMode;
    document.getElementById('contact-subject-group').hidden = reportMode;
    document.getElementById('contact-subject').disabled = reportMode;
    document.getElementById('contact-name').required = !reportMode;
    document.getElementById('contact-name-label').textContent = reportMode ? 'Your Name (optional)' : 'Your Name';
    document.getElementById('contact-form-title').textContent = reportMode ? 'Report A Public Page' : 'Send A Signal';
    document.getElementById('contact-form-intro').textContent = reportMode ? 'Flag a concern on this website. A reply email and the public page address help us understand your report.' : 'Send a message, or choose a content report to flag a public page for review.';
    document.getElementById('contact-message-label').textContent = reportMode ? 'Report details' : 'Message';
    var message = document.getElementById('contact-message');
    message.maxLength = reportMode ? 4000 : 10000;
    message.placeholder = reportMode ? 'What should we review, and where on the page? Include enough context to find the concern, without private account or payment information.' : generalPlaceholder;
    document.querySelector('#contact-form input[name="subject"]').value = reportMode ? 'VaultSpark Studios — Public content report' : generalHiddenSubject;
    document.querySelector('#contact-form button[type="submit"]').textContent = reportMode ? 'Submit report →' : 'Send Signal →';
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
    applySharedDraft();
    applyTopicPreset();
    generalPlaceholder = document.getElementById('contact-message').placeholder;
    generalHiddenSubject = document.querySelector('#contact-form input[name="subject"]').value;
    try { if (new URLSearchParams(window.location.search).get('topic') === 'report') document.getElementById('contact-kind').value = 'report'; } catch (_) { /* ordinary contact mode */ }
    applyReportMode();
    document.getElementById('contact-kind').addEventListener('change', function () {
      document.getElementById('contact-form').querySelectorAll('[aria-invalid="true"]').forEach(function (input) { input.removeAttribute('aria-invalid'); input.setCustomValidity(''); });
      applyReportMode();
    });
    document.getElementById('contact-form').addEventListener('input', function (event) {
      if (event.target.setCustomValidity) { event.target.setCustomValidity(''); event.target.removeAttribute('aria-invalid'); }
    });
  });

  // The share-target landing passes a draft, never an instruction to submit.
  // Assign values as plain text and preserve browser-restored/visitor edits.
  function applySharedDraft() {
    var params;
    try { params = new URLSearchParams(window.location.search); } catch (_) { return; }
    var fields = [
      { id: 'contact-subject', key: 'subject', limit: 200 },
      { id: 'contact-message', key: 'body', limit: 10000 }
    ];
    fields.forEach(function (field) {
      var input = document.getElementById(field.id);
      var value = params.get(field.key);
      if (!input || input.value || !value) return;
      // Bound query-supplied drafts without cutting a Unicode surrogate pair.
      input.value = Array.from(value.trim()).slice(0, field.limit).join('');
    });
  }

  // /contact/?topic=invite — offer account help and current membership information.
  // Shared Studio sign-in and website membership enrollment are separate.
  // /contact/?topic=collaborate — the /collaborate/ page (playtesters, artists,
  // audio collaborators) routes here with the request framed the same way.
  var TOPIC_PRESETS = {
    invite: {
      subject: 'Vault account help',
      hiddenSubject: 'VaultSpark Studios — Vault account help',
      placeholder: 'Tell us where you need help with your Vault Member account. Include the step you reached and any error message, but never passwords or verification codes.',
      note: 'For current website membership enrollment and access, see the membership page. Use this form if you need help with your website account.',
      membershipHref: '/membership/',
      event: 'invite_request_view'
    },
    collaborate: {
      subject: 'Collaboration — playtesting, art or audio',
      hiddenSubject: 'VaultSpark Studios — Collaboration enquiry',
      placeholder: 'Which role interests you (playtesting, art, audio)? Share links to your work, the games or worlds that drew you here, and how much time you can offer.',
      note: 'VaultSpark is an independent, solo-founded studio. Collaborations are credited and arranged one by one — the studio reads every message and replies to serious enquiries.',
      event: 'collaborate_request_view'
    }
  };

  function applyTopicPreset() {
    var topic = '';
    try { topic = new URLSearchParams(window.location.search).get('topic') || ''; } catch (_) { return; }
    var preset = Object.prototype.hasOwnProperty.call(TOPIC_PRESETS, topic) ? TOPIC_PRESETS[topic] : null;
    if (!preset) return;
    var subject = document.getElementById('contact-subject');
    var message = document.getElementById('contact-message');
    var hiddenSubject = document.querySelector('#contact-form input[name="subject"]');
    if (subject && !subject.value) subject.value = preset.subject;
    if (hiddenSubject) hiddenSubject.value = preset.hiddenSubject;
    if (message) message.placeholder = preset.placeholder;
    var panel = document.querySelector('.contact-form-panel');
    if (panel && !document.getElementById('invite-request-note')) {
      var note = document.createElement('p');
      note.id = 'invite-request-note';
      note.className = 'invite-request-note';
      note.textContent = preset.note;
      if (preset.membershipHref) {
        var membershipLink = document.createElement('a');
        membershipLink.href = preset.membershipHref;
        membershipLink.textContent = 'Current membership information';
        note.appendChild(document.createTextNode(' '));
        note.appendChild(membershipLink);
      }
      var heading = panel.querySelector('h2');
      if (heading) heading.insertAdjacentElement('afterend', note);
    }
    if (window.VSFunnel) window.VSFunnel.track(preset.event, { page_path: window.location.pathname });
  }
})();
