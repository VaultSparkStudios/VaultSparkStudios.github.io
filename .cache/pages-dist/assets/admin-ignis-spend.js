/**
 * admin-ignis-spend — operator dashboard for IGNIS token spend.
 *
 * Reads:
 *   - ignis_spend_today view  (per-function spend + cap + status)
 *   - ignis_alerts table      (recent breaches + pause/resume audit)
 *
 * Auth: requires authenticated Supabase session with admin email allowlist.
 * Worker edge gate already protects /vault-member/admin/* but we double-check
 * client-side so unauthorized eyes see the gate, not a half-rendered table.
 *
 * Refresh: manual via "↻ Refresh" button. Auto-refresh every 60s while focused.
 */
(function () {
  'use strict';

  // Founder allowlist. Add any other operators here. The Worker edge gate is the
  // first line of defense; this is the second.
  const ADMIN_EMAILS = ['founder@vaultsparkstudios.com'];

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function fmtUsd(n) {
    return '$' + Number(n || 0).toFixed(2);
  }

  function statusClass(status) {
    if (status === 'capped') return 'capped';
    if (status === 'warn') return 'warn';
    if (status === 'disabled') return 'disabled';
    return 'ok';
  }

  function statusLabel(status) {
    if (status === 'ok') return 'ok';
    if (status === 'warn') return 'near cap';
    if (status === 'capped') return 'capped';
    if (status === 'disabled') return 'disabled';
    return status || '—';
  }

  function renderSummary(rows) {
    var total = rows.reduce(function (s, r) { return s + Number(r.usd_today || 0); }, 0);
    var cap   = rows.reduce(function (s, r) { return s + Number(r.cap_usd_daily || 0); }, 0);
    var pct   = cap ? Math.round((total / cap) * 100) : 0;
    var overall = rows.find(function (r) { return r.status === 'capped'; }) ? 'capped'
              : rows.find(function (r) { return r.status === 'warn'; })   ? 'warn'
              : 'ok';

    function setStat(key, value, klass) {
      var el = $('[data-stat="' + key + '"]');
      if (!el) return;
      el.textContent = value;
      el.classList.remove('spend-stat__value--ok','spend-stat__value--warn','spend-stat__value--capped');
      if (klass) el.classList.add('spend-stat__value--' + klass);
    }
    setStat('usd_today', fmtUsd(total));
    setStat('cap_usd', fmtUsd(cap));
    setStat('pct', pct + '%', overall === 'ok' ? 'ok' : overall === 'warn' ? 'warn' : 'capped');
    setStat('status', statusLabel(overall), overall === 'ok' ? 'ok' : overall === 'warn' ? 'warn' : 'capped');
  }

  function renderRows(rows) {
    var tbody = $('#spend-rows');
    if (!tbody) return;
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="spend-empty">No data yet — first IGNIS call seeds this.</td></tr>';
      return;
    }
    var html = rows.map(function (r) {
      var cls = statusClass(r.status);
      var pct = Number(r.pct_of_cap || 0);
      var pctCapped = Math.min(100, pct);
      return [
        '<tr>',
          '<td>', r.function_name, '</td>',
          '<td>', fmtUsd(r.usd_today), '</td>',
          '<td>', fmtUsd(r.cap_usd_daily), '</td>',
          '<td>', (r.calls_today || 0), '</td>',
          '<td>',
            pct, '%',
            '<div class="spend-bar"><div class="spend-bar__fill" style="width:', pctCapped, '%"></div></div>',
          '</td>',
          '<td><span class="spend-status spend-status--', cls, '">', statusLabel(r.status), '</span></td>',
        '</tr>',
      ].join('');
    }).join('');
    tbody.innerHTML = html;
  }

  function renderAlerts(alerts) {
    var box = $('#spend-alerts');
    if (!box) return;
    if (!alerts.length) {
      box.innerHTML = '<p class="spend-empty">No alerts in the last 7 days.</p>';
      return;
    }
    box.innerHTML = alerts.map(function (a) {
      var when = new Date(a.created_at).toLocaleString();
      var fn = a.function_name ? ' · ' + a.function_name : '';
      var amt = a.usd_at_alert != null ? ' · ' + fmtUsd(a.usd_at_alert) : '';
      return [
        '<div class="spend-alert-row">',
          '<strong>', a.alert_type, '</strong>', fn, amt,
          '<br><span>', (a.detail || ''), '</span>',
          ' <time>', when, '</time>',
        '</div>',
      ].join('');
    }).join('');
  }

  function showGate(message) {
    var shell = $('main.spend-shell');
    if (!shell) return;
    shell.innerHTML = [
      '<h1>IGNIS Spend</h1>',
      '<div class="spend-card">',
        '<p>', (message || 'You must be signed in as an operator.'), '</p>',
        '<p><a class="spend-btn" style="text-decoration:none;display:inline-flex;align-items:center;" href="/vault-member/?next=admin_ignis_spend">Sign in →</a></p>',
      '</div>',
    ].join('');
  }

  async function load() {
    var sb = window.VSSupabase || (window.supabase && window.supabase.createClient
      ? null
      : null);
    if (!sb) {
      // VSSupabase is exported in supabase-client.js; if it's not yet ready, retry.
      sb = window.VSSupabase || null;
    }
    if (!sb) {
      showGate('Supabase client unavailable. Reload the page.');
      return;
    }
    try {
      var auth = await sb.auth.getSession();
      var session = auth && auth.data && auth.data.session;
      if (!session || !session.user || ADMIN_EMAILS.indexOf((session.user.email || '').toLowerCase()) === -1) {
        showGate('Operator access required. Sign in with the founder email.');
        return;
      }

      var spendRes = await sb.from('ignis_spend_today').select('*');
      var alertCutoff = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
      var alertRes = await sb.from('ignis_alerts')
        .select('*')
        .gte('created_at', alertCutoff)
        .order('created_at', { ascending: false })
        .limit(20);

      if (spendRes.error) throw spendRes.error;
      renderSummary(spendRes.data || []);
      renderRows(spendRes.data || []);
      renderAlerts((alertRes && alertRes.data) || []);
    } catch (err) {
      console.error('[admin-ignis-spend] load failed', err);
      showGate('Could not load spend data: ' + (err.message || 'unknown error'));
    }
  }

  function bind() {
    var btn = $('#refresh-btn');
    if (btn) btn.addEventListener('click', function () { btn.disabled = true; load().finally(function () { btn.disabled = false; }); });
  }

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    // Wait one tick for VSSupabase to attach (supabase-client.js loads with defer too).
    setTimeout(function () { bind(); load(); }, 0);
    // Auto-refresh every 60s while tab is focused.
    var timer = null;
    function tick() { if (!document.hidden) load(); }
    document.addEventListener('visibilitychange', function () {
      clearInterval(timer);
      if (!document.hidden) timer = setInterval(tick, 60000);
    });
    timer = setInterval(tick, 60000);
  });
})();
