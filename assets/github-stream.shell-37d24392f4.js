/* github-stream.js — fetch recent commits from a GitHub repo
   Usage: <div id="github-stream" data-repo="VaultSparkStudios/solara"></div> */
(function () {
  var el = document.getElementById('github-stream');
  if (!el) return;
  var repo = el.getAttribute('data-repo');
  if (!repo) return;

  fetch('https://api.github.com/repos/' + repo + '/commits?per_page=5')
    .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
    .then(function (commits) {
      if (!Array.isArray(commits) || !commits.length) throw new Error();
      var now = Date.now();
      el.innerHTML = commits.map(function (c) {
        var msg = (c.commit.message.split('\n')[0] || '').slice(0, 80);
        var diff = Math.floor((now - new Date(c.commit.author.date)) / 86400000);
        var rel = diff === 0 ? 'today' : diff === 1 ? 'yesterday' : diff + ' days ago';
        return '<div class="stream-item"><span class="stream-msg">' + msg + '</span><span class="stream-date">' + rel + '</span></div>';
      }).join('');
    })
    .catch(function () {
      el.innerHTML = '<a class="stream-fallback" href="https://github.com/' + repo + '" target="_blank" rel="noreferrer">View on GitHub \u2192</a>';
    });
})();
