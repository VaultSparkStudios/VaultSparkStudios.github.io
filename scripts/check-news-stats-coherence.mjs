#!/usr/bin/env node
/**
 * check-news-stats-coherence.mjs  (S310)
 *
 * Asserts that the numbers RENDERED on The Desk's pages equal the numbers
 * DERIVED from the corpus.
 *
 * Why this is not redundant with build-news-desk-stats --check. That gate proves
 * the receipt matches the corpus. This one proves the PAGE matches the receipt.
 * Today both come from the same call to deriveStoryStats, so they agree by
 * construction — which is exactly the condition under which nobody notices when
 * a refactor, a cached value, or a hand-edit makes them stop agreeing. A
 * property that holds by construction is not verified; it is merely true for
 * now.
 *
 * It parses the RENDERED HTML, never the generator source. That distinction is
 * load-bearing: an earlier gate in this repo read the renderer's source, where
 * the byline is a template literal, so its assertion could never match and it
 * passed vacuously for a whole session. A gate that reads the code that produces
 * the artifact is checking the recipe, not the meal.
 *
 * Usage:
 *   node scripts/check-news-stats-coherence.mjs
 *   node scripts/check-news-stats-coherence.mjs --self-test
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { deriveStoryStats, deriveDeskStats } from './lib/news-stats.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DAYS_DIR = join(ROOT, 'data', 'news-desk', 'days');
const LEDGER = join(ROOT, 'data', 'news-desk', 'prediction-ledger.json');

const RUN_DIRECT = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

function loadDays() {
  if (!existsSync(DAYS_DIR)) return [];
  return readdirSync(DAYS_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map((f) => JSON.parse(readFileSync(join(DAYS_DIR, f), 'utf8')))
    .filter((d) => d.simulated === false);
}

const loadLedger = () => (existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf8')) : { entries: [] });

const decode = (s) => String(s)
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');

/**
 * Pull the stat chips out of rendered markup as { label: value }.
 * Labels are the human words under each number, which is what a reader actually
 * reads — so the assertion is anchored to what is on screen, not to a class name
 * that could be renamed without anyone noticing the number went wrong.
 */
export function parseStatChips(html) {
  const out = {};
  const re = /<li class="desk-stat"><span class="desk-stat-n">([\s\S]*?)<\/span><span class="desk-stat-k">([\s\S]*?)<\/span>/g;
  for (const m of String(html).matchAll(re)) {
    out[decode(m[2]).trim()] = decode(m[1]).trim();
  }
  return out;
}

/** The stance label rendered above the axis. */
export function parseSplitLabel(html) {
  const m = String(html).match(/<strong class="desk-split-label"[^>]*>([\s\S]*?)<\/strong>/);
  return m ? decode(m[1]).trim() : null;
}

/** How many voices are plotted on the axis. */
export function countAxisDots(html) {
  return (String(html).match(/class="desk-axis-dot"/g) || []).length;
}

/**
 * Compare one rendered story page against its derivation.
 * `expectChip` tolerates singular/plural label variants by matching the number
 * against whichever label key is present, because the copy legitimately varies.
 */
export function checkStoryPage(html, stats, where) {
  const errors = [];
  const chips = parseStatChips(html);
  const pick = (...labels) => {
    for (const l of labels) if (l in chips) return chips[l];
    return null;
  };
  const expect = (actual, wanted, what) => {
    if (actual === null) { errors.push(`${where}: no chip rendered for ${what}`); return; }
    if (String(actual) !== String(wanted)) errors.push(`${where}: ${what} rendered ${actual}, derived ${wanted}`);
  };

  expect(pick('min read'), stats.minutes, 'read time');
  expect(pick('sourced fact', 'sourced facts'), stats.factCount, 'sourced facts');
  expect(pick('publisher', 'publishers'), stats.sourceCount, 'publishers');
  expect(pick('voice writing', 'voices writing'), stats.voiceCount, 'voices');
  expect(pick('panel drawn', 'panels drawn'), stats.panels, 'panels');
  expect(pick('call on record', 'calls on record'), stats.predictions.onRecord, 'calls on record');

  const label = parseSplitLabel(html);
  if (label !== stats.label) errors.push(`${where}: stance label rendered "${label}", derived "${stats.label}"`);

  // The axis must plot every stance. A missing dot is a voice the reader cannot
  // see, which is precisely the evidence the axis exists to show.
  const dots = countAxisDots(html);
  if (dots !== stats.positions.length) {
    errors.push(`${where}: axis plots ${dots} voice(s), derived ${stats.positions.length}`);
  }
  return errors;
}

export function checkIndexPage(html, desk) {
  const errors = [];
  const chips = parseStatChips(html);
  const pick = (...labels) => {
    for (const l of labels) if (l in chips) return chips[l];
    return null;
  };
  const expect = (actual, wanted, what) => {
    if (actual === null) { errors.push(`news/index.html: no chip rendered for ${what}`); return; }
    if (String(actual) !== String(wanted)) errors.push(`news/index.html: ${what} rendered ${actual}, derived ${wanted}`);
  };
  expect(pick('story published', 'stories published'), desk.stories, 'stories');
  expect(pick('voices writing'), desk.voices, 'voices');
  expect(pick('sourced facts'), desk.facts, 'facts');
  expect(pick('publisher cited', 'publishers cited'), desk.sourceCount, 'publishers');
  expect(pick('panel drawn', 'panels drawn'), desk.panels, 'panels');
  expect(pick('call on record', 'calls on record'), desk.predictions.onRecord, 'calls on record');

  // The honesty rule, asserted on the PAGE and not just in the library: an
  // ungraded record must not render as a percentage.
  const accuracy = pick('graded accuracy');
  if (desk.predictions.accuracy === null) {
    if (accuracy !== 'Not yet') {
      errors.push(`news/index.html: accuracy rendered "${accuracy}" but the record is ungraded — it must say "Not yet", never a number`);
    }
  } else if (accuracy !== `${desk.predictions.accuracy}%`) {
    errors.push(`news/index.html: accuracy rendered "${accuracy}", derived ${desk.predictions.accuracy}%`);
  }
  return errors;
}

function run() {
  const days = loadDays();
  const ledger = loadLedger();
  if (!days.length) {
    console.log('check-news-stats-coherence: no published days — nothing to compare');
    process.exit(0);
  }

  const errors = [];
  let pages = 0;
  for (const day of days) {
    for (const story of day.stories || []) {
      const rel = join('news', day.date, story.slug, 'index.html');
      const full = join(ROOT, rel);
      if (!existsSync(full)) { errors.push(`${rel}: page missing for a published story`); continue; }
      pages += 1;
      errors.push(...checkStoryPage(readFileSync(full, 'utf8'), deriveStoryStats(story, day, { ledger }), rel));
    }
  }

  const indexPath = join(ROOT, 'news', 'index.html');
  if (existsSync(indexPath)) {
    pages += 1;
    errors.push(...checkIndexPage(readFileSync(indexPath, 'utf8'), deriveDeskStats(days, ledger)));
  }

  if (errors.length) {
    console.error('check-news-stats-coherence: rendered numbers disagree with the corpus:');
    for (const e of errors) console.error(`  ✗ ${e}`);
    console.error('  fix: node scripts/build-news-desk-stats.mjs && node scripts/generate-news-pages.mjs --apply');
    process.exit(1);
  }
  console.log(`check-news-stats-coherence: ${pages} page(s) — every rendered figure matches its derivation`);
  process.exit(0);
}

function selfTest() {
  const cases = [];
  const t = (name, ok) => cases.push([name, ok]);

  const chipHtml = '<li class="desk-stat"><span class="desk-stat-n">3</span><span class="desk-stat-k">min read</span><span class="desk-stat-d">249 words</span></li>';
  t('parses a stat chip from rendered markup', parseStatChips(chipHtml)['min read'] === '3');

  const stats = {
    minutes: 3, factCount: 2, sourceCount: 1, voiceCount: 1, panels: 1,
    predictions: { onRecord: 0 }, label: 'One voice on this one',
    positions: [{ personaId: 'vera', direction: -1 }],
  };
  const good = `${chipHtml}
    <li class="desk-stat"><span class="desk-stat-n">2</span><span class="desk-stat-k">sourced facts</span></li>
    <li class="desk-stat"><span class="desk-stat-n">1</span><span class="desk-stat-k">publisher</span></li>
    <li class="desk-stat"><span class="desk-stat-n">1</span><span class="desk-stat-k">voice writing</span></li>
    <li class="desk-stat"><span class="desk-stat-n">1</span><span class="desk-stat-k">panel drawn</span></li>
    <li class="desk-stat"><span class="desk-stat-n">0</span><span class="desk-stat-k">calls on record</span></li>
    <strong class="desk-split-label">One voice on this one</strong>
    <span class="desk-axis-dot"></span>`;
  t('a coherent page passes', checkStoryPage(good, stats, 'x').length === 0);

  // Mutation: a single wrong number must fail, or the gate is decorative.
  const wrongNumber = good.replace('<span class="desk-stat-n">2</span><span class="desk-stat-k">sourced facts</span>',
    '<span class="desk-stat-n">9</span><span class="desk-stat-k">sourced facts</span>');
  t('a wrong number is caught', checkStoryPage(wrongNumber, stats, 'x').some((e) => /sourced facts/.test(e)));

  // Mutation: a stale stance label must fail. This is the exact defect the
  // founder reported — a page asserting a disagreement that is not there.
  const staleLabel = good.replace('One voice on this one', 'The desk disagrees');
  t('a stale stance label is caught', checkStoryPage(staleLabel, stats, 'x').some((e) => /stance label/.test(e)));

  // Mutation: a voice missing from the axis must fail.
  const twoVoices = { ...stats, positions: [{ personaId: 'a', direction: 1 }, { personaId: 'b', direction: -1 }] };
  t('a voice missing from the axis is caught', checkStoryPage(good, twoVoices, 'x').some((e) => /axis plots/.test(e)));

  // The honesty rule, both directions.
  const ungraded = { stories: 1, voices: 1, facts: 2, sourceCount: 1, panels: 1, predictions: { onRecord: 0, accuracy: null } };
  const idxOk = `<li class="desk-stat"><span class="desk-stat-n">1</span><span class="desk-stat-k">story published</span></li>
    <li class="desk-stat"><span class="desk-stat-n">1</span><span class="desk-stat-k">voices writing</span></li>
    <li class="desk-stat"><span class="desk-stat-n">2</span><span class="desk-stat-k">sourced facts</span></li>
    <li class="desk-stat"><span class="desk-stat-n">1</span><span class="desk-stat-k">publisher cited</span></li>
    <li class="desk-stat"><span class="desk-stat-n">1</span><span class="desk-stat-k">panel drawn</span></li>
    <li class="desk-stat"><span class="desk-stat-n">0</span><span class="desk-stat-k">calls on record</span></li>
    <li class="desk-stat"><span class="desk-stat-n">Not yet</span><span class="desk-stat-k">graded accuracy</span></li>`;
  t('an ungraded record rendering "Not yet" passes', checkIndexPage(idxOk, ungraded).length === 0);
  const idxLies = idxOk.replace('Not yet', '100%');
  t('an ungraded record rendering a PERCENTAGE is caught',
    checkIndexPage(idxLies, ungraded).some((e) => /must say "Not yet"/.test(e)));

  // The live tree must satisfy its own gate.
  const days = loadDays();
  const ledger = loadLedger();
  let liveErrors = 0;
  for (const day of days) {
    for (const story of day.stories || []) {
      const full = join(ROOT, 'news', day.date, story.slug, 'index.html');
      if (!existsSync(full)) continue;
      liveErrors += checkStoryPage(readFileSync(full, 'utf8'), deriveStoryStats(story, day, { ledger }), 'live').length;
    }
  }
  t(`live story pages are coherent (${liveErrors} error(s))`, liveErrors === 0);

  const failed = cases.filter(([, ok]) => !ok);
  cases.forEach(([name, ok]) => console.log(`  ${ok ? 'ok' : 'FAIL'} ${name}`));
  console.log(`check-news-stats-coherence --self-test: ${cases.length - failed.length}/${cases.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

if (RUN_DIRECT) {
  if (process.argv.includes('--self-test')) selfTest();
  else run();
}
