#!/usr/bin/env node
/*
 * deploy-member-newsletter.mjs — S344
 *
 * THE GAP THIS CLOSES.
 *
 * The Monthly Member Newsletter cron has failed six consecutive times and has
 * never sent a single email. Two independent faults, both proven live:
 *
 *   1. supabase/functions/send-member-newsletter/index.ts was written, reviewed,
 *      committed and NEVER DEPLOYED. Every run returns
 *      `{"code":"NOT_FOUND","message":"Requested function was not found"}`.
 *      supabase/config.toml has recorded this since 2026-07-12 ("not currently
 *      deployed; posture pinned for when it is") — the posture was pinned and
 *      the deploy never happened.
 *   2. The GitHub Action sends `Authorization: Bearer ${{ secrets.NEWSLETTER_SECRET }}`
 *      and that secret does not exist, so the header renders as a bare
 *      `Bearer ` with nothing after it. Even once deployed, the function's own
 *      check at index.ts:20 would reject it.
 *
 * Fixing either one alone changes nothing: the cron would go from 404 to 401.
 *
 * WHY THE PROJECT REF IS PINNED, NOT RESOLVED.
 *
 * The obvious move is the deploy-desk-dispatch operator script's projectRef(), which
 * derives the ref from `getSecret('SUPABASE_URL')`. That slot is the one D-S344.1 proved is
 * scoped to a DIFFERENT project (ckwtolofoqzrqouqkmvs) while this site ships
 * fjnpzjjyhnpmunfoycrp — the gateway merges every secrets/*.env into one flat
 * namespace and the last intake wins. Resolving the ref through it would deploy
 * this site's member newsletter into a sibling project. The ref below is this
 * repo's own declared identity (it appears in the site CSP), and the script
 * REFUSES to run if the management token cannot see that exact project.
 *
 * Usage:
 *   node scripts/deploy-member-newsletter.mjs --status    # what is true right now
 *   node scripts/deploy-member-newsletter.mjs --deploy    # deploy the function
 *   node scripts/deploy-member-newsletter.mjs --secret    # mint + set both sides
 *   node scripts/deploy-member-newsletter.mjs --verify    # prove 404 -> 401
 *   node scripts/deploy-member-newsletter.mjs --self-test
 *
 * DELIBERATELY ABSENT: any flag that triggers a real send. The function has no
 * dry-run mode — an authorised POST mails every opted-in member immediately.
 * Verification here stops at the 401 boundary, which proves the endpoint exists
 * and its guard works without mailing anyone. The first real send belongs to a
 * founder-observed `workflow_dispatch`.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from './lib/safe-spawn.mjs';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MGMT = 'https://api.supabase.com/v1';
const SLUG = 'send-member-newsletter';
const ENTRYPOINT = `supabase/functions/${SLUG}/index.ts`;

// This site's own project, asserted by the repo (see the CSP in api/staging-health.json
// and .cache/supabase-migration-last.json), NOT read from the shared gateway slot.
const PROJECT_REF = 'fjnpzjjyhnpmunfoycrp';

const args = new Set(process.argv.slice(2));
const redact = (s) => String(s).replace(/\b(sbp_[a-z0-9]+|re_[A-Za-z0-9_-]+|eyJ[\w.-]{20,})/g, '[redacted]');

async function secrets() {
  const mod = await import('../../vaultspark-studio-ops/scripts/lib/secrets.mjs');
  return mod;
}

let _token = null;
async function token() {
  if (_token) return _token;
  const { getSecret } = await secrets();
  _token = getSecret('SUPABASE_ACCESS_TOKEN', 'supabase.management');
  return _token;
}

async function mgmt(pathname, init = {}) {
  const res = await fetch(`${MGMT}${pathname}`, {
    ...init,
    headers: { Authorization: `Bearer ${await token()}`, ...(init.headers || {}) },
  });
  return { ok: res.ok, status: res.status, text: await res.text() };
}

/** Refuse to act unless the token can see THIS project. */
async function assertProject() {
  const res = await mgmt(`/projects/${PROJECT_REF}/functions`);
  if (!res.ok) {
    console.error(redact(`✗ management token cannot read project ${PROJECT_REF}: ${res.status} ${res.text.slice(0, 160)}`));
    console.error('  Refusing to continue — a token scoped elsewhere must never deploy this function.');
    process.exit(1);
  }
  return JSON.parse(res.text);
}

async function status() {
  const fns = await assertProject();
  const live = fns.find((f) => f.slug === SLUG);
  console.log(`project        : ${PROJECT_REF} (reachable, ${fns.length} functions deployed)`);
  console.log(`function       : ${live ? `DEPLOYED (${live.status}, v${live.version})` : 'NOT DEPLOYED'}`);
  let ghSecret = null;
  try {
    const out = execFileSync('gh', ['secret', 'list', '--json', 'name'], { cwd: ROOT, encoding: 'utf8', windowsHide: true });
    ghSecret = JSON.parse(out).some((s) => s.name === 'NEWSLETTER_SECRET');
  } catch { ghSecret = null; }
  console.log(`NEWSLETTER_SECRET (GitHub Actions): ${ghSecret === null ? 'unknown (gh unavailable)' : ghSecret ? 'present' : 'ABSENT — the Action sends an empty Bearer'}`);
  return { live: !!live, ghSecret };
}

async function deploy() {
  await assertProject();
  const source = fs.readFileSync(path.join(ROOT, ENTRYPOINT), 'utf8');
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify({
    name: SLUG,
    entrypoint_path: 'index.ts',
    // Mirrors supabase/config.toml [functions.send-member-newsletter]. The
    // caller is a GitHub Action with a shared-secret Bearer, not a Supabase
    // user, so a gateway JWT check would reject the only legitimate caller.
    verify_jwt: false,
  })], { type: 'application/json' }));
  form.append('file', new Blob([source], { type: 'application/typescript' }), 'index.ts');

  const res = await mgmt(`/projects/${PROJECT_REF}/functions/deploy?slug=${SLUG}`, { method: 'POST', body: form });
  if (!res.ok) {
    console.error(redact(`✗ deploy: ${res.status} ${res.text.slice(0, 300)}`));
    process.exitCode = 1;
    return false;
  }
  console.log(`✓ deploy: ${SLUG} live on ${PROJECT_REF}`);
  return true;
}

/** Keep secrets out of process arguments and inherited stderr. */
function writeActionsSecret(value, run = execFileSync) {
  return run('gh', ['secret', 'set', 'NEWSLETTER_SECRET'], {
    cwd: ROOT, input: value, stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true,
  });
}

/** The function's own unauthenticated rejection, not an arbitrary edge error. */
function isGuardRejection(status, body) {
  return status === 401 && String(body).trim() === 'Unauthorized';
}

async function setSecret() {
  await assertProject();
  // A fresh 32-byte secret. Minted here so the value exists in exactly two
  // places — the function's env and the Action's secret store — and is never
  // written to the repo or printed.
  const value = crypto.randomBytes(32).toString('base64url');

  const res = await mgmt(`/projects/${PROJECT_REF}/secrets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{ name: 'NEWSLETTER_SECRET', value }]),
  });
  if (!res.ok) {
    console.error(redact(`✗ function secret: ${res.status} ${res.text.split(value).join('[redacted]').slice(0, 200)}`));
    process.exitCode = 1;
    return false;
  }
  console.log(`✓ function secret: NEWSLETTER_SECRET set on ${PROJECT_REF}`);

  try {
    writeActionsSecret(value);
    console.log('✓ Actions secret: NEWSLETTER_SECRET set on the repository');
  } catch (err) {
    console.error('✗ Actions secret update failed; provider output is withheld because it may contain the secret.');
    console.error('  Both sides must hold the SAME value; the function side is already set.');
    process.exitCode = 1;
    return false;
  }
  return true;
}

/**
 * Prove the endpoint exists and its guard works — WITHOUT sending mail.
 *
 * An unauthenticated POST is the only safe probe: 404 means still undeployed,
 * 401/403 means deployed and correctly refusing an unauthorised caller. A 200
 * here would mean the guard is missing, which is itself a failure.
 */
async function verify() {
  const url = `https://${PROJECT_REF}.supabase.co/functions/v1/${SLUG}`;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
  const body = (await res.text()).slice(0, 200);
  console.log(`unauthenticated POST ${url}`);
  console.log(`  -> ${res.status} ${body}`);
  if (res.status === 404) {
    console.error('✗ still NOT_FOUND — the function is not deployed');
    process.exitCode = 1;
    return false;
  }
  if (res.status === 200) {
    console.error('✗ 200 on an UNAUTHENTICATED call — the shared-secret guard is not protecting the send path');
    process.exitCode = 1;
    return false;
  }
  if (!isGuardRejection(res.status, body)) {
    console.error('✗ endpoint did not return the function’s expected unauthenticated rejection; guard verification is inconclusive');
    process.exitCode = 1;
    return false;
  }
  console.log(`✓ function returned its expected unauthenticated rejection (${res.status}); no authorised send was requested`);
  return true;
}

function selfTest() {
  let secretInvocation = null;
  const fixtureSecret = 'fixture-secret-never-a-real-credential';
  writeActionsSecret(fixtureSecret, (...call) => { secretInvocation = call; });
  const checks = [
    ['secret travels through stdin, never command arguments', secretInvocation[2].input === fixtureSecret && !secretInvocation[1].includes(fixtureSecret) && secretInvocation[2].stdio[0] === 'pipe'],
    ['function rejection is recognized', isGuardRejection(401, 'Unauthorized')],
    ['server, gateway and successful responses cannot prove the guard', [200, 204, 302, 403, 404, 429, 500, 503].every(status => !isGuardRejection(status, 'Unauthorized')) && !isGuardRejection(401, '{"message":"JWT rejected"}')],
    ['project ref is pinned to this site, not the shared slot', PROJECT_REF === 'fjnpzjjyhnpmunfoycrp'],
    ['entrypoint exists', fs.existsSync(path.join(ROOT, ENTRYPOINT))],
    ['config.toml pins verify_jwt=false for this slug',
      /\[functions\.send-member-newsletter\][\s\S]{0,80}?verify_jwt\s*=\s*false/.test(
        fs.readFileSync(path.join(ROOT, 'supabase', 'config.toml'), 'utf8'))],
    ['no flag can trigger a real send', !/--send\b/.test(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('function selfTest')[0])],
    ['redact() hides a management PAT', redact('sbp_deadbeefcafe') === '[redacted]'],
  ];
  let pass = 0;
  checks.forEach(([name, ok]) => { if (ok) pass += 1; else console.error(`  ✗ ${name}`); });
  console.log(`deploy-member-newsletter --self-test: ${pass}/${checks.length} passed`);
  if (pass !== checks.length) process.exit(1);
}

if (args.has('--self-test')) selfTest();
else if (args.has('--status')) await status();
else if (args.has('--deploy')) await deploy();
else if (args.has('--secret')) await setSecret();
else if (args.has('--verify')) await verify();
else {
  console.error('Usage: --status | --deploy | --secret | --verify | --self-test');
  process.exitCode = 1;
}
