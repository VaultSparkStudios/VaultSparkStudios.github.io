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
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { compareShellHtml } from './lib/shell-parity.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'api', 'deploy-currency.json');
const PROD = process.env.PROD_ORIGIN || 'https://vaultsparkstudios.com';
const SHA_PATH = '/api/build-sha.json';
const SHELL_ROUTE = '/';
const TIMEOUT_MS = 10_000;
const HOUR_MS = 3_600_000;

/** Warn once a deploy is this far behind; block-worthy past the hard ceiling. */
export const WARN_HOURS = 12;
export const BLOCK_HOURS = 48;

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

export function isChallengeError(error) {
  if (!error) return false;
  return CHALLENGE_STATUSES.some((code) => new RegExp(`\\b${code}\\b`).test(String(error)));
}

/** Keep the newest USABLE observation; carry a challenge alongside it, never over it. */
export function mergeObservation(previous, fresh) {
  if (!fresh) return previous || null;
  const usable = Boolean(fresh.deployedSha) && !fresh.error;
  const shellParity = mergeShellParity(previous?.shellParity, fresh.shellParity);
  if (usable) return { ...fresh, shellParity, challengedAt: null, challengeError: null };
  const carry = previous && previous.deployedSha ? previous : null;
  if (!carry) return { ...fresh, shellParity, challengedAt: fresh.observedAt, challengeError: fresh.error || null };
  return {
    ...carry,
    shellParity,
    challengedAt: fresh.observedAt,
    challengeError: fresh.error || null,
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

export function classify({ found, commitsBehind, ageHours }) {
  if (found === false) return 'diverged';
  if (!Number.isInteger(commitsBehind)) return 'unobserved';
  if (commitsBehind === 0) return 'current';
  return Number.isFinite(ageHours) && ageHours >= BLOCK_HOURS ? 'stale' : 'behind';
}

export function deriveCurrency(observation) {
  const o = observation || {};
  const hasObservation = Boolean(o.observedAt && o.deployedSha);
  const state = hasObservation ? classify(o) : 'unobserved';
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
    ageDays: ageHours === null ? null : Math.round((ageHours / 24) * 10) / 10,
    thresholds: { warnHours: WARN_HOURS, blockHours: BLOCK_HOURS },
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
    },
    ...(o.error ? { error: String(o.error).slice(0, 120) } : {}),
  };
}

const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', windowsHide: true }).trim();

function compareToRepo(deployedSha) {
  const repoTipSha = git(['rev-parse', 'HEAD']);
  let found = true;
  try {
    git(['cat-file', '-e', deployedSha]);
  } catch {
    found = false;
  }
  if (!found) return { repoTipSha, found: false, commitsBehind: null, deployedCommitAt: null, ageHours: null };
  const commitsBehind = Number.parseInt(git(['rev-list', '--count', `${deployedSha}..HEAD`]), 10);
  const deployedCommitAt = new Date(git(['show', '-s', '--format=%cI', deployedSha])).toISOString();
  const tipCommitAt = new Date(git(['show', '-s', '--format=%cI', repoTipSha])).toISOString();
  const ageHours = (Date.parse(tipCommitAt) - Date.parse(deployedCommitAt)) / HOUR_MS;
  return { repoTipSha, found: true, commitsBehind, deployedCommitAt, ageHours };
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
    return { observedAt, observedOrigin: new URL(PROD).origin, deployedSha, ...compareToRepo(deployedSha) };
  } catch (error) {
    return { observedAt, observedOrigin: new URL(PROD).origin, error: String(error?.message || error).slice(0, 120) };
  }
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
  const [sha, shellParity] = await Promise.all([probeSha(), probeShellParity(observedAt)]);
  return { ...sha, shellParity };
}

/** Rebuild the observation from a committed receipt so non-probe runs are pure. */
function committedObservation() {
  if (!fs.existsSync(OUT)) return null;
  try {
    const c = JSON.parse(fs.readFileSync(OUT, 'utf8'));
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
      shellParity: c.shellParity || null,
      ...(c.error ? { error: c.error } : {}),
    };
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
    ['NO PROBE IS NEVER CURRENT', dark.state === 'unobserved' && dark.commitsBehind === null],
    ['a failed probe is not current either', errored.state === 'unobserved' && errored.error === 'HTTP 503'],
    ['the warn/block ceiling is published, not implicit', current.thresholds.blockHours === BLOCK_HOURS && current.thresholds.warnHours === WARN_HOURS],
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
  if (feed.honesty.challengedAt) console.log(`build-deploy-currency: probe at ${feed.honesty.challengedAt} was challenged (${feed.honesty.challengeError}) — last usable observation retained`);
  console.log(`build-deploy-currency: ${feed.state}${feed.commitsBehind !== null ? ` · ${feed.commitsBehind} commit(s) behind · ${feed.ageDays}d` : ''}`);
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirect) await main();
