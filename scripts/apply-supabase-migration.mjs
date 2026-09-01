#!/usr/bin/env node
/**
 * apply-supabase-migration.mjs — agent-deployed Supabase migrations (CANON-040).
 *
 * Generalises the pattern proven in verify-supabase-runtime.mjs: resolve the
 * management token through the secrets gateway (CANON-012), capture a
 * pre-image of every policy / function / view the migration touches into
 * .cache/, apply the SQL through the management API's database/query route
 * (one implicit transaction), then run a named read-only probe that proves
 * the intended behaviour rather than assuming it.
 *
 * Modes:
 *   --migration <path> --dry-run      parse + pre-image only, no apply
 *   --migration <path> --apply        pre-image → apply → (optional) probe
 *   --migration <path> --probe <name> run a registered probe only
 *   --self-test                       pure-function tests, no network
 *
 * Probes (read-only or no-op writes only):
 *   member-write-lockdown   proves phase61: points not client-writable,
 *                           profile columns still writable, gift_points
 *                           rejects self / out-of-range, view honours opt-out.
 *
 * Never prints a raw secret. Never touches a sibling repo.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANAGEMENT_BASE = 'https://api.supabase.com/v1';
const PROJECT_REF = 'fjnpzjjyhnpmunfoycrp'; // pinned: part of the public project contract
const TIMEOUT_MS = 30_000;

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };

/* ------------------------------------------------------------------ *
 * Pure helpers — self-tested.
 * ------------------------------------------------------------------ */

/** Names of objects a migration touches, so the pre-image can be scoped. */
export function touchedObjects(sql) {
  const out = { tables: new Set(), functions: new Set(), views: new Set(), policies: [] };
  const re = {
    table: /\bon\s+(?:public\.)?([a-z_][a-z0-9_]*)/gi,
    fn: /\bfunction\s+(?:public\.)?([a-z_][a-z0-9_]*)\s*\(/gi,
    view: /\bview\s+(?:public\.)?([a-z_][a-z0-9_]*)/gi,
    policy: /\bpolicy\s+(?:if\s+exists\s+)?"([^"]+)"\s+on\s+(?:public\.)?([a-z_][a-z0-9_]*)/gi,
  };
  let m;
  while ((m = re.table.exec(sql))) out.tables.add(m[1]);
  while ((m = re.fn.exec(sql))) out.functions.add(m[1]);
  while ((m = re.view.exec(sql))) out.views.add(m[1]);
  while ((m = re.policy.exec(sql))) out.policies.push({ name: m[1], table: m[2] });
  return {
    tables: [...out.tables].sort(),
    functions: [...out.functions].sort(),
    views: [...out.views].sort(),
    policies: out.policies,
  };
}

export function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

/** Catalog query that returns the current definition of every touched object. */
export function preImageSql(touched) {
  const parts = [];
  for (const fn of touched.functions) {
    parts.push(`select ${sqlLiteral('function:' + fn)} as name, pg_get_functiondef(p.oid) as sql
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = ${sqlLiteral(fn)}`);
  }
  for (const t of touched.tables) {
    parts.push(`select ${sqlLiteral('policies:' + t)} as name,
      string_agg(format('%s | cmd=%s | roles=%s | using=%s | check=%s', pol.polname, pol.polcmd,
        array_to_string(array(select rolname from pg_roles where oid = any(pol.polroles)), ','),
        coalesce(pg_get_expr(pol.polqual, pol.polrelid), ''), coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '')), E'\\n') as sql
      from pg_policy pol join pg_class c on c.oid = pol.polrelid
     where c.relname = ${sqlLiteral(t)}`);
    parts.push(`select ${sqlLiteral('grants:' + t)} as name,
      string_agg(format('%s %s %s', grantee, privilege_type, coalesce(column_name, '*')), E'\\n' order by grantee, privilege_type, column_name) as sql
      from (
        select grantee, privilege_type, null::text as column_name from information_schema.role_table_grants
         where table_schema = 'public' and table_name = ${sqlLiteral(t)}
        union all
        select grantee, privilege_type, column_name from information_schema.role_column_grants
         where table_schema = 'public' and table_name = ${sqlLiteral(t)}
      ) g`);
  }
  for (const v of touched.views) {
    // Joined through pg_class so an absent view yields no row instead of a
    // regclass cast error before the WHERE clause can guard it.
    parts.push(`select ${sqlLiteral('view:' + v)} as name, pg_get_viewdef(c.oid, true) as sql
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'v' and c.relname = ${sqlLiteral(v)}`);
  }
  return parts.join('\nunion all\n');
}

/** Impersonate a subject for the statements that follow (transaction-local). */
export function asSubject(uid, role = 'authenticated') {
  return `set local role ${role}; select set_config('request.jwt.claims', ${sqlLiteral(JSON.stringify({ sub: uid, role }))}, true);`;
}

export function classifyProbe(results) {
  const failures = results.filter((r) => !r.pass).map((r) => r.name);
  return { pass: failures.length === 0, failures, checks: results.length };
}

/* ------------------------------------------------------------------ *
 * Management client (same shape as verify-supabase-runtime.mjs).
 * ------------------------------------------------------------------ */

async function managementToken() {
  const { getSecret } = await import('./lib/secrets.mjs');
  const token = await getSecret('SUPABASE_ACCESS_TOKEN', 'supabase.management-api');
  if (!token) throw new Error('SUPABASE_ACCESS_TOKEN unavailable through the secrets gateway');
  return token;
}

function makeClient(token, ref) {
  return {
    async sql(query) {
      const response = await fetch(`${MANAGEMENT_BASE}/projects/${ref}/database/query`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const text = await response.text();
      if (!response.ok) {
        const err = new Error(`sql ${response.status}: ${text.slice(0, 400)}`);
        err.status = response.status;
        err.body = text;
        throw err;
      }
      try { return JSON.parse(text); } catch { return []; }
    },
  };
}

async function capturePreImage(client, migrationRel, touched) {
  const rows = await client.sql(preImageSql(touched));
  const stamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);
  const dir = path.join(ROOT, '.cache');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `supabase-preimage-${stamp}.sql`);
  const body = rows.map((r) => `-- ===== ${r.name}\n${r.sql || '-- (absent)'}\n`).join('\n');
  fs.writeFileSync(file, `-- Pre-image captured before ${migrationRel}\n-- ${new Date().toISOString()}\n\n${body}`, 'utf8');
  return { file: path.relative(ROOT, file), sha256: crypto.createHash('sha256').update(body).digest('hex'), objects: rows.length };
}

/* ------------------------------------------------------------------ *
 * Probes — read-only, or writes that are provably no-ops.
 * ------------------------------------------------------------------ */

const PROBES = {
  async 'member-write-lockdown'(client) {
    const results = [];
    const [member] = await client.sql(`select id, username from vault_members where public_profile = true order by created_at asc limit 1`);
    if (!member) throw new Error('probe needs at least one opted-in member row');

    // 1. points must NOT be client-writable (expect permission denied; the
    //    failing statement aborts the request, so nothing persists).
    let pointsDenied = false, pointsDetail = '';
    try {
      await client.sql(`${asSubject(member.id)} update vault_members set points = points where id = ${sqlLiteral(member.id)};`);
    } catch (e) {
      pointsDenied = /permission denied|42501/i.test(e.body || e.message);
      pointsDetail = (e.body || e.message).slice(0, 160);
    }
    results.push({ name: 'points not client-writable', pass: pointsDenied, detail: pointsDetail || 'update succeeded (still writable)' });

    // 2. a profile column must still be writable (no-op write, same value).
    let prefsOk = false, prefsDetail = '';
    try {
      const rows = await client.sql(`${asSubject(member.id)} update vault_members set prefs = prefs where id = ${sqlLiteral(member.id)} returning id;`);
      prefsOk = Array.isArray(rows) && rows.length === 1;
      prefsDetail = `returned ${Array.isArray(rows) ? rows.length : 0} row(s)`;
    } catch (e) { prefsDetail = (e.body || e.message).slice(0, 160); }
    results.push({ name: 'prefs still writable by owner', pass: prefsOk, detail: prefsDetail });

    // 3. gift_points guards (no rows move on any of these).
    const guards = await client.sql(`${asSubject(member.id)}
      select gift_points(${sqlLiteral(member.username)}, 50) as self_gift,
             gift_points('__no_such_member_s335__', 50) as missing,
             gift_points(${sqlLiteral(member.username)}, 5) as too_small;`);
    const g = guards[0] || {};
    const val = (x) => (typeof x === 'string' ? JSON.parse(x) : x) || {};
    results.push({ name: 'gift_points rejects self-gift', pass: val(g.self_gift).error === 'self_gift', detail: JSON.stringify(g.self_gift) });
    results.push({ name: 'gift_points rejects unknown recipient', pass: val(g.missing).error === 'recipient_not_found', detail: JSON.stringify(g.missing) });
    results.push({ name: 'gift_points rejects out-of-range amount', pass: val(g.too_small).error === 'amount_out_of_range', detail: JSON.stringify(g.too_small) });

    // 4. anon cannot call gift_points at all.
    let anonDenied = false, anonDetail = '';
    try {
      await client.sql(`set local role anon; select gift_points('x', 50);`);
      anonDetail = 'call succeeded as anon';
    } catch (e) { anonDenied = /permission denied|42501/i.test(e.body || e.message); anonDetail = (e.body || e.message).slice(0, 160); }
    results.push({ name: 'gift_points not executable by anon', pass: anonDenied, detail: anonDetail });

    // 5. the public view honours the opt-out.
    const [counts] = await client.sql(`select
      (select count(*) from public_leaderboard) as via_view,
      (select count(*) from vault_members where public_profile = true) as opted_in,
      (select count(*) from vault_members) as total;`);
    results.push({ name: 'public_leaderboard equals opted-in set', pass: Number(counts.via_view) === Number(counts.opted_in), detail: JSON.stringify(counts) });

    // 6. anon can read the view, and the view returns rows (the base table
    //    under RLS may return zero rows to anon — that is reported, not judged).
    let anonViewOk = false, anonViewDetail = '';
    try {
      const rows = await client.sql(`set local role anon; select (select count(*) from public_leaderboard) as via_view, (select count(*) from vault_members) as base_table_visible_to_anon;`);
      anonViewOk = Array.isArray(rows) && rows.length === 1 && Number(rows[0].via_view) === Number(counts.opted_in);
      anonViewDetail = JSON.stringify(rows[0]);
    } catch (e) { anonViewDetail = (e.body || e.message).slice(0, 160); }
    results.push({ name: 'anon reads full opted-in set through public_leaderboard', pass: anonViewOk, detail: anonViewDetail });

    // 7. anon cannot insert or delete member rows (grant-level, independent of RLS).
    let anonWriteDenied = false, anonWriteDetail = '';
    try {
      await client.sql(`set local role anon; delete from vault_members where false;`);
      anonWriteDetail = 'delete statement accepted for anon';
    } catch (e) { anonWriteDenied = /permission denied|42501/i.test(e.body || e.message); anonWriteDetail = (e.body || e.message).slice(0, 160); }
    results.push({ name: 'anon has no DELETE grant on vault_members', pass: anonWriteDenied, detail: anonWriteDetail });

    return results;
  },
};

/* ------------------------------------------------------------------ *
 * Self-test.
 * ------------------------------------------------------------------ */

function selfTest() {
  const sql = `drop policy if exists "update own member record" on public.vault_members;
create policy "update own member record" on public.vault_members for update to authenticated using (auth.uid() = id);
create or replace function public.gift_points(p_recipient_username text, p_amount integer) returns jsonb as $$ begin end $$;
create or replace view public.public_leaderboard with (security_invoker = false) as select 1;`;
  const t = touchedObjects(sql);
  const checks = [
    ['tables', t.tables.join(',') === 'vault_members'],
    ['functions', t.functions.join(',') === 'gift_points'],
    ['views', t.views.join(',') === 'public_leaderboard'],
    ['policies', t.policies.length === 2 && t.policies[0].name === 'update own member record'],
    ['pre-image covers functions', preImageSql(t).includes("proname = 'gift_points'")],
    ['pre-image covers column grants', preImageSql(t).includes('role_column_grants')],
    ['pre-image covers views', preImageSql(t).includes("c.relname = 'public_leaderboard'")],
    ['sqlLiteral escapes quotes', sqlLiteral("o'k") === "'o''k'"],
    ['asSubject sets role + claims', asSubject('abc').includes('set local role authenticated') && asSubject('abc').includes('"sub":"abc"')],
    ['classifyProbe pass', classifyProbe([{ name: 'a', pass: true }]).pass === true],
    ['classifyProbe fail names', classifyProbe([{ name: 'a', pass: false }]).failures.join() === 'a'],
    ['probe registry has member-write-lockdown', typeof PROBES['member-write-lockdown'] === 'function'],
  ];
  let failed = 0;
  for (const [name, ok] of checks) { console.log(`${ok ? '✓' : '✗'} ${name}`); if (!ok) failed++; }
  console.log(`apply-supabase-migration --self-test: ${checks.length - failed}/${checks.length} passed`);
  process.exit(failed ? 1 : 0);
}

/* ------------------------------------------------------------------ *
 * Main.
 * ------------------------------------------------------------------ */

async function main() {
  if (flag('--self-test')) return selfTest();
  const migrationRel = opt('--migration');
  const probeName = opt('--probe');
  if (!migrationRel && !probeName) {
    console.error('usage: --migration <path> (--dry-run | --apply) [--probe <name>] | --probe <name> | --self-test');
    process.exit(2);
  }
  const token = await managementToken();
  const client = makeClient(token, PROJECT_REF);
  const report = { migration: migrationRel || null, ref: PROJECT_REF, at: new Date().toISOString() };

  if (migrationRel) {
    const abs = path.resolve(ROOT, migrationRel);
    const sql = fs.readFileSync(abs, 'utf8');
    const touched = touchedObjects(sql);
    report.touched = touched;
    report.migrationSha256 = crypto.createHash('sha256').update(sql).digest('hex');
    report.preImage = await capturePreImage(client, migrationRel, touched);
    console.log(`pre-image: ${report.preImage.file} (${report.preImage.objects} object(s), sha ${report.preImage.sha256.slice(0, 12)})`);
    if (flag('--apply')) {
      await client.sql(sql);
      report.applied = true;
      console.log(`applied: ${migrationRel} (sha ${report.migrationSha256.slice(0, 12)})`);
      report.postImage = await capturePreImage(client, migrationRel + ' (post)', touched);
      console.log(`post-image: ${report.postImage.file}`);
    } else {
      report.applied = false;
      console.log('dry-run: migration parsed and pre-image captured; nothing applied');
    }
  }

  if (probeName) {
    const probe = PROBES[probeName];
    if (!probe) throw new Error(`unknown probe: ${probeName}`);
    const results = await probe(client);
    for (const r of results) console.log(`${r.pass ? '✓' : '✗'} ${r.name} — ${r.detail}`);
    report.probe = { name: probeName, ...classifyProbe(results), results };
    console.log(`probe ${probeName}: ${report.probe.checks - report.probe.failures.length}/${report.probe.checks} passed`);
  }

  const out = path.join(ROOT, '.cache', 'supabase-migration-last.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
  if (report.probe && !report.probe.pass) process.exit(1);
}

main().catch((e) => { console.error(`apply-supabase-migration: ${e.message}`); process.exit(1); });
