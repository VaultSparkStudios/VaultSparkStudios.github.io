/* vault-kinesis.js — SVG ship-pulse waveform for /studio-pulse/.
 *
 * Reads commit-map.json + ship-receipts.json, renders a real-time
 * waveform strip that shows shipping cadence over the last 30 days.
 * Each bar = one commit; height = tone intensity; color = move type.
 * Mounted by ambient-loader when path starts with /studio-pulse.
 */
(function () {
  'use strict';

  var COMMIT_MAP_URL = '/api/commit-map.json';
  var SHIP_RECEIPTS_URL = '/api/ship-receipts.json';
  var MOUNT_ID = 'vs-vault-kinesis';
  var DAYS = 30;

  var TONE_HEIGHT = { sparked: 1.0, shipped: 0.75, tended: 0.35, muted: 0.2 };
  var MOVE_COLOR = {
    Shipped: '#3ecf8e',
    Sparked: '#ffc400',
    Tended: '#9b8cff',
    default: '#4a5580',
  };

  function colorFor(entry) {
    return MOVE_COLOR[entry.move] || (entry.type === 'feat' ? MOVE_COLOR.Shipped : MOVE_COLOR.default);
  }

  function heightFrac(entry) {
    var tone = String(entry.tone || '').toLowerCase();
    return TONE_HEIGHT[tone] !== undefined ? TONE_HEIGHT[tone] : 0.45;
  }

  function buildSVG(entries, receipts) {
    var now = Date.now();
    var cutoff = now - DAYS * 86400 * 1000;
    var recent = entries.filter(function (e) {
      var t = e && e.ts ? Date.parse(e.ts) : NaN;
      return isFinite(t) && t >= cutoff;
    });

    // Bucket into day slots
    var buckets = {};
    recent.forEach(function (e) {
      var day = Math.floor((Date.parse(e.ts) - cutoff) / 86400000);
      if (!buckets[day]) buckets[day] = [];
      buckets[day].push(e);
    });

    var W = 560, H = 72, PAD = 4;
    var barW = Math.floor((W - PAD) / DAYS) - 1;
    var bars = [];

    for (var d = 0; d < DAYS; d++) {
      var dayEntries = buckets[d] || [];
      var x = PAD + d * (barW + 1);
      if (!dayEntries.length) {
        bars.push('<rect x="' + x + '" y="' + (H - 4) + '" width="' + barW + '" height="4" fill="#1e2235" rx="2"/>');
        continue;
      }
      dayEntries.sort(function (a, b) { return heightFrac(b) - heightFrac(a); });
      var top = dayEntries[0];
      var frac = heightFrac(top);
      var bh = Math.max(6, Math.round(frac * (H - 8)));
      var by = H - bh;
      var fill = colorFor(top);
      var title = '<title>' + (top.summary || top.move || '') + '</title>';
      bars.push('<rect x="' + x + '" y="' + by + '" width="' + barW + '" height="' + bh + '" fill="' + fill + '" rx="2" opacity="0.9">' + title + '</rect>');
    }

    // Receipt theme strip at top (1 dot per receipt)
    var dots = (receipts || []).slice(0, 5).map(function (r, i) {
      return '<circle cx="' + (W - 10 - i * 14) + '" cy="7" r="4" fill="#9b8cff" opacity="0.7"><title>' + (r.label || r.theme || '') + '</title></circle>';
    }).join('');

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="VaultSpark ship pulse — last 30 days">'
      + '<rect width="' + W + '" height="' + H + '" fill="none"/>'
      + bars.join('')
      + dots
      + '</svg>';
  }

  function ensureStyles() {
    if (document.getElementById('vs-kinesis-style')) return;
    var s = document.createElement('style');
    s.id = 'vs-kinesis-style';
    s.textContent = '.vs-kinesis{margin:2.2rem 0;padding:1.2rem 1.4rem;border-radius:16px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.07)}.vs-kinesis__header{display:flex;align-items:center;justify-content:space-between;margin-bottom:.85rem}.vs-kinesis__title{font-size:.82rem;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:var(--muted,#a8b4d0)}.vs-kinesis__legend{display:flex;gap:.7rem;font-size:.74rem;color:var(--dim,#6272a0)}.vs-kinesis__leg{display:flex;align-items:center;gap:.3rem}.vs-kinesis__dot{width:8px;height:8px;border-radius:2px;flex-shrink:0}.vs-kinesis svg{width:100%;height:auto;display:block}';
    document.head.appendChild(s);
  }

  function mount(container) {
    ensureStyles();
    container.className = 'vs-kinesis';
    container.innerHTML = '<div class="vs-kinesis__header"><span class="vs-kinesis__title">Ship Pulse · 30d</span><span class="vs-kinesis__legend"><span class="vs-kinesis__leg"><span class="vs-kinesis__dot" style="background:#3ecf8e"></span>shipped</span><span class="vs-kinesis__leg"><span class="vs-kinesis__dot" style="background:#ffc400"></span>sparked</span><span class="vs-kinesis__leg"><span class="vs-kinesis__dot" style="background:#9b8cff"></span>tended</span></span></div><div class="vs-kinesis__svg"></div>';
    var svgWrap = container.querySelector('.vs-kinesis__svg');

    Promise.all([
      fetch(COMMIT_MAP_URL, { credentials: 'omit' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch(SHIP_RECEIPTS_URL, { credentials: 'omit' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
    ]).then(function (results) {
      var commitMap = results[0];
      var receiptsData = results[1];
      var entries = (commitMap && Array.isArray(commitMap.entries)) ? commitMap.entries : [];
      var receipts = (receiptsData && Array.isArray(receiptsData.receipts)) ? receiptsData.receipts : [];
      if (!entries.length) { svgWrap.textContent = 'No ship data yet.'; return; }
      svgWrap.innerHTML = buildSVG(entries, receipts);
    });
  }

  function boot() {
    var el = document.getElementById(MOUNT_ID);
    if (!el) {
      // Auto-create below the first <section> on /studio-pulse/
      var section = document.querySelector('main > section, main .container');
      if (!section) return;
      var wrap = document.createElement('div');
      wrap.id = MOUNT_ID;
      section.insertAdjacentElement('afterend', wrap) || section.appendChild(wrap);
      el = wrap;
    }
    mount(el);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
