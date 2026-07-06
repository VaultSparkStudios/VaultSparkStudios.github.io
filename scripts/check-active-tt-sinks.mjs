#!/usr/bin/env node
import fs from 'node:fs';

const checks = [
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

let failures = 0;
for (const check of checks) {
  const src = fs.readFileSync(check.file, 'utf8');
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

if (failures) process.exit(1);
console.log('[tt-active-sinks] active Trusted Types sink burn-down guards passed');
