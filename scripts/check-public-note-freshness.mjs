#!/usr/bin/env node
/* check-public-note-freshness.mjs — public-copy hygiene gate.

   S206 (voice): fails build:check if PROJECT_STATUS.json's visitor-facing fields
   contain session-code patterns (S206, [VERIFY/P0]) or dev jargon — ensuring the
   Nervous System and Studio Hub always show plain-English copy to real visitors.

   S321 (freshness — the half the name promised and never had):
   -----------------------------------------------------------
   For fifteen sessions this file was named `check-public-note-freshness` and
   contained no freshness check of any kind. Its only assertions were three
   regexes over voice. That is not a cosmetic naming slip: a gate whose name
   promises a property it never measures reads exactly like a passing gate, so
   nobody looks inside it.

   What it missed, measured live in S321: `/login` had recovered and was serving
   a 302 to the provider, while `publicNote` still told every visitor "Sign-in is
   briefly unavailable" and `api/nervous-system.json` published that sentence.
   The gate exited 0 the whole time, because the false claim is plain English and
   jargon-free — it passed every assertion the gate actually owned.

   The honest-dark discipline (CANON-031) is symmetric. A surface built to admit
   degradation must also RETRACT the admission when the degradation ends; a stale
   pessimistic claim is as much an observability lie as a stale optimistic one,
   and on the join path it costs more, because it tells visitors the thing they
   are about to use is broken.

   So: a degradation claim is now a claim that must be CORROBORATED. If the
   visitor-facing copy asserts a degraded state, a live probe receipt must be
   present, recent, and actually degraded. An uncorroborated degradation claim
   fails. This is structural — it keys on the claim's own vocabulary, not on an
   allowlist of known-stale sentences, so the next stale claim is caught without
   anyone adding an entry.

   Checks:
     publicNote      — must exist; no session codes, bracket notation, or jargon
     publicNextStep  — same rules (warn-only if missing)
     degradation     — any degraded-state claim in publicNote/currentFocus/blockers
                       must be corroborated by a fresh, actually-degraded receipt

   Exit codes:
     0 — clean
     1 — ERROR: dev jargon in a public field, or an uncorroborated/stale
         degradation claim

   Wires into check-proof-surface.mjs as an advisory (non-fatal warn).

   Self-test (both directions — a gate that can only go red on one branch is the
   bug this file exists to close):
     node scripts/check-public-note-freshness.mjs --self-test */

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const STATUS_PATH = path.join(ROOT, 'context', 'PROJECT_STATUS.json');
const UPTIME_PATH = path.join(ROOT, 'api', 'uptime.json');

const SESSION_CODE = /\bS\d{2,3}\b/;
const BRACKET_NOTATION = /\[[\w/]+\]/;
const DEV_JARGON = /\b(VERIFY|STRUCT|INFRA|BLOCKER|FOUNDER|P[0-9]·|build:check|EXIT [0-9])\b/i;

/* The vocabulary a visitor-facing surface uses to admit that something is down.
   Deliberately small and concrete: these are assertions about the CURRENT state
   of a service, which is exactly the class that goes stale silently. */
const DEGRADATION_CLAIM = /\b(unavailable|briefly unavailable|is down|outage|degraded|not working|temporarily|503)\b/i;

/* A degradation claim naming sign-in is corroborated by the /login probe leg
   specifically; anything else falls back to the overall verdict. */
const SIGNIN_CLAIM = /\b(sign[- ]?in|sign[- ]?on|login|log[- ]?in)\b/i;

const MAX_RECEIPT_AGE_HOURS = 24;

export function evaluateDegradationClaim({ claims, receipt, now = Date.now(), maxAgeHours = MAX_RECEIPT_AGE_HOURS }) {
  const claimed = claims.filter((c) => c && DEGRADATION_CLAIM.test(c.text));
  if (!claimed.length) return { ok: true, reason: 'no-degradation-claim' };

  if (!receipt) {
    return { ok: false, reason: 'no-receipt', claims: claimed };
  }

  const generatedAt = Date.parse(receipt.generatedAt || '');
  if (!Number.isFinite(generatedAt)) {
    return { ok: false, reason: 'receipt-undated', claims: claimed };
  }
  const ageHours = (now - generatedAt) / 3_600_000;
  if (ageHours > maxAgeHours) {
    return { ok: false, reason: 'receipt-stale', ageHours, claims: claimed };
  }

  /* Does the receipt actually corroborate a degraded state? A probe leg counts as
     corroborating when it is degraded, crashed, or simply not ok. */
  const legDegraded = (leg) => !!leg && (leg.degraded === true || leg.crashed === true || leg.ok === false);
  const signinDegraded = legDegraded(receipt.login);
  const anyDegraded = receipt.overall !== 'up'
    || signinDegraded
    || legDegraded(receipt.liveness)
    || legDegraded(receipt.workerIngest)
    || legDegraded(receipt.rumIngestPost);

  const uncorroborated = claimed.filter((c) => (
    SIGNIN_CLAIM.test(c.text) ? !signinDegraded : !anyDegraded
  ));

  if (uncorroborated.length) {
    return { ok: false, reason: 'claim-contradicted-by-receipt', claims: uncorroborated, ageHours };
  }
  return { ok: true, reason: 'corroborated', ageHours };
}

function readReceipt() {
  if (!existsSync(UPTIME_PATH)) return null;
  try {
    return JSON.parse(readFileSync(UPTIME_PATH, 'utf8'));
  } catch (_) {
    return null;
  }
}

function selfTest() {
  const fresh = new Date().toISOString();
  const healthy = {
    generatedAt: fresh,
    overall: 'up',
    login: { ok: true, degraded: false, crashed: false, status: 302 },
  };
  const degraded = {
    generatedAt: fresh,
    overall: 'up',
    login: { ok: true, degraded: true, crashed: false, status: 503 },
  };
  const claim = [{ field: 'publicNote', text: 'Sign-in is briefly unavailable and says so plainly.' }];
  const noClaim = [{ field: 'publicNote', text: 'Two weeks of new writing are now live on the site.' }];

  const cases = [
    // The direction the old gate could never fail on — the live S321 defect.
    ['a stale sign-in outage claim FAILS against a healthy fresh receipt',
      evaluateDegradationClaim({ claims: claim, receipt: healthy }).ok === false],
    ['...and names the contradiction rather than a generic miss',
      evaluateDegradationClaim({ claims: claim, receipt: healthy }).reason === 'claim-contradicted-by-receipt'],
    // The opposite direction — an honest admission must still PASS, or the gate
    // would punish exactly the honesty CANON-031 requires.
    ['a TRUE sign-in outage claim PASSES against a degraded receipt',
      evaluateDegradationClaim({ claims: claim, receipt: degraded }).ok === true],
    ['copy making no degradation claim is never gated',
      evaluateDegradationClaim({ claims: noClaim, receipt: healthy }).ok === true],
    ['a claim with no receipt at all fails rather than defaulting green',
      evaluateDegradationClaim({ claims: claim, receipt: null }).ok === false],
    ['an undated receipt cannot corroborate anything',
      evaluateDegradationClaim({ claims: claim, receipt: { overall: 'down', login: { degraded: true } } }).ok === false],
    ['a receipt older than the ceiling cannot corroborate a live claim',
      evaluateDegradationClaim({
        claims: claim,
        receipt: { ...degraded, generatedAt: new Date(Date.now() - 72 * 3600_000).toISOString() },
      }).reason === 'receipt-stale'],
    ['a non-sign-in degradation claim reads the overall verdict',
      evaluateDegradationClaim({
        claims: [{ field: 'publicNote', text: 'The site is currently degraded.' }],
        receipt: { generatedAt: fresh, overall: 'down' },
      }).ok === true],
  ];

  let failed = 0;
  for (const [name, passed] of cases) {
    console.log(`${passed ? '  ✓' : '  ✗'} ${name}`);
    if (!passed) failed += 1;
  }
  console.log(failed === 0
    ? `check-public-note-freshness self-test ✓  ${cases.length}/${cases.length}`
    : `check-public-note-freshness self-test ✗  ${failed}/${cases.length} failing`);
  return failed === 0 ? 0 : 1;
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();

  let status;
  try {
    status = JSON.parse(readFileSync(STATUS_PATH, 'utf8'));
  } catch (e) {
    console.error('check-public-note-freshness: cannot read context/PROJECT_STATUS.json:', e.message);
    return 1;
  }

  let exitCode = 0;
  const issues = [];

  function checkField(name, value, required) {
    if (!value || typeof value !== 'string' || value.trim() === '') {
      if (required) issues.push(`  MISSING: ${name} — visitor-facing copy required`);
      else issues.push(`  WARN: ${name} missing — Studio Hub will show no next step`);
      return;
    }
    if (SESSION_CODE.test(value)) {
      issues.push(`  ERROR: ${name} contains session code (${value.match(SESSION_CODE)?.[0]}) — plain English only`);
      exitCode = 1;
    }
    if (BRACKET_NOTATION.test(value)) {
      issues.push(`  ERROR: ${name} contains bracket notation (${value.match(BRACKET_NOTATION)?.[0]}) — plain English only`);
      exitCode = 1;
    }
    if (DEV_JARGON.test(value)) {
      issues.push(`  ERROR: ${name} contains dev jargon — plain English only: "${value.slice(0, 80)}"`);
      exitCode = 1;
    }
  }

  checkField('publicNote', status.publicNote, true);
  checkField('publicNextStep', status.publicNextStep, false);

  /* Freshness half. `blockers` is included because it feeds the same public
     intelligence surfaces, and a retired blocker is the most common stale claim. */
  const claims = [
    { field: 'publicNote', text: status.publicNote },
    { field: 'publicNextStep', text: status.publicNextStep },
    { field: 'currentFocus', text: status.currentFocus },
    ...(Array.isArray(status.blockers) ? status.blockers.map((b, i) => ({ field: `blockers[${i}]`, text: b })) : []),
  ].filter((c) => typeof c.text === 'string' && c.text.trim() !== '');

  const verdict = evaluateDegradationClaim({ claims, receipt: readReceipt() });
  if (!verdict.ok) {
    exitCode = 1;
    const detail = {
      'no-receipt': 'api/uptime.json is absent — a degradation claim cannot be corroborated',
      'receipt-undated': 'api/uptime.json has no parseable generatedAt',
      'receipt-stale': `api/uptime.json is ${verdict.ageHours?.toFixed(1)}h old (ceiling ${MAX_RECEIPT_AGE_HOURS}h)`,
      'claim-contradicted-by-receipt': 'the live probe receipt says the service is healthy',
    }[verdict.reason] || verdict.reason;
    issues.push(`  ERROR: uncorroborated degradation claim — ${detail}`);
    for (const c of verdict.claims || []) {
      issues.push(`         ${c.field}: "${String(c.text).slice(0, 100)}"`);
    }
    issues.push('         Retract the claim if the degradation ended (CANON-031 cuts both ways).');
  }

  if (issues.length === 0) {
    console.log('check-public-note-freshness ✓  publicNote and publicNextStep are visitor-clean and corroborated');
  } else {
    issues.forEach((i) => console.error(i));
    if (exitCode !== 0) {
      console.error('check-public-note-freshness: public copy is stale or contains dev jargon — update context/PROJECT_STATUS.json');
    }
  }

  return exitCode;
}

process.exit(main());
