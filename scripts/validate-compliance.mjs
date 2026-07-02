#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { validateSlug } from './lib/validate.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const { loadRegistry } = await import('./lib/load-registry.mjs');
const { registry, path: registryPath } = loadRegistry(root);
if (!registryPath) {
  const payload = { pass: true, score: 100, passed: 0, total: 0, note: 'PROJECT_REGISTRY.json not found in local portfolio/ or sibling vaultspark-studio-ops/portfolio/' };
  if (process.argv.includes('--json')) console.log(JSON.stringify(payload));
  else console.log(payload.note);
  process.exit(0);
}
function readTemplate(name) {
  const local = path.join(root, 'docs', 'templates', 'project-system', name);
  const ops   = path.join(root, '..', 'vaultspark-studio-ops', 'docs', 'templates', 'project-system', name);
  const p = fs.existsSync(ops) ? ops : (fs.existsSync(local) ? local : null);
  return p ? fs.readFileSync(p, 'utf8') : '';
}
const startTemplate = readTemplate('START_PROMPT.template.md');
const closeoutTemplate = readTemplate('CLOSEOUT_PROMPT.template.md');
const truthTemplate = readTemplate('TRUTH_AUDIT.template.md');
const startVersion = extractVersion(startTemplate, 'template-version');
const closeoutVersion = extractVersion(closeoutTemplate, 'template-version');
const truthVersion = extractVersion(truthTemplate, 'truth-audit-version');
const targetSlug = validateSlug('project', process.argv.includes('--project') ? process.argv[process.argv.indexOf('--project') + 1] : null);
const jsonOut = process.argv.includes('--json');
const summaryOnly = process.argv.includes('--summary');
const ciMode = process.argv.includes('--ci') || process.env.CI === 'true';
const strictMode = process.argv.includes('--strict');

// S181 exit contract (ported S249) — partition violations by OWNER. This repo must
// not hard-FAIL its own doctor board on a SIBLING repo's missing field
// (no-sibling-tree-edits: we can't fix MindFrame's TRUTH_AUDIT.md from here).
// self-owned violations stay hard-FAIL (exit 2); sibling-only = WARN (exit 1);
// clean = exit 0. The doctor's `validate` probe treats exit 1 as a non-blocking warn.
let violations = 0;
let selfViolations = 0;
let siblingViolations = 0;
const results = [];
// win32 robustness (better than studio-ops's exact `===`): the registry stores
// localPath as 'VaultSparkStudios.github.io' while cwd may be lowercased — compare
// case-insensitively on Windows so self is never mis-classified as a sibling.
const normRepo = (p) => {
  const r = path.resolve(p);
  return process.platform === 'win32' ? r.toLowerCase() : r;
};
const isSelfRepo = (repoRoot) => {
  try { return !!repoRoot && normRepo(repoRoot) === normRepo(root); }
  catch { return false; }
};

for (const project of registry.projects) {
  if (!project.studioOsApplied || project.status === 'archived') continue;
  if (targetSlug && project.slug !== targetSlug) continue;
  const repoRoot = project.localPath;
  if (!repoRoot || !fs.existsSync(repoRoot)) {
    const issue = 'localPath missing or inaccessible';
    const skipped = ciMode && !strictMode;
    const owner = isSelfRepo(repoRoot) ? 'self' : 'sibling';
    results.push({
      slug: project.slug,
      name: project.name,
      owner,
      status: skipped ? 'skipped' : 'failed',
      issues: skipped ? [] : [issue],
      skippedReason: skipped ? issue : null,
    });
    if (!jsonOut && !summaryOnly) {
      console.log(skipped ? `⚠ ${project.name}: ${issue} (skipping)` : `✗ ${project.name}: ${issue}`);
    }
    if (!skipped) {
      violations += 1;
      if (owner === 'self') selfViolations += 1; else siblingViolations += 1;
    }
    continue;
  }

  const issues = [];
  const startPath = path.join(repoRoot, 'prompts', 'start.md');
  const closeoutPath = path.join(repoRoot, 'prompts', 'closeout.md');
  const truthPath = path.join(repoRoot, 'context', 'TRUTH_AUDIT.md');
  const statusPath = path.join(repoRoot, 'context', 'PROJECT_STATUS.json');

  const start = readText(startPath);
  const closeout = readText(closeoutPath);
  const truth = readText(truthPath);
  const status = readJson(statusPath);

  const startActual = extractVersion(start, 'template-version');
  if (startActual !== startVersion) {
    const dir = startActual && versionAtLeast(startActual, startVersion) ? 'ahead of' : 'behind';
    issues.push(`start.md not at v${startVersion} (is v${startActual ?? 'unknown'}, ${dir} canonical template)`);
  }
  const closeoutActual = extractVersion(closeout, 'template-version');
  if (closeoutActual !== closeoutVersion) {
    const dir = closeoutActual && versionAtLeast(closeoutActual, closeoutVersion) ? 'ahead of' : 'behind';
    issues.push(`closeout.md not at v${closeoutVersion} (is v${closeoutActual ?? 'unknown'}, ${dir} canonical template)`);
  }
  if (!versionAtLeast(extractVersion(truth, 'truth-audit-version'), truthVersion)) issues.push(`TRUTH_AUDIT.md missing v${truthVersion} header`);

  if (!status) {
    issues.push('PROJECT_STATUS.json unreadable');
  } else {
    if (!status.schemaVersion || !/^\d+\.\d+$/.test(status.schemaVersion)) issues.push('PROJECT_STATUS.json schemaVersion missing or invalid');
    if ('stage' in status) issues.push('PROJECT_STATUS.json still has deprecated stage field');
    for (const field of ['lifecycle', 'audience', 'truthAuditStatus', 'truthAuditLastRun']) {
      if (!(field in status)) issues.push(`PROJECT_STATUS.json missing ${field}`);
    }
  }

  if (truth && !/^Overall status:.*\b(green|yellow|red|unknown)\b/m.test(truth)) issues.push('TRUTH_AUDIT.md missing Overall status line');
  if (truth && !/^Last reviewed:\s*\d{4}-\d{2}-\d{2}/m.test(truth)) issues.push('TRUTH_AUDIT.md missing Last reviewed date');

  const owner = isSelfRepo(repoRoot) ? 'self' : 'sibling';
  results.push({
    slug: project.slug,
    name: project.name,
    owner,
    status: issues.length > 0 ? 'failed' : 'passed',
    issues,
    skippedReason: null,
  });

  if (issues.length > 0) {
    if (!jsonOut && !summaryOnly) {
      const mark = owner === 'self' ? '✗' : '⚠';
      console.log(`${mark} ${project.name}${owner === 'sibling' ? ' (sibling-owned)' : ''}`);
      for (const issue of issues) console.log(`  - ${issue}`);
    }
    violations += issues.length;
    if (owner === 'self') selfViolations += issues.length; else siblingViolations += issues.length;
  } else {
    if (!jsonOut && !summaryOnly) console.log(`✓ ${project.name}`);
  }
}

// S181 exit contract (ported S249): 0 = clean · 1 = sibling-only (WARN — not our
// debt, siblings fix at their next /start) · 2 = self-owned violation (hard FAIL).
const exitCode = selfViolations > 0 ? 2 : (siblingViolations > 0 ? 1 : 0);

if (violations > 0) {
  const summaryLine = `${selfViolations} self · ${siblingViolations} sibling-owned issue(s)`;
  if (jsonOut) {
    console.log(JSON.stringify({ violations, selfViolations, siblingViolations, results }, null, 2));
  } else if (summaryOnly) {
    printSummary(results, violations);
  } else if (selfViolations > 0) {
    console.error(`\nCompliance validation FAILED — ${summaryLine} (self-owned blocks).`);
  } else {
    console.log(`\nCompliance validation: WARN — ${summaryLine}. No self-owned debt; siblings fix at their next /start.`);
  }
  process.exit(exitCode);
}

if (jsonOut) {
  console.log(JSON.stringify({ violations, selfViolations, siblingViolations, results }, null, 2));
} else if (summaryOnly) {
  printSummary(results, violations);
} else {
  console.log('\nCompliance validation passed.');
}

function readText(filePath) {
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function extractVersion(content, marker) {
  return content.match(new RegExp(`<!-- ${marker}: ([0-9.]+) -->`))?.[1] ?? null;
}

function versionAtLeast(a, b) {
  if (!a || !b) return false;
  const [ma, na] = a.split('.').map(Number);
  const [mb, nb] = b.split('.').map(Number);
  return ma > mb || (ma === mb && na >= nb);
}

function printSummary(results, violations) {
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const selfFailed = results.filter(r => r.status === 'failed' && r.owner === 'self').length;
  const siblingFailed = results.filter(r => r.status === 'failed' && r.owner === 'sibling').length;
  // The doctor renders firstLine() of this output — lead with the self-vs-sibling
  // split so a sibling-only board reads as WARN, not a self-owned FAIL.
  const ownerNote = failed > 0 ? ` (${selfFailed} self · ${siblingFailed} sibling-owned)` : '';
  console.log(`Compliance validation: ${passed} passed · ${failed} failed${ownerNote} · ${skipped} skipped · ${violations} issue(s)`);
  for (const result of results.filter(r => r.status === 'failed')) {
    const mark = result.owner === 'self' ? '✗' : '⚠';
    console.log(`${mark} ${result.name}${result.owner === 'sibling' ? ' (sibling-owned)' : ''}: ${result.issues.join(' · ')}`);
  }
}
