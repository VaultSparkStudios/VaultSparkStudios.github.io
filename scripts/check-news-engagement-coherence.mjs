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
    ssr: /data-desk-engagement="[^"]+" data-ssr="1"/.test(html),
    reach: grab('data-reach'),
    engaged: grab('data-engaged-time'),
    attention: grab('data-attention'),
    idle: grab('data-idle'),
  };
}

const hasDigits = (value) => typeof value === 'string' && /\d/.test(value);

/**
 * Compare one rendered panel against its feed row.
 * `row` may be undefined — a page for a story the feed does not list at all.
 */
export function evaluatePanel(panel, row) {
  const findings = [];
  if (!panel) return findings;
  if (!panel.ssr) findings.push(`${panel.slug}: reader-activity panel is not server-rendered (data-ssr missing)`);

  const pageloads = row && row.pageloads != null ? row.pageloads : null;
  if (pageloads != null) {
    if (panel.reach !== pageloads.toLocaleString()) {
      findings.push(`${panel.slug}: rendered pageloads "${panel.reach}" ≠ feed ${pageloads}`);
    }
  } else if (hasDigits(panel.reach)) {
    findings.push(`${panel.slug}: renders a pageload FIGURE "${panel.reach}" while the feed publishes none`);
  }

  const avg = row && row.averageEngagedSeconds != null ? row.averageEngagedSeconds : null;
  if (avg == null && hasDigits(panel.engaged)) {
    findings.push(`${panel.slug}: renders an engaged-time FIGURE "${panel.engaged}" while the feed publishes none`);
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
  const sufficient = { slug: 'd/a', pageloads: 12, averageEngagedSeconds: 66, attentionRatio: 0.55, idleBands: { under30: 5, '30to119': 0, '120to599': 0, '600plus': 0, observations: 5 } };
  const suppressed = { slug: 'd/b', pageloads: null, averageEngagedSeconds: null, attentionRatio: null, idleBands: null };
  const page = (slug, reach, engaged, attention, idle, ssr = true) =>
    `<section data-desk-engagement="${slug}"${ssr ? ' data-ssr="1"' : ''}>` +
    `<strong data-reader-presence>Checking…</strong>` +
    `<strong data-reach>${reach}</strong><strong data-engaged-time>${engaged}</strong>` +
    `<strong data-attention>${attention}</strong><strong data-idle>${idle}</strong></section>`;

  const good = parsePanel(page('d/a', '12', '1m 6s', '55%', 'Mostly present'));
  const suppressedPage = parsePanel(page('d/b', 'Not enough yet', 'Building a sample', '—', '—'));
  const fabricated = parsePanel(page('d/b', '3', '40s', '20%', 'Mostly present'));
  const drifted = parsePanel(page('d/a', '11', '1m 6s', '55%', 'Mostly present'));
  const notSsr = parsePanel(page('d/b', 'Not enough yet', 'Building a sample', '—', '—', false));

  const cases = [
    ['a matching panel passes', evaluatePanel(good, sufficient).length === 0],
    ['a suppressed story rendering words passes', evaluatePanel(suppressedPage, suppressed).length === 0],
    ['THE FABRICATION CASE: every digit-bearing field is caught when the feed publishes none',
      (() => {
        const f = evaluatePanel(fabricated, suppressed).join(' | ');
        return /pageload FIGURE/.test(f) && /engaged-time FIGURE/.test(f) && /attention FIGURE/.test(f);
      })()],
    ['a word-only value is not mistaken for a figure',
      !evaluatePanel(fabricated, suppressed).some((x) => /away-time/.test(x))],
    ['a digit-bearing away-time IS caught',
      evaluatePanel(parsePanel(page('d/b', '—', '—', '—', '3 readers')), suppressed).some((x) => /away-time/.test(x))],
    ['a drifted pageload count is caught', evaluatePanel(drifted, sufficient).some((f) => /pageloads/.test(f))],
    ['a non-SSR panel is caught', evaluatePanel(notSsr, suppressed).some((f) => /not server-rendered/.test(f))],
    ['a story missing from the feed may not render figures',
      evaluatePanel(fabricated, undefined).length === 3],
    ['attention drift is caught',
      evaluatePanel(parsePanel(page('d/a', '12', '1m 6s', '61%', 'Mostly present')), sufficient).some((f) => /attention/.test(f))],
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
