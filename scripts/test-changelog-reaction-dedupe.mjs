#!/usr/bin/env node
/**
 * test-changelog-reaction-dedupe.mjs — public-number integrity for the changelog
 * micro-reaction widget (assets/changelog-reactions.js).
 *
 * THE DEFECT THIS PINS: page_feedback aggregates by `path` and has no per-entry
 * column, so the widget's original "one POST per entry reaction" behaviour let a
 * single reader who reacted to six changelog entries post six 'useful' rows.
 * That inflated /changelog's row count AND the site-wide useful_pct on
 * /feedback/insights/ — a reader-count surface reporting reaction counts.
 *
 * The gate: at most ONE row per reader per page per session, using the same
 * localStorage-store-keyed-by-path + 24h cooldown shape assets/rate-page.js
 * uses. Per-entry UI feedback stays local and is unaffected.
 *
 * Usage: node scripts/test-changelog-reaction-dedupe.mjs      (exit 1 on any failure)
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const reactions = require('../assets/changelog-reactions.js');

const cases = [];
const check = (name, ok) => cases.push([name, Boolean(ok)]);

// supabase/migrations/supabase-page-feedback.sql:
//   reaction text not null check (reaction in ('useful','ok','not_useful'))
const ALLOWED = new Set(['useful', 'ok', 'not_useful']);
const NOW = Date.parse('2026-09-14T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

// ── 1. Row contract (unchanged by the de-dupe fix) ───────────────────────────
const rows = ['sparked', 'fire', 'gem'].map(reactions.feedbackRowFor);
check('every widget reaction maps to a CHECK-allowed value on /changelog',
  rows.every((r) => r && ALLOWED.has(r.reaction) && r.path === '/changelog'));
check('rows carry only live columns (path, reaction)',
  rows.every((r) => Object.keys(r).sort().join(',') === 'path,reaction'));
check('unknown reaction → no row', reactions.feedbackRowFor('nope') === null);

// ── 2. One row per reader per page ───────────────────────────────────────────
const store = {};
check('a reader who has never reacted posts', reactions.shouldPostFeedback(store, '/changelog', NOW) === true);

reactions.recordPosted(store, '/changelog', NOW);
check('the ledger records the post keyed by path', store['/changelog'] && store['/changelog'].at === NOW);

// The inflation case: same reader, more entries, seconds later.
check('a SECOND entry reaction in the same session posts nothing',
  reactions.shouldPostFeedback(store, '/changelog', NOW + 1_000) === false);
check('a sixth entry reaction still posts nothing (six entries ≠ six readers)',
  [2, 3, 4, 5, 6].every((n) => reactions.shouldPostFeedback(store, '/changelog', NOW + n * 1_000) === false));

// ── 3. Cooldown + isolation ──────────────────────────────────────────────────
check('still gated just under the 24h cooldown', reactions.shouldPostFeedback(store, '/changelog', NOW + DAY - 1) === false);
check('a genuinely later visit may be counted again', reactions.shouldPostFeedback(store, '/changelog', NOW + DAY) === true);
check('cooldown matches the rate-page widget (24h)', reactions.FEEDBACK_COOLDOWN_MS === DAY);
check('the gate is per path, not global', reactions.shouldPostFeedback(store, '/news', NOW) === true);
check('a malformed/emptied ledger entry fails OPEN (a reader is never silently lost)',
  reactions.shouldPostFeedback({ '/changelog': {} }, '/changelog', NOW) === true
  && reactions.shouldPostFeedback({}, '/changelog', NOW) === true
  && reactions.shouldPostFeedback(null, '/changelog', NOW) === true);

let failed = 0;
for (const [name, pass] of cases) { console.log(`  ${pass ? 'ok' : 'FAIL'} ${name}`); if (!pass) failed += 1; }
console.log(`test-changelog-reaction-dedupe: ${cases.length - failed}/${cases.length} passed`);
process.exit(failed ? 1 : 0);
