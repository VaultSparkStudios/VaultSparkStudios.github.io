#!/usr/bin/env node
/**
 * build-ignis-conduit.mjs — generate api/ignis-conduit.json from real signals.
 *
 * Replaces the S160 seed data. Reads the last 24h of git commits, the most
 * recent closeout session number from PROJECT_STATUS.json, and the latest
 * audit JSON; synthesizes IGNIS-voice sentences from a template; writes the
 * 3 freshest to api/ignis-conduit.json. The website's hero ticker rotates
 * through them with the "IGNIS is reading the studio" label.
 *
 * Template-based (no LLM call) — keeps the pipeline free under CANON-029
 * and trivially deterministic. When the studio-ops cron is wired, it can
 * upgrade to LLM-narrated lines and write to the same endpoint.
 *
 * Usage:
 *   node scripts/build-ignis-conduit.mjs           # write
 *   node scripts/build-ignis-conduit.mjs --check   # parseable + non-empty
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { execSync } from './lib/safe-spawn.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'api', 'ignis-conduit.json');
const STATUS = path.join(ROOT, 'context', 'PROJECT_STATUS.json');
const CHECK = process.argv.includes('--check');

// CANON-022: IGNIS narration is studio-ops-owned (Designer). The public website
// is the Implementer — it must NOT call an LLM itself (also CANON-015 Max-Plan-First
// + CANON-029 free-tier). Instead it (a) respects LLM-narrated lines a studio-ops
// cron writes to this same endpoint, and (b) only fills the template when the file
// is template-sourced or stale. resolveCapability is consulted purely for
// observability — to log whether the upstream LLM upgrade is provisioned yet.
let resolveCapability = () => ({ ready: false });
try {
  ({ resolveCapability } = await import('./lib/secrets.mjs'));
} catch { /* lib absent in CI minimal env — observability degrades, narration unaffected */ }

// True when api/ignis-conduit.json was last written by an LLM narrator (studio-ops
// cron stamps source/narrator) and is still fresh for today — don't clobber it.
function isCronLlmNarration() {
  try {
    const cur = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    const today = new Date().toISOString().slice(0, 10);
    // Explicit marker only — the studio-ops cron stamps narrator:'ignis-llm'.
    // (Don't substring-match prose: the template's own source mentions "LLM".)
    return cur.narrator === 'ignis-llm' && cur.generatedAt === today;
  } catch { return false; }
}

// Automated bookkeeping commits the studio shouldn't narrate as creative moves.
const NARRATION_NOISE = [
  /\[skip ci\]/i,
  /update CI status beacon/i,
  /auto-update sitemap/i,
  /refresh vault narrative/i,
  /post-closeout events/i,
  /contracts reconcile/i,
];

// Look back far enough to find real moves even when the most recent commits are
// all CI beacons. We filter noise, then take the freshest real commits.
//
// S333: the fetch ceiling was 40, which truncated BEFORE the noise filter below
// and so contradicted the intent stated directly above. Measured on this repo:
// 452 commits in the 168h window, 61 of them human — but the newest 40 carried
// only 10 human commits, so 51 real moves (84%) were invisible. The scheduled
// publishers commit several times an hour, so any fixed count small enough to be
// "cheap" is smaller than a day of churn.
//
// The `--since` window is the real bound, and the caller already slices the
// output to 3 entries, so a larger fetch cannot grow the artifact — it only
// widens the pool those 3 are chosen from. Sized to the window, not to a count
// a cron can outrun.
const SCAN_CEILING = 2000;

function recentCommits(limitHours = 168, max = SCAN_CEILING) {
  try {
    const out = execSync(`git log --since="${limitHours} hours ago" --pretty=format:"%H|%ct|%s" --max-count=${max}`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    return out.split('\n').filter(Boolean).map((line) => {
      const [sha, ts, ...subjectParts] = line.split('|');
      return { sha: sha.slice(0, 8), ts: Number(ts) * 1000, subject: subjectParts.join('|') };
    }).filter((c) => !NARRATION_NOISE.some((re) => re.test(c.subject)));
  } catch { return []; }
}

function readSession() {
  try { return JSON.parse(fs.readFileSync(STATUS, 'utf8')).currentSession || null; }
  catch { return null; }
}

function projectFromSubject(subject) {
  // Pull a project hint from conventional-commit scope or first capitalized noun.
  const scope = subject.match(/^\w+\(([^)]+)\):/);
  if (scope) return scope[1];
  return 'vaultsparkstudios';
}

// Type-aware verb pools — the studio's IGNIS voice. Present tense, observational,
// no hype. Picking by commit type (not a flat list) keeps the narration honest:
// a `fix` reads as a fix, a `feat` reads as a ship.
const VERB_POOLS = {
  feat:     ['ships', 'opens', 'lands'],
  fix:      ['steadies', 'closes', 'untangles'],
  perf:     ['tightens', 'sheds weight from', 'quickens'],
  refactor: ['rewires', 'redraws', 'recomposes'],
  rebrand:  ['renames', 'reforges', 'recomposes'],
  style:    ['polishes', 'settles'],
  chore:    ['tends', 'keeps'],
  docs:     ['records', 'annotates'],
  test:     ['hardens', 'pins down'],
  build:    ['assembles', 'wires'],
  default:  ['moves', 'shifts'],
};

// Proper nouns whose casing must survive narration (never lower-cased at sentence start).
const PROPER_NOUNS = [
  'VaultSpark', 'Franchise Architect', 'Franchise', 'Obelisk', 'IGNIS', 'Oracle', 'Studio Pulse',
  'Atlas', 'Vorn', 'VEILOS', 'MindFrame', 'Call of Doodie', 'Voidfall', 'Gridiron', 'Cloudflare',
  'Supabase', 'Lighthouse', 'Vault',
];

// Leading imperative verbs that would double the narration verb ("opens add …") — drop them.
const IMPERATIVE_LEAD = /^(adds?|added|fix(?:es|ed)?|updates?|updated|removes?|removed|makes?|made|wires?|wired|ships?|shipped|builds?|built|creates?|created|refactors?|improves?|improved|expands?|expanded|introduces?|introduced|lands?|landed|polish(?:es|ed)?|hardens?|hardened|restores?|restored|renders?|enables?|teach(?:es)?|recovers?|quickens?|tightens?|trims?|reduces?|speeds?|cuts?|drops?|reworks?|revamps?|redesigns?|replaces?|swaps?|opens?|closes?|steadies|untangles?|sheds?|rewires?|redraws?|recomposes?|renames?|reforges?|settles?|tends?|keeps?|records?|annotates?|assembles?|moves?|shifts?)\s+/i;

// If the sanitized subject still reads as dev-facing, it must NOT reach the public hero —
// return null and let the ticker fall silently to the next candidate.
const DEVISH = [
  /\bD-S\d/i, /\bS\d{2,}\b/, /\bCANON-\d/i,               // session / decision / canon refs
  /[A-Za-z0-9_-]+\.(mjs|js|json|html|css|ts|tsx|yml|yaml|md|ndjson|xml|txt)\b/i, // file names
  /\/[a-z0-9_.-]+\//i,                                    // path fragments
  /`[^`]+`/, /=>/, /[a-z]+[A-Z][a-zA-Z]*\(/,              // code: backticks, arrows, camelCase()
  /\bbuild:check\b/i, /\bself-test\b/i, /\bexit\s?\d/i, /\b\d+\/\d+\b/, // CI jargon / ratios
  /\bgitignored?\b/i, /\bregex\b/i, /\bndjson\b/i,
  /\bbeacon\b/i, /\bCI\b/, /\bcron\b/i, /\bcloseout\b/i, /\brebase\b/i, /\bcommit\b/i, // ops jargon
];

function sanitizeSubject(subject) {
  let s = subject;
  s = s.replace(/\s*[-–—]?\s*(→|->)\s*/g, ' to ');   // arrows → words
  s = s.replace(/\s+\+\s+[^.]+$/, '');               // trailing "+ terse dev clause"
  s = s.replace(/\s*\([^)]*\)/g, '');                // drop parenthetical dev asides
  s = s.replace(/\s{2,}/g, ' ').replace(/[\s;:,\-–—]+$/, '').trim();
  s = s.replace(IMPERATIVE_LEAD, '');                // drop leading imperative verb
  return s.trim();
}

function preserveCase(s) {
  if (!s) return s;
  const fw = s.split(/\s/)[0];
  if (PROPER_NOUNS.some((pn) => s.startsWith(pn))) return s; // known proper noun
  if (/[a-z][A-Z]/.test(fw) || /^[A-Z]{2,}/.test(fw)) return s; // camelCase / acronym
  return s.charAt(0).toLowerCase() + s.slice(1);
}

// Returns a clean audience-safe sentence, or null if the commit shouldn't be narrated publicly.
function narrateCommit(commit) {
  const raw = commit.subject.replace(/\s+\[skip ci\]\s*$/, '');
  const m = raw.match(/^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/);
  const type = m ? m[1].toLowerCase() : 'default';
  const subject = sanitizeSubject((m ? m[4] : raw).trim());
  if (!subject || subject.length < 4) return null;
  if (DEVISH.some((re) => re.test(subject))) return null;
  const pool = VERB_POOLS[type] || VERB_POOLS.default;
  // Deterministic pick from the sha so the same commit always narrates the same.
  const verb = pool[Number('0x' + commit.sha.slice(0, 2)) % pool.length];
  const trimmed = subject.length > 96 ? subject.slice(0, 93).replace(/\s\S*$/, '') + '…' : subject;
  return `The studio ${verb} ${preserveCase(trimmed)}.`;
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function build() {
  const commits = recentCommits();
  const session = readSession();
  const entries = commits
    .map((c) => {
      const title = narrateCommit(c);
      return title ? {
        id: `ignis-S${session || '?'}-${c.sha}`,
        ts: new Date(c.ts).toISOString(),
        voice: 'ignis',
        title,
        project: projectFromSubject(c.subject),
        commit: c.sha,
      } : null;
    })
    .filter(Boolean)
    .slice(0, 3);

  return {
    generatedAt: new Date().toISOString().slice(0, 10),
    generatedBy: 'scripts/build-ignis-conduit.mjs',
    source: 'git log (7d window, noise-filtered), template narration (LLM upgrade pending studio-ops cron)',
    kind: 'ignis-conduit',
    label: 'IGNIS is reading the studio',
    entries,
  };
}

function selfTest() {
  const cases = [
    // [commit subject, sha, expectation]
    ['rebrand(phase 1): VaultSpark Football GM → Franchise Architect (name) + tombstone', 'aa000000',
      (t) => t && /VaultSpark Football GM to Franchise Architect/.test(t) && !/\(name\)|\+|→|tombstone/.test(t)],
    ['feat: add Obelisk Passport scaffold', 'bb000000',
      (t) => t && /Obelisk Passport scaffold/.test(t) && !/\badd\b/.test(t)],
    ['recover S283 closeout — verify 6 shipped fixes REAL, fix 1 regression', 'cc000000',
      (t) => t === null], // dev-facing (S283, ratios) → dropped
    ['perf: quicken the homepage first paint', 'dd000000',
      (t) => t && /^The studio /.test(t) && /homepage first paint/.test(t)],
    ['fix: tests/oracle-extra.spec.js networkidle trap', 'ee000000',
      (t) => t === null], // file path → dropped
    ['chore: update CI status beacon [skip ci]', 'ff000000',
      (t) => t === null || !/beacon/.test(t)], // noise-ish; if narrated must not read dev-ish
  ];
  let pass = 0;
  for (const [subject, sha, check] of cases) {
    const out = narrateCommit({ subject, sha });
    const ok = check(out);
    console.log(`  ${ok ? '✓' : '✗'} ${JSON.stringify(subject).slice(0, 52)} → ${JSON.stringify(out)}`);
    if (ok) pass++;
  }
  const okAll = pass === cases.length;
  console.log(`build-ignis-conduit --self-test: ${pass}/${cases.length}`);
  process.exit(okAll ? 0 : 1);
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const payload = build();
  const json = JSON.stringify(payload, null, 2);

  if (CHECK) {
    let existing = '';
    try { existing = fs.readFileSync(OUT, 'utf8'); } catch {}
    if (!existing) { console.error('build-ignis-conduit --check: api/ignis-conduit.json missing'); process.exit(1); }
    try { const parsed = JSON.parse(existing); if (!Array.isArray(parsed.entries)) throw 0; }
    catch { console.error('build-ignis-conduit --check: invalid JSON or missing entries'); process.exit(1); }
    console.log('build-ignis-conduit --check: present and parseable');
    return;
  }

  // CANON-022: never clobber LLM-narrated lines a studio-ops cron wrote today.
  if (isCronLlmNarration()) {
    console.log('build-ignis-conduit: studio-ops LLM narration is fresh — leaving it untouched');
    return;
  }

  // If git produced no commits in the window, leave the existing file alone.
  if (!payload.entries.length) {
    console.log('build-ignis-conduit: no commits in last 24h — keeping existing seed');
    return;
  }

  // Observability only — log whether the upstream LLM upgrade is provisioned.
  // The website never makes the call itself (CANON-015 + CANON-022).
  const narrateReady = !!resolveCapability('ignis.narrate').ready;
  console.log(`build-ignis-conduit: ignis.narrate capability ${narrateReady ? 'READY (studio-ops cron may upgrade these lines)' : 'not provisioned — using template narration'}`);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, json + '\n');
  console.log(`build-ignis-conduit: wrote ${payload.entries.length} entries → api/ignis-conduit.json`);
}

main();
