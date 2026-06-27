#!/usr/bin/env node
/**
 * closeout-autopilot.mjs — Studio Ops closeout autopilot (v3.1)
 *
 * Replaces the manual multi-step closeout ceremony with one guided run:
 *   1. doctor --loop
 *   2. Refresh startup brief for next session
 *   3. Update PROJECT_STATUS.json lastUpdated + currentSession
 *   3c. Run rotation tripwire / audit freshness check
 *   4. git status + diff preview (excluding secrets/)
 *   5. *** HUMAN CONFIRMATION *** — "Commit + push all of the above? [Y/n/dry]"
 *   6. git add (filtered), git commit (conventional message), git push
 *   7. Clear .session-lock + beacon
 *   8. Print Closeout Status Board
 *
 * Usage:
 *   node scripts/closeout-autopilot.mjs                 # full run with confirm
 *   node scripts/closeout-autopilot.mjs --dry-run       # show plan, skip writes
 *   node scripts/closeout-autopilot.mjs --skip-push     # commit only, no push
 *   node scripts/closeout-autopilot.mjs --message "..."
 *
 * IMPORTANT: This script does NOT overwrite the human's context/*.md edits.
 * It expects the agent to have already updated CURRENT_STATE, TASK_BOARD,
 * LATEST_HANDOFF, DECISIONS, SIL, CDR, WORK_LOG per prompts/closeout.md.
 * This script is the ceremony — docs/write-back is the agent's job.
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { spawnSync } from './lib/safe-spawn.mjs';
import { fileURLToPath } from 'url';
import { redact } from './lib/secrets.mjs';
import { appendEvent } from './lib/studio-events.mjs';
import { checkContextFiles } from './lib/context-wipe-guard.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const SKIP_PUSH = args.includes('--skip-push');
const AUTO_YES = args.includes('--yes');
const RESPECT_STAGED = args.includes('--respect-staged');
const ALLOW_WIPE = args.includes('--allow-wipe');
const msgIdx = args.indexOf('--message');
const CUSTOM_MSG = msgIdx >= 0 ? args[msgIdx + 1] : null;
const projectIdx = args.indexOf('--project');
const projectArg = projectIdx >= 0 ? args[projectIdx + 1] : null;
const PROJECT_ROOT = projectArg
  ? path.resolve(process.cwd(), projectArg)
  : STUDIO_ROOT;
const STATUS_PATH = path.join(PROJECT_ROOT, 'context', 'PROJECT_STATUS.json');
const LOCK_PATH = path.join(PROJECT_ROOT, 'context', '.session-lock');
const BEACON_PATH = path.join(PROJECT_ROOT, '.claude', 'beacon.env');

function sh(cmd, opts = {}) {
  const r = spawnSync(cmd, { shell: true, windowsHide: true, cwd: PROJECT_ROOT, encoding: 'utf8', ...opts });
  return { out: r.stdout || '', err: r.stderr || '', code: r.status ?? -1 };
}

function shStudio(script, scriptArgs = [], opts = {}) {
  const r = spawnSync(process.execPath, [path.join(STUDIO_ROOT, 'scripts', script), ...scriptArgs], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    ...opts,
  });
  return { out: r.stdout || '', err: r.stderr || '', code: r.status ?? -1 };
}

function sessionNumber(status) {
  return status.currentSession ?? status.lastSession ?? '?';
}

function header(title) {
  const bar = '═'.repeat(64);
  console.log(`\n╔${bar}╗`);
  console.log(`║  ${title.padEnd(62)}║`);
  console.log(`╚${bar}╝\n`);
}

async function prompt(question, defaultYes = true) {
  if (DRY) { console.log(`(dry-run) would prompt: ${question}`); return defaultYes; }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(`${question} ${defaultYes ? '[Y/n/dry]' : '[y/N/dry]'}: `, answer => {
      rl.close();
      const a = (answer || '').trim().toLowerCase();
      if (a === 'dry') resolve('dry');
      else if (a === '') resolve(defaultYes);
      else resolve(a === 'y' || a === 'yes');
    });
  });
}

// ── Step 1: doctor --loop ────────────────────────────────────────────────────
header('Step 1 · Doctor --loop (self-healing)');
if (DRY) {
  console.log(`(dry-run) would run: node ${path.join(STUDIO_ROOT, 'scripts', 'run-doctor.mjs')} --loop --update-json`);
} else {
  const r = shStudio('run-doctor.mjs', ['--loop', '--update-json'], { stdio: 'inherit' });
  if (r.code !== 0) {
    console.error('⚠ Doctor failed — closeout aborted. Fix issues then re-run.');
    process.exit(1);
  }
}

// ── Step 2: Refresh startup brief ────────────────────────────────────────────
header('Step 2 · Refresh startup brief for next session');
if (DRY) {
  console.log(`(dry-run) would run: node ${path.join(STUDIO_ROOT, 'scripts', 'render-startup-brief.mjs')}`);
} else {
  const r = shStudio('render-startup-brief.mjs');
  process.stdout.write(r.out);
  if (r.code !== 0) {
    console.error('⚠ Brief render failed:', redact(r.err));
    console.error('Continuing — check brief manually.');
  }
}

// ── Step 2b: Trim LATEST_HANDOFF to last 2 sessions ─────────────────────────
header('Step 2b · Trim LATEST_HANDOFF (auto-archive sessions > 2)');
if (DRY) {
  console.log(`(dry-run) would run: node compact-handoff.mjs --trim`);
} else {
  const r = shStudio('compact-handoff.mjs', ['--trim']);
  process.stdout.write(r.out);
  if (r.code !== 0) {
    console.error('⚠ Handoff trim failed (non-fatal):', redact(r.err));
  }
}

// ── Step 3: Stamp PROJECT_STATUS.json lastUpdated ────────────────────────────
header('Step 3 · Stamp PROJECT_STATUS.json');
try {
  const s = JSON.parse(fs.readFileSync(STATUS_PATH, 'utf8'));
  const today = new Date().toISOString().slice(0, 10);
  s.lastUpdated = today;
  if (!DRY) fs.writeFileSync(STATUS_PATH, JSON.stringify(s, null, 2) + '\n');
  console.log(`  lastUpdated → ${today}  · session ${sessionNumber(s)}  · SIL ${s.silScore}/${s.silMax ?? 500}`);
} catch (e) {
  console.error('  ⚠ Could not stamp status:', e.message);
}

// ── Step 3b: Sanitize .claude/settings.local.json before diff ────────────────
header('Step 3b · Sanitize .claude/settings.local.json');
if (DRY) {
  console.log(`(dry-run) would run: node ${path.join(STUDIO_ROOT, 'scripts', 'sanitize-claude-settings.mjs')} --path ${path.join(PROJECT_ROOT, '.claude', 'settings.local.json')}`);
} else {
  const r = shStudio('sanitize-claude-settings.mjs', ['--path', path.join(PROJECT_ROOT, '.claude', 'settings.local.json')]);
  process.stdout.write(r.out);
  if (r.code !== 0) {
    console.error('⚠ Settings sanitizer failed:', redact(r.err));
    console.error('Aborting — fix the sanitizer before continuing.');
    process.exit(1);
  }
}

// ── Step 3c: Rotation tripwire before diff ──────────────────────────────────
header('Step 3c · Rotation tripwire');
if (DRY) {
  console.log(`(dry-run) would run: node ${path.join(STUDIO_ROOT, 'scripts', 'rotation-tripwire.mjs')} --auto-refresh`);
} else {
  const r = shStudio('rotation-tripwire.mjs', ['--auto-refresh'], { stdio: 'inherit' });
  if (r.code !== 0) {
    console.warn('⚠ rotation-tripwire reported warnings; continuing to pre-push checks.');
  }
}

// ── Step 3c-events: Mirror studio-ops portfolio events → local ──────────────
// The public contracts surface portfolio-wide ship activity. Only the local
// per-repo events.ndjson is read by generators now (sibling fallback caused
// CI drift because Actions never checks out studio-ops). Keep the local copy
// in sync by mirroring the sibling file here on every closeout.
header('Step 3c-events · Mirror studio-ops events.ndjson → local');
try {
  const sibling = path.join(STUDIO_ROOT || path.join(PROJECT_ROOT, '..', 'vaultspark-studio-ops'), 'portfolio', 'events.ndjson');
  const local = path.join(PROJECT_ROOT, 'portfolio', 'events.ndjson');
  if (fs.existsSync(sibling)) {
    fs.mkdirSync(path.dirname(local), { recursive: true });
    if (DRY) {
      console.log(`(dry-run) would copy ${sibling} → ${local}`);
    } else {
      fs.copyFileSync(sibling, local);
      const n = fs.readFileSync(local, 'utf8').split('\n').filter(Boolean).length;
      console.log(`  ✓ Mirrored ${n} events from studio-ops`);
    }
  } else {
    console.log('  (no sibling studio-ops/portfolio/events.ndjson — skipping)');
  }
} catch (e) { console.log(`  ⚠ Mirror skipped: ${e.message}`); }

// ── Step 3d: Regenerate derived public contracts ────────────────────────────
// Prevents S107-class drift where PROJECT_STATUS advanced but api/public-intelligence.json,
// api/heartbeat.json, api/founder-presence.json, context/contracts/*.json stayed pinned to
// the prior session and failed the next session's build:check on `--check` gates.
header('Step 3d · Regenerate derived public contracts');
const derivedGenerators = [
  'generate-public-intelligence.mjs',
  'generate-heartbeat.mjs',
  'generate-founder-presence.mjs',
];
for (const gen of derivedGenerators) {
  const genPath = path.join(PROJECT_ROOT, 'scripts', gen);
  if (!fs.existsSync(genPath)) continue;
  if (DRY) {
    console.log(`(dry-run) would run: node scripts/${gen}`);
    continue;
  }
  const r = spawnSync(process.execPath, [genPath], { cwd: PROJECT_ROOT, encoding: 'utf8', stdio: 'inherit' });
  if (r.status !== 0) {
    console.warn(`⚠ ${gen} exited ${r.status}; continuing.`);
  }
}

// ── Step 3d.5: gated production perf sample (S172 audit #10) ────────────────
// One rotating route per closeout; disk + parity gated; never blocks closeout.
header('Step 3d.5 · Production perf sample (gated, rotating)');
{
  const samplePath = path.join(PROJECT_ROOT, 'scripts', 'sample-prod-perf.mjs');
  if (!fs.existsSync(samplePath)) {
    console.log('(skip) scripts/sample-prod-perf.mjs not present');
  } else if (DRY) {
    console.log('(dry-run) would run: node scripts/sample-prod-perf.mjs');
  } else {
    const r = spawnSync(process.execPath, [samplePath], { cwd: PROJECT_ROOT, encoding: 'utf8', stdio: 'inherit', timeout: 360000 });
    if (r.status !== 0) console.warn('⚠ sample-prod-perf exited nonzero; continuing.');
  }
}

// ── Step 3d.7: Refresh derived-on-derived artifacts after contract regen ──────
// Step 3d regenerates contracts (public-intelligence, heartbeat, etc.) which:
//   1. May dirty ignis/output/ecosystem-state.json (oracle sanitizer touches it)
//   2. Changes content that llms-full-shards index (reads ecosystem-state.json)
//   3. May cause ambient-ledger structural drift
// ORDER matters: oracle sanitizer first (writes ecosystem-state.json), then shards
// (reads ecosystem-state.json), then ledger. This ensures build:check --check passes.
// S186: the ordering is now canonical in scripts/lib/build-order.mjs (self-tested)
// so it can't drift if this step is edited.
{
  const { runDerivedBuilds } = await import('./lib/build-order.mjs');
  runDerivedBuilds({ root: PROJECT_ROOT, dry: DRY, log: console });
}

// ── Step 3e: build:check pre-commit gate ─────────────────────────────────────
// After derived outputs are regenerated, run the full build:check so any `--check`
// drift (CSP hash, contracts, supabase schema, shell assets) fails the closeout
// before the commit rather than landing on remote CI.
header('Step 3e · build:check (pre-commit gate)');
if (DRY) {
  console.log('(dry-run) would run: npm run build:check');
} else if (fs.existsSync(path.join(PROJECT_ROOT, 'package.json'))) {
  const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
  if (pkg.scripts && pkg.scripts['build:check']) {
    const r = spawnSync('npm', ['run', 'build:check'], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      stdio: 'inherit',
      shell: true,
      windowsHide: true,
    });
    if (r.status !== 0) {
      console.error('\n⛔ build:check failed — blocking closeout commit. Fix drift, then re-run.');
      process.exit(1);
    }
  } else {
    console.log('  (no build:check script — skipping)');
  }
} else {
  console.log('  (no package.json — skipping)');
}

// ── Step 4: git status + diff preview ────────────────────────────────────────
header('Step 4 · Git status + change preview');
const status = sh('git status --short').out;
if (!status.trim()) {
  console.log('  No changes — nothing to commit.');
  if (!SKIP_PUSH) {
    const aheadRes = sh('git rev-list --count @{u}..HEAD 2>/dev/null').out.trim() || '0';
    if (Number(aheadRes) > 0 && !DRY) {
      console.log(`  ${aheadRes} unpushed commit(s) — pushing…`);
      const p = sh('git push');
      console.log(redact(p.out + p.err));
    }
  }
  // Clear locks even on empty closeout
  if (!DRY && fs.existsSync(LOCK_PATH)) { fs.unlinkSync(LOCK_PATH); console.log('  ✓ Session lock cleared'); }
  process.exit(0);
}
console.log(redact(status));
const diff = sh('git diff --stat').out;
console.log('\nDiff stat:');
console.log(redact(diff.split('\n').slice(0, 20).join('\n')));

// ── Guard: context-wipe protection (context-wipe-guard, S179→wired S219) ──────
// Reactive pre-commit check: compares working-tree context/docs/logs against HEAD
// and aborts on a wipe-class change (content collapsed below 50% of HEAD, or a
// prior entry in an append-only file edited/deleted). Append-only files write
// newest-first OR oldest-first; the guard handles both. The rolling-status block
// (CANON-001, designed to be overwritten each closeout) is exempt.
{
  const { ok: noWipe, findings } = checkContextFiles(PROJECT_ROOT);
  if (!noWipe) {
    console.error('\n⚠ context-wipe-guard — wipe-class change(s) detected vs HEAD:');
    for (const f of findings) {
      console.error(`    ${f.issue.padEnd(22)} ${f.file}  (${(f.ratio * 100).toFixed(1)}% of HEAD)`);
    }
    if (ALLOW_WIPE) {
      console.error('  → --allow-wipe set: proceeding despite findings (logged).');
    } else {
      console.error('\n⛔ ABORT: refusing to commit a context-file wipe. Review the findings above.');
      console.error('   If the change is intentional (e.g. an approved rewrite), re-run with --allow-wipe.');
      process.exit(2);
    }
  } else {
    console.log('  ✓ context-wipe-guard: no wipe-class changes vs HEAD');
  }
}

// ── Guard: any secrets/ path in diff? ────────────────────────────────────────
if (/^[\sMADRCU?]+secrets\//m.test(status)) {
  console.error('\n⛔ ABORT: changes detected under secrets/. Aborting to prevent accidental commit.');
  console.error('  If this is intentional, hand-commit with `git add <file>` first.');
  process.exit(2);
}

// ── Step 5: Confirm ──────────────────────────────────────────────────────────
header('Step 5 · Confirm commit + push');
const suggestedMsg = CUSTOM_MSG || (() => {
  const s = JSON.parse(fs.readFileSync(STATUS_PATH, 'utf8'));
  const focus = (s.currentFocus || 'session closeout').slice(0, 60);
  return `chore(S${sessionNumber(s)}): ${focus}`;
})();
console.log(`  Suggested message:  ${suggestedMsg}\n`);
const confirm = AUTO_YES ? true : await prompt('  Commit + push the above?', true);
if (confirm === false) { console.log('  Aborted.'); process.exit(0); }
if (confirm === 'dry') { console.log('  Dry-run mode selected — no changes written.'); process.exit(0); }

// ── Step 5b: Refresh build-sha before commit ─────────────────────────────────
// S229: regenerate api/build-sha.json to reflect the current HEAD (the last
// substantive commit) so the deployed SHA is always 1 commit fresh rather than
// potentially a session old. Must run AFTER all derived-artifact generation and
// BEFORE git add so the freshly stamped SHA is included in the closeout commit.
if (!DRY) {
  header('Step 5b · Refresh api/build-sha.json');
  const bsr = spawnSync(process.execPath, [path.join(PROJECT_ROOT, 'scripts', 'generate-build-sha.mjs')], {
    cwd: PROJECT_ROOT, encoding: 'utf8', stdio: 'inherit',
  });
  if (bsr.status !== 0) {
    console.warn('  ⚠ generate-build-sha.mjs exited non-zero — proceeding without SHA refresh');
  }
}

// ── Step 6: Commit ───────────────────────────────────────────────────────────
header('Step 6 · Commit');
if (DRY) {
  console.log(RESPECT_STAGED
    ? `(dry-run) would: git commit -m "${suggestedMsg}"  (respecting current staged set)`
    : `(dry-run) would: git add -A :!secrets/  &&  git commit -m "${suggestedMsg}"`);
} else {
  if (!RESPECT_STAGED) {
    sh('git add -A -- . ":!secrets/" ":!.claude/worktrees/"');
  }
  const c = sh(`git commit -m ${JSON.stringify(suggestedMsg)}`);
  console.log(redact(c.out || c.err));
  if (c.code !== 0) { console.error('  ⚠ Commit failed.'); process.exit(3); }
}

// ── Step 7: Push ─────────────────────────────────────────────────────────────
let pushOk = SKIP_PUSH || DRY;  // true = nothing to verify, false = real push that must land
if (!SKIP_PUSH) {
  header('Step 7 · Push');
  if (DRY) {
    console.log('(dry-run) would: git push');
  } else {
    const p = sh('git push');
    console.log(redact(p.out + p.err));
    if (p.code !== 0) {
      pushOk = false;
      console.error('  ⚠ Push failed — commit succeeded, retry `git push` manually.');
    } else {
      // Push exit-code 0 isn't enough — verify the remote actually advanced.
      // S147→S148 caught a regression where a pre-push hook block + interactive
      // confirmation gap left "Pushed: yes" reported while origin/main still
      // pointed at the prior SHA. Fetch + rev-list confirms the ref moved.
      const branch = sh('git rev-parse --abbrev-ref HEAD').out.trim() || 'main';
      sh('git fetch origin --quiet');
      const aheadOut = sh(`git rev-list origin/${branch}..HEAD --count`).out.trim();
      const ahead = parseInt(aheadOut, 10) || 0;
      if (ahead > 0) {
        pushOk = false;
        const unpushed = sh(`git log origin/${branch}..HEAD --oneline`).out.trim();
        console.error('  ⛔ Post-push verification FAILED — origin did not advance.');
        console.error(`     ${ahead} commit(s) still local-only on ${branch}:`);
        for (const line of unpushed.split('\n').filter(Boolean)) {
          console.error(`       ${line}`);
        }
        console.error('     Run `git push` manually after resolving (pre-push hook? non-fast-forward? auth?).');
      } else {
        console.log(`  ✓ Push verified — origin/${branch} matches HEAD.`);
        // S153 · post-push CI watchdog (advisory — never blocks the closeout).
        // S148 verified push landed; this verifies the workflows on that
        // push aren't already failing. Exit-1 (failing) prints a loud warn;
        // exit-2 (missing) and exit-3 (gh unavailable) are silent advisories.
        const ciCheck = sh('node scripts/check-postpush-ci.mjs --quiet');
        if (ciCheck.code === 1) {
          console.error('  ⚠ Post-push CI watchdog reports at least one FAILING critical workflow.');
          const detail = sh('node scripts/check-postpush-ci.mjs');
          if (detail.out.trim()) console.error(detail.out);
        }
        // S210 #3 · CF Pages build verify — confirms the deployed SHA on pages.dev
        // matches HEAD. Advisory: CF Pages usually deploys within 60-90s; mismatch
        // means a build is in-flight. Writes context/.deploy-pending on mismatch.
        sh('node scripts/check-pages-deploy.mjs');
      }
    }
  }
}

// ── Step 8: Clear session lock + beacon ──────────────────────────────────────
header('Step 8 · Clear session lock + beacon');
if (!DRY) {
  if (fs.existsSync(LOCK_PATH)) { fs.unlinkSync(LOCK_PATH); console.log('  ✓ context/.session-lock cleared'); }
  if (fs.existsSync(BEACON_PATH)) {
    sh(`[ -f .claude/beacon.env ] && source .claude/beacon.env && printf '{"active":[]}' | gh gist edit "$BEACON_GIST_ID" -f active.json --filename active.json 2>/dev/null || true`);
    console.log('  ✓ Beacon cleared (best-effort)');
  }
}

// ── Step 9: Status board ─────────────────────────────────────────────────────
header('Closeout Complete');
const sha = sh('git rev-parse --short HEAD').out.trim();
const branch = sh('git rev-parse --abbrev-ref HEAD').out.trim();
const pushedState = SKIP_PUSH ? 'no (--skip-push)' : DRY ? 'dry-run' : (pushOk ? 'yes' : 'FAILED — see Step 7');
const summary = shStudio('closeout-summary.mjs', [
  '--project', PROJECT_ROOT,
  '--pushed', pushedState,
  '--message', suggestedMsg,
]);
if (summary.code === 0 && summary.out.trim()) {
  console.log(summary.out);
} else {
  console.log(`  Branch:  ${branch}`);
  console.log(`  HEAD:    ${sha}`);
  console.log(`  Message: ${suggestedMsg}`);
  console.log(`  Pushed:  ${pushedState}`);
  if (summary.err.trim()) console.warn(summary.err.trim());
}

// Stackable portfolio counts + short IGNIS insight for the closeout recap.
try {
  const { loadPortfolioTaskBoards } = await import(path.join(STUDIO_ROOT, 'scripts', 'lib', 'cross-repo-tasks.mjs'));
  const { loadIgnisInsight } = await import(path.join(STUDIO_ROOT, 'scripts', 'lib', 'ignis-insight.mjs'));
  const port = loadPortfolioTaskBoards({ studioRoot: STUDIO_ROOT, currentRepoPath: PROJECT_ROOT });
  if (port?.totals) {
    console.log('');
    console.log('  Portfolio task boards:');
    console.log(`    Total ${port.totals.remaining} open · ${port.totals.unblocked} unblocked · ${port.totals.blocked} blocked`);
    console.log(`    Crit ${port.totals.critical} · High ${port.totals.high} · ${port.projectsWithWork}/${port.projectsScanned} repos active`);
  }
  const ig = loadIgnisInsight({ studioRoot: STUDIO_ROOT });
  if (ig?.present) {
    console.log('');
    console.log('  IGNIS insight:');
    if (ig.generated) console.log(`    Synth ${ig.generated} (${ig.daysSinceSynth}d) · ${ig.phase || ''}`);
    if (ig.avgIq) console.log(`    Avg IQ ${ig.avgIq} · Coverage ${ig.coverage || '?'}`);
    if (ig.topProject) console.log(`    Top: ${ig.topProject}`);
    if (ig.topRisk) console.log(`    Top risk: ${ig.topRisk}`);
    if (ig.firstAction) console.log(`    Do next: ${ig.firstAction.slice(0, 120)}`);
  }
} catch { /* best-effort — do not block closeout on insight failure */ }

console.log(`\n✓ Closeout autopilot finished. Startup brief ready for next session.\n`);

if (!DRY) {
  try {
    const s = JSON.parse(fs.readFileSync(STATUS_PATH, 'utf8'));
    appendEvent(STUDIO_ROOT, {
      type: 'session-closed',
      slug: s.slug || path.basename(PROJECT_ROOT) || 'studio-ops',
      source: 'closeout-autopilot',
      severity: 'low',
      signal: `${s.slug || path.basename(PROJECT_ROOT) || 'studio-ops'}: session ${sessionNumber(s)} closed`,
      action: null,
      attemptable: false,
      automationStatus: 'completed',
      note: `HEAD ${sha} on ${branch}; SIL ${s.silScore}/500`
    });
  } catch { /* best-effort */ }

  // ── Post-commit reconcile: the session-closed event was appended to
  // portfolio/events.ndjson AFTER the commit so it could capture the real
  // HEAD sha. That leaves events.ndjson + derived contracts one session
  // behind on remote — which causes the next /start build:check to fail
  // with "public intelligence drift detected" (S107/S108 recurring bug).
  // Regenerate contracts with the new event, then land a tiny [skip ci]
  // commit so the next session starts from a clean working tree.
  try {
    const eventsPath = path.join(STUDIO_ROOT || PROJECT_ROOT, 'portfolio', 'events.ndjson');
    const localEventsPath = path.join(PROJECT_ROOT, 'portfolio', 'events.ndjson');
    const hasLocalEvents = fs.existsSync(localEventsPath);
    if (hasLocalEvents || fs.existsSync(eventsPath)) {
      console.log('\n── Post-commit reconcile ────────────────────────────────');
      // Re-mirror sibling → local so the post-commit appendEvent (which
      // wrote to the sibling) is reflected in the local events.ndjson
      // before contracts regenerate.
      try {
        const sib = path.join(STUDIO_ROOT || path.join(PROJECT_ROOT, '..', 'vaultspark-studio-ops'), 'portfolio', 'events.ndjson');
        const loc = path.join(PROJECT_ROOT, 'portfolio', 'events.ndjson');
        if (fs.existsSync(sib)) fs.copyFileSync(sib, loc);
      } catch { /* best-effort */ }
      for (const gen of ['generate-public-intelligence.mjs', 'generate-heartbeat.mjs', 'generate-founder-presence.mjs']) {
        const genPath = path.join(PROJECT_ROOT, 'scripts', gen);
        if (!fs.existsSync(genPath)) continue;
        spawnSync(process.execPath, [genPath], { cwd: PROJECT_ROOT, stdio: 'ignore' });
      }
      const recStatus = sh('git status --short').out.trim();
      if (recStatus) {
        sh('git add -A portfolio/events.ndjson api/public-intelligence.json api/heartbeat.json api/founder-presence.json context/contracts/');
        const rc = sh(`git commit -m "chore: post-closeout events.ndjson + contracts reconcile [skip ci]"`);
        if (rc.code === 0) {
          console.log('  ✓ Reconcile commit landed');
          if (!SKIP_PUSH) {
            const rp = sh('git push');
            if (rp.code !== 0) {
              console.log('  ⚠ Reconcile push failed — run `git push` manually');
            } else {
              // Same post-push verify as Step 7 — exit 0 isn't enough.
              const rbranch = sh('git rev-parse --abbrev-ref HEAD').out.trim() || 'main';
              sh('git fetch origin --quiet');
              const rahead = parseInt(sh(`git rev-list origin/${rbranch}..HEAD --count`).out.trim(), 10) || 0;
              if (rahead > 0) {
                console.log(`  ⛔ Reconcile push verification FAILED — ${rahead} commit(s) still local. Run \`git push\` manually.`);
              } else {
                console.log('  ✓ Reconcile commit pushed (verified)');
              }
            }
          }
        }
      } else {
        console.log('  (nothing to reconcile — working tree clean)');
      }
    }
  } catch (e) { console.log(`  ⚠ Reconcile skipped: ${e.message}`); }

  // S184 deploy-strand guard. Cloudflare Pages builds ONLY the pushed tip
  // commit and SKIPS any tip whose message contains [skip ci]. The reconcile
  // commit above is [skip ci], so it strands the substantive closeout deploy
  // beneath it — observed S184: the S183 closeout's confirmed field-win.json
  // (+~20 api/*.json) never deployed; prod stayed frozen at the prior build.
  // Fix: if the pushed tip is [skip ci], land an EMPTY non-skip-ci commit so
  // Pages builds. It touches no files, so path-filtered GitHub Actions ignore
  // it, but CF Pages picks it up and deploys everything beneath.
  if (!SKIP_PUSH) {
    try {
      const SKIP_RE = /\[(?:skip ci|ci skip|skip-ci|ci-skip)\]/i;
      const tipMsg = sh('git log -1 --format=%s').out.trim();
      if (SKIP_RE.test(tipMsg)) {
        console.log('\n── Deploy-strand guard ──────────────────────────────────');
        console.log(`  ⚠ Tip is [skip ci]: "${tipMsg}" — CF Pages would skip this build.`);
        const ec = sh('git commit --allow-empty -m "chore(deploy): trigger CF Pages build (closeout tip was [skip ci])"');
        if (ec.code === 0) {
          const ep = sh('git push');
          if (ep.code === 0) {
            sh('git fetch origin --quiet');
            const branch = sh('git rev-parse --abbrev-ref HEAD').out.trim() || 'main';
            const ahead = parseInt(sh(`git rev-list origin/${branch}..HEAD --count`).out.trim(), 10) || 0;
            console.log(ahead > 0
              ? `  ⛔ Deploy-trigger push verification FAILED — ${ahead} commit(s) still local. Run \`git push\` manually.`
              : '  ✓ Empty deploy-trigger pushed — CF Pages will now build the closeout.');
          } else {
            console.log('  ⚠ Deploy-trigger push failed — run `git push` manually to deploy.');
          }
        }
      }
    } catch (e) { console.log(`  ⚠ Deploy-strand guard skipped: ${e.message}`); }
  }
}
