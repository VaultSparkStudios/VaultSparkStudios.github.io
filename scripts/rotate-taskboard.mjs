#!/usr/bin/env node
/**
 * rotate-taskboard.mjs (S178 · taskboard-archive-rotation)
 *
 * context/TASK_BOARD.md had grown to ~365KB — fifteen-plus sessions of completed
 * Done blocks burying the live Now/Next signal, and every on-demand read of the
 * board paid that token tax. This rotates stale `## Done (Session N)` / `## Now
 * (Session N)` blocks into context/archive/TASK_BOARD_ARCHIVE.md, keeping the
 * three most-recent sessions inline so the live board stays lean.
 *
 * Conservative by design: only Done/Now session blocks older than the kept window
 * move; the preamble and any non-session `##` blocks stay. Nothing is deleted —
 * archived blocks are appended verbatim under a dated rotation marker.
 *
 * Usage:
 *   node scripts/rotate-taskboard.mjs               # rotate (writes board + archive)
 *   node scripts/rotate-taskboard.mjs --dry-run      # report what would move
 *   node scripts/rotate-taskboard.mjs --check-size    # advisory: warn if board > 80KB
 *   node scripts/rotate-taskboard.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BOARD = path.join(ROOT, 'context', 'TASK_BOARD.md');
const ARCHIVE = path.join(ROOT, 'context', 'archive', 'TASK_BOARD_ARCHIVE.md');
const KEEP_RECENT = 3;     // most-recent distinct session numbers kept inline
const SIZE_WARN_BYTES = 220 * 1024; // secondary tripwire; the session-window drift check is primary

const SESSION_HEADER = /^## (?:Done|Now) \(Session (\d+)/;

// Split into a preamble + an ordered list of `##` blocks. Each block runs from
// its `##` header up to (not including) the next `##` line.
export function parseBlocks(text) {
  const lines = text.split('\n');
  const preamble = [];
  const blocks = [];
  let cur = null;
  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (cur) blocks.push(cur);
      const m = line.match(SESSION_HEADER);
      cur = { header: line, session: m ? parseInt(m[1], 10) : null, lines: [line] };
    } else if (cur) {
      cur.lines.push(line);
    } else {
      preamble.push(line);
    }
  }
  if (cur) blocks.push(cur);
  return { preamble, blocks };
}

// S183 (#12 TASKBOARD-AUTO-CONSOLIDATOR) — reclassify stale active-intent
// headings to historical form, preserving content. The live runway is ALWAYS
// session-tagged (`## Now (Session 182 runway)`), so a BARE `## Now`/`## Next`/
// `## Runway` heading is definitionally a leftover from an older session that
// still reads as "current" and muddies the live signal (the board had three
// such bare `## Now` blocks from sessions 95–98). This renames only those exact
// bare headings — never a session-tagged or standing section (Human Action
// Required, Founder Action), and never touches the content beneath them.
const BARE_ACTIVE_HEADING = /^## (Now|Next|Runway)\s*$/;

export function consolidateHeadings(text) {
  let renamed = 0;
  const out = text.split('\n').map((line) => {
    const m = line.match(BARE_ACTIVE_HEADING);
    if (m) { renamed += 1; return `## ${m[1]} (historical)`; }
    return line;
  }).join('\n');
  return { text: out, renamed };
}

export function rotate(text, keepRecent = KEEP_RECENT) {
  const { preamble, blocks } = parseBlocks(text);
  const sessions = [...new Set(blocks.map((b) => b.session).filter((s) => s != null))].sort((a, b) => b - a);
  if (sessions.length <= keepRecent) {
    return { kept: text, archived: '', threshold: null, movedCount: 0, sessions };
  }
  const threshold = sessions[keepRecent - 1]; // keep sessions >= threshold
  const keptBlocks = [];
  const archivedBlocks = [];
  for (const b of blocks) {
    // Only session-tagged Done/Now blocks are eligible to move; keep everything else.
    if (b.session != null && b.session < threshold) archivedBlocks.push(b);
    else keptBlocks.push(b);
  }
  const kept = [preamble.join('\n').replace(/\n+$/, ''), '', ...keptBlocks.map((b) => b.lines.join('\n').replace(/\n+$/, ''))]
    .join('\n').replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '') + '\n';
  const archived = archivedBlocks.map((b) => b.lines.join('\n').replace(/\n+$/, '')).join('\n\n');
  return { kept, archived, threshold, movedCount: archivedBlocks.length, sessions };
}

function selfTest() {
  const sample = [
    '# Task Board', '', 'Last updated: x', '',
    '## Now (Session 10 runway)', '- [ ] a', '',
    '## Done (Session 10 — x)', '- [x] d10', '',
    '## Done (Session 9 — x)', '- [x] d9', '',
    '## Done (Session 8 — x)', '- [x] d8', '',
    '## Done (Session 7 — x)', '- [x] d7', '',
    '## Reference (not a session)', '- keep me', '',
  ].join('\n');
  const r = rotate(sample, 3);
  const cases = [
    ['keeps preamble', r.kept.startsWith('# Task Board')],
    ['threshold is 3rd-newest session (8)', r.threshold === 8],
    ['moves sessions below threshold', r.movedCount === 1],
    ['keeps session 10/9/8 inline', /Session 10/.test(r.kept) && /Session 9/.test(r.kept) && /Session 8/.test(r.kept)],
    ['archives session 7', /Session 7/.test(r.archived) && !/Session 7/.test(r.kept)],
    ['keeps non-session block inline', /Reference \(not a session\)/.test(r.kept)],
    ['no-op when few sessions', rotate('## Done (Session 1 — x)\n- a\n', 3).movedCount === 0],
    // S183 (#12) — consolidateHeadings reclassifies bare active headings only.
    ['consolidate renames a bare ## Now', consolidateHeadings('## Now\n- x\n').text.startsWith('## Now (historical)')],
    ['consolidate renames bare ## Next / ## Runway', (() => { const r = consolidateHeadings('## Next\n## Runway\n'); return r.renamed === 2 && /## Next \(historical\)/.test(r.text) && /## Runway \(historical\)/.test(r.text); })()],
    ['consolidate leaves session-tagged ## Now (Session N runway) alone', consolidateHeadings('## Now (Session 182 runway)\n- x\n').renamed === 0],
    ['consolidate leaves standing sections alone', consolidateHeadings('## Human Action Required\n## Founder Action\n').renamed === 0],
    ['consolidate preserves content beneath', consolidateHeadings('## Now\n- keep me\n').text.includes('- keep me')],
    ['consolidate is idempotent', (() => { const a = consolidateHeadings('## Now\n').text; return consolidateHeadings(a).renamed === 0; })()],
  ];
  let pass = 0;
  for (const [name, ok] of cases) { if (ok) pass += 1; else console.error(`  ✗ ${name}`); }
  console.log(`rotate-taskboard --self-test: ${pass}/${cases.length} passing`);
  process.exit(pass === cases.length ? 0 : 1);
}

// Importable: CLI dispatches + the destructive rotation only run when executed
// directly, so other tools can `import { rotate, parseBlocks }` without mutating
// the real board. Node 24 exposes import.meta.main.
const RUN_DIRECT = import.meta.main ?? process.argv[1]?.endsWith('rotate-taskboard.mjs');

if (RUN_DIRECT && process.argv.includes('--self-test')) selfTest();

if (RUN_DIRECT && process.argv.includes('--apply')) {
  // Reclassify stale bare active-intent headings to historical form (S183 #12).
  // Content-preserving and idempotent; --dry-run reports without writing.
  const text = fs.readFileSync(BOARD, 'utf8');
  const { text: next, renamed } = consolidateHeadings(text);
  if (!renamed) {
    console.log('rotate-taskboard --apply: no stale bare active headings to consolidate.');
    process.exit(0);
  }
  if (process.argv.includes('--dry-run')) {
    console.log(`rotate-taskboard --apply --dry-run: would reclassify ${renamed} bare active heading(s) → historical.`);
    process.exit(0);
  }
  fs.writeFileSync(BOARD, next);
  console.log(`rotate-taskboard --apply: reclassified ${renamed} bare active heading(s) → historical (content preserved).`);
  process.exit(0);
}

if (RUN_DIRECT && process.argv.includes('--check-size')) {
  // True drift signal: stale sessions accumulating inline (independent of how
  // verbose any one session is). Raw bytes is the secondary tripwire.
  let bytes = 0, moved = 0;
  try { bytes = fs.statSync(BOARD).size; } catch { /* missing */ }
  try { moved = rotate(fs.readFileSync(BOARD, 'utf8')).movedCount; } catch { /* missing */ }
  const kb = (bytes / 1024).toFixed(0);
  if (moved > 0 || bytes > SIZE_WARN_BYTES) {
    console.warn(`rotate-taskboard --check-size: ⚠ TASK_BOARD.md is ${kb}KB with ${moved} rotatable block(s) past the ${KEEP_RECENT}-session window — run \`node scripts/rotate-taskboard.mjs\`.`);
  } else {
    console.log(`rotate-taskboard --check-size: ok (${kb}KB · within ${KEEP_RECENT}-session window)`);
  }
  process.exit(0); // advisory only — never blocks the build
}

if (!RUN_DIRECT) { /* imported as a library — no side effects */ }
else {
const text = fs.readFileSync(BOARD, 'utf8');
const { kept, archived, threshold, movedCount, sessions } = rotate(text);
if (!movedCount) {
  console.log(`rotate-taskboard: nothing to rotate (${sessions.length} session(s), keeping ${KEEP_RECENT}).`);
  process.exit(0);
}
const beforeKb = (Buffer.byteLength(text) / 1024).toFixed(0);
const afterKb = (Buffer.byteLength(kept) / 1024).toFixed(0);
if (process.argv.includes('--dry-run')) {
  console.log(`rotate-taskboard --dry-run: would move ${movedCount} block(s) (sessions < ${threshold}); board ${beforeKb}KB → ${afterKb}KB.`);
  process.exit(0);
}
fs.mkdirSync(path.dirname(ARCHIVE), { recursive: true });
const header = fs.existsSync(ARCHIVE) ? '' : '# Task Board — Archive\n\nRotated-out Done/Now session blocks. Newest rotations appended at the bottom. Verbatim; nothing deleted.\n';
const marker = `\n\n<!-- rotated ${new Date().toISOString().slice(0, 10)} · sessions < ${threshold} · ${movedCount} block(s) -->\n\n`;
fs.appendFileSync(ARCHIVE, header + marker + archived + '\n');
fs.writeFileSync(BOARD, kept);
console.log(`rotate-taskboard: moved ${movedCount} block(s) (sessions < ${threshold}) → context/archive/TASK_BOARD_ARCHIVE.md`);
console.log(`  board ${beforeKb}KB → ${afterKb}KB`);
}
