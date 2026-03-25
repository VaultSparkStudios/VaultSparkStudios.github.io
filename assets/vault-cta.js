/**
 * VaultSpark sticky "Join the Vault" CTA bar for public pages.
 * Shows after 4s if the visitor is not a signed-in vault member.
 * Dismisses on click-X (remembers for 24h via localStorage).
 */
(function () {
  var SB = 'https://fjnpzjjyhnpmunfoycrp.supabase.co';
  var KEY = 'sb_publishable_thM93D_GVKW5qzAiZpNl1w_AVGILCij';
  var DISMISS_KEY = 'vs_cta_dismissed';

  function isDismissed() {
    var ts = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
    return ts && Date.now() - ts < 24 * 60 * 60 * 1000;
  }

  function showCTA() {
    if (isDismissed()) return;
    if (document.getElementById('vs-cta-bar')) return;

    var bar = document.createElement('div');
    bar.id = 'vs-cta-bar';
    bar.style.cssText = [
      'position:fixed', 'bottom:0', 'left:0', 'right:0', 'z-index:8800',
      'background:rgba(10,13,22,0.97)',
      'border-top:1px solid rgba(255,196,0,0.25)',
      'padding:0.75rem 1.25rem',
      'display:flex', 'align-items:center', 'justify-content:space-between',
      'gap:1rem', 'flex-wrap:wrap',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      'backdrop-filter:blur(8px)',
      '-webkit-backdrop-filter:blur(8px)',
      'animation:vs-cta-in 0.3s ease',
    ].join(';');

    var style = document.createElement('style');
    style.textContent = '@keyframes vs-cta-in{from{transform:translateY(100%)}to{transform:translateY(0)}}';
    document.head.appendChild(style);

    bar.innerHTML =
      '<div style="flex:1;min-width:160px;">' +
        '<div style="font-size:0.88rem;font-weight:800;color:#fff;margin-bottom:0.1rem;">Join the Vault — Free</div>' +
        '<div style="font-size:0.76rem;color:rgba(255,255,255,0.5);line-height:1.4;">Earn points, access classified files, and climb the leaderboard.</div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:0.6rem;flex-shrink:0;">' +
        '<a href="/vault-member/#register" style="display:inline-block;padding:0.45rem 1.1rem;background:#FFC400;color:#000;font-weight:800;font-size:0.84rem;border-radius:9px;text-decoration:none;white-space:nowrap;">Join The Vault</a>' +
        '<a href="/vault-member/" style="font-size:0.8rem;color:rgba(255,255,255,0.4);text-decoration:none;white-space:nowrap;">Sign in</a>' +
        '<button aria-label="Dismiss" onclick="(function(){localStorage.setItem(\'vs_cta_dismissed\',Date.now());document.getElementById(\'vs-cta-bar\').remove();})()" style="padding:0.3rem 0.55rem;background:transparent;border:1px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.35);font-size:0.78rem;border-radius:7px;cursor:pointer;font-family:inherit;">✕</button>' +
      '</div>';

    document.body.appendChild(bar);
  }

  // Check if user is already logged in via Supabase session cookie
  function checkAndShow() {
    try {
      // Check localStorage for Supabase session (heuristic — avoid fetch)
      var hasSession = false;
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('supabase') !== -1 && k.indexOf('access_token') !== -1) {
          hasSession = true; break;
        }
        if (k && k.indexOf('sb-') !== -1 && k.indexOf('-auth-token') !== -1) {
          try { var v = JSON.parse(localStorage.getItem(k)); if (v && v.access_token) { hasSession = true; break; } } catch(_){}
        }
      }
      if (!hasSession) setTimeout(showCTA, 4000);
    } catch (_) {
      setTimeout(showCTA, 4000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndShow);
  } else {
    checkAndShow();
  }
})();
