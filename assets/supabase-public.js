/**
 * VaultSpark Studios — Lightweight Public Supabase Client
 *
 * A ~1KB fetch-based alternative to the 74KB Supabase SDK for
 * public pages that only need anonymous read access (no auth, no RPCs).
 *
 * Usage (same as VSSupabase for select queries):
 *   const { data, count } = await VSPublic.from('vault_members')
 *     .select('username,points')
 *     .order('points', false)
 *     .limit(50)
 *     .get();
 *
 * Exposes: window.VSPublic
 */
(function (window) {
  'use strict';

  const URL  = 'https://fjnpzjjyhnpmunfoycrp.supabase.co';
  const KEY  = 'sb_publishable_thM93D_GVKW5qzAiZpNl1w_AVGILCij';
  const BASE = `${URL}/rest/v1`;

  function query(table) {
    const params = {};
    let _select  = '*';
    let _limit   = null;
    let _order   = null;
    let _count   = false;

    const q = {
      select(cols) { _select = cols; return q; },
      eq(col, val) { params[col] = `eq.${val}`; return q; },
      neq(col, val) { params[col] = `neq.${val}`; return q; },
      gte(col, val) { params[col] = `gte.${val}`; return q; },
      lte(col, val) { params[col] = `lte.${val}`; return q; },
      ilike(col, val) { params[col] = `ilike.${val}`; return q; },
      order(col, asc = true) { _order = `${col}.${asc ? 'asc' : 'desc'}`; return q; },
      limit(n) { _limit = n; return q; },
      count() { _count = true; return q; },
      async get() {
        const qs = new URLSearchParams({ select: _select, ...params });
        if (_order) qs.set('order', _order);
        if (_limit) qs.set('limit', _limit);

        const headers = { apikey: KEY, Accept: 'application/json' };
        if (_count) headers['Prefer'] = 'count=exact';
        const range = _limit ? `0-${_limit - 1}` : '0-0';
        if (_count) headers['Range'] = range;

        try {
          const res = await fetch(`${BASE}/${table}?${qs}`, { headers });
          const total = _count
            ? parseInt(res.headers.get('content-range')?.split('/')[1] || '0', 10)
            : null;
          if (!res.ok) return { data: null, count: total, error: res.status };
          const data = _count && !_select.includes(',') && _select !== '*'
            ? null
            : await res.json();
          return { data, count: total, error: null };
        } catch (e) {
          return { data: null, count: null, error: e.message };
        }
      },
      /** Shorthand: just get the count, no rows */
      async headCount() {
        const qs = new URLSearchParams({ select: 'id', ...params });
        const headers = { apikey: KEY, Prefer: 'count=exact', Range: '0-0' };
        try {
          const res = await fetch(`${BASE}/${table}?${qs}`, { headers });
          return parseInt(res.headers.get('content-range')?.split('/')[1] || '0', 10);
        } catch { return 0; }
      }
    };
    return q;
  }

  window.VSPublic = { from: (table) => query(table) };

})(window);
