#!/usr/bin/env node
/**
 * check-desk-art-currency.mjs — no published Desk story may sit on placeholder art
 * for longer than the grace window (default 48h).
 *
 * WHY (S368). The scheduled publisher has no image model by design; real art is
 * generated later by scripts/generate-news-art-codex.mjs on the founder's machine
 * and ingested after review. Between 2026-09-17 and 2026-10-03 that local step
 * silently stopped (a Windows spawn regression made its sandbox preflight fail),
 * and 52 stories shipped with procedural placeholders. Every existing gate treated
 * a placeholder as valid art, so nothing reported it. This check measures the
 * outcome readers see: real art (visual.generatedArt === true) within the window.
 *
 *   node scripts/check-desk-art-currency.mjs              # exit 1 on any overdue story
 *   node scripts/check-desk-art-currency.mjs --warn       # report only, exit 0
 *   node scripts/check-desk-art-currency.mjs --max-age-hours 72 --json
 *   node scripts/check-desk-art-currency.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DAYS_DIR = path.join(ROOT, 'data', 'news-desk', 'days');

export function overdueStories(days, { now = Date.now(), maxAgeHours = 48, lookbackDays = 45 } = {}) {
  const overdue = [];
  let checked = 0;
  for (const day of days) {
    if (!day || day.simulated || !/^\d{4}-\d{2}-\d{2}$/.test(String(day.date || ''))) continue;
    const published = Date.parse(`${day.date}T23:59:59Z`);
    const ageHours = (now - published) / 3_600_000;
    if (ageHours > lookbackDays * 24) continue;
    for (const story of day.stories || []) {
      checked += 1;
      if (story?.visual?.generatedArt === true) continue;
      if (ageHours > maxAgeHours) overdue.push({ id: `${day.date}--${story.slug}`, ageHours: Math.round(ageHours) });
    }
  }
  return { checked, overdue };
}

function readDays(dir = DAYS_DIR) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).map((f) => {
    try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { return { date: f.slice(0, 10), stories: [], unreadable: true }; }
  });
}

function selfTest() {
  const now = Date.parse('2026-10-03T12:00:00Z');
  const real = { slug: 'real', visual: { generatedArt: true } };
  const placeholder = (slug) => ({ slug, visual: { generatedArt: false } });
  const cases = [
    ['fresh placeholder inside the window passes', overdueStories([{ date: '2026-10-03', stories: [placeholder('a')] }], { now }).overdue.length === 0],
    ['placeholder older than the window is overdue', overdueStories([{ date: '2026-09-30', stories: [placeholder('b')] }], { now }).overdue.length === 1],
    ['real art never counts as overdue', overdueStories([{ date: '2026-09-20', stories: [real] }], { now }).overdue.length === 0],
    ['simulated days are ignored', overdueStories([{ date: '2026-09-20', simulated: true, stories: [placeholder('c')] }], { now }).overdue.length === 0],
    ['stories beyond the lookback are ignored', overdueStories([{ date: '2026-07-01', stories: [placeholder('d')] }], { now }).overdue.length === 0],
    ['a missing visual block is treated as placeholder', overdueStories([{ date: '2026-09-25', stories: [{ slug: 'e' }] }], { now }).overdue.length === 1],
    ['an empty corpus checks nothing (reported, not a pass)', overdueStories([], { now }).checked === 0],
  ];
  let failed = 0;
  for (const [name, ok] of cases) { console.log(`  ${ok ? 'ok' : 'FAIL'} ${name}`); if (!ok) failed += 1; }
  console.log(`check-desk-art-currency --self-test: ${cases.length - failed}/${cases.length} passed`);
  process.exit(failed ? 1 : 0);
}

const argv = process.argv.slice(2);
if (argv.includes('--self-test')) selfTest();
else {
  const flag = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 ? Number(argv[i + 1]) : dflt; };
  const maxAgeHours = flag('--max-age-hours', 48);
  const days = readDays();
  const { checked, overdue } = overdueStories(days, { maxAgeHours });
  if (argv.includes('--json')) console.log(JSON.stringify({ checked, maxAgeHours, overdue }, null, 2));
  if (checked === 0) {
    console.error('check-desk-art-currency: no stories found in the lookback window — nothing was measured');
    process.exit(argv.includes('--warn') ? 0 : 1);
  }
  if (!overdue.length) {
    console.log(`check-desk-art-currency: ok · ${checked} recent stor${checked === 1 ? 'y' : 'ies'} · none on placeholder art past ${maxAgeHours}h`);
  } else {
    console.error(`check-desk-art-currency: ${overdue.length} stor${overdue.length === 1 ? 'y' : 'ies'} still on placeholder art past ${maxAgeHours}h`);
    for (const s of overdue.slice(0, 20)) console.error(`  ✗ ${s.id} (${s.ageHours}h)`);
    console.error('  fix: node scripts/generate-news-art-codex.mjs --dry-run, then generate, review and ingest (docs/DESK_ART_WORKER.md)');
    process.exit(argv.includes('--warn') ? 0 : 1);
  }
}
