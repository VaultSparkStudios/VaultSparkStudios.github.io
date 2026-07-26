// sil-forecaster.mjs
// Audit item #3 (S114). Forecast next session's SIL category scores from
// last-3 session deltas + current TASK_BOARD pressure + velocity signals.
//
// Read by: scripts/render-startup-brief.mjs (new SIL FORECAST block)
// Pure function — no I/O side-effects.

import fs from 'node:fs';
import path from 'node:path';

export const CATEGORIES = [
  'Dev Health', 'Creative Alignment', 'Momentum',
  'Engagement', 'Process Quality', 'Cross-Repo Coher',
  'Security Posture', 'Ecosystem Integ', 'Capital Efficiency',
  'Automation Cover'
];

const CATEGORY_ALIASES = {
  'Cross-Repo Coherence': 'Cross-Repo Coher',
  'Ecosystem Integration': 'Ecosystem Integ',
  'Automation Coverage': 'Automation Cover',
  'Engagement (infra)': 'Engagement'
};

export function parseSilHistory(silText, maxSessions = 5) {
  const sessionRe = /^## (\d{4}-\d{2}-\d{2}) — Session (\d+)[^\n]*Total: (\d+)\/1000/gm;
  const sessions = [];
  let m;
  while ((m = sessionRe.exec(silText)) !== null) {
    sessions.push({ date: m[1], session: Number(m[2]), total: Number(m[3]), idx: m.index });
    if (sessions.length >= maxSessions) break;
  }
  // Extract category scores from each session block
  for (let i = 0; i < sessions.length; i++) {
    const start = sessions[i].idx;
    const end = i + 1 < sessions.length ? sessions[i + 1].idx : silText.length;
    const block = silText.slice(start, end);
    const cats = {};
    // Accept both historical numbered rows and the current SIL v3 table:
    //   | 1 | Category | 100 | ...
    //   | Category | 100 | ...
    // Header/Total rows are ignored by the canonical-category allow-list below.
    const rowRe = /^\|\s*(?:\d+\s*\|\s*)?([A-Za-z][^|]+?)\s*\|\s*\**(\d+)\**\s*\|/gm;
    let rm;
    while ((rm = rowRe.exec(block)) !== null) {
      const raw = rm[1].trim();
      const canonical = CATEGORY_ALIASES[raw] || raw;
      if (CATEGORIES.includes(canonical)) cats[canonical] = Number(rm[2]);
    }
    sessions[i].categories = cats;
    sessions[i].categoryCount = Object.keys(cats).length;
    sessions[i].complete = sessions[i].categoryCount === CATEGORIES.length;
  }
  return sessions;
}

export function forecastNext(sessions, signals = {}) {
  // signals: { velocity, blockerPressure, contextAge, unblocked }
  if (!sessions.length || !sessions[0].complete) return null;
  const forecast = {};
  for (const cat of CATEGORIES) {
    const series = sessions.filter(s => s.complete).map(s => s.categories[cat]).filter(n => typeof n === 'number');
    if (!series.length) { forecast[cat] = { predicted: null, confidence: 'none' }; continue; }
    // Simple AR(1): predict = last + alpha * (last - last-1), clamped 0..100
    const last = series[0];
    const last2 = series[1] ?? last;
    let delta = last - last2;
    // Apply external-signal nudges
    if (cat === 'Momentum' && signals.velocity != null) {
      delta += signals.velocity >= 10 ? 2 : signals.velocity <= 2 ? -5 : 0;
    }
    if (cat === 'Security Posture' && signals.blockerPressure >= 80) {
      delta -= 2; // aging credentials drag security
    }
    if (cat === 'Capital Efficiency' && signals.contextAge >= 7) {
      delta -= 1;
    }
    const predicted = Math.max(0, Math.min(100, last + 0.6 * delta));
    forecast[cat] = {
      predicted: Math.round(predicted),
      delta: Math.round(predicted - last),
      confidence: series.length >= 3 ? 'medium' : 'low'
    };
  }
  // Aggregate total
  const totalPred = Object.values(forecast)
    .filter(f => f.predicted != null)
    .reduce((sum, f) => sum + f.predicted, 0);
  return { categories: forecast, totalPredicted: totalPred, basis: sessions.filter(s => s.complete).length };
}

export function selfTestSilForecaster() {
  const current = `## 2026-07-25 — Session 291 | Total: 998/1000
| Category | Score | Notes |
|---|---:|---|
${CATEGORIES.map((cat, i) => `| ${cat} | ${99 + (i % 2)} | ok |`).join('\n')}`;
  const legacy = `## 2026-07-24 — Session 290 | Total: 999/1000
${CATEGORIES.map((cat, i) => `| ${i + 1} | ${cat} | 100 | → | ok |`).join('\n')}`;
  const parsed = parseSilHistory(`${current}\n${legacy}`);
  const incomplete = parseSilHistory(current.replace('| Automation Cover | 100 | ok |', ''));
  return [
    ['current SIL table parses all ten categories', parsed[0]?.complete === true],
    ['legacy numbered SIL table remains supported', parsed[1]?.complete === true],
    ['forecast refuses an incomplete ten-category contract', forecastNext(incomplete) === null],
    ['complete forecast totals exactly ten categories', Object.keys(forecastNext(parsed)?.categories || {}).length === 10],
  ];
}

export function renderForecastBlock(forecast, currentTotal = null) {
  if (!forecast) return '';
  const lines = [];
  lines.push('╔══ SIL FORECAST (next session) ═════════════════════════════════╗');
  const arrow = (d) => d > 0 ? '↑' : d < 0 ? '↓' : '→';
  if (currentTotal != null) {
    const diff = forecast.totalPredicted - currentTotal;
    lines.push(`║  Projected total: ${forecast.totalPredicted}/1000  (${arrow(diff)}${Math.abs(diff)} vs current ${currentTotal})`.padEnd(67) + '║');
  } else {
    lines.push(`║  Projected total: ${forecast.totalPredicted}/1000`.padEnd(67) + '║');
  }
  const risky = Object.entries(forecast.categories)
    .filter(([, f]) => f.delta != null && f.delta <= -3)
    .sort((a, b) => a[1].delta - b[1].delta)
    .slice(0, 3);
  if (risky.length) {
    lines.push('║'.padEnd(67) + '║');
    lines.push('║  At-risk categories (forecast drop ≥3):'.padEnd(67) + '║');
    for (const [cat, f] of risky) {
      lines.push(`║    ↓ ${cat.padEnd(22)} ${f.predicted} (Δ${f.delta})`.padEnd(67) + '║');
    }
  } else {
    lines.push('║  All categories forecast stable or rising.'.padEnd(67) + '║');
  }
  lines.push('╚════════════════════════════════════════════════════════════════╝');
  return lines.join('\n');
}

// CLI entry
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('sil-forecaster.mjs')) {
  if (process.argv.includes('--self-test')) {
    const results = selfTestSilForecaster();
    for (const [name, ok] of results) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
    if (results.some(([, ok]) => !ok)) process.exit(1);
    console.log(`sil-forecaster self-test: ${results.length}/${results.length}`);
    process.exit(0);
  }
  const root = process.cwd();
  const silPath = path.join(root, 'context', 'SELF_IMPROVEMENT_LOOP.md');
  const sil = fs.readFileSync(silPath, 'utf8');
  const sessions = parseSilHistory(sil);
  const last = sessions[0];
  const forecast = forecastNext(sessions, { velocity: 11, blockerPressure: 87, contextAge: 0 });
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ basis: sessions.map(s => ({ session: s.session, total: s.total })), forecast }, null, 2));
  } else {
    console.log(renderForecastBlock(forecast, last?.total));
  }
}
