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
  try {
    JSON.parse(readFileSync(capMapPath, 'utf8'));
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
      // Capability not defined in CAPABILITY_MAP — advisory only (not a gateway regression)
      results.push({
        status: 'SKIP',
        module: 'gateway-readiness · claude.api',
        reason: `capability not in CAPABILITY_MAP (studio-ops agent cap — not a site build dep)`,
      });
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
