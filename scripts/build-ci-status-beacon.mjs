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

/**
 * Classify a failed `gh api` invocation as transient (worth a retry / a graceful
 * degrade) vs. a hard error (misconfig, auth, a real 4xx worth surfacing).
 *
 * Transient = GitHub's own weather, not our repo's health: 5xx gateway errors,
 * secondary-rate-limit 429s, and network hiccups. A health beacon that hard-fails
 * (and paints CI red) on GitHub's 503 is lying about the repo — so these degrade
 * to last-known-good instead of crashing the workflow.
 *
 * Pure + exported so the retry policy is self-testable without touching the network.
 */
export function isTransientGhError(err) {
  if (!err) return false;
  const code = typeof err.status === 'number' ? err.status : null;
  // gh CLI exit 1 on API error; the signal we can trust is in stderr/message.
  const text = `${err.stderr ? err.stderr.toString() : ''}\n${err.message || ''}`;
  if (/HTTP\s+(5\d\d|429)\b/i.test(text)) return true;
  if (/\b(429|502|503|504)\b/.test(text) && /rate limit|gateway|unavailable|timeout|timed out/i.test(text)) return true;
  if (/temporarily unavailable|service unavailable|bad gateway|gateway time-?out|secondary rate limit|abuse detection/i.test(text)) return true;
  if (/ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|ECONNREFUSED|socket hang up|network is unreachable/i.test(text)) return true;
  // gh emits exit 1 for API failures; if we could not even resolve a status, and the
  // message names a 5xx/timeout above we already returned true. Everything else is hard.
  if (code === null && /could not connect|connection (reset|refused|closed)/i.test(text)) return true;
  return false;
}

const sleepSync = (ms) => {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    // SharedArrayBuffer unavailable (older/locked-down runtimes) — best-effort no-op.
  }
};

/**
 * Run `gh api` with bounded retry on transient GitHub errors. Non-transient errors
 * throw immediately so real breakage (auth, a genuine 404/422) still surfaces.
 */
function ghJson(pathname, { attempts = 4, baseDelayMs = 1500 } = {}) {
  const repo = resolveRepo();
  if (!repo) throw new Error('REPO/GITHUB_REPOSITORY is required');
  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const raw = execFileSync('gh', ['api', `/repos/${repo}${pathname}`], {
        encoding: 'utf8',
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 16 * 1024 * 1024,
      });
      return JSON.parse(raw);
    } catch (err) {
      lastErr = err;
      if (!isTransientGhError(err) || attempt === attempts) throw err;
      const delay = baseDelayMs * 2 ** (attempt - 1); // 1.5s, 3s, 6s
      console.warn(`gh api transient error (attempt ${attempt}/${attempts}) — retrying in ${delay}ms: ${(err.stderr || err.message || '').toString().trim().split('\n').pop()}`);
      sleepSync(delay);
    }
  }
  throw lastErr;
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
      headSha: run.head_sha || null,
      event: run.event || null,
    };
  }
  return watched.map((name) => latest[name] || {
    name,
    status: 'unknown',
    rawStatus: 'unknown',
    conclusion: null,
    updatedAt: null,
    url: null,
    headSha: null,
    event: null,
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
  const browserGateHeadShas = [...new Set(workflows
    .filter((workflow) => BROWSER_GATES.has(workflow.name))
    .map((workflow) => workflow.headSha)
    .filter(Boolean))];
  const verifiedBrowserHeadSha = browserGatesGreen && browserGateHeadShas.length === 1
    ? browserGateHeadShas[0]
    : null;
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

  return { allGreen, browserGatesGreen, verifiedBrowserHeadSha, hasDeadCron, terminalState, knownTerminalBlockers, summary };
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
  const base = (name, conclusion, status = 'completed', headSha = 'abc123') => ({ name, conclusion, status, event: 'push', updated_at: '2026-07-08T11:00:00Z', head_sha: headSha });
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
      { name: 'Lighthouse CI', conclusion: null, status: 'in_progress', event: 'push', updated_at: '2026-07-08T11:00:00Z', head_sha: 'abc123' },
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
  const ghErr = (stderr, status = 1) => Object.assign(new Error('Command failed'), { stderr: Buffer.from(stderr), status });
  const cases = [
    ['known blocker is terminal-known-blocked', known.terminalState === 'known_blocked' && known.knownTerminalBlockers.length === 1],
    ['in-progress beats known blocker', progress.terminalState === 'in_progress'],
    ['unexpected failure beats known blocker', unexpected.terminalState === 'failing'],
    ['browser gates are separate from Worker blocker', known.browserGatesGreen === true && known.allGreen === false],
    ['verified browser head is recorded only when browser gates agree', known.verifiedBrowserHeadSha === 'abc123' && known.workflows[0].headSha === 'abc123'],
    // Transient-error policy (the S285 beacon-503 fix): GitHub weather degrades, real errors surface.
    ['HTTP 503 is transient (the live failure)', isTransientGhError(ghErr('gh: HTTP 503\n')) === true],
    ['HTTP 502/504 gateway errors are transient', isTransientGhError(ghErr('gh: HTTP 502')) && isTransientGhError(ghErr('gh: HTTP 504'))],
    ['secondary rate limit (429) is transient', isTransientGhError(ghErr('You have exceeded a secondary rate limit')) === true],
    ['network resets are transient', isTransientGhError(ghErr('read ECONNRESET')) && isTransientGhError(ghErr('getaddrinfo EAI_AGAIN api.github.com'))],
    ['HTTP 404/401/422 are NOT transient (real errors surface)', !isTransientGhError(ghErr('gh: HTTP 404')) && !isTransientGhError(ghErr('gh: HTTP 401')) && !isTransientGhError(ghErr('gh: HTTP 422 Validation Failed'))],
    ['null/undefined error is not transient', !isTransientGhError(null) && !isTransientGhError(undefined)],
  ];
  let failed = 0;
  for (const [name, ok] of cases) {
    console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
    if (!ok) failed += 1;
  }
  console.log(`\nself-test: ${cases.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

try {
  const runs = ghJson('/actions/runs?per_page=80&branch=main').workflow_runs || [];
  const payload = buildPayload({ runs, scheduledNames: getScheduledWorkflowNames() });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${OUT}: ${payload.terminalState}${payload.knownTerminalBlockers.length ? ` (${payload.knownTerminalBlockers.length} known blocker)` : ''}`);
} catch (err) {
  // Honest-dark degrade: on a transient GitHub outage (retries exhausted), do NOT
  // paint CI red and do NOT fabricate a status. Leave the last-known-good beacon in
  // place — its own generatedAt timestamp will reveal it hasn't refreshed — and exit
  // 0 so the workflow does not report our repo unhealthy on GitHub's weather.
  if (isTransientGhError(err)) {
    const stale = fs.existsSync(OUT);
    console.warn(`CI beacon: GitHub API transiently unavailable after retries — kept ${stale ? 'last-known-good beacon' : 'no beacon (none existed yet)'}, not failing the workflow. (${(err.stderr || err.message || '').toString().trim().split('\n').pop()})`);
    process.exit(0);
  }
  // Non-transient (auth, real 4xx, our bug) — surface it loudly.
  throw err;
}
