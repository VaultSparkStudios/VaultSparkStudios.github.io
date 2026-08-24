#!/usr/bin/env node
/** Cross-day Desk slug uniqueness gate (S329).
 *
 * The 2026-08-21..23 triple-run shipped the SAME story slug on three
 * consecutive days — three self-canonical pages competing in search — because
 * every dedupe layer compared AI-rewritten headlines, never the deterministic
 * slug. This gate makes that shape unshippable:
 *
 *   - a slug may appear on more than one date ONLY as a consolidated set:
 *     exactly one canonical entry (no supersededBy) and every other entry
 *     superseded, pointing at the canonical URL /news/<canonDate>/<slug>/;
 *   - a superseded rerun must postdate its canonical;
 *   - the RENDERED page of every superseded entry must carry the canonical
 *     link + robots noindex (proves generate-news-pages wiring, not just data).
 *
 * Usage:
 *   node scripts/check-news-slug-uniqueness.mjs            # report
 *   node scripts/check-news-slug-uniqueness.mjs --check    # gate (exit 1)
 *   node scripts/check-news-slug-uniqueness.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DAYS = path.join(ROOT, 'data', 'news-desk', 'days');
const argv = process.argv.slice(2);
const CHECK = argv.includes('--check');
const SELF_TEST = argv.includes('--self-test');

/** Pure: days → findings. Each day: { date, simulated?, stories: [{slug, supersededBy?}] } */
export function validateSlugUniqueness(days, { pageFor = () => null } = {}) {
  const findings = [];
  const bySlug = new Map();
  for (const day of days) {
    if (day?.simulated) continue;
    for (const story of day.stories || []) {
      if (!story.slug) continue;
      if (!bySlug.has(story.slug)) bySlug.set(story.slug, []);
      bySlug.get(story.slug).push({ date: day.date, supersededBy: story.supersededBy || null });
    }
  }
  for (const [slug, entries] of bySlug) {
    const dates = new Set(entries.map((e) => e.date));
    if (dates.size === 1) {
      // same-day repeat would be a merge bug upstream; mergeDayArtifact dedupes
      if (entries.length > 1) findings.push(`${slug}: appears ${entries.length}x within one day (${entries[0].date})`);
      continue;
    }
    const canonicals = entries.filter((e) => !e.supersededBy);
    if (canonicals.length !== 1) {
      findings.push(`${slug}: published on ${dates.size} dates (${[...dates].sort().join(', ')}) with ${canonicals.length} canonical entries — expected exactly 1 canonical, the rest superseded`);
      continue;
    }
    const canon = canonicals[0];
    const canonUrl = `/news/${canon.date}/${slug}/`;
    for (const e of entries) {
      if (e === canon) continue;
      if (e.supersededBy !== canonUrl) findings.push(`${slug} (${e.date}): supersededBy "${e.supersededBy}" ≠ canonical ${canonUrl}`);
      if (e.date <= canon.date) findings.push(`${slug} (${e.date}): superseded entry predates its canonical (${canon.date}) — the FIRST publication is the canonical`);
      const html = pageFor(e.date, slug);
      if (html === null) continue; // data-only mode (self-test fixtures)
      if (html === '') { findings.push(`${slug} (${e.date}): rendered article missing`); continue; }
      if (!html.includes(`rel="canonical" href="https://vaultsparkstudios.com${canonUrl}"`)) findings.push(`${slug} (${e.date}): rendered page canonical does not point at ${canonUrl}`);
      if (!/name="robots"[^>]*noindex/.test(html)) findings.push(`${slug} (${e.date}): rendered superseded page is not noindex`);
    }
  }
  return findings;
}

function loadDays() {
  return fs.readdirSync(DAYS)
    .filter((n) => /^\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort()
    .map((n) => JSON.parse(fs.readFileSync(path.join(DAYS, n), 'utf8')));
}
const livePageFor = (date, slug) => {
  const p = path.join(ROOT, 'news', date, slug, 'index.html');
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
};

if (SELF_TEST) {
  let fail = 0;
  const t = (name, ok) => { if (ok) console.log(`  ✓ ${name}`); else { console.error(`  ✗ ${name}`); fail++; } };
  const clean = validateSlugUniqueness([
    { date: '2026-08-01', stories: [{ slug: 'a' }] },
    { date: '2026-08-02', stories: [{ slug: 'b' }] },
  ]);
  t('distinct slugs pass', clean.length === 0);
  const liveShape = validateSlugUniqueness([
    { date: '2026-08-21', stories: [{ slug: 'dup' }] },
    { date: '2026-08-22', stories: [{ slug: 'dup' }] },
    { date: '2026-08-23', stories: [{ slug: 'dup' }] },
  ]);
  t('THE LIVE CASE: a 3-day rerun with no consolidation fails', liveShape.some((f) => /3 dates .* 3 canonical/.test(f)));
  const good = { date: '2026-08-22', stories: [{ slug: 'dup', supersededBy: '/news/2026-08-21/dup/' }] };
  const page = '<link rel="canonical" href="https://vaultsparkstudios.com/news/2026-08-21/dup/"><meta name="robots" content="noindex,nofollow">';
  const consolidated = validateSlugUniqueness(
    [{ date: '2026-08-21', stories: [{ slug: 'dup' }] }, good],
    { pageFor: () => page },
  );
  t('a consolidated rerun (superseded → canonical, noindex page) passes', consolidated.length === 0);
  const wrongTarget = validateSlugUniqueness([
    { date: '2026-08-21', stories: [{ slug: 'dup' }] },
    { date: '2026-08-22', stories: [{ slug: 'dup', supersededBy: '/news/2026-08-19/dup/' }] },
  ], { pageFor: () => page });
  t('supersededBy pointing anywhere but the canonical fails', wrongTarget.some((f) => /≠ canonical/.test(f)));
  const indexable = validateSlugUniqueness(
    [{ date: '2026-08-21', stories: [{ slug: 'dup' }] }, good],
    { pageFor: () => '<link rel="canonical" href="https://vaultsparkstudios.com/news/2026-08-22/dup/">' },
  );
  t('a superseded page whose RENDERED head is self-canonical/indexable fails', indexable.length > 0);
  const simulated = validateSlugUniqueness([
    { date: '2026-08-21', stories: [{ slug: 'dup' }] },
    { date: '2026-08-22', simulated: true, stories: [{ slug: 'dup' }] },
  ]);
  t('simulated preview days are exempt', simulated.length === 0);
  console.log(`\ncheck-news-slug-uniqueness self-test: ${fail ? `✗ ${fail} failed` : 'all passed'}`);
  process.exit(fail ? 1 : 0);
}

const findings = validateSlugUniqueness(loadDays(), { pageFor: livePageFor });
if (!findings.length) {
  console.log('check-news-slug-uniqueness: ok (no cross-day slug reruns without consolidation)');
  process.exit(0);
}
console.error('✗ check-news-slug-uniqueness: cross-day slug reruns detected:');
for (const f of findings) console.error(`    ${f}`);
console.error('  Fix: mark the later rerun(s) supersededBy → /news/<first-date>/<slug>/ in data/news-desk/days/, then regenerate pages.');
process.exit(CHECK ? 1 : 0);
