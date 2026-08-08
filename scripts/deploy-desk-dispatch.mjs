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
 *   --verify    live probe: valid address accepted, junk rejected, CORS pinned
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
const DEFAULT_REF = 'fjnpzjjyhnpmunfoycrp';

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

function projectRef() {
  const url = getSecret('SUPABASE_URL', 'supabase.management');
  try {
    const host = new URL(url).hostname;
    return host.endsWith('.supabase.co') ? host.slice(0, -'.supabase.co'.length) : DEFAULT_REF;
  } catch { return DEFAULT_REF; }
}

const token = () => getSecret('SUPABASE_ACCESS_TOKEN', 'supabase.management');

async function mgmt(pathname, init = {}) {
  const res = await fetch(`${MGMT}${pathname}`, {
    ...init,
    headers: { Authorization: `Bearer ${token()}`, ...(init.headers || {}) },
  });
  return { ok: res.ok, status: res.status, text: await res.text() };
}

async function setSecrets() {
  const ref = projectRef();
  const payload = [
    { name: 'BREVO_API_KEY', value: getSecret('BREVO_API_KEY', 'brevo') },
    { name: 'DISPATCH_LIST_ID', value: DISPATCH_LIST_ID },
    { name: 'DISPATCH_DOI_TEMPLATE_ID', value: DISPATCH_DOI_TEMPLATE_ID },
    { name: 'DISPATCH_CONFIRM_URL', value: DISPATCH_CONFIRM_URL },
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
async function verify() {
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

  // Real deliverability: a genuine double-opt-in send to the founder address.
  // This is the only check that proves Brevo actually accepted the call.
  //
  // It is opt-OUT rather than opt-in because a verify that never touches Brevo
  // cannot distinguish a working integration from a missing API key. But it
  // sends a REAL email and consumes Brevo's free-tier daily send budget, so it
  // must never run unattended: pass --no-live in CI or any loop.
  if (args.has('--no-live')) {
    results.push(['live send skipped (--no-live) — integration NOT proven', true]);
    console.log('  ⚠ --no-live: Brevo acceptance was not exercised; this run cannot prove the integration works.');
  } else {
    const live = await post({ email: 'founder@vaultsparkstudios.com', source: 'deploy-verify' });
    results.push(['valid address accepted (double opt-in dispatched)', live.status === 200]);
    if (live.status !== 200) console.error(redact(`   live probe body: ${live.body.slice(0, 240)}`));
  }

  for (const [label, ok] of results) console.log(`  ${ok ? '✓' : '✗'} ${label}`);
  const failed = results.filter(([, ok]) => !ok).length;
  console.log(`verify: ${results.length - failed}/${results.length} passed`);
  if (failed) process.exitCode = 1;
  return failed === 0;
}

const args = new Set(process.argv.slice(2));
if (args.has('--all')) {
  if (await setSecrets() && await deploy()) {
    await new Promise((r) => setTimeout(r, 4000)); // let the new version go live
    await verify();
  }
} else if (args.has('--secrets')) await setSecrets();
else if (args.has('--deploy')) await deploy();
else if (args.has('--verify')) await verify();
else {
  console.error('Usage: --secrets | --deploy | --verify | --all');
  process.exitCode = 2;
}
