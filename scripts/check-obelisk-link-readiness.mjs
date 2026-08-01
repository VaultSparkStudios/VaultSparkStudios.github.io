#!/usr/bin/env node
/**
 * Read-only pre-flight for Obelisk → Supabase identity linking.
 *
 * Why this is the right shape of work
 * ----------------------------------
 * The board carried "link the existing accounts to Obelisk identities" as a
 * task. It is not agent-executable: `ensureSupabaseIdentityLink` links on first
 * login by verified email, and no `obelisk_sub` exists for a user who has never
 * signed in. A bulk pre-link would have to invent provider subjects — fabricating
 * evidence to close a task. Saying so is the honest answer.
 *
 * What IS agent work is clearing the link path's failure modes before real users
 * hit them. Every branch below is a `throw` in `cloudflare/obelisk-auth.js` that
 * fails a real person's login closed:
 *
 *   identity_email_duplicate    two auth.users rows share one verified email
 *   identity_subject_duplicate  one obelisk_sub already maps to two rows
 *   identity_email_conflict     subject and email resolve to different rows
 *   supabase_user_scan_limit    the callback pages every user, 100 at a time,
 *                               up to 20 pages — at 2000 users EVERY login fails
 *
 * Counts only. No email, user id, or provider claim is read into the receipt —
 * the queries aggregate in the database and only integers cross the boundary.
 *
 * Usage:
 *   node scripts/check-obelisk-link-readiness.mjs --self-test
 *   node scripts/check-obelisk-link-readiness.mjs --probe
 *   node scripts/check-obelisk-link-readiness.mjs --probe --write
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'context', 'OBELISK_LINK_READINESS.json');
const DEFAULT_PROJECT_REF = 'fjnpzjjyhnpmunfoycrp';
const TIMEOUT_MS = 20_000;

// Mirrors scanSupabaseUsers() in cloudflare/obelisk-auth.js. Kept as named
// constants so the headroom figure is traceable to the code that imposes it.
const SCAN_PAGE_SIZE = 100;
const SCAN_PAGE_LIMIT = 20;
const SCAN_CEILING = SCAN_PAGE_SIZE * SCAN_PAGE_LIMIT;

/* ------------------------------------------------------------------ *
 * Pure classification.
 * ------------------------------------------------------------------ */

export function classifyLinkReadiness(counts) {
  const {
    totalUsers = 0,
    duplicateEmailGroups = 0,
    usersWithoutEmail = 0,
    duplicateSubjectGroups = 0,
    linkedUsers = 0,
  } = counts || {};

  const blockers = [];
  if (duplicateEmailGroups > 0) {
    blockers.push({
      code: 'identity_email_duplicate',
      count: duplicateEmailGroups,
      impact: 'those members cannot sign in — the link fails closed on the duplicate',
    });
  }
  if (duplicateSubjectGroups > 0) {
    blockers.push({
      code: 'identity_subject_duplicate',
      count: duplicateSubjectGroups,
      impact: 'one Obelisk subject already maps to more than one account',
    });
  }

  // Headroom is a capacity fact, not a defect: the scan fails CLOSED, so
  // crossing the ceiling breaks logins rather than leaking anything.
  const headroomUsers = SCAN_CEILING - totalUsers;
  const utilisation = SCAN_CEILING === 0 ? 1 : totalUsers / SCAN_CEILING;
  const capacity = totalUsers >= SCAN_CEILING ? 'exceeded'
    : utilisation >= 0.8 ? 'critical'
      : utilisation >= 0.5 ? 'warning'
        : 'ok';
  if (capacity === 'exceeded' || capacity === 'critical') {
    blockers.push({
      code: 'supabase_user_scan_limit',
      count: totalUsers,
      impact: `the login callback pages every user; the ceiling is ${SCAN_CEILING}`,
    });
  }

  return {
    state: blockers.length ? 'conflicted' : 'clear',
    blockers,
    counts: {
      totalUsers,
      linkedUsers,
      unlinkedUsers: Math.max(0, totalUsers - linkedUsers),
      duplicateEmailGroups,
      duplicateSubjectGroups,
      // Cannot match an Obelisk claim and cannot collide with one either.
      usersWithoutEmail,
    },
    scanCapacity: {
      pageSize: SCAN_PAGE_SIZE,
      pageLimit: SCAN_PAGE_LIMIT,
      ceiling: SCAN_CEILING,
      headroomUsers,
      utilisation: Math.round(utilisation * 1000) / 1000,
      state: capacity,
      requestsPerLogin: Math.max(1, Math.ceil(totalUsers / SCAN_PAGE_SIZE)),
    },
  };
}

export function validateReceipt(receipt) {
  const errors = [];
  if (receipt?.schemaVersion !== '1.0') errors.push('schemaVersion must be 1.0');
  if (!['clear', 'conflicted', 'unavailable'].includes(receipt?.state)) errors.push('state is invalid');
  if (receipt?.publicSafe !== true) errors.push('publicSafe must be true');
  const serialized = JSON.stringify(receipt);
  // Counts only. Any address, uuid, or bearer-shaped value is a boundary breach.
  if (/@[a-z0-9.-]+\.[a-z]{2,}/i.test(serialized)) errors.push('receipt contains an email-shaped value');
  if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(serialized)) errors.push('receipt contains a uuid');
  if (/(service_role|access_token|bearer\s)/i.test(serialized)) errors.push('receipt contains credential-adjacent material');
  return errors;
}

/* ------------------------------------------------------------------ *
 * Live probe.
 * ------------------------------------------------------------------ */

const COUNT_SQL = `
select
  (select count(*)::int from auth.users) as total_users,
  (select count(*)::int from auth.users where raw_app_meta_data ? 'obelisk_sub') as linked_users,
  (select count(*)::int from auth.users where email is null or btrim(email) = '') as users_without_email,
  (select count(*)::int from (
     select lower(btrim(email)) as e
       from auth.users
      where email is not null and btrim(email) <> ''
      group by 1 having count(*) > 1) d) as duplicate_email_groups,
  (select count(*)::int from (
     select raw_app_meta_data ->> 'obelisk_sub' as s
       from auth.users
      where raw_app_meta_data ? 'obelisk_sub'
      group by 1 having count(*) > 1) x) as duplicate_subject_groups;
`;

async function probe() {
  const { getSecret } = await import('./lib/secrets.mjs');
  const token = await getSecret('SUPABASE_ACCESS_TOKEN', 'supabase.management-api');
  if (!token) return { unavailable: 'SUPABASE_ACCESS_TOKEN absent from the secrets gateway' };
  const url = await getSecret('SUPABASE_URL', 'supabase.data-rest');
  let ref = DEFAULT_PROJECT_REF;
  try {
    const host = new URL(url).hostname;
    if (host.endsWith('.supabase.co')) ref = host.slice(0, -'.supabase.co'.length);
  } catch { /* keep the default ref */ }

  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: COUNT_SQL }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) return { unavailable: `management api ${response.status}` };
  const rows = await response.json();
  const row = rows?.[0];
  if (!row) return { unavailable: 'no counts returned' };
  return {
    counts: {
      totalUsers: Number(row.total_users),
      linkedUsers: Number(row.linked_users),
      usersWithoutEmail: Number(row.users_without_email),
      duplicateEmailGroups: Number(row.duplicate_email_groups),
      duplicateSubjectGroups: Number(row.duplicate_subject_groups),
    },
  };
}

/* ------------------------------------------------------------------ */

function selfTest() {
  const clean = { totalUsers: 252, linkedUsers: 0, usersWithoutEmail: 2, duplicateEmailGroups: 0, duplicateSubjectGroups: 0 };
  const cases = [
    ['a clean corpus is clear', classifyLinkReadiness(clean).state === 'clear'],
    ['unlinked is derived, never assumed', classifyLinkReadiness(clean).counts.unlinkedUsers === 252],
    ['a duplicate email is a login-breaking blocker',
      classifyLinkReadiness({ ...clean, duplicateEmailGroups: 3 }).blockers.some((b) => b.code === 'identity_email_duplicate')],
    ['a duplicated subject is its own distinct blocker',
      classifyLinkReadiness({ ...clean, duplicateSubjectGroups: 1 }).blockers.some((b) => b.code === 'identity_subject_duplicate')],
    ['emailless accounts are counted but are not a blocker',
      classifyLinkReadiness({ ...clean, usersWithoutEmail: 40 }).state === 'clear'],
    ['scan headroom is measured against the real ceiling',
      classifyLinkReadiness(clean).scanCapacity.ceiling === 2000
      && classifyLinkReadiness(clean).scanCapacity.headroomUsers === 1748],
    ['requests per login is derived from page size',
      classifyLinkReadiness(clean).scanCapacity.requestsPerLogin === 3],
    ['current scale is ok, not alarmed', classifyLinkReadiness(clean).scanCapacity.state === 'ok'],
    ['half the ceiling warns', classifyLinkReadiness({ ...clean, totalUsers: 1000 }).scanCapacity.state === 'warning'],
    ['a warning alone does not block', classifyLinkReadiness({ ...clean, totalUsers: 1000 }).state === 'clear'],
    ['80% of the ceiling is critical and blocks',
      classifyLinkReadiness({ ...clean, totalUsers: 1600 }).state === 'conflicted'],
    ['crossing the ceiling is exceeded',
      classifyLinkReadiness({ ...clean, totalUsers: 2000 }).scanCapacity.state === 'exceeded'],
    ['an empty corpus never divides by zero',
      Number.isFinite(classifyLinkReadiness({ totalUsers: 0 }).scanCapacity.utilisation)],
    ['the validator rejects an email-shaped value',
      validateReceipt({ schemaVersion: '1.0', state: 'clear', publicSafe: true, note: 'a@b.com' })
        .some((e) => /email-shaped/.test(e))],
    ['the validator rejects a uuid',
      validateReceipt({ schemaVersion: '1.0', state: 'clear', publicSafe: true, note: '9359b1f0-6cbf-4696-95c3-be7348b2c4c6' })
        .some((e) => /uuid/.test(e))],
    ['a counts-only receipt validates',
      validateReceipt({ schemaVersion: '1.0', state: 'clear', publicSafe: true, ...classifyLinkReadiness(clean) }).length === 0],
    ['unavailable is a legal state, so a credential gap is not a false clear',
      validateReceipt({ schemaVersion: '1.0', state: 'unavailable', publicSafe: true }).length === 0],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  cases.forEach(([label, ok]) => console.log(`  ${ok ? 'ok' : 'fail'} ${label}`));
  console.log(`obelisk-link-readiness self-test: ${cases.length - failed.length}/${cases.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

async function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has('--self-test')) return selfTest();

  const result = await probe();
  const receipt = result.unavailable
    ? { schemaVersion: '1.0', publicSafe: true, state: 'unavailable', reason: result.unavailable }
    : { schemaVersion: '1.0', publicSafe: true, ...classifyLinkReadiness(result.counts) };
  receipt.generatedBy = 'scripts/check-obelisk-link-readiness.mjs';
  receipt.generatedAt = new Date().toISOString();

  const errors = validateReceipt(receipt);
  if (errors.length) throw new Error(errors.join('\n'));

  console.log('obelisk link readiness');
  console.log(`  state       ${receipt.state}${receipt.reason ? ` (${receipt.reason})` : ''}`);
  if (receipt.counts) {
    const c = receipt.counts;
    console.log(`  accounts    ${c.totalUsers} total · ${c.linkedUsers} linked · ${c.unlinkedUsers} awaiting first sign-in`);
    console.log(`  conflicts   ${c.duplicateEmailGroups} duplicate-email group(s) · ${c.duplicateSubjectGroups} duplicate-subject group(s)`);
    console.log(`  no email    ${c.usersWithoutEmail} (cannot match a claim, cannot collide with one)`);
    const s = receipt.scanCapacity;
    console.log(`  scan cost   ${s.requestsPerLogin} admin request(s) per login · ${s.headroomUsers} accounts of headroom to the ${s.ceiling} ceiling (${s.state})`);
  }
  for (const blocker of receipt.blockers || []) {
    console.log(`      ⛔ ${blocker.code} ×${blocker.count} — ${blocker.impact}`);
  }

  if (args.has('--write')) {
    fs.writeFileSync(OUT, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
    console.log('  receipt written → context/OBELISK_LINK_READINESS.json');
  }
  if (args.has('--require-clear') && receipt.state !== 'clear') process.exit(1);
}

main().catch((error) => {
  console.error(`check-obelisk-link-readiness: ${error.message}`);
  process.exit(1);
});
