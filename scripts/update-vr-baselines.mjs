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
  copyFileSync, unlinkSync, rmSync, readFileSync,
} from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { baselineRunIssues, captureReceiptIssues } from './lib/visual-capture-source.mjs';
import { extractCaptureArchive } from './lib/visual-capture-archive.mjs';

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

function readRun(runId) {
  const run = JSON.parse(gh('api', `repos/VaultSparkStudios/VaultSparkStudios.github.io/actions/runs/${runId}`));
  return { ...run, headSha: run.head_sha };
}

function findLatestBaselineRun(runId, expectedSha) {
  if (runId) return runId;
  console.log(`Looking for latest "${ARTIFACT_NAME}" artifact...`);
  const out = gh('run', 'list', '--workflow=visual-regression.yml', '--limit=10',
    '--json', 'databaseId,status,conclusion,createdAt,displayTitle');
  const runs = JSON.parse(out);
  for (const run of runs) {
    if (run.status !== 'completed' || run.conclusion !== 'success') {
      if (run.status === 'in_progress') {
        console.log(`  run ${run.databaseId} still in_progress — wait for it to finish`);
      }
      continue;
    }
    if (baselineRunIssues(readRun(run.databaseId), expectedSha).length) continue;
    // Discovery is metadata only. Never download an archive merely to find it.
    const artifacts = JSON.parse(gh('api', `repos/VaultSparkStudios/VaultSparkStudios.github.io/actions/runs/${run.databaseId}/artifacts`));
    if (artifacts.artifacts?.some(a => a.name === ARTIFACT_NAME && !a.expired)) {
      console.log(`  Found: run ${run.databaseId} — "${run.displayTitle}" (${run.conclusion})`);
      return run.databaseId;
    }
  }
  return null;
}

function downloadArtifact(artifact) {
  const tmpDir = join(tmpdir(), `vr-baselines-${randomBytes(4).toString('hex')}`);
  mkdirSync(tmpDir, { recursive: true });
  console.log(`Downloading admitted capture artifact ${artifact.id}...`);
  const r = spawnSync('gh', ['api', `repos/VaultSparkStudios/VaultSparkStudios.github.io/actions/artifacts/${artifact.id}/zip`], {
    cwd: ROOT, encoding: null, windowsHide: true, timeout: 120000, maxBuffer: 268435456,
  });
  if (r.status !== 0) {
    console.error('Capture archive download failed.');
    process.exit(1);
  }
  extractCaptureArchive(r.stdout, artifact, tmpDir);
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

function stageBaselines(srcDir, expectedSha) {
  // GitHub's artifact uploader preserves a common-root path for multiple inputs.
  // Neither a successful run nor matching filenames proves what origin it used.
  const receiptPath = join(srcDir, '.cache', 'visual-capture-source.json');
  let receipt;
  try { receipt = JSON.parse(readFileSync(receiptPath, 'utf8')); } catch { /* rejected below */ }
  const issues = captureReceiptIssues(receipt, expectedSha);
  if (issues.length) { console.error(issues.join('\n')); process.exit(1); }
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
if (args.length > 1 || (providedId && !/^[1-9]\d*$/.test(providedId))) {
  console.error('Expected one numeric run ID or no arguments.');
  process.exit(2);
}
const expectedSha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8', windowsHide: true });
const currentSha = expectedSha.status === 0 ? expectedSha.stdout.trim() : '';
const runId = findLatestBaselineRun(providedId, currentSha);
if (!runId) {
  console.error(`No completed run with "${ARTIFACT_NAME}" artifact found.`);
  console.error('Trigger one first:');
  console.error('  gh workflow run "Visual Regression (mobile)" -f update_baselines=true');
  process.exit(1);
}

const run = readRun(runId);
const issues = baselineRunIssues(run, currentSha);
if (issues.length) { console.error(issues.join('\n')); process.exit(1); }
const artifacts = JSON.parse(gh('api', `repos/VaultSparkStudios/VaultSparkStudios.github.io/actions/runs/${runId}/artifacts`));
const matches = artifacts.artifacts?.filter(a => a.name === ARTIFACT_NAME && !a.expired) || [];
if (matches.length !== 1 || !Number.isSafeInteger(matches[0].id) || !/^sha256:[a-f0-9]{64}$/.test(matches[0].digest || '')) {
  console.error('Expected one unexpired capture artifact with an exact identity and SHA-256 digest.'); process.exit(1);
}
const artifact = matches[0];
// CANON-023 applies before download, including first-party CI archives. A BLOCK
// remains a stop; exact founder-approved exceptions are handled separately.
const trust = spawnSync(process.execPath, [resolve(ROOT, '..', 'vaultspark-studio-ops', 'scripts', 'package-trust.mjs'), '--download-url',
  `https://api.github.com/repos/VaultSparkStudios/VaultSparkStudios.github.io/actions/artifacts/${artifact.id}/zip`],
  { cwd: ROOT, encoding: 'utf8', windowsHide: true });
if (trust.status !== 0) { console.error(`Artifact trust is nonpassing for artifact ${artifact.id} (${artifact.digest}); no archive downloaded or baseline changed.`); process.exit(1); }
const tmpDir = downloadArtifact(artifact);
const staged = stageBaselines(tmpDir, expectedSha.stdout.trim());

console.log(`\n✓ Staged ${staged} baseline(s) → tests/__snapshots__/visual-regression.spec.js-snapshots/`);
console.log('Provisional files only: directly review changed originals and run unchanged native comparison before accepting or committing.');
console.log('After review and successful comparison:');
console.log('  git add tests/__snapshots__/');
console.log('  git status tests/__snapshots__/');
console.log('  git commit -m "test(vr): capture Linux baselines from CI (S223)"');
