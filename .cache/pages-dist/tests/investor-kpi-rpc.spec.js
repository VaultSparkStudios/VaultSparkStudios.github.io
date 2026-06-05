// tests/investor-kpi-rpc.spec.js (S136 carry)
// Integration tests for the S136 migration RPCs:
//   - write_investor_kpi_snapshot()   — service-role-only writer
//   - get_investor_kpi_series(days)   — authenticated read of last N days
//
// Runs against live Supabase via the Management API using the SBP token
// supplied as SUPABASE_ACCESS_TOKEN. Skip if the token isn't available
// (CI matrix may run on a clone where the secret isn't injected).
//
// Safe to run repeatedly — write_investor_kpi_snapshot() uses ON CONFLICT
// (snapshot_date) DO UPDATE so it's idempotent on the same UTC day.
const { test, expect, request } = require('@playwright/test');

const SBP        = process.env.SUPABASE_ACCESS_TOKEN || '';
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'fjnpzjjyhnpmunfoycrp';
const MGMT_URL   = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

async function runSql(api, query) {
  const res = await api.post(MGMT_URL, {
    headers: { Authorization: `Bearer ${SBP}`, 'Content-Type': 'application/json' },
    data: { query },
    timeout: 30000,
  });
  expect(res.status(), `SQL failed: ${query.slice(0, 80)}...`).toBeGreaterThanOrEqual(200);
  expect(res.status()).toBeLessThan(300);
  return res.json();
}

test.describe('Investor KPI snapshot RPCs (S136 migration)', () => {
  test.skip(!SBP, 'Skipping — SUPABASE_ACCESS_TOKEN not set in env');

  test('investor_kpi_snapshots table exists with expected columns', async ({ request: api }) => {
    const rows = await runSql(api,
      `select column_name from information_schema.columns
       where table_schema='public' and table_name='investor_kpi_snapshots'
       order by ordinal_position`);
    const cols = rows.map((r) => r.column_name);
    for (const expected of [
      'snapshot_date', 'members_total', 'members_new_7d', 'sessions_7d',
      'challenges_open', 'achievements_unlocked_7d', 'vaultsparked_total',
      'created_at',
    ]) {
      expect(cols, `column ${expected} missing`).toContain(expected);
    }
  });

  test('write_investor_kpi_snapshot() inserts/updates today\'s row', async ({ request: api }) => {
    // Call writer
    await runSql(api, `select public.write_investor_kpi_snapshot()`);
    // Verify today's row exists
    const rows = await runSql(api,
      `select snapshot_date, members_total, members_new_7d, sessions_7d,
              challenges_open, vaultsparked_total
       from public.investor_kpi_snapshots
       where snapshot_date = current_date`);
    expect(rows.length).toBe(1);
    const row = rows[0];
    expect(row.snapshot_date).toBe(new Date().toISOString().slice(0, 10));
    expect(typeof row.members_total).toBe('number');
    expect(row.members_total).toBeGreaterThanOrEqual(0);
    expect(row.challenges_open).toBeGreaterThanOrEqual(0);
    expect(row.vaultsparked_total).toBeGreaterThanOrEqual(0);
  });

  test('write_investor_kpi_snapshot() is idempotent (UPSERT on date)', async ({ request: api }) => {
    // Call twice; second call should update, not duplicate
    await runSql(api, `select public.write_investor_kpi_snapshot()`);
    const before = await runSql(api,
      `select count(*) as c from public.investor_kpi_snapshots where snapshot_date = current_date`);
    expect(before[0].c).toBe(1);

    await runSql(api, `select public.write_investor_kpi_snapshot()`);
    const after = await runSql(api,
      `select count(*) as c from public.investor_kpi_snapshots where snapshot_date = current_date`);
    expect(after[0].c).toBe(1);                        // still one row, not two
  });

  test('get_investor_kpi_series(N) returns N or fewer rows ordered ascending', async ({ request: api }) => {
    // Ensure at least one row exists
    await runSql(api, `select public.write_investor_kpi_snapshot()`);
    // Query the helper RPC
    const rows = await runSql(api, `select * from public.get_investor_kpi_series(30)`);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeLessThanOrEqual(30);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    // Ordered ascending by snapshot_date
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].snapshot_date >= rows[i - 1].snapshot_date).toBe(true);
    }
  });

  test('investor_messages has founder_reply* columns from S136 migration', async ({ request: api }) => {
    const rows = await runSql(api,
      `select column_name from information_schema.columns
       where table_schema='public' and table_name='investor_messages'
         and column_name in ('founder_reply','founder_replied_at','founder_replied_by')
       order by column_name`);
    const cols = rows.map((r) => r.column_name);
    expect(cols).toEqual(['founder_replied_at', 'founder_replied_by', 'founder_reply']);
  });

  test('investor_message_thread view exists + exposes status column', async ({ request: api }) => {
    const rows = await runSql(api,
      `select column_name from information_schema.columns
       where table_schema='public' and table_name='investor_message_thread'
       order by ordinal_position`);
    const cols = rows.map((r) => r.column_name);
    expect(cols.length).toBeGreaterThan(0);
    expect(cols).toContain('status');
    expect(cols).toContain('founder_reply');
    expect(cols).toContain('body');                    // alias of m.message
    expect(cols).toContain('category');                // alias of m.priority
  });

  test('investor_message_thread.status is one of replied/awaiting/in_review', async ({ request: api }) => {
    const rows = await runSql(api,
      `select distinct status from public.investor_message_thread`);
    for (const r of rows) {
      expect(['replied', 'awaiting', 'in_review']).toContain(r.status);
    }
  });
});
