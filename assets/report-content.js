/* Public-page reporting: validation and plain-text contact payload only.
 * The reported URL is never fetched. Account/operator links are excluded and
 * query/fragment data is removed before the existing contact service sees it.
 */
(function (root) {
  'use strict';
  var REASONS = Object.freeze({
    accuracy: 'Inaccurate or misleading information',
    harmful: 'Harmful or abusive content',
    privacy: 'Privacy concern',
    broken: 'Broken or inaccessible page',
    copyright: 'Copyright concern',
    other: 'Something else'
  });
  var PRIVATE_ROOT = /^(?:auth|login(?:\.html)?|sign-in|member|members|membership-value|vault-member|vault-portal|vault-treasury|investor-portal|studio-hub|obelisk-passport|context|portfolio|audits|secrets|scripts|cloudflare|supabase|config|node_modules|data|api|assets|v)$/i;
  var control = /[\u0000-\u001f\u007f]/;
  var count = function (value) { return Array.from(value).length; };

  function publicPageUrl(value) {
    if (typeof value !== 'string' || count(value) > 2048 || control.test(value) || /\\/.test(value)) return null;
    var url;
    try { url = new URL(value.trim()); } catch (_) { return null; }
    if (url.origin !== 'https://vaultsparkstudios.com' || url.username || url.password) return null;
    var decoded = url.pathname;
    try {
      for (var i = 0; i < 3 && /%[0-9a-f]{2}/i.test(decoded); i++) decoded = decodeURIComponent(decoded);
    } catch (_) { return null; }
    if (control.test(decoded) || /\\|\/\/|%[0-9a-f]{2}/i.test(decoded)) return null;
    var segments = decoded.split('/').filter(Boolean);
    if (segments.some(function (part) { return part === '.' || part === '..'; })) return null;
    var first = segments[0] || '';
    if (/^[._]/.test(first) || PRIVATE_ROOT.test(first)) return null;
    // Public content is identified by its page path, never a session, tracking
    // parameter or fragment that may contain private text.
    url.search = ''; url.hash = '';
    return url.href.length <= 2048 ? url.href : null;
  }

  function validate(values) {
    var name = String(values.name || '').trim();
    var email = String(values.email || '').trim();
    var details = String(values.details || '').trim();
    if (count(name) > 80 || control.test(name)) return { ok: false, field: 'name', message: 'Use a name of 80 characters or fewer, or leave it blank.' };
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || control.test(email)) return { ok: false, field: 'email', message: 'Enter a valid email address so we can reply.' };
    var page = publicPageUrl(values.url);
    if (!page) return { ok: false, field: 'url', message: 'Paste a public https://vaultsparkstudios.com page address. Account, sign-in and operator links cannot be reported here.' };
    if (!Object.prototype.hasOwnProperty.call(REASONS, values.reason)) return { ok: false, field: 'reason', message: 'Choose what you would like us to review.' };
    if (count(details) < 10 || count(details) > 4000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(details)) return { ok: false, field: 'details', message: 'Describe the concern in 10–4,000 characters. Do not include passwords, payment details or private account information.' };
    return { ok: true, name: name || 'Content reporter', email: email, url: page, reason: REASONS[values.reason], details: details };
  }

  function buildReport(values) {
    var report = validate(values);
    if (!report.ok) return report;
    return {
      ok: true, name: report.name, email: report.email,
      subject: 'VaultSpark Studios — Public content report',
      inquirySubject: 'Content report — ' + report.reason,
      message: 'PUBLIC CONTENT REPORT\nPage: ' + report.url + '\nReason: ' + report.reason
        + '\nReply to: ' + report.email + '\nReporter: ' + report.name + '\n\nDetails:\n' + report.details,
    };
  }

  var api = { publicPageUrl: publicPageUrl, validate: validate, buildReport: buildReport, reasons: REASONS };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.VSContentReport = api;
})(typeof window !== 'undefined' ? window : globalThis);
