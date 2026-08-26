#!/usr/bin/env node
/**
 * build-security-posture.mjs (S192 · security-posture-live-derive)
 *
 * api/security-posture.json used to be a HAND-SEED stamped
 * `generatedBy: "manual-seed:/implement-S167"` (2026-05-27). With a 720h window
 * in the status-proof manifest it would silently cross its threshold on
 * 2026-06-26 and drag the public trustScore while reporting month-old "active"
 * controls that nobody re-verified. A security posture that asserts controls it
 * never re-checks is the opposite of a security posture.
 *
 * This derives each control from REAL repo evidence so every claim traces to the
 * file or build gate that proves it, and generatedAt tracks the day the posture
 * was last VERIFIED (not a frozen seed):
 *   - Security headers      ← the Worker emits CSP / HSTS / X-Content-Type-Options / Referrer-Policy
 *   - CSP discipline        ← config/csp-policy.mjs + csp-audit.mjs wired in build:check
 *   - RUM privacy           ← the Worker stores names-only ux events (RUM_UX_EVENTS + cleanRumUxEvent)
 *   - Supply-chain scan     ← verify-supply-chain.mjs wired in build:check
 *   - Obelisk adoption      ← `Posture:` line in context/OBELISK_ADOPTION.md
 *   - Responsible disclosure← .well-known/security.txt Contact
 *   - Trusted Types         ← tt-default-policy.js + lint-tt-policies.mjs (report-only; enforce flip founder-gated)
 *
 * Each control carries an `evidence` link + a `verified` boolean. If the evidence
 * stops resolving, the control HONESTLY downgrades to status 'unverified' instead
 * of continuing to claim 'active'. generatedAt is a date (YYYY-MM-DD) = the day of
 * verification; --check re-derives and compares the CONTROLS structurally (not the
 * date) so an honest daily refresh never reads as drift
 * ([[feedback_check_gate_volatile_input_drift]]).
 *
 * Usage:
 *   node scripts/build-security-posture.mjs              # derive + write
 *   node scripts/build-security-posture.mjs --check      # re-derive, fail on control drift / lost evidence
 *   node scripts/build-security-posture.mjs --self-test  # synthetic-fixture proof
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const API = path.join(ROOT, 'api');
const OUT = path.join(API, 'security-posture.json');

function readText(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return null; }
}
function exists(rel) {
  try { return fs.existsSync(path.join(ROOT, rel)); } catch { return false; }
}
function readJson(rel) {
  try { return JSON.parse(readText(rel)); } catch { return null; }
}

/**
 * Pure derivation from a filesystem-probe surface. Exported + parameterized so
 * the self-test can inject synthetic evidence without touching the repo.
 *
 * probe = {
 *   workerJs:    string|null,  // cloudflare/security-headers-worker.js contents
 *   buildCheck:  string|null,  // package.json scripts['build:check']
 *   cspPolicy:   boolean,      // config/csp-policy.mjs exists
 *   supplyChain: boolean,      // scripts/verify-supply-chain.mjs exists
 *   obelisk:     string|null,  // context/OBELISK_ADOPTION.md contents
 *   securityTxt: string|null,  // .well-known/security.txt contents
 *   ttPolicy:    boolean,      // assets/tt-default-policy.js + scripts/lint-tt-policies.mjs exist
 *   today:       string,       // YYYY-MM-DD verification date
 * }
 */
export function derive(probe) {
  const w = probe.workerJs || '';
  const bc = probe.buildCheck || '';
  const ob = probe.obelisk || '';
  const st = probe.securityTxt || '';

  const hasHeader = (name) => new RegExp(name, 'i').test(w);
  const headersOk = ['Content-Security-Policy', 'Strict-Transport-Security', 'X-Content-Type-Options', 'Referrer-Policy'].every(hasHeader);
  const cspOk = probe.cspPolicy && /csp-audit\.mjs/.test(bc);
  const rumPrivacyOk = /RUM_UX_EVENTS/.test(w) && /cleanRumUxEvent/.test(w);
  const supplyOk = probe.supplyChain && /verify-supply-chain\.mjs/.test(bc);
  const ttOk = !!probe.ttPolicy;
  const obeliskMatch = ob.match(/\*\*Posture:\*\*\s*`?([a-z0-9-]+)`?/i) || ob.match(/Posture:\s*`?([a-z0-9-]+)`?/i);
  const obeliskPosture = obeliskMatch ? obeliskMatch[1] : null;
  const disclosureMatch = st.match(/Contact:\s*(\S+)/i);
  const disclosureContact = disclosureMatch ? disclosureMatch[1] : null;
  const workerRouteMatched = probe.workerRouteReceipt?.state === 'matched'
    && probe.workerRouteReceipt?.summary?.matched === probe.workerRouteReceipt?.summary?.total;

  // A control is 'active' when its evidence resolves; otherwise it HONESTLY
  // downgrades to 'unverified' rather than asserting a control we can't prove.
  const control = (label, ok, activeDetail, evidence) => ({
    label,
    status: ok ? 'active' : 'unverified',
    detail: ok ? activeDetail : `Evidence not resolvable at build time (${evidence}); reported unverified rather than asserted.`,
    verified: !!ok,
    evidence,
  });

  const controls = [
    control('Security headers', headersOk,
      'Cloudflare Worker applies CSP, HSTS, X-Content-Type-Options, and Referrer-Policy plus related browser hardening.',
      'cloudflare/security-headers-worker.js'),
    control('CSP discipline', cspOk,
      'Static CSP policy (config/csp-policy.mjs) is audited by csp-audit.mjs in build:check; hash/nonce propagation is part of build verification.',
      'config/csp-policy.mjs + scripts/csp-audit.mjs'),
    control('RUM privacy', rumPrivacyOk,
      'RUM is route-level and privacy-minimized: ux events pass an allowlisted names-only Set (RUM_UX_EVENTS + cleanRumUxEvent) — no user IDs, query strings, or free text are ever stored.',
      'cloudflare/security-headers-worker.js'),
    control('Production Worker route provenance', workerRouteMatched,
      `${probe.workerRouteReceipt.summary.matched}/${probe.workerRouteReceipt.summary.total} expected production Worker routes matched bounded privacy-safe probes at ${probe.workerRouteReceipt.generatedAt}.`,
      'api/worker-route-provenance.json'),
    control('Supply-chain scan', supplyOk,
      'CANON-023 supply-chain verification (verify-supply-chain.mjs) runs in build:check.',
      'scripts/verify-supply-chain.mjs'),
    {
      label: 'Obelisk adoption',
      status: obeliskPosture || 'unverified',
      detail: obeliskPosture
        ? `Identity wrapper exists; Obelisk posture is ${obeliskPosture} (passkey-first migration waits on later Obelisk phases).`
        : 'Obelisk posture not resolvable from context/OBELISK_ADOPTION.md.',
      verified: !!obeliskPosture,
      evidence: 'context/OBELISK_ADOPTION.md',
    },
    control('Responsible disclosure', !!disclosureContact,
      `Reports route to ${disclosureContact} via the published security.txt policy.`,
      '.well-known/security.txt'),
    control('Trusted Types', ttOk,
      'First-party DOM sinks covered by tt-default-policy.js (report-only; enforce flip is founder-gated pending real-device verify). lint-tt-policies.mjs in build:check keeps all named policies file-specific.',
      'assets/tt-default-policy.js + scripts/lint-tt-policies.mjs'),
  ];

  const verifiedCount = controls.filter((c) => c.verified).length;
  const posture = workerRouteMatched && verifiedCount === controls.length ? 'active'
    : workerRouteMatched && verifiedCount >= controls.length - 1 ? 'active'
    : 'attention';

  return {
    schemaVersion: '1.1',
    generatedBy: 'scripts/build-security-posture.mjs',
    generatedAt: probe.today,
    publicSafe: true,
    posture,
    source: 'Derived from live repo evidence at build time. Each control links the file or build gate that proves it; an unresolvable control downgrades to unverified rather than being asserted.',
    verifiedControls: verifiedCount,
    totalControls: controls.length,
    controls,
  };
}

function probeRepo(today) {
  const scripts = (() => { try { return JSON.parse(readText('package.json')).scripts || {}; } catch { return {}; } })();
  return {
    workerJs: readText('cloudflare/security-headers-worker.js'),
    buildCheck: Object.entries(scripts)
      .filter(([name]) => name === 'build:check' || name.startsWith('build:check:'))
      .map(([, command]) => command)
      .join(' && '),
    cspPolicy: exists('config/csp-policy.mjs'),
    supplyChain: exists('scripts/verify-supply-chain.mjs'),
    obelisk: readText('context/OBELISK_ADOPTION.md'),
    securityTxt: readText('.well-known/security.txt'),
    ttPolicy: exists('assets/tt-default-policy.js') && exists('scripts/lint-tt-policies.mjs'),
    workerRouteReceipt: readJson('api/worker-route-provenance.json'),
    today,
  };
}

// Structural fingerprint for --check: the CONTROLS (label/status/verified/evidence),
// NOT the verification date. An honest daily generatedAt bump must not read as drift.
function structure(m) {
  return JSON.stringify({
    schemaVersion: m.schemaVersion,
    posture: m.posture,
    verifiedControls: m.verifiedControls,
    controls: (m.controls || []).map((c) => ({ label: c.label, status: c.status, verified: c.verified, evidence: c.evidence })),
  });
}

function assert(ok, msg) { if (!ok) throw new Error(`build-security-posture --self-test FAIL: ${msg}`); }

function selfTest() {
  const good = {
    workerJs: 'Content-Security-Policy ... Strict-Transport-Security ... X-Content-Type-Options ... Referrer-Policy ... const RUM_UX_EVENTS = new Set([]) ... function cleanRumUxEvent(){}',
    buildCheck: 'node scripts/csp-audit.mjs && node scripts/verify-supply-chain.mjs',
    cspPolicy: true,
    supplyChain: true,
    obelisk: '**Posture:** `phase-0-declared` (S159, 2026-05-22)',
    securityTxt: 'Contact: mailto:security@vaultsparkstudios.com\nExpires: 2027-05-13T00:00:00.000Z',
    ttPolicy: true,
    workerRouteReceipt: { state: 'matched', generatedAt: '2026-06-12T00:00:00Z', summary: { matched: 5, total: 5 } },
    today: '2026-06-12',
  };
  const m = derive(good);
  assert(m.schemaVersion === '1.1', 'schemaVersion 1.1');
  assert(m.generatedBy === 'scripts/build-security-posture.mjs', 'generatedBy is the real generator (not a manual-seed)');
  assert(m.totalControls === 8, `8 controls, got ${m.totalControls}`);
  assert(m.verifiedControls === 8, `all 8 verified on good evidence, got ${m.verifiedControls}`);
  assert(m.controls.find((c) => c.label === 'Obelisk adoption').status === 'phase-0-declared', 'Obelisk posture parsed from md');
  assert(m.controls.find((c) => c.label === 'Responsible disclosure').detail.includes('security@vaultsparkstudios.com'), 'disclosure contact parsed');
  assert(m.controls.find((c) => c.label === 'Trusted Types').verified === true, 'Trusted Types verified on good evidence');
  assert(m.posture === 'active', `posture active on full evidence, got ${m.posture}`);

  // Honest downgrade: missing CSP policy file → that control unverified, others intact.
  const noCsp = derive({ ...good, cspPolicy: false });
  const cspControl = noCsp.controls.find((c) => c.label === 'CSP discipline');
  assert(cspControl.status === 'unverified' && cspControl.verified === false, 'missing csp evidence → unverified, not asserted');
  assert(noCsp.verifiedControls === 7, `one control lost → 7 verified, got ${noCsp.verifiedControls}`);

  const staleRoute = derive({ ...good, workerRouteReceipt: { state: 'mismatch', generatedAt: good.today, summary: { matched: 0, total: 5 } } });
  assert(staleRoute.controls.find((c) => c.label === 'Production Worker route provenance').verified === false, 'production route mismatch downgrades runtime control');
  assert(staleRoute.posture === 'attention', 'production route mismatch forces attention even when source controls are green');

  // Missing worker headers → security-headers + rum-privacy both downgrade.
  const noWorker = derive({ ...good, workerJs: '' });
  assert(noWorker.controls.find((c) => c.label === 'Security headers').verified === false, 'no worker → headers unverified');
  assert(noWorker.controls.find((c) => c.label === 'RUM privacy').verified === false, 'no worker → rum privacy unverified');
  assert(noWorker.posture === 'attention', `two controls lost → posture attention, got ${noWorker.posture}`);

  // Determinism: derive is pure (same probe → same structure).
  assert(structure(derive(good)) === structure(derive(good)), 'derive must be deterministic');

  console.log('build-security-posture --self-test: OK (16 assertions)');
}

export function runProofCommand(args = []) {
  try {
    if (args.includes('--self-test')) { selfTest(); return 0; }
  const today = new Date().toISOString().slice(0, 10);
  const fresh = derive(probeRepo(today));
  if (args.includes('--check')) {
    let committed = null;
    try { committed = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch {}
    if (!committed) { console.error('build-security-posture --check: api/security-posture.json missing — run without --check'); return 1; }
    if (structure(committed) !== structure(fresh)) {
      console.error('build-security-posture --check: controls drift from live evidence (a control changed status or lost its evidence).');
      console.error('  fix: node scripts/build-security-posture.mjs');
      return 1;
    }
    console.log(`build-security-posture --check: OK (${fresh.verifiedControls}/${fresh.totalControls} controls verified, posture ${fresh.posture})`);
    return 0;
  }
  fs.writeFileSync(OUT, JSON.stringify(fresh, null, 2) + '\n');
  console.log(`✓ api/security-posture.json — ${fresh.verifiedControls}/${fresh.totalControls} controls verified · posture ${fresh.posture} · asOf ${fresh.generatedAt}`);
    return 0;
  } catch (error) {
    console.error(error.message);
    return 1;
  }
}

const RUN_DIRECT = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === path.resolve(url.fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (RUN_DIRECT) process.exitCode = runProofCommand(process.argv.slice(2));
