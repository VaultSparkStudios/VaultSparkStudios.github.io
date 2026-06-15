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

let violations = 0;
const results = [];

for (const project of registry.projects) {
  if (!project.studioOsApplied || project.status === 'archived') continue;
  if (targetSlug && project.slug !== targetSlug) continue;
  const repoRoot = project.localPath;
  if (!repoRoot || !fs.existsSync(repoRoot)) {
    const issue = 'localPath missing or inaccessible';
    const skipped = ciMode && !strictMode;
    results.push({
      slug: project.slug,
      name: project.name,
      status: skipped ? 'skipped' : 'failed',
      issues: skipped ? [] : [issue],
      skippedReason: skipped ? issue : null,
    });
    if (!jsonOut && !summaryOnly) {
      console.log(skipped ? `⚠ ${project.name}: ${issue} (skipping)` : `✗ ${project.name}: ${issue}`);
    }
    if (!skipped) {
      violations += 1;
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

  results.push({
    slug: project.slug,
    name: project.name,
    status: issues.length > 0 ? 'failed' : 'passed',
    issues,
    skippedReason: null,
  });

  if (issues.length > 0) {
    if (!jsonOut && !summaryOnly) {
      console.log(`✗ ${project.name}`);
      for (const issue of issues) console.log(`  - ${issue}`);
    }
    violations += issues.length;
  } else {
    if (!jsonOut && !summaryOnly) console.log(`✓ ${project.name}`);
  }
}

if (violations > 0) {
  if (jsonOut) {
    console.log(JSON.stringify({ violations, results }, null, 2));
  } else if (summaryOnly) {
    printSummary(results, violations);
  } else {
    console.error(`\nCompliance validation failed with ${violations} issue(s).`);
  }
  process.exit(1);
}

if (jsonOut) {
  console.log(JSON.stringify({ violations, results }, null, 2));
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
  console.log(`Compliance validation: ${passed} passed · ${failed} failed · ${skipped} skipped · ${violations} issue(s)`);
  for (const result of results.filter(r => r.status === 'failed')) {
    console.log(`✗ ${result.name}: ${result.issues.join(' · ')}`);
  }
}
