#!/usr/bin/env node
/* check-public-note-freshness.mjs — S206 public-copy hygiene gate.

   Fails build:check if PROJECT_STATUS.json's visitor-facing fields contain
   session-code patterns (S206, [VERIFY/P0]) or dev jargon — ensuring the
   Nervous System and Studio Hub always show plain-English copy to real visitors.

   Checks:
     publicNote      — must exist, must not contain session codes or bracket notation
     publicNextStep  — same rules (warn-only if missing)

   Exit codes:
     0 — clean (both fields pass)
     1 — ERROR: session code / bracket notation found in a public field
   
   Wires into check-proof-surface.mjs as an advisory (non-fatal warn). */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const STATUS_PATH = path.join(__dirname, '..', 'context', 'PROJECT_STATUS.json');

const SESSION_CODE = /\bS\d{2,3}\b/;
const BRACKET_NOTATION = /\[[\w/]+\]/;
const DEV_JARGON = /\b(VERIFY|STRUCT|INFRA|BLOCKER|FOUNDER|P[0-9]·|build:check|EXIT [0-9])\b/i;

let status;
try {
  status = JSON.parse(readFileSync(STATUS_PATH, 'utf8'));
} catch (e) {
  console.error('check-public-note-freshness: cannot read context/PROJECT_STATUS.json:', e.message);
  process.exit(1);
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
    issues.push(`  ERROR: ${name} contains dev jargon — plain English only: "${value.slice(0,80)}"`);
    exitCode = 1;
  }
}

checkField('publicNote', status.publicNote, true);
checkField('publicNextStep', status.publicNextStep, false);

if (issues.length === 0) {
  console.log('check-public-note-freshness ✓  publicNote and publicNextStep are visitor-clean');
} else {
  issues.forEach(i => console.error(i));
  if (exitCode !== 0) {
    console.error('check-public-note-freshness: public copy contains dev jargon — update context/PROJECT_STATUS.json');
  }
}

process.exit(exitCode);
