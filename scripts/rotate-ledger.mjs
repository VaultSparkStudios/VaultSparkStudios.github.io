#!/usr/bin/env node
/**
 * rotate-ledger.mjs — S275 (audit #8): generalize the rotate-taskboard pattern.
 *
 * Only TASK_BOARD.md had a rotation/size gate; the other append-only ledgers
 * grew unbounded (SELF_IMPROVEMENT_LOOP 791KB · HANDOFF_ARCHIVE 680KB ·
 * WORK_LOG 528KB · TASK_BOARD_ARCHIVE 477KB · DECISIONS 408KB). Every
 * closeout/handoff read paid that token tax. This rotates each ledger's oldest
 * content into quarter-stamped archive shards — nothing is ever deleted, and
 * the append-only contract holds because archived blocks move verbatim.
 *
 * Two ledger shapes:
 *   dated  — `## YYYY-MM-DD …` blocks, newest-first (SIL, WORK_LOG, DECISIONS).
 *            Oldest dated blocks move to context/archive/<TAG>_<YYYY>Q<q>.md.
 *            Undated `##` blocks (Rolling Status header, prose sections) and
 *            the preamble NEVER move.
 *   shard  — already-an-archive files (HANDOFF_ARCHIVE, TASK_BOARD_ARCHIVE).
 *            When over cap, the oldest OVERFLOW bytes split at a `## ` boundary
 *            into <file>.shard<N>.md verbatim.
 *
 * Usage:
 *   node scripts/rotate-ledger.mjs --check-size   # gate: exit 1 if any ledger over cap
 *   node scripts/rotate-ledger.mjs --dry-run      # report what would move
 *   node scripts/rotate-ledger.mjs --apply        # rotate
 *   node scripts/rotate-ledger.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const MANIFEST = [
  { file: 'context/SELF_IMPROVEMENT_LOOP.md', tag: 'SIL', kind: 'dated', capKB: 300, keepRecent: 12 },
  { file: 'logs/WORK_LOG.md', tag: 'WORK_LOG', kind: 'dated', capKB: 250, keepRecent: 12 },
  { file: 'context/DECISIONS.md', tag: 'DECISIONS', kind: 'dated', capKB: 250, keepRecent: 20 },
  { file: 'context/HANDOFF_ARCHIVE.md', tag: 'HANDOFF_ARCHIVE', kind: 'shard', capKB: 400 },
  { file: 'context/archive/TASK_BOARD_ARCHIVE.md', tag: 'TASK_BOARD_ARCHIVE', kind: 'shard', capKB: 400 },
];
const ARCHIVE_DIR = path.join(ROOT, 'context', 'archive');
const ROTATE_TO = 0.6; // rotate down to 60% of cap so the gate has headroom

const argv = process.argv.slice(2);
const CHECK = argv.includes('--check-size');
const DRY = argv.includes('--dry-run');
const APPLY = argv.includes('--apply');
const SELF_TEST = argv.includes('--self-test');

const DATE_HEADER = /^## (\d{4})-(\d{2})-(\d{2})/;

// Split text into { preamble, blocks:[{header, lines, date|null}] } on `## ` headers.
export function parseBlocks(text) {
  const lines = text.split('\n');
  const preamble = [];
  const blocks = [];
  let cur = null;
  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (cur) blocks.push(cur);
      const m = line.match(DATE_HEADER);
      cur = { header: line, lines: [line], date: m ? `${m[1]}-${m[2]}-${m[3]}` : null };
    } else if (cur) {
      cur.lines.push(line);
    } else {
      preamble.push(line);
    }
  }
  if (cur) blocks.push(cur);
  return { preamble, blocks };
}

export function quarterOf(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  return `${y}Q${Math.ceil(m / 3)}`;
}

// Plan a dated rotation: move oldest dated blocks (keeping keepRecent newest
// dated + every undated block) until the kept text fits targetBytes.
export const HARD_FLOOR = 4; // never rotate below this many dated blocks, cap or not

export function planDatedRotation(text, { targetBytes, keepRecent }) {
  const { preamble, blocks } = parseBlocks(text);
  const dated = blocks.filter((b) => b.date).sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first
  const moved = [];
  let keep = new Set(blocks);
  const sizeOf = () => [...preamble, ...blocks.filter((b) => keep.has(b)).flatMap((b) => b.lines)].join('\n').length;
  // candidates oldest-first, beyond the keepRecent newest
  const candidates = dated.slice(keepRecent).reverse();
  for (const b of candidates) {
    if (sizeOf() <= targetBytes) break;
    keep.delete(b);
    moved.push(b);
  }
  // S343 - LATENT, not observed: still over cap with only the preferred-recent blocks
  // left, eat into them oldest-first down to HARD_FLOOR. `keepRecent` was an ABSOLUTE
  // floor, so a ledger whose retained blocks ALONE exceed the cap could never be rotated
  // under it: --apply would move what it was allowed to, stall over cap, and then report
  // `0 ledger(s) rotated` on every rerun while the gate kept naming that same command as
  // the fix. That state is reachable by growth alone - entries get longer, the constant
  // does not - and it has not happened yet (SIL cleared its cap on the first pass; a
  // KB/1000-vs-1024 misread on my part is what sent me looking). Guarding it now because
  // the failure mode reads as operator error rather than as a defect. The hard cap wins
  // and the yield is REPORTED, never silent. Nothing is lost either way: rotated blocks
  // are appended to the quarterly archive, not deleted.
  let floorYielded = false;
  if (sizeOf() > targetBytes) {
    const protectedOldestFirst = dated.slice(0, keepRecent).reverse();
    for (const b of protectedOldestFirst) {
      if (dated.filter((d) => keep.has(d)).length <= HARD_FLOOR) break;
      if (sizeOf() <= targetBytes) break;
      keep.delete(b);
      moved.push(b);
      floorYielded = true;
    }
  }
  const keptText = [...preamble, ...blocks.filter((b) => keep.has(b)).flatMap((b) => b.lines)].join('\n');
  return { keptText, moved, floorYielded, overCap: sizeOf() > targetBytes };
}

function selfTest() {
  let pass = 0, fail = 0;
  const ok = (c, l) => { if (c) pass++; else { fail++; console.error(`  ✗ ${l}`); } };

  const mk = (n, d) => `## ${d} — Session ${n}\n${'x'.repeat(200)}\n`;
  const text = `# Ledger\nintro\n\n## Rolling Status (auto-updated)\nheader-stuff\n\n` +
    mk(3, '2026-07-10') + mk(2, '2026-05-01') + mk(1, '2026-01-15');

  const { preamble, blocks } = parseBlocks(text);
  ok(preamble.join('\n').includes('# Ledger'), 'preamble preserved');
  ok(blocks.length === 4, 'four ## blocks parsed');
  ok(blocks.filter((b) => b.date).length === 3, 'three dated blocks');

  const plan = planDatedRotation(text, { targetBytes: 500, keepRecent: 1 });
  ok(plan.moved.length >= 1, 'oldest block(s) rotated when over target');
  ok(plan.moved.every((b) => b.date !== '2026-07-10'), 'newest dated block never moves');
  ok(plan.keptText.includes('Rolling Status'), 'undated header block never moves');
  ok(plan.moved[0].date === '2026-01-15', 'oldest moves first');
  ok(quarterOf('2026-01-15') === '2026Q1' && quarterOf('2026-07-10') === '2026Q3', 'quarter mapping');

  // no-op when under target
  const small = planDatedRotation(text, { targetBytes: 10_000_000, keepRecent: 1 });
  ok(small.moved.length === 0, 'under-cap ledger untouched');

  // S343 — the historical bug: keepRecent was an ABSOLUTE floor, so a ledger whose
  // retained blocks alone exceeded the cap could never be rotated under it. --apply
  // moved what it could, stalled over cap, then reported `0 rotated` forever while the
  // gate kept failing and naming that same command as the fix.
  const many = `# Ledger
intro

` +
    Array.from({ length: 12 }, (_, i) => mk(12 - i, `2026-0${(i % 9) + 1}-1${i % 10}`)).join('');
  const squeezed = planDatedRotation(many, { targetBytes: 1400, keepRecent: 12 });
  ok(squeezed.moved.length > 0, 'THE HISTORICAL BUG IS CAUGHT: cap wins over keepRecent');
  ok(squeezed.floorYielded === true, 'yielding the retention floor is reported, not silent');
  ok(!squeezed.overCap, 'the named repair actually clears the cap it is prescribed for');

  // the floor is hard: never rotate below HARD_FLOOR even for an impossible target
  const crushed = planDatedRotation(many, { targetBytes: 1, keepRecent: 12 });
  const keptDated = (crushed.keptText.match(/^## \d{4}-/gm) || []).length;
  ok(keptDated === HARD_FLOOR, `HARD_FLOOR respected (kept ${keptDated}, want ${HARD_FLOOR})`);
  ok(crushed.overCap === true, 'an unreachable target is reported over-cap, not faked green');

  // a ledger already inside its cap must not yield the floor at all
  const roomy = planDatedRotation(many, { targetBytes: 10_000_000, keepRecent: 12 });
  ok(roomy.floorYielded === false && roomy.moved.length === 0, 'no yield when the cap is satisfied');

  console.log(`rotate-ledger --self-test: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

function run() {
  if (SELF_TEST) return selfTest();
  let over = 0, rotated = 0;
  for (const entry of MANIFEST) {
    const full = path.join(ROOT, entry.file);
    if (!fs.existsSync(full)) continue;
    const size = fs.statSync(full).size;
    const cap = entry.capKB * 1024;
    if (CHECK) {
      if (size > cap) {
        console.error(`  ⛔ ${entry.file}: ${(size / 1024).toFixed(0)}KB > ${entry.capKB}KB cap — run node scripts/rotate-ledger.mjs --apply`);
        over++;
      }
      continue;
    }
    if (size <= cap) continue;
    const text = fs.readFileSync(full, 'utf8');
    if (entry.kind === 'dated') {
      const plan = planDatedRotation(text, { targetBytes: cap * ROTATE_TO, keepRecent: entry.keepRecent });
      if (!plan.moved.length) continue;
      // group moved blocks by quarter, oldest shards first
      const byQuarter = new Map();
      for (const b of plan.moved) {
        const q = quarterOf(b.date);
        if (!byQuarter.has(q)) byQuarter.set(q, []);
        byQuarter.get(q).push(b);
      }
      console.log(`${DRY ? '[dry-run] ' : ''}${entry.file}: rotating ${plan.moved.length} block(s) → ${[...byQuarter.keys()].join(', ')}`);
      if (DRY) continue;
      fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
      for (const [q, blocksInQ] of byQuarter) {
        const shard = path.join(ARCHIVE_DIR, `${entry.tag}_${q}.md`);
        const marker = `\n<!-- rotated-from: ${entry.file} · ${new Date().toISOString().slice(0, 10)} -->\n`;
        // within a quarter keep chronological order (oldest first)
        const body = blocksInQ.sort((a, b2) => (a.date < b2.date ? -1 : 1)).flatMap((b) => b.lines).join('\n');
        fs.appendFileSync(shard, (fs.existsSync(shard) ? '' : `# ${entry.tag} archive — ${q}\n`) + marker + body + '\n');
      }
      fs.writeFileSync(full, plan.keptText);
      rotated++;
    } else {
      // shard: split oldest overflow at a `## ` boundary into <file>.shardN.md
      const target = Math.floor(cap * ROTATE_TO);
      const overflow = size - target;
      let cut = text.indexOf('\n## ', overflow);
      if (cut === -1) { console.warn(`  ⚠ ${entry.file}: no block boundary after overflow point — skipped`); continue; }
      cut += 1; // keep the newline with the head shard
      let n = 1;
      while (fs.existsSync(`${full}.shard${n}.md`)) n++;
      console.log(`${DRY ? '[dry-run] ' : ''}${entry.file}: sharding oldest ${(cut / 1024).toFixed(0)}KB → ${path.basename(full)}.shard${n}.md`);
      if (DRY) continue;
      fs.writeFileSync(`${full}.shard${n}.md`, `<!-- sharded-from: ${entry.file} · ${new Date().toISOString().slice(0, 10)} · oldest content, verbatim -->\n` + text.slice(0, cut));
      fs.writeFileSync(full, text.slice(cut));
      rotated++;
    }
  }
  if (CHECK) {
    if (over) process.exit(1);
    console.log('rotate-ledger --check-size: ✓ all ledgers under cap');
    return;
  }
  console.log(`rotate-ledger: ${rotated} ledger(s) rotated${DRY ? ' (dry-run)' : ''}`);
}

run();
