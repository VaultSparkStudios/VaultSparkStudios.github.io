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
function recentCommits(limitHours = 168, max = 40) {
  try {
    const out = execSync(`git log --since="${limitHours} hours ago" --pretty=format:"%H|%ct|%s" --max-count=${max}`, { cwd: ROOT, encoding: 'utf8' });
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
  style:    ['polishes', 'settles'],
  chore:    ['tends', 'keeps'],
  docs:     ['records', 'annotates'],
  test:     ['hardens', 'pins down'],
  build:    ['assembles', 'wires'],
  default:  ['moves', 'shifts'],
};

function narrateCommit(commit) {
  const raw = commit.subject.replace(/\s+\[skip ci\]\s*$/, '');
  const m = raw.match(/^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/);
  const type = m ? m[1].toLowerCase() : 'default';
  const subject = (m ? m[4] : raw).trim();
  const pool = VERB_POOLS[type] || VERB_POOLS.default;
  // Deterministic pick from the sha so the same commit always narrates the same.
  const verb = pool[Number('0x' + commit.sha.slice(0, 2)) % pool.length];
  const trimmed = subject.length > 104 ? subject.slice(0, 101) + '…' : subject;
  // "The studio {verb} {what}." — one clean observational sentence, no em-dash crutch.
  return `The studio ${verb} ${lowerFirst(trimmed)}.`;
}

function lowerFirst(s) {
  if (!s) return s;
  // Preserve leading acronyms (CLS, LCP, RUM, SW, CI…) and proper-noun-ish caps.
  const firstWord = s.split(/\s/)[0];
  if (/^[A-Z]{2,}/.test(firstWord)) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function build() {
  const commits = recentCommits();
  const session = readSession();
  const entries = commits.slice(0, 3).map((c) => ({
    id: `ignis-S${session || '?'}-${c.sha}`,
    ts: new Date(c.ts).toISOString(),
    voice: 'ignis',
    title: narrateCommit(c),
    project: projectFromSubject(c.subject),
    commit: c.sha,
  }));

  return {
    generatedAt: new Date().toISOString().slice(0, 10),
    generatedBy: 'scripts/build-ignis-conduit.mjs',
    source: 'git log (7d window, noise-filtered), template narration (LLM upgrade pending studio-ops cron)',
    kind: 'ignis-conduit',
    label: 'IGNIS is reading the studio',
    entries,
  };
}

function main() {
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
