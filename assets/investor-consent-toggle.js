(function () {
  'use strict';

  var CONSENT_KEY = 'vs_inv_activity_consent';

  function read() {
    try { return window.localStorage.getItem(CONSENT_KEY); } catch (_) { return null; }
  }

  function label(state) {
    if (state === 'granted') return 'Activity logging is on. Your portal reads, questions, and document opens are recorded for the audit trail.';
    if (state === 'denied') return 'Activity logging is off. Nothing about your session is written to the audit trail.';
    return 'Activity logging is currently off by default. Turn it on if you want a personal audit trail and faster follow-up from the studio.';
  }

  function render(host) {
    var state = read();
    host.innerHTML = '';
    host.className = 'inv-card';
    host.setAttribute('role', 'region');
    host.setAttribute('aria-label', 'Activity logging preferences');

    var h = document.createElement('h2');
    h.className = 'inv-section-title';
    h.textContent = 'Activity logging';
    host.appendChild(h);

    var status = document.createElement('p');
    status.id = 'invConsentStatus';
    status.style.cssText = 'margin:0 0 1rem 0;color:var(--muted);line-height:1.65;';
    status.textContent = label(state);
    host.appendChild(status);

    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:0.6rem;flex-wrap:wrap;align-items:center;';

    function makeBtn(text, target, primary) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = primary ? 'inv-btn inv-btn-primary' : 'inv-btn inv-btn-ghost';
      b.textContent = text;
      b.addEventListener('click', function () {
        if (window.VSInvestorAuth && typeof window.VSInvestorAuth.setConsent === 'function') {
          window.VSInvestorAuth.setConsent(target);
        } else {
          try { window.localStorage.setItem(CONSENT_KEY, target); } catch (_) {}
        }
        render(host);
      });
      return b;
    }

    var isOn = state === 'granted';
    row.appendChild(makeBtn(isOn ? 'Keep logging on' : 'Turn logging on', 'granted', !isOn));
    row.appendChild(makeBtn(isOn ? 'Turn logging off' : 'Keep logging off', 'denied', isOn));

    host.appendChild(row);

    var footnote = document.createElement('p');
    footnote.style.cssText = 'margin:1rem 0 0 0;font-size:0.82rem;color:var(--dim);';
    footnote.innerHTML = 'Legal basis: consent (GDPR Art. 6(1)(a)). You can change this at any time. ' +
      'Logs already written before a change are retained as part of the investor audit trail required for regulatory recordkeeping.';
    host.appendChild(footnote);
  }

  function init() {
    var host = document.getElementById('inv-consent-toggle');
    if (!host) return;
    render(host);
    document.addEventListener('investor:consent-change', function () { render(host); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
