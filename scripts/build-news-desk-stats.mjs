#!/usr/bin/env node
/**
 * build-news-desk-stats.mjs — the public, checkable numbers behind The Desk.
 *
 * Emits api/news-desk-stats.json: desk-wide totals plus a per-story row, all
 * derived from data/news-desk/. `--check` byte-compares, so the receipt cannot
 * drift from the corpus it describes; the renderer reads THIS file, so the page
 * and the feed cannot disagree either.
 *
 * Why a feed and not just page markup: the numbers are the product's core claim
 * ("publicly checkable"), so a reader or an agent has to be able to fetch them
 * without scraping HTML. That also makes the coherence gate cheap — re-derive,
 * compare to the committed receipt, compare the receipt to the rendered page.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { deriveDeskStats, deriveStoryStats, stanceShape, shapeLabel, hostOf, readMinutes, MIN_GRADED_FOR_ACCURACY } from './lib/news-stats.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DAYS_DIR = path.join(ROOT, 'data', 'news-desk', 'days');
const LEDGER = path.join(ROOT, 'data', 'news-desk', 'prediction-ledger.json');
const OUT = path.join(ROOT, 'api', 'news-desk-stats.json');

const RUN_DIRECT = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

function loadDays() {
  if (!fs.existsSync(DAYS_DIR)) return [];
  return fs.readdirSync(DAYS_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(DAYS_DIR, f), 'utf8')))
    .filter((d) => d && d.simulated !== true);
}

function loadLedger() {
  return fs.existsSync(LEDGER) ? JSON.parse(fs.readFileSync(LEDGER, 'utf8')) : { entries: [] };
}

export function build(days, ledger) {
  const desk = deriveDeskStats(days, ledger);
  const stories = days.flatMap((day) => (day.stories || []).map((story) => ({
    date: day.date,
    ...deriveStoryStats(story, day, { ledger }),
  })));
  return {
    schemaVersion: '1.0',
    // Content-stable: derived from the corpus, so a rebuild with no content
    // change produces identical bytes and cannot churn the [skip ci] crons.
    generatedAt: desk.latestDate,
    generatedBy: 'scripts/build-news-desk-stats.mjs',
    publicSafe: true,
    runtimeAiCost: 0,
    honesty: desk.predictions.accuracy === null
      ? 'Accuracy is withheld until enough calls have been graded to mean anything.'
      : 'Accuracy is the graded record, not a projection.',
    minGradedForAccuracy: MIN_GRADED_FOR_ACCURACY,
    desk,
    stories,
  };
}

function run() {
  const payload = build(loadDays(), loadLedger());
  const text = `${JSON.stringify(payload, null, 2)}\n`;
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(OUT) || fs.readFileSync(OUT, 'utf8') !== text) {
      console.error('news-desk-stats drift — run: node scripts/build-news-desk-stats.mjs');
      process.exit(1);
    }
    console.log(`news-desk-stats --check: in sync (${payload.desk.stories} stories · ${payload.desk.sourceCount} sources)`);
    return;
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, text);
  console.log(`news-desk-stats → api/news-desk-stats.json (${payload.desk.stories} stories · ${payload.desk.voices} voices · ${payload.desk.sourceCount} sources)`);
}

function selfTest() {
  const cases = [];
  const t = (name, ok) => cases.push([name, ok]);

  // Sources are counted by publisher, not by citation. Three facts quoting one
  // article is ONE source, and inflating it would be the easiest lie here.
  const oneSource = deriveStoryStats({
    slug: 's', body: [{ voice: 'vera', text: 'a b c' }],
    facts: [
      { sourceUrl: 'https://example.com/a' },
      { sourceUrl: 'https://example.com/b' },
      { sourceUrl: 'https://www.example.com/c' },
    ],
    stances: [{ personaId: 'vera', direction: -1 }],
  });
  t('three facts from one publisher count as one source', oneSource.sourceCount === 1 && oneSource.factCount === 3);
  t('www is normalised away', hostOf('https://www.example.com/x') === 'example.com');

  // The shape must reflect the actual positions, both ways.
  t('opposing directions read as split', stanceShape([{ direction: 2 }, { direction: -1 }]).shape === 'split');
  t('same side close together reads as agree', stanceShape([{ direction: 2 }, { direction: 1 }]).shape === 'agree');
  t('same side far apart reads as lean', stanceShape([{ direction: 2 }, { direction: 0 }]).shape === 'lean');
  t('a single voice is solo, never a disagreement', stanceShape([{ direction: 2 }]).shape === 'solo');
  t('solo label does not claim a disagreement', !/split|disagree/i.test(shapeLabel('solo', [{}])));

  // The accuracy floor. This is the assertion that stops the desk advertising
  // a perfect record off a single graded call.
  const thin = deriveDeskStats([], { entries: [{ date: 'd', predictions: [{ status: 'correct' }] }] });
  t('1-for-1 does NOT render as 100% accurate', thin.predictions.accuracy === null);
  t('thin record explains itself', /needs \d+/.test(thin.predictions.accuracyBasis));
  const enough = deriveDeskStats([], {
    entries: [{ date: 'd', predictions: [
      { status: 'correct' }, { status: 'correct' }, { status: 'correct' }, { status: 'wrong' },
    ] }],
  });
  t('a real sample does produce a percentage', enough.predictions.accuracy === 75);

  t('read time never rounds to zero', readMinutes(5) === 1);

  // Live corpus must produce a receipt that matches the committed one.
  const live = build(loadDays(), loadLedger());
  t('live desk has at least one story', live.desk.stories > 0);
  t('every story row carries its date', live.stories.every((s) => Boolean(s.date)));
  t('no story claims more sources than facts', live.stories.every((s) => s.sourceCount <= s.factCount));
  t('generatedAt is content-stable (no wall clock)', live.generatedAt === live.desk.latestDate);
  if (fs.existsSync(OUT)) {
    t('committed receipt matches a fresh derivation',
      fs.readFileSync(OUT, 'utf8') === `${JSON.stringify(live, null, 2)}\n`);
  }

  const failed = cases.filter(([, ok]) => !ok);
  cases.forEach(([name, ok]) => console.log(`  ${ok ? 'ok' : 'FAIL'} ${name}`));
  console.log(`build-news-desk-stats --self-test: ${cases.length - failed.length}/${cases.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

if (RUN_DIRECT) {
  if (process.argv.includes('--self-test')) selfTest();
  else run();
}
