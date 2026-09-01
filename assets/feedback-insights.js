/**
 * feedback-insights — public 7-day signal renderer for the Feedback insights block at /changelog/#requests (S335: folded in from /feedback/insights/).
 *
 * Reads:
 *   - page_feedback_signals view  (overall counts)
 *   - page_feedback_7d view       (per-page breakdown)
 *   - feedback_summaries          (most recent AI summary, if cron has fired)
 *
 * Soft-fails: if Supabase is unreachable, renders "no data yet" without errors.
 */
(function () {
  'use strict';

  function $(s) { return document.querySelector(s); }

  function fmt(n) {
    if (n == null) return '—';
    if (n === 0) return '0';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }

  function fmtPct(n) {
    if (n == null) return '—';
    return Math.round(Number(n)) + '%';
  }

  function setStat(key, value, sub) {
    var el = document.querySelector('[data-stat="' + key + '"]');
    if (el) el.textContent = value;
    if (sub != null) {
      var subEl = document.querySelector('[data-stat="' + key + '_count"]');
      if (subEl) subEl.textContent = sub;
    }
  }

  function shortPath(path) {
    if (!path || path === '/') return 'Home';
    return path.replace(/^\/|\/$/g, '').replace(/\//g, ' › ');
  }

  function renderEmpty(message) {
    var summaryBody = document.getElementById('insights-summary-body');
    if (summaryBody) {
      summaryBody.innerHTML = '<p style="margin:0;color:var(--text-muted,#889);">'
        + (message || 'Not enough signal yet — the dashboard fills in as visitors tap reactions on the rate-this-page widget.')
        + '</p>';
    }
    var tbody = document.querySelector('#insights-pages tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" class="insights-empty">' + (message || 'No data yet — first responses seed this view.') + '</td></tr>';
    setStat('total', '0');
    setStat('useful_pct', '—');
    setStat('returning_useful_pct', '—');
    setStat('mobile_pct', '—');
  }

  function renderSignals(signals) {
    if (!signals || signals.total_responses_7d === 0) return false;
    setStat('total', fmt(signals.total_responses_7d));
    setStat('useful_pct', fmtPct(signals.overall_useful_pct), fmt(signals.useful_total) + ' / ' + fmt(signals.total_responses_7d));
    setStat('returning_useful_pct', fmtPct(signals.returning_useful_pct));
    var mobilePct = signals.total_responses_7d
      ? Math.round((signals.mobile_responses / signals.total_responses_7d) * 100)
      : 0;
    setStat('mobile_pct', mobilePct + '%', fmt(signals.mobile_responses) + ' on mobile');
    return true;
  }

  function renderPages(rows) {
    var tbody = document.querySelector('#insights-pages tbody');
    if (!tbody) return;
    if (!rows || !rows.length) {
      tbody.innerHTML = '<tr><td colspan="3" class="insights-empty">No page-level signal yet.</td></tr>';
      return;
    }
    var html = rows.slice(0, 10).map(function (r) {
      var pct = Number(r.useful_pct || 0);
      return [
        '<tr>',
          '<td><span style="color:var(--text);">', shortPath(r.path), '</span></td>',
          '<td>',
            '<span class="insights-bar"><span class="insights-bar__fill" style="width:', pct, '%"></span></span>',
            fmtPct(pct),
          '</td>',
          '<td>', fmt(r.total), '</td>',
        '</tr>',
      ].join('');
    }).join('');
    tbody.innerHTML = html;
  }

  // Theme bucketing — roll per-page signal up into the parts of the studio
  // each page speaks to. Path-prefix → theme so the founder reads "is the
  // conversion funnel landing?" not "how did /membership/ do?". Pure client-side
  // from the same aggregate rows — no raw feedback, no extra query, public-safe.
  var THEMES = [
    { key: 'conversion', label: 'Conversion', test: function (p) { return /^\/(membership|join|invite|vaultsparked|pricing)/.test(p); } },
    { key: 'worlds',     label: 'Worlds',     test: function (p) { return /^\/(games|universe)/.test(p); } },
    { key: 'transparency', label: 'Transparency', test: function (p) { return /^\/(studio-pulse|oracle|ignis|studio|roadmap|changelog|journal|press)/.test(p); } },
    { key: 'trust',      label: 'Trust & legal', test: function (p) { return /^\/(privacy|terms|cookies|accessibility|data-deletion|security)/.test(p); } },
    { key: 'frontdoor',  label: 'Front door', test: function (p) { return p === '/' || p === ''; } },
  ];

  function themeFor(path) {
    var p = String(path || '/');
    for (var i = 0; i < THEMES.length; i += 1) if (THEMES[i].test(p)) return THEMES[i];
    return { key: 'other', label: 'Everything else' };
  }

  function sentimentBand(pct) {
    if (pct >= 70) return { tone: '#6ee7a8', word: 'Strong' };
    if (pct >= 45) return { tone: '#ffc400', word: 'Mixed' };
    return { tone: '#ff7676', word: 'Needs work' };
  }

  function renderThemes(rows) {
    var el = document.getElementById('insights-themes');
    if (!el) return;
    if (!rows || !rows.length) { el.style.display = 'none'; return; }
    var buckets = {};
    rows.forEach(function (r) {
      var t = themeFor(r.path);
      var b = buckets[t.key] || (buckets[t.key] = { label: t.label, total: 0, usefulWeighted: 0 });
      var total = Number(r.total || 0);
      var pct = Number(r.useful_pct || 0);
      b.total += total;
      b.usefulWeighted += pct * total; // responses-weighted so a 1-response page can't swing a theme
    });
    var cards = Object.keys(buckets).map(function (k) { return buckets[k]; })
      .filter(function (b) { return b.total > 0; })
      .sort(function (a, b) { return b.total - a.total; })
      .map(function (b) {
        var pct = b.total ? Math.round(b.usefulWeighted / b.total) : 0;
        var band = sentimentBand(pct);
        return '<div class="insights-theme-card" style="padding:0.9rem 1rem;border:1px solid rgba(255,255,255,0.07);border-radius:12px;background:rgba(255,255,255,0.02);">' +
          '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.45rem;">' +
            '<span style="width:8px;height:8px;border-radius:50%;background:' + band.tone + ';flex:0 0 auto;"></span>' +
            '<span style="font-size:0.72rem;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted,#a8b4d0);font-weight:600;">' + escape(b.label) + '</span>' +
          '</div>' +
          '<div style="font-size:1.5rem;font-weight:700;color:var(--text);">' + pct + '%<span style="font-size:0.8rem;font-weight:500;color:' + band.tone + ';margin-left:0.4rem;">' + band.word + '</span></div>' +
          '<div style="font-size:0.74rem;color:var(--dim,#6272a0);margin-top:0.2rem;">' + fmt(b.total) + ' response' + (b.total === 1 ? '' : 's') + '</div>' +
        '</div>';
      }).join('');
    if (!cards) { el.style.display = 'none'; return; }
    el.innerHTML = cards;
    el.style.display = '';
  }

  function renderSummary(latest) {
    var body = document.getElementById('insights-summary-body');
    if (!body) return;
    if (latest && latest.summary) {
      body.innerHTML = '<p style="margin:0;font-size:1.02rem;">' + escape(latest.summary) + '</p>'
        + '<p style="margin:0.5rem 0 0;font-size:0.72rem;color:var(--text-muted,#889);">Synthesized for the week of '
        + escape(latest.week_start) + ' · ' + fmt(latest.total_signals) + ' signals.</p>';
    } else {
      body.innerHTML = '<p style="margin:0;color:var(--text-muted,#889);">No summary yet — the studio reads the table below directly. Weekly summary refreshes Monday.</p>';
    }
  }

  function escape(t) {
    return String(t || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  async function load() {
    var sb = window.VSSupabase;
    if (!sb) { renderEmpty('Backend unavailable — try again later.'); return; }
    try {
      var [signalsRes, pagesRes, summaryRes] = await Promise.all([
        sb.from('page_feedback_signals').select('*').maybeSingle(),
        sb.from('page_feedback_7d').select('*').limit(20),
        sb.from('feedback_summaries').select('*').order('week_start', { ascending: false }).limit(1).maybeSingle(),
      ]);
      var hasData = renderSignals(signalsRes && signalsRes.data);
      renderPages(pagesRes && pagesRes.data || []);
      renderThemes(pagesRes && pagesRes.data || []);
      renderSummary(summaryRes && summaryRes.data);
      if (!hasData) renderEmpty();
    } catch (err) {
      console.warn('[feedback-insights] load failed', err);
      renderEmpty('Backend hiccup — try again later.');
    }
  }

  if (document.readyState !== 'loading') setTimeout(load, 0);
  else document.addEventListener('DOMContentLoaded', load);
})();
