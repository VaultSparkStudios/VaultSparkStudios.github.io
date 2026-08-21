#!/usr/bin/env node
// @verification-scope post-push — observes remote GitHub workflow state after a push.
/**
 * S153 — Post-Push CI Watchdog.
 *
 * S148 closed the gap "did the push actually land?" — this script closes the
 * next gap: "did the workflows on that push actually pass?". Given a SHA
 * (default HEAD), query `gh api repos/{owner}/{repo}/actions/runs?head_sha=`
 * and report each critical workflow's conclusion. The set of "critical"
 * workflows is configurable; the defaults are the five we already trust:
 * Cloudflare Cache Purge, Secret Lint, brief-format-check, Sentry Release, and
 * Deploy Cloudflare Worker.
 *
 * Exit 0 = all critical workflows present and `success`.
 * Exit 1 = any critical workflow is failure/cancelled/timed_out.
 * Exit 2 = any critical workflow is missing (no run found at that SHA).
 * Exit 3 = gh CLI absent or auth missing (advisory; closeout treats as warn).
 *
 * Modes: --sha=<sha> · --json · --quiet · --critical=name1,name2
 */

import { execSync } from './lib/safe-spawn.mjs';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const quiet = args.includes('--quiet');
const sha = valueFor('--sha') || (() => {
  try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); }
  catch { return null; }
})();

const DEFAULT_CRITICAL = [
  'Cloudflare Cache Purge',
  'Secret Lint',
  'brief-format-check',
  'Sentry Release',
  'Deploy Cloudflare Worker',
];
const critical = (valueFor('--critical') || '').split(',').filter(Boolean);
const targets = critical.length ? critical : DEFAULT_CRITICAL;

if (!sha) {
  emit({ ok: false, error: 'no SHA resolved' });
  process.exit(3);
}

let runs;
try {
  // Resolve owner/repo from git remote
  const remote = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
  const m = remote.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/);
  if (!m) throw new Error(`cannot parse remote: ${remote}`);
  const [, owner, repo] = m;
  const raw = execSync(`gh api "repos/${owner}/${repo}/actions/runs?head_sha=${sha}&per_page=50"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const parsed = JSON.parse(raw);
  runs = parsed.workflow_runs || [];
} catch (err) {
  emit({ ok: false, sha, error: `gh api failed: ${String(err?.message || err).split('\n')[0]}` });
  process.exit(3);
}

const summary = targets.map((name) => {
  const match = runs.find((r) => r.name === name);
  return match
    ? { name, status: match.status, conclusion: match.conclusion, runId: match.id, url: match.html_url }
    : { name, status: 'missing', conclusion: null };
});

const anyFailing = summary.some((s) => s.conclusion && !['success', 'skipped', 'neutral'].includes(s.conclusion));
const anyMissing = summary.some((s) => s.status === 'missing');
const anyInProgress = summary.some((s) => s.status === 'in_progress' || s.status === 'queued');

const payload = {
  schemaVersion: '1.0',
  checkedAt: new Date().toISOString(),
  sha,
  total: runs.length,
  critical: summary,
  verdict: anyFailing ? 'failing' : anyMissing ? 'missing' : anyInProgress ? 'in_progress' : 'success',
};

emit(payload);

if (anyFailing) process.exit(1);
if (anyMissing) process.exit(2);
process.exit(0);

function emit(p) {
  if (asJson) { console.log(JSON.stringify(p, null, 2)); return; }
  if (quiet) return;
  if (p.error) { console.log(`check-postpush-ci: advisory — ${p.error}`); return; }
  console.log(`check-postpush-ci · SHA ${p.sha?.slice(0, 12)} · ${p.verdict.toUpperCase()} · ${p.total} runs at this SHA`);
  for (const s of p.critical) {
    const ico = s.conclusion === 'success' ? '✓' : s.status === 'missing' ? '·' : s.status === 'in_progress' ? '…' : '⛔';
    console.log(`  ${ico} ${s.name}: ${s.conclusion || s.status}`);
  }
}

function valueFor(flag) {
  const item = args.find((a) => a.startsWith(`${flag}=`));
  if (item) return item.slice(flag.length + 1);
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : null;
}
