#!/usr/bin/env node
// @verification-scope startup — project-local brief freshness and intent check.
/**
 * check-brief-staleness.mjs — Intent-aware brief refresh gate (G12, S118).
 *
 * /start currently skips brief regeneration if the cached brief is <24h old.
 * That's wrong when the founder's session intent has shifted: a brief
 * generated for an "execution" intent is suboptimal for an incoming
 * "planning" intent (different signals matter).
 *
 * Logic:
 *   1. Read docs/STARTUP_BRIEF.md generated-at + cached intent.
 *   2. Read current intent from scripts/lib/classify-session-intent or
 *      .cache/session-intent.json (set by detect-session-mode).
 *   3. If age > 24h            → STALE (age)
 *      If brief.intent != now  → STALE (intent-shift)
 *      Else                    → FRESH
 *
 * Exits 0 (fresh) or 1 (stale). /start interprets exit != 0 as "regenerate".
 *
 * Usage:
 *   node scripts/check-brief-staleness.mjs            # human output
 *   node scripts/check-brief-staleness.mjs --json
 */

import fs from 'fs';
import path from 'path';
import { buildBriefSemanticFingerprint, parseBriefSemanticFingerprint } from './lib/brief-semantic-fingerprint.mjs';

const BRIEF = path.join('docs', 'STARTUP_BRIEF.md');
const INTENT_CACHE = path.join('.cache', 'session-intent.json');
const JSON_OUT = process.argv.includes('--json');

function intentFromBrief(text) {
  // Brief format embeds intent in a comment line written by render-startup-brief.
  // Look for: <!-- session-intent: execution -->  (added by S118 G12)
  const m = text.match(/<!--\s*session-intent:\s*([a-z]+)\s*-->/i);
  return m ? m[1].toLowerCase() : null;
}

function generatedAt(text) {
  const m = text.match(/<!--\s*generated-at:\s*(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function currentIntent() {
  try {
    const c = JSON.parse(fs.readFileSync(INTENT_CACHE, 'utf8'));
    return c.intent || null;
  } catch { return null; }
}

function ageHours(dateStr) {
  if (!dateStr) return Infinity;
  const ms = Date.now() - new Date(dateStr + 'T00:00:00Z').getTime();
  return ms / 36e5;
}

// S154 audit #5 ([SIL:2 S148 #2]) — warm-start delta eligibility.
// A fresh brief whose closeout snapshot exists AND that introduces no NEW
// critical (⛔) line vs that snapshot can be consumed as a delta
// (docs/STARTUP_BRIEF_DELTA.md) instead of the full ~21KB read. A new ⛔
// always forces the full brief — criticals can never hide behind a delta.
const SNAPSHOT = path.join('.cache', 'startup-brief.prev.md');
function deltaEligible(text) {
  if (!fs.existsSync(SNAPSHOT)) return { eligible: false, why: 'no-snapshot' };
  const snap = fs.readFileSync(SNAPSHOT, 'utf8');

  // S318 [audit #2] — IDENTITY IS NOT ELIGIBILITY; IT IS PROOF THE BRIEF NEVER RE-RENDERED.
  //
  // The closeout snapshots the brief it just rendered, so at the next /start the
  // snapshot and the brief are frequently the SAME BYTES. The critical-diff below
  // then subtracts a set from itself: `newCrit` is empty BY CONSTRUCTION, this gate
  // returns its strongest verdict, and render-brief-delta.mjs diffs a file against a
  // copy of itself — score delta 0, no new genius items, no new warnings — and emits
  // "No material changes since previous snapshot."
  //
  // Measured at the S318 /start: brief and snapshot were byte-identical
  // (md5 d30c3bc5790a9eb6d29dec5869664fe3, 8218 bytes each), the gate said
  // `fresh-delta-ok · snapshot-match-no-new-critical · age=8h`, and the agent read a
  // 10-line artifact as "nothing changed" while the doctor had moved to 55 warnings
  // in those 8 hours. An empty delta and a quiet studio were rendered in one voice.
  //
  // The honest verdict is not-fresh, which routes through this gate's EXISTING exit-1
  // "regen" channel (0 full · 1 regen · 2 delta) that /start step 5 already handles as
  // re-render + validate + read. No new protocol branch — just a true answer.
  if (text === snap) return { eligible: false, vacuous: true, why: 'snapshot-identical-delta-vacuous' };

  const crit = (s) => s.split('\n').filter(l => l.includes('⛔')).map(l => l.trim());
  const newCrit = crit(text).filter(l => !snap.includes(l));
  if (newCrit.length) return { eligible: false, why: `new-critical(${newCrit.length})` };
  return { eligible: true, why: 'snapshot-match-no-new-critical' };
}

function check() {
  if (!fs.existsSync(BRIEF)) {
    return { fresh: false, reason: 'missing', briefExists: false };
  }
  const text = fs.readFileSync(BRIEF, 'utf8');
  const briefDate = generatedAt(text);
  const briefIntent = intentFromBrief(text);
  const nowIntent = currentIntent();
  const age = ageHours(briefDate);
  const expectedSemantic = buildBriefSemanticFingerprint(process.cwd());
  const briefSemantic = parseBriefSemanticFingerprint(text);

  if (age > 24) return { fresh: false, reason: 'age', ageHours: Math.round(age), briefDate };
  if (expectedSemantic && !briefSemantic) {
    return { fresh: false, reason: 'semantic-fingerprint-missing', expectedHash: expectedSemantic.hash, ageHours: Math.round(age) };
  }
  if (expectedSemantic && briefSemantic.hash !== expectedSemantic.hash) {
    return { fresh: false, reason: 'semantic-input-shift', briefHash: briefSemantic.hash, expectedHash: expectedSemantic.hash, expected: expectedSemantic, ageHours: Math.round(age) };
  }
  if (briefIntent && nowIntent && briefIntent !== nowIntent) {
    return { fresh: false, reason: 'intent-shift', briefIntent, nowIntent, ageHours: Math.round(age) };
  }
  const delta = deltaEligible(text);
  if (delta.eligible) {
    return { fresh: true, delta: true, reason: `fresh-delta-ok · ${delta.why}`, briefIntent, nowIntent, ageHours: Math.round(age) };
  }
  // S318 [audit #2] — a baseline identical to its subject means the brief was never
  // re-rendered, so BOTH the delta and the full brief would be a stale read. Not-fresh
  // (exit 1) sends /start down the re-render path, which is the only one that produces
  // a real answer. Every other ineligibility (a new ⛔, no snapshot) still means the
  // brief itself is current and readable in full — unchanged behaviour.
  if (delta.vacuous) {
    return { fresh: false, delta: false, reason: delta.why, briefIntent, nowIntent, ageHours: Math.round(age) };
  }
  return { fresh: true, delta: false, deltaWhy: delta.why, reason: 'within-24h-and-intent-match', briefIntent, nowIntent, ageHours: Math.round(age) };
}

const r = check();
if (JSON_OUT) {
  console.log(JSON.stringify(r, null, 2));
} else {
  const tag = r.fresh ? (r.delta ? '✓ FRESH·Δ' : '✓ FRESH') : '⟳ STALE';
  console.log(`${tag}  brief-staleness · ${r.reason}` +
    (r.briefIntent ? ` · brief=${r.briefIntent}` : '') +
    (r.nowIntent ? ` · now=${r.nowIntent}` : '') +
    (r.ageHours != null ? ` · age=${r.ageHours}h` : ''));
  if (r.delta) console.log('  → read docs/STARTUP_BRIEF_DELTA.md (run: node scripts/render-brief-delta.mjs) instead of the full brief');
}
// S156 #22 — adoption telemetry. The warm-start delta gate (S154 #5) claims
// 60-90% brief-token savings; per D-S155.2 a claim without a ledger is
// theater. Record every gate verdict + actual byte sizes so the SKILL HEALTH
// tile can cite MEASURED adoption % and savings.
try {
  const exitCode = r.fresh ? (r.delta ? 2 : 0) : 1;
  const sz = (p) => { try { return fs.statSync(p).size; } catch { return null; } };
  const ledgerPath = path.join('.cache', 'brief-delta-ledger.json');
  let ledger = { _doc: 'Brief staleness-gate verdicts (S156 #22). exit: 0 full · 1 regen · 2 delta. Sizes measured at decision time.', entries: [] };
  try { ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8')); } catch {}
  ledger.entries.push({
    ts: new Date().toISOString(),
    exit: exitCode,
    fullBytes: sz(path.join('docs', 'STARTUP_BRIEF.md')),
    deltaBytes: sz(path.join('docs', 'STARTUP_BRIEF_DELTA.md')),
  });
  ledger.entries = ledger.entries.slice(-200);
  fs.mkdirSync('.cache', { recursive: true });
  fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
} catch { /* telemetry is never fatal */ }

// Exit contract: 0 fresh(full) · 1 stale(regenerate) · 2 fresh+delta-eligible.
process.exit(r.fresh ? (r.delta ? 2 : 0) : 1);
