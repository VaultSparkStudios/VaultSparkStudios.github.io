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
// @verification-scope monitor — time-based art backlog alarm run by ci-health-monitor.yml; build:check runs only its --self-test.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SATIRE_CARTOON_ERA_START, SATIRE_CARTOON_GRACE_DAYS } from './lib/news-memes.mjs';

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

/**
 * D-S368.7: every story from SATIRE_CARTOON_ERA_START on also needs its satire
 * cartoon (visual.satireCartoon). Missing is a WARNING while the story is
 * younger than the grace window (7 days) and FAILING after it — softer than
 * the banner's 48h, because the cartoon needs a separate review decision and
 * the banner panel already carries the story's line meanwhile.
 */
export function satireCartoonStatus(days, { now = Date.now(), graceDays = SATIRE_CARTOON_GRACE_DAYS, eraStart = SATIRE_CARTOON_ERA_START, lookbackDays = 45 } = {}) {
  const pending = [];
  const overdue = [];
  let checked = 0;
  for (const day of days) {
    if (!day || day.simulated || !/^\d{4}-\d{2}-\d{2}$/.test(String(day.date || ''))) continue;
    if (day.date < eraStart) continue;
    const ageHours = (now - Date.parse(`${day.date}T23:59:59Z`)) / 3_600_000;
    if (ageHours > lookbackDays * 24) continue;
    for (const story of day.stories || []) {
      checked += 1;
      if (story?.visual?.satireCartoon) continue;
      const row = { id: `${day.date}--${story.slug}`, ageHours: Math.max(0, Math.round(ageHours)) };
      (ageHours > graceDays * 24 ? overdue : pending).push(row);
    }
  }
  return { checked, pending, overdue, graceDays, eraStart };
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
    // D-S368.7 satire cartoons
    ...(() => {
      const later = Date.parse('2026-10-12T12:00:00Z');
      const cartoon = (slug) => ({ slug, visual: { generatedArt: true, satireCartoon: { sha256: 'a'.repeat(64) } } });
      const noCartoon = (slug) => ({ slug, visual: { generatedArt: true } });
      const fresh = satireCartoonStatus([{ date: '2026-10-03', stories: [noCartoon('f')] }], { now });
      const stale = satireCartoonStatus([{ date: '2026-10-03', stories: [noCartoon('s')] }], { now: later });
      return [
        ['satire: a missing cartoon inside 7 days is a warning, not a failure', fresh.pending.length === 1 && fresh.overdue.length === 0],
        ['satire: a missing cartoon past 7 days fails', stale.overdue.length === 1 && stale.pending.length === 0],
        ['satire: a story with a cartoon is neither', satireCartoonStatus([{ date: '2026-10-03', stories: [cartoon('c')] }], { now: later }).checked === 1
          && satireCartoonStatus([{ date: '2026-10-03', stories: [cartoon('c')] }], { now: later }).overdue.length === 0],
        ['satire: stories before the D-S368.7 era are never counted', satireCartoonStatus([{ date: '2026-09-20', stories: [noCartoon('o')] }], { now: later }).checked === 0],
        ['satire: simulated days are ignored', satireCartoonStatus([{ date: '2026-10-03', simulated: true, stories: [noCartoon('x')] }], { now: later }).checked === 0],
        ['satire: banner overdue logic is unchanged by a missing cartoon', overdueStories([{ date: '2026-10-03', stories: [noCartoon('b')] }], { now: later }).overdue.length === 0],
      ];
    })(),
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
  const satire = satireCartoonStatus(days);
  if (argv.includes('--json')) console.log(JSON.stringify({ checked, maxAgeHours, overdue, satire }, null, 2));
  if (checked === 0) {
    console.error('check-desk-art-currency: no stories found in the lookback window — nothing was measured');
    process.exit(argv.includes('--warn') ? 0 : 1);
  }
  let failing = false;
  if (!overdue.length) {
    console.log(`check-desk-art-currency: ok · ${checked} recent stor${checked === 1 ? 'y' : 'ies'} · none on placeholder art past ${maxAgeHours}h`);
  } else {
    failing = true;
    console.error(`check-desk-art-currency: ${overdue.length} stor${overdue.length === 1 ? 'y' : 'ies'} still on placeholder art past ${maxAgeHours}h`);
    for (const s of overdue.slice(0, 20)) console.error(`  ✗ ${s.id} (${s.ageHours}h)`);
    console.error('  fix: node scripts/generate-news-art-codex.mjs --dry-run, then generate, review and ingest (docs/DESK_ART_WORKER.md)');
  }
  // Satire cartoons (D-S368.7): warning inside the grace window, failing after it.
  const satireLabel = `satire cartoons (stories since ${satire.eraStart})`;
  if (!satire.pending.length && !satire.overdue.length) {
    console.log(`check-desk-art-currency: ${satireLabel}: ok · ${satire.checked} stor${satire.checked === 1 ? 'y' : 'ies'} measured · none missing`);
  }
  if (satire.pending.length) {
    console.log(`check-desk-art-currency: WARNING ${satire.pending.length} stor${satire.pending.length === 1 ? 'y' : 'ies'} still without a ${satireLabel.replace(/s \(/, ' (')} — fails after ${satire.graceDays} days`);
    for (const s of satire.pending.slice(0, 20)) console.log(`  ! ${s.id} (${s.ageHours}h)`);
  }
  if (satire.overdue.length) {
    failing = true;
    console.error(`check-desk-art-currency: ${satire.overdue.length} stor${satire.overdue.length === 1 ? 'y' : 'ies'} without a satire cartoon past ${satire.graceDays} days`);
    for (const s of satire.overdue.slice(0, 20)) console.error(`  ✗ ${s.id} (${s.ageHours}h)`);
    console.error('  fix: node scripts/generate-news-art-codex.mjs --kind satire --dry-run, then generate, review and ingest --kind satire (docs/DESK_ART_WORKER.md)');
  }
  if (failing) process.exit(argv.includes('--warn') ? 0 : 1);
}
