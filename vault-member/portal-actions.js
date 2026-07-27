/* CSP-safe action routing for static and dynamically rendered member controls. */
(function () {
  'use strict';

  function invoke(name, args) {
    var handler = window[name];
    if (typeof handler === 'function') return handler.apply(window, args || []);
    return undefined;
  }

  document.addEventListener('click', function (event) {
    var control = event.target.closest('[data-member-action]');
    if (!control) return;
    var action = control.dataset.memberAction;

    if (action === 'open-challenges') document.getElementById('tab-dash-challenges')?.click();
    else if (action === 'open-rankup') { invoke('switchDashTab', ['dashboard']); invoke('closeNotifPanel'); }
    else if (action === 'inv-filter') invoke('loadInvRequests', [control.dataset.filter === 'all' ? null : control.dataset.filter]);
    else if (action === 'add-poll-option') invoke('addPollOption');
    else if (action === 'onboarding-next') invoke('onboardingNext');
    else if (action === 'onboarding-skip') invoke('onboardingSkip');
    else if (action === 'bookmark-file') { event.stopPropagation(); invoke('toggleFileBookmark', [control.dataset.slug, control]); }
    else if (action === 'cast-vote') invoke('castVote', [control.dataset.pollId, Number(control.dataset.optionIndex), control.closest('.poll-wrap')]);
    else if (action === 'admin-close-poll') invoke('adminClosePoll', [control.dataset.pollId, control.dataset.reopen === 'true']);
    else if (action === 'challenge-filter') invoke('setChallengeFilter', [control.dataset.category]);
    else if (action === 'create-team') invoke('createTeam', [control.dataset.memberId]);
    else if (action === 'join-team') invoke('joinTeam', [control.dataset.memberId]);
    else if (action === 'copy-invite') navigator.clipboard.writeText(control.dataset.inviteCode || '').then(function () {
      control.textContent = 'Copied!';
      window.setTimeout(function () { control.textContent = 'Copy'; }, 2000);
    });
    else if (action === 'disband-team') invoke('disbandTeam', [control.dataset.teamId, control.dataset.memberId]);
    else if (action === 'leave-team') invoke('leaveTeam', [control.dataset.memberId]);
    else if (action === 'claim-milestone') invoke('claimMilestone', [Number(control.dataset.milestoneId), control]);
    else if (action === 'close-challenge-modal') control.closest('#challenge-complete-modal')?.remove();
    else if (action === 'buy-treasury-item') invoke('buyTreasuryItem', [control.dataset.itemId, control.dataset.itemName, Number(control.dataset.cost)]);
    else if (action === 'connect-discord') invoke('connectDiscord');
    else if (action === 'copy-key') invoke('copyKeyCode', [control.dataset.slug]);
    else if (action === 'claim-key') invoke('claimKey', [control.dataset.slug]);
    else if (action === 'update-inv-request') invoke('updateInvRequest', [control.dataset.requestId, control.dataset.status]);
    else if (action === 'moderate-fan-art') invoke('moderateFanArt', [control.dataset.submissionId, control.dataset.status]);
  });

  document.addEventListener('change', function (event) {
    if (event.target.dataset.memberChange !== 'pulse-schedule') return;
    var schedule = document.getElementById('admin-pulse-schedule-wrap');
    if (schedule) schedule.style.display = event.target.checked ? 'block' : 'none';
  });

  document.addEventListener('submit', function (event) {
    if (event.target.dataset.memberSubmit === 'create-poll') invoke('adminCreatePoll', [event]);
  });

  function applyHover(target, entered) {
    var hover = target.closest?.('[data-member-hover]');
    if (!hover) return;
    if (hover.dataset.memberHover === 'challenge-button') hover.style.background = entered ? 'rgba(255,196,0,0.16)' : 'rgba(255,196,0,0.1)';
    else if (hover.dataset.memberHover === 'bookmark') hover.style.color = entered ? 'var(--gold)' : 'var(--dim)';
    else if (hover.dataset.memberHover === 'poll-option') hover.style.borderColor = entered ? 'rgba(255,196,0,0.35)' : 'rgba(255,255,255,0.08)';
  }

  document.addEventListener('pointerover', function (event) { applyHover(event.target, true); });
  document.addEventListener('pointerout', function (event) { applyHover(event.target, false); });

  document.addEventListener('error', function (event) {
    if (event.target.matches?.('img[data-hide-on-error]')) event.target.style.display = 'none';
  }, true);
})();
