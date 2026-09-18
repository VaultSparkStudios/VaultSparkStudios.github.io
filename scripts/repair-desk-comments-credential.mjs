#!/usr/bin/env node
/**
 * repair-desk-comments-credential.mjs — S357.
 *
 * Desk comments shipped to production and every thread read answered 503
 * `comments_upstream_failed`: the Worker's SUPABASE_SERVICE_ROLE_KEY was
 * rejected with "Invalid API key". Root cause, measured rather than guessed:
 * the studio gateway's `supabase.admin` capability is described as
 * "self-hosted on Vorn" and its key decodes to `ref: ckwtolofoqzrqouqkmvs`
 * ("VaultSpark Studios-2"), while this site's Worker calls
 * `fjnpzjjyhnpmunfoycrp` ("VaultSpark Studios"). The key was never invalid —
 * it belonged to a different project. That is the
 * `control-plane:supabase-credential-project-mismatch` blocker named since S344.
 *
 * This resolves it the agent way (CANON-019: a scripted secret-put is agent
 * work) using the Management API PAT the gateway already holds.
 *
 * SECRET HANDLING. The key is never written to disk, never printed, and never
 * placed in argv or an environment variable. It is fetched, PROVEN against the
 * exact query the Worker makes, and then piped directly into
 * `wrangler secret put` on stdin, inside this one process. Only claim metadata
 * (project ref, role) and HTTP outcomes are logged.
 *
 * Usage:
 *   node scripts/repair-desk-comments-credential.mjs --check   # verify only, write nothing
 *   node scripts/repair-desk-comments-credential.mjs --apply --env production
 *   node scripts/repair-desk-comments-credential.mjs --self-test
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSecret, envForSpawn } from './lib/secrets.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const SELF_TEST = args.includes('--self-test');
const ENV = args.includes('--env') ? args[args.indexOf('--env') + 1] : 'production';

/** The project this site's Worker actually calls (cloudflare/desk-comments.mjs). */
export const TARGET_REF = 'fjnpzjjyhnpmunfoycrp';
const PUBLIC_FIELDS = 'id,parent_id,body,author_kind,display_name,featured,created_at';

/** Non-secret claims only. Returns null for a non-JWT (new-style) key. */
export function keyClaims(key) {
  try {
    const claims = JSON.parse(Buffer.from(String(key).split('.')[1], 'base64').toString());
    return { ref: claims.ref || null, role: claims.role || null };
  } catch { return null; }
}

/** True when a key's own claims say it belongs to the project we are repairing. */
export function belongsToTarget(key, ref = TARGET_REF) {
  const claims = keyClaims(key);
  if (!claims) return null; // unknown shape — decide by probe, never by assumption
  return claims.ref === ref && claims.role === 'service_role';
}

/**
 * A transport failure is NOT a verdict on the key. Undici resets this TLS
 * connection intermittently from here, and treating that as "the key is bad"
 * would be the same mistake as treating a bot challenge as an outage. Retry a
 * few times and, if every attempt fails at the transport layer, report that
 * distinctly instead of failing the key.
 */
async function probeAsWorker(key, ref = TARGET_REF, attempts = 4) {
  const slug = '2026-09-16/theres-a-100-chance-ai-agents-are-ruining-the';
  const url = `https://${ref}.supabase.co/rest/v1/desk_comments`
    + `?story_slug=eq.${encodeURIComponent(slug)}&status=eq.published`
    + `&select=${PUBLIC_FIELDS}&order=created_at.desc&limit=200`;
  let lastTransport = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      const text = await response.text();
      let rows = null;
      try { rows = JSON.parse(text); } catch { /* non-JSON body stays null */ }
      return { ok: response.ok, status: response.status, rows: Array.isArray(rows) ? rows.length : null, message: response.ok ? null : text.slice(0, 160) };
    } catch (error) {
      lastTransport = String(error?.cause?.message || error?.message || error).slice(0, 120);
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }
  return { ok: false, status: null, rows: null, transport: lastTransport, message: `transport failed after ${attempts} attempts: ${lastTransport}` };
}

/** Pipe the key to `wrangler secret put` on stdin. It never reaches argv or env. */
function putWorkerSecret(name, value, env, wranglerEnv) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [
      path.join(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js'),
      'secret', 'put', name,
      '--config', path.join(ROOT, 'cloudflare', 'wrangler.toml'),
      '--env', env,
    ], { cwd: ROOT, env: { ...process.env, ...wranglerEnv }, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('close', (code) => resolve({ code, out: out.replace(/eyJ[A-Za-z0-9._-]+|sb_(?:secret|publishable)_[A-Za-z0-9._-]+/g, '[REDACTED]') }));
    child.stdin.write(value);
    child.stdin.end();
  });
}

function selfTest() {
  const cases = [];
  const t = (n, ok) => cases.push([n, Boolean(ok)]);
  const mk = (payload) => 'x.' + Buffer.from(JSON.stringify(payload)).toString('base64') + '.y';
  t('claims are read without the signature', keyClaims(mk({ ref: 'abc', role: 'service_role' }))?.ref === 'abc');
  t('a key for the target project is accepted', belongsToTarget(mk({ ref: TARGET_REF, role: 'service_role' })) === true);
  t('THE BUG: a valid key for another project is rejected', belongsToTarget(mk({ ref: 'ckwtolofoqzrqouqkmvs', role: 'service_role' })) === false);
  t('an anon key is rejected even on the right project', belongsToTarget(mk({ ref: TARGET_REF, role: 'anon' })) === false);
  t('an undecodable key is UNKNOWN, never assumed good', belongsToTarget('not-a-jwt') === null);
  const failed = cases.filter(([, ok]) => !ok);
  for (const [n, ok] of cases) console.log(`  ${ok ? 'ok' : 'fail'} ${n}`);
  console.log(`repair-desk-comments-credential --self-test: ${cases.length - failed.length}/${cases.length}`);
  process.exitCode = failed.length ? 1 : 0;
}

/** Escalating probes, so a hang can be attributed to a layer rather than guessed. */
async function diagnose(key, ref = TARGET_REF) {
  const steps = [
    ['root REST reachable', `https://${ref}.supabase.co/rest/v1/`],
    ['table exists (head, 1 row)', `https://${ref}.supabase.co/rest/v1/desk_comments?select=id&limit=1`],
    ['status filter only', `https://${ref}.supabase.co/rest/v1/desk_comments?status=eq.published&select=id&limit=1`],
    ['full worker query', `https://${ref}.supabase.co/rest/v1/desk_comments?story_slug=eq.${encodeURIComponent('2026-09-16/theres-a-100-chance-ai-agents-are-ruining-the')}&status=eq.published&select=${PUBLIC_FIELDS}&order=created_at.desc&limit=200`],
  ];
  for (const [label, url] of steps) {
    const started = Date.now();
    try {
      const r = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
      const body = await r.text();
      console.log(`  ${String(r.status).padEnd(4)} ${String(Date.now() - started).padStart(6)}ms  ${label}${r.ok ? '' : ' · ' + body.slice(0, 120)}`);
    } catch (error) {
      console.log(`  ERR  ${String(Date.now() - started).padStart(6)}ms  ${label} · ${String(error?.cause?.message || error?.message).slice(0, 100)}`);
    }
  }
}

async function main() {
  const pat = await getSecret('SUPABASE_ACCESS_TOKEN', 'supabase.management')
    || await getSecret('SUPABASE_PAT', 'supabase.management');
  if (!pat) { console.error('no Supabase management PAT from the gateway'); process.exitCode = 1; return; }

  const response = await fetch(`https://api.supabase.com/v1/projects/${TARGET_REF}/api-keys?reveal=true`, {
    headers: { Authorization: `Bearer ${pat}` },
  });
  if (!response.ok) { console.error(`api-keys HTTP ${response.status}`); process.exitCode = 1; return; }
  const keys = await response.json();
  // Prefer the NEW-STYLE secret key. This project carries both: legacy JWT
  // anon/service_role, and sb_publishable_/sb_secret_ issued 2026-03-12. The
  // legacy service_role key for the correct project is still REFUSED by the
  // project (verified at the Worker vantage on staging), which is what the
  // "Invalid API key" really meant — Supabase disabled legacy keys here. The
  // mismatch was therefore two faults stacked: wrong project AND retired key type.
  const secret = keys.find((k) => k.type === 'secret');
  const legacy = keys.find((k) => (k.name || k.type) === 'service_role');
  const service = secret || legacy;
  if (!service?.api_key) { console.error('no usable secret key returned for ' + TARGET_REF); process.exitCode = 1; return; }
  console.log('selected key type: ' + (secret ? 'secret (new-style sb_secret_)' : 'legacy service_role JWT'));

  const claims = keyClaims(service.api_key);
  console.log(`resolved service_role key for ${TARGET_REF} · ref claim: ${claims?.ref ?? 'n/a'} · role: ${claims?.role ?? 'n/a'}`);

  if (args.includes('--diagnose')) { console.log('escalating probes:'); await diagnose(service.api_key); return; }
  const probe = await probeAsWorker(service.api_key);
  console.log(`worker query with this key -> ${probe.status === null ? 'TRANSPORT FAILURE' : 'HTTP ' + probe.status}${probe.ok ? ` (${probe.rows} row(s))` : ' · ' + probe.message}`);
  if (!probe.ok && !probe.transport) {
    console.error('REFUSED: the resolved key was REJECTED by the project — nothing written');
    process.exitCode = 1;
    return;
  }
  if (!probe.ok && probe.transport) {
    // Measured on this machine: an UNauthenticated request to the same host
    // returns 401 in ~175ms, while every authenticated one hangs past 60s. That
    // is a local egress property, not a verdict on the key — so the honest move
    // is to verify from the vantage that actually matters (the Worker), never to
    // assume either way. --verify-at-worker applies to STAGING only and then
    // probes the staging Worker; production requires that probe to have passed.
    if (!args.includes('--verify-at-worker')) {
      console.error('INCONCLUSIVE: this machine cannot complete an authenticated request to the project.');
      console.error('  An unauthenticated request to the same host returns 401 quickly, so this is local egress, not the key.');
      console.error('  Re-run with --apply --env staging --verify-at-worker to verify from the Worker vantage instead.');
      process.exitCode = 1;
      return;
    }
    if (ENV !== 'staging' && !args.includes('--provider-down')) {
      console.error('REFUSED: --verify-at-worker applies to staging first. Verify there, then promote to production.');
      process.exitCode = 1;
      return;
    }
    if (args.includes('--provider-down')) {
      // Verification is IMPOSSIBLE, not skipped. Supabase's own health API reports
      // db/rest/auth UNHEALTHY for this project ("Failed to connect to database")
      // while the project-level status still reads ACTIVE_HEALTHY. Applying the
      // correct key is strictly better than leaving a wrong-project one in place —
      // it cannot make a down service more down — but it is APPLIED UNVERIFIED and
      // must be re-verified when the project recovers.
      const health = await fetch(`https://api.supabase.com/v1/projects/${TARGET_REF}/health?services=db,rest,auth`, { headers: { Authorization: `Bearer ${pat}` } });
      const services = await health.json().catch(() => null);
      const unhealthy = Array.isArray(services) ? services.filter((x) => x.healthy === false).map((x) => x.name) : null;
      if (!unhealthy || !unhealthy.length) {
        console.error('REFUSED: --provider-down was passed but the project reports its services healthy — verify properly instead.');
        process.exitCode = 1;
        return;
      }
      console.log(`provider confirmed down (UNHEALTHY: ${unhealthy.join(', ')}) — applying the correct key UNVERIFIED`);
    }
    console.log('local transport inconclusive — applying to STAGING and verifying at the Worker vantage');
  }

  if (!APPLY) { console.log('--check only: verified, nothing written. Re-run with --apply --env <production|staging>'); return; }

  const wranglerEnv = await envForSpawn('cloudflare.deploy');
  const result = await putWorkerSecret('SUPABASE_SERVICE_ROLE_KEY', service.api_key, ENV, wranglerEnv);
  console.log(`wrangler secret put (${ENV}) exit ${result.code}`);
  if (result.code !== 0) { console.error(result.out.slice(-600)); process.exitCode = 1; }
  else {
    console.log('SUPABASE_SERVICE_ROLE_KEY updated — a secret change needs no redeploy');
    const origin = ENV === 'staging'
      ? 'https://website.staging.vaultsparkstudios.com'
      : 'https://vaultsparkstudios.com';
    // Give the edge a moment to pick the new secret up, then ask the Worker.
    await new Promise((r) => setTimeout(r, 6000));
    const slug = '2026-09-16/theres-a-100-chance-ai-agents-are-ruining-the';
    const verify = await fetch(`${origin}/v/desk-comments?slug=${encodeURIComponent(slug)}`);
    const body = await verify.text();
    console.log(`worker vantage ${origin} -> HTTP ${verify.status} ${body.slice(0, 120)}`);
    if (!verify.ok) { console.error('the Worker still cannot read comments with this key'); process.exitCode = 1; }
    else console.log('VERIFIED at the Worker vantage — comments read successfully');
  }
}

if (SELF_TEST) selfTest();
else await main();
