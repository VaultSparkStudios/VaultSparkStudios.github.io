#!/usr/bin/env node
// record-review.mjs — S361 plan, review loop. Appends one receipt per independent-review round to
// portfolio/ops/review-loop-receipts.ndjson. The ecosystem scorecard's "Independent review loop"
// area counts these, so a receipt must describe a review that actually happened: it requires the
// reviewed subject (commit range or item), the verdict, and the finding counts.
//
// Usage:
//   node scripts/record-review.mjs --subject "<commit range or item>" --verdict pass|fix|reject \
//     --findings <n> [--fixed <n>] [--round <n>] [--reviewer studio-reviewer] [--note "..."] [--session S361]
//     [--judged craft=70,judgement=72,honesty=80,efficiency=65,learning=70]   (SIL v4 shadow judged half)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
if (args.includes('--help')) { console.log('Usage: node scripts/record-review.mjs --subject <s> --verdict pass|fix|reject --findings <n> [--fixed <n>] [--round <n>] [--reviewer <r>] [--note <t>] [--session <S>]'); process.exit(0); }
const opt = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };

const subject = opt('subject');
const verdict = opt('verdict');
const findings = Number(opt('findings'));
if (!subject || !['pass', 'fix', 'reject'].includes(verdict) || !Number.isInteger(findings) || findings < 0) {
  console.error('⛔ need --subject, --verdict pass|fix|reject and --findings <non-negative integer>');
  process.exit(2);
}
const fixed = opt('fixed') == null ? null : Number(opt('fixed'));
if (fixed != null && (!Number.isInteger(fixed) || fixed < 0 || fixed > findings)) { console.error('⛔ --fixed must be an integer between 0 and --findings'); process.exit(2); }

// S362 (D-S362.7) — the SIL v4 (sil-v4-s361) shadow reads its five JUDGED categories from
// here and never self-scores them. Without a way to record them the judged half stayed null
// on every closeout. --judged craft=70,judgement=72,honesty=80,efficiency=65,learning=70
// (each an integer 0-100; omit a category rather than guess it — omitted stays null).
// One source for the judged vocabulary: the scorer that reads these (policy-drift twin, S362).
const JUDGED_CATEGORIES=['craft','judgement','honesty','efficiency','learning']; // Canonical vocabulary; local receipt ownership.
export { JUDGED_CATEGORIES };
const judgedRaw = opt('judged');
let judged = null;
if (judgedRaw != null) {
  judged = {};
  for (const part of String(judgedRaw).split(',').map((s) => s.trim()).filter(Boolean)) {
    const [k, v] = part.split('=').map((s) => s.trim());
    const n = Number(v);
    if (!JUDGED_CATEGORIES.includes(k) || v === '' || !Number.isInteger(n) || n < 0 || n > 100) {
      console.error(`⛔ --judged entry "${part}" invalid: use ${JUDGED_CATEGORIES.join('|')}=<integer 0-100>`);
      process.exit(2);
    }
    judged[k] = n;
  }
  const selfNames = ['self', 'author', 'session-agent', 'implementer'];
  if (selfNames.includes(String(opt('reviewer') || 'studio-reviewer'))) { console.error('⛔ judged scores must come from an independent reviewer, not the author'); process.exit(2); }
}

const receipt = {
  at: new Date().toISOString(),
  session: opt('session') || null,
  subject,
  reviewer: opt('reviewer') || 'studio-reviewer',
  round: Number(opt('round') || 1),
  verdict,
  findings,
  fixed,
  ...(judged ? { judged } : {}),
  note: opt('note') || null,
};
const file = path.join(ROOT, 'portfolio', 'ops', 'review-loop-receipts.ndjson');
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.appendFileSync(file, JSON.stringify(receipt) + '\n');
console.log(`✓ review receipt · ${verdict} · ${findings} finding(s)${fixed != null ? ` · ${fixed} fixed` : ''} · ${subject}`);
