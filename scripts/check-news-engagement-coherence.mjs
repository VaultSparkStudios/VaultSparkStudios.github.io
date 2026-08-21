#!/usr/bin/env node
/**
 * check-news-engagement-coherence.mjs — the RENDERED audience numbers must
 * equal the committed feed, and a suppressed story must render no number.
 *
 * Twin of check-news-stats-coherence (which does this for the corpus figures).
 * The distinction matters: a generator self-test proves the FEED is right, and
 * says nothing about what the page shows. S317 moved these numbers to SSR
 * precisely so a gate could parse the real HTML — this is that gate.
 *
 * Two failure modes it exists to catch:
 *   1. Drift — the page shows a number the feed no longer agrees with (stale
 *      HTML committed without regenerating, or vice versa).
 *   2. FABRICATION — the page shows a figure for a story the feed marks
 *      `insufficient`/`unavailable`. That is the worst case: it invents
 *      readership. A story below the floor must render words, never digits.
 *
 * Usage:
 *   node scripts/check-news-engagement-coherence.mjs             # gate
 *   node scripts/check-news-engagement-coherence.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FEED = path.join(ROOT, 'api', 'news-desk-engagement.json');
const NEWS = path.join(ROOT, 'news');
const SELF_TEST = process.argv.includes('--self-test');

/** Pull the reader-activity panel's rendered values out of an article page. */
export function parsePanel(html) {
  const slug = /data-desk-engagement="([^"]+)"/.exec(html)?.[1] || null;
  if (!slug) return null;
  const grab = (attr) => {
    const m = new RegExp(`<strong ${attr}>([^<]*)</strong>`).exec(html);
    return m ? m[1].trim() : null;
  };
  return {
    slug,
    ssr: /data-desk-engagement="[^"]+"[^>]*data-ssr="1"/.test(html),
    estimatedMinutes: Number(/data-estimated-minutes="(\d+)"/.exec(html)?.[1]) || null,
    reach: grab('data-reach'),
    engaged: grab('data-engaged-time'),
    attention: grab('data-attention'),
    idle: grab('data-idle'),
    summaryReadTime: grab('data-story-read-time'),
    summaryViews: grab('data-story-reader-views'),
    labels: {
      readerViews: /desk-engagement-k">Reader views</.test(html),
      readTime: /desk-engagement-k">Read time</.test(html),
    },
  };
}

const hasDigits = (value) => typeof value === 'string' && /\d/.test(value);

/**
 * Byte-for-byte reproduction of the SSR humanizer in generate-news-pages.mjs
 * (`formatSeconds`). The rendered `data-engaged-time` figure is this function's
 * output, so the gate must format the feed value the same way to compare them.
 * Keep in lock-step with the generator.
 */
export function formatEngagedSeconds(total) {
  const s = Math.max(0, Math.round(Number(total) || 0));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return rest ? `${m}m ${rest}s` : `${m}m`;
}

/**
 * Compare one rendered panel against its feed row.
 * `row` may be undefined — a page for a story the feed does not list at all.
 */
export function evaluatePanel(panel, row) {
  const findings = [];
  if (!panel) return findings;
  if (!panel.ssr) findings.push(`${panel.slug}: reader-activity panel is not server-rendered (data-ssr missing)`);
  if (!row) findings.push(`${panel.slug}: story is missing from the engagement feed`);
  if (!panel.labels.readerViews || !panel.labels.readTime) {
    findings.push(`${panel.slug}: reader-facing Reader views / Read time labels are missing`);
  }

  const pageloads = row && row.pageloads != null ? row.pageloads : null;
  if (pageloads != null) {
    if (panel.reach !== pageloads.toLocaleString()) {
      findings.push(`${panel.slug}: rendered pageloads "${panel.reach}" ≠ feed ${pageloads}`);
    }
  } else if (hasDigits(panel.reach)) {
    findings.push(`${panel.slug}: renders a pageload FIGURE "${panel.reach}" while the feed publishes none`);
  }

  const avg = row && row.averageEngagedSeconds != null ? row.averageEngagedSeconds : null;
  const estimate = row && row.estimatedMinutes != null ? row.estimatedMinutes : null;
  if (avg != null) {
    // S323: engaged-time was the one field of three that checked FABRICATION but
    // never DRIFT — a page showing a stale engaged-time while the feed published
    // a different value passed green, exactly the "Drift" mode the header names.
    // Reproduce the SSR humanizer and assert equality, mirroring reach/attention.
    const expected = `${formatEngagedSeconds(avg)} avg`;
    if (panel.engaged !== expected) {
      findings.push(`${panel.slug}: rendered engaged-time "${panel.engaged}" ≠ feed ${expected}`);
    }
  } else if (estimate != null) {
    const expected = `~${estimate} min estimated`;
    if (panel.engaged !== expected) {
      findings.push(`${panel.slug}: rendered read-time estimate "${panel.engaged}" ≠ feed ${expected}`);
    }
  }

  if (estimate != null && panel.summaryReadTime !== `~${estimate} min`) {
    findings.push(`${panel.slug}: top read-time summary "${panel.summaryReadTime}" ≠ feed ~${estimate} min`);
  }
  const expectedSummaryViews = pageloads != null ? pageloads.toLocaleString() : 'Collecting';
  if (panel.summaryViews !== expectedSummaryViews) {
    findings.push(`${panel.slug}: top reader-views summary "${panel.summaryViews}" ≠ feed ${expectedSummaryViews}`);
  }

  const ratio = row && row.attentionRatio != null ? row.attentionRatio : null;
  if (ratio != null) {
    const expected = `${Math.round(ratio * 100)}%`;
    if (panel.attention !== expected) findings.push(`${panel.slug}: rendered attention "${panel.attention}" ≠ feed ${expected}`);
  } else if (hasDigits(panel.attention)) {
    findings.push(`${panel.slug}: renders an attention FIGURE "${panel.attention}" while the feed publishes none`);
  }

  if (!(row && row.idleBands) && hasDigits(panel.idle)) {
    findings.push(`${panel.slug}: renders an away-time FIGURE "${panel.idle}" while the feed publishes none`);
  }
  return findings;
}

function articlePages(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) articlePages(full, out);
    else if (entry.name === 'index.html') out.push(full);
  }
  return out;
}

function selfTest() {
  const sufficient = { slug: 'd/a', estimatedMinutes: 2, pageloads: 12, averageEngagedSeconds: 66, attentionRatio: 0.55, idleBands: { under30: 5, '30to119': 0, '120to599': 0, '600plus': 0, observations: 5 } };
  const suppressed = { slug: 'd/b', estimatedMinutes: 2, pageloads: null, averageEngagedSeconds: null, attentionRatio: null, idleBands: null };
  const page = (slug, reach, engaged, attention, idle, ssr = true, estimate = 2, summaryViews = reach) =>
    `<dl data-story-signals><strong data-story-read-time>~${estimate} min</strong><strong data-story-reader-views>${summaryViews}</strong></dl>` +
    `<section data-desk-engagement="${slug}" data-estimated-minutes="${estimate}"${ssr ? ' data-ssr="1"' : ''}>` +
    `<span class="desk-engagement-k">Reader views</span><span class="desk-engagement-k">Read time</span>` +
    `<strong data-reader-presence>Checking…</strong>` +
    `<strong data-reach>${reach}</strong><strong data-engaged-time>${engaged}</strong>` +
    `<strong data-attention>${attention}</strong><strong data-idle>${idle}</strong></section>`;

  const good = parsePanel(page('d/a', '12', '1m 6s avg', '55%', 'Mostly present', true, 2, '12'));
  const suppressedPage = parsePanel(page('d/b', 'Not enough yet', '~2 min estimated', '—', '—', true, 2, 'Collecting'));
  const fabricated = parsePanel(page('d/b', '3', '~2 min estimated', '20%', 'Mostly present', true, 2, 'Collecting'));
  const drifted = parsePanel(page('d/a', '11', '1m 6s avg', '55%', 'Mostly present', true, 2, '12'));
  const notSsr = parsePanel(page('d/b', 'Not enough yet', '~2 min estimated', '—', '—', false, 2, 'Collecting'));

  const cases = [
    ['a matching panel passes', evaluatePanel(good, sufficient).length === 0],
    ['a suppressed story rendering words passes', evaluatePanel(suppressedPage, suppressed).length === 0],
    ['THE FABRICATION CASE: measured digit-bearing fields are caught when the feed publishes none',
      (() => {
        const f = evaluatePanel(fabricated, suppressed).join(' | ');
        return /pageload FIGURE/.test(f) && /attention FIGURE/.test(f);
      })()],
    ['a word-only value is not mistaken for a figure',
      !evaluatePanel(fabricated, suppressed).some((x) => /away-time/.test(x))],
    ['a digit-bearing away-time IS caught',
      evaluatePanel(parsePanel(page('d/b', '—', '—', '—', '3 readers')), suppressed).some((x) => /away-time/.test(x))],
    ['a drifted pageload count is caught', evaluatePanel(drifted, sufficient).some((f) => /pageloads/.test(f))],
    ['a non-SSR panel is caught', evaluatePanel(notSsr, suppressed).some((f) => /not server-rendered/.test(f))],
    ['a story missing from the feed may not render figures',
      evaluatePanel(fabricated, undefined).some((f) => /missing from the engagement feed/.test(f))],
    ['attention drift is caught',
      evaluatePanel(parsePanel(page('d/a', '12', '1m 6s avg', '61%', 'Mostly present', true, 2, '12')), sufficient).some((f) => /attention/.test(f))],
    ['an engaged-time drift is caught (feed 66s → "1m 6s", page shows "1m 7s")',
      evaluatePanel(parsePanel(page('d/a', '12', '1m 7s avg', '55%', 'Mostly present', true, 2, '12')), sufficient).some((f) => /engaged-time "1m 7s avg" ≠/.test(f))],
    ['a matching engaged-time does not false-positive',
      !evaluatePanel(parsePanel(page('d/a', '12', '1m 6s avg', '55%', 'Mostly present', true, 2, '12')), sufficient).some((f) => /engaged-time/.test(f))],
    ['formatEngagedSeconds matches the SSR humanizer', formatEngagedSeconds(66) === '1m 6s' && formatEngagedSeconds(45) === '45s' && formatEngagedSeconds(120) === '2m'],
  ];
  let pass = 0;
  for (const [name, ok] of cases) { console.log(`  ${ok ? 'ok' : 'FAIL'} ${name}`); if (ok) pass++; }
  console.log(`check-news-engagement-coherence --self-test: ${pass}/${cases.length}`);
  return pass === cases.length;
}

if (SELF_TEST) process.exit(selfTest() ? 0 : 1);

const feed = fs.existsSync(FEED) ? JSON.parse(fs.readFileSync(FEED, 'utf8')) : { stories: [] };
const bySlug = new Map((feed.stories || []).map((row) => [row.slug, row]));
const findings = [];
let panels = 0;
for (const file of articlePages(NEWS)) {
  const panel = parsePanel(fs.readFileSync(file, 'utf8'));
  if (!panel) continue;
  panels++;
  findings.push(...evaluatePanel(panel, bySlug.get(panel.slug)));
}
if (findings.length) {
  console.error('check-news-engagement-coherence: rendered audience numbers disagree with the feed:');
  for (const f of findings) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check-news-engagement-coherence: ${panels} panel(s) — every rendered figure matches the committed feed`);
