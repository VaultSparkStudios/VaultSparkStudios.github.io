#!/usr/bin/env node
/** Build the public, privacy-safe receipt for The Desk scheduler. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'api', 'newsroom-run.json');
const WORKFLOW_NAME = 'The Desk — Scheduled Publish';
export const SLOTS_UTC = ['06:07', '12:07', '18:07', '22:07'];

const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

export function nextExpectedRunAt(fromIso, slots = SLOTS_UTC) {
  const from = new Date(fromIso);
  if (Number.isNaN(from.getTime())) throw new Error('newsroom-run: invalid reference time');
  for (let day = 0; day < 2; day++) {
    for (const slot of slots) {
      const [hour, minute] = slot.split(':').map(Number);
      const candidate = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + day, hour, minute));
      if (candidate.getTime() > from.getTime()) return candidate.toISOString();
    }
  }
  throw new Error('newsroom-run: no future schedule slot');
}

export function deriveReceipt({ ci, feed, days, workflowText }) {
  const scheduled = (ci.scheduledWorkflows || []).find((entry) => entry.name === WORKFLOW_NAME);
  const realDays = days.filter((day) => day && day.simulated !== true && /^\d{4}-\d{2}-\d{2}$/.test(day.date || ''));
  const latestDay = realDays.sort((a, b) => b.date.localeCompare(a.date))[0] || null;
  const latestItemDate = (feed.items || []).map((item) => String(item.date_published || '').slice(0, 10)).filter(Boolean).sort().at(-1) || null;
  const generatedAt = ci.generatedAt || feed.generatedAt;
  if (!generatedAt || Number.isNaN(Date.parse(generatedAt))) throw new Error('newsroom-run: source clock unavailable');
  if (!latestDay || latestDay.date !== latestItemDate) throw new Error('newsroom-run: latest corpus day and feed disagree');
  for (const slot of SLOTS_UTC) {
    const [hour, minute] = slot.split(':').map(Number);
    const cron = `${minute} ${hour} * * *`;
    if (!workflowText.includes(cron)) throw new Error(`newsroom-run: workflow is missing ${cron}`);
  }
  const observed = Boolean(scheduled && scheduled.lastUpdatedAt && scheduled.lastConclusion && scheduled.lastConclusion !== 'unknown');
  return {
    schemaVersion: '1.0',
    generatedBy: 'scripts/build-newsroom-run.mjs',
    generatedAt: new Date(generatedAt).toISOString(),
    publicSafe: true,
    state: observed ? 'observed' : 'abstained',
    workflow: { name: WORKFLOW_NAME, path: '.github/workflows/news-publish.yml', scheduleUtc: SLOTS_UTC },
    lastRunAt: observed ? new Date(scheduled.lastUpdatedAt).toISOString() : null,
    lastConclusion: observed ? scheduled.lastConclusion : null,
    lastSuccessfulStage: observed && scheduled.lastConclusion === 'success' ? 'scheduled-run-complete' : null,
    latestEditionDate: latestDay.date,
    nextExpectedRunAt: nextExpectedRunAt(observed ? scheduled.lastUpdatedAt : generatedAt),
    rebuildEvidence: {
      feedItems: (feed.items || []).length,
      corpusStories: realDays.reduce((sum, day) => sum + (day.stories || []).length, 0),
      latestDayStories: (latestDay.stories || []).length,
      feedAndCorpusAgree: true,
    },
    abstentionReason: observed ? null : 'The committed CI beacon has not observed a completed scheduled newsroom run; no partial stage is inferred.',
    privacy: {
      excludes: ['reader identifiers', 'request bodies', 'draft text', 'provider credentials'],
      note: 'This receipt reports run-level workflow evidence and public corpus counts only.',
    },
    sourceHashes: {
      ciStatusSha256: sha256(JSON.stringify(ci)),
      newsFeedSha256: sha256(JSON.stringify(feed)),
      workflowSha256: sha256(workflowText),
    },
  };
}

function loadDays() {
  const dir = path.join(ROOT, 'data', 'news-desk', 'days');
  return fs.readdirSync(dir).filter((name) => name.endsWith('.json')).map((name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')));
}

function build() {
  return deriveReceipt({
    ci: readJson('api/ci-status.json'),
    feed: readJson('api/news-desk-feed.json'),
    days: loadDays(),
    workflowText: fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'news-publish.yml'), 'utf8'),
  });
}

function selfTest() {
  const workflowText = SLOTS_UTC.map((slot) => { const [h, m] = slot.split(':'); return `${m} ${Number(h)} * * *`; }).join('\n');
  const base = { ci: { generatedAt: '2026-08-22T10:00:00Z', scheduledWorkflows: [{ name: WORKFLOW_NAME, lastConclusion: 'unknown', lastUpdatedAt: null }] }, feed: { generatedAt: '2026-08-22T00:00:00Z', items: [{ date_published: '2026-08-22T00:00:00Z' }] }, days: [{ date: '2026-08-22', simulated: false, stories: [{ slug: 'x' }] }], workflowText };
  const dark = deriveReceipt(base);
  const green = deriveReceipt({ ...base, ci: { ...base.ci, scheduledWorkflows: [{ name: WORKFLOW_NAME, lastConclusion: 'success', lastUpdatedAt: '2026-08-22T12:10:00Z' }] } });
  const cases = [
    ['unknown evidence abstains', dark.state === 'abstained' && dark.lastRunAt === null && dark.lastSuccessfulStage === null],
    ['success is run-level only', green.state === 'observed' && green.lastSuccessfulStage === 'scheduled-run-complete'],
    ['next slot is deterministic', nextExpectedRunAt('2026-08-22T12:10:00Z') === '2026-08-22T18:07:00.000Z'],
    ['overnight slot rolls forward', nextExpectedRunAt('2026-08-22T23:00:00Z') === '2026-08-23T06:07:00.000Z'],
    ['public receipt declares exclusions', dark.privacy.excludes.length === 4],
    ['feed/corpus counts are bounded', dark.rebuildEvidence.feedItems === 1 && dark.rebuildEvidence.corpusStories === 1],
    ['feed/corpus mismatch fails closed', (() => { try { deriveReceipt({ ...base, feed: { ...base.feed, items: [{ date_published: '2026-08-21T00:00:00Z' }] } }); return false; } catch { return true; } })()],
    ['missing cron fails closed', (() => { try { deriveReceipt({ ...base, workflowText: '' }); return false; } catch { return true; } })()],
  ];
  for (const [name, ok] of cases) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  const failed = cases.filter(([, ok]) => !ok);
  if (failed.length) process.exit(1);
  console.log(`build-newsroom-run --self-test: ${cases.length}/${cases.length} passed`);
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const rendered = JSON.stringify(build(), null, 2) + '\n';
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(OUT) || fs.readFileSync(OUT, 'utf8') !== rendered) {
      console.error('newsroom-run: drift — run node scripts/build-newsroom-run.mjs');
      process.exit(1);
    }
    console.log('newsroom-run ✓ byte-exact');
    return;
  }
  fs.writeFileSync(OUT, rendered);
  const receipt = JSON.parse(rendered);
  console.log(`✓ api/newsroom-run.json — ${receipt.state} · latest edition ${receipt.latestEditionDate}`);
}

const direct = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (direct) main();
