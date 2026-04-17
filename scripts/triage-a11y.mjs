#!/usr/bin/env node
/**
 * scripts/triage-a11y.mjs
 *
 * Parse Playwright axe JSON + Lighthouse LHR JSON CI artifacts, map each
 * violation / failing audit to its CSS file or HTML template owner, and
 * render an actionable grouped triage report.
 *
 * Usage:
 *   node scripts/triage-a11y.mjs                  # auto-detect artifacts
 *   node scripts/triage-a11y.mjs --fetch          # gh run download latest artifact first
 *   node scripts/triage-a11y.mjs --axe <file>     # Playwright JSON results file
 *   node scripts/triage-a11y.mjs --lhr <file>     # single LHR JSON
 *   node scripts/triage-a11y.mjs --lhr-dir <dir>  # all *.json in dir as LHRs
 *   node scripts/triage-a11y.mjs --json           # machine-readable JSON to stdout
 *   node scripts/triage-a11y.mjs --write          # write docs/A11Y_TRIAGE.md
 *
 * Artifact sources:
 *   axe violations → Playwright JSON reporter output (playwright-report/results.json)
 *   LHR failures   → Lighthouse Result JSON files (.lighthouseci/*.json or --lhr-dir)
 *
 * Owner classification:
 *   CSS rules     → assets/style.css or vault-member/portal.css
 *   Nav/footer    → scripts/propagate-nav.mjs (template propagation)
 *   Page-specific → the specific HTML file for that URL
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

// ─── CLI ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (f) => { const i = args.indexOf(f); return i !== -1 ? args[i + 1] ?? null : null; };
const hasFlag = (f) => args.includes(f);

const jsonMode = hasFlag('--json');
const writeMode = hasFlag('--write');
const fetchMode = hasFlag('--fetch');
const axeFile = getArg('--axe');
const lhrFile = getArg('--lhr');
const lhrDirArg = getArg('--lhr-dir');

// ─── Owner classification tables ──────────────────────────────────────────────

// Rules whose fix lives in CSS (color tokens, spacing, compositing)
const CSS_OWNED = new Set([
  'color-contrast',
  'tap-targets',
  'scrollable-region-focusable',
  'focus-visible',
  'text-spacing-aa',
  'unused-css-rules',
  'largest-contentful-paint-element',
  'cumulative-layout-shift',
  'efficient-animated-content',
  'uses-optimized-images',
  'uses-webp-images',
  'uses-rel-preconnect',
  'render-blocking-resources',
]);

// Rules whose fix lives in the shared nav/footer propagation template
const PROPAGATION_OWNED = new Set([
  'landmark-one-main',
  'region',
  'bypass',
  'frame-tested',
]);

// URL path → HTML file (local-preview paths)
const PAGE_MAP = {
  '/':                'index.html',
  '/games/':          'games/index.html',
  '/community/':      'community/index.html',
  '/leaderboards/':   'leaderboards/index.html',
  '/journal/':        'journal/index.html',
  '/ranks/':          'ranks/index.html',
  '/members/':        'members/index.html',
  '/vault-treasury/': 'vault-treasury/index.html',
  '/vaultsparked/':   'vaultsparked/index.html',
  '/join/':           'join/index.html',
  '/invite/':         'invite/index.html',
  '/search/':         'search/index.html',
  '/membership/':     'membership/index.html',
  '/contact/':        'contact/index.html',
  '/studio-pulse/':   'studio-pulse/index.html',
  '/vault-wall/':     'vault-wall/index.html',
  '/press/':          'press/index.html',
  '/universe/':       'universe/index.html',
  '/ignis/':          'ignis/index.html',
  '/signal-log/':     'signal-log/index.html',
  '/notebook/':       'notebook/index.html',
  '/vault-member/':   'vault-member/index.html',
  '/social/':         'social/index.html',
};

function urlToFile(url) {
  try {
    const u = new URL(url, 'http://localhost');
    const path = u.pathname.endsWith('/') ? u.pathname : u.pathname + '/';
    return PAGE_MAP[path] ?? PAGE_MAP[u.pathname] ?? `(${u.pathname})`;
  } catch {
    return `(unknown: ${url})`;
  }
}

function cssFileForUrl(url) {
  if (/\/(vault-member|investor-portal|studio-hub)\//.test(url)) {
    return 'vault-member/portal.css';
  }
  return 'assets/style.css';
}

function classifyOwner(ruleId, pageUrl) {
  if (CSS_OWNED.has(ruleId)) {
    return { type: 'css', file: cssFileForUrl(pageUrl) };
  }
  if (PROPAGATION_OWNED.has(ruleId)) {
    return { type: 'propagation', file: 'scripts/propagate-nav.mjs' };
  }
  return { type: 'html', file: urlToFile(pageUrl) };
}

// ─── Playwright JSON parser ───────────────────────────────────────────────────

// The axe spec logs violations with this format:
//   [axe] N violation(s) on <url>:
//     [impact] rule-id: description (N node(s))
function parseAxeFromStdout(text) {
  const violations = [];
  const lines = text.split('\n');
  let currentUrl = null;

  for (const line of lines) {
    const header = line.match(/\[axe\]\s+\d+\s+violation\(s\)\s+on\s+(\S+?):?\s*$/);
    if (header) {
      currentUrl = header[1].replace(/:$/, '');
      continue;
    }
    if (!currentUrl) continue;
    const m = line.match(/\s+\[(\w+)\]\s+([\w-]+):\s+(.+?)\s+\((\d+)\s+node/);
    if (m) {
      violations.push({
        source: 'axe',
        impact: m[1],
        ruleId: m[2],
        description: m[3],
        nodeCount: parseInt(m[4], 10),
        url: currentUrl,
        snippets: [],
      });
    }
  }

  return violations;
}

function* walkSpecs(suites) {
  for (const suite of (suites ?? [])) {
    for (const spec of (suite.specs ?? [])) yield spec;
    yield* walkSpecs(suite.suites);
  }
}

function parsePlaywrightJSON(filePath) {
  let report;
  try {
    report = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (err) {
    throw new Error(`Cannot parse Playwright JSON at ${filePath}: ${err.message}`);
  }

  const violations = [];
  for (const spec of walkSpecs(report.suites)) {
    for (const test of (spec.tests ?? [])) {
      for (const result of (test.results ?? [])) {
        for (const entry of (result.stdout ?? [])) {
          const text = typeof entry === 'string' ? entry : entry.text ?? '';
          if (text.includes('[axe]')) {
            violations.push(...parseAxeFromStdout(text));
          }
        }
      }
    }
  }
  return violations;
}

// ─── LHR parser ───────────────────────────────────────────────────────────────

const LHR_PERF_AUDIT_IDS = new Set([
  'largest-contentful-paint',
  'cumulative-layout-shift',
  'total-blocking-time',
  'render-blocking-resources',
  'unused-css-rules',
  'uses-optimized-images',
  'uses-webp-images',
  'uses-rel-preconnect',
  'efficient-animated-content',
]);

function extractLHRViolations(lhr) {
  if (!lhr?.audits) return [];
  const url = lhr.requestedUrl ?? lhr.finalUrl ?? '';
  const violations = [];

  // Accessibility category
  const a11yCat = lhr.categories?.accessibility;
  if (a11yCat) {
    for (const ref of (a11yCat.auditRefs ?? [])) {
      if (!ref.weight) continue;
      const audit = lhr.audits[ref.id];
      if (!audit) continue;
      if (['notApplicable', 'informative', 'manual'].includes(audit.scoreDisplayMode)) continue;
      if (audit.score === null || audit.score >= 1) continue;

      const items = audit.details?.items ?? [];
      const snippets = items
        .slice(0, 3)
        .map(it => it.node?.snippet ?? it.node?.nodeLabel ?? '')
        .filter(Boolean);

      violations.push({
        source: 'lhr/a11y',
        ruleId: audit.id,
        title: audit.title,
        description: audit.description?.replace(/\[.*?\]\(.*?\)/g, '').trim() ?? '',
        score: audit.score,
        url,
        nodeCount: items.length,
        snippets,
      });
    }
  }

  // Performance category — only flag audits below 0.9 that are on our watch list
  const perfCat = lhr.categories?.performance;
  if (perfCat && perfCat.score !== null && perfCat.score < 0.8) {
    for (const ref of (perfCat.auditRefs ?? [])) {
      if (!LHR_PERF_AUDIT_IDS.has(ref.id)) continue;
      const audit = lhr.audits[ref.id];
      if (!audit) continue;
      if (['notApplicable', 'informative', 'manual'].includes(audit.scoreDisplayMode)) continue;
      if (audit.score === null || audit.score >= 0.9) continue;

      violations.push({
        source: 'lhr/perf',
        ruleId: audit.id,
        title: audit.title,
        description: audit.description?.replace(/\[.*?\]\(.*?\)/g, '').trim() ?? '',
        score: audit.score,
        url,
        nodeCount: (audit.details?.items ?? []).length,
        snippets: [],
      });
    }
  }

  return violations;
}

function parseLHRFile(filePath) {
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf8'));
    const reports = Array.isArray(data) ? data : [data];
    return reports.flatMap(r => (r?.audits ? extractLHRViolations(r) : []));
  } catch (err) {
    process.stderr.write(`  ⚠ Skipping ${filePath}: ${err.message}\n`);
    return [];
  }
}

// ─── Auto-discover artifacts ──────────────────────────────────────────────────
function autoDiscover() {
  const axeFiles = [];
  const lhrFiles = [];

  for (const p of [
    join(ROOT, 'playwright-report', 'results.json'),
    join(ROOT, 'test-results', 'results.json'),
  ]) {
    if (existsSync(p)) axeFiles.push(p);
  }

  for (const dir of [join(ROOT, '.lighthouseci'), join(ROOT, 'lhci-results')]) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (f.endsWith('.json')) lhrFiles.push(join(dir, f));
    }
  }

  return { axeFiles, lhrFiles };
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderReport(violations) {
  const ownerMap = new Map();

  for (const v of violations) {
    const owner = classifyOwner(v.ruleId, v.url ?? '');
    if (!ownerMap.has(owner.file)) ownerMap.set(owner.file, { ...owner, violations: [] });
    ownerMap.get(owner.file).violations.push(v);
  }

  // Deduplicate per owner by ruleId + url
  for (const entry of ownerMap.values()) {
    const seen = new Set();
    entry.violations = entry.violations.filter(v => {
      const k = `${v.ruleId}::${v.url}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  const sorted = [...ownerMap.entries()].sort((a, b) => b[1].violations.length - a[1].violations.length);

  const lines = [
    '# A11y Artifact Triage Report',
    `Generated: ${new Date().toISOString().split('T')[0]}`,
    `Total violations parsed: **${violations.length}**`,
    '',
  ];

  for (const [ownerFile, entry] of sorted) {
    const typeLabel = { css: 'CSS', propagation: 'Propagation template', html: 'HTML' }[entry.type] ?? 'HTML';
    lines.push(`## \`${ownerFile}\` (${typeLabel}) — ${entry.violations.length} violation(s)`);
    lines.push('');

    for (const v of entry.violations) {
      const impactStr = v.impact ? ` [${v.impact}]` : v.score != null ? ` [score:${v.score.toFixed(2)}]` : '';
      const desc = v.description ?? v.title ?? '';
      lines.push(`- **\`${v.ruleId}\`**${impactStr} (${v.source}): ${desc}`);
      if (v.url) lines.push(`  - Page: \`${v.url}\``);
      for (const s of (v.snippets ?? []).slice(0, 2)) {
        lines.push(`  - \`${s.slice(0, 100)}\``);
      }
      if (v.nodeCount > 0) lines.push(`  - Nodes: ${v.nodeCount}`);
    }
    lines.push('');
  }

  lines.push(
    '## Fix guide',
    '',
    '| Owner type | Where to fix |',
    '|---|---|',
    '| `assets/style.css` | CSS custom properties (color tokens, spacing, compositing) |',
    '| `vault-member/portal.css` | Portal-specific CSS rules |',
    '| `scripts/propagate-nav.mjs` | Shared nav/footer template → re-run `node scripts/propagate-nav.mjs` |',
    '| HTML file | Edit the specific file; if pattern recurs across pages, add to propagate-nav template |',
    '',
    'Run `npm run smoke:http` to verify pages stay reachable after edits.',
    'Run `npm run build:check` before committing.',
  );

  return lines.join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (fetchMode) {
    process.stderr.write('Downloading playwright-a11y-report artifact…\n');
    try {
      execSync('gh run download --name playwright-a11y-report --dir playwright-report/', {
        cwd: ROOT,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      process.stderr.write('  ✓ Downloaded to playwright-report/\n');
    } catch (err) {
      const msg = err.stderr?.toString().trim() ?? err.message;
      process.stderr.write(`  ✗ Download failed: ${msg}\n`);
      process.stderr.write('    Run manually: gh run download --name playwright-a11y-report --dir playwright-report/\n');
    }
  }

  const violations = [];

  if (axeFile) violations.push(...parsePlaywrightJSON(resolve(axeFile)));
  if (lhrFile) violations.push(...parseLHRFile(resolve(lhrFile)));
  if (lhrDirArg) {
    const dir = resolve(lhrDirArg);
    for (const f of readdirSync(dir)) {
      if (f.endsWith('.json')) violations.push(...parseLHRFile(join(dir, f)));
    }
  }

  if (!axeFile && !lhrFile && !lhrDirArg) {
    const { axeFiles, lhrFiles } = autoDiscover();
    if (!jsonMode && axeFiles.length === 0 && lhrFiles.length === 0) {
      process.stderr.write(
        'No artifact files found. Options:\n' +
        '  --fetch              Download latest CI artifact via gh CLI\n' +
        '  --axe <file>         Playwright JSON results (playwright-report/results.json)\n' +
        '  --lhr <file>         Lighthouse LHR JSON\n' +
        '  --lhr-dir <dir>      Directory of LHR JSON files (.lighthouseci/)\n'
      );
      process.exit(0);
    }
    for (const f of axeFiles) violations.push(...parsePlaywrightJSON(f));
    for (const f of lhrFiles) violations.push(...parseLHRFile(f));
  }

  if (violations.length === 0) {
    if (jsonMode) {
      console.log(JSON.stringify({ total: 0, owners: {} }, null, 2));
    } else {
      console.log('✓ No violations found in provided artifacts.');
    }
    return;
  }

  if (jsonMode) {
    const ownerMap = new Map();
    for (const v of violations) {
      const owner = classifyOwner(v.ruleId, v.url ?? '');
      if (!ownerMap.has(owner.file)) ownerMap.set(owner.file, { ...owner, violations: [] });
      ownerMap.get(owner.file).violations.push(v);
    }
    console.log(JSON.stringify({
      total: violations.length,
      owners: Object.fromEntries([...ownerMap.entries()].map(([k, v]) => [k, {
        type: v.type,
        count: v.violations.length,
        violations: v.violations,
      }])),
    }, null, 2));
    return;
  }

  const report = renderReport(violations);

  if (writeMode) {
    const outPath = join(ROOT, 'docs', 'A11Y_TRIAGE.md');
    writeFileSync(outPath, report + '\n', 'utf8');
    console.log(`Wrote ${outPath}`);
  } else {
    console.log(report);
  }
}

main().catch(err => {
  process.stderr.write(`triage-a11y: ${err.message}\n`);
  process.exit(1);
});
