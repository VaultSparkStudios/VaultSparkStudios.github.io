(function () {
  'use strict';
  function esc(value) {
    return String(value || '').replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }
  async function submit(answer, status) {
    var sb = window.VSSupabase;
    if (!sb || typeof sb.from !== 'function') throw new Error('Feedback service unavailable.');
    var result = await sb.from('page_feedback').insert([{
      page_path: '/vault-member/',
      question: 'member_studio_direction',
      answer: answer,
      session_id: null
    }]);
    if (result.error) throw result.error;
    status.textContent = 'Signal received. This fixed-choice vote is anonymous and contains no account identifier.';
  }
  function mount() {
    var root = document.getElementById('member-studio-feedback');
    if (!root) return;
    root.innerHTML = '<p style="margin:0 0 .7rem;color:var(--muted);font-size:.86rem;line-height:1.6;">Is the studio heading in a direction you want to keep following?</p>'
      + '<div style="display:flex;flex-wrap:wrap;gap:.55rem;">'
      + ['useful:Yes — keep going', 'mixed:Somewhat', 'not_useful:Not yet'].map(function (entry) {
          var parts = entry.split(':');
          return '<button type="button" class="button button-sm" data-member-studio-vote="' + esc(parts[0]) + '">' + esc(parts[1]) + '</button>';
        }).join('')
      + '</div><p id="member-studio-feedback-status" role="status" aria-live="polite" style="min-height:1.35rem;margin:.65rem 0 0;color:var(--dim);font-size:.78rem;">Anonymous fixed-choice signal; no free text or member ID is stored.</p>';
    var status = document.getElementById('member-studio-feedback-status');
    root.addEventListener('click', async function (event) {
      var button = event.target.closest('[data-member-studio-vote]');
      if (!button || button.disabled) return;
      root.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
      status.textContent = 'Sending…';
      try { await submit(button.dataset.memberStudioVote, status); }
      catch (_) {
        root.querySelectorAll('button').forEach(function (b) { b.disabled = false; });
        status.textContent = 'Could not send that signal. Nothing was stored.';
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
