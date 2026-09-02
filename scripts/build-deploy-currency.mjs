#!/usr/bin/env node
/**
 * Is what production SERVES the same thing this repo BUILT?
 *
 * S293: the startup brief printed "Deploy gaps ✓ no gaps (run: ops deploy-gaps)"
 * while production had been serving a build from two days and 134 commits
 * earlier. Two independent defects produced that lie:
 *   1. `portfolio/DEPLOY_GAPS.json` had NO producer anywhere in the repo — only
 *      the brief read it — and an absent file defaulted the signal to green.
 *   2. `npm run verify:deploy-parity` did detect the drift (4 shell assets
 *      missing from the live shell) but is not wired into any gate, so nothing
 *      ever ran it between sessions.
 * A green derived from a file nobody writes is worse than no signal at all.
 *
 * This is that missing producer. It compares the build identity production
 * actually serves against this repo's history and publishes the gap.
 *
 * DETERMINISM: `--probe` performs one bounded GET of the public build-sha feed
 * and records the comparison AT PROBE TIME. Non-probe runs re-emit the committed
 * observation. `commitsBehind` is therefore frozen into the observation rather
 * than recomputed against a moving HEAD, so `--check` stays byte-stable between
 * commits instead of going red on every push.
 *
 * PRIVACY: commit SHAs, counts, and timestamps only. No response bodies beyond
 * the single documented public field, no credentials, no identifiers.
 *
 * Usage:
 *   node scripts/build-deploy-currency.mjs --probe    # observe production
 *   node scripts/build-deploy-currency.mjs            # re-derive from committed observation
 *   node scripts/build-deploy-currency.mjs --check    # byte-compare
 *   node scripts/build-deploy-currency.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from './lib/safe-spawn.mjs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { compareShellHtml } from './lib/shell-parity.mjs';
import { getSecret } from './lib/secrets.mjs';
import { isServed } from './prune-served-surface.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'api', 'deploy-currency.json');
// Measure the production Pages artifact through its provider-owned origin. The
// routed apex can challenge both local and GitHub Actions datacenter vantages;
// pages.dev serves the exact artifact behind that edge without the WAF layer.
// Callers that intentionally target another environment can still override it.
const PROD = process.env.PROD_ORIGIN || 'https://vaultsparkstudios-website.pages.dev';
const APEX = 'https://vaultsparkstudios.com';
const PAGES_PROJECT = 'vaultsparkstudios-website';
const GITHUB_REPO = 'VaultSparkStudios/VaultSparkStudios.github.io';
const SHA_PATH = '/api/build-sha.json';
const SHELL_ROUTE = '/';
const TIMEOUT_MS = 10_000;
const HOUR_MS = 3_600_000;
const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');

/** Warn once a deploy is this far behind; block-worthy past the hard ceiling. */
export const WARN_HOURS = 12;
export const BLOCK_HOURS = 48;
// S336: hand-authored content waiting to be promoted gets a far tighter ceiling
// than repo churn. A shipped session that nobody dispatched should alarm the
// same working day, not two days later.
export const CONTENT_BLOCK_HOURS = 12;
export const PUBLISHER_PROMOTION = Object.freeze({
  strategy: 'coalesced',
  maxLagHours: 4,
  promoterWorkflow: 'refresh-live-data.yml',
  trigger: 'schedule and manual',
  directPublisherDeploys: false,
  note: 'Scheduled [skip ci] publisher commits may be repository-fresh before production; refresh-live-data coalesces and dispatches pages-deploy within four hours.',
});

/**
 * S294: the first CI run of this probe came back `unobserved · HTTP 403`.
 * Cloudflare challenges the GitHub Actions runner IP, so the scheduled probe
 * cannot read the public build-sha feed at all. Two consequences, both handled:
 *   1. A challenge is NOT an observation — it must never overwrite the last good
 *      one, or the signal oscillates to "unknown" every 30 minutes and the real
 *      staleness measurement is destroyed. Same rule as the route ledger's
 *      vantage-challenge handling (D-S293.9).
 *   2. It must be reported as CHALLENGED, not as a generic failure, so the brief
 *      can say why the number is old instead of implying nobody looked.
 */
export const CHALLENGE_STATUSES = Object.freeze([401, 403, 429]);

/**
 * S300: how long a RETAINED observation may keep standing in for a live reading.
 *
 * Retaining the last usable observation across a challenge (above) is correct —
 * it stops the signal oscillating to unknown every 30 minutes. But retention has
 * no expiry, so a permanently-challenged vantage (the CI runner IP) degrades into
 * a frozen gauge that still renders as a measurement. "Production is 170 commits
 * behind" and "I have not been able to see production for two days" are different
 * facts and must not share a rendering: the first invites a deploy, the second
 * invites fixing the vantage. Past this ceiling the verdict becomes `unverified`.
 */
export const OBSERVATION_MAX_AGE_HOURS = 12;

export function isChallengeError(error) {
  if (!error) return false;
  return CHALLENGE_STATUSES.some((code) => new RegExp(`\\b${code}\\b`).test(String(error)));
}

/**
 * Transient upstream failure — an edge challenge, an origin 5xx, or a network
 * reset/timeout. Distinct from a REAL error (auth, config, a drifted receipt),
 * which must still hard-fail.
 *
 * S336: this probe already degraded correctly — `mergeObservation` retains the
 * last usable observation on any unusable read and `main` exits 0, so a blip
 * never destroys the measurement. What it lacked was a NAME for that policy,
 * so `check-ci-publisher-resilience` could not see it, and a network reset was
 * logged identically to a genuine failure. Both are fixed by classifying here.
 */
export function isTransientProbeError(error) {
  if (!error) return false;
  const text = String(error);
  if (isChallengeError(error)) return true;
  if (/\b5\d\d\b/.test(text)) return true;
  return /ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|socket hang up|network|aborted|timeout/i.test(text);
}

/**
 * Age of a retained observation, FROZEN at merge time.
 *
 * Deliberately not computed at derive time from the wall clock: `--check`
 * byte-compares the rendered receipt, so any wall-clock input would drift the
 * file every hour and the gate would go red on time passing rather than on
 * anything being wrong. Both operands come from the observation records.
 */
export function retainedAgeHours(carryObservedAt, freshObservedAt) {
  const from = Date.parse(carryObservedAt || '');
  const to = Date.parse(freshObservedAt || '');
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  return Math.max(0, (to - from) / HOUR_MS);
}

/** Keep the newest USABLE observation; carry a challenge alongside it, never over it. */
export function mergeObservation(previous, fresh) {
  if (!fresh) return previous || null;
  const usable = Boolean(fresh.deployedSha) && !fresh.error;
  const shellParity = mergeShellParity(previous?.shellParity, fresh.shellParity);
  // A fresh usable reading resets retention entirely — it IS the observation.
  if (usable) return { ...fresh, shellParity, challengedAt: null, challengeError: null, retainedForHours: null };
  const carry = previous && previous.deployedSha ? previous : null;
  if (!carry) return { ...fresh, shellParity, challengedAt: fresh.observedAt, challengeError: fresh.error || null, retainedForHours: null };
  return {
    ...carry,
    shellParity,
    quorum: fresh.quorum || carry.quorum || null,
    challengedAt: fresh.observedAt,
    challengeError: fresh.error || null,
    // Measured from the retained observation, not from the previous challenge, so
    // repeated challenges accumulate honestly instead of resetting the clock.
    retainedForHours: retainedAgeHours(carry.observedAt, fresh.observedAt),
  };
}

export function mergeShellParity(previous, fresh) {
  if (!fresh) return previous || null;
  if (fresh.state === 'matched' || fresh.state === 'drift') {
    return { ...fresh, challengedAt: null, challengeError: null };
  }
  if (!previous || !['matched', 'drift'].includes(previous.state)) return fresh;
  return {
    ...previous,
    challengedAt: fresh.observedAt || null,
    challengeError: fresh.error || null,
  };
}

export function classify({ found, commitsBehind, ageHours, contentLagHours, retainedForHours, shellParityState, historyComplete }) {
  if (found === false) {
    // S316 — `diverged` is a claim about the FULL history: this sha exists
    // nowhere in the repo. In a truncated clone the lookup fails for every
    // commit that is not the tip, so absence proves nothing at all. CI checked
    // out at the default depth 1 and this probe published `diverged` against a
    // sha that was a perfectly ordinary ancestor of main. Absence of evidence
    // is reported as unverified, never as evidence of divergence.
    if (historyComplete === false) return 'unverified';
    return 'diverged';
  }
  if (!Number.isInteger(commitsBehind)) return 'unobserved';
  // Checked BEFORE `current`: a retained reading that has aged out cannot certify
  // production as up to date either. The most dangerous version of this bug is a
  // frozen `current` — production could have drifted arbitrarily since.
  if (Number.isFinite(retainedForHours) && retainedForHours >= OBSERVATION_MAX_AGE_HOURS) return 'unverified';
  if (commitsBehind === 0) return 'current';
  // S300: the deployed COMMIT being behind and the served CONTENT being behind
  // are different facts, and the content lane made them come apart. After a
  // content-lane promotion the served shell matches the repo exactly (parity
  // `matched`, zero missing/unexpected) while deployedSha stays at the baseline
  // — deliberately, so build-sha never claims to be at HEAD while the identity
  // backlog is unpromoted.
  //
  // Reporting that as `stale` would cry wolf every session: an operator reads
  // "448 commits behind" and goes looking for content to ship that is already
  // live. The residual gap is the HELD work, which is a decision, not a defect.
  // Measured evidence decides this — shell parity — not an assumption about
  // which lane ran.
  if (shellParityState === 'matched') return 'content-current';
  if (Number.isFinite(ageHours) && ageHours >= BLOCK_HOURS) return 'stale';
  // S336 second clock. Hand-authored content that nobody promoted is stale on a
  // much tighter ceiling than repo churn, and is measured from the OLDEST such
  // commit so one fresh commit cannot mask days of waiting behind it.
  if (Number.isFinite(contentLagHours) && contentLagHours >= CONTENT_BLOCK_HOURS) return 'stale';
  return 'behind';
}

export function deriveCurrency(observation) {
  const o = observation || {};
  const hasObservation = Boolean(o.observedAt && o.deployedSha);
  const state = hasObservation ? classify({ ...o, shellParityState: o.shellParity?.state }) : 'unobserved';
  const ageHours = Number.isFinite(o.ageHours) ? Math.round(o.ageHours * 10) / 10 : null;
  const shellParity = o.shellParity || null;
  return {
    schemaVersion: '1.0',
    generatedBy: 'scripts/build-deploy-currency.mjs',
    generatedAt: o.observedAt || null,
    publicSafe: true,
    privacy: {
      responseBodiesRecorded: false,
      identifiersRecorded: false,
      credentialsSent: false,
      observedField: `${SHA_PATH} → sha`,
      observedFields: [`${SHA_PATH} → sha`, `${SHELL_ROUTE} → fingerprinted shell paths`],
    },
    state,
    observedAt: o.observedAt || null,
    observedOrigin: o.observedOrigin || null,
    deployedSha: o.deployedSha || null,
    deployedShaShort: o.deployedSha ? String(o.deployedSha).slice(0, 12) : null,
    repoTipShaShort: o.repoTipSha ? String(o.repoTipSha).slice(0, 12) : null,
    commitsBehind: Number.isInteger(o.commitsBehind) ? o.commitsBehind : null,
    deployedCommitAt: o.deployedCommitAt || null,
    ageHours,
    // S336 — the second clock, disclosed alongside the first. `commitsBehind`
    // counts everything including hourly publisher churn; these three fields
    // say whether any of it was hand-authored content a reader is missing, and
    // for how long, measured from the OLDEST such commit.
    undeployedContentCommits: Number.isInteger(o.undeployedContentCommits) ? o.undeployedContentCommits : null,
    oldestUndeployedContentAt: o.oldestUndeployedContentAt || null,
    contentLagHours: Number.isFinite(o.contentLagHours) ? Math.round(o.contentLagHours * 10) / 10 : null,
    ageDays: ageHours === null ? null : Math.round((ageHours / 24) * 10) / 10,
    thresholds: { warnHours: WARN_HOURS, blockHours: BLOCK_HOURS, contentBlockHours: CONTENT_BLOCK_HOURS, observationMaxAgeHours: OBSERVATION_MAX_AGE_HOURS },
    publisherPromotion: PUBLISHER_PROMOTION,
    // How long the rendered numbers have been standing in for a live reading.
    // null = this observation IS live. Any number here means every field below
    // describes production as it was at `observedAt`, not as it is now.
    retainedForHours: Number.isFinite(o.retainedForHours) ? Math.round(o.retainedForHours * 10) / 10 : null,
    quorum: o.quorum || {
      state: 'unobserved', required: 2, agreementCount: 0, observedAt: null,
      agreedShaShort: null, evidence: [], disagreements: [],
    },
    shellParity: shellParity ? {
      state: shellParity.state || 'unobserved',
      route: shellParity.route || SHELL_ROUTE,
      observedAt: shellParity.observedAt || null,
      observedOrigin: shellParity.observedOrigin || null,
      expected: Array.isArray(shellParity.expected) ? shellParity.expected : [],
      actual: Array.isArray(shellParity.actual) ? shellParity.actual : [],
      missing: Array.isArray(shellParity.missing) ? shellParity.missing : [],
      unexpected: Array.isArray(shellParity.unexpected) ? shellParity.unexpected : [],
      challengedAt: shellParity.challengedAt || null,
      challengeError: shellParity.challengedAt ? String(shellParity.challengeError || '').slice(0, 120) || null : null,
    } : {
      state: 'unobserved', route: SHELL_ROUTE, observedAt: null, observedOrigin: null,
      expected: [], actual: [], missing: [], unexpected: [], challengedAt: null, challengeError: null,
    },
    honesty: {
      frozenAtProbeTime: true,
      note: 'commitsBehind and ageHours are recorded at probe time against the then-current repo tip, not recomputed against a moving HEAD. An unobserved state means no probe has run — it is never reported as current.',
      // A challenged probe (Cloudflare bot-challenge on a CI runner IP) is not an
      // observation: it is surfaced here and does NOT overwrite the measurement.
      challengedAt: o.challengedAt || null,
      challengeError: o.challengedAt ? String(o.challengeError || '').slice(0, 120) || null : null,
      challengeIsNotAnObservation: true,
      // S300: retention is bounded. Past observationMaxAgeHours the state is
      // `unverified` — "I cannot see production" rather than a stale number
      // dressed as a current measurement.
      retentionExpires: true,
      observationMaxAgeHours: OBSERVATION_MAX_AGE_HOURS,
      // S316: whether the repo this ran in could answer history questions at
      // all. false = a shallow clone, where `diverged` is unprovable and is
      // therefore downgraded to `unverified`. null = not recorded by this run.
      historyComplete: typeof o.historyComplete === 'boolean' ? o.historyComplete : null,
      divergenceRequiresCompleteHistory: true,
    },
    ...(o.error ? { error: String(o.error).slice(0, 120) } : {}),
  };
}

const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', windowsHide: true }).trim();

// S316 — a depth-1 checkout makes every history question unanswerable. Ask git
// directly rather than inferring truncation from a failed lookup.
export function isShallowRepo(runGit = git) {
  try { return runGit(['rev-parse', '--is-shallow-repository']) === 'true'; } catch { return false; }
}

function compareToRepo(deployedSha, contentBase = deployedSha) {
  const repoTipSha = git(['rev-parse', 'HEAD']);
  const historyComplete = !isShallowRepo();
  let found = true;
  try {
    git(['cat-file', '-e', deployedSha]);
  } catch {
    found = false;
  }
  if (!found) {
    return {
      repoTipSha, found: false, historyComplete,
      commitsBehind: null, deployedCommitAt: null, ageHours: null,
    };
  }
  const commitsBehind = Number.parseInt(git(['rev-list', '--count', `${deployedSha}..HEAD`]), 10);
  const deployedCommitAt = new Date(git(['show', '-s', '--format=%cI', deployedSha])).toISOString();
  const tipCommitAt = new Date(git(['show', '-s', '--format=%cI', repoTipSha])).toISOString();
  const ageHours = (Date.parse(tipCommitAt) - Date.parse(deployedCommitAt)) / HOUR_MS;
  // Content lag is measured from what the content lane promoted (contentBase),
  // which may be ahead of the deliberately-held deployedSha.
  const content = collectUndeployedContent(contentBaseResolved(contentBase, deployedSha));
  return { repoTipSha, found: true, historyComplete, commitsBehind, deployedCommitAt, ageHours, ...content };
}

/**
 * S336 — the second clock.
 *
 * `ageHours` above spans deployedCommit → repo tip, and `classify` escalates to
 * `stale` only when that span passes BLOCK_HOURS. That measures how long the
 * repo has been moving, not how long real work has been waiting, and the two
 * are not the same thing here: scheduled `[skip ci]` publishers commit several
 * times an hour, and a promotion lands on whatever HEAD is at dispatch time —
 * which is almost always one of those cron commits. The clock the alarm depends
 * on is therefore continuously reset by automation.
 *
 * Measured live in S336: production sat 34 commits behind with the whole S335
 * release unpromoted — including /how-we-build/, which 404'd — and the receipt
 * read `behind` · ageHours 10.1 · PASS. Thirty-four uptime crons and one
 * stranded release are indistinguishable to a commit counter.
 *
 * So: age from the OLDEST undeployed HAND-AUTHORED commit, never from the
 * newest deployed one. "Hand-authored" is decided structurally — a path that is
 * part of the served surface (config/served-surface.json) and is NOT a declared
 * generated output (config/evidence-graph.json) — never by matching commit
 * subjects or authors, which drift the moment someone renames a workflow.
 *
 * This deliberately cannot cry wolf on the held identity backlog: `classify`
 * returns `content-current` on matched shell parity BEFORE this clock is
 * consulted, so work that is held by design never trips it.
 */
export function isGeneratedOutput(rel, graph = readEvidenceGraph()) {
  const p = String(rel).replace(/\\/g, '/');
  return graph.has(p);
}

function readEvidenceGraph() {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'evidence-graph.json'), 'utf8'));
    return new Set((raw.nodes || []).map((n) => n.output).filter(Boolean));
  } catch { return new Set(); }
}

/** Paths that are regenerated by publishers on a schedule, so their churn is not work. */
export const DERIVED_PREFIXES = Object.freeze([
  'api/', 'data/', 'docs/', '.cache/', 'context/', 'logs/',
]);
export const DERIVED_EXACT = Object.freeze([
  'stats.json', 'feed.xml', 'sitemap.xml', 'agents.json', 'llms.txt', '.well-known/llms.txt',
]);

/**
 * Hand-authored AND actually deployable.
 *
 * The served-surface intersection matters: `scripts/` is hand-authored but is
 * pruned from every deploy, so a scripts-only session has nothing waiting for
 * production and must not trip a deploy alarm. Conversely `api/uptime.json` is
 * served but is regenerated hourly by a publisher, so its churn is not work.
 * Only the intersection — served, and not a declared generated output — is
 * "content a reader is missing because nobody promoted it".
 */
export function isHandAuthoredContent(rel, { generated = new Set(), served = isServed } = {}) {
  const p = String(rel).replace(/\\/g, '/');
  if (!p) return false;
  if (generated.has(p)) return false;
  if (DERIVED_EXACT.includes(p)) return false;
  if (DERIVED_PREFIXES.some((prefix) => p.startsWith(prefix))) return false;
  return served(p);
}

function contentBaseResolved(contentBase, fallback) {
  try { git(['cat-file', '-e', contentBase]); return contentBase; } catch { return fallback; }
}

function collectUndeployedContent(deployedSha) {
  try {
    const generated = readEvidenceGraph();
    // One git call: each commit, then its changed paths.
    const raw = git(['log', '--format=%x00%H %cI', '--name-only', `${deployedSha}..HEAD`]);
    const commits = raw.split('\u0000').map((s) => s.trim()).filter(Boolean);
    let oldestAt = null;
    let count = 0;
    for (const block of commits) {
      const [header, ...paths] = block.split('\n');
      const [, iso] = header.split(' ');
      const substantive = paths.map((s) => s.trim()).filter(Boolean)
        .some((p) => isHandAuthoredContent(p, { generated }));
      if (!substantive) continue;
      count += 1;
      if (!oldestAt || Date.parse(iso) < Date.parse(oldestAt)) oldestAt = iso;
    }
    const contentLagHours = oldestAt ? (Date.now() - Date.parse(oldestAt)) / HOUR_MS : null;
    return {
      undeployedContentCommits: count,
      oldestUndeployedContentAt: oldestAt,
      contentLagHours: Number.isFinite(contentLagHours) ? contentLagHours : null,
    };
  } catch {
    // Never fabricate a clean reading from a failed measurement.
    return { undeployedContentCommits: null, oldestUndeployedContentAt: null, contentLagHours: null };
  }
}

async function probeSha() {
  const observedAt = new Date().toISOString();
  try {
    const response = await fetch(new URL(SHA_PATH, PROD), {
      headers: { accept: 'application/json', 'user-agent': 'VaultSparkDeployCurrency/1.0' },
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      credentials: 'omit',
    });
    if (!response.ok) return { observedAt, observedOrigin: new URL(PROD).origin, error: `build-sha feed HTTP ${response.status}` };
    const body = await response.json();
    const deployedSha = String(body.sha || body.buildSha || '').trim();
    if (!/^[0-9a-f]{7,40}$/.test(deployedSha)) return { observedAt, observedOrigin: new URL(PROD).origin, error: 'build-sha feed carried no usable sha' };
    // S336: the content clock measures against what the CONTENT LANE actually
    // promoted, not against `sha`. `sha` deliberately stays at the baseline so
    // deploy-currency never claims production is at HEAD while the identity
    // backlog is held — but content promoted by the lane IS live, and counting
    // it as "undeployed content" would report a reader as missing pages they
    // can already load. Falls back to the baseline when no lane head is served.
    const laneHead = String(body.contentLaneHead || '').trim();
    const contentBase = /^[0-9a-f]{7,40}$/i.test(laneHead) ? laneHead : deployedSha;
    return { observedAt, observedOrigin: new URL(PROD).origin, deployedSha, ...compareToRepo(deployedSha, contentBase) };
  } catch (error) {
    return { observedAt, observedOrigin: new URL(PROD).origin, error: String(error?.message || error).slice(0, 120) };
  }
}

function compactVantage(id, evidenceClass, result) {
  const sha = /^[0-9a-f]{7,40}$/i.test(result?.sha || '') ? String(result.sha).toLowerCase() : null;
  const contentLaneHead = /^[0-9a-f]{7,40}$/i.test(result?.contentLaneHead || '') ? String(result.contentLaneHead).toLowerCase() : null;
  return {
    id,
    evidenceClass,
    state: sha ? 'observed' : (result?.state || 'unobserved'),
    observedAt: result?.observedAt || null,
    shaShort: sha ? sha.slice(0, 12) : null,
    sha256: sha ? sha256(sha) : null,
    httpStatus: Number.isInteger(result?.httpStatus) ? result.httpStatus : null,
    reason: result?.reason ? String(result.reason).slice(0, 80) : null,
    evidenceIdSha256: result?.evidenceId ? sha256(result.evidenceId) : null,
    contentLaneHeadShort: contentLaneHead ? contentLaneHead.slice(0, 12) : null,
    contentLaneHeadSha256: contentLaneHead ? sha256(contentLaneHead) : null,
    contentLanePathSetSha256: result?.contentLanePathSetSha256 || null,
    _sha: sha,
    _contentLaneHead: contentLaneHead,
  };
}

async function httpShaVantage(id, origin, evidenceClass) {
  const observedAt = new Date().toISOString();
  try {
    const response = await fetch(new URL(SHA_PATH, origin), {
      headers: { accept: 'application/json', 'user-agent': 'VaultSparkDeployCurrency/2.0' },
      redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS), credentials: 'omit',
    });
    if (!response.ok) {
      return compactVantage(id, evidenceClass, {
        observedAt, httpStatus: response.status,
        state: CHALLENGE_STATUSES.includes(response.status) ? 'challenged' : 'unobserved',
        reason: `http-${response.status}`,
      });
    }
    const body = await response.json();
    return compactVantage(id, evidenceClass, {
      observedAt,
      httpStatus: response.status,
      sha: String(body.sha || body.buildSha || ''),
      contentLaneHead: String(body.contentLaneHead || ''),
      contentLanePathSetSha256: body.contentLanePathSetSha256 || null,
    });
  } catch (error) {
    return compactVantage(id, evidenceClass, { observedAt, reason: String(error?.message || error) });
  }
}

async function cloudflarePagesVantage() {
  const observedAt = new Date().toISOString();
  const token = getSecret('CLOUDFLARE_API_TOKEN', 'cloudflare.deploy');
  const accountId = getSecret('CLOUDFLARE_ACCOUNT_ID', 'cloudflare.deploy');
  if (!token || !accountId) return compactVantage('cloudflare-pages-api', 'provider-metadata', { observedAt, reason: 'capability-unavailable' });
  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/pages/projects/${PAGES_PROJECT}/deployments?env=production&per_page=10`;
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS), credentials: 'omit',
    });
    if (!response.ok) return compactVantage('cloudflare-pages-api', 'provider-metadata', { observedAt, httpStatus: response.status, reason: `http-${response.status}` });
    const json = await response.json();
    const deployments = Array.isArray(json?.result) ? json.result : [];
    const deployed = deployments.find((item) => item.environment === 'production'
      && (item.latest_stage?.status === 'success' || item.stages?.at?.(-1)?.status === 'success' || item.url));
    const sha = deployed?.source?.config?.commit_hash || deployed?.deployment_trigger?.metadata?.commit_hash || '';
    return compactVantage('cloudflare-pages-api', 'provider-metadata', { observedAt, httpStatus: response.status, sha, evidenceId: deployed?.id || null });
  } catch (error) {
    return compactVantage('cloudflare-pages-api', 'provider-metadata', { observedAt, reason: String(error?.message || error) });
  }
}

async function githubDeploymentVantage() {
  const observedAt = new Date().toISOString();
  try {
    const runsResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/pages-deploy.yml/runs?event=workflow_dispatch&status=completed&per_page=5`, {
      headers: { accept: 'application/vnd.github+json', 'user-agent': 'VaultSparkDeployCurrency/2.0' },
      signal: AbortSignal.timeout(TIMEOUT_MS), credentials: 'omit',
    });
    if (!runsResponse.ok) return compactVantage('github-deploy-step', 'workflow-attestation', { observedAt, httpStatus: runsResponse.status, reason: `http-${runsResponse.status}` });
    const runs = (await runsResponse.json())?.workflow_runs || [];
    for (const run of runs.slice(0, 3)) {
      if (run.conclusion !== 'success') continue;
      const jobsResponse = await fetch(run.jobs_url, {
        headers: { accept: 'application/vnd.github+json', 'user-agent': 'VaultSparkDeployCurrency/2.0' },
        signal: AbortSignal.timeout(TIMEOUT_MS), credentials: 'omit',
      });
      if (!jobsResponse.ok) continue;
      const jobs = (await jobsResponse.json())?.jobs || [];
      const deployed = jobs.some((job) => (job.steps || []).some((step) => step.name === 'Deploy to Cloudflare Pages' && step.conclusion === 'success'));
      if (deployed) return compactVantage('github-deploy-step', 'workflow-attestation', { observedAt, httpStatus: 200, sha: run.head_sha, evidenceId: String(run.id) });
    }
    return compactVantage('github-deploy-step', 'workflow-attestation', { observedAt, httpStatus: 200, reason: 'no-successful-deploy-step' });
  } catch (error) {
    return compactVantage('github-deploy-step', 'workflow-attestation', { observedAt, reason: String(error?.message || error) });
  }
}

export function deriveQuorum(vantages, observedAt = new Date().toISOString()) {
  const groups = new Map();
  for (const vantage of vantages) {
    if (!vantage?._sha) continue;
    const group = groups.get(vantage._sha) || [];
    group.push(vantage);
    groups.set(vantage._sha, group);
  }
  const ranked = [...groups.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  const winner = ranked[0] || [null, []];
  const agreementCount = winner[1].length;
  const observedShas = ranked.map(([sha, members]) => ({ shaShort: sha.slice(0, 12), sha256: sha256(sha), count: members.length }));
  const overlay = vantages.find((vantage) => vantage?._sha && vantage?._contentLaneHead)
    && vantages.some((vantage) => vantage?._sha === vantages.find((candidate) => candidate?._sha && candidate?._contentLaneHead)?._contentLaneHead);
  const overlayProvider = overlay ? vantages.find((vantage) => vantage?._sha && vantage?._contentLaneHead) : null;
  const state = agreementCount >= 2 ? 'agreed' : (overlay ? 'overlay-agreed' : (ranked.length > 1 ? 'disagreed' : 'insufficient'));
  const certifiedSha = state === 'agreed' ? winner[0] : (state === 'overlay-agreed' ? overlayProvider._sha : null);
  return {
    state,
    required: 2,
    agreementCount,
    observedAt,
    agreedShaShort: certifiedSha ? certifiedSha.slice(0, 12) : null,
    agreedSha256: certifiedSha ? sha256(certifiedSha) : null,
    ...(state === 'overlay-agreed' ? {
      contentLaneHeadShort: overlayProvider._contentLaneHead.slice(0, 12),
      contentLaneHeadSha256: sha256(overlayProvider._contentLaneHead),
      contentLanePathSetSha256: overlayProvider.contentLanePathSetSha256 || null,
      interpretation: 'provider baseline plus workflow-attested content overlay',
    } : {}),
    evidence: vantages.map(({ _sha, _contentLaneHead, ...publicFields }) => publicFields),
    disagreements: observedShas,
    _sha: certifiedSha,
    // S336: private, stripped before publication exactly like _sha. The content
    // clock needs the RAW lane head; only its short form and hash are public.
    // Any vantage that served a lane head supplies the content base — not just
    // the overlay-agreed case. When two vantages agree on the held BASELINE sha the
    // quorum is plain 'agreed', yet the content lane may still have promoted well
    // past it; measuring content lag from the baseline would then report pages as
    // undeployed that a reader can already load.
    _contentLaneHead: (overlayProvider && overlayProvider._contentLaneHead)
      || (vantages.find((v) => v && v._contentLaneHead) || {})._contentLaneHead
      || null,
  };
}

async function probeQuorum() {
  const observedAt = new Date().toISOString();
  const vantages = await Promise.all([
    httpShaVantage('routed-apex', APEX, 'routed-http'),
    httpShaVantage('provider-origin', PROD, 'provider-origin-http'),
    cloudflarePagesVantage(),
    githubDeploymentVantage(),
  ]);
  return deriveQuorum(vantages, observedAt);
}

function localShellHtml() {
  return fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
}

async function probeShellParity(observedAt) {
  try {
    const response = await fetch(new URL(SHELL_ROUTE, PROD), {
      headers: { accept: 'text/html', 'user-agent': 'VaultSparkDeployCurrency/1.0' },
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      credentials: 'omit',
    });
    if (!response.ok) {
      const error = `shell route HTTP ${response.status}`;
      return { state: isChallengeError(error) ? 'challenged' : 'unobserved', route: SHELL_ROUTE, observedAt, observedOrigin: new URL(PROD).origin, error };
    }
    const parity = compareShellHtml(localShellHtml(), await response.text());
    return {
      state: parity.ok ? 'matched' : 'drift',
      route: SHELL_ROUTE,
      observedAt,
      observedOrigin: new URL(PROD).origin,
      expected: parity.expected,
      actual: parity.actual,
      missing: parity.missing,
      unexpected: parity.unexpected,
    };
  } catch (error) {
    return { state: 'unobserved', route: SHELL_ROUTE, observedAt, observedOrigin: new URL(PROD).origin, error: String(error?.message || error).slice(0, 120) };
  }
}

async function probe() {
  const observedAt = new Date().toISOString();
  const [quorum, shellParity] = await Promise.all([probeQuorum(), probeShellParity(observedAt)]);
  const publicQuorum = { ...quorum };
  delete publicQuorum._sha;
  delete publicQuorum._contentLaneHead;
  if ((quorum.state === 'agreed' || quorum.state === 'overlay-agreed') && quorum._sha) {
    return { observedAt, observedOrigin: 'multi-vantage-quorum', deployedSha: quorum._sha, ...compareToRepo(quorum._sha, quorum._contentLaneHead || quorum._sha), quorum: publicQuorum, shellParity };
  }
  return { observedAt, observedOrigin: 'multi-vantage-quorum', error: `deploy quorum ${quorum.state}`, quorum: publicQuorum, shellParity };
}

/**
 * Receipt → observation. EXPORTED so the round-trip self-test exercises the real
 * mapping rather than a hand-written copy of it.
 *
 * That distinction is not academic: the first version of this test mirrored the
 * mapping inline, so deleting a field from the real function left the test
 * green. A test that restates the code it checks cannot catch that code being
 * wrong — it only proves the restatement is self-consistent.
 *
 * Every field deriveCurrency() emits must be restored here or `--check` drifts.
 */
export function observationFromReceipt(c) {
  if (!c || typeof c !== 'object') return null;
  return {
    observedAt: c.observedAt,
    observedOrigin: c.observedOrigin,
    deployedSha: c.deployedSha,
    repoTipSha: c.repoTipShaShort,
    commitsBehind: c.commitsBehind,
    deployedCommitAt: c.deployedCommitAt,
    ageHours: c.ageHours,
    found: c.state !== 'diverged',
    challengedAt: c.honesty?.challengedAt || null,
    challengeError: c.honesty?.challengeError || null,
    // MUST be restored, or the round trip is not closed: deriveCurrency would
    // emit null for a receipt that carries a number and `--check` would drift on
    // every challenged run. This escaped local testing because a SUCCESSFUL
    // probe leaves the field null on both sides — the bug only exists on a
    // challenged vantage, which is exactly where CI lives.
    retainedForHours: Number.isFinite(c.retainedForHours) ? c.retainedForHours : null,
    quorum: c.quorum || null,
    shellParity: c.shellParity || null,
    // S316 — same class as retainedForHours above. Adding a field to the emitted
    // receipt without restoring it here does not fail loudly: the re-derive
    // emits null where the committed receipt carries a boolean, and `--check`
    // drifts on every run forever after.
    historyComplete: typeof c.honesty?.historyComplete === 'boolean' ? c.honesty.historyComplete : null,
    ...(c.error ? { error: c.error } : {}),
  };
}

/** Rebuild the observation from a committed receipt so non-probe runs are pure. */
function committedObservation() {
  if (!fs.existsSync(OUT)) return null;
  try {
    return observationFromReceipt(JSON.parse(fs.readFileSync(OUT, 'utf8')));
  } catch {
    return null;
  }
}

function selfTest() {
  const base = { observedAt: '2026-07-26T00:00:00.000Z', observedOrigin: 'https://example.test', deployedSha: 'a'.repeat(40), repoTipSha: 'b'.repeat(40), found: true };
  const current = deriveCurrency({ ...base, commitsBehind: 0, ageHours: 0, deployedCommitAt: '2026-07-26T00:00:00.000Z' });
  const behind = deriveCurrency({ ...base, commitsBehind: 12, ageHours: 5, deployedCommitAt: '2026-07-25T19:00:00.000Z' });
  const stale = deriveCurrency({ ...base, commitsBehind: 134, ageHours: 55, deployedCommitAt: '2026-07-24T00:54:00.000Z' });
  const diverged = deriveCurrency({ ...base, found: false, commitsBehind: null, ageHours: null });
  const dark = deriveCurrency(null);
  const errored = deriveCurrency({ observedAt: '2026-07-26T00:00:00.000Z', error: 'HTTP 503' });
  const shellDrift = { state: 'drift', route: '/', observedAt: base.observedAt, observedOrigin: base.observedOrigin, expected: ['assets/a.shell-aaaaaaaaaa.js'], actual: [], missing: ['assets/a.shell-aaaaaaaaaa.js'], unexpected: [] };
  const withShellDrift = deriveCurrency({ ...base, commitsBehind: 0, ageHours: 0, shellParity: shellDrift });

  const cases = [
    ['a matching sha is current', current.state === 'current' && current.commitsBehind === 0],
    ['any commits behind is behind', behind.state === 'behind' && behind.commitsBehind === 12],
    ['THE LIVE CASE: 134 commits / 55h reads stale', stale.state === 'stale' && stale.ageDays === 2.3],
    ['a sha absent from history is diverged', diverged.state === 'diverged'],
    // S316 — THE LIVE CASE: CI ran at the default checkout depth of 1, the sha
    // lookup failed for an ordinary ancestor of main, and this feed published
    // `diverged` to a public trust surface. A truncated clone cannot witness
    // divergence, so it must not claim it.
    ['a shallow clone cannot prove divergence',
      classify({ found: false, commitsBehind: null, historyComplete: false }) === 'unverified'],
    ['a COMPLETE clone still reports real divergence',
      classify({ found: false, commitsBehind: null, historyComplete: true }) === 'diverged'],
    ['shallowness only excuses a FAILED lookup, never a found one',
      classify({ found: true, commitsBehind: 0, historyComplete: false }) === 'current'],
    ['the completeness of the clone is published, not implicit',
      deriveCurrency({ ...base, found: false, historyComplete: false }).honesty.historyComplete === false],
    ['an unrecorded completeness is null, never a silent true',
      deriveCurrency({ ...base }).honesty.historyComplete === null],
    ['the shallow probe reads git directly, not a failed-lookup inference',
      isShallowRepo(() => 'true') === true && isShallowRepo(() => 'false') === false],
    // The round trip must carry historyComplete, or --check drifts on every run.
    ['historyComplete survives the receipt round trip',
      observationFromReceipt(deriveCurrency({ ...base, historyComplete: true })).historyComplete === true
      && observationFromReceipt(deriveCurrency({ ...base, found: false, historyComplete: false })).historyComplete === false],
    ['NO PROBE IS NEVER CURRENT', dark.state === 'unobserved' && dark.commitsBehind === null],
    ['a failed probe is not current either', errored.state === 'unobserved' && errored.error === 'HTTP 503'],
    ['the warn/block ceiling is published, not implicit', current.thresholds.blockHours === BLOCK_HOURS && current.thresholds.warnHours === WARN_HOURS],

    // ── S336: the second clock ────────────────────────────────────────────
    // THE LIVE S336 SHAPE. Production sat 34 commits behind with the entire
    // S335 release unpromoted (/how-we-build/ 404'd) and this returned 'behind'
    // — a PASS — because 10.1h of repo span is well under the 48h ceiling.
    ['THE LIVE CASE: 34 behind · 10h span · a day of undeployed content reads STALE',
      classify({ found: true, commitsBehind: 34, ageHours: 10.1, contentLagHours: 26 }) === 'stale'],
    ['the same shape WITHOUT undeployed content stays behind',
      classify({ found: true, commitsBehind: 34, ageHours: 10.1, contentLagHours: null }) === 'behind'],
    ['pure publisher churn never trips the content clock',
      classify({ found: true, commitsBehind: 200, ageHours: 3, contentLagHours: 0.2 }) === 'behind'],
    ['just under the content ceiling still passes',
      classify({ found: true, commitsBehind: 5, ageHours: 1, contentLagHours: CONTENT_BLOCK_HOURS - 0.1 }) === 'behind'],
    ['at the content ceiling it fires',
      classify({ found: true, commitsBehind: 5, ageHours: 1, contentLagHours: CONTENT_BLOCK_HOURS }) === 'stale'],

    // The held identity backlog must never be able to trip this alarm: a
    // promoted content lane reports matched shell parity and returns first.
    ['a promoted content lane outranks any content lag',
      classify({ found: true, commitsBehind: 448, ageHours: 99, contentLagHours: 999, shellParityState: 'matched' }) === 'content-current'],
    ['an unverified vantage still outranks the content clock',
      classify({ found: true, commitsBehind: 5, ageHours: 1, contentLagHours: 999, retainedForHours: OBSERVATION_MAX_AGE_HOURS }) === 'unverified'],
    ['current still wins — zero behind is never stale',
      classify({ found: true, commitsBehind: 0, ageHours: 0, contentLagHours: 999 }) === 'current'],

    // Structural churn classification, not subject-line matching.
    ['a served hand-authored page counts as content', isHandAuthoredContent('how-we-build/index.html')],
    ['an hourly publisher feed does NOT count', !isHandAuthoredContent('api/uptime.json')],
    ['a root derived feed does NOT count', !isHandAuthoredContent('stats.json')],
    ['scripts are hand-authored but never deployed, so they do NOT count', !isHandAuthoredContent('scripts/build-deploy-currency.mjs')],
    ['operator context does NOT count', !isHandAuthoredContent('context/TASK_BOARD.md')],
    ['a served stylesheet counts', isHandAuthoredContent('assets/style.css')],
    ['a declared evidence-graph output does NOT count',
      !isHandAuthoredContent('api/public-intelligence.json', { generated: new Set(['api/public-intelligence.json']) })],

    ['the content ceiling is published, not implicit', current.thresholds.contentBlockHours === CONTENT_BLOCK_HOURS],

    // S336: the degrade policy is named so it can be seen, and is honest in both directions.
    ['an edge challenge is transient', isTransientProbeError('build-sha feed HTTP 403')],
    ['an origin 5xx is transient', isTransientProbeError('build-sha feed HTTP 503')],
    ['a network reset is transient', isTransientProbeError('fetch failed: ECONNRESET')],
    ['a timeout is transient', isTransientProbeError('The operation was aborted due to timeout')],
    ['an auth/config error is NOT transient', !isTransientProbeError('missing CLOUDFLARE_API_TOKEN')],
    ['a drifted receipt is NOT transient', !isTransientProbeError('receipt drifted; run --probe')],
    ['no error is not transient', !isTransientProbeError(null)],
    ['the receipt discloses the content clock', 'contentLagHours' in current && 'oldestUndeployedContentAt' in current && 'undeployedContentCommits' in current],
    ['a failed content measurement is null, never a clean zero',
      deriveCurrency({ ...base, commitsBehind: 3, ageHours: 1, contentLagHours: null }).contentLagHours === null],
    ['scheduled publishers disclose their bounded coalesced promotion',
      current.publisherPromotion.strategy === 'coalesced'
      && current.publisherPromotion.maxLagHours === 4
      && current.publisherPromotion.promoterWorkflow === 'refresh-live-data.yml'
      && current.publisherPromotion.directPublisherDeploys === false],
    ['just under the block ceiling is behind, not stale', classify({ found: true, commitsBehind: 3, ageHours: BLOCK_HOURS - 0.1 }) === 'behind'],
    ['exactly at the block ceiling is stale', classify({ found: true, commitsBehind: 3, ageHours: BLOCK_HOURS }) === 'stale'],
    ['generatedAt is the observation, not wall clock', stale.generatedAt === '2026-07-26T00:00:00.000Z'],
    ['derivation is deterministic', JSON.stringify(deriveCurrency({ ...base, commitsBehind: 134, ageHours: 55, deployedCommitAt: '2026-07-24T00:54:00.000Z' })) === JSON.stringify(stale)],
    ['no response body is retained', !JSON.stringify(stale).includes('body')],
    ['shas are surfaced short for humans', stale.deployedShaShort.length === 12],
    ['route-local shell drift is a first-class dimension', withShellDrift.shellParity.state === 'drift' && withShellDrift.shellParity.missing.length === 1],
    ['shell paths are published without response bodies', !Object.hasOwn(withShellDrift.shellParity, 'html')],
    ['a challenged shell probe retains the last usable shell observation', mergeShellParity(shellDrift, { state: 'challenged', observedAt: 'later', error: 'shell route HTTP 403' }).state === 'drift'],
    ['a retained shell observation surfaces the challenge time', mergeShellParity(shellDrift, { state: 'challenged', observedAt: 'later', error: 'shell route HTTP 403' }).challengedAt === 'later'],
    ['a fresh matched shell observation clears prior drift', mergeShellParity(shellDrift, { ...shellDrift, state: 'matched', observedAt: 'later', missing: [] }).state === 'matched'],
    // S294 — the live CI case: Cloudflare challenged the Actions runner with 403.
    ['a 403 reads as a challenge', isChallengeError('build-sha feed HTTP 403')],
    ['a 503 is not a challenge', !isChallengeError('build-sha feed HTTP 503')],
    ['THE LIVE CI CASE: a challenge never clobbers the last good observation', (() => {
      const prev = { ...base, commitsBehind: 134, ageHours: 55, deployedCommitAt: '2026-07-24T00:54:00.000Z' };
      const merged = mergeObservation(prev, { observedAt: '2026-07-26T18:23:17.374Z', error: 'build-sha feed HTTP 403' });
      return merged.commitsBehind === 134 && merged.deployedSha === prev.deployedSha;
    })()],
    ['a challenge is recorded alongside the retained measurement', mergeObservation({ ...base, commitsBehind: 5, ageHours: 2 }, { observedAt: 'T', error: 'HTTP 403' }).challengedAt === 'T'],
    ['the retained measurement still reports its real state', deriveCurrency(mergeObservation({ ...base, commitsBehind: 134, ageHours: 55, deployedCommitAt: '2026-07-24T00:54:00.000Z' }, { observedAt: 'T', error: 'HTTP 403' })).state === 'stale'],
    ['a challenge with NO prior observation stays honest-dark', deriveCurrency(mergeObservation(null, { observedAt: 'T', error: 'HTTP 403' })).state === 'unobserved'],
    ['a successful probe clears a prior challenge flag', mergeObservation({ ...base, commitsBehind: 1, ageHours: 1, challengedAt: 'old' }, { ...base, commitsBehind: 0, ageHours: 0 }).challengedAt === null],
    ['a fresh usable probe replaces the old measurement', mergeObservation({ ...base, commitsBehind: 134, ageHours: 55 }, { ...base, commitsBehind: 0, ageHours: 0 }).commitsBehind === 0],

    // S300 — retention must expire. A permanently-challenged vantage was rendering
    // a frozen number as a live measurement for days; "170 commits behind" and
    // "I have not seen production since Tuesday" are different facts.
    ['a briefly retained observation still reports its real state', classify({ found: true, commitsBehind: 134, ageHours: 55, retainedForHours: 1 }) === 'stale'],
    ['THE LIVE CASE: a long-retained observation is unverified, not stale', classify({ found: true, commitsBehind: 134, ageHours: 55, retainedForHours: OBSERVATION_MAX_AGE_HOURS }) === 'unverified'],
    ['a long-retained ZERO-drift reading cannot certify current', classify({ found: true, commitsBehind: 0, ageHours: 0, retainedForHours: 99 }) === 'unverified'],
    ['just under the retention ceiling still measures', classify({ found: true, commitsBehind: 5, ageHours: 1, retainedForHours: OBSERVATION_MAX_AGE_HOURS - 0.1 }) === 'behind'],
    ['a live observation has no retention age', classify({ found: true, commitsBehind: 5, ageHours: 1, retainedForHours: null }) === 'behind'],
    ['retention age is frozen from the two observation stamps', retainedAgeHours('2026-07-26T00:00:00.000Z', '2026-07-26T13:00:00.000Z') === 13],
    ['unparseable stamps yield no retention claim', retainedAgeHours('nonsense', '2026-07-26T00:00:00.000Z') === null],
    ['retention accumulates across repeated challenges', (() => {
      const carry = { ...base, commitsBehind: 134, ageHours: 55, observedAt: '2026-07-26T00:00:00.000Z' };
      const first = mergeObservation(carry, { observedAt: '2026-07-26T06:00:00.000Z', error: 'HTTP 403' });
      const second = mergeObservation(first, { observedAt: '2026-07-26T20:00:00.000Z', error: 'HTTP 403' });
      // measured from the retained observation, not from the previous challenge
      return first.retainedForHours === 6 && second.retainedForHours === 20;
    })()],
    ['a successful probe clears retention', mergeObservation({ ...base, commitsBehind: 1, ageHours: 1, retainedForHours: 99 }, { ...base, commitsBehind: 0, ageHours: 0 }).retainedForHours === null],
    ['the retention ceiling is published, not implicit', current.thresholds.observationMaxAgeHours === OBSERVATION_MAX_AGE_HOURS && current.honesty.retentionExpires === true],
    ['an unverified receipt still shows what it last saw', (() => {
      const r = deriveCurrency({ ...base, commitsBehind: 134, ageHours: 55, deployedCommitAt: '2026-07-24T00:54:00.000Z', retainedForHours: 40 });
      return r.state === 'unverified' && r.commitsBehind === 134 && r.retainedForHours === 40;
    })()],
    ['derivation stays deterministic with retention', (() => {
      const o = { ...base, commitsBehind: 134, ageHours: 55, deployedCommitAt: '2026-07-24T00:54:00.000Z', retainedForHours: 40 };
      return JSON.stringify(deriveCurrency(o)) === JSON.stringify(deriveCurrency(o));
    })()],

    // THE CI CASE: the receipt must survive a write→read→derive round trip, or
    // `--check` drifts on every challenged probe. This escaped local testing
    // because a SUCCESSFUL probe leaves retentionForHours null on both sides —
    // the bug only exists on a challenged vantage, which is where CI lives.
    // Asserted as a PROPERTY over every retention state, not one example.
    ['RECEIPT ROUND-TRIPS: derive(read(derive(x))) === derive(x)', (() => {
      const states = [
        { ...base, commitsBehind: 134, ageHours: 55, deployedCommitAt: '2026-07-24T00:54:00.000Z', retainedForHours: 40 },
        { ...base, commitsBehind: 3, ageHours: 2, deployedCommitAt: '2026-07-25T00:00:00.000Z', retainedForHours: 6 },
        { ...base, commitsBehind: 0, ageHours: 0, deployedCommitAt: '2026-07-26T00:00:00.000Z', retainedForHours: null },
      ];
      return states.every((state) => {
        const first = deriveCurrency(state);
        // Uses the REAL mapping, not a copy of it — see observationFromReceipt.
        return JSON.stringify(deriveCurrency(observationFromReceipt(first))) === JSON.stringify(first);
      });
    })()],
    // S300 content lane: the deployed COMMIT and the served CONTENT came apart.
    ['THE LIVE CASE: behind-but-shell-matched is content-current, not stale',
      classify({ found: true, commitsBehind: 448, ageHours: 175, shellParityState: 'matched' }) === 'content-current'],
    ['behind WITH shell drift is still stale',
      classify({ found: true, commitsBehind: 448, ageHours: 175, shellParityState: 'drift' }) === 'stale'],
    ['an unobserved shell cannot upgrade a stale verdict',
      classify({ found: true, commitsBehind: 448, ageHours: 175, shellParityState: 'unobserved' }) === 'stale'],
    ['a matched shell does not mask a diverged sha',
      classify({ found: false, commitsBehind: null, shellParityState: 'matched' }) === 'diverged'],
    ['a matched shell does not mask an aged-out reading',
      classify({ found: true, commitsBehind: 5, ageHours: 1, retainedForHours: 99, shellParityState: 'matched' }) === 'unverified'],
    ['zero-behind is still plain current, not content-current',
      classify({ found: true, commitsBehind: 0, ageHours: 0, shellParityState: 'matched' }) === 'current'],
    ['content-current derives from the receipt shellParity, not a separate arg', (() => {
      const r = deriveCurrency({ ...base, commitsBehind: 448, ageHours: 175, deployedCommitAt: '2026-07-24T00:00:00.000Z',
        shellParity: { state: 'matched', route: '/', observedAt: base.observedAt, expected: [], actual: [], missing: [], unexpected: [] } });
      return r.state === 'content-current';
    })()],
    ['a retained receipt survives the round trip specifically', (() => {
      const o = { ...base, commitsBehind: 134, ageHours: 55, deployedCommitAt: '2026-07-24T00:54:00.000Z', retainedForHours: 40 };
      return deriveCurrency(o).retainedForHours === 40;
    })()],
    ['two independent agreeing vantages form quorum', (() => {
      const q = deriveQuorum([
        { id: 'a', evidenceClass: 'http', _sha: 'a'.repeat(40) },
        { id: 'b', evidenceClass: 'api', _sha: 'a'.repeat(40) },
      ], base.observedAt);
      return q.state === 'agreed' && q.agreementCount === 2 && q._sha === 'a'.repeat(40);
    })()],
    ['one vantage never certifies currency', deriveQuorum([{ id: 'a', _sha: 'a'.repeat(40) }], base.observedAt).state === 'insufficient'],
    ['conflicting vantages are explicit disagreement', deriveQuorum([{ id: 'a', _sha: 'a'.repeat(40) }, { id: 'b', _sha: 'b'.repeat(40) }], base.observedAt).state === 'disagreed'],
    ['content overlay reconciles provider baseline with workflow head', (() => {
      const q = deriveQuorum([
        { id: 'provider', evidenceClass: 'http', _sha: 'a'.repeat(40), _contentLaneHead: 'b'.repeat(40), contentLanePathSetSha256: 'c'.repeat(64) },
        { id: 'workflow', evidenceClass: 'workflow', _sha: 'b'.repeat(40) },
      ], base.observedAt);
      return q.state === 'overlay-agreed' && q._sha === 'a'.repeat(40) && q.contentLaneHeadShort === 'b'.repeat(12);
    })()],
    ['quorum receipt excludes raw shas from public evidence', (() => {
      const q = deriveQuorum([{ id: 'a', _sha: 'a'.repeat(40) }, { id: 'b', _sha: 'a'.repeat(40) }], base.observedAt);
      return q.evidence.every((item) => !Object.hasOwn(item, '_sha'));
    })()],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (failed.length) {
    console.error(`build-deploy-currency --self-test: ${failed.length} failure(s)`);
    process.exit(1);
  }
  console.log(`build-deploy-currency --self-test: ${cases.length}/${cases.length} passed`);
}

async function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const committed = committedObservation();
  const observation = process.argv.includes('--probe') ? mergeObservation(committed, await probe()) : committed;
  const content = JSON.stringify(deriveCurrency(observation), null, 2) + '\n';
  if (process.argv.includes('--check')) {
    const actual = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (actual !== content) {
      console.error('build-deploy-currency: receipt drifted; run --probe for live evidence or without --check to rebind');
      process.exit(1);
    }
  } else {
    fs.writeFileSync(OUT, content);
  }
  const feed = JSON.parse(content);
  if (feed.honesty.challengedAt) {
    // Transient upstream trouble is a degrade, not a failure: the retained
    // observation still stands and this exits 0 (see isTransientProbeError).
    const kind = isTransientProbeError(feed.honesty.challengeError) ? 'transient' : 'unclassified';
    console.log(`build-deploy-currency: probe at ${feed.honesty.challengedAt} failed — ${kind} (${feed.honesty.challengeError}) — last usable observation retained, exiting 0`);
  }
  console.log(`build-deploy-currency: ${feed.state}${feed.commitsBehind !== null ? ` · ${feed.commitsBehind} commit(s) behind · ${feed.ageDays}d` : ''}`);
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirect) await main();
