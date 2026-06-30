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
    module: 'scripts/lib/brief-blocks.mjs',
    exports: ['renderTitleHeader', 'renderLastCompleted', 'renderTestItNow'],
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
  const out = (dcc.stdout || '').trim();
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
