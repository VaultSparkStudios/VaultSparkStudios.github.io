/**
 * VaultSpark Leaderboard Embed Widget v1
 *
 * Usage:
 *   <div id="vaultspark-leaderboard" data-game="call-of-doodie" data-limit="10"></div>
 *   <script src="https://vaultsparkstudios.com/api/leaderboard/v1/widget.js"></script>
 */
(function () {
  var BASE = 'https://vaultsparkstudios.com/api/leaderboard/v1/';
  var el = document.getElementById('vaultspark-leaderboard');
  if (!el) return;

  var game = el.getAttribute('data-game') || 'all';
  var limit = parseInt(el.getAttribute('data-limit'), 10) || 25;

  // Inject scoped styles
  var css =
    '#vaultspark-leaderboard{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
    'background:#0a0a0a;border:1px solid #1a1a1a;border-radius:12px;padding:1.25rem;max-width:480px;color:#e0e0e0}' +
    '#vaultspark-leaderboard *{box-sizing:border-box;margin:0;padding:0}' +
    '.vs-lb-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem}' +
    '.vs-lb-title{font-size:0.95rem;font-weight:700;color:#ffc400}' +
    '.vs-lb-brand{font-size:0.7rem;color:#666;text-decoration:none}' +
    '.vs-lb-brand:hover{color:#ffc400}' +
    '.vs-lb-list{list-style:none}' +
    '.vs-lb-row{display:flex;align-items:center;padding:0.5rem 0;border-bottom:1px solid #141414}' +
    '.vs-lb-row:last-child{border-bottom:none}' +
    '.vs-lb-rank{width:2rem;font-weight:800;font-size:0.8rem;color:#555;text-align:center;flex-shrink:0}' +
    '.vs-lb-rank.gold{color:#ffc400}.vs-lb-rank.silver{color:#c0c0c0}.vs-lb-rank.bronze{color:#cd7f32}' +
    '.vs-lb-info{flex:1;min-width:0}' +
    '.vs-lb-name{font-weight:600;font-size:0.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.vs-lb-rt{font-size:0.72rem;color:#666;margin-top:0.1rem}' +
    '.vs-lb-score{font-weight:700;color:#ffc400;font-size:0.88rem;flex-shrink:0;margin-left:0.75rem}' +
    '.vs-lb-empty{text-align:center;padding:2rem 0;color:#555;font-size:0.88rem}' +
    '.vs-lb-foot{text-align:center;margin-top:0.75rem}' +
    '.vs-lb-foot a{font-size:0.75rem;color:#666;text-decoration:none}' +
    '.vs-lb-foot a:hover{color:#ffc400}';

  var style = document.createElement('style');
  style.textContent = css;
  el.appendChild(style);

  // Loading state
  el.innerHTML += '<div class="vs-lb-empty">Loading scores...</div>';

  var url = BASE + encodeURIComponent(game) + '.json';

  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onload = function () {
    if (xhr.status !== 200) { render(null); return; }
    try { render(JSON.parse(xhr.responseText)); } catch (e) { render(null); }
  };
  xhr.onerror = function () { render(null); };
  xhr.send();

  function fmt(n) {
    return n >= 1000 ? n.toLocaleString() : '' + n;
  }

  function render(data) {
    var entries = (data && data.entries) ? data.entries.slice(0, limit) : [];
    var gameName = (data && data.game_name) ? data.game_name : game;

    var html = '<div class="vs-lb-hdr">' +
      '<span class="vs-lb-title">' + esc(gameName) + ' Leaderboard</span>' +
      '<a class="vs-lb-brand" href="https://vaultsparkstudios.com/leaderboards/" target="_blank" rel="noopener">VaultSpark</a>' +
      '</div>';

    if (entries.length === 0) {
      html += '<div class="vs-lb-empty">No scores recorded yet. Be the first!</div>';
    } else {
      html += '<ol class="vs-lb-list">';
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        var rc = i === 0 ? ' gold' : i === 1 ? ' silver' : i === 2 ? ' bronze' : '';
        html += '<li class="vs-lb-row">' +
          '<span class="vs-lb-rank' + rc + '">' + e.rank + '</span>' +
          '<div class="vs-lb-info"><div class="vs-lb-name">' + esc(e.username) + '</div>' +
          '<div class="vs-lb-rt">' + esc(e.rank_title || '') + '</div></div>' +
          '<span class="vs-lb-score">' + fmt(e.score) + '</span></li>';
      }
      html += '</ol>';
    }

    html += '<div class="vs-lb-foot"><a href="https://vaultsparkstudios.com/api/leaderboard/" target="_blank" rel="noopener">Powered by VaultSpark Leaderboard API</a></div>';

    // Keep the style tag, replace everything else
    var keep = el.querySelector('style');
    el.innerHTML = '';
    if (keep) el.appendChild(keep);
    el.insertAdjacentHTML('beforeend', html);
  }

  function esc(s) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
  }
})();
