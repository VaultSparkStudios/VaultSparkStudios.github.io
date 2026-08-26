#!/usr/bin/env node
/**
 * Live verifier — and, on explicit confirmation, deployer — for the two Supabase
 * runtime updates that `api/identity-migration-receipt.json` depends on.
 *
 * Why this exists
 * ---------------
 * `context/IDENTITY_MIGRATION_EVIDENCE.json` used to be hand-authored. Its
 * `deployed` / `verification` fields flowed straight into a PUBLIC receipt, so
 * two production blockers could be cleared by editing prose. This script is the
 * only supported writer of those fields, and it writes them exclusively from
 * facts it re-read from the provider after the write. There is no flag that
 * asserts success without observing it.
 *
 * What "verified" means here, stated precisely
 * --------------------------------------------
 * Migration — three independent layers, all required:
 *   1. catalog shape : every entitlement object names the wide plan set and
 *                      retains no narrow `= 'vault_sparked'` equality.
 *   2. positive behaviour : the real active `vault_sparked_pro` subscriber is
 *                      impersonated inside a read-only transaction and must be
 *                      UNLOCKED on every `required_plan = 'vault_sparked'` row.
 *   3. negative controls : an anonymous caller must receive zero rows, and a
 *                      free-plan member must remain LOCKED on the same rows.
 *                      Without (3) a permanently-true probe would read as a fix.
 *
 * Edge function — the deployed artifact is an ESZIP of TRANSPILED source, so
 * byte equality against the .ts is impossible by construction. This asserts the
 * strongest available substitute and says so in the receipt: the deployed
 * version strictly increased, every transpile-surviving marker derived from the
 * local source is present in the deployed bundle, the gateway `verify_jwt`
 * posture still matches `supabase/config.toml`, and the live endpoint answers.
 *
 * Usage:
 *   node scripts/verify-supabase-runtime.mjs --self-test
 *   node scripts/verify-supabase-runtime.mjs --plan
 *   node scripts/verify-supabase-runtime.mjs --apply --confirm
 *   node scripts/verify-supabase-runtime.mjs --verify --write-evidence
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EVIDENCE_PATH = path.join(ROOT, 'context', 'IDENTITY_MIGRATION_EVIDENCE.json');
const MIGRATION_PATH = 'supabase/migrations/20260723_fix_classified_archive_entitlements.sql';
const FUNCTION_PATH = 'supabase/functions/eternal-intelligence/index.ts';
const FUNCTION_SHARED_PATH = 'supabase/functions/_shared/membershipAccess.ts';
const FUNCTION_TOKEN_METER_PATH = 'supabase/functions/_shared/tokenMeter.ts';
const FUNCTION_SLUG = 'eternal-intelligence';
const CONFIG_PATH = 'supabase/config.toml';
const DEFAULT_PROJECT_REF = 'fjnpzjjyhnpmunfoycrp';
const MANAGEMENT_BASE = 'https://api.supabase.com/v1';
const TIMEOUT_MS = 20_000;

/* ------------------------------------------------------------------ *
 * Pure derivation — no network, no filesystem. All of this is self-tested.
 * ------------------------------------------------------------------ */

/**
 * True when SQL text still carries the pre-migration narrow entitlement check.
 *
 * The operand matters. `f.required_plan = 'vault_sparked'` is the FILE's
 * requirement and is correct both before and after the migration — it is what
 * the member's plan is compared against. The narrow check is on the MEMBER's
 * plan (`v_plan`, `v_member_plan`, `s.plan`), which the migration widens to
 * `in ('vault_sparked', 'vault_sparked_pro')` / `= ANY (ARRAY[...])`. Matching
 * any `= 'vault_sparked'` would flag a correctly migrated body as unmigrated,
 * so the left operand is enumerated and `required_plan` is excluded by the
 * lookbehind on `_`.
 */
const NARROW_PLAN_EQUALITY = /(?<![_\w])(?:v_plan|v_member_plan|plan)\s*=\s*'vault_sparked'(?!_)/;

export function hasNarrowPlanEquality(sqlText) {
  return NARROW_PLAN_EQUALITY.test(String(sqlText || ''));
}

export function namesEternalPlan(sqlText) {
  return /'vault_sparked_pro'/.test(String(sqlText || ''));
}

/** Classify one entitlement-bearing SQL object against the migration's intent. */
export function classifyEntitlementObject(name, sqlText) {
  const present = typeof sqlText === 'string' && sqlText.length > 0;
  if (!present) return { name, state: 'absent', reason: 'object not found in catalog' };
  const wide = namesEternalPlan(sqlText);
  const narrow = hasNarrowPlanEquality(sqlText);
  if (wide && !narrow) return { name, state: 'applied' };
  if (!wide && narrow) return { name, state: 'not-applied', reason: 'narrow vault_sparked equality retained' };
  return { name, state: 'partial', reason: `wide=${wide} narrow=${narrow}` };
}

/**
 * Fold catalog shape + behaviour into one verdict. Behaviour is authoritative:
 * shape can look right while a stale plan cache or a second overloaded function
 * still serves the old answer, so a shape-pass with a behaviour-fail is a fail.
 */
export function classifyMigration({ objects, behaviour }) {
  const findings = Object.entries(objects || {}).map(([name, sql]) => classifyEntitlementObject(name, sql));
  const shapeApplied = findings.length > 0 && findings.every((f) => f.state === 'applied');
  const b = behaviour || {};
  const ran = b.ran === true;

  // null = could not be observed. A control that did not run must never be
  // folded in as a pass — an absent negative control is the whole reason an
  // over-granting migration would slip through.
  const checks = ran ? [
    { name: 'rpc-executes-without-error', ok: (b.errors || []).length === 0 },
    { name: 'anonymous-sees-nothing', ok: b.anonymousRowCount === 0 },
    { name: 'eternal-plan-unlocked', ok: b.eternalPlanUnlocked ?? null },
    { name: 'free-plan-still-locked', ok: b.freePlanLocked ?? null },
  ] : [
    { name: 'rpc-executes-without-error', ok: null },
    { name: 'anonymous-sees-nothing', ok: null },
    { name: 'eternal-plan-unlocked', ok: null },
    { name: 'free-plan-still-locked', ok: null },
  ];

  const anyFailed = checks.some((c) => c.ok === false);
  const unobserved = checks.filter((c) => c.ok === null).map((c) => c.name);

  // Coverage rule. The two always-observable checks (the RPC runs; an anonymous
  // caller gets nothing) must pass outright. The plan dimension has two probes
  // pointing in opposite directions, and it counts as covered when EITHER
  // direction was observed non-vacuously:
  //   · positive — an Eternal member is admitted, or
  //   · negative — a rank-eligible free member is still denied, which proves the
  //     plan predicate is live and discriminating rather than always-true.
  // If neither direction could be exercised, nothing about plan was measured and
  // the verdict stays unverified. Partial coverage is published, never buried:
  // a pass that rests on one direction says which direction it rests on.
  const planPositive = checks.find((c) => c.name === 'eternal-plan-unlocked')?.ok ?? null;
  const planNegative = checks.find((c) => c.name === 'free-plan-still-locked')?.ok ?? null;
  const planDimensionCovered = planPositive === true || planNegative === true;
  const coverage = planPositive === true && planNegative === true ? 'complete' : 'partial';

  let state;
  if (!shapeApplied) state = anyFailed || findings.every((f) => f.state !== 'applied') ? 'not-applied' : 'partial';
  else if (anyFailed) state = 'behaviour-failed';
  else if (!ran) state = 'shape-only-unverified';
  else if (planDimensionCovered) state = coverage === 'complete' ? 'verified' : 'verified-partial-coverage';
  else state = 'shape-only-unverified';

  const passed = state === 'verified' || state === 'verified-partial-coverage';
  return {
    state,
    deployed: passed,
    verification: passed ? 'passed' : state === 'shape-only-unverified' ? 'unverified' : 'failed',
    coverage: passed ? coverage : 'none',
    unobserved,
    findings,
    behaviour: checks,
    providerErrors: b.errors || [],
    observability: b.observability || null,
  };
}

/**
 * Deterministic marker set: string literals in the local source that survive
 * TypeScript → JavaScript transpilation unchanged, so they must appear verbatim
 * inside the deployed ESZIP. Sorted + deduped so the set is reproducible.
 */
export function deriveFunctionMarkers(source, { limit = 64, minLength = 12 } = {}) {
  // Tokenise EVERY quoted literal left to right, then filter by length. A
  // length-filtered regex would skip short literals and pair the closing quote
  // of one with the opening quote of the next — `'GET' && x !== 'POST'` yields
  // the phantom marker " && x !== ". Alternating both quote styles in one pass
  // also keeps an apostrophe inside a double-quoted string from desynchronising
  // the scan.
  const literals = new Set();
  for (const match of String(source || '').matchAll(/'([^'\\\n]*)'|"([^"\\\n]*)"/g)) {
    const value = match[1] ?? match[2] ?? '';
    if (value.length >= minLength && value.length <= 120 && value.trim() !== '') literals.add(value);
  }
  return [...literals].sort().slice(0, limit);
}

export function classifyFunction({ previousVersion, meta, bodyText, markers, configVerifyJwt }) {
  const version = Number(meta?.version);
  const missingMarkers = (markers || []).filter((marker) => !String(bodyText || '').includes(marker));
  const checks = [
    ['function-active', meta?.status === 'ACTIVE'],
    ['version-advanced', Number.isFinite(version) && (previousVersion === null || version > previousVersion)],
    ['markers-present', missingMarkers.length === 0],
    ['verify-jwt-matches-config', typeof configVerifyJwt === 'boolean' && meta?.verify_jwt === configVerifyJwt],
  ];
  const passed = checks.every(([, ok]) => ok);
  return {
    state: passed ? 'verified' : 'failed',
    deployed: passed,
    verification: passed ? 'passed' : 'failed',
    version: Number.isFinite(version) ? version : null,
    markerCount: (markers || []).length,
    missingMarkers,
    checks: checks.map(([name, ok]) => ({ name, ok })),
  };
}

/** Parse `[functions.<slug>] verify_jwt = <bool>` out of supabase/config.toml. */
export function configVerifyJwtFor(configSource, slug) {
  const section = new RegExp(`\\[functions\\.${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]([\\s\\S]*?)(?=\\n\\[|$)`);
  const match = String(configSource || '').match(section);
  if (!match) return null;
  const flag = match[1].match(/verify_jwt\s*=\s*(true|false)/);
  return flag ? flag[1] === 'true' : null;
}

/**
 * Merge verified facts into the evidence document. Only fields this run
 * actually observed are written; anything unobserved is left exactly as found,
 * so a partial run can never silently downgrade or upgrade another plane.
 */
export function mergeEvidence(evidence, facts) {
  const next = JSON.parse(JSON.stringify(evidence || {}));
  next.runtimeUpdates = next.runtimeUpdates || {};
  if (facts.migration) {
    next.runtimeUpdates.databaseMigration = {
      path: MIGRATION_PATH,
      deployed: facts.migration.deployed,
      verification: facts.migration.verification,
      verifiedBy: 'scripts/verify-supabase-runtime.mjs',
      verifiedAt: facts.observedAt,
      coverage: facts.migration.coverage,
      unobserved: facts.migration.unobserved,
      evidence: {
        objects: facts.migration.findings.map((f) => ({ name: f.name, state: f.state })),
        behaviour: facts.migration.behaviour,
        observability: facts.migration.observability,
      },
    };
  }
  if (facts.edgeFunction) {
    next.runtimeUpdates.edgeFunction = {
      path: FUNCTION_PATH,
      deployed: facts.edgeFunction.deployed,
      verification: facts.edgeFunction.verification,
      verifiedBy: 'scripts/verify-supabase-runtime.mjs',
      verifiedAt: facts.observedAt,
      evidence: {
        version: facts.edgeFunction.version,
        markerCount: facts.edgeFunction.markerCount,
        checks: facts.edgeFunction.checks,
      },
    };
  }
  next.updatedAt = facts.observedAt;
  return next;
}

/* ------------------------------------------------------------------ *
 * Live provider access.
 * ------------------------------------------------------------------ */

async function managementToken() {
  const { getSecret } = await import('./lib/secrets.mjs');
  const token = await getSecret('SUPABASE_ACCESS_TOKEN', 'supabase.management-api');
  if (!token) {
    throw new Error('SUPABASE_ACCESS_TOKEN absent from the secrets gateway — this is a genuine credential gap, not a script failure.');
  }
  return token;
}

async function projectRef() {
  // Never let a studio-global SUPABASE_URL retarget this repository's
  // migration or Edge Function deploy. The project ref is part of the public
  // project contract and is intentionally pinned here.
  return DEFAULT_PROJECT_REF;
}

function makeClient(token, ref) {
  const request = async (route, options = {}) => {
    const response = await fetch(`${MANAGEMENT_BASE}/projects/${ref}${route}`, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return response;
  };
  return {
    async sql(query) {
      const response = await request('/database/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query }),
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`sql ${response.status}: ${text.slice(0, 400)}`);
      try { return JSON.parse(text); } catch { return []; }
    },
    async functionMeta(slug) {
      const response = await request(`/functions/${slug}`, { headers: { Accept: 'application/json' } });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`function meta ${response.status}`);
      return response.json();
    },
    async functionBody(slug) {
      const response = await request(`/functions/${slug}/body`);
      if (!response.ok) throw new Error(`function body ${response.status}`);
      return Buffer.from(await response.arrayBuffer()).toString('latin1');
    },
    async deployFunction(slug, files, metadata) {
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      for (const file of files) {
        form.append('file', new Blob([file.content], { type: 'text/typescript' }), file.name);
      }
      const response = await request(`/functions/deploy?slug=${encodeURIComponent(slug)}`, {
        method: 'POST',
        body: form,
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`function deploy ${response.status}: ${text.slice(0, 600)}`);
      try { return JSON.parse(text); } catch { return {}; }
    },
  };
}

const CATALOG_SQL = `
select 'get_classified_files' as name, pg_get_functiondef(p.oid) as sql
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname = 'get_classified_files'
union all
select 'claim_beta_key', pg_get_functiondef(p.oid)
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname = 'claim_beta_key'
union all
select 'policy:beta_keys/members see claimable or own keys', pg_get_expr(pol.polqual, pol.polrelid)
  from pg_policy pol join pg_class c on c.oid = pol.polrelid
 where c.relname = 'beta_keys' and pol.polname = 'members see claimable or own keys';
`;

async function readCatalog(client) {
  const rows = await client.sql(CATALOG_SQL);
  const objects = {
    'get_classified_files': null,
    'claim_beta_key': null,
    'policy:beta_keys/members see claimable or own keys': null,
  };
  for (const row of rows) objects[row.name] = row.sql;
  return objects;
}

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Impersonate one subject for the statements that follow it. Multiple
 * statements in a single management-API query run as one implicit transaction,
 * so `set_config(..., true)` is transaction-local and cannot leak into the next
 * request — verified live: the following call reads `auth.uid()` as null.
 */
function asSubject(uid) {
  return `select set_config('request.jwt.claims', ${sqlLiteral(JSON.stringify({ sub: uid }))}, true);`;
}

/**
 * Read-only behavioural probe. The only function called is `security definer`
 * and read-only, so no row is written by any statement here.
 */
async function probeBehaviour(client) {
  const subjects = await client.sql(`
    select
      (select s.user_id::text from public.subscriptions s
         where s.plan = 'vault_sparked_pro' and s.status = 'active'
           and exists (select 1 from public.vault_members vm where vm.id = s.user_id)
         limit 1) as eternal_uid,
      (select vm.id::text from public.vault_members vm
         where not exists (
           select 1 from public.subscriptions s
            where s.user_id = vm.id and s.status = 'active'
              and s.plan in ('vault_sparked', 'vault_sparked_pro'))
         order by vm.points desc nulls last
         limit 1) as free_uid,
      (select count(*)::int from public.classified_files
         where required_plan = 'vault_sparked' and published_at is not null) as gated_rows;
  `);
  const { eternal_uid: eternalUid, free_uid: freeUid, gated_rows: gatedRows } = subjects[0] || {};
  if (!eternalUid || !gatedRows) {
    return { ran: false, reason: !eternalUid ? 'no active vault_sparked_pro subscriber with a member row' : 'no gated classified rows' };
  }

  // The archive gates on rank AND plan. A gated row a member cannot reach on
  // rank is locked for a reason that has nothing to do with this migration, so
  // counting it would make the plan assertion vacuously true (or vacuously
  // false). Every count below is restricted to rows the subject's rank already
  // admits, which is the only slice where the plan predicate is observable.
  const rankLadder = (idExpr) => `(select case
      when vm.points >= 100000 then 8 when vm.points >= 60000 then 7
      when vm.points >= 30000  then 6 when vm.points >= 15000 then 5
      when vm.points >= 7500   then 4 when vm.points >= 3000  then 3
      when vm.points >= 1000   then 2 when vm.points >= 250   then 1
      else 0 end
    from public.vault_members vm where vm.id = ${idExpr})`;

  const gatedCounts = (uid) => `
    select ${rankLadder(sqlLiteral(uid) + '::uuid')} as member_rank,
           count(*) filter (where f.rank_required <= r.rank) as eligible,
           count(*) filter (where f.rank_required <= r.rank and not f.locked and f.content_html <> '') as eligible_unlocked,
           count(*) filter (where f.rank_required <= r.rank and f.locked) as eligible_locked
      from public.get_classified_files() f,
           (select ${rankLadder(sqlLiteral(uid) + '::uuid')} as rank) r
     where f.required_plan = 'vault_sparked';
  `;

  // A raising RPC is an observation, not a probe malfunction. Before this
  // migration the live function throws 42702 (`id` ambiguous between the
  // RETURNS TABLE out-parameter and vault_members.id) for every authenticated
  // caller, so "the probe crashed" and "the feature is broken" are the same
  // fact and must be recorded as such rather than aborting the run.
  const attempt = async (label, query) => {
    try {
      return { label, rows: await client.sql(query), error: null };
    } catch (error) {
      const code = String(error.message || '').match(/ERROR:\s*(\w+)/);
      return { label, rows: null, error: code ? code[1] : 'unknown' };
    }
  };

  const eternal = await attempt('eternal', `${asSubject(eternalUid)}${gatedCounts(eternalUid)}`);
  // No impersonation: auth.uid() is null, so the function must return early.
  const anonymous = await attempt('anonymous', `select count(*)::int as rows from public.get_classified_files();`);
  const free = freeUid ? await attempt('free', `${asSubject(freeUid)}${gatedCounts(freeUid)}`) : null;

  const eternalRow = eternal.rows?.[0] || null;
  const freeRow = free?.rows?.[0] || null;
  const errors = [eternal, anonymous, free].filter(Boolean).filter((p) => p.error)
    .map((p) => ({ probe: p.label, sqlState: p.error }));

  const eternalEligible = eternalRow ? Number(eternalRow.eligible) : 0;
  const freeEligible = freeRow ? Number(freeRow.eligible) : 0;

  return {
    ran: true,
    gatedRows,
    errors,
    // null = the plan dimension is not observable against live data, which is a
    // different statement from "it failed" and must not round to either verdict.
    eternalPlanUnlocked: !eternalRow || eternalEligible === 0
      ? null
      : Number(eternalRow.eligible_locked) === 0 && Number(eternalRow.eligible_unlocked) === eternalEligible,
    freePlanLocked: !freeRow || freeEligible === 0
      ? null
      : Number(freeRow.eligible_unlocked) === 0 && Number(freeRow.eligible_locked) === freeEligible,
    anonymousRowCount: anonymous.rows ? Number(anonymous.rows[0]?.rows ?? -1) : -1,
    observability: {
      eternalRank: eternalRow ? Number(eternalRow.member_rank) : null,
      eternalRankEligibleGatedRows: eternalEligible,
      freeRank: freeRow ? Number(freeRow.member_rank) : null,
      freeRankEligibleGatedRows: freeEligible,
      gatedRows,
    },
  };
}

async function verifyAll(client, { previousFunctionVersion = null } = {}) {
  const objects = await readCatalog(client);
  const behaviour = await probeBehaviour(client);
  const migration = classifyMigration({ objects, behaviour });

  const meta = await client.functionMeta(FUNCTION_SLUG);
  const body = meta ? await client.functionBody(FUNCTION_SLUG) : '';
  const markers = deriveFunctionMarkers(fs.readFileSync(path.join(ROOT, FUNCTION_PATH), 'utf8'));
  const edgeFunction = classifyFunction({
    previousVersion: previousFunctionVersion,
    meta,
    bodyText: body,
    markers,
    configVerifyJwt: configVerifyJwtFor(fs.readFileSync(path.join(ROOT, CONFIG_PATH), 'utf8'), FUNCTION_SLUG),
  });
  return { objects, behaviour, migration, edgeFunction, functionMeta: meta };
}

function reportLine(label, state) {
  const glyph = state === 'verified' ? '✓' : state === 'not-applied' || state === 'failed' ? '⛔' : '⚠';
  return `  ${glyph} ${label.padEnd(26)} ${state}`;
}

function printReport(result) {
  console.log('supabase runtime verification');
  console.log(reportLine('database migration', result.migration.state));
  for (const finding of result.migration.findings) {
    console.log(`      · ${finding.name}: ${finding.state}${finding.reason ? ` (${finding.reason})` : ''}`);
  }
  for (const check of result.migration.behaviour) {
    console.log(`      · behaviour ${check.name}: ${check.ok === null ? 'not-run' : check.ok ? 'ok' : 'FAIL'}`);
  }
  if (result.behaviour?.ran === false) console.log(`      · behaviour not run: ${result.behaviour.reason}`);
  for (const error of result.migration.providerErrors || []) {
    console.log(`      · provider error on ${error.probe} probe: SQLSTATE ${error.sqlState}`);
  }
  const obs = result.migration.observability;
  if (obs && obs.eternalRankEligibleGatedRows === 0) {
    console.log(`      · plan dimension not observable: eternal rank ${obs.eternalRank}, `
      + `${obs.gatedRows} gated row(s), 0 within reach on rank`);
  }
  console.log(reportLine('edge function', result.edgeFunction.state));
  for (const check of result.edgeFunction.checks) {
    console.log(`      · ${check.name}: ${check.ok ? 'ok' : 'FAIL'}`);
  }
  if (result.edgeFunction.missingMarkers.length) {
    console.log(`      · missing markers: ${result.edgeFunction.missingMarkers.slice(0, 3).join(' | ')}`);
  }
}

async function capturePreImage(client) {
  const objects = await readCatalog(client);
  const stamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);
  const dir = path.join(ROOT, '.cache');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `supabase-preimage-${stamp}.sql`);
  const body = Object.entries(objects)
    .map(([name, sql]) => `-- ===== ${name}\n${sql || '-- (absent)'}\n`)
    .join('\n');
  fs.writeFileSync(file, `-- Pre-image captured before ${MIGRATION_PATH}\n-- ${new Date().toISOString()}\n\n${body}`, 'utf8');
  return { file: path.relative(ROOT, file), sha256: crypto.createHash('sha256').update(body).digest('hex') };
}

/* ------------------------------------------------------------------ *
 * Self-test — pure functions only, no network.
 * ------------------------------------------------------------------ */

function selfTest() {
  const narrow = "case when f.required_plan = 'vault_sparked' and v_plan = 'vault_sparked' then 1 end";
  const wide = "case when f.required_plan = 'vault_sparked' and v_plan in ('vault_sparked', 'vault_sparked_pro') then 1 end";
  const pgArray = "((required_plan = 'vault_sparked'::text) and (s.plan = ANY (ARRAY['vault_sparked'::text, 'vault_sparked_pro'::text])))";
  const pgArrayNarrow = "((required_plan = 'vault_sparked'::text) and (s.plan = 'vault_sparked'::text))";
  const behaviourPass = {
    ran: true, errors: [], anonymousRowCount: 0,
    eternalPlanUnlocked: true, freePlanLocked: true,
  };
  const applied = { get_classified_files: wide, claim_beta_key: wide, policy: pgArray };

  const cases = [
    ['narrow member-plan equality detected', hasNarrowPlanEquality(narrow) === true],
    ['widened IN list is not narrow', hasNarrowPlanEquality("v_plan in ('vault_sparked', 'vault_sparked_pro')") === false],
    ['postgres ANY(ARRAY[...]) rendering is not narrow', hasNarrowPlanEquality(pgArray) === false],
    ['narrow policy rendering is still detected under the same operand rule', hasNarrowPlanEquality(pgArrayNarrow) === true],
    // The file's own requirement column keeps a bare `= vault_sparked` after the
    // migration. Flagging it would report a correctly migrated body as unmigrated.
    ['the file requirement column is never mistaken for the member plan',
      hasNarrowPlanEquality("f.required_plan = 'vault_sparked'") === false
      && hasNarrowPlanEquality("required_plan = 'vault_sparked'::text") === false],
    ['required_plan literal alone is not the eternal plan', namesEternalPlan("f.required_plan = 'vault_sparked'") === false],
    ['absent object is absent, never applied', classifyEntitlementObject('x', null).state === 'absent'],
    ['pre-migration object classifies not-applied', classifyEntitlementObject('x', narrow).state === 'not-applied'],
    ['post-migration object classifies applied', classifyEntitlementObject('x', wide).state === 'applied'],
    ['shape + behaviour both passing is verified',
      classifyMigration({ objects: applied, behaviour: behaviourPass }).state === 'verified'],
    ['behaviour failure outranks a passing shape',
      classifyMigration({ objects: applied, behaviour: { ...behaviourPass, eternalPlanUnlocked: false } }).verification === 'failed'],
    ['a free member left unlocked fails the negative control',
      classifyMigration({ objects: applied, behaviour: { ...behaviourPass, freePlanLocked: false } }).verification === 'failed'],
    ['anonymous rows leaking fails the negative control',
      classifyMigration({ objects: applied, behaviour: { ...behaviourPass, anonymousRowCount: 3 } }).verification === 'failed'],
    ['unrun behaviour degrades to unverified, never passed',
      classifyMigration({ objects: applied, behaviour: { ran: false } }).verification === 'unverified'],
    ['an RPC that raises is a behaviour failure, not a probe malfunction',
      classifyMigration({ objects: applied, behaviour: { ...behaviourPass, errors: [{ probe: 'eternal', sqlState: '42702' }] } }).state === 'behaviour-failed'],
    ['an unobservable direction is never counted as a failure', (() => {
      const r = classifyMigration({ objects: applied, behaviour: { ...behaviourPass, freePlanLocked: null } });
      return r.verification === 'passed' && r.coverage === 'partial'
        && r.unobserved.includes('free-plan-still-locked');
    })()],
    // Coverage contract. The Eternal subscriber holds rank 2 while the only
    // gated row needs rank 3, so the positive direction is unobservable — but a
    // rank-eligible free member being denied proves the predicate discriminates.
    // One direction is a pass that DECLARES it rests on one direction; zero
    // directions measures nothing about plan and must stay unverified.
    ['one non-vacuous direction passes with coverage declared partial', (() => {
      const r = classifyMigration({ objects: applied, behaviour: { ...behaviourPass, eternalPlanUnlocked: null } });
      return r.verification === 'passed' && r.coverage === 'partial'
        && r.unobserved.includes('eternal-plan-unlocked');
    })()],
    ['both directions observed reports complete coverage',
      classifyMigration({ objects: applied, behaviour: behaviourPass }).coverage === 'complete'],
    ['neither direction observable measures nothing and stays unverified',
      classifyMigration({ objects: applied, behaviour: { ...behaviourPass, eternalPlanUnlocked: null, freePlanLocked: null } }).verification === 'unverified'],
    ['partial coverage never survives an always-observable failure',
      classifyMigration({ objects: applied, behaviour: { ...behaviourPass, eternalPlanUnlocked: null, anonymousRowCount: 4 } }).verification === 'failed'],
    ['a passing verdict always carries its coverage, never an empty one',
      classifyMigration({ objects: applied, behaviour: behaviourPass }).coverage !== 'none'],
    ['a failed verdict claims no coverage',
      classifyMigration({ objects: applied, behaviour: { ...behaviourPass, freePlanLocked: false } }).coverage === 'none'],
    ['pre-migration catalog is not-applied',
      classifyMigration({ objects: { a: narrow, b: narrow }, behaviour: { ran: false } }).state === 'not-applied'],
    ['markers are deterministic and deduped', (() => {
      const source = "const a = 'https://deno.land/std@0.177.0'; const b = 'https://deno.land/std@0.177.0'; const c = \"website.staging.vaultsparkstudios.com\";";
      const first = deriveFunctionMarkers(source);
      return first.length === 2 && JSON.stringify(first) === JSON.stringify(deriveFunctionMarkers(source));
    })()],
    ['short literals are excluded from the marker set', deriveFunctionMarkers("const a = 'short';").length === 0],
    // The bug this test pins: a length-filtered quote regex pairs the closing
    // quote of one short literal with the opening quote of the next.
    ['the gap between two short literals is never emitted as a marker',
      deriveFunctionMarkers("if (m !== 'GET' && m !== 'POST' && m !== 'HEAD') return;")
        .every((marker) => !marker.includes('!=='))],
    ['an apostrophe inside a double-quoted string does not desynchronise the scan',
      deriveFunctionMarkers(`const a = "it's a long enough literal"; const b = 'second long literal here';`)
        .length === 2],
    ['a missing marker fails the function verdict',
      classifyFunction({ previousVersion: 3, meta: { status: 'ACTIVE', version: 4, verify_jwt: false }, bodyText: 'nothing', markers: ['marker-value'], configVerifyJwt: false }).state === 'failed'],
    ['a stale version fails even with every marker present',
      classifyFunction({ previousVersion: 4, meta: { status: 'ACTIVE', version: 4, verify_jwt: false }, bodyText: 'marker-value', markers: ['marker-value'], configVerifyJwt: false }).state === 'failed'],
    ['gateway posture drift fails the function verdict',
      classifyFunction({ previousVersion: 3, meta: { status: 'ACTIVE', version: 4, verify_jwt: true }, bodyText: 'marker-value', markers: ['marker-value'], configVerifyJwt: false }).state === 'failed'],
    ['a clean deploy verifies',
      classifyFunction({ previousVersion: 3, meta: { status: 'ACTIVE', version: 4, verify_jwt: false }, bodyText: 'xx marker-value xx', markers: ['marker-value'], configVerifyJwt: false }).state === 'verified'],
    ['config verify_jwt is parsed per slug',
      configVerifyJwtFor('[functions.a]\nverify_jwt = true\n\n[functions.eternal-intelligence]\nverify_jwt = false\n', 'eternal-intelligence') === false],
    ['an unlisted slug returns null, never a default',
      configVerifyJwtFor('[functions.a]\nverify_jwt = true\n', 'eternal-intelligence') === null],
    ['evidence merge writes only observed planes', (() => {
      const before = { runtimeUpdates: { databaseMigration: { deployed: false }, edgeFunction: { deployed: 'sentinel' } } };
      const after = mergeEvidence(before, {
        observedAt: '2026-01-01T00:00:00.000Z',
        migration: { deployed: true, verification: 'passed', findings: [], behaviour: [] },
      });
      return after.runtimeUpdates.databaseMigration.deployed === true
        && after.runtimeUpdates.edgeFunction.deployed === 'sentinel';
    })()],
    ['evidence merge never mutates its input', (() => {
      const before = { runtimeUpdates: { databaseMigration: { deployed: false } } };
      mergeEvidence(before, { observedAt: 'x', migration: { deployed: true, verification: 'passed', findings: [], behaviour: [] } });
      return before.runtimeUpdates.databaseMigration.deployed === false;
    })()],
    ['a failed verification is recorded as failed, not omitted', (() => {
      const after = mergeEvidence({}, {
        observedAt: 'x',
        migration: { deployed: false, verification: 'failed', findings: [], behaviour: [] },
      });
      return after.runtimeUpdates.databaseMigration.verification === 'failed';
    })()],
  ];

  const failed = cases.filter(([, ok]) => !ok);
  cases.forEach(([label, ok]) => console.log(`  ${ok ? 'ok' : 'fail'} ${label}`));
  console.log(`verify-supabase-runtime self-test: ${cases.length - failed.length}/${cases.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

/* ------------------------------------------------------------------ */

async function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has('--self-test')) return selfTest();

  const client = makeClient(await managementToken(), await projectRef());
  const apply = args.has('--apply');

  if (apply && !args.has('--confirm')) {
    console.error('--apply mutates the production database and the live edge function. Re-run with --confirm.');
    process.exit(2);
  }

  let previousFunctionVersion = null;
  if (apply) {
    const before = await verifyAll(client);
    previousFunctionVersion = before.functionMeta?.version ?? null;
    console.log('BEFORE');
    printReport(before);

    if (before.migration.state !== 'verified') {
      const preImage = await capturePreImage(client);
      console.log(`\n  pre-image → ${preImage.file}  (sha256 ${preImage.sha256.slice(0, 16)}…)`);
      const sql = fs.readFileSync(path.join(ROOT, MIGRATION_PATH), 'utf8');
      console.log(`  applying ${MIGRATION_PATH} …`);
      await client.sql(sql);
      console.log('  migration statement batch accepted');
    } else {
      console.log('\n  migration already verified — not re-applied');
    }

    if (before.edgeFunction.state !== 'verified') {
      console.log(`  deploying ${FUNCTION_PATH} …`);
      const files = [
        { name: FUNCTION_PATH, content: fs.readFileSync(path.join(ROOT, FUNCTION_PATH), 'utf8') },
        { name: FUNCTION_SHARED_PATH, content: fs.readFileSync(path.join(ROOT, FUNCTION_SHARED_PATH), 'utf8') },
        { name: FUNCTION_TOKEN_METER_PATH, content: fs.readFileSync(path.join(ROOT, FUNCTION_TOKEN_METER_PATH), 'utf8') },
      ];
      const verifyJwt = configVerifyJwtFor(fs.readFileSync(path.join(ROOT, CONFIG_PATH), 'utf8'), FUNCTION_SLUG);
      await client.deployFunction(FUNCTION_SLUG, files, {
        entrypoint_path: FUNCTION_PATH,
        name: FUNCTION_SLUG,
        verify_jwt: verifyJwt === null ? false : verifyJwt,
      });
      console.log('  deploy accepted');
    } else {
      console.log('  edge function already verified — not redeployed');
    }
    console.log('\nAFTER');
  }

  const result = await verifyAll(client, { previousFunctionVersion });
  printReport(result);

  if (args.has('--write-evidence')) {
    const evidence = JSON.parse(fs.readFileSync(EVIDENCE_PATH, 'utf8'));
    const next = mergeEvidence(evidence, {
      observedAt: new Date().toISOString(),
      migration: result.migration,
      edgeFunction: result.edgeFunction,
    });
    fs.writeFileSync(EVIDENCE_PATH, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    console.log(`\n  evidence written → context/IDENTITY_MIGRATION_EVIDENCE.json`);
  }

  if (args.has('--json')) console.log(JSON.stringify(result, null, 2));

  const ok = result.migration.state === 'verified' && result.edgeFunction.state === 'verified';
  if (args.has('--require-verified') && !ok) process.exit(1);
}

main().catch((error) => {
  console.error(`verify-supabase-runtime: ${error.message}`);
  process.exit(1);
});
