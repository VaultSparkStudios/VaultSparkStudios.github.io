#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveDeskFreshness, staticDeskEvidence, renderStaticDeskEvidence } from './lib/news-freshness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DAYS = path.join(ROOT, 'data', 'news-desk', 'days');
const OUT = path.join(ROOT, 'api', 'news-desk-freshness.json');

const loadDays = () => fs.readdirSync(DAYS).filter((name) => name.endsWith('.json')).sort()
  .map((name) => JSON.parse(fs.readFileSync(path.join(DAYS, name), 'utf8')));

function selfTest() {
  const day = (date) => ({ date, simulated: false });
  const now = new Date('2026-08-16T12:00:00Z');
  const daily = deriveDeskFreshness([day('2026-08-16')], { now });
  const periodic = deriveDeskFreshness([day('2026-08-11')], { now });
  const paused = deriveDeskFreshness([day('2026-08-09')], { now });
  const cases = [
    ['today is daily', deriveDeskFreshness([day('2026-08-16')], { now }).state === 'daily'],
    ['one day old remains inside the daily evidence window', deriveDeskFreshness([day('2026-08-15')], { now }).state === 'daily'],
    ['five days old downgrades to periodic', deriveDeskFreshness([day('2026-08-11')], { now }).state === 'periodic'],
    ['seven days old is paused', deriveDeskFreshness([day('2026-08-09')], { now }).state === 'paused'],
    ['simulated editions cannot refresh the public cadence', deriveDeskFreshness([day('2026-08-11'), { date: '2026-08-16', simulated: true }], { now }).latestEditionDate === '2026-08-11'],
    ['daily evidence satisfies the publisher postcondition', cadenceSatisfied(daily)],
    ['periodic and paused evidence fail the publisher postcondition', !cadenceSatisfied(periodic) && !cadenceSatisfied(paused)],
  ];
  const corpus = [day('2026-08-15')];
  const before = renderStaticDeskEvidence(corpus);
  const oldDate = globalThis.Date;
  let after;
  try {
    globalThis.Date = class { constructor() { throw new Error('static HTML must not read the clock'); } static now() { throw new Error('static HTML must not read the clock'); } };
    after = renderStaticDeskEvidence(corpus);
  } finally { globalThis.Date = oldDate; }
  cases.push(['static evidence is independent of runtime clock', before === after]);
  cases.push(['new published edition changes static evidence', before !== renderStaticDeskEvidence([...corpus, day('2026-08-16')])]);
  cases.push(['simulated edition cannot refresh static evidence', before === renderStaticDeskEvidence([...corpus, {date:'2026-08-16', simulated:true}])]);
  cases.push(['empty corpus remains unavailable, never daily', staticDeskEvidence([]).state === 'unavailable' && renderStaticDeskEvidence([]).includes('not yet available')]);
  cases.push(['unsafe date cannot enter markup', !renderStaticDeskEvidence([{date:'<script>'}]).includes('<script>')]);
  const story = { slug: 's' };
  cases.push(['require-today: an edition dated today passes', todaySatisfied([{ date: '2026-08-16', simulated: false, stories: [story] }], { now }).ok === true]);
  cases.push(['require-today: only yesterday fails', todaySatisfied([{ date: '2026-08-15', simulated: false, stories: [story] }], { now }).ok === false]);
  cases.push(['require-today: a simulated-only today fails', todaySatisfied([{ date: '2026-08-15', simulated: false, stories: [story] }, { date: '2026-08-16', simulated: true, stories: [story] }], { now }).ok === false]);
  cases.push(['require-today: an empty corpus fails', todaySatisfied([], { now }).ok === false]);
  cases.push(['require-today: uses the UTC date, not local time', todaySatisfied([{ date: '2026-08-16', stories: [story] }], { now: new Date('2026-08-16T23:59:00Z') }).ok === true
    && todaySatisfied([{ date: '2026-08-16', stories: [story] }], { now: new Date('2026-08-17T00:01:00Z') }).ok === false]);
  // S357: the postcondition is about the SLOT's edition date. The 22:07Z
  // late-night run routinely reaches this gate after UTC midnight.
  const afterMidnight = new Date('2026-08-17T00:04:00Z');
  const publishedThe16th = [{ date: '2026-08-16', simulated: false, stories: [story] }];
  cases.push(['require-today: the slot edition date passes after UTC midnight when that date published',
    todaySatisfied(publishedThe16th, { now: afterMidnight, date: '2026-08-16' }).ok === true]);
  cases.push(['require-today: check time alone would have failed that same run (the false red)',
    todaySatisfied(publishedThe16th, { now: afterMidnight }).ok === false]);
  cases.push(['require-today: the supplied date with no edition fails',
    todaySatisfied(publishedThe16th, { now: afterMidnight, date: '2026-08-17' }).ok === false]);
  cases.push(['require-today: a simulated-only edition for the supplied date fails',
    todaySatisfied([...publishedThe16th, { date: '2026-08-17', simulated: true, stories: [story] }], { now: afterMidnight, date: '2026-08-17' }).ok === false]);
  cases.push(['require-today: a later edition cannot satisfy an earlier missed day',
    todaySatisfied([{ date: '2026-08-17', simulated: false, stories: [story] }], { now: afterMidnight, date: '2026-08-16' }).ok === false]);
  cases.push(['require-today: --require-today=<date> supplies the edition date',
    requireTodayDate(['--require-today=2026-08-16'], {}).date === '2026-08-16']);
  cases.push(['require-today: the workflow may pass the slot date by env instead',
    requireTodayDate(['--require-today'], { NEWS_EDITION_DATE: '2026-08-16' }).date === '2026-08-16']);
  cases.push(['require-today: an explicit date beats the env',
    requireTodayDate(['--require-today=2026-08-16'], { NEWS_EDITION_DATE: '2026-08-11' }).date === '2026-08-16']);
  cases.push(['require-today: with no date supplied the UTC fallback is documented, not silent', (() => {
    const resolved = requireTodayDate(['--require-today'], {}, { now: afterMidnight });
    return resolved.ok && resolved.date === '2026-08-17' && /no edition date supplied/.test(resolved.source);
  })()]);
  cases.push(['require-today: a malformed date is refused, never treated as today',
    requireTodayDate(['--require-today=yesterday'], {}).ok === false
    && requireTodayDate(['--require-today'], { NEWS_EDITION_DATE: 'today' }).ok === false]);
  cases.push(['require-today: both spellings are recognised, and nothing else is',
    wantsRequireToday(['--require-today']) && wantsRequireToday(['--require-today=2026-08-16'])
    && !wantsRequireToday(['--check', '--require-daily'])]);
  cases.push(['static report makes no relative-age or current-cadence claim', !before.includes('days old') && !before.includes('Daily cadence') && before.includes('/api/news-desk-freshness.json')]);
  cases.forEach(([name, ok]) => console.log(`  ${ok ? 'ok' : 'FAIL'} ${name}`));
  if (cases.some(([, ok]) => !ok)) process.exit(1);
  console.log(`build-news-freshness --self-test: ${cases.length}/${cases.length} passed`);
}

export function cadenceSatisfied(value) {
  return value && value.state === 'daily';
}

/**
 * S356 (founder decision: the Desk publishes every day). `--require-daily`
 * tolerates a one-day-old edition, so a missed day only went red the NEXT day.
 * This asks the stricter same-day question: is there a non-simulated edition
 * dated `date`? Run at the late-night slot, a missed day goes red today.
 *
 * S357: `date` is the SLOT's edition date, supplied by the caller — not the
 * moment this check happens to run. The late-night slot fires at 22:07 UTC and
 * the whole publish job runs after it, so a run that resolved its edition as
 * 09-14 reaches this gate at 00:0x on 09-15 whenever the job takes ~2h or the
 * runner is queued. Reading the clock here then asked about the WRONG day: it
 * went red over a day that had published perfectly (a false alarm), and — worse
 * — it answered "satisfied" for 09-15 the moment 09-15's first edition existed,
 * so a genuinely missed 09-14 could never be caught by the gate built to catch
 * exactly that.
 */
export function todaySatisfied(days, { now = new Date(), date = null } = {}) {
  const today = date || new Date(now).toISOString().slice(0, 10);
  const ok = (days || []).some((day) => day?.simulated !== true && day?.date === today
    && Array.isArray(day?.stories) && day.stories.length > 0);
  return { ok, today };
}

const REQUIRE_TODAY_RE = /^--require-today(?:=(.*))?$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Was `--require-today` asked for, in either its bare or its dated spelling? */
export const wantsRequireToday = (argv = []) => (argv || []).some((arg) => REQUIRE_TODAY_RE.test(String(arg)));

/**
 * Which edition date the same-day postcondition is about.
 *
 * Precedence: `--require-today=<YYYY-MM-DD>` · `$NEWS_EDITION_DATE` · the
 * current UTC date. The fallback is DOCUMENTED rather than silent: it is only
 * correct for a run that cannot cross UTC midnight relative to its own slot, so
 * a scheduled publisher should always pass the slot's resolved date. A supplied
 * date that is not an ISO day is refused outright — quietly falling back to the
 * clock is how the bug above would come back.
 */
export function requireTodayDate(argv = [], env = {}, { now = new Date() } = {}) {
  for (const raw of argv || []) {
    const match = REQUIRE_TODAY_RE.exec(String(raw));
    if (match && match[1] !== undefined) {
      return ISO_DATE_RE.test(match[1])
        ? { ok: true, date: match[1], source: '--require-today=<date>' }
        : { ok: false, date: null, source: '--require-today=<date>', raw: match[1] };
    }
  }
  const fromEnv = String(env.NEWS_EDITION_DATE || '');
  if (fromEnv) {
    return ISO_DATE_RE.test(fromEnv)
      ? { ok: true, date: fromEnv, source: 'NEWS_EDITION_DATE' }
      : { ok: false, date: null, source: 'NEWS_EDITION_DATE', raw: fromEnv };
  }
  return { ok: true, date: new Date(now).toISOString().slice(0, 10), source: 'current UTC date (no edition date supplied)' };
}

/** Shared refusal, so the two call sites cannot drift apart. */
function requireTodayGate(days, latest) {
  const resolved = requireTodayDate(process.argv, process.env);
  if (!resolved.ok) {
    console.error(`✗ --require-today needs a YYYY-MM-DD edition date (got "${resolved.raw}" from ${resolved.source})`);
    process.exit(2);
  }
  const { ok, today } = todaySatisfied(days, { date: resolved.date });
  if (!ok) {
    console.error(`news same-day postcondition failed: no published (non-simulated) Desk edition exists for the ${today} UTC edition date (from ${resolved.source}); latest published edition is ${latest}. The Desk publishes every day — recover with: gh workflow run news-publish.yml`);
    process.exit(1);
  }
  return { today, source: resolved.source };
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const days = loadDays();
  if (wantsRequireToday(process.argv) && !process.argv.includes('--check') && !process.argv.includes('--require-daily')) {
    // Read-only assertion: never rewrites the public feed, so it cannot be
    // confused with (or mask) the --check drift gate.
    const { today, source } = requireTodayGate(days, deriveDeskFreshness(days).latestEditionDate || 'none');
    console.log(`news same-day postcondition: edition published for ${today} UTC (edition date from ${source})`);
    return;
  }
  const value = deriveDeskFreshness(days);
  const rendered = `${JSON.stringify(value, null, 2)}\n`;
  if (process.argv.includes('--check')) {
    const actual = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (actual !== rendered) {
      console.error('news freshness drift: public cadence no longer matches the latest edition; run node scripts/build-news-freshness.mjs and regenerate news pages');
      process.exit(1);
    }
    console.log(`news freshness: ${value.state} · latest ${value.latestEditionDate || 'none'} · age ${value.ageDays ?? 'unknown'}d`);
  } else {
    fs.writeFileSync(OUT, rendered);
    console.log(`news freshness -> ${value.state} · latest ${value.latestEditionDate || 'none'} · age ${value.ageDays ?? 'unknown'}d`);
  }
  if (process.argv.includes('--require-daily') && !cadenceSatisfied(value)) {
    console.error(`news cadence postcondition failed: public state is ${value.state}; latest edition ${value.latestEditionDate || 'none'} is ${value.ageDays ?? 'unknown'} day(s) old`);
    process.exit(1);
  }
  if (wantsRequireToday(process.argv)) {
    requireTodayGate(days, value.latestEditionDate || 'none');
  }
}

main();
