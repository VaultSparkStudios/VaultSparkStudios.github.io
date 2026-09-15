#!/usr/bin/env node
/*
 * deploy-member-newsletter.mjs — S344 (extended: Brevo + unsubscribe route)
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
 *      guard would reject it.
 *
 * Fixing either one alone changes nothing: the cron would go from 404 to 401.
 *
 * A third precondition: the newsletter may not reach members without a working
 * unsubscribe (CAN-SPAM / GDPR / RFC 8058). supabase/functions/newsletter-unsubscribe
 * provides it and is deployed FIRST, so no email can ever link to a missing route.
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
 *   node scripts/deploy-member-newsletter.mjs --status         # what is true right now
 *   node scripts/deploy-member-newsletter.mjs --brevo-secret   # set BREVO_API_KEY from gateway capability `brevo`
 *   node scripts/deploy-member-newsletter.mjs --deploy         # deploy newsletter-unsubscribe, then send-member-newsletter
 *   node scripts/deploy-member-newsletter.mjs --secret         # mint + set NEWSLETTER_SECRET on both sides
 *   node scripts/deploy-member-newsletter.mjs --verify [--unsubscribe-base=https://…]
 *   node scripts/deploy-member-newsletter.mjs --self-test
 *
 * DELIBERATELY ABSENT: any flag that triggers a real send, preview, or dry run.
 * Verification stops at the 401 boundary for the sender, and for the unsubscribe
 * route probes only a malformed token and a random well-formed token that matches
 * no member (no subscription can change). The first preview and real send belong
 * to a founder-observed `workflow_dispatch`.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from './lib/safe-spawn.mjs';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MGMT = 'https://api.supabase.com/v1';
const SLUG = 'send-member-newsletter';
const UNSUB_SLUG = 'newsletter-unsubscribe';
const ENTRYPOINT = `supabase/functions/${SLUG}/index.ts`;
const UNSUB_ENTRYPOINT = `supabase/functions/${UNSUB_SLUG}/index.ts`;

// Deploy order matters: the unsubscribe route must exist before any mail links to it.
// Both callers are non-Supabase (a GitHub Action with a shared-secret Bearer; mail
// clients / mailbox providers), so a gateway JWT check would reject the only
// legitimate callers. Mirrors supabase/config.toml.
const FUNCTIONS = [
  { slug: UNSUB_SLUG, entrypoint: UNSUB_ENTRYPOINT, verify_jwt: false },
  { slug: SLUG, entrypoint: ENTRYPOINT, verify_jwt: false },
];

// This site's own project, asserted by the repo (see the CSP in api/staging-health.json
// and .cache/supabase-migration-last.json), NOT read from the shared gateway slot.
const PROJECT_REF = 'fjnpzjjyhnpmunfoycrp';

const argv = process.argv.slice(2);
const args = new Set(argv);
const argValue = (name) => argv.find((a) => a.startsWith(`${name}=`))?.slice(name.length + 1);
const redact = (s) => String(s).replace(/\b(sbp_[a-z0-9]+|re_[A-Za-z0-9_-]+|xkeysib-[A-Za-z0-9-]+|eyJ[\w.-]{20,})/g, '[redacted]');

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
  console.log(`project        : ${PROJECT_REF} (reachable, ${fns.length} functions deployed)`);
  for (const fn of FUNCTIONS) {
    const live = fns.find((f) => f.slug === fn.slug);
    const jwt = live && typeof live.verify_jwt === 'boolean' ? `, verify_jwt=${live.verify_jwt}` : '';
    console.log(`${fn.slug.padEnd(23)}: ${live ? `DEPLOYED (${live.status}, v${live.version}${jwt})` : 'NOT DEPLOYED'}`);
  }
  // Names only — the secrets endpoint returns digests, and we print neither.
  const sec = await mgmt(`/projects/${PROJECT_REF}/secrets`);
  if (sec.ok) {
    const names = new Set(JSON.parse(sec.text).map((s) => s.name));
    for (const name of ['BREVO_API_KEY', 'NEWSLETTER_SECRET', 'NEWSLETTER_UNSUBSCRIBE_BASE']) {
      console.log(`function env ${name.padEnd(28)}: ${names.has(name) ? 'present' : 'absent'}`);
    }
  } else {
    console.log(`function env   : unknown (${sec.status})`);
  }
  let ghSecret = null;
  try {
    const out = execFileSync('gh', ['secret', 'list', '--json', 'name'], { cwd: ROOT, encoding: 'utf8', windowsHide: true });
    ghSecret = JSON.parse(out).some((s) => s.name === 'NEWSLETTER_SECRET');
  } catch { ghSecret = null; }
  console.log(`NEWSLETTER_SECRET (GitHub Actions): ${ghSecret === null ? 'unknown (gh unavailable)' : ghSecret ? 'present' : 'ABSENT — the Action sends an empty Bearer'}`);
  return { ghSecret };
}

/** Management API multipart body for one self-contained function file. */
export function deployForm(fn, source) {
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify({
    name: fn.slug,
    entrypoint_path: 'index.ts',
    verify_jwt: fn.verify_jwt,
  })], { type: 'application/json' }));
  form.append('file', new Blob([source], { type: 'application/typescript' }), 'index.ts');
  return form;
}

async function deploy() {
  await assertProject();
  const only = argValue('--only');
  for (const fn of FUNCTIONS) {
    if (only && only !== fn.slug) continue;
    const source = fs.readFileSync(path.join(ROOT, fn.entrypoint), 'utf8');
    const res = await mgmt(`/projects/${PROJECT_REF}/functions/deploy?slug=${fn.slug}`, { method: 'POST', body: deployForm(fn, source) });
    if (!res.ok) {
      console.error(redact(`✗ deploy ${fn.slug}: ${res.status} ${res.text.slice(0, 300)}`));
      // Stop: never deploy the sender if its unsubscribe route failed to deploy.
      process.exitCode = 1;
      return false;
    }
    console.log(`✓ deploy: ${fn.slug} live on ${PROJECT_REF} (verify_jwt=${fn.verify_jwt})`);
  }
  return true;
}

/** POST function env values; any echo of a value in the error text is scrubbed. */
async function putFunctionSecrets(entries) {
  const res = await mgmt(`/projects/${PROJECT_REF}/secrets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entries),
  });
  if (!res.ok) {
    let text = res.text;
    for (const { value } of entries) text = text.split(value).join('[redacted]');
    return { ok: false, status: res.status, detail: redact(text).slice(0, 200) };
  }
  return { ok: true, status: res.status };
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

  const res = await putFunctionSecrets([{ name: 'NEWSLETTER_SECRET', value }]);
  if (!res.ok) {
    console.error(`✗ function secret: ${res.status} ${res.detail}`);
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

/** BREVO_API_KEY from the secrets gateway (CANON-012). Names only in output. */
export async function resolveBrevoKey(getSecretFn) {
  const value = getSecretFn('BREVO_API_KEY', 'brevo');
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

async function setBrevoSecret() {
  const { getSecret } = await secrets();
  const value = await resolveBrevoKey(getSecret);
  if (!value) {
    console.error('✗ BREVO_API_KEY is MISSING in the secrets gateway (capability `brevo`). Run /intake-credentials.');
    process.exitCode = 1;
    return false;
  }
  await assertProject();
  const res = await putFunctionSecrets([{ name: 'BREVO_API_KEY', value }]);
  if (!res.ok) {
    console.error(`✗ function secret BREVO_API_KEY: ${res.status} ${res.detail}`);
    process.exitCode = 1;
    return false;
  }
  console.log(`✓ function secret: BREVO_API_KEY set on ${PROJECT_REF} (from gateway capability \`brevo\`)`);
  return true;
}

/**
 * The style-src hash the FUNCTION ITSELF will send, derived from the source about to be
 * (or already) deployed — not a constant copied into this script. The page's only
 * stylesheet is the inline <style>PAGE_STYLE</style>, allowed by exactly this hash.
 */
export function styleHashFromSource(source) {
  const m = String(source).match(/export const PAGE_STYLE = `([\s\S]*?)`;/);
  if (!m) return null;
  return `sha256-${crypto.createHash('sha256').update(m[1], 'utf8').digest('base64')}`;
}

/**
 * Judge the unsubscribe-route probes. Pure, so --self-test covers it.
 *   malformed : GET ?token=not-a-token          → must be 400
 *   unknown   : GET ?token=<random 32 hex>       → must be 200; text/html proves browser render
 *   oneClick  : POST one-click, same unknown token → must be 200 (proves the service-role RPC path)
 *
 * The page is served through a Worker proxy in front of the Supabase gateway, and the
 * CSP is the header most easily replaced in transit. A restrictive substitute
 * (`default-src 'none'`, or anything carrying `sandbox`) leaves status, content-type and
 * form markup all intact while the stylesheet is blocked and the submit button is inert
 * — the page looks broken to the member and passes every other probe. So the SERVED CSP
 * is asserted to carry the function's own style-src hash and no sandbox directive.
 */
export function judgeUnsubscribeProbes({ malformed, unknown, oneClick, expectedStyleHash }) {
  const problems = [];
  if (malformed.status === 404) problems.push('route NOT_FOUND — newsletter-unsubscribe is not deployed');
  else if (malformed.status !== 400) problems.push(`malformed token returned ${malformed.status}, expected 400`);
  if (unknown.status !== 200) problems.push(`well-formed unknown token GET returned ${unknown.status}, expected 200`);
  const contentType = String(unknown.contentType || '').toLowerCase();
  const html = unknown.status === 200 && contentType.startsWith('text/html');
  const confirmForm = /<form method="post"/.test(String(unknown.body || ''));
  if (unknown.status === 200 && !confirmForm) problems.push('GET did not return the confirmation form');
  if (oneClick && oneClick.status !== 200) problems.push(`one-click POST returned ${oneClick.status}, expected 200 (RPC or service-role path broken)`);

  const csp = String(unknown.csp || '').trim();
  let cspOk = false;
  if (unknown.status === 200) {
    if (!expectedStyleHash) {
      problems.push('could not derive the expected style-src hash from the newsletter-unsubscribe source — CSP assertion is unverifiable');
    } else if (!csp) {
      problems.push("served page carries NO content-security-policy — the function's own CSP was stripped in transit; the page renders unstyled");
    } else if (!csp.includes(`'${expectedStyleHash}'`)) {
      problems.push(`served CSP does not carry the function's style-src '${expectedStyleHash}' — it was REPLACED in transit (served: ${csp.slice(0, 160)}). The inline stylesheet is blocked: the page renders unstyled and the unsubscribe button is unrecognisable.`);
    } else if (/(?:^|[;\s])sandbox(?:\s|;|$)/i.test(csp)) {
      problems.push(`served CSP contains a sandbox directive — the confirmation form cannot submit, so the visible unsubscribe is dead (served: ${csp.slice(0, 160)})`);
    } else {
      cspOk = true;
    }
  }
  return { ok: problems.length === 0, browserHtml: html, cspOk, problems };
}

async function probeUnsubscribe(base, expectedStyleHash) {
  const sep = base.includes('?') ? '&' : '?';
  const unknownToken = crypto.randomBytes(16).toString('hex'); // matches no member row
  const m = await fetch(`${base}${sep}token=not-a-token`, { redirect: 'manual' });
  await m.text();
  const u = await fetch(`${base}${sep}token=${unknownToken}`, { redirect: 'manual' });
  const body = (await u.text()).slice(0, 4000);
  const o = await fetch(`${base}${sep}token=${unknownToken}`, {
    method: 'POST', redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'List-Unsubscribe=One-Click',
  });
  await o.text();
  return judgeUnsubscribeProbes({
    malformed: { status: m.status },
    unknown: {
      status: u.status,
      contentType: u.headers.get('content-type'),
      csp: u.headers.get('content-security-policy'),
      body,
    },
    oneClick: { status: o.status },
    expectedStyleHash,
  });
}

/**
 * Prove both endpoints exist and their guards work — WITHOUT sending mail or
 * changing any subscription.
 */
async function verify() {
  let ok = true;
  const url = `https://${PROJECT_REF}.supabase.co/functions/v1/${SLUG}`;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
  const body = (await res.text()).slice(0, 200);
  console.log(`unauthenticated POST ${url}`);
  console.log(`  -> ${res.status} ${body}`);
  if (res.status === 404) {
    console.error('✗ still NOT_FOUND — the function is not deployed');
    ok = false;
  } else if (res.status === 200) {
    console.error('✗ 200 on an UNAUTHENTICATED call — the shared-secret guard is not protecting the send path');
    ok = false;
  } else if (!isGuardRejection(res.status, body)) {
    console.error('✗ endpoint did not return the function’s expected unauthenticated rejection; guard verification is inconclusive');
    ok = false;
  } else {
    console.log(`✓ function returned its expected unauthenticated rejection (${res.status}); no authorised send was requested`);
  }

  const bases = [`https://${PROJECT_REF}.supabase.co/functions/v1/${UNSUB_SLUG}`];
  const custom = argValue('--unsubscribe-base');
  if (custom) bases.push(custom);
  const expectedStyleHash = styleHashFromSource(fs.readFileSync(path.join(ROOT, UNSUB_ENTRYPOINT), 'utf8'));
  console.log(`expected served style-src: ${expectedStyleHash ?? '(UNRESOLVED — source shape changed)'}`);
  let browserReady = false;
  for (const base of bases) {
    const isDefault = base === bases[0];
    const verdict = await probeUnsubscribe(base, expectedStyleHash);
    console.log(`unsubscribe probes ${base}`);
    for (const p of verdict.problems) console.error(`  ✗ ${p}`);
    if (!verdict.ok) { ok = false; continue; }
    console.log('  ✓ malformed token → 400; unknown token GET → 200 confirmation; one-click POST → 200 (no member affected)');
    if (verdict.cspOk) console.log("  ✓ served CSP carries the function's own style-src hash and no sandbox directive");
    if (verdict.browserHtml) {
      console.log('  ✓ served as text/html — renders in a browser');
      if (!isDefault) browserReady = true;
    } else if (isDefault) {
      console.log('  ! served as text/plain: Supabase rewrites text/html GETs on *.supabase.co. One-click works here;');
      console.log('    the visible link needs a custom-domain proxy (pass --unsubscribe-base=https://… to verify it).');
    } else {
      console.error('  ✗ custom base did not serve text/html — the visible unsubscribe link will not render');
      ok = false;
    }
  }
  if (!browserReady) {
    console.log('! real sends stay refused by send-member-newsletter until NEWSLETTER_UNSUBSCRIBE_BASE is a verified custom-domain base.');
  }
  if (!ok) process.exitCode = 1;
  return ok;
}

async function selfTest() {
  let secretInvocation = null;
  const fixtureSecret = 'fixture-secret-never-a-real-credential';
  writeActionsSecret(fixtureSecret, (...call) => { secretInvocation = call; });
  const config = fs.readFileSync(path.join(ROOT, 'supabase', 'config.toml'), 'utf8');
  const pinned = (slug) => new RegExp(`\\[functions\\.${slug}\\][\\s\\S]{0,80}?verify_jwt\\s*=\\s*false`).test(config);
  const ownSource = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('async function selfTest')[0];
  const form = deployForm(FUNCTIONS[0], 'export {}');
  const meta = JSON.parse(await form.get('metadata').text());
  const unsubSource = fs.readFileSync(path.join(ROOT, UNSUB_ENTRYPOINT), 'utf8');
  const HASH = styleHashFromSource(unsubSource);
  const GOOD_CSP = `default-src 'none'; style-src '${HASH}'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`;
  const probe = (m, u, ct, b, o, csp = GOOD_CSP) => judgeUnsubscribeProbes({
    malformed: { status: m },
    unknown: { status: u, contentType: ct, body: b, csp },
    oneClick: { status: o },
    expectedStyleHash: HASH,
  });
  const FORM = '<form method="post" action="?token=x">';
  const checks = [
    ['secret travels through stdin, never command arguments', secretInvocation[2].input === fixtureSecret && !secretInvocation[1].includes(fixtureSecret) && secretInvocation[2].stdio[0] === 'pipe'],
    ['function rejection is recognized', isGuardRejection(401, 'Unauthorized')],
    ['server, gateway and successful responses cannot prove the guard', [200, 204, 302, 403, 404, 429, 500, 503].every(status => !isGuardRejection(status, 'Unauthorized')) && !isGuardRejection(401, '{"message":"JWT rejected"}')],
    ['project ref is pinned to this site, not the shared slot', PROJECT_REF === 'fjnpzjjyhnpmunfoycrp'],
    ['entrypoints exist', FUNCTIONS.every((fn) => fs.existsSync(path.join(ROOT, fn.entrypoint)))],
    ['config.toml pins verify_jwt=false for send-member-newsletter', pinned(SLUG)],
    ['config.toml pins verify_jwt=false for newsletter-unsubscribe', pinned(UNSUB_SLUG)],
    ['unsubscribe route deploys before the sender', FUNCTIONS[0].slug === UNSUB_SLUG && FUNCTIONS[1].slug === SLUG],
    ['deploy metadata carries verify_jwt=false', meta.verify_jwt === false && meta.name === UNSUB_SLUG && meta.entrypoint_path === 'index.ts'],
    ['no flag can trigger a real send, preview, or dry run', !/--send\b|previewTo|"dryRun"|\{\s*"?send"?\s*:\s*true/.test(ownSource)],
    ['redact() hides a management PAT', redact('sbp_deadbeefcafe') === '[redacted]'],
    ['redact() hides a Brevo key', redact('xkeysib-0123abcd-XYZ') === '[redacted]'],
    ['BREVO_API_KEY is read from capability `brevo`', await (async () => {
      let asked = null;
      const v = await resolveBrevoKey((k, cap) => { asked = [k, cap]; return ' fixture-brevo '; });
      return v === 'fixture-brevo' && asked[0] === 'BREVO_API_KEY' && asked[1] === 'brevo';
    })()],
    ['missing BREVO_API_KEY resolves to null (no phantom set)', (await resolveBrevoKey(() => null)) === null && (await resolveBrevoKey(() => '  ')) === null],
    ['unsubscribe probes: healthy custom domain passes as browser HTML', (() => { const v = probe(400, 200, 'text/html; charset=utf-8', FORM, 200); return v.ok && v.browserHtml; })()],
    ['unsubscribe probes: supabase.co text/plain rewrite passes but is not browser HTML', (() => { const v = probe(400, 200, 'text/plain', FORM, 200); return v.ok && !v.browserHtml; })()],
    ['unsubscribe probes: undeployed / unguarded / broken RPC all fail', !probe(404, 404, 'application/json', '', 404).ok && !probe(200, 200, 'text/html', FORM, 200).ok && !probe(400, 200, 'text/html', FORM, 503).ok && !probe(400, 200, 'text/html', 'no form', 200).ok],
    // The CSP is derived from the source that gets deployed, so a stylesheet edit that
    // forgets the hash cannot pass by matching a constant pasted into this script.
    ['style-src hash is derived from the deployed unsubscribe source', typeof HASH === 'string' && /^sha256-[A-Za-z0-9+/]{43}=$/.test(HASH) && styleHashFromSource('no page style here') === null],
    ['unsubscribe probes: served CSP carrying the function style hash passes', (() => { const v = probe(400, 200, 'text/html; charset=utf-8', FORM, 200, GOOD_CSP); return v.ok && v.cspOk; })()],
    ['unsubscribe probes: gateway-replaced CSP fails even though status/type/form are fine', (() => {
      const replaced = probe(400, 200, 'text/html; charset=utf-8', FORM, 200, "default-src 'none'; sandbox");
      const stripped = probe(400, 200, 'text/html; charset=utf-8', FORM, 200, '');
      const wrongHash = probe(400, 200, 'text/html; charset=utf-8', FORM, 200, "default-src 'none'; style-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='");
      return [replaced, stripped, wrongHash].every((v) => !v.ok && !v.cspOk)
        && /sandbox/i.test(replaced.problems.join(' '))
        && /NO content-security-policy/.test(stripped.problems.join(' '))
        && /REPLACED in transit/.test(wrongHash.problems.join(' '));
    })()],
    ['unsubscribe probes: a sandbox directive inside an otherwise correct CSP still fails', (() => {
      const v = probe(400, 200, 'text/html', FORM, 200, `${GOOD_CSP}; sandbox`);
      return !v.ok && !v.cspOk && /sandbox/i.test(v.problems.join(' '));
    })()],
  ];
  let pass = 0;
  checks.forEach(([name, ok]) => { if (ok) pass += 1; else console.error(`  ✗ ${name}`); });
  console.log(`deploy-member-newsletter --self-test: ${pass}/${checks.length} passed`);
  if (pass !== checks.length) process.exit(1);
}

if (args.has('--self-test')) await selfTest();
else if (args.has('--status')) await status();
else if (args.has('--brevo-secret')) await setBrevoSecret();
else if (args.has('--deploy')) await deploy();
else if (args.has('--secret')) await setSecret();
else if (args.has('--verify')) await verify();
else {
  console.error('Usage: --status | --brevo-secret | --deploy [--only=<slug>] | --secret | --verify [--unsubscribe-base=https://…] | --self-test');
  process.exitCode = 1;
}
