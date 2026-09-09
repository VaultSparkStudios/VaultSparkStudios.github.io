#!/usr/bin/env node
/**
 * build-commit-map.mjs (S162 audit · commit-to-site-forge-map)
 *
 * Turns the repo's own commit history into a public "Forge ledger" — a
 * legible timeline of creative labor rendered on /studio-pulse/. Every
 * meaningful commit becomes a public artifact: what changed, when, and the
 * kind of move it was (ship / fix / refine / perf …).
 *
 * Build-time, deterministic, free (CANON-029): reads `git log` locally rather
 * than calling the GitHub API at runtime. The repo is the source of truth, so
 * a network round-trip would add cost + a failure mode for zero extra signal.
 *
 * Noise discipline: automated housekeeping commits (CI beacons, sitemap/feed
 * auto-commits, [skip ci]) are filtered out — the ledger shows human moves,
 * not the machine's bookkeeping.
 *
 * Output: api/commit-map.json  → consumed by assets/studio-pulse-live.js.
 *
 * Usage:
 *   node scripts/build-commit-map.mjs           # write
 *   node scripts/build-commit-map.mjs --check    # present + parseable
 *   node scripts/build-commit-map.mjs --self-test # classifier unit checks
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { execFileSync } from './lib/safe-spawn.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'api', 'commit-map.json');
const CHECK = process.argv.includes('--check');
const SELF_TEST = process.argv.includes('--self-test');

const MAX_ENTRIES = 24;

// Conventional-commit type → public-facing "forge move" vocabulary.
// The studio speaks in moves, not git jargon.
const MOVE = {
  feat:     { label: 'Shipped',  tone: 'sparked' },
  fix:      { label: 'Fixed',    tone: 'fix' },
  perf:     { label: 'Sped up',  tone: 'perf' },
  refactor: { label: 'Rewired',  tone: 'forge' },
  style:    { label: 'Polished', tone: 'forge' },
  docs:     { label: 'Documented', tone: 'muted' },
  test:     { label: 'Hardened', tone: 'forge' },
  build:    { label: 'Built',    tone: 'forge' },
  chore:    { label: 'Tended',   tone: 'muted' },
};

// Automated commits that are bookkeeping, not creative labor.
const NOISE = [
  /\[skip ci\]/i,
  /update CI status beacon/i,
  /auto-update sitemap/i,
  /refresh vault narrative/i,
  /post-closeout events/i,
  /contracts reconcile/i,
];

function classify(subject) {
  const m = subject.match(/^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/);
  if (!m) return { type: 'chore', scope: null, breaking: false, summary: subject };
  return { type: m[1].toLowerCase(), scope: m[2] || null, breaking: !!m[3], summary: m[4] };
}

function isNoise(subject) {
  return NOISE.some((re) => re.test(subject));
}

/**
 * Scan depth, not display depth.
 *
 * This was a fixed 120-commit window, which silently goes blind as automation
 * churn grows: the scheduled publishers commit `[skip ci]` housekeeping several
 * times an hour, so 128 pure-noise commits accumulated in the two days after
 * S332 and pushed every human commit past the window. The filter was working
 * perfectly — it just had nothing but noise to look at, and the public "forge
 * ledger" published ZERO entries while the repo was busy (observed live, S333).
 *
 * The window must therefore be sized by what it is looking FOR (24 human
 * commits), not by a commit count that a cron can outrun. Scan deep enough that
 * a realistic noise burst cannot bury the signal, and stop early the moment
 * MAX_ENTRIES real entries are found. Git still fetches a bounded window;
 * classification stops once the display quota is met. One extra record is only
 * a truncation sentinel, never a classified entry.
 */
const SCAN_CEILING = 2000;

/*
 * S344 — visitor-facing classification.
 *
 * The public changelog was publishing "Refined resync after publisher race
 * (attempt 1)." to returning visitors on the homepage. The narrative builder's
 * jargon strip is TOKEN-level (it removes `S340`, `SIL 981`), so it has a notion
 * of internal VOCABULARY and none of internal SUBJECT MATTER: a commit that
 * changed nothing a visitor can see still earned a public sentence.
 *
 * A word blocklist would need a new entry for every future leak. The structural
 * fact is cheaper and total: did this commit touch anything a visitor can
 * perceive? That is computable from the changed paths, so it is computed ONCE
 * here in the producer and consumed downstream. Feeds derived from the site
 * (api/, data/, stats.json) are deliberately NOT visitor-facing: a commit that
 * only re-derives them is bookkeeping, and any change a visitor could attribute
 * to the studio moves a page, an asset, or a runtime surface alongside them.
 */
const VISITOR_FACING = [
  /(^|\/)[^/]+\.html$/i,        // any page, at any depth
  /^assets\//,                  // css, js, images, fonts, social art
  /^cloudflare\//,              // the edge worker — /login and friends
  /^supabase\/functions\//,     // runtime endpoints a visitor's browser hits
  /^sw\.js$/,                   // the service worker
];

export function isVisitorFacing(files) {
  return (files || []).some((f) => VISITOR_FACING.some((re) => re.test(f)));
}

export function recentCommits({ max = SCAN_CEILING, execute = execFileSync } = {}) {
  try {
    // --name-only in the SAME call: one git invocation, and every entry can be
    // classified without a per-commit `git show`.
    const out = execute('git',
      ['log', '--pretty=format:__VSC__%H|%ct|%s', '--name-only', '--max-count=' + (max + 1)],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, windowsHide: true }
    );
    const commits = [];
    let current = null;
    for (const line of out.split('\n')) {
      if (line.startsWith('__VSC__')) {
        if (current) commits.push(current);
        const [sha, ts, ...rest] = line.slice(7).split('|');
        current = { sha: sha.slice(0, 8), ts: Number(ts) * 1000, subject: rest.join('|'), files: [] };
      } else if (current && line.trim()) {
        current.files.push(line.trim());
      }
    }
    if (current) commits.push(current);
    return commits;
  } catch { throw new Error('commit-map Git history unavailable; existing output preserved'); }
}

export function build({ max = SCAN_CEILING, execute = execFileSync, now = new Date() } = {}) {
  const all = recentCommits({ max, execute });
  let inspected = 0;
  const entries = [];
  for (const c of all.slice(0, max)) {
    inspected += 1;
    if (isNoise(c.subject)) continue;
    const { type, scope, breaking, summary } = classify(c.subject);
    const move = MOVE[type] || MOVE.chore;
    // Strip a trailing session tag like "[skip ci]" defensively; trim length.
    const clean = summary.replace(/\s+\[skip ci\]\s*$/i, '').trim();
    entries.push({
      sha: c.sha,
      ts: new Date(c.ts).toISOString(),
      type,
      scope,
      breaking,
      move: move.label,
      tone: move.tone,
      summary: clean.length > 120 ? clean.slice(0, 117) + '…' : clean,
      // Consumed by build-changelog-narrative.mjs. Written for EVERY entry on
      // every run (this map is regenerated wholesale from git), so a missing
      // field downstream means the producer did not run — which readers must
      // treat as not-publishable rather than defaulting open.
      visitorFacing: isVisitorFacing(c.files),
    });
    if (entries.length >= MAX_ENTRIES) break;
  }
  return {
    generatedAt: now.toISOString().slice(0, 10),
    generatedBy: 'scripts/build-commit-map.mjs',
    source: 'git log (local, noise-filtered)',
    kind: 'commit-map',
    label: 'The forge ledger',
    note: 'Recent moves in the forge. Automated bookkeeping filtered out.',
    count: entries.length,
    scan: {
      scope: 'locally available Git history; not remote-history completeness',
      ceiling: max, fetched: all.length, inspected, target: MAX_ENTRIES, selected: entries.length,
      quotaSatisfied: entries.length >= MAX_ENTRIES,
      moreHistoryBeyondWindow: all.length > max,
      state: entries.length >= MAX_ENTRIES ? 'quota-satisfied' : all.length > max ? 'scan-ceiling-reached' : 'available-history-exhausted',
    },
    entries,
  };
}

export function writeCommitMap({ output = OUT, ...options } = {}) {
  // No filesystem mutation occurs before both observation and coverage gates.
  const payload = build(options);
  if (payload.scan.state === 'scan-ceiling-reached') {
    throw new Error('commit-map scan ceiling reached: ' + payload.scan.inspected + ' commits inspected, ' + payload.count + '/' + MAX_ENTRIES + ' meaningful entries; existing output preserved');
  }
  if (!payload.entries.length) return { written: false, payload };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(payload, null, 2) + '\n');
  return { written: true, payload };
}

function selfTest() {
  const cases = [
    ['feat(S162): ship commit map', 'feat', 'S162', 'ship commit map'],
    ['fix: drawer z-index', 'fix', null, 'drawer z-index'],
    ['perf(home)!: split bundle', 'perf', 'home', 'split bundle'],
    ['random message no type', 'chore', null, 'random message no type'],
  ];
  let pass = 0;
  for (const [input, type, scope, summary] of cases) {
    const r = classify(input);
    const ok = r.type === type && r.scope === scope && r.summary === summary;
    console.log(`${ok ? '✓' : '✘'} "${input}" → ${r.type}/${r.scope}/${r.summary}`);
    if (ok) pass += 1;
  }
  const noiseOk = isNoise('chore: update CI status beacon [skip ci]') && !isNoise('feat: real work');
  console.log(`${noiseOk ? '✓' : '✘'} noise filter`);
  const raw = (subjects) => subjects.map((subject, i) => '__VSC__' + String(i + 1).padStart(40, '0') + '|1700000000|' + subject + '\nindex.html').join('\n');
  const run = (subjects) => (binary, args) => {
    if (binary !== 'git' || !args.includes('--max-count=2001')) throw new Error('unexpected Git invocation');
    return raw(subjects.slice(0, 2001));
  };
  const bots = Array.from({length: 2005}, () => 'chore: publish [skip ci]');
  const bounded = build({ execute: run([...bots, 'feat: buried work']) });
  const quota = build({ execute: run(Array.from({length: 2050}, (_, i) => i < 24 ? 'feat: visible work' : 'chore: publish [skip ci]')) });
  const short = build({ execute: run(['feat: one', 'chore: publish [skip ci]']) });
  const exact = build({ execute: run(bots.slice(0, 2000)) });
  const more = [
    ['bot ceiling cannot imply quiet complete history', bounded.count === 0 && bounded.scan.state === 'scan-ceiling-reached' && bounded.scan.inspected === 2000 && bounded.scan.fetched === 2001],
    ['normal quota states target coverage, not whole-history completeness', quota.count === 24 && quota.scan.state === 'quota-satisfied' && quota.scan.inspected === 24 && quota.scan.moreHistoryBeyondWindow],
    ['short local history honestly exhausts before quota', short.count === 1 && short.scan.state === 'available-history-exhausted' && !short.scan.moreHistoryBeyondWindow],
    ['exact ceiling without sentinel is not claimed truncated', exact.scan.state === 'available-history-exhausted'],
  ];
  const temp = fs.mkdtempSync(path.join(ROOT, '.cache', 'recovery-commit-map-test-'));
  const previous = path.join(temp, 'previous.json');
  try {
    fs.writeFileSync(previous, '{"previous":true}');
    let gitError = false, boundedError = false;
    try { writeCommitMap({ output: previous, execute: () => { throw new Error('Git unavailable'); } }); } catch (error) { gitError = /Git history unavailable/.test(error.message); }
    more.push(['Git failure rejects and preserves previous bytes', gitError && fs.readFileSync(previous, 'utf8') === '{"previous":true}']);
    try { writeCommitMap({ output: previous, execute: run(bots) }); } catch (error) { boundedError = /scan ceiling reached/.test(error.message); }
    more.push(['insufficient bounded scan rejects before overwrite', boundedError && fs.readFileSync(previous, 'utf8') === '{"previous":true}']);
    const written = writeCommitMap({ output: previous, execute: run(['feat: one']) });
    more.push(['successful short history writes typed coverage', written.written && JSON.parse(fs.readFileSync(previous, 'utf8')).scan.state === 'available-history-exhausted']);
  } finally { fs.unlinkSync(previous); fs.rmdirSync(temp); }
  for (const [name, ok] of more) console.log((ok ? '✓ ' : '✘ ') + name);
  const total = cases.length + 1 + more.length;
  const passed = pass + (noiseOk ? 1 : 0) + more.filter(([,ok]) => ok).length;
  console.log(`\n${passed}/${total} passed`);
  process.exit(passed === total ? 0 : 1);
}

function main() {
  if (SELF_TEST) return selfTest();

  if (CHECK) {
    let existing = '';
    try { existing = fs.readFileSync(OUT, 'utf8'); } catch {}
    if (!existing) { console.error('build-commit-map --check: api/commit-map.json missing'); process.exit(1); }
    try { const p = JSON.parse(existing); if (!Array.isArray(p.entries)) throw 0; }
    catch { console.error('build-commit-map --check: invalid JSON or missing entries'); process.exit(1); }
    console.log('build-commit-map --check: present and parseable');
    return;
  }

  const { written, payload } = writeCommitMap();
  if (!written) {
    console.log('build-commit-map: available local history has no non-noise commits — keeping existing file');
    return;
  }
  console.log('build-commit-map: wrote ' + payload.entries.length + ' forge moves; scan ' + payload.scan.state + ' (' + payload.scan.inspected + '/' + payload.scan.ceiling + ' inspected)');
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(url.fileURLToPath(import.meta.url));
if (isDirect) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
