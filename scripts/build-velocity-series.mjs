#!/usr/bin/env node
/**
 * build-velocity-series.mjs — S198 oracle-velocity-git-series.
 *
 * Generates api/velocity-series.json from public git log (already on GitHub;
 * zero new data exposure). Groups commit timestamps by ISO week over the last
 * 24 weeks. The oracle panel reads this as a public-safe cadence sparkline.
 *
 * Flags:
 *   --check      validate schema + non-empty (exit 1 on failure)
 *   --self-test  run 5/5 unit assertions (exit 1 on failure)
 *
 * Import-safe: side effects run only when invoked directly.
 */
import { execSync, spawnSync } from './lib/safe-spawn.mjs';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT  = join(ROOT, 'api', 'velocity-series.json');
const WEEKS = 24;

/** Get ISO week string "YYYY-Www" for a YYYY-MM-DD date string. */
export function isoWeekOf(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  const day = d.getUTCDay() || 7; // Mon=1 … Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - day); // move to Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const wk = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return d.getUTCFullYear() + '-W' + String(wk).padStart(2, '0');
}

/** Generate the 24-week window ending at (and including) todayDateStr. */
export function weekWindow(todayDateStr, count) {
  const today = new Date(todayDateStr + 'T12:00:00Z');
  const weeks = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i * 7);
    weeks.push(isoWeekOf(d.toISOString().slice(0, 10)));
  }
  // deduplicate (same week can appear twice near boundaries)
  return Array.from(new Set(weeks));
}

/** Parse git log dates (one "YYYY-MM-DD" per line) into { week → count } map. */
export function groupByWeek(lines, window) {
  const map = Object.fromEntries(window.map((w) => [w, 0]));
  for (const line of lines) {
    const raw = line.trim();
    if (!raw) continue;
    // git --date=short outputs "YYYY-MM-DD"
    const w = isoWeekOf(raw);
    if (Object.prototype.hasOwnProperty.call(map, w)) map[w]++;
  }
  return map;
}

function build(todayStr) {
  const result = spawnSync(
    'git', ['log', '--format=%cd', '--date=short', '--since=200 days ago'],
    { cwd: ROOT, encoding: 'utf8' }
  );
  if (result.status !== 0) throw new Error('git log failed: ' + result.stderr);
  const lines = result.stdout.split('\n');
  const window = weekWindow(todayStr, WEEKS);
  const map = groupByWeek(lines, window);
  let weeks = window.map((w) => ({ week: w, commitCount: map[w] }));

  // S199 oracle-velocity-window-repair: trim leading zero-commit weeks so the
  // chart doesn't render a long empty flatline before the first active week.
  // Always keeps at least MIN_TRAILING weeks total to show recent cadence.
  const MIN_TRAILING = 4;
  const firstActive = weeks.findIndex((w) => w.commitCount > 0);
  if (firstActive > 0) {
    // Trim up to firstActive, but never leave fewer than MIN_TRAILING weeks.
    const sliceFrom = Math.min(firstActive, Math.max(0, weeks.length - MIN_TRAILING));
    if (sliceFrom > 0) weeks = weeks.slice(sliceFrom);
  }

  const total = weeks.reduce((s, r) => s + r.commitCount, 0);
  return { schemaVersion: '1.0', generatedAt: todayStr, source: 'git-log', weeksBack: WEEKS, totalCommits: total, weeks };
}

function runSelfTest() {
  let pass = 0, fail = 0;
  const assert = (cond, msg) => {
    if (cond) { pass++; console.log('  ✓ ' + msg); }
    else       { fail++; console.error('  ✗ ' + msg); }
  };

  // T1: isoWeekOf returns "YYYY-Www" format
  const w = isoWeekOf('2026-06-14');
  assert(/^\d{4}-W\d{2}$/.test(w), 'T1 isoWeekOf → YYYY-Www format');

  // T2: consecutive Mondays are in consecutive weeks
  assert(isoWeekOf('2026-06-08') !== isoWeekOf('2026-06-15'), 'T2 consecutive Mondays → different weeks');

  // T3: weekWindow returns exactly WEEKS distinct entries
  const win = weekWindow('2026-06-14', WEEKS);
  assert(win.length === WEEKS, 'T3 weekWindow returns ' + WEEKS + ' entries');

  // T4: groupByWeek counts correctly
  const testWin = ['2026-W24', '2026-W25'];
  const counts = groupByWeek(['2026-06-10', '2026-06-10', '2026-06-17'], testWin);
  assert(counts['2026-W24'] === 2 && counts['2026-W25'] === 1, 'T4 groupByWeek counts correctly');

  // T5: out-of-window dates are ignored
  const counts2 = groupByWeek(['2025-01-01'], testWin);
  assert(counts2['2026-W24'] === 0, 'T5 out-of-window dates ignored');

  console.log((fail === 0 ? '✓' : '✗') + ' build-velocity-series self-test: ' + pass + '/' + (pass + fail));
  return fail;
}

// Main
const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/build-velocity-series.mjs');
if (isMain) {
  const args = process.argv.slice(2);
  const isSelfTest = args.includes('--self-test');
  const isCheck    = args.includes('--check');

  if (isSelfTest) {
    const fails = runSelfTest();
    process.exit(fails > 0 ? 1 : 0);
  }

  if (isCheck) {
    if (!existsSync(OUT)) { console.error('velocity-series.json missing — run build first'); process.exit(1); }
    const data = JSON.parse(readFileSync(OUT, 'utf8'));
    const ok = data.schemaVersion === '1.0' && data.weeks?.length > 0 && data.totalCommits >= 0 && data.source === 'git-log';
    if (!ok) { console.error('velocity-series.json schema invalid'); process.exit(1); }
    console.log('✓ velocity-series.json — ' + data.weeks.length + ' week(s) · ' + data.totalCommits + ' commit(s)');
    process.exit(0);
  }

  try {
    // S199 build-cache: skip rebuild when HEAD SHA + today haven't changed.
    // The velocity series only differs when commits land or the date rolls over.
    const headSha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
    const today = new Date().toISOString().slice(0, 10);
    const cacheStamp = `${headSha}:${today}`;
    const cacheFile = join(ROOT, '.cache', 'velocity-series-hash');
    let cachedStamp = '';
    try { cachedStamp = readFileSync(cacheFile, 'utf8').trim(); } catch {}
    if (existsSync(OUT) && cachedStamp === cacheStamp) {
      console.log('build-velocity-series → api/velocity-series.json (cache hit, skipped)');
      process.exit(0);
    }
    const data = build(today);
    writeFileSync(OUT, JSON.stringify(data, null, 2) + '\n');
    mkdirSync(join(ROOT, '.cache'), { recursive: true });
    writeFileSync(cacheFile, cacheStamp + '\n', 'utf8');
    console.log('build-velocity-series → api/velocity-series.json (' + data.weeks.length + ' weeks · ' + data.totalCommits + ' commits)');
  } catch (e) {
    console.error('build-velocity-series error:', e.message);
    process.exit(1);
  }
}
