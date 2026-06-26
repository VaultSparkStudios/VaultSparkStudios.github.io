#!/usr/bin/env node
/**
 * update-vr-baselines.mjs — S223 helper
 *
 * Downloads the `visual-regression-baselines` artifact from a completed
 * `Visual Regression (mobile)` workflow run (update_baselines=true) and stages
 * the PNG files as committed baselines under tests/__snapshots__/.
 *
 * Usage:
 *   node scripts/update-vr-baselines.mjs              # auto-finds latest baseline run
 *   node scripts/update-vr-baselines.mjs <run-id>    # target a specific run
 *   node scripts/update-vr-baselines.mjs --help
 *
 * Trigger a baseline capture first:
 *   gh workflow run "Visual Regression (mobile)" -f update_baselines=true
 *
 * After running, commit the staged files:
 *   git add tests/__snapshots__/
 *   git commit -m "test(vr): capture Linux baselines from CI (S223)"
 */

import { spawnSync } from './lib/safe-spawn.mjs';
import {
  mkdirSync, existsSync, readdirSync, statSync,
  copyFileSync, unlinkSync, rmSync,
} from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SNAPSHOTS_DIR = join(ROOT, 'tests', '__snapshots__', 'visual-regression.spec.js-snapshots');
const ARTIFACT_NAME = 'visual-regression-baselines';

function gh(...args) {
  const r = spawnSync('gh', args, { cwd: ROOT, encoding: 'utf8', windowsHide: true });
  if (r.status !== 0) {
    console.error('gh error:', (r.stderr || r.stdout || '').trim());
    process.exit(1);
  }
  return r.stdout.trim();
}

function findLatestBaselineRun(runId) {
  if (runId) return runId;
  console.log(`Looking for latest "${ARTIFACT_NAME}" artifact...`);
  const out = gh('run', 'list', '--workflow=visual-regression.yml', '--limit=10',
    '--json', 'databaseId,status,conclusion,createdAt,displayTitle');
  const runs = JSON.parse(out);
  for (const run of runs) {
    if (run.status !== 'completed') {
      if (run.status === 'in_progress') {
        console.log(`  run ${run.databaseId} still in_progress — wait for it to finish`);
      }
      continue;
    }
    // Probe for the artifact by attempting a dry-run list
    const artOut = spawnSync('gh', ['run', 'download', String(run.databaseId),
      '--name', ARTIFACT_NAME, '--dir', join(tmpdir(), 'vr-probe-' + run.databaseId)], {
      cwd: ROOT, encoding: 'utf8', windowsHide: true,
    });
    // Clean up the probe dir
    try { rmSync(join(tmpdir(), 'vr-probe-' + run.databaseId), { recursive: true, force: true }); } catch { /* ok */ }
    if (artOut.status === 0) {
      console.log(`  Found: run ${run.databaseId} — "${run.displayTitle}" (${run.conclusion})`);
      return run.databaseId;
    }
  }
  return null;
}

function downloadArtifact(runId) {
  const tmpDir = join(tmpdir(), `vr-baselines-${randomBytes(4).toString('hex')}`);
  mkdirSync(tmpDir, { recursive: true });
  console.log(`Downloading ${ARTIFACT_NAME} from run ${runId}...`);
  const r = spawnSync('gh', ['run', 'download', String(runId),
    '--name', ARTIFACT_NAME, '--dir', tmpDir], {
    cwd: ROOT, encoding: 'utf8', windowsHide: true,
  });
  if (r.status !== 0) {
    console.error('Failed:', (r.stderr || r.stdout || '').trim());
    process.exit(1);
  }
  return tmpDir;
}

function findPngs(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...findPngs(full));
    } else if (entry.endsWith('.png')) {
      files.push(full);
    }
  }
  return files;
}

function stageBaselines(srcDir) {
  mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  const pngs = findPngs(srcDir);
  if (pngs.length === 0) {
    console.error('No PNG files found in the artifact.');
    process.exit(1);
  }
  let staged = 0;
  for (const src of pngs) {
    const dest = join(SNAPSHOTS_DIR, basename(src));
    if (existsSync(dest)) unlinkSync(dest);
    copyFileSync(src, dest);
    staged++;
  }
  try { rmSync(srcDir, { recursive: true, force: true }); } catch { /* ok */ }
  return staged;
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: node scripts/update-vr-baselines.mjs [run-id]

Downloads the visual-regression-baselines artifact from a CI run and stages
PNG files as committed baselines under tests/__snapshots__/.

Trigger a capture first:
  gh workflow run "Visual Regression (mobile)" -f update_baselines=true

Then run this script (with or without the run ID), commit the result.`);
  process.exit(0);
}

const providedId = args[0];
const runId = findLatestBaselineRun(providedId);
if (!runId) {
  console.error(`No completed run with "${ARTIFACT_NAME}" artifact found.`);
  console.error('Trigger one first:');
  console.error('  gh workflow run "Visual Regression (mobile)" -f update_baselines=true');
  process.exit(1);
}

const tmpDir = downloadArtifact(runId);
const staged = stageBaselines(tmpDir);

console.log(`\n✓ Staged ${staged} baseline(s) → tests/__snapshots__/visual-regression.spec.js-snapshots/`);
console.log('Now commit:');
console.log('  git add tests/__snapshots__/');
console.log('  git status tests/__snapshots__/');
console.log('  git commit -m "test(vr): capture Linux baselines from CI (S223)"');
