#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, '.cache', 'tt-active-local-sinks.json');

const legacyChecks = [
  {
    file: 'assets/hero-ticker.js',
    forbidden: ['root.innerHTML'],
    required: [
      'function replaceWithTickerLink(root, href, ariaLabel, children)',
      "appendTickerSpan(link, 'hero-ticker-title', title)",
      "appendTickerSpan(link, 'hero-ticker-title', label)"
    ]
  },
  {
    file: 'games/gridiron-gm/index.html',
    forbidden: [
      'el.innerHTML = commits.map',
      'el.innerHTML = \'<a class="stream-fallback"',
      'row.innerHTML = [1,2,3,4,5].map'
    ],
    required: [
      'function renderCommit(msg, rel)',
      'function renderFallback()',
      'el.appendChild(renderCommit(msg, rel))',
      'star.dataset.star=String(i)'
    ]
  },
  {
    file: 'leaderboards/index.html',
    forbidden: [
      'tb.innerHTML=d.slice(3).map',
      'tbody.innerHTML = rows.map',
      'tbody.innerHTML=sorted.map',
      'tb.innerHTML=teams.map',
      'tbody.innerHTML=rows.map'
    ],
    required: [
      'function appendLeaderboardRow(tbody,cells)',
      'clearRows(tbody);',
      'appendRankProgress(td,pct,nextName,rInfo.color)'
    ]
  }
];

function readText(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function nearLineContains(source, lineNumber, needle) {
  if (!needle) return false;
  const lines = source.split(/\r?\n/);
  if (!lineNumber) return lines.some((line) => line.includes(needle));
  const start = Math.max(0, lineNumber - 8);
  const end = Math.min(lines.length, lineNumber + 7);
  return lines.slice(start, end).some((line) => line.includes(needle));
}

function runLegacyChecks() {
  let failures = 0;
  for (const check of legacyChecks) {
    const src = readText(check.file);
    for (const needle of check.forbidden) {
      if (src.includes(needle)) {
        console.error(`[tt-active-sinks] forbidden pattern remains in ${check.file}: ${needle}`);
        failures += 1;
      }
    }
    for (const needle of check.required) {
      if (!src.includes(needle)) {
        console.error(`[tt-active-sinks] required DOM-safe marker missing in ${check.file}: ${needle}`);
        failures += 1;
      }
    }
  }
  return failures;
}

function runManifestChecks() {
  if (!fs.existsSync(MANIFEST)) {
    console.log('[tt-active-sinks] no active-local manifest yet; legacy guards only');
    return 0;
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const rows = Array.isArray(manifest.activeLocalRows) ? manifest.activeLocalRows : [];
  let failures = 0;
  for (const row of rows) {
    if (!row?.localPath || !row?.sinkNeedle) continue;
    const abs = path.join(ROOT, row.localPath);
    if (!fs.existsSync(abs)) continue;
    const src = fs.readFileSync(abs, 'utf8');
    if (nearLineContains(src, row.lineNumber, row.sinkNeedle)) {
      console.error(`[tt-active-sinks] active local TT row still appears present: ${row.localPath}:${row.lineNumber || '?'} (${row.sinkNeedle}) from ${row.key}`);
      failures += 1;
    }
  }
  console.log(`[tt-active-sinks] manifest active-local rows: ${rows.length}; unresolved: ${failures}`);
  return failures;
}

const failures = runLegacyChecks() + runManifestChecks();
if (failures) process.exit(1);
console.log('[tt-active-sinks] active Trusted Types sink burn-down guards passed');