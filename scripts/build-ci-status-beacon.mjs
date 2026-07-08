#!/usr/bin/env node
/**
 * Build api/ci-status.json from recent GitHub Actions runs.
 *
 * The public beacon distinguishes live terminal states:
 * - green browser/release gates
 * - known provider blockers, such as the Cloudflare Worker R2 token-scope red
 * - unknown/in-progress runs
 * - unexpected failures
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const SELF_TEST = args.includes('--self-test');
const OUT = path.resolve('api', 'ci-status.json');
const WATCHED = ['E2E Test Suite', 'Accessibility Audit', 'Lighthouse CI', 'Deploy Cloudflare Worker'];
const BROWSER_GATES = new Set(['E2E Test Suite', 'Accessibility Audit', 'Lighthouse CI']);
const FAILED = new Set(['failure', 'timed_out', 'startup_failure', 'action_required']);
const KNOWN_BLOCKERS = {
  'Deploy Cloudflare Worker': {
    code: 'cloudflare-worker-r2-token-scope',
    reason: 'CF_WORKER_API_TOKEN lacks R2 Bucket Read/Edit for vaultspark-rum.',
    owner: 'provider-token-scope',
  },
};

function resolveRepo() {
  const envRepo = process.env.REPO || process.env.GITHUB_REPOSITORY;
  if (envRepo) return envRepo;
  try {
    const remote = execFileSync('git', ['config', '--get', 'remote.origin.url'], { encoding: 'utf8', windowsHide: true }).trim();
    const match = remote.match(/github\.com[:/]([^/]+\/.+?)(?:\.git)?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function ghJson(pathname) {
  const repo = resolveRepo();
  if (!repo) throw new Error('REPO/GITHUB_REPOSITORY is required');
  const raw = execFileSync('gh', ['api', `/repos/${repo}${pathname}`], {
    encoding: 'utf8',
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 16 * 1024 * 1024,
  });
  return JSON.parse(raw);
}

function getScheduledWorkflowNames(root = process.cwd()) {
  const wfDir = path.join(root, '.github', 'workflows');
  if (!fs.existsSync(wfDir)) return [];
  return fs.readdirSync(wfDir)
    .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
    .filter((file) => /^\s*schedule:/m.test(fs.readFileSync(path.join(wfDir, file), 'utf8')))
    .map((file) => {
      const src = fs.readFileSync(path.join(wfDir, file), 'utf8');
      const match = src.match(/^name:\s*(.+?)\s*$/m);
      return match ? match[1].replace(/^["']|["']$/g, '') : file.replace(/\.ya?ml$/, '');
    });
}

function latestWatchedRuns(runs, watched = WATCHED) {
  const latest = {};
  for (const run of runs) {
    const name = run.name;
    if (!watched.includes(name)) continue;
    if (latest[name]) continue;
    latest[name] = {
      name,
      status: run.conclusion || run.status,
      rawStatus: run.status || null,
      conclusion: run.conclusion || null,
      updatedAt: run.updated_at || null,
      url: run.html_url || null,
    };
  }
  return watched.map((name) => latest[name] || {
    name,
    status: 'unknown',
    rawStatus: 'unknown',
    conclusion: null,
    updatedAt: null,
    url: null,
  });
}

function scheduledStatus(runs, scheduledNames) {
  const scheduledSet = new Set(scheduledNames);
  const scheduledByName = {};
  for (const run of runs) {
    if (run.event !== 'schedule') continue;
    const name = run.name;
    if (!scheduledSet.has(name)) continue;
    scheduledByName[name] ||= [];
    scheduledByName[name].push({ conclusion: run.conclusion, status: run.status, updatedAt: run.updated_at });
  }
  return scheduledNames.map((name) => {
    const history = scheduledByName[name] || [];
    const completed = history.filter((run) => run.conclusion);
    let streak = 0;
    for (const run of completed) {
      if (FAILED.has(run.conclusion)) streak += 1;
      else break;
    }
    return {
      name,
      lastConclusion: completed[0] ? completed[0].conclusion : 'unknown',
      lastUpdatedAt: history[0] ? history[0].updatedAt : null,
      recentConclusions: completed.slice(0, 3).map((run) => run.conclusion),
      dead: streak >= 2,
      streak,
    };
  });
}

function classify(workflows, scheduledWorkflows) {
  const knownTerminalBlockers = [];
  for (const workflow of workflows) {
    const blocker = KNOWN_BLOCKERS[workflow.name];
    if (blocker && FAILED.has(workflow.status)) {
      workflow.status = 'known_blocked';
      workflow.knownBlocker = blocker;
      knownTerminalBlockers.push({ workflow: workflow.name, ...blocker, updatedAt: workflow.updatedAt });
    }
  }

  const browserGatesGreen = workflows
    .filter((workflow) => BROWSER_GATES.has(workflow.name))
    .every((workflow) => workflow.status === 'success');
  const unexpectedFailures = workflows.filter((workflow) => FAILED.has(workflow.status));
  const inProgress = workflows.filter((workflow) => ['queued', 'in_progress', 'requested', 'waiting', 'pending'].includes(workflow.status));
  const unknown = workflows.filter((workflow) => workflow.status === 'unknown');
  const hasDeadCron = scheduledWorkflows.some((workflow) => workflow.dead);

  let terminalState = 'green';
  if (unexpectedFailures.length) terminalState = 'failing';
  else if (inProgress.length) terminalState = 'in_progress';
  else if (unknown.length) terminalState = 'unknown';
  else if (knownTerminalBlockers.length) terminalState = 'known_blocked';
  else if (hasDeadCron) terminalState = 'scheduled_attention';

  const allGreen = workflows.every((workflow) => workflow.status === 'success') && !hasDeadCron;
  const summary = (() => {
    if (terminalState === 'green') return 'All CI gates passing — E2E, Accessibility, Lighthouse, and Worker deploy. No dead crons.';
    if (terminalState === 'known_blocked' && browserGatesGreen) {
      return 'Browser/release gates are green. Worker deploy is terminal-known-blocked on Cloudflare R2 token scope, not in progress.';
    }
    if (terminalState === 'failing') return 'One or more CI gates have unexpected failures. Studio is investigating.';
    if (terminalState === 'in_progress') return 'CI gates are still running.';
    if (terminalState === 'scheduled_attention') return 'Push gates green. One or more scheduled workflows are dead.';
    return 'CI gate status is unknown.';
  })();

  return { allGreen, browserGatesGreen, hasDeadCron, terminalState, knownTerminalBlockers, summary };
}

export function buildPayload({ runs, scheduledNames, now = new Date() }) {
  const workflows = latestWatchedRuns(runs);
  const scheduledWorkflows = scheduledStatus(runs, scheduledNames);
  const classification = classify(workflows, scheduledWorkflows);
  return {
    generatedAt: now.toISOString(),
    generatedBy: 'scripts/build-ci-status-beacon.mjs',
    ...classification,
    workflows,
    scheduledWorkflows,
  };
}

if (SELF_TEST) {
  const now = new Date('2026-07-08T12:00:00Z');
  const base = (name, conclusion, status = 'completed') => ({ name, conclusion, status, event: 'push', updated_at: '2026-07-08T11:00:00Z' });
  const known = buildPayload({
    now,
    scheduledNames: [],
    runs: [
      base('E2E Test Suite', 'success'),
      base('Accessibility Audit', 'success'),
      base('Lighthouse CI', 'success'),
      base('Deploy Cloudflare Worker', 'failure'),
    ],
  });
  const progress = buildPayload({
    now,
    scheduledNames: [],
    runs: [
      base('E2E Test Suite', 'success'),
      base('Accessibility Audit', 'success'),
      { name: 'Lighthouse CI', conclusion: null, status: 'in_progress', event: 'push', updated_at: '2026-07-08T11:00:00Z' },
      base('Deploy Cloudflare Worker', 'failure'),
    ],
  });
  const unexpected = buildPayload({
    now,
    scheduledNames: [],
    runs: [
      base('E2E Test Suite', 'failure'),
      base('Accessibility Audit', 'success'),
      base('Lighthouse CI', 'success'),
      base('Deploy Cloudflare Worker', 'failure'),
    ],
  });
  const cases = [
    ['known blocker is terminal-known-blocked', known.terminalState === 'known_blocked' && known.knownTerminalBlockers.length === 1],
    ['in-progress beats known blocker', progress.terminalState === 'in_progress'],
    ['unexpected failure beats known blocker', unexpected.terminalState === 'failing'],
    ['browser gates are separate from Worker blocker', known.browserGatesGreen === true && known.allGreen === false],
  ];
  let failed = 0;
  for (const [name, ok] of cases) {
    console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
    if (!ok) failed += 1;
  }
  console.log(`\nself-test: ${cases.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

const runs = ghJson('/actions/runs?per_page=80&branch=main').workflow_runs || [];
const payload = buildPayload({ runs, scheduledNames: getScheduledWorkflowNames() });
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${OUT}: ${payload.terminalState}${payload.knownTerminalBlockers.length ? ` (${payload.knownTerminalBlockers.length} known blocker)` : ''}`);
