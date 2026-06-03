#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const findingsPath = path.join(root, 'docs', 'mobile-audit', 'findings.jsonl');
const outPath = path.join(root, 'docs', 'MOBILE_AUDIT_2026-04-21.md');

if (!fs.existsSync(findingsPath)) {
  console.error(`No findings file at ${findingsPath}. Run: npx playwright test tests/mobile-audit.spec.js`);
  process.exit(1);
}

const records = fs.readFileSync(findingsPath, 'utf8')
  .split('\n').filter(Boolean).map(l => JSON.parse(l));

const SEV_RANK = { P0: 0, P1: 1, P2: 2 };

// Aggregate: issue type → { severity, pages: Set, viewports: Set, sampleDetail }
const byType = new Map();
// Per-page rollup for top-of-report table
const byPage = new Map();

for (const rec of records) {
  const pageKey = rec.page;
  if (!byPage.has(pageKey)) byPage.set(pageKey, { url: rec.url, viewports: {}, worst: 'P2', issueCount: 0 });
  const pg = byPage.get(pageKey);
  pg.viewports[rec.viewport] = { status: rec.status, issues: rec.issues.length };

  for (const iss of rec.issues) {
    pg.issueCount += 1;
    if (SEV_RANK[iss.severity] < SEV_RANK[pg.worst]) pg.worst = iss.severity;

    const key = iss.type;
    if (!byType.has(key)) byType.set(key, { severity: iss.severity, pages: new Set(), viewports: new Set(), samples: [] });
    const t = byType.get(key);
    if (SEV_RANK[iss.severity] < SEV_RANK[t.severity]) t.severity = iss.severity;
    t.pages.add(rec.page);
    t.viewports.add(rec.viewport);
    if (t.samples.length < 3) t.samples.push({ page: rec.page, viewport: rec.viewport, detail: iss.detail, offenders: iss.offenders });
  }
}

// Build markdown
const lines = [];
lines.push('# Mobile Experience Audit — 2026-04-21');
lines.push('');
lines.push('**Scope:** 5 viewports × ' + (new Set(records.map(r => r.page))).size + ' pages = ' + records.length + ' page-viewport probes.');
lines.push('**Viewports:** 360 (iPhone SE), 390 (iPhone 14), 430 (Pro Max), 768 (iPad portrait), 1024 (iPad landscape).');
lines.push('**Base URL:** `' + (process.env.BASE_URL || 'https://vaultsparkstudios.com') + '`');
lines.push('');
lines.push('Screenshots live in `docs/mobile-audit/`. Raw findings in `docs/mobile-audit/findings.jsonl`.');
lines.push('');

// Summary counts
const totalIssues = [...byType.values()].reduce((a, t) => a + t.pages.size, 0);
const p0count = [...byType.values()].filter(t => t.severity === 'P0').length;
const p1count = [...byType.values()].filter(t => t.severity === 'P1').length;
const p2count = [...byType.values()].filter(t => t.severity === 'P2').length;
lines.push('## Summary');
lines.push('');
lines.push(`- **${byType.size}** distinct issue types across **${[...byPage.values()].filter(p => p.issueCount > 0).length}** pages`);
lines.push(`- **P0 (breaks):** ${p0count} types`);
lines.push(`- **P1 (usability):** ${p1count} types`);
lines.push(`- **P2 (polish):** ${p2count} types`);
lines.push('');

// Prioritized findings — by issue type, sorted P0 → P2 → page count
const sortedTypes = [...byType.entries()].sort((a, b) => {
  const sev = SEV_RANK[a[1].severity] - SEV_RANK[b[1].severity];
  return sev !== 0 ? sev : b[1].pages.size - a[1].pages.size;
});

lines.push('## Prioritized findings');
lines.push('');
for (const [type, t] of sortedTypes) {
  lines.push(`### [${t.severity}] ${type}`);
  lines.push('');
  lines.push(`**Affected pages:** ${t.pages.size} — ${[...t.pages].slice(0, 10).join(', ')}${t.pages.size > 10 ? ', …' : ''}`);
  lines.push(`**Viewports:** ${[...t.viewports].join(', ')}`);
  lines.push('');
  if (t.samples.length) {
    lines.push('<details><summary>Sample offenders</summary>');
    lines.push('');
    for (const s of t.samples) {
      lines.push(`- \`${s.page}\` @ ${s.viewport} — ${s.detail}`);
      if (s.offenders && s.offenders.length) {
        for (const o of s.offenders.slice(0, 4)) {
          lines.push(`  - \`${JSON.stringify(o)}\``);
        }
      }
    }
    lines.push('');
    lines.push('</details>');
    lines.push('');
  }
}

// Per-page table
lines.push('## Per-page rollup');
lines.push('');
lines.push('| Page | URL | Worst | Issues (across all VPs) |');
lines.push('|---|---|---|---|');
const pageRows = [...byPage.entries()].sort((a, b) => {
  const sev = SEV_RANK[a[1].worst] - SEV_RANK[b[1].worst];
  return sev !== 0 ? sev : b[1].issueCount - a[1].issueCount;
});
for (const [pid, pg] of pageRows) {
  lines.push(`| \`${pid}\` | ${pg.url} | ${pg.worst} | ${pg.issueCount} |`);
}
lines.push('');

// Recommended fix plan scaffold
lines.push('## Recommended fix plan');
lines.push('');
lines.push('Tackle in this order:');
lines.push('');
lines.push('1. **P0 — layout-breaking issues** (horizontal overflow, bad/missing viewport meta, non-loading pages). Fix first; any one of these visibly breaks the experience.');
lines.push('2. **P1 — usability** (tap targets <40px, fixed-width elements > viewport, zoom-blocking viewport meta).');
lines.push('3. **P2 — polish** (tiny font sizes, images without dimensions causing CLS).');
lines.push('');
lines.push('Pair each fix with the relevant entry above to know *where* in the codebase to look.');
lines.push('');

fs.writeFileSync(outPath, lines.join('\n'));
console.log(`Wrote ${outPath}`);
console.log(`  ${records.length} probes · ${byType.size} issue types · ${p0count} P0 · ${p1count} P1 · ${p2count} P2`);
