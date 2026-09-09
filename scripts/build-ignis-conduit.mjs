#!/usr/bin/env node
/**
 * build-ignis-conduit.mjs — generate api/ignis-conduit.json from real signals.
 *
 * Replaces the S160 seed data. Reads the last 7d of classified commit-map entries, the most
 * recent closeout session number from PROJECT_STATUS.json, synthesizes IGNIS-voice sentences from a template; writes the
 * 3 freshest to api/ignis-conduit.json. The website's hero ticker rotates
 * through them with the "IGNIS is reading the studio" label.
 *
 * Template-based (no LLM call) — keeps the pipeline free under CANON-029
 * and trivially deterministic. When the studio-ops cron is wired, it can
 * upgrade to LLM-narrated lines and write to the same endpoint.
 *
 * Usage:
 *   node scripts/build-ignis-conduit.mjs           # write
 *   node scripts/build-ignis-conduit.mjs --check   # eligible narration matches commit-map
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import assert from 'node:assert/strict';
import os from 'node:os';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'api', 'ignis-conduit.json');
const STATUS = path.join(ROOT, 'context', 'PROJECT_STATUS.json');
const COMMIT_MAP = path.join(ROOT, 'api', 'commit-map.json');
const CHECK = process.argv.includes('--check');

// CANON-022: IGNIS narration is studio-ops-owned (Designer). The public website
// is the Implementer — it must NOT call an LLM itself (also CANON-015 Max-Plan-First
// + CANON-029 free-tier). Instead it (a) respects LLM-narrated lines a studio-ops
// cron writes to this same endpoint, and (b) only fills the template when the file
// is template-sourced or stale. resolveCapability is consulted purely for
// observability — to log whether the upstream LLM upgrade is provisioned yet.
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

// A changed public file is necessary evidence of scope, not evidence that the
// commit's own subject is public copy. Reject operational topics before cleanup.
const INTERNAL_SUBJECT = /\b(?:workflow|pipeline|publisher|rebase|bookkeeping|credential|diagnostics?|supabase|cloudflare|lighthouse|compiler|generator|manifest|artifact|cron|guard|guards|debug)\b|\b(?:skipped|successful|failed)\s+(?:step|job)\b|\bCI\b/i;
const PUBLIC_SUBJECT = /^(?:(?:a|an|the)\s+)?(?:(?:clearer|faster|better|new|accessible|improved)\s+){0,2}(?:signup|registration|sign[- ]in|navigation|homepage|home page|project gallery|game catalog|games?|catalog|membership|member portal|search|accessibility)\b/i;
// Reuse the established product casing vocabulary, excluding infrastructure names.
const PUBLIC_PRODUCTS = PROPER_NOUNS.filter(name => !['Cloudflare', 'Supabase', 'Lighthouse', 'Obelisk'].includes(name));
const ACTIONS = [
  [/^(?:adds?|added|introduces?|introduced|creates?|created)\s+/i, 'Added'],
  [/^(?:fix(?:es|ed)?|repairs?|repaired|restores?|restored)\s+/i, 'Fixed'],
  [/^(?:improves?|improved|quickens?|quickened|speeds?\s+up)\s+/i, 'Improved'],
  [/^(?:renames?|renamed|rebrands?|rebranded)\s+/i, 'Renamed'],
  [/^(?:removes?|removed)\s+/i, 'Removed'],
];
const TYPE_ACTION = { feat: 'Added', fix: 'Fixed', perf: 'Improved', style: 'Improved', rebrand: 'Renamed' };

export function narrateCommit(commit) {
  if (commit.visitorFacing !== true || commit.type === 'chore') return null;
  const raw = commit.subject.replace(/\s+\[skip ci\]\s*$/, '');
  const m = raw.match(/^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/);
  const type = m ? m[1].toLowerCase() : 'default';
  if (!TYPE_ACTION[type]) return null;
  let subject = (m ? m[4] : raw).trim();
  if (INTERNAL_SUBJECT.test(subject) || DEVISH.some(re => re.test(subject))) return null;
  let action = TYPE_ACTION[type];
  for (const [pattern, verb] of ACTIONS) {
    if (pattern.test(subject)) { action = verb; subject = subject.replace(pattern, ''); break; }
  }
  subject = sanitizeSubject(subject).replace(/[.!?]+$/, '');
  if (!subject || subject.length > 120) return null;
  // Preserve the recorded failure's meaning without promising a new live outcome.
  if (action === 'Fixed' && /^(?:the\s+)?(?:signup|registration)\s+(?:path|flow|form)\s+(?:that was\s+)?(?:failing every registration|preventing registration)$/i.test(subject)) {
    return 'Fixed the signup error that prevented registration.';
  }
  if (!PUBLIC_SUBJECT.test(subject) && !PUBLIC_PRODUCTS.some(name => subject.startsWith(name))) return null;
  // Unknown leftover imperative verbs are not noun phrases to prepend a verb to.
  if (ACTIONS.some(([pattern]) => pattern.test(subject))) return null;
  return `${action} ${subject}.`;
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

export function buildConduit(commitMap, session, now = new Date()) {
  if (!commitMap || !Array.isArray(commitMap.entries)) throw new Error('commit-map input unavailable or malformed; existing narration preserved');
  const cutoff = now.getTime() - 168 * 3600000;
  const commits = commitMap.entries.map(entry => {
    if (!entry || typeof entry.sha !== 'string' || !/^[a-f0-9]{8,40}$/i.test(entry.sha)
      || typeof entry.summary !== 'string' || typeof entry.type !== 'string'
      || !Number.isFinite(Date.parse(entry.ts))) throw new Error('commit-map entry malformed; existing narration preserved');
    return { ...entry, subject: `${entry.type}${entry.scope ? `(${entry.scope})` : ''}: ${entry.summary}` };
  }).filter(entry => Date.parse(entry.ts) >= cutoff && Date.parse(entry.ts) <= now.getTime())
    .sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
  const entries = commits.map(c => {
    const title = narrateCommit(c);
    return title ? {
      id: `ignis-S${session || '?'}-${c.sha}`,
      ts: new Date(c.ts).toISOString(), voice: 'ignis', title,
      project: projectFromSubject(c.subject), commit: c.sha,
    } : null;
  }).filter(Boolean).slice(0, 3);
  return {
    generatedAt: now.toISOString().slice(0, 10),
    generatedBy: 'scripts/build-ignis-conduit.mjs',
    source: 'api/commit-map.json (7d window, visitor-facing non-chore entries), template narration',
    kind: 'ignis-conduit', label: 'IGNIS is reading the studio', entries,
  };
}

export function writeTemplateConduit(inputPath, outputPath, session, now = new Date()) {
  // Read/validate first. An unavailable input must neither erase history nor report success.
  const map = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const payload = buildConduit(map, session, now);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2) + '\n');
  return payload;
}

function selfTest() {
  const cases = [
    // [commit subject, sha, expectation]
    ['rebrand(phase 1): VaultSpark Football GM → Franchise Architect (name) + tombstone', 'aa000000',
      (t) => t && /VaultSpark Football GM to Franchise Architect/.test(t) && !/\(name\)|\+|→|tombstone/.test(t)],
    ['feat: add Obelisk Passport scaffold', 'bb000000', (t) => t === null],
    ['recover S283 closeout — verify 6 shipped fixes REAL, fix 1 regression', 'cc000000',
      (t) => t === null], // dev-facing (S283, ratios) → dropped
    ['perf: quicken the homepage first paint', 'dd000000',
      (t) => t === 'Improved the homepage first paint.'],
    ['fix: tests/oracle-extra.spec.js networkidle trap', 'ee000000',
      (t) => t === null], // file path → dropped
    ['chore: update CI status beacon [skip ci]', 'ff000000',
      (t) => t === null || !/beacon/.test(t)], // noise-ish; if narrated must not read dev-ish
  ];
  let pass = 0;
  for (const [subject, sha, check] of cases) {
    const out = narrateCommit({ subject, sha, visitorFacing: true });
    const ok = check(out);
    console.log(`  ${ok ? '✓' : '✗'} ${JSON.stringify(subject).slice(0, 52)} → ${JSON.stringify(out)}`);
    if (ok) pass++;
  }
  const now = new Date('2026-09-09T12:00:00Z');
  const feature = { sha: 'bb000000', ts: '2026-09-08T12:00:00Z', type: 'feat', scope: 'home', summary: 'add a clearer project gallery', visitorFacing: true };
  const chore = { ...feature, sha: '2b79d924', type: 'chore', scope: 'S345', summary: 're-derive after publisher race (attempt 1)' };
  const fixtures = [
    ['actual chore touching public files is refused', () => assert.equal(buildConduit({ entries: [chore] }, 347, now).entries.length, 0)],
    ['actual nonvisitor chore is refused', () => assert.equal(buildConduit({ entries: [{ ...chore, visitorFacing: false }] }, 347, now).entries.length, 0)],
    ['ordinary visitor feature is accepted', () => assert.match(buildConduit({ entries: [feature] }, 347, now).entries[0].title, /clearer project gallery/)],
    ['absent visitor classification is refused', () => assert.equal(buildConduit({ entries: [{ ...feature, visitorFacing: undefined }] }, 347, now).entries.length, 0)],
    ['nonvisitor feature is refused', () => assert.equal(buildConduit({ entries: [{ ...feature, visitorFacing: false }] }, 347, now).entries.length, 0)],
    ['old and future entries are excluded', () => assert.equal(buildConduit({ entries: [{ ...feature, ts: '2026-08-01' }, { ...feature, ts: '2026-10-01' }] }, 347, now).entries.length, 0)],
    ['observed skipped-step narration is not public copy', () => assert.equal(buildConduit({ entries: [{ ...feature, summary: 'a skipped step read as a successful step, four guards deep' }] }, 347, now).entries.length, 0)],
    ['observed provider mismatch diagnosis is not public copy', () => assert.equal(buildConduit({ entries: [{ ...feature, type: 'fix', summary: 'name the Supabase project mismatch instead of blaming the provider' }] }, 347, now).entries.length, 0)],
    ['observed signup failure becomes one factual grammatical sentence', () => assert.equal(buildConduit({ entries: [{ ...feature, type: 'fix', summary: 'repair the signup path that was failing every registration' }] }, 347, now).entries[0].title, 'Fixed the signup error that prevented registration.')],
    ['incidental visitor topic cannot launder internal diagnostics', () => assert.equal(buildConduit({ entries: [{ ...feature, summary: 'add homepage diagnostics for the failed workflow step' }] }, 347, now).entries.length, 0)],
    ['unknown topic is omitted instead of prefixed', () => assert.equal(buildConduit({ entries: [{ ...feature, summary: 'add an opaque contraption' }] }, 347, now).entries.length, 0)],
    ['unknown envelope throws', () => assert.throws(() => buildConduit({}, 347, now), /unavailable/)],
    ['measured empty replaces leak while missing input preserves history', () => {
      const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-conduit-test-'));
      try {
        const input = path.join(temp, 'input.json'); const output = path.join(temp, 'output.json');
        fs.writeFileSync(output, 'useful prior history');
        assert.throws(() => writeTemplateConduit(input, output, 347, now));
        assert.equal(fs.readFileSync(output, 'utf8'), 'useful prior history');
        fs.writeFileSync(input, '{torn');
        assert.throws(() => writeTemplateConduit(input, output, 347, now));
        assert.equal(fs.readFileSync(output, 'utf8'), 'useful prior history');
        fs.writeFileSync(input, JSON.stringify({ entries: [chore] }));
        writeTemplateConduit(input, output, 347, now);
        assert.deepEqual(JSON.parse(fs.readFileSync(output, 'utf8')).entries, []);
      } finally {
        assert.equal(path.dirname(path.resolve(temp)), path.resolve(os.tmpdir()));
        assert.ok(path.basename(temp).startsWith('vs-conduit-test-'));
        fs.rmSync(temp, { recursive: true, force: true });
      }
    }],
  ];
  for (const [name, check] of fixtures) { check(); pass++; console.log(`  ok ${name}`); }
  const total = cases.length + fixtures.length;
  console.log(`build-ignis-conduit --self-test: ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  // The upstream narrator remains authoritative when explicitly marked fresh.
  if (isCronLlmNarration()) {
    console.log('build-ignis-conduit: fresh studio-ops narration preserved');
    return;
  }
  if (CHECK) {
    const parsed = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    if (!Array.isArray(parsed.entries)) throw new Error('invalid conduit entries');
    const map = JSON.parse(fs.readFileSync(COMMIT_MAP, 'utf8'));
    const expected = buildConduit(map, readSession(), new Date());
    // Session labels and generation dates are bookkeeping; public sentences and
    // their source commits must match the currently measured eligible subset.
    const comparable = entries => entries.map(({ id, ...entry }) => entry);
    if (JSON.stringify(comparable(parsed.entries)) !== JSON.stringify(comparable(expected.entries))) {
      throw new Error('conduit visitor-facing narration drift; regenerate after commit-map');
    }
    console.log('build-ignis-conduit --check: visitor-facing narration verified');
    return;
  }
  const payload = writeTemplateConduit(COMMIT_MAP, OUT, readSession());
  console.log(`build-ignis-conduit: wrote ${payload.entries.length} measured entries`);
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === url.fileURLToPath(import.meta.url);
if (isDirect) main();
