// context-wipe-guard.mjs — S179 [audit item #10]
//
// Prevents accidental context file wipes during agent write-back. Two modes:
//
// 1. PROACTIVE: assertSafeWrite(filePath, newContent, opts)
//    Call this BEFORE writing to disk (any script that overwrites context/ files).
//    Throws if the write would shrink the file below the threshold or violate
//    monotonic growth on append-only files.
//
// 2. REACTIVE (closeout pre-commit gate): checkContextFiles(root)
//    Called by closeout-autopilot before step 4 (git status). Compares working-tree
//    context files against HEAD and warns/aborts on wipe-class changes.
//
// Append-only contract (AGENTS.md hard rule):
//   DECISIONS.md · SELF_IMPROVEMENT_LOOP.md · CREATIVE_DIRECTION_RECORD.md · logs/WORK_LOG.md
//   New content MUST extend existing content — old content must be a prefix of new.
//
// Threshold files (any context/ or docs/ file):
//   Content length must not shrink below WIPE_THRESHOLD (default 50%) of HEAD.

import { readFileSync, existsSync, realpathSync, readdirSync } from 'fs';
import { resolve, join, dirname, basename, relative, isAbsolute } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from './safe-spawn.mjs';
import { STUDIO_STATE_DIRS } from './studio-state-dirs.mjs';

const WIPE_THRESHOLD = 0.5; // warn/abort if new content < 50% of existing

// The CANON-001 SIL Rolling Status header block is DESIGNED to be overwritten
// every closeout (delimited by HTML comment markers). Strip it from both sides
// before the append-only check so a normal rolling-status refresh is never
// mis-read as a deletion of prior content. No-op on files without the markers.
const ROLLING_STATUS_RE =
  /<!--\s*rolling-status-start\s*-->[\s\S]*?<!--\s*rolling-status-end\s*-->/g;
function stripRegenerable(content) {
  return content.replace(ROLLING_STATUS_RE, '');
}

// Append-only invariant, order-agnostic. This repo writes some append-only files
// NEWEST-FIRST (SELF_IMPROVEMENT_LOOP.md prepends each session above prior
// entries) and others oldest-first (WORK_LOG.md appends at the end). The real
// rule is not "new starts with old" (that only holds for oldest-first appends and
// false-trips every newest-first prepend) but "no prior entry was edited or
// deleted" — i.e. the prior committed body survives intact as a contiguous block.
// `existing ⊆ new` (substring) holds for BOTH prepend and append; startsWith does
// not. Returns true when the append-only contract is satisfied.
function normalizeEol(content) {
  const normalized = content.replace(/\r\n/g, '\n');
  return normalized.length ? normalized.replace(/\s+$/, '\n') : normalized;
}

function appendOnlyPreserved(existing, newContent) {
  const oldBody = normalizeEol(stripRegenerable(existing));
  const newBody = normalizeEol(stripRegenerable(newContent));
  if (oldBody.length === 0) return true;        // nothing prior to preserve
  if (newBody.includes(oldBody)) return true;   // fast path: pure prepend/append (contiguous)
  // General case: the closeout pattern prepends a NEW entry *after a fixed header*
  // (e.g. SELF_IMPROVEMENT_LOOP.md / DECISIONS.md: "# title\n…preamble…\n\n## newest"),
  // so the prior body is no longer one contiguous substring — the header and the old
  // entries are split by the inserted entry. Prior content is preserved iff the new
  // content is the old content with exactly ONE contiguous region inserted: i.e. a
  // common PREFIX + common SUFFIX of newBody together cover all of oldBody. Any edit
  // or deletion of a prior entry shrinks that coverage below oldBody.length.
  let p = 0;
  const maxP = Math.min(oldBody.length, newBody.length);
  while (p < maxP && oldBody[p] === newBody[p]) p++;
  let s = 0;
  const maxS = Math.min(oldBody.length - p, newBody.length - p); // never overlap the prefix
  while (s < maxS && oldBody[oldBody.length - 1 - s] === newBody[newBody.length - 1 - s]) s++;
  return p + s >= oldBody.length;
}


const ARCHIVED_RECORD = /^context\/archive\/(?:DECISIONS|SELF_IMPROVEMENT_LOOP|SIL)_(?:S\d+-S\d+|\d{4}Q[1-4])\.md$/;
// S363 — this repo's rotation tool does not use the `_S<a>-S<b>.md` + in-file
// pointer convention the propagated guard was written for. `scripts/rotate-ledger.mjs`
// writes `context/archive/<TAG>_<YYYY>Q<q>.md` (DECISIONS_2026Q3.md, SIL_2026Q3.md)
// and adds no pointer line to the hot file. The two contracts met head-on in this
// closeout: the ledger size gate aborted naming `rotate-ledger --apply` as the
// repair, and running exactly that repair produced a tree the wipe guard rejected
// as `append-only-violated (79.1% of HEAD)`. A prescribed repair that trips a
// sibling gate leaves no correct move.
//
// Only DISCOVERY is broadened — how archive bodies are located. The substantive
// proof below is untouched: every `## ` section present in HEAD must still exist
// verbatim, either in the new hot file or in an archive body, each occurrence
// consumed once. Content that vanished still fails, and content that was silently
// edited on its way to the archive still fails.
const ARCHIVE_STEM_ALIASES = { SELF_IMPROVEMENT_LOOP: ['SELF_IMPROVEMENT_LOOP', 'SIL'], DECISIONS: ['DECISIONS'] };
function discoverArchiveRecords(repo, stem) {
  const names = ARCHIVE_STEM_ALIASES[stem] || [stem];
  let entries = [];
  try { entries = readdirSync(join(repo, 'context', 'archive')); } catch { return []; }
  return entries
    .map((name) => `context/archive/${name}`)
    .filter((rel) => ARCHIVED_RECORD.test(rel) && names.some((n) => basename(rel).startsWith(`${n}_`)))
    .sort();
}
const ARCHIVE_POINTER = /^> Older entries [^\r\n]*?live verbatim in \`(context\/archive\/[A-Z_]+_S\d+-S\d+\.md)\`[^\r\n]*$/gm;
function archivePointers(text) {
  return [...String(text).matchAll(ARCHIVE_POINTER)].map(m=>m[1]);
}
function withoutArchivePointers(text) {
  return normalizeEol(stripRegenerable(text)).replace(ARCHIVE_POINTER,'').trim();
}
/** Exact prior sections may relocate only through explicit same-document pointers.
 * No archive directory exemption: missing/edited content and lost navigation fail.
 */
export function archivedAppendOnlyPreserved(existing,next,{filePath,root}={}) {
  if(!filePath || !/[/\\]context[/\\](?:DECISIONS|SELF_IMPROVEMENT_LOOP)\.md$/.test(filePath))return false;
  const repo=resolve(root||dirname(dirname(filePath)));
  const stem=basename(filePath,'.md');
  const declared=archivePointers(next);
  const oldPointers=archivePointers(existing);
  // A pointer that existed before must never be dropped, whichever convention is in use.
  if(oldPointers.some(p=>!declared.includes(p)))return false;
  // S363 — fall back to the archive files this repo's rotation actually writes when
  // the hot file declares no pointers. Never a blanket pass: an empty discovery
  // still returns false, and every section must still be proven present below.
  const pointers=declared.length?declared:discoverArchiveRecords(repo,stem);
  if(!pointers.length)return false;
  const archiveDir=join(repo,'context','archive');
  let archiveRoot;
  try {
    archiveRoot=realpathSync(archiveDir);
    const rel=relative(realpathSync(repo),archiveRoot);
    if(!rel || rel.startsWith('..') || isAbsolute(rel))return false;
  } catch { return false; }
  const bodies=[withoutArchivePointers(next)];
  for(const pointer of new Set(pointers)) {
    // S363 — accept this repo's archive stems (SIL for SELF_IMPROVEMENT_LOOP) and its
    // quarter naming. ARCHIVED_RECORD still pins the shape, and the containment check
    // below still refuses anything resolving outside context/archive/.
    const allowedPrefixes=(ARCHIVE_STEM_ALIASES[stem]||[stem]).map(n=>`context/archive/${n}_`);
    if(!allowedPrefixes.some(prefix=>pointer.startsWith(prefix))||!ARCHIVED_RECORD.test(pointer))return false;
    try {
      const target=realpathSync(join(repo,pointer));
      const rel=relative(archiveRoot,target);
      if(!rel || rel.startsWith('..') || isAbsolute(rel))return false;
      bodies.push(normalizeEol(readFileSync(target,'utf8')));
    } catch { return false; }
  }
  const old=withoutArchivePointers(existing);
  const starts=[...old.matchAll(/^## /gm)].map(m=>m.index);
  if(!starts.length)return false;
  const preamble=old.slice(0,starts[0]).trim();
  if(preamble&&!bodies[0].includes(preamble))return false;
  const sections=starts.map((start,i)=>old.slice(start,starts[i+1]??old.length).trim());
  // Consume each exact occurrence once; duplicated old sections need equal evidence.
  for(const section of sections) {
    let found=false;
    for(let i=0;i<bodies.length;i++) {
      const at=bodies[i].indexOf(section);
      if(at<0 || (at>0&&bodies[i][at-1]!=='\n'))continue;
      bodies[i]=bodies[i].slice(0,at)+bodies[i].slice(at+section.length);
      found=true;break;
    }
    if(!found)return false;
  }
  return true;
}

// Files where content must only GROW (old content must be a prefix of new)
const APPEND_ONLY = [
  'context/DECISIONS.md',
  'context/SELF_IMPROVEMENT_LOOP.md',
  'docs/CREATIVE_DIRECTION_RECORD.md',
  'logs/WORK_LOG.md',
];

// Files allowed to shrink (compact-handoff trims it; TASK_BOARD.md items get
// struck; S246 — TASK_BOARD + CURRENT_STATE rotate shipped-session sections to
// context/archive/ via rotate-context-files.mjs, so large legitimate shrinks
// are now by-design; archives + git history hold the rotated content).
const SHRINK_ALLOWED = [
  'context/LATEST_HANDOFF.md',
  'context/TASK_BOARD.md',
  'context/CURRENT_STATE.md',
];

// Machine-GENERATED living-protocol artifacts. These are rewritten from scratch
// every session by their generators (generate-genius-list.mjs etc.), so their
// SIZE is a function of the generator's current input — e.g. when the IGNIS scorer
// falls back, GENIUS_LIST legitimately shrinks to a couple of valid items. A raw
// size-ratio test therefore false-positives on every legitimate regeneration
// (S189). But genius #237 still requires these watched for a TRUE wipe (overwrite
// with an empty template scaffold), so we keep them guarded with a content-shape
// check (isGeneratedWiped) INSTEAD of the ratio test — not exempt like SHRINK_ALLOWED.
const GENERATED = [
  'docs/GENIUS_LIST.md',
  'docs/INNOVATION_PACK.md',
  'docs/AUDIT_',
  // S244 — brief-v5 canonical flip: the startup brief is now the diff-rendered
  // v5 surface (~63% smaller than v3 BY DESIGN), and SIGNALS.md is rewritten
  // each render as bare rows (previously ║-framed). Both are regenerated from
  // scratch every session; ratio tests false-positive on every legitimate
  // render. The shape check still catches a true wipe (empty scaffold).
  'docs/STARTUP_BRIEF.md',
  'context/SIGNALS.md',
  // S294 recovery — this is a live generated census, not an append-only ledger.
  // A healthy run may legitimately resolve every escalation and rewrite the file
  // to { count: 0, escalations: [] }. The JSON shape guard below still rejects an
  // empty object, empty array, or corrupt payload, so wipe protection stays armed.
  'portfolio/ark/DISPATCH_ESCALATIONS.json',
  // S295 — ACTIVE_SESSIONS is another live lock census. A truthful refresh may
  // legitimately shrink whenever a worker closes, so byte-ratio loss is not a
  // wipe signal. Keep it in GENERATED (rather than SHRINK_ALLOWED) so an empty
  // object/array or corrupt JSON still fails the content-shape guard.
  'portfolio/ACTIVE_SESSIONS.json',
  // S283 — a LIVE CENSUS: orchestrate.mjs rewrites this from the session locks
  // that exist right now, so shrinking IS the measurement, not damage. It halved
  // (19,273 → 8,665 bytes) purely because five sibling sessions ended between
  // renders: identical schema, every key present, sessions 11 → 6 and collisions
  // 17 → 4. Classified GENERATED rather than SHRINK_ALLOWED deliberately — the
  // JSON branch of isGeneratedWiped still catches the true wipe (an empty object,
  // or corrupt JSON), so this keeps the guard armed instead of blanket-exempting
  // a file. Declaring a false positive beats weakening the detector (D-S282.3).
  'portfolio/compiled/SESSION_ORCHESTRATOR.json',
  // S312 — a LIVE CENSUS of blocked tasks, rebuilt by build-blocker-dag.mjs from every
  // sibling TASK_BOARD on each run, so its size is a function of the current blocked
  // population rather than of accumulated content. It shrank hard this session for the
  // best possible reason: classifyStatus had been matching the literal status
  // `unblocked` against /block/, so 1126 of 1144 rows were never blocked at all. The
  // honest population is 18 and the artifact correctly followed it down. Classified
  // GENERATED rather than SHRINK_ALLOWED deliberately (D-S282.3): the JSON branch of
  // isGeneratedWiped still rejects an empty object, empty array or corrupt payload, so
  // a true wipe is still caught — declaring a false positive beats weakening the
  // detector.
  'portfolio/BLOCKER_DAG.json',
];

// Template-placeholder markers that signal an empty scaffold overwrote real
// content (the S107.2 wipe incident that motivated genius #237).
const PLACEHOLDER_RE = /(^|\n)\s*-\s*(active item:|Date:|systems:)\s*(\n|$)/i;

/**
 * isGeneratedWiped(content) — true iff a GENERATED artifact has been reduced to a
 * contentless / template-scaffold state. A valid regeneration (a `Generated:`
 * stamp plus at least one real `## ` heading or list item) is NOT a wipe, however
 * small. Used in place of the size-ratio test for GENERATED files.
 */
function isGeneratedWiped(content) {
  if (!content || !content.trim()) return true;               // empty == wiped
  // JSON sidecars (docs/AUDIT_<date>.json) match the GENERATED prefixes too, but
  // the markdown-shape heuristics below can never match valid JSON (S219 false
  // positive: a healthy 12-item sidecar read as "contentless"). Parseable JSON
  // with real keys/items is content; an empty object/array is a wipe.
  if (/^\s*[{[]/.test(content)) {
    try {
      const j = JSON.parse(content);
      const size = Array.isArray(j) ? j.length : Object.keys(j ?? {}).length;
      return size === 0;
    } catch { return true; }                                  // corrupt JSON == wiped
  }
  if (PLACEHOLDER_RE.test(content)) return true;              // template scaffold
  // S244: also accept hyphenated stamps (`<!-- generated-by: ... -->`, the v5
  // brief header) and status-row artifacts (context/SIGNALS.md is bare ✓/⚠/⛔
  // rows — rows ARE the content; no headings or list markers exist by design).
  const hasGenStamp = /generated[-\s]*(by|at|:)/i.test(content);
  // S363 — the status-row test above was written for "bare ✓/⚠/⛔ rows", but the
  // artifact it names is BOX-DRAWN: every row in context/SIGNALS.md begins with
  // `║  ✓  Tests …`, never with the glyph itself. So the pattern never matched, the
  // file carries no `generated-by` stamp either, and every regeneration classified
  // as contentless — including one measured at 110% of HEAD, i.e. a file that GREW.
  // A guard whose shape test does not match the shape it names cannot tell a wipe
  // from a refresh, and this one was blocking a legitimate closeout commit while
  // HEAD's copy sat five weeks stale.
  //
  // Allow an optional box-drawing / quote / whitespace prefix before the glyph. The
  // emptiness and placeholder tests above are untouched, so a genuinely blanked or
  // scaffolded file is still a wipe.
  const hasRealEntry = /^##\s+\S/m.test(content)
    || /^\s*[-*]\s+\S/m.test(content)
    || /^[\s║│|>]*[✓⚠⛔]\s+\S/mu.test(content);
  // Lost both its generator stamp AND any structured entry → contentless.
  return !hasGenStamp && !hasRealEntry;
}

// ── Proactive guard (called before writing) ──────────────────────────────────

/**
 * assertSafeWrite(filePath, newContent, opts?)
 *
 * Throws a descriptive Error if the write would:
 *   - reduce file length below `opts.threshold` (default WIPE_THRESHOLD)
 *   - violate monotonic growth on an append-only file
 *
 * @param {string} filePath   absolute path to the file about to be written
 * @param {string} newContent the content that WOULD be written
 * @param {{ threshold?: number, root?: string }} opts
 */
export function assertSafeWrite(filePath, newContent, opts = {}) {
  const { threshold = WIPE_THRESHOLD } = opts;
  if (!existsSync(filePath)) return; // new file — always safe

  const existing = readFileSync(filePath, 'utf8');
  if (existing.length === 0) return; // empty file — any write is fine

  // Normalise path separators for comparison
  const normPath = filePath.replace(/\\/g, '/');
  const isShrinkAllowed = SHRINK_ALLOWED.some(p => normPath.includes(p));
  if (isShrinkAllowed) return; // these files are permitted to shrink

  // GENERATED artifacts: a valid (even small) regeneration is fine; only an empty
  // template scaffold is a wipe. Use the content-shape check, not the size ratio.
  const isGenerated = GENERATED.some(p => normPath.includes(p));
  if (isGenerated) {
    if (isGeneratedWiped(newContent)) {
      throw new Error(
        `context-wipe-guard: ${filePath} would be reduced to an empty/template scaffold ` +
        `— possible accidental wipe of a generated artifact. Regenerate it via its generator.`,
      );
    }
    return; // valid regeneration of a generated file — never a wipe regardless of size
  }

  // Archive evidence is checked before ratio: relocation may legitimately be small.
  if (archivedAppendOnlyPreserved(existing, newContent, { filePath, root: opts.root })) return;

  // 1. Content reduction check
  const ratio = newContent.length / existing.length;
  if (ratio < threshold) {
    throw new Error(
      `context-wipe-guard: ${filePath} would shrink to ${(ratio * 100).toFixed(1)}% of current size ` +
      `(threshold ${(threshold * 100).toFixed(0)}%) — possible accidental wipe. ` +
      `Pass opts.threshold=0 to skip, but log the reason.`,
    );
  }

  // 2. Append-only preservation check (order-agnostic — prepend or append)
  const isAppendOnly = APPEND_ONLY.some(p => normPath.includes(p)) || ARCHIVED_RECORD.test(normPath.slice(normPath.lastIndexOf('/context/') + 1));
  if (isAppendOnly && !appendOnlyPreserved(existing, newContent)) {
    throw new Error(
      `context-wipe-guard: ${filePath} is append-only — every prior entry must be ` +
      `preserved (new content may prepend or append, but must not edit or delete ` +
      `existing entries). To intentionally rewrite an append-only file, get explicit ` +
      `founder approval first.`,
    );
  }
}

// ── Reactive guard (closeout pre-commit check) ───────────────────────────────

/**
 * checkContextFiles(root, opts?)
 *
 * Compares working-tree context/docs/logs files against their HEAD versions.
 * Returns { ok: boolean, findings: Array<{file, issue, ratio}> }.
 *
 * Does NOT throw — callers decide whether findings are blocking.
 *
 * @param {string} root       project root (where git repo lives)
 * @param {{ threshold?: number }} opts
 */
export function checkContextFiles(root, opts = {}) {
  const { threshold = WIPE_THRESHOLD } = opts;
  const findings = [];

  function gitShow(file) {
    const r = spawnSync('git', ['show', `HEAD:${file}`], {
      cwd: root, encoding: 'utf8', windowsHide: true,
    });
    if (r.status !== 0) return null; // untracked / new file — skip
    return r.stdout;
  }

  // Get the set of files that actually differ from HEAD — a file whose working-tree
  // content equals HEAD can never have ratio < 1.0, so checking it is pure waste.
  // On a 473-file repo this drops the git-show call count from ~473 to the handful
  // of files changed in the current session (typically ≤10). Falls back to the full
  // ls-files walk if diff itself fails (e.g., non-git or very early bootstrap).
  function getChangedFiles(dirs) {
    const r = spawnSync(
      'git', ['diff', '--name-only', 'HEAD', '--', ...dirs],
      { cwd: root, encoding: 'utf8', windowsHide: true },
    );
    if (r.status !== 0 || r.error) return null; // fall back to full walk
    return new Set(r.stdout.trim().split('\n').filter(Boolean));
  }

  // S263 — `portfolio/` was OUT of scope, so portfolio/SKILL_CATALOG.json was
  // never protected by this gate at all. The nightly out-of-session lane
  // overwrote it 27 skills -> 7 on four consecutive nights (29576e73, a92717a3,
  // d6cb27b3) because its cloud environment cannot see ~/.claude/skills, and a
  // local session restored it in between — a flip-flop nobody saw because
  // nothing compared the artifact against its own prior size. Portfolio holds
  // studio-wide source-of-truth indexes; it belongs under the same wipe rule as
  // context/ and docs/. Shared with the context meter (see the lib's own note).
  const CONTEXT_DIRS = STUDIO_STATE_DIRS;
  const changedFiles = getChangedFiles(CONTEXT_DIRS); // null = fallback

  // Check append-only files for prefix violation.
  // Only files that differ from HEAD need checking; unchanged files trivially pass.
  for (const relPath of APPEND_ONLY) {
    if (changedFiles && !changedFiles.has(relPath)) continue; // not changed → skip
    const absPath = join(root, relPath);
    if (!existsSync(absPath)) {
      if (gitShow(relPath) !== null) findings.push({ file: relPath, issue: 'append-only-deleted', ratio: 0 });
      continue;
    }
    const headContent = gitShow(relPath);
    if (headContent === null) continue; // new file
    const diskContent = readFileSync(absPath, 'utf8');

    if (archivedAppendOnlyPreserved(headContent, diskContent, { filePath: absPath, root })) continue;

    // Reduction check
    const ratio = diskContent.length / (headContent.length || 1);
    if (ratio < threshold) {
      findings.push({ file: relPath, issue: 'content-wipe', ratio });
    } else if (!appendOnlyPreserved(headContent, diskContent)) {
      // A prior entry was edited or deleted (order-agnostic; rolling-status block
      // is exempt because CANON-001 designs it to be overwritten each closeout).
      findings.push({ file: relPath, issue: 'append-only-violated', ratio });
    }
  }

  // A previously committed archive remains a protected record after relocation.
  for (const relPath of changedFiles || []) {
    if (!ARCHIVED_RECORD.test(relPath)) continue;
    const prior = gitShow(relPath);
    if (prior === null) continue;
    const absPath = join(root, relPath);
    if (!existsSync(absPath) || !appendOnlyPreserved(prior, readFileSync(absPath, 'utf8')))
      findings.push({ file: relPath, issue: 'archived-record-lost', ratio: 0 });
  }

  // Threshold check on non-shrink-allowed context files.
  // When changedFiles is available, skip the per-file git ls-files enumeration and
  // work directly from the diff output — far fewer subprocesses. Fall back to the
  // original full ls-files walk when the diff failed (non-git, bootstrap, etc.).
  if (changedFiles !== null) {
    // Only check files that are (a) in a context dir and (b) actually changed.
    for (const relPath of changedFiles) {
      if (APPEND_ONLY.some(p => relPath.includes(p))) continue; // already handled above
      if (SHRINK_ALLOWED.some(p => relPath.includes(p))) continue;
      const absPath = join(root, relPath);
      if (!existsSync(absPath)) continue;
      const headContent = gitShow(relPath);
      if (headContent === null || headContent.length < 200) continue;
      const diskContent = readFileSync(absPath, 'utf8');
      if (GENERATED.some(p => relPath.includes(p))) {
        if (isGeneratedWiped(diskContent)) {
          findings.push({ file: relPath, issue: 'content-wipe', ratio: diskContent.length / headContent.length });
        }
        continue;
      }
      const ratio = diskContent.length / headContent.length;
      if (ratio < threshold) {
        findings.push({ file: relPath, issue: 'content-wipe', ratio });
      }
    }
  } else {
    // Fallback: full enumeration (original behaviour — used only when git diff fails).
    for (const dir of CONTEXT_DIRS) {
      const dirPath = join(root, dir);
      if (!existsSync(dirPath)) continue;
      const lsRes = spawnSync('git', ['ls-files', dir], { cwd: root, encoding: 'utf8', windowsHide: true });
      if (lsRes.status !== 0) continue;
      const trackedFiles = lsRes.stdout.trim().split('\n').filter(Boolean);
      for (const relPath of trackedFiles) {
        if (APPEND_ONLY.some(p => relPath.includes(p.replace('/', '/')))) continue;
        if (SHRINK_ALLOWED.some(p => relPath.includes(p))) continue;
        const absPath = join(root, relPath);
        if (!existsSync(absPath)) continue;
        const headContent = gitShow(relPath);
        if (headContent === null || headContent.length < 200) continue;
        const diskContent = readFileSync(absPath, 'utf8');
        if (GENERATED.some(p => relPath.includes(p))) {
          if (isGeneratedWiped(diskContent)) {
            findings.push({ file: relPath, issue: 'content-wipe', ratio: diskContent.length / headContent.length });
          }
          continue;
        }
        const ratio = diskContent.length / headContent.length;
        if (ratio < threshold) {
          findings.push({ file: relPath, issue: 'content-wipe', ratio });
        }
      }
    }
  }

  return { ok: findings.length === 0, findings };
}

export { APPEND_ONLY, SHRINK_ALLOWED, GENERATED, WIPE_THRESHOLD, appendOnlyPreserved, stripRegenerable, normalizeEol, isGeneratedWiped };
