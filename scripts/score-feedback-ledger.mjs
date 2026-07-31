#!/usr/bin/env node
/**
 * score-feedback-ledger.mjs
 *
 * Parses portfolio/FEEDBACK_LOOP_LEDGER.md and computes:
 *   - acceptance_rate   — % of entries with Decision containing "Accepted"
 *   - implementation_rate — % of accepted entries that are Implemented in Outcome
 *
 * These rates feed the infrastructure Engagement sub-score at closeout:
 *   Proposal Acceptance Rate sub-score = floor(acceptance_rate / 4)   → 0–25
 *   Feedback Loop Health sub-score     = floor(implementation_rate / 4) → 0–25
 *
 * Usage:
 *   node scripts/score-feedback-ledger.mjs
 *   node scripts/score-feedback-ledger.mjs --json
 *   node scripts/ops.mjs feedback-score [--json]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const jsonMode = process.argv.includes('--json');

function readText(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

// ── Locate the ledger ─────────────────────────────────────────────────────────
/**
 * S300: this probe had warned "ledger unavailable" in every doctor run for as
 * long as the run has been recorded, because it looked for the ledger ONLY at
 * `<repo>/portfolio/FEEDBACK_LOOP_LEDGER.md`. That file is portfolio-scoped and
 * lives in studio-ops; this repo has a `portfolio/` directory but never that
 * file, so the lookup could not succeed here and no amount of local work would
 * ever clear the warning.
 *
 * A permanently-unfixable warning is worse than no probe: it trains everyone to
 * read the doctor's warning count as noise, which is exactly how a REAL warning
 * gets ignored. Resolve the sibling the same way the propagated-doc and secrets
 * gateways do, and when the sibling is genuinely absent (CI) report a structured
 * `skipped` verdict rather than an error string the caller cannot parse.
 */
const LEDGER_CANDIDATES = [
  path.join(root, 'portfolio', 'FEEDBACK_LOOP_LEDGER.md'),
  path.resolve(root, '..', 'vaultspark-studio-ops', 'portfolio', 'FEEDBACK_LOOP_LEDGER.md'),
];

const ledgerPath = LEDGER_CANDIDATES.find((p) => fs.existsSync(p)) || null;
const ledger     = ledgerPath ? readText(ledgerPath) : '';

if (!ledger) {
  // Structured and exit 0: absence of a PORTFOLIO artifact is not this project's
  // defect, and must not read as a failed local check (CI-safe skip).
  const skip = { skipped: true, reason: 'portfolio ledger not present locally or in the studio-ops sibling', scope: 'portfolio' };
  if (jsonMode) console.log(JSON.stringify(skip));
  else console.log(`feedback-ledger: skipped — ${skip.reason}`);
  process.exit(0);
}

// Extract table rows (skip header and separator rows)
const tableRows = ledger
  .split(/\r?\n/)
  .filter(l => l.startsWith('|') && !l.match(/^[|\s-]+$/))
  .slice(1); // drop header row

const entries = tableRows.map(row => {
  const cols = row.split('|').map(c => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);
  // cols: [Date, Source, Recommendation, Decision, Outcome, Follow-up]
  return {
    date:           cols[0] ?? '',
    source:         cols[1] ?? '',
    recommendation: cols[2] ?? '',
    decision:       cols[3] ?? '',
    outcome:        cols[4] ?? '',
    followup:       cols[5] ?? '',
  };
});

const total    = entries.length;
const accepted = entries.filter(e => /accepted/i.test(e.decision));
const deferred = entries.filter(e => /deferred/i.test(e.decision) || !/accepted/i.test(e.decision));

// Implementation: outcome contains "Implemented" (any form) and NOT "Not implemented"
const implemented = accepted.filter(e =>
  /implemented/i.test(e.outcome) && !/not implemented/i.test(e.outcome)
);
const partial = accepted.filter(e =>
  /partial/i.test(e.outcome)
);

const acceptanceRate     = total > 0 ? Math.round((accepted.length / total) * 100) : 0;
const implementationRate = accepted.length > 0
  ? Math.round((implemented.length / accepted.length) * 100)
  : 0;

// Sub-scores for infrastructure Engagement category (0–25 each)
const proposalAcceptanceSubscore  = Math.floor(acceptanceRate / 4);
const feedbackLoopHealthSubscore  = Math.floor(implementationRate / 4);

if (jsonMode) {
  console.log(JSON.stringify({
    total,
    accepted: accepted.length,
    deferred: deferred.length,
    implemented: implemented.length,
    partial: partial.length,
    acceptanceRate,
    implementationRate,
    proposalAcceptanceSubscore,
    feedbackLoopHealthSubscore,
    generatedAt: new Date().toISOString().slice(0, 10),
  }, null, 2));
  process.exit(0);
}

// ── Human-readable output ─────────────────────────────────────────────────────
console.log('\nFeedback Loop Ledger Score\n' + '─'.repeat(44));
console.log(`  Total entries:       ${total}`);
console.log(`  Accepted:            ${accepted.length}  (${acceptanceRate}%)`);
console.log(`  Deferred/rejected:   ${deferred.length}`);
console.log(`  Implemented:         ${implemented.length}/${accepted.length}  (${implementationRate}%)`);
if (partial.length > 0) {
  console.log(`  Partial:             ${partial.length}`);
}
console.log('');
console.log('  Engagement sub-scores (for closeout SIL — infra rubric):');
console.log(`  Proposal Acceptance Rate: ${proposalAcceptanceSubscore}/25  (${acceptanceRate}% → /4)`);
console.log(`  Feedback Loop Health:     ${feedbackLoopHealthSubscore}/25  (${implementationRate}% implementation → /4)`);
console.log('');
console.log('  How to use at closeout:');
console.log('    Engagement = SessionFrequency/25 + ProposalAcceptance/' + proposalAcceptanceSubscore + ' + OutputConsumption/25 + FeedbackLoop/' + feedbackLoopHealthSubscore);
console.log(`  → Acceptance sub-score: ${proposalAcceptanceSubscore}  · Loop-health sub-score: ${feedbackLoopHealthSubscore}`);
console.log('');
