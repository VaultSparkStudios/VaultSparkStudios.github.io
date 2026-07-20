#!/usr/bin/env node
/**
 * smoke-startup-scripts.mjs
 *
 * Validates that all lib modules imported by the startup-script stack
 * (render-startup-brief.mjs, generate-genius-list.mjs, cache-genius-list.mjs)
 * exist on disk AND export the symbols the callers expect.
 *
 * Wired into `npm run build:check` so a missing lib surfaces in CI before
 * a session start crashes mid-brief (the blind spot that caused the S99 crash).
 *
 * Exit 0 → all checks pass.
 * Exit 1 → one or more failures (list printed to stdout).
 */

import { existsSync, readFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { spawnSync } from './lib/safe-spawn.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root      = resolve(__dirname, '..');

// ── Manifest: { module: relative path from scripts/, exports: string[] } ──────
const CHECKS = [
  {
    module: 'scripts/lib/insight-voice-linter.mjs',
    exports: ['lintInsight', 'assertInsightVoice'],
  },
  {
    module: 'scripts/lib/skill-brief.mjs',
    exports: ['BRIEF_KINDS', 'validate', 'render', 'renderAndArchive'],
  },
  {
    module: 'scripts/lib/brief-blocks.mjs',
    exports: ['renderTitleHeader', 'renderLastCompleted', 'renderTestItNow'],
  },
  {
    module: 'scripts/lib/audit-sidecar.mjs',
    exports: ['findLatestAuditSidecar', 'appendExecution'],
  },
  {
    module: 'scripts/lib/task-board.mjs',
    exports: ['parseUnifiedItems'],
  },
  {
    module: 'scripts/lib/cross-repo-tasks.mjs',
    exports: ['loadPortfolioTaskBoards'],
  },
  {
    module: 'scripts/lib/ignis-insight.mjs',
    exports: ['loadIgnisInsight'],
  },
  {
    module: 'scripts/lib/model-router.mjs',
    exports: ['contextWindowForAgent'],
  },
  {
    module: 'scripts/lib/human-action-ages.mjs',
    exports: ['ensureAges', 'daysSince'],
  },
  {
    module: 'scripts/lib/blocker-rules.mjs',
    exports: [],
  },
  {
    module: 'scripts/lib/load-registry.mjs',
    exports: [],
  },
  {
    module: 'scripts/lib/meaningful-diff.mjs',
    exports: [],
  },
  {
    module: 'scripts/lib/runtime-pack.mjs',
    exports: [],
  },
  {
    module: 'scripts/lib/secrets.mjs',
    exports: [],
  },
  {
    module: 'scripts/lib/studio-events.mjs',
    exports: [],
  },
  {
    module: 'scripts/lib/validate.mjs',
    exports: [],
  },
  {
    // context-wipe-guard (S179 module, wired into closeout-autopilot S219).
    // Guards context/docs/logs against accidental wipes at closeout.
    module: 'scripts/lib/context-wipe-guard.mjs',
    exports: ['assertSafeWrite', 'checkContextFiles', 'appendOnlyPreserved', 'isGeneratedWiped'],
  },
  {
    module: 'scripts/lib/genius-task-classifier.mjs',
    exports: ['isConsolidatedCarryItem'],
  },
  {
    module: 'scripts/lib/lighthouse-volatility-policy.mjs',
    exports: ['LIGHTHOUSE_VOLATILITY_POLICY', 'summarizeLighthouseTrend', 'decideLighthouseVolatility'],
  },
  {
    module: 'scripts/lib/closeout-event-ledger.mjs',
    exports: ['resolveProjectEventLedger', 'validateProjectEventLedger'],
  },
];

let failures = 0;
const results = [];

for (const check of CHECKS) {
  const absPath = resolve(root, check.module);

  // 1. File existence
  if (!existsSync(absPath)) {
    results.push({ status: 'FAIL', module: check.module, reason: 'file not found' });
    failures++;
    continue;
  }

  // 2. Import + export shape (dynamic import — real Node resolution)
  try {
    const mod = await import(pathToFileURL(absPath).href);
    const missing = check.exports.filter(name => typeof mod[name] === 'undefined');
    if (missing.length) {
      results.push({
        status: 'FAIL',
        module: check.module,
        reason: `missing exports: ${missing.join(', ')}`,
      });
      failures++;
    } else {
      results.push({ status: 'OK', module: check.module });
    }
  } catch (err) {
    results.push({ status: 'FAIL', module: check.module, reason: `import error: ${err.message}` });
    failures++;
  }
}

// ── Closeout brief behavioral fixture (S246) ─────────────────────────────────
// S245 restored the modules; this locks the behavior that matters at closeout:
// bad founder-facing insight is rejected, and a valid fixture archives a brief.
try {
  const skillBrief = await import(pathToFileURL(resolve(root, 'scripts/lib/skill-brief.mjs')).href);
  let rejected = false;
  try {
    skillBrief.validate({
      kind: 'closeout',
      session: 'S246',
      date: '2026-07-01',
      agent: 'smoke',
      repo: 'VaultSparkStudios.github.io',
      headline: 'Bad insight fixture.',
      items: [{
        id: '#bad',
        slug: 'bad-opener',
        title: 'Bad opener',
        axis: 'organization',
        leftScore: 5,
        rightScore: 5,
        insight: 'This implementation uses forbidden opener text.',
        evidence: 'fixture',
      }],
      followUps: [],
      blockers: [],
    });
  } catch {
    rejected = true;
  }
  if (!rejected) {
    results.push({ status: 'FAIL', module: 'closeout-brief · voice rejection', reason: 'bad insight opener was accepted' });
    failures++;
  } else {
    results.push({ status: 'OK', module: 'closeout-brief · voice rejection' });
  }

  const smokeDir = resolve(root, '.cache', 'closeout-brief-smoke');
  const docsDir = resolve(smokeDir, 'docs');
  const fixture = resolve(smokeDir, 'brief.json');
  await import('node:fs').then(({ default: fs }) => {
    fs.mkdirSync(smokeDir, { recursive: true });
    fs.rmSync(docsDir, { recursive: true, force: true });
    fs.writeFileSync(fixture, JSON.stringify({
      session: 'S246SMOKE',
      date: '2026-07-01',
      agent: 'smoke',
      repo: 'VaultSparkStudios.github.io',
      headline: 'Closeout renderer fixture writes a real archive.',
      items: [{
        id: '#1',
        slug: 'closeout-fixture',
        title: 'Closeout fixture',
        axis: 'organization',
        projectImpact: 7,
        ecosystemImpact: 5,
        insight: 'Closeout brief smoke now exercises the renderer path with a valid fixture. The archive proof catches missing write behavior before a real closeout depends on it.',
        evidence: 'scripts/render-closeout-brief.mjs --input .cache fixture',
      }],
      followUps: [],
      blockers: [],
    }, null, 2));
  });
  const closeoutRun = spawnSync(process.execPath, [resolve(root, 'scripts/render-closeout-brief.mjs'), '--input', fixture], {
    cwd: smokeDir,
    encoding: 'utf8',
    windowsHide: true,
  });
  const archived = resolve(docsDir, 'CLOSEOUT_BRIEF_S246SMOKE_2026-07-01.md');
  if (closeoutRun.status !== 0 || !existsSync(archived)) {
    results.push({
      status: 'FAIL',
      module: 'closeout-brief · archive fixture',
      reason: closeoutRun.stderr?.trim().split('\n').slice(-1)[0] || 'archive was not written',
    });
    failures++;
  } else {
    results.push({ status: 'OK', module: 'closeout-brief · archive fixture' });
  }
} catch (err) {
  results.push({ status: 'FAIL', module: 'closeout-brief · behavioral fixture', reason: `fixture error: ${err.message}` });
  failures++;
}
// ── Startup session coherence gate (S246) ───────────────────────────────────
try {
  const coherence = spawnSync(process.execPath, [resolve(root, 'scripts/check-startup-session-coherence.mjs')], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
  });
  if (coherence.status === 0) {
    results.push({ status: 'OK', module: `startup-session-coherence · ${(coherence.stdout || '').trim()}` });
  } else {
    results.push({
      status: 'FAIL',
      module: 'startup-session-coherence',
      reason: (coherence.stderr || coherence.stdout || '').trim().split('\n').slice(0, 2).join(' | ') || 'brief session mismatch',
    });
    failures++;
  }
} catch (err) {
  results.push({ status: 'FAIL', module: 'startup-session-coherence', reason: `spawn error: ${err.message}` });
  failures++;
}
// ── Startup active-age sanity (S265) ─────────────────────────────────────────
// Session numbers are not dates. If a numeric status field leaks into date
// candidates, the brief can claim 20K+ days since activity while closeout is fresh.
try {
  const briefText = readFileSync(resolve(root, 'docs/STARTUP_BRIEF.md'), 'utf8');
  const ageMatch = briefText.match(/Last active:\s*(\d+)d\s+·\s+Last closeout:\s*(\d+)d/);
  if (!ageMatch) {
    results.push({ status: 'FAIL', module: 'startup-active-age', reason: 'SCORE line missing active/closeout ages' });
    failures++;
  } else {
    const activeAge = Number(ageMatch[1]);
    const closeoutAge = Number(ageMatch[2]);
    if (!Number.isFinite(activeAge) || !Number.isFinite(closeoutAge) || activeAge > 30 || activeAge > closeoutAge) {
      results.push({
        status: 'FAIL',
        module: 'startup-active-age',
        reason: `implausible active=${ageMatch[1]}d closeout=${ageMatch[2]}d`,
      });
      failures++;
    } else {
      results.push({ status: 'OK', module: `startup-active-age · active ${activeAge}d / closeout ${closeoutAge}d` });
    }
  }
} catch (err) {
  results.push({ status: 'FAIL', module: 'startup-active-age', reason: `read/parse error: ${err.message}` });
  failures++;
}
// ── Genius-list gate integrity (S264) ────────────────────────────────────────
// Founder/device/provider/soak-gated carries must stay visible, but not inside
// the actionable build order; SIL is v3 1000-point, never the old 500-point cap.
try {
  const { authorizationGateForTask, isConsolidatedCarryItem } = await import(pathToFileURL(resolve(root, 'scripts/lib/genius-task-classifier.mjs')).href);
  const classifierCases = [
    ['explicit carry tag', '[S97→S98][FOLLOWUP carry] A, B, C', true],
    ['carry-forward subject', '[S283] Carry-forward — bundled follow-ups', true],
    ['ordinary prose mention', '[S282][PERF] Fix Lighthouse — preserve the carry evidence', false],
    ['ordinary verb', '[S283][UX] Carry the proof into the release page', false],
  ];
  const classifierFailures = classifierCases.filter(([, text, expected]) => isConsolidatedCarryItem(text) !== expected);
  if (classifierFailures.length) {
    results.push({ status: 'FAIL', module: 'genius-list · carry classifier', reason: classifierFailures.map(([name]) => name).join(', ') });
    failures++;
  } else {
    results.push({ status: 'OK', module: 'genius-list · carry classifier', reason: `${classifierCases.length} behavioral cases` });
  }

  // Evidence-based post-push-verify resolution (S283-recovery) — must flip BOTH ways:
  const authorizationCases = [
    ['founder tag', '[AUTH/P0][FOUNDER DECISION] Authorize provider migration.', true],
    ['authorized repair dependency', 'Behavioral check. Lands with the authorized auth repair.', true],
    ['explicit authorization', 'Requires explicit founder authorization before the identity migration.', true],
    ['ordinary local work', 'Add a parser test for signed-out state.', false],
  ];
  const authorizationFailures = authorizationCases
    .filter(([, text, expected]) => Boolean(authorizationGateForTask(text)) !== expected);
  if (authorizationFailures.length) {
    results.push({ status: 'FAIL', module: 'genius-list · authorization classifier', reason: authorizationFailures.map(([name]) => name).join(', ') });
    failures++;
  } else {
    results.push({ status: 'OK', module: 'genius-list · authorization classifier', reason: `${authorizationCases.length} behavioral cases` });
  }

  // resolved only with a green CI beacon AND generic phrasing; never on specific work
  // or a red/unknown beacon.
  const { isSatisfiedPostPushVerify } = await import(pathToFileURL(resolve(root, 'scripts/lib/verify-carry-evidence.mjs')).href);
  const green = { browserGatesGreen: true, verifiedBrowserHeadSha: '8f1cb7ea802dad9e1bb8a149cb79883adad04639' };
  const red = { browserGatesGreen: false, verifiedBrowserHeadSha: '' };
  const verifyCases = [
    ['generic post-push verify + green beacon → resolved', 'Confirm the S282 push went green. gh run list --commit <tip>', green, true],
    ['post-push CI confirmation + green → resolved', '[S281][VERIFY] Post-push CI confirmation', green, true],
    ['generic verify but red beacon → NOT resolved', 'Confirm the S282 push went green', red, false],
    ['specific work (annual checkout) + green → NOT resolved', 'Verify annual checkout is green in CI end-to-end', green, false],
    ['worker-deploy verify + green → NOT resolved', 'Confirm the worker deploy push went green', green, false],
    ['non-verify prose → NOT resolved', '[S283][PERF] Split the homepage inline CSS', green, false],
  ];
  const verifyFailures = verifyCases.filter(([, text, beacon, expected]) => isSatisfiedPostPushVerify(text, beacon) !== expected);
  if (verifyFailures.length) {
    results.push({ status: 'FAIL', module: 'genius-list · verify-carry evidence', reason: verifyFailures.map(([name]) => name).join(', ') });
    failures++;
  } else {
    results.push({ status: 'OK', module: 'genius-list · verify-carry evidence', reason: `${verifyCases.length} behavioral cases` });
  }

  const geniusRun = spawnSync(process.execPath, [resolve(root, 'scripts/generate-genius-list.mjs'), '--json'], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
  });
  if (geniusRun.status !== 0) {
    results.push({ status: 'FAIL', module: 'genius-list · gate integrity', reason: 'generate-genius-list --json failed' });
    failures++;
  } else {
    const parsed = JSON.parse(geniusRun.stdout || '{}');
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    const gated = Array.isArray(parsed.gated) ? parsed.gated : [];
    const founderLeak = items.find((item) => /\[[^\]]*FOUNDER[^\]]*\]|founder review|founder call|founder-device|founder sign-off|public-safe decision/i.test(`${item.task || ''} ${item.rationale || ''}`));
    const authorizationLeak = items.find((item) => authorizationGateForTask(item.task || ''));
    const silOk = parsed.scoreSummary?.silMax === 1000;
    const hasGatedLedger = gated.some((item) => item.gate?.kind === 'founder-gated');
    if (founderLeak || authorizationLeak || !silOk || !hasGatedLedger) {
      const reason = founderLeak || authorizationLeak
        ? `authorization-gated item leaked into actionable list: ${(founderLeak || authorizationLeak).title}`
        : !silOk
          ? `silMax=${parsed.scoreSummary?.silMax || 'missing'}; expected 1000`
          : 'gated founder ledger missing';
      results.push({ status: 'FAIL', module: 'genius-list · gate integrity', reason });
      failures++;
    } else {
      results.push({ status: 'OK', module: 'genius-list · gate integrity' });
    }
  }
} catch (err) {
  results.push({ status: 'FAIL', module: 'genius-list · gate integrity', reason: `spawn/parse error: ${err.message}` });
  failures++;
}

// ── Public discovery + Oracle source-of-truth contracts (S283) ──────────────
try {
  const llms = readFileSync(resolve(root, 'scripts/build-llms-full-shards.mjs'), 'utf8');
  const agents = readFileSync(resolve(root, 'scripts/build-agents-json.mjs'), 'utf8');
  const oracle = readFileSync(resolve(root, 'oracle/index.html'), 'utf8');
  const oracleExtra = readFileSync(resolve(root, 'assets/oracle-extra.js'), 'utf8');
  const discoveryOk = [llms, agents].every((text) =>
    text.includes("join(ROOT, 'api', 'ecosystem-state.json')")
    && text.includes('state.publicSafe !== true')
    && !text.includes("join(ROOT, 'ignis', 'output', 'ecosystem-state.json')")
  );
  if (discoveryOk) results.push({ status: 'OK', module: 'public discovery · committed source', reason: '2 generators public-safe + deterministic' });
  else { results.push({ status: 'FAIL', module: 'public discovery · committed source', reason: 'generator source contract drifted' }); failures++; }

  const productionIgnisFetch = /fetch\(\s*['"]\/ignis\/output\//;
  const oracleOk = !productionIgnisFetch.test(oracle)
    && !productionIgnisFetch.test(oracleExtra)
    && oracle.includes('window.VSOracleFeeds')
    && oracle.includes('const cache = new Map()')
    && oracleExtra.includes('self.VSOracleFeeds');
  if (oracleOk) results.push({ status: 'OK', module: 'oracle · public feed cache', reason: 'no production IGNIS probe + shared promises' });
  else { results.push({ status: 'FAIL', module: 'oracle · public feed cache', reason: 'Oracle public-feed contract drifted' }); failures++; }

  const tierGate = readFileSync(resolve(root, 'scripts/check-lighthouse-route-tiers.mjs'), 'utf8');
  const trendGate = readFileSync(resolve(root, 'scripts/check-lighthouse-trend.mjs'), 'utf8');
  const policyOk = [tierGate, trendGate].every((text) => text.includes("./lib/lighthouse-volatility-policy.mjs"));
  if (policyOk) results.push({ status: 'OK', module: 'lighthouse · volatility policy', reason: 'both blocking gates share one policy' });
  else { results.push({ status: 'FAIL', module: 'lighthouse · volatility policy', reason: 'gate policy import drifted' }); failures++; }
} catch (err) {
  results.push({ status: 'FAIL', module: 'S283 source-of-truth contracts', reason: err.message });
  failures++;
}
// ── Gateway-readiness assertion (S115) ────────────────────────────────────────
// Catches S113-class secrets-gateway reverts: when CAPABILITY_MAP.json is
// reachable (local secrets/ or sibling vaultspark-studio-ops/secrets/) but
// resolveCapability('claude.api') returns ok:false, the sibling-fallback
// path in lib/secrets.mjs has regressed. CI without sibling secrets skips.
const capMapReachable =
  existsSync(join(root, 'secrets', 'CAPABILITY_MAP.json')) ||
  existsSync(resolve(root, '..', 'vaultspark-studio-ops', 'secrets', 'CAPABILITY_MAP.json'));

if (capMapReachable) {
  const capMapPath = existsSync(join(root, 'secrets', 'CAPABILITY_MAP.json'))
    ? join(root, 'secrets', 'CAPABILITY_MAP.json')
    : resolve(root, '..', 'vaultspark-studio-ops', 'secrets', 'CAPABILITY_MAP.json');
  let capMapParseError = null;
  let parsedCapMap = null;
  try {
    parsedCapMap = JSON.parse(readFileSync(capMapPath, 'utf8'));
  } catch (err) {
    capMapParseError = err;
  }

  if (capMapParseError) {
    results.push({
      status: 'SKIP',
      module: 'gateway-readiness · claude.api',
      reason: `CAPABILITY_MAP.json is not valid JSON (${capMapParseError.message}); external secrets map is not a website build artifact`,
    });
  } else {
    try {
    const { resolveCapability } = await import(pathToFileURL(resolve(root, 'scripts/lib/secrets.mjs')).href);
    const r = resolveCapability('claude.api');
    if (r.ok) {
      results.push({ status: 'OK', module: 'gateway-readiness · claude.api' });
    } else if (r.missing.length === 0 && r.required.length === 0) {
      if (parsedCapMap?.capabilities?.['claude.api']) {
        results.push({
          status: 'FAIL',
          module: 'gateway-readiness · claude.api',
          reason: `reachable CAPABILITY_MAP defines claude.api, but resolveCapability returned 0/0 — gateway map fallback is broken`,
        });
        failures++;
      } else {
        // Capability not defined in CAPABILITY_MAP — advisory only (not a gateway regression)
        results.push({
          status: 'SKIP',
          module: 'gateway-readiness · claude.api',
          reason: `capability not in CAPABILITY_MAP (studio-ops agent cap — not a site build dep)`,
        });
      }
    } else {
      results.push({
        status: 'FAIL',
        module: 'gateway-readiness · claude.api',
        reason: `resolveCapability returned ok:false (missing: ${r.missing.join(', ')}) — sibling-fallback may be broken (S113-class regression)`,
      });
      failures++;
    }
    } catch (err) {
      results.push({
        status: 'FAIL',
        module: 'gateway-readiness · claude.api',
        reason: `import/resolve error: ${err.message}`,
      });
      failures++;
    }
  }
} else {
  results.push({ status: 'SKIP', module: 'gateway-readiness · claude.api', reason: 'no CAPABILITY_MAP.json reachable (CI without sibling secrets)' });
}

// ── Behavioral assertion: context-wipe-guard append-only logic (S219) ─────────
// The append-only invariant is subtle (handles both newest-first prepend and
// oldest-first append, and exempts the rolling-status block) and regression-prone.
// Assert the two cases that matter in-process, so CI catches a logic break — not
// just a missing export — without adding a build:check segment (cmd.exe length).
try {
  const cwg = await import(pathToFileURL(resolve(root, 'scripts/lib/context-wipe-guard.mjs')).href);
  const checks = [
    [cwg.appendOnlyPreserved('# H\n\n## old', '# H\n\n## new\n\n## old'), true, 'prepend-after-header preserved'],
    [cwg.appendOnlyPreserved('A\nMID\nC', 'A\nEDIT\nC'), false, 'mid-edit flagged'],
    [cwg.appendOnlyPreserved(
      '# H\n<!-- rolling-status-start -->OLD<!-- rolling-status-end -->\n## e',
      '# H\n<!-- rolling-status-start -->NEW<!-- rolling-status-end -->\n## e'), true, 'rolling-status refresh exempt'],
    [cwg.isGeneratedWiped(''), true, 'empty generated == wiped'],
    [cwg.isGeneratedWiped('Generated: x\n## Real'), false, 'valid regen not wiped'],
  ];
  const bad = checks.filter(([got, want]) => got !== want);
  if (bad.length) {
    for (const [, , label] of bad) {
      results.push({ status: 'FAIL', module: `context-wipe-guard · ${label}`, reason: 'behavioral invariant broke' });
      failures++;
    }
  } else {
    results.push({ status: 'OK', module: 'context-wipe-guard · append-only invariants' });
  }
} catch (err) {
  results.push({ status: 'FAIL', module: 'context-wipe-guard · behavioral', reason: `import error: ${err.message}` });
  failures++;
}

// ── Orphan-lib gate (S219) — no scripts/lib/*.mjs imported by zero consumers ───
// Folded in here (not a new build:check segment) to respect the cmd.exe length
// ceiling. Exits 1 only on a NON-allowlisted orphan; untracked-lib is warn-level.
try {
  const orphanCheck = spawnSync(process.execPath, [resolve(root, 'scripts/check-orphan-libs.mjs')], {
    cwd: root, encoding: 'utf8', windowsHide: true,
  });
  if (orphanCheck.status === 0) {
    results.push({ status: 'OK', module: 'check-orphan-libs · no orphaned lib modules' });
  } else {
    const tail = (orphanCheck.stderr || orphanCheck.stdout || '').trim().split('\n').slice(-3).join(' | ');
    results.push({ status: 'FAIL', module: 'check-orphan-libs', reason: tail || 'orphaned lib module found' });
    failures++;
  }
} catch (err) {
  results.push({ status: 'FAIL', module: 'check-orphan-libs', reason: `spawn error: ${err.message}` });
  failures++;
}

// ── Workflow install-consistency gate (S221) — no `npm ci` / `cache: 'npm'` in ──
// CI workflows (the lockfile is gitignored here, so both can only ever fail).
// Folded in here, not a new build:check segment, to respect the cmd.exe ceiling.
try {
  const wfCheck = spawnSync(process.execPath, [resolve(root, 'scripts/check-workflow-install-consistency.mjs')], {
    cwd: root, encoding: 'utf8', windowsHide: true,
  });
  if (wfCheck.status === 0) {
    results.push({ status: 'OK', module: 'check-workflow-install-consistency · npm install only' });
  } else {
    const tail = (wfCheck.stderr || wfCheck.stdout || '').trim().split('\n').slice(-4).join(' | ');
    results.push({ status: 'FAIL', module: 'check-workflow-install-consistency', reason: tail || 'forbidden install directive' });
    failures++;
  }
} catch (err) {
  results.push({ status: 'FAIL', module: 'check-workflow-install-consistency', reason: `spawn error: ${err.message}` });
  failures++;
}

// ── Canon-adoption freshness gate (S221) — every live ACTIVE canon has a row in ─
// context/CANON_ADOPTION.md. Local mirror of the studio-ops walk; fails only on a
// MISSING (un-walked) live canon, advisories (extra/count/age) never fail.
try {
  const canonCheck = spawnSync(process.execPath, [resolve(root, 'scripts/check-canon-adoption-freshness.mjs')], {
    cwd: root, encoding: 'utf8', windowsHide: true,
  });
  if (canonCheck.status === 0) {
    results.push({ status: 'OK', module: 'check-canon-adoption-freshness · full coverage' });
  } else {
    const tail = (canonCheck.stderr || canonCheck.stdout || '').trim().split('\n').slice(-2).join(' | ');
    results.push({ status: 'FAIL', module: 'check-canon-adoption-freshness', reason: tail || 'un-walked live canon' });
    failures++;
  }
} catch (err) {
  results.push({ status: 'FAIL', module: 'check-canon-adoption-freshness', reason: `spawn error: ${err.message}` });
  failures++;
}

// ── agents.json on-site/external coherence (S221) — ADVISORY (never fails the ──
// suite; the resolution is a founder/content decision). Surfaces any entry that
// sends agents to an external domain while an on-site canonical page exists.
try {
  const agc = spawnSync(process.execPath, [resolve(root, 'scripts/check-agents-json-coherence.mjs'), '--json'], {
    cwd: root, encoding: 'utf8', windowsHide: true,
  });
  let n = 0;
  try { n = (JSON.parse(agc.stdout || '{}').findings || []).length; } catch { /* leave 0 */ }
  results.push({
    status: 'OK',
    module: 'check-agents-json-coherence · advisory',
    reason: n ? `${n} external-url entr(y/ies) shadow an on-site page (founder-decision; non-blocking)` : undefined,
  });
} catch (err) {
  results.push({ status: 'SKIP', module: 'check-agents-json-coherence', reason: `spawn error: ${err.message}` });
}

// ── hero JSON-LD completeness: SPARKED tiles carry required fields (S223) ─────
// Locks the S220 flagship dual-audience win (description/genre/image/sameAs).
try {
  const jld = spawnSync(process.execPath, [resolve(root, 'scripts/check-hero-jsonld-completeness.mjs')], {
    cwd: root, encoding: 'utf8', windowsHide: true,
  });
  if (jld.status === 0) {
    results.push({ status: 'OK', module: 'check-hero-jsonld-completeness · SPARKED tiles complete' });
  } else {
    failures++;
    const tail = (jld.stderr || '').trim().split('\n').slice(-2).join(' ');
    results.push({ status: 'FAIL', module: 'check-hero-jsonld-completeness', reason: tail || 'SPARKED tile missing JSON-LD fields' });
  }
} catch (err) {
  results.push({ status: 'FAIL', module: 'check-hero-jsonld-completeness', reason: `spawn error: ${err.message}` });
  failures++;
}

// ── hero LCP element: featured tile uses <picture><img fetchpriority="high"> (S226) ─
// Prevents regression to CSS image-set() background (not matched by Chrome preload).
try {
  const lcp = spawnSync(process.execPath, [resolve(root, 'scripts/check-hero-lcp-element.mjs')], {
    cwd: root, encoding: 'utf8', windowsHide: true,
  });
  if (lcp.status === 0) {
    results.push({ status: 'OK', module: 'check-hero-lcp-element · featured cover uses picture/img' });
  } else {
    failures++;
    const tail = (lcp.stderr || lcp.stdout || '').trim().split('\n').slice(-2).join(' ');
    results.push({ status: 'FAIL', module: 'check-hero-lcp-element', reason: tail || 'LCP element regression: featured tile uses CSS background instead of picture/img' });
  }
} catch (err) {
  results.push({ status: 'FAIL', module: 'check-hero-lcp-element', reason: `spawn error: ${err.message}` });
  failures++;
}

// ── build-step resilience: no hard-exit(1) on gitignored inputs (S223) ────────
try {
  const bsr = spawnSync(process.execPath, [resolve(root, 'scripts/check-build-step-resilience.mjs'), '--check'], {
    cwd: root, encoding: 'utf8', windowsHide: true,
  });
  if (bsr.status === 0) {
    results.push({ status: 'OK', module: 'check-build-step-resilience · no hard exits on gitignored inputs' });
  } else {
    failures++;
    const tail = (bsr.stderr || '').trim().split('\n').slice(-2).join(' ');
    results.push({ status: 'FAIL', module: 'check-build-step-resilience', reason: tail || 'hard-exit(1) on gitignored input detected' });
  }
} catch (err) {
  results.push({ status: 'FAIL', module: 'check-build-step-resilience', reason: `spawn error: ${err.message}` });
  failures++;
}

// ── CI publisher resilience: unattended publishers degrade on transient upstream (S285) ──
// Sibling to check-build-step-resilience — that guards the build chain against
// gitignored-file hard-exits; this guards schedule:/workflow_run: publishers against
// transient-network hard-exits (the S285 beacon-503 / RUM-R2-5xx class). Also runs the
// two transient-error classifier self-tests (workflow-only scripts, not in build:check).
for (const [label, script, arg] of [
  ['check-ci-publisher-resilience · unattended publishers degrade on transient upstream', 'check-ci-publisher-resilience.mjs', '--check'],
  ['build-ci-status-beacon · transient-gh-error policy', 'build-ci-status-beacon.mjs', '--self-test'],
  ['fetch-rum-from-r2 · transient-R2-error policy', 'fetch-rum-from-r2.mjs', '--self-test'],
]) {
  try {
    const r = spawnSync(process.execPath, [resolve(root, 'scripts', script), arg], {
      cwd: root, encoding: 'utf8', windowsHide: true,
    });
    if (r.status === 0) {
      results.push({ status: 'OK', module: label });
    } else {
      failures++;
      const tail = (r.stderr || r.stdout || '').trim().split('\n').slice(-2).join(' ');
      results.push({ status: 'FAIL', module: script, reason: tail || `${arg} failed` });
    }
  } catch (err) {
    results.push({ status: 'FAIL', module: script, reason: `spawn error: ${err.message}` });
    failures++;
  }
}

// ── workflow YAML validity: catch the inline-colon parse error before push (S223)
// Advisory-class catch (not blocking): passes with npx js-yaml; exits 0 on valid.
try {
  const wfYaml = spawnSync(process.execPath, [resolve(root, 'scripts/check-workflow-yaml-validity.mjs')], {
    cwd: root, encoding: 'utf8', windowsHide: true, timeout: 60000,
  });
  if (wfYaml.status === 0) {
    results.push({ status: 'OK', module: 'check-workflow-yaml-validity · all workflows valid' });
  } else {
    failures++;
    const tail = (wfYaml.stderr || wfYaml.stdout || '').trim().split('\n').slice(-3).join(' | ');
    results.push({ status: 'FAIL', module: 'check-workflow-yaml-validity', reason: tail || 'workflow YAML parse error' });
  }
} catch (err) {
  results.push({ status: 'SKIP', module: 'check-workflow-yaml-validity', reason: `spawn error: ${err.message}` });
}

// ── E2E networkidle patterns: prevent 30s timeout class (S224) ───────────────
try {
  const eni = spawnSync(process.execPath, [resolve(root, 'scripts/check-e2e-networkidle.mjs'), '--check'], {
    cwd: root, encoding: 'utf8', windowsHide: true,
  });
  if (eni.status === 0) {
    results.push({ status: 'OK', module: 'check-e2e-networkidle · no networkidle in E2E tests' });
  } else {
    failures++;
    const tail = (eni.stderr || eni.stdout || '').trim().split('\n').slice(-2).join(' ');
    results.push({ status: 'FAIL', module: 'check-e2e-networkidle', reason: tail || 'networkidle pattern found in E2E spec' });
  }
} catch (err) {
  results.push({ status: 'SKIP', module: 'check-e2e-networkidle', reason: `spawn error: ${err.message}` });
}

// ── Playwright .all() + async-attribute race gate (S225) ────────────────────
try {
  const pla = spawnSync(process.execPath, [resolve(root, 'scripts/check-playwright-locator-all.mjs')], {
    cwd: root, encoding: 'utf8', windowsHide: true,
  });
  if (pla.status === 0) {
    results.push({ status: 'OK', module: 'check-playwright-locator-all · no .all() + async-attribute race' });
  } else {
    failures++;
    const tail = (pla.stderr || pla.stdout || '').trim().split('\n').slice(0, 2).join(' ');
    results.push({ status: 'FAIL', module: 'check-playwright-locator-all', reason: tail || 'race pattern found' });
  }
} catch (err) {
  results.push({ status: 'SKIP', module: 'check-playwright-locator-all', reason: `spawn error: ${err.message}` });
}

// ── Dead cron advisory (S225) — warns when a scheduled workflow has gone silent ──
try {
  const dcc = spawnSync(process.execPath, [resolve(root, 'scripts/check-ci-status-dead-crons.mjs')], {
    cwd: root, encoding: 'utf8', windowsHide: true,
  });
  // Advisory only — never counts as a failure; just surface its output
  const out = `${dcc.stdout || ''}
${dcc.stderr || ''}`.trim();
  if (out) results.push({ status: 'OK', module: 'check-ci-status-dead-crons · ' + out.split('\n')[0] });
  else results.push({ status: 'OK', module: 'check-ci-status-dead-crons · skipped (no ci-status.json)' });
} catch (err) {
  results.push({ status: 'SKIP', module: 'check-ci-status-dead-crons', reason: `spawn error: ${err.message}` });
}

// ── CSP violation probe advisory (S228) — reports CSP violation counts from prod KV ──
// Non-blocking: always exits 0. Requires network; skipped automatically if unreachable.
try {
  const cspProbe = spawnSync(process.execPath, [resolve(root, 'scripts/check-csp-violations.mjs'), '--self-test'], {
    cwd: root, encoding: 'utf8', windowsHide: true,
  });
  const selfOut = (cspProbe.stdout || '').trim();
  results.push({ status: cspProbe.status === 0 ? 'OK' : 'SKIP', module: 'check-csp-violations · ' + (selfOut.split('\n')[0] || 'self-test') });
} catch (err) {
  results.push({ status: 'SKIP', module: 'check-csp-violations', reason: `spawn error: ${err.message}` });
}

// ── Lighthouse release-bar contract (S269) ───────────────────────────────────
// The CI config is the source of truth for release quality. This guard catches a
// quiet downgrade back to advisory performance scores or weaker category floors.
try {
  const config = JSON.parse(readFileSync(resolve(root, '.lighthouserc.json'), 'utf8'));
  const assertions = config?.ci?.assert?.assertions || {};
  const expected = [
    ['categories:performance', 'error', 0.76],
    ['categories:accessibility', 'error', 0.95],
    ['categories:best-practices', 'error', 0.9],
    ['categories:seo', 'error', 0.95],
  ];
  const drift = [];
  for (const [key, level, minScore] of expected) {
    const actual = assertions[key];
    const actualLevel = Array.isArray(actual) ? actual[0] : null;
    const actualScore = Array.isArray(actual) ? Number(actual[1]?.minScore) : NaN;
    if (actualLevel !== level || !Number.isFinite(actualScore) || actualScore < minScore) {
      drift.push(`${key} expected ${level} >=${minScore}, got ${actualLevel || 'missing'} ${Number.isFinite(actualScore) ? actualScore : 'missing'}`);
    }
  }
  const workflow = readFileSync(resolve(root, '.github/workflows/lighthouse.yml'), 'utf8');
  const stagingJob = workflow.match(/\n  lighthouse-staging:\n([\s\S]*?)(?=\n  [\w-]+:|$)/)?.[1] || '';
  if (!stagingJob) {
    drift.push('lighthouse-staging job missing');
  } else if (/^    continue-on-error:\s*true\s*$/m.test(stagingJob)) {
    drift.push('lighthouse-staging must be blocking, not continue-on-error');
  }
  if (drift.length) {
    failures++;
    results.push({ status: 'FAIL', module: 'lighthouse-release-bar', reason: drift.join('; ') });
  } else {
    results.push({ status: 'OK', module: 'lighthouse-release-bar · blocking local+staging / global perf 0.76 / a11y 0.95 / bp 0.90 / seo 0.95' });
  }
} catch (err) {
  failures++;
  results.push({ status: 'FAIL', module: 'lighthouse-release-bar', reason: `read/parse error: ${err.message}` });
}
// ── Lighthouse route-tier release bar (S270) — strict routes stay strict, long-tail gets explicit floors ──
try {
  const tierProbe = spawnSync(process.execPath, [resolve(root, 'scripts/check-lighthouse-route-tiers.mjs'), '--check-config'], {
    cwd: root, encoding: 'utf8', windowsHide: true,
  });
  const tierOut = (tierProbe.stdout || '').trim();
  const tierErr = (tierProbe.stderr || '').trim();
  const tierStatus = tierProbe.status === 0 ? 'OK' : 'FAIL';
  if (tierProbe.status !== 0) failures++;
  results.push({ status: tierStatus, module: 'check-lighthouse-route-tiers · ' + (tierOut.split('\n')[0] || tierErr.split('\n')[0] || 'tier config') });
} catch (err) {
  results.push({ status: 'SKIP', module: 'check-lighthouse-route-tiers', reason: `spawn error: ${err.message}` });
}
// ── Lighthouse absolute floor advisory (S233) — catches "stable but bad" scores ──
// Advisory: exits 0 on WARN, exits 1 only on ERROR (page perf median <0.74 consistently).
// Distinct from check-lighthouse-trend which detects regressions; this detects stagnation.
try {
  const floorProbe = spawnSync(process.execPath, [resolve(root, 'scripts/check-lighthouse-floor.mjs')], {
    cwd: root, encoding: 'utf8', windowsHide: true,
  });
  const floorOut = (floorProbe.stdout || '').trim();
  const floorErr = (floorProbe.stderr || '').trim();
  const floorStatus = floorProbe.status === 0 ? 'OK' : 'FAIL';
  if (floorProbe.status !== 0) failures++;
  results.push({ status: floorStatus, module: 'check-lighthouse-floor · ' + (floorOut.split('\n')[0] || floorErr.split('\n')[0] || 'floor gate') });
} catch (err) {
  results.push({ status: 'SKIP', module: 'check-lighthouse-floor', reason: `spawn error: ${err.message}` });
}

// ── INP rollup consumer advisory (S233) — surfaces phase breakdown when samples land ──
// Advisory: always exits 0 (data-blocked until field samples arrive from the fixed Worker).
try {
  const inpProbe = spawnSync(process.execPath, [resolve(root, 'scripts/rollup-inp-telemetry.mjs'), '--check'], {
    cwd: root, encoding: 'utf8', windowsHide: true,
  });
  const inpOut = (inpProbe.stdout || '').trim();
  results.push({ status: inpProbe.status === 0 ? 'OK' : 'SKIP', module: 'rollup-inp-telemetry · ' + (inpOut.split('\n')[0] || 'check') });
} catch (err) {
  results.push({ status: 'SKIP', module: 'rollup-inp-telemetry', reason: `spawn error: ${err.message}` });
}

// ── Combined hard-failure + footer release contracts (S286) ──────────────────
for (const [label, script] of [
  ['check-hardfail-resilience · combined unattended-boundary verdict', 'check-hardfail-resilience.mjs'],
  ['check-static-csp-routes · route-isolated staging browser policy', 'check-static-csp-routes.mjs'],
  ['check-footer-contract · header/footer graph complete + manifest current', 'check-footer-contract.mjs'],
  ['check-public-signal-dedupe · homepage public feed requests coalesced', 'check-public-signal-dedupe.mjs'],
]) {
  try {
    const probe = spawnSync(process.execPath, [resolve(root, 'scripts', script), '--check'], {
      cwd: root, encoding: 'utf8', windowsHide: true,
    });
    if (probe.status === 0) results.push({ status: 'OK', module: label });
    else {
      failures++;
      const tail = (probe.stderr || probe.stdout || '').trim().split('\n').slice(-2).join(' ');
      results.push({ status: 'FAIL', module: script, reason: tail || 'contract failed' });
    }
  } catch (err) {
    failures++;
    results.push({ status: 'FAIL', module: script, reason: `spawn error: ${err.message}` });
  }
}

// ── Report ────────────────────────────────────────────────────────────────────
const pad = s => s.padEnd(45);
for (const r of results) {
  const icon = r.status === 'OK' ? '✓' : r.status === 'SKIP' ? '~' : '✗';
  const detail = r.reason ? `  ← ${r.reason}` : '';
  console.log(`  ${icon}  ${pad(r.module)}${detail}`);
}

const totalChecks = results.length;
const skipCount = results.filter(r => r.status === 'SKIP').length;
const okCount = totalChecks - skipCount - failures;
if (failures === 0) {
  const skipNote = skipCount ? `, ${skipCount} skipped` : '';
  console.log(`\nsmoke-startup-scripts: ${okCount}/${totalChecks} checks passed ✓${skipNote}`);
  process.exit(0);
} else {
  console.error(`\nsmoke-startup-scripts: ${failures} of ${totalChecks} checks FAILED`);
  process.exit(1);
}
