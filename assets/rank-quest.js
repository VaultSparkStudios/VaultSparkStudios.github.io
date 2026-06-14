/* rank-quest.js — first-climb quest + progress (S195 item 6).
 *
 * The rank ladder is named everywhere but /ranks/ never gave a member a visible,
 * closing goal. This renders a "First Climb" quest: 3 concrete starter actions,
 * a progress bar over them, and clear CTAs. Entirely client-side — it tracks
 * completion in localStorage and reads the existing signed-in flag; it does NOT
 * touch tier logic or write server state (those remain founder-gated). Honest:
 * a signed-out visitor sees the climb as an invitation, not a locked door.
 *
 * DOM built node-by-node (Trusted-Types-safe, no innerHTML).
 */
(function () {
  'use strict';

  var STEPS = [
    { key: 'join',   label: 'Open the Vault',     hint: 'Create your free membership — the climb starts at Vaulted.', cta: 'Join free', href: '/membership/', signedInCompletes: true },
    { key: 'ask',    label: 'Ask IGNIS anything', hint: 'Put a question to the studio oracle. It answers from public memory.', cta: 'Ask IGNIS', href: '/ignis/', flag: 'vs_quest_ask' },
    { key: 'react',  label: 'React to a ship',    hint: 'Tell the studio what landed well on the latest changes.', cta: 'See ships', href: '/changelog/', flag: 'vs_quest_react' }
  ];

  function signedIn() {
    try {
      return !!(document.documentElement.hasAttribute('data-vs-signed-in') ||
        (document.body && document.body.hasAttribute('data-vs-signed-in')));
    } catch (_e) { return false; }
  }
  function done(step) {
    if (step.signedInCompletes && signedIn()) return true;
    try { return localStorage.getItem(step.flag || ('vs_quest_' + step.key)) === '1'; }
    catch (_e) { return false; }
  }
  function markStarted(step) {
    // Clicking a step's CTA records intent; the cross-surface flag (e.g. asking
    // IGNIS sets vs_quest_ask) is what actually completes it on return.
    try { localStorage.setItem('vs_quest_' + step.key + '_started', '1'); } catch (_e) {}
  }

  function ensureStyles() {
    if (document.getElementById('vs-rank-quest-style')) return;
    var s = document.createElement('style');
    s.id = 'vs-rank-quest-style';
    s.textContent =
      '.vs-quest{margin:0 0 2rem;padding:1.4rem;border:1px solid var(--line,rgba(255,255,255,.1));border-radius:18px;background:linear-gradient(135deg,rgba(255,196,0,.06),rgba(126,201,255,.03))}' +
      '.vs-quest__top{display:flex;align-items:baseline;justify-content:space-between;gap:1rem;flex-wrap:wrap}' +
      '.vs-quest__eyebrow{font-size:.7rem;text-transform:uppercase;letter-spacing:.09em;color:var(--gold,#ffc400);font-weight:700}' +
      '.vs-quest__count{font-size:.8rem;color:var(--muted,#a8b4d0)}' +
      '.vs-quest__title{font-family:Georgia,serif;font-size:1.45rem;margin:.25rem 0 .9rem}' +
      '.vs-quest__bar{height:8px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden;margin-bottom:1.1rem}' +
      '.vs-quest__fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#ff7a00,#ffc400);transition:width .5s ease}' +
      '.vs-quest__step{display:flex;align-items:flex-start;gap:.8rem;padding:.7rem 0;border-top:1px solid var(--line,rgba(255,255,255,.06))}' +
      '.vs-quest__tick{flex:0 0 auto;width:22px;height:22px;border-radius:50%;border:1.5px solid var(--dim,#6272a0);display:flex;align-items:center;justify-content:center;font-size:.8rem;color:transparent;margin-top:.1rem}' +
      '.vs-quest__step[data-done="true"] .vs-quest__tick{background:var(--gold,#ffc400);border-color:var(--gold,#ffc400);color:#10131f}' +
      '.vs-quest__body{flex:1 1 auto;min-width:0}' +
      '.vs-quest__label{font-weight:700;color:var(--text,#eef2ff)}' +
      '.vs-quest__step[data-done="true"] .vs-quest__label{color:var(--muted,#a8b4d0);text-decoration:line-through}' +
      '.vs-quest__hint{font-size:.82rem;color:var(--muted,#a8b4d0);margin-top:.15rem}' +
      '.vs-quest__cta{flex:0 0 auto;align-self:center;font-size:.82rem;font-weight:700;color:var(--gold,#ffc400);border:1px solid rgba(255,196,0,.3);border-radius:999px;padding:.35rem .8rem;white-space:nowrap}' +
      '.vs-quest__cta:hover{background:rgba(255,196,0,.12)}' +
      '.vs-quest__done-msg{margin-top:.6rem;font-size:.85rem;color:var(--gold,#ffc400)}';
    document.head.appendChild(s);
  }

  function mount(root) {
    ensureStyles();
    var total = STEPS.length;
    var completed = STEPS.filter(done).length;

    var box = document.createElement('section');
    box.className = 'vs-quest';

    var top = document.createElement('div');
    top.className = 'vs-quest__top';
    var eb = document.createElement('span');
    eb.className = 'vs-quest__eyebrow';
    eb.textContent = 'First Climb';
    var count = document.createElement('span');
    count.className = 'vs-quest__count';
    count.textContent = completed + ' / ' + total + ' complete';
    top.appendChild(eb);
    top.appendChild(count);
    box.appendChild(top);

    var title = document.createElement('h2');
    title.className = 'vs-quest__title';
    title.textContent = 'Start your ascent to Vaulted.';
    box.appendChild(title);

    var bar = document.createElement('div');
    bar.className = 'vs-quest__bar';
    var fill = document.createElement('div');
    fill.className = 'vs-quest__fill';
    fill.style.width = Math.round((completed / total) * 100) + '%';
    bar.appendChild(fill);
    box.appendChild(bar);

    STEPS.forEach(function (step) {
      var isDone = done(step);
      var row = document.createElement('div');
      row.className = 'vs-quest__step';
      row.setAttribute('data-done', isDone ? 'true' : 'false');

      var tick = document.createElement('span');
      tick.className = 'vs-quest__tick';
      tick.setAttribute('aria-hidden', 'true');
      tick.textContent = '✓';
      row.appendChild(tick);

      var body = document.createElement('div');
      body.className = 'vs-quest__body';
      var lbl = document.createElement('div');
      lbl.className = 'vs-quest__label';
      lbl.textContent = step.label;
      var hint = document.createElement('div');
      hint.className = 'vs-quest__hint';
      hint.textContent = step.hint;
      body.appendChild(lbl);
      body.appendChild(hint);
      row.appendChild(body);

      if (!isDone) {
        var cta = document.createElement('a');
        cta.className = 'vs-quest__cta';
        cta.href = step.href;
        cta.textContent = step.cta + ' →';
        cta.addEventListener('click', function () { markStarted(step); });
        row.appendChild(cta);
      }
      box.appendChild(row);
    });

    if (completed === total) {
      var msg = document.createElement('div');
      msg.className = 'vs-quest__done-msg';
      msg.textContent = '✦ First Climb complete — the vault knows your name. Keep earning points below.';
      box.appendChild(msg);
    }

    root.appendChild(box);
  }

  function boot() {
    var roots = Array.prototype.slice.call(document.querySelectorAll('[data-rank-quest]'));
    roots.forEach(mount);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
