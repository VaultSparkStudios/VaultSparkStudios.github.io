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
import { execSync } from './lib/safe-spawn.mjs';

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
 * MAX_ENTRIES real entries are found — so the deep ceiling costs nothing on a
 * normal run.
 */
const SCAN_CEILING = 2000;

function recentCommits(max = SCAN_CEILING) {
  try {
    const out = execSync(
      `git log --pretty=format:"%H|%ct|%s" --max-count=${max}`,
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
    );
    return out.split('\n').filter(Boolean).map((line) => {
      const [sha, ts, ...rest] = line.split('|');
      return { sha: sha.slice(0, 8), ts: Number(ts) * 1000, subject: rest.join('|') };
    });
  } catch { return []; }
}

function build() {
  const all = recentCommits();
  const entries = [];
  for (const c of all) {
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
    });
    if (entries.length >= MAX_ENTRIES) break;
  }
  return {
    generatedAt: new Date().toISOString().slice(0, 10),
    generatedBy: 'scripts/build-commit-map.mjs',
    source: 'git log (local, noise-filtered)',
    kind: 'commit-map',
    label: 'The forge ledger',
    note: 'Recent moves in the forge. Automated bookkeeping filtered out.',
    count: entries.length,
    entries,
  };
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
  const total = cases.length + 1;
  const passed = pass + (noiseOk ? 1 : 0);
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

  const payload = build();
  if (!payload.entries.length) {
    console.log('build-commit-map: no non-noise commits found — keeping existing file');
    return;
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n');
  console.log(`build-commit-map: wrote ${payload.entries.length} forge moves → api/commit-map.json`);
}

main();
