#!/usr/bin/env node
/**
 * deploy-desk-dispatch.mjs — provision + deploy the Desk Dispatch newsletter.
 *
 * CANON-019 (try-first): the `brevo` and `supabase.management` capabilities are
 * both READY in the gateway, so setting these secrets and deploying this
 * function is agent work, not a founder blocker. Nothing here requires a
 * dashboard, a hardware key, or a payment confirmation.
 *
 * CANON-012: every credential is resolved through the secrets gateway, never
 * from process.env directly, and every log line is redacted.
 *
 * Modes:
 *   --secrets   push BREVO_API_KEY + dispatch config into the function env
 *   --deploy    deploy supabase/functions/subscribe-desk-dispatch
 *   --verify    no-send probe: junk rejected, CORS and sender config pinned
 *   --live-email=<address> explicitly send one confirmation to a real test mailbox
 *   --all       secrets → deploy → verify
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSecret, redact } from './lib/secrets.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SLUG = 'subscribe-desk-dispatch';
const ENTRYPOINT = `supabase/functions/${SLUG}/index.ts`;
const MGMT = 'https://api.supabase.com/v1';
const BREVO_API = 'https://api.brevo.com/v3';
export const PROJECT_REF = 'fjnpzjjyhnpmunfoycrp';

/**
 * Provisioned in Brevo on 2026-08-08 (S308) — list + double opt-in template.
 *
 * Sending identity is `news@vaultsparkstudios.com` (Brevo sender id 8), NOT
 * `founder@`: a publication should not send as the founder's personal mailbox,
 * and newsletter bounce/complaint signal should not be attributed to the
 * address the studio's human correspondence depends on.
 *
 * It stays on the APEX rather than a `desk.` subdomain deliberately. The apex
 * has been Brevo-authenticated since April with `brevo1`/`brevo2` DKIM live,
 * while a fresh subdomain would start with zero sending reputation — at this
 * list size the cold-start cost is real and the isolation benefit is
 * theoretical. Revisit if the list grows enough for isolation to matter.
 *
 * DMARC is `p=quarantine; adkim=r`, so Brevo mail aligns via DKIM even though
 * Brevo is absent from SPF (`v=spf1 include:zohomail.com ~all`); Brevo's own
 * sender check reports spfError:false. Adding `include:spf.brevo.com` would
 * strengthen it but edits the DNS the founder's primary mail depends on, so it
 * is a recommendation, not an autonomous change.
 */
const DISPATCH_LIST_ID = '3';
const DISPATCH_DOI_TEMPLATE_ID = '1';
const DISPATCH_CONFIRM_URL = 'https://vaultsparkstudios.com/news/subscribed/';
const DISPATCH_SENDER = 'news@vaultsparkstudios.com';

// Shared SUPABASE_URL can belong to a sibling; pin this site's live project.
export function projectRef() { return PROJECT_REF; }

export function parseOptions(argv) {
  const modes = argv.filter((arg) => ['--all', '--secrets', '--deploy', '--verify'].includes(arg));
  if (modes.length !== 1) throw new Error('Specify exactly one mode: --secrets | --deploy | --verify | --all');
  const live = argv.filter((arg) => arg.startsWith('--live-email='));
  if (live.length > 1 || (live.length && argv.includes('--no-live'))) throw new Error('--live-email must appear once and cannot be combined with --no-live');
  if (argv.some((arg) => !modes.includes(arg) && arg !== '--no-live' && !arg.startsWith('--live-email='))) throw new Error('Unknown argument; use --live-email=<address> for a test send');
  const liveEmail = live.length ? live[0].slice('--live-email='.length).toLowerCase() : null;
  if (liveEmail !== null && (liveEmail.length > 254 || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(liveEmail) || liveEmail.startsWith('.') || liveEmail.includes('..') || liveEmail.includes('.@'))) throw new Error('--live-email requires a valid email address');
  if (liveEmail && !['--verify', '--all'].includes(modes[0])) throw new Error('--live-email requires --verify or --all');
  return { mode: modes[0], liveEmail };
}

const token = () => getSecret('SUPABASE_ACCESS_TOKEN', 'supabase.management');

async function mgmt(pathname, init = {}) {
  const res = await fetch(`${MGMT}${pathname}`, {
    ...init,
    headers: { Authorization: `Bearer ${token()}`, ...(init.headers || {}) },
  });
  return { ok: res.ok, status: res.status, text: await res.text() };
}

export async function assertProject(request = mgmt) {
  const res = await request(`/projects/${PROJECT_REF}/functions`);
  if (!res.ok) throw new Error(`Management token cannot read project ${PROJECT_REF} (${res.status}); refusing to continue`);
  let functions;
  try { functions = JSON.parse(res.text); } catch { throw new Error('Management project visibility response is invalid'); }
  if (!Array.isArray(functions)) throw new Error('Management project visibility response is invalid');
  return functions;
}

async function setSecrets() {
  const ref = projectRef();
  const payload = [
    { name: 'BREVO_API_KEY', value: getSecret('BREVO_API_KEY', 'brevo') },
    { name: 'DISPATCH_LIST_ID', value: DISPATCH_LIST_ID },
    { name: 'DISPATCH_DOI_TEMPLATE_ID', value: DISPATCH_DOI_TEMPLATE_ID },
    { name: 'DISPATCH_CONFIRM_URL', value: DISPATCH_CONFIRM_URL },
    { name: 'DISPATCH_TOKEN_SECRET', value: getSecret('STUDIO_ARK_KEY', 'studio.ark') },
  ];
  const res = await mgmt(`/projects/${ref}/secrets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.error(redact(`✗ secrets: ${res.status} ${res.text.slice(0, 200)}`));
    process.exitCode = 1;
    return false;
  }
  console.log(`✓ secrets: ${payload.map((p) => p.name).join(', ')} set on ${ref}`);
  return true;
}

async function deploy() {
  const ref = projectRef();
  const source = fs.readFileSync(path.join(ROOT, ENTRYPOINT), 'utf8');

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify({
    name: SLUG,
    entrypoint_path: 'index.ts',
    // Mirrors supabase/config.toml. The Desk requires no account, so its
    // signup endpoint must not demand a Supabase JWT at the gateway.
    verify_jwt: false,
  })], { type: 'application/json' }));
  form.append('file', new Blob([source], { type: 'application/typescript' }), 'index.ts');

  const res = await mgmt(`/projects/${ref}/functions/deploy?slug=${SLUG}`, { method: 'POST', body: form });
  if (!res.ok) {
    console.error(redact(`✗ deploy: ${res.status} ${res.text.slice(0, 300)}`));
    process.exitCode = 1;
    return false;
  }
  console.log(`✓ deploy: ${SLUG} live on ${ref}`);
  return true;
}

/**
 * Verify against the LIVE endpoint, not the repo. Three independent checks,
 * including two negative controls — a probe that only ever sends a good
 * address cannot tell a working validator from no validator at all.
 */
export function currentConfirmation(rows, email, startedAt, existingIds = []) {
  const known = new Set(existingIds);
  return rows.find((row) => row.email === email
    && typeof row.messageId === 'string' && row.messageId && !known.has(row.messageId)
    && Number(row.templateId) === Number(DISPATCH_DOI_TEMPLATE_ID)
    && Number.isFinite(Date.parse(row.date))
    && Date.parse(row.date) >= Math.floor(startedAt / 1000) * 1000) || null;
}

async function confirmationLog() {
  const res = await fetch(`${BREVO_API}/smtp/emails?templateId=${DISPATCH_DOI_TEMPLATE_ID}&limit=20`, {
    headers: { 'api-key': getSecret('BREVO_API_KEY', 'brevo'), accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Confirmation log unreadable (HTTP ${res.status})`);
  const body = await res.json();
  if (!Array.isArray(body.transactionalEmails)) throw new Error('Confirmation log shape is invalid');
  return body.transactionalEmails;
}

async function verify({ liveEmail = null } = {}) {
  const ref = projectRef();
  const endpoint = `https://${ref}.supabase.co/functions/v1/${SLUG}`;
  const origin = 'https://vaultsparkstudios.com';
  const results = [];

  const post = async (body, headers = {}) => {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin, ...headers },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.text() };
  };

  const junk = await post({ email: 'not-an-email' });
  results.push(['malformed address rejected', junk.status === 400]);

  const empty = await post({});
  results.push(['missing address rejected', empty.status === 400]);

  const badOrigin = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://evil.test' },
    body: JSON.stringify({ email: 'someone@example.com' }),
  });
  results.push(['foreign origin rejected', badOrigin.status === 403]);

  const preflight = await fetch(endpoint, { method: 'OPTIONS', headers: { Origin: origin } });
  results.push(['preflight allows the site origin',
    preflight.headers.get('access-control-allow-origin') === origin]);

  // The sending identity lives in Brevo, not in this repo, so nothing in the
  // build can catch it drifting back to founder@. Read it from the provider.
  try {
    const tpl = await fetch(`${BREVO_API}/smtp/templates/${DISPATCH_DOI_TEMPLATE_ID}`, {
      headers: { 'api-key': getSecret('BREVO_API_KEY', 'brevo'), accept: 'application/json' },
    });
    const body = tpl.ok ? await tpl.json() : null;
    const from = body?.sender?.email || null;
    results.push([`confirmation mail sends as ${DISPATCH_SENDER} (provider-read, got ${from || 'unknown'})`,
      from === DISPATCH_SENDER]);
    results.push(['confirmation mail is reply-capable', Boolean(body?.replyTo)]);
  } catch (err) {
    results.push([`sender identity readable from Brevo (${String(err).slice(0, 60)})`, false]);
  }

  // Sending requires an explicit real mailbox; no synthetic recipients.
  if (!liveEmail) {
    console.log('  No live send requested: Brevo acceptance and delivery remain unverified.');
  } else {
    const probe = liveEmail;
    const existingIds = (await confirmationLog()).map((row) => row.messageId);
    const startedAt = Date.now();
    const live = await post({ email: probe, source: 'deploy-verify' });
    results.push(['endpoint accepted a valid address', live.status === 200]);
    if (live.status !== 200) console.error(redact(`   live probe body: ${live.body.slice(0, 240)}`));

    // The whole point. A 200 from this endpoint previously meant nothing: Brevo
    // was answering 400 "An active DOI template does not exist", an over-broad
    // /already|exist/ match swallowed it, and this check called that success
    // for a full day while zero emails were sent. Ask the PROVIDER whether a
    // message actually exists for this address.
    // Poll, do not guess. The first version slept 6s against the events
    // endpoint and false-negatived a send that HAD happened — the opposite
    // failure to the one it was written to catch, and just as misleading.
    // The transactional log is immediate; events lag.
    let sent = false;
    let seen = 0;
    for (let attempt = 0; attempt < 6 && !sent; attempt += 1) {
      await new Promise((r) => setTimeout(r, 4000));
      const logRes = await fetch(
        // templateId + email together returns nothing on this API; filter client-side.
        `https://api.brevo.com/v3/smtp/emails?templateId=${DISPATCH_DOI_TEMPLATE_ID}&limit=20`,
        { headers: { 'api-key': getSecret('BREVO_API_KEY', 'brevo'), accept: 'application/json' } },
      );
      const log = logRes.ok ? await logRes.json() : {};
      const rows = log?.transactionalEmails || [];
      seen = rows.length;
      sent = Boolean(currentConfirmation(rows, probe, startedAt, existingIds));
    }
    results.push([`provider log confirms a new confirmation submission for this test (${seen} message(s))`, sent]);
    if (!sent) console.error('   ✗ endpoint returned 200 but the provider has no send event — the integration is NOT working');
  }

  for (const [label, ok] of results) console.log(`  ${ok ? '✓' : '✗'} ${label}`);
  const failed = results.filter(([, ok]) => !ok).length;
  console.log(`verify: ${results.length - failed}/${results.length} passed`);
  if (failed) process.exitCode = 1;
  return failed === 0;
}

export async function main(argv = process.argv.slice(2), operations = {}) {
  const options = parseOptions(argv);
  const ops = { assertProject, setSecrets, deploy, verify,
    settle: () => new Promise((r) => setTimeout(r, 4000)), ...operations };
  await ops.assertProject();
  if (options.mode === '--all') {
    if (await ops.setSecrets() && await ops.deploy()) {
      await ops.settle();
      return ops.verify(options);
    }
    return false;
  }
  if (options.mode === '--secrets') return ops.setSecrets();
  if (options.mode === '--deploy') return ops.deploy();
  return ops.verify(options);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await main(); }
  catch (error) { console.error(redact(error.message)); process.exitCode = 1; }
}


