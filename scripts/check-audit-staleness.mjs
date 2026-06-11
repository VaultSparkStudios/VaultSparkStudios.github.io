#!/usr/bin/env node
// check-audit-staleness.mjs — pre-score guard for /audit.
//
// On a long-lived codebase the single biggest audit failure mode is scoring a
// candidate that is already shipped (S163 feedback-provenance, S178 visit-nudge,
// S187 manifesto+compounding all caught this way). This grovels the corpus +
// TASK_BOARD DONE history for a slug/keywords and returns a verdict BEFORE the
// LLM spends a scoring (or an /implement) pass on it.
//
//   node scripts/check-audit-staleness.mjs --slug studio-dispatch-optin \
//        --keywords "email opt-in,newsletter capture,studio dispatch"
//   node scripts/check-audit-staleness.mjs --self-test
//
// Verdicts: already-done | partial | fresh   (exit 0 always; verdict is on stdout
// + machine-readable with --json). Never fails a build — it's an advisory.
//
// Per DECISIONS (S178): exports are pure; side effects gate on RUN_DIRECT.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const SEARCH_DIRS = ['assets', 'scripts', 'supabase', 'data', 'api'];
const SEARCH_EXT = new Set(['.js', '.mjs', '.ts', '.json', '.html', '.css']);
const TASK_BOARD = 'context/TASK_BOARD.md';
const MAX_HITS = 12;

// Tokenize a slug into meaningful stems: "studio-dispatch-optin" -> studio,dispatch,optin
function slugStems(slug) {
  return String(slug || '')
    .split(/[-_\s]+/)
    .map((s) => s.toLowerCase().trim())
    .filter((s) => s.length >= 3 && !['the', 'and', 'for', 'pre', 'check'].includes(s));
}

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (SEARCH_EXT.has(extname(e.name))) out.push(full);
  }
  return out;
}

// A phrase term is DISTINCTIVE enough that a hit is real evidence, not noise:
// multi-word, hyphenated, or long. Single ambient-vocabulary words ("studio",
// "game", "hero", "honest") never qualify on their own — that was the v1 bug
// that false-flagged every candidate as already-done.
function phraseTermsFor(slug, keywords) {
  const raw = [
    slug,                                   // "studio-dispatch-optin" — hyphenated, distinctive
    String(slug || '').replace(/-/g, ' '),  // "studio dispatch optin"
    ...keywords.map((k) => String(k).toLowerCase().trim()),
  ];
  return [...new Set(raw)]
    .map((t) => t.toLowerCase().trim())
    .filter((t) => t && (t.includes(' ') || t.includes('-') || t.length >= 12));
}

// Core: pure function. Returns { verdict, score, hits, doneHits, stems, phrases }.
export function checkStaleness({ slug = '', keywords = [], root = '.' } = {}) {
  const stems = slugStems(slug);
  const phrases = phraseTermsFor(slug, keywords);
  if (!phrases.length) return { verdict: 'fresh', score: 0, hits: [], doneHits: [], stems, phrases };

  const files = SEARCH_DIRS.flatMap((d) => walk(join(root, d)))
    // never match our own source (slug + every candidate phrase live in here)
    .filter((f) => !f.replace(/\\/g, '/').endsWith('scripts/check-audit-staleness.mjs'));
  const hits = [];
  const seenFiles = new Set();

  for (const file of files) {
    if (hits.length >= MAX_HITS) break;
    let text;
    try { text = readFileSync(file, 'utf8'); } catch { continue; }
    const lower = text.toLowerCase();
    if (!phrases.some((t) => lower.includes(t))) continue;   // fast reject
    const lines = text.split('\n');
    for (let i = 0; i < lines.length && hits.length < MAX_HITS; i++) {
      const ll = lines[i].toLowerCase();
      const phraseHit = phrases.find((t) => ll.includes(t));
      if (phraseHit) {
        // de-dup the hashed shell triplets: count one hit per distinct basename
        const base = file.replace(/\\/g, '/').replace(/^\.\//, '').replace(/-[0-9a-f]{8,}\./, '.');
        const key = base + '::' + phraseHit;
        if (seenFiles.has(key)) continue;
        seenFiles.add(key);
        hits.push({ file: base, line: i + 1, match: phraseHit, text: lines[i].trim().slice(0, 120) });
      }
    }
  }

  // TASK_BOARD DONE history: an '[x]' line containing a distinctive phrase is
  // the strongest evidence the work already shipped.
  const doneHits = [];
  try {
    const tb = readFileSync(join(root, TASK_BOARD), 'utf8').split('\n');
    for (const line of tb) {
      const ll = line.toLowerCase();
      if (!/\[x\]/.test(ll)) continue;
      if (phrases.some((t) => ll.includes(t))) {
        doneHits.push(line.trim().slice(0, 140));
        if (doneHits.length >= 5) break;
      }
    }
  } catch { /* no board */ }

  let verdict = 'fresh';
  if (doneHits.length || hits.length >= 3) verdict = 'already-done';
  else if (hits.length >= 1) verdict = 'partial';
  return { verdict, score: hits.length + doneHits.length * 3, hits, doneHits, stems, phrases };
}

// Distinctive keywords for an audit item: the concrete filenames its recipe/
// summary names are the strongest "did this already ship" signal (a script or
// asset that now exists in the corpus = shipped). Slug is added by checkStaleness.
export function keywordsForItem(item) {
  const blob = `${item.summary || ''} ${item.recipe || ''} ${item.why || ''}`;
  const files = blob.match(/[\w/-]+\.(?:mjs|js|json|html|css)/g) || [];
  return [...new Set(files.map((f) => f.toLowerCase()))];
}

// Find the newest docs/AUDIT_*.json by mtime (a -SNNN suffix sorts BEFORE the
// bare date lexically, so name-sort is unreliable — use mtime).
export function newestAuditJson(root = '.') {
  const dir = join(root, 'docs');
  let entries;
  try { entries = readdirSync(dir); } catch { return null; }
  const audits = entries
    .filter((f) => /^AUDIT_.*\.json$/.test(f))
    .map((f) => { const full = join(dir, f); return { full, f, mtime: statSync(full).mtimeMs }; })
    .sort((a, b) => b.mtime - a.mtime);
  return audits.length ? audits[0] : null;
}

// Batch pre-score guard: run the freshness check across every item in the newest
// audit. Advisory by design — surfaces items already shipped so the next /audit
// (or /implement) does not re-litigate them. Returns { file, results }.
export function auditBatch(root = '.') {
  const newest = newestAuditJson(root);
  if (!newest) return { file: null, results: [] };
  let parsed;
  try { parsed = JSON.parse(readFileSync(newest.full, 'utf8')); } catch { return { file: newest.f, results: [] }; }
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  const results = items.map((it) => ({
    slug: it.slug,
    ...checkStaleness({ slug: it.slug, keywords: keywordsForItem(it), root }),
  }));
  return { file: newest.f, results };
}

function fmt(res, slug) {
  const icon = res.verdict === 'already-done' ? '⛔' : res.verdict === 'partial' ? '⚠' : '✓';
  const out = [`${icon}  ${slug || '(no slug)'} — ${res.verdict.toUpperCase()}  (signal ${res.score})`];
  if (res.doneHits.length) {
    out.push('   TASK_BOARD DONE:');
    res.doneHits.forEach((d) => out.push('     ' + d));
  }
  res.hits.slice(0, 6).forEach((h) => out.push(`     ${h.file}:${h.line}  «${h.match}»  ${h.text}`));
  if (res.verdict === 'already-done') out.push('   → Do NOT score/implement as new. Mark as save, verify, or deepen.');
  else if (res.verdict === 'partial') out.push('   → Partial prior art — scope to the missing delta only.');
  return out.join('\n');
}

function selfTest() {
  let pass = 0, fail = 0;
  const check = (name, cond) => { cond ? pass++ : (fail++, console.log('  ✗ ' + name)); };
  // 1. empty slug -> fresh
  check('empty -> fresh', checkStaleness({}).verdict === 'fresh');
  // 2. a known-shipped concept resolves to already-done (proof-conversion shipped S186)
  const pc = checkStaleness({ slug: 'proof-conversion-line', keywords: ['proof-conversion-line'] });
  check('proof-conversion -> already-done', pc.verdict === 'already-done');
  // 3. a nonsense slug stays fresh (distinctive phrase appears nowhere)
  const nz = checkStaleness({ slug: 'zzqq-nonexistent-widget-xyz', keywords: ['zzqq-nonexistent-widget'] });
  check('nonsense -> fresh', nz.verdict === 'fresh');
  // 6. generic single words must NOT qualify as phrase terms (the v1 noise bug)
  check('generic words rejected', phraseTermsFor('studio-game-hero', []).every((t) => t.includes(' ') || t.includes('-') || t.length >= 12));
  // 4. stems tokenize correctly
  check('stems tokenize', JSON.stringify(slugStems('studio-dispatch-optin')) === JSON.stringify(['studio', 'dispatch', 'optin']));
  // 5. result shape stable
  const sh = checkStaleness({ slug: 'a-b-c' });
  check('shape', ['verdict', 'score', 'hits', 'doneHits'].every((k) => k in sh));
  // 7. keyword extraction pulls filenames from an item's prose
  const kw = keywordsForItem({ recipe: 'New scripts/check-rum-allowlist.mjs gate; edit index.html and assets/x.js' });
  check('keywords extract filenames', kw.includes('scripts/check-rum-allowlist.mjs') && kw.includes('assets/x.js'));
  // 8. newest-audit discovery returns a real file (this repo has audits)
  const na = newestAuditJson('.');
  check('newest audit discoverable', na && /^AUDIT_.*\.json$/.test(na.f));
  // 9. batch returns one result per item with a verdict
  const batch = auditBatch('.');
  check('batch shape', Array.isArray(batch.results) && batch.results.every((r) => 'verdict' in r && 'slug' in r));
  console.log(`check-audit-staleness self-test: ${pass}/${pass + fail} passing`);
  return fail === 0;
}

const RUN_DIRECT = (import.meta.main ?? (process.argv[1] && process.argv[1].endsWith('check-audit-staleness.mjs')));

if (RUN_DIRECT) {
  const argv = process.argv.slice(2);
  if (argv.includes('--self-test')) {
    process.exit(selfTest() ? 0 : 1);
  }
  // Batch mode — the canonical pre-score step for /audit. Scans every item in the
  // newest docs/AUDIT_*.json and surfaces any with prior art. Advisory: exit 0.
  if (argv.includes('--audit')) {
    const { file, results } = auditBatch('.');
    if (!file) { console.log('✓ check-audit-staleness --audit: no AUDIT_*.json found'); process.exit(0); }
    const flagged = results.filter((r) => r.verdict !== 'fresh');
    if (argv.includes('--json')) { console.log(JSON.stringify({ file, results }, null, 2)); process.exit(0); }
    console.log(`check-audit-staleness --audit · ${file} · ${results.length} item(s)`);
    if (!flagged.length) { console.log('✓ all items fresh — no prior art detected'); process.exit(0); }
    for (const r of flagged) {
      const icon = r.verdict === 'already-done' ? '⛔' : '⚠';
      console.log(`${icon}  ${r.slug} — ${r.verdict.toUpperCase()} (signal ${r.score})`);
      r.doneHits.slice(0, 2).forEach((d) => console.log('     DONE: ' + d));
      r.hits.slice(0, 2).forEach((h) => console.log(`     ${h.file}:${h.line} «${h.match}»`));
    }
    console.log('→ Advisory: verify each flagged item is a deepen/save, not a re-build, before scoring.');
    process.exit(0);
  }
  const get = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : null; };
  const slug = get('--slug') || '';
  const keywords = (get('--keywords') || '').split(',').map((s) => s.trim()).filter(Boolean);
  const res = checkStaleness({ slug, keywords });
  if (argv.includes('--json')) console.log(JSON.stringify({ slug, ...res }, null, 2));
  else console.log(fmt(res, slug));
}
