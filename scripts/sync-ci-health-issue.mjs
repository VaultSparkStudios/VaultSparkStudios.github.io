#!/usr/bin/env node
/**
 * sync-ci-health-issue.mjs  (S223)
 *
 * Called by ci-health-monitor.yml after check-scheduled-workflow-staleness.mjs
 * writes its --json output to a file. Creates, updates, or closes a single
 * pinned GitHub Issue (label: ci-health) so dead-cron alerts escalate beyond
 * the doctor table and into a place humans watch.
 *
 * Idempotent: finds any open `ci-health` issue and edits it in-place (no
 * duplicates). Closes it with a resolution comment when all workflows are green.
 *
 * Usage:
 *   node scripts/sync-ci-health-issue.mjs <staleness-result.json>
 *   node scripts/sync-ci-health-issue.mjs --self-test
 *
 * Requires: $GH_TOKEN (or gh auth login) with issues:write scope.
 */

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SELF_TEST = process.argv.includes('--self-test');
const LABEL = 'ci-health';
const ISSUE_TITLE = '[CI Health] Scheduled workflow degradation detected';

function gh(...args) {
  const r = spawnSync('gh', args, { cwd: ROOT, encoding: 'utf8', timeout: 30000, windowsHide: true });
  if (r.status !== 0) throw new Error((r.stderr || r.stdout || 'gh error').trim().split('\n')[0]);
  return r.stdout.trim();
}

function ghSafe(...args) {
  try { return { ok: true, out: gh(...args) }; }
  catch (e) { return { ok: false, err: e.message }; }
}

/** Build the Markdown body for the open issue. */
function buildBody(broken, checkedCount) {
  const rows = broken.map((b) =>
    `| \`${b.name}\` | ⛔ ${b.streak} consecutive failures | \`${b.recent.join('`, `')}\` |`,
  ).join('\n');
  return [
    `## CI Health Alert`,
    ``,
    `**${broken.length} scheduled workflow(s)** have been red for ≥2 consecutive scheduled runs.`,
    ``,
    `| Workflow | Status | Recent conclusions |`,
    `|---|---|---|`,
    rows,
    ``,
    `_(Checked ${checkedCount} scheduled workflows total. Last updated: ${new Date().toISOString().slice(0, 10)}.)_`,
    ``,
    `### What to do`,
    `1. Click the workflow name above → Actions → see the failing run log`,
    `2. Root-fix the cause (missing file, changed API, gitignored input, etc.)`,
    `3. Trigger a manual run to confirm green`,
    `4. This issue auto-closes on the next CI Health Monitor run when all workflows pass.`,
    ``,
    `> Created + maintained by [ci-health-monitor.yml](.github/workflows/ci-health-monitor.yml) · probe: [check-scheduled-workflow-staleness.mjs](scripts/check-scheduled-workflow-staleness.mjs)`,
  ].join('\n');
}

function ensureLabel() {
  const check = spawnSync('gh', ['label', 'list', '--search', LABEL, '--json', 'name'], {
    cwd: ROOT, encoding: 'utf8', timeout: 15000, windowsHide: true,
  });
  if (check.status === 0) {
    try {
      const labels = JSON.parse(check.stdout);
      if (labels.some((l) => l.name === LABEL)) return;
    } catch { /* fall through to create */ }
  }
  // Create the label (ignore if already exists)
  spawnSync('gh', ['label', 'create', LABEL, '--color', 'D93F0B', '--description', 'Scheduled CI workflow health alert'],
    { cwd: ROOT, encoding: 'utf8', timeout: 15000, windowsHide: true });
}

function findOpenIssue() {
  const r = spawnSync('gh', ['issue', 'list', '--label', LABEL, '--state', 'open',
    '--json', 'number,title', '--limit', '5'],
    { cwd: ROOT, encoding: 'utf8', timeout: 15000, windowsHide: true });
  if (r.status !== 0) return null;
  try {
    const issues = JSON.parse(r.stdout);
    return issues.length > 0 ? issues[0] : null;
  } catch { return null; }
}

export function buildBodyExported(broken, checkedCount) {
  return buildBody(broken, checkedCount);
}

function main(resultPath) {
  let result;
  try {
    result = JSON.parse(readFileSync(resultPath, 'utf8'));
  } catch (e) {
    // Staleness check may have exited before writing (crash/network). Advisory —
    // don't fail the monitoring workflow on a missing probe result.
    console.warn(`sync-ci-health-issue: cannot read ${resultPath}: ${e.message} — skipping issue sync.`);
    return;
  }

  const { ok, broken = [], checked = 0, skipped } = result;

  if (skipped) {
    console.log('sync-ci-health-issue: staleness check was skipped (no network/gh) — no issue change.');
    return;
  }

  ensureLabel();
  const existing = findOpenIssue();

  if (!ok && broken.length > 0) {
    const body = buildBody(broken, checked);
    if (existing) {
      // Update the existing issue body in-place (idempotent)
      const edit = ghSafe('issue', 'edit', String(existing.number),
        '--body', body, '--title', ISSUE_TITLE);
      if (edit.ok) {
        console.log(`sync-ci-health-issue: updated open issue #${existing.number} with ${broken.length} dead cron(s).`);
      } else {
        console.warn(`sync-ci-health-issue: could not edit issue #${existing.number}: ${edit.err}`);
      }
    } else {
      // Create a new issue
      const create = ghSafe('issue', 'create',
        '--title', ISSUE_TITLE,
        '--body', body,
        '--label', LABEL);
      if (create.ok) {
        console.log(`sync-ci-health-issue: opened new issue: ${create.out}`);
      } else {
        console.warn(`sync-ci-health-issue: could not create issue: ${create.err}`);
      }
    }
  } else {
    // All clear
    if (existing) {
      const comment = `All scheduled workflows are now passing (${checked} checked). Closing this issue automatically.`;
      ghSafe('issue', 'comment', String(existing.number), '--body', comment);
      const close = ghSafe('issue', 'close', String(existing.number));
      if (close.ok) {
        console.log(`sync-ci-health-issue: all clear — closed issue #${existing.number}.`);
      } else {
        console.warn(`sync-ci-health-issue: could not close issue #${existing.number}: ${close.err}`);
      }
    } else {
      console.log(`sync-ci-health-issue: all clear — no open ${LABEL} issue. Nothing to do.`);
    }
  }
}

function runSelfTest() {
  // Test body generation (doesn't call gh)
  const body = buildBody(
    [{ name: 'Refresh Live Data', streak: 8, recent: ['failure', 'failure', 'failure'] }],
    4,
  );
  const assert = (c, m) => { if (!c) throw new Error(`self-test FAIL: ${m}`); };
  assert(body.includes('[CI Health]') || body.includes('CI Health'), 'body must contain CI Health header');
  assert(body.includes('Refresh Live Data'), 'body must mention the broken workflow');
  assert(body.includes('8 consecutive'), 'body must mention the streak count');
  assert(body.includes('ci-health-monitor.yml'), 'body must link to the monitor workflow');

  const body2 = buildBody([], 4);
  // When called with empty broken list (shouldn't happen, but test defensively)
  assert(!body2.includes('undefined'), 'empty broken list must not emit undefined');

  console.log('sync-ci-health-issue self-test passed (2/2)');
}

const RUN_DIRECT = import.meta.url === `file://${process.argv[1]}`
  || process.argv[1]?.endsWith('sync-ci-health-issue.mjs');

if (RUN_DIRECT) {
  if (SELF_TEST) {
    runSelfTest();
  } else {
    const resultPath = process.argv.find((a) => a.endsWith('.json'));
    if (!resultPath) {
      console.error('Usage: node scripts/sync-ci-health-issue.mjs <staleness-result.json>');
      process.exit(1);
    }
    main(resultPath);
  }
}
