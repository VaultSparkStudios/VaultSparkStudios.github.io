import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from '../scripts/lib/safe-spawn.mjs';
import { dateFromHeader, parseBlocks, planDatedRotation, HARD_FLOOR } from '../scripts/rotate-ledger.mjs';

test('only valid explicit dates in dated or session headings are eligible', () => {
  for (const h of ['2026-10-25 — S403', 'Session 403 — 2026-10-25', 'Session388 — 2026-10-25', 'S403 release — 2026-10-25', 'Session 134B — addendum (2026-10-25)']) {
    assert.equal(dateFromHeader(`## ${h}`), '2026-10-25', h);
  }
  for (const h of ['Rolling Status 2026-10-25', 'Scoring rubric', 'Entries', 'S396 — undated', 'Session 1 — 2026-02-30', '2026-13-01', '2026-01-011', '2026-01-01x', 'Sessional 1 — 2026-10-25']) {
    assert.equal(dateFromHeader(`## ${h}`), null, h);
  }
});

test('same-day histories retain highest sessions regardless of source ordering', () => {
  for (const order of [[6,5,4,3,2,1], [1,2,3,4,5,6]]) {
    const source = '# Ledger\n' + order.map(n => `## Session ${n} — 2026-10-25\n${'x'.repeat(200)}\n`).join('');
    const plan = planDatedRotation(source, {targetBytes:1000,keepRecent:4});
    assert.deepEqual(plan.moved.map(b => b.header), ['## Session 1 — 2026-10-25','## Session 2 — 2026-10-25']);
    for (const n of [3,4,5,6]) assert.ok(plan.keptText.includes(`## Session ${n} —`));
  }
  const addenda = '# Ledger\n## Session 6 — 2026-10-25\nfirst\n## Session 6 addendum — 2026-10-25\nsecond\n';
  assert.equal(planDatedRotation(addenda,{targetBytes:10000,keepRecent:4}).keptText, addenda);
});

test('mixed chronology and Unicode retention obey byte budget and hard floor', () => {
  const source = '# Ledger\n\n## Rolling Status\nkeep\n' + [4, 1, 6, 2, 5, 3].map(i => `## ${i % 2 ? 'Session' + i + ' — 2026-01-0' + i : '2026-01-0' + i + ' — S' + i}\n${'🔥界'.repeat(30)}\n`).join('');
  const { blocks } = parseBlocks(source);
  const result = planDatedRotation(source, { targetBytes: 1100, keepRecent: 4 });
  assert.deepEqual(result.moved.map(b => b.date), ['2026-01-01', '2026-01-02']);
  assert.ok(Buffer.byteLength(result.keptText) <= 1100);
  assert.equal(result.overCap, false);
  assert.ok(result.keptText.includes('## Rolling Status\nkeep'));
  for (const b of blocks) assert.ok(result.moved.some(m => m.lines.join('\n') === b.lines.join('\n')) || result.keptText.includes(b.lines.join('\n')));
  const impossible = planDatedRotation(source, { targetBytes: 1, keepRecent: 6 });
  assert.equal(parseBlocks(impossible.keptText).blocks.filter(b => b.date).length, HARD_FLOOR);
  assert.equal(impossible.overCap, true);
});

test('actual apply archives exact CRLF preimage and every removed section, then is idempotent', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vss-ledger-'));
  try {
    fs.mkdirSync(path.join(root, 'scripts'));
    fs.mkdirSync(path.join(root, 'context'));
    fs.copyFileSync('scripts/rotate-ledger.mjs', path.join(root, 'scripts/rotate-ledger.mjs'));
    const source = '# Ledger\r\n\r\n## Rolling Status\r\nmetadata\r\n' + Array.from({length: 30}, (_, i) => `## Session ${i + 1} — 2026-01-${String(i + 1).padStart(2, '0')}\r\n${'🔥界'.repeat(1800)}\r\n`).join('');
    const file = path.join(root, 'context/SELF_IMPROVEMENT_LOOP.md');
    fs.writeFileSync(file, source);
    const run = flag => execFileSync(process.execPath, [path.join(root, 'scripts/rotate-ledger.mjs'), flag], {encoding:'utf8', windowsHide:true, stdio:['ignore','pipe','pipe']});
    assert.match(run('--dry-run'), /dry-run/);
    assert.equal(fs.readFileSync(file, 'utf8'), source);
    assert.equal(fs.existsSync(path.join(root, 'context/archive')), false);
    const digest = crypto.createHash('sha256').update(source).digest('hex');
    const archive = path.join(root, 'context/archive');
    fs.mkdirSync(archive);
    const snapshot = path.join(archive, `SIL_preimage_${digest}.md`);
    fs.writeFileSync(snapshot, 'conflicting content');
    assert.throws(() => run('--apply'), /preimage archive conflict/);
    assert.equal(fs.readFileSync(file, 'utf8'), source);
    fs.unlinkSync(snapshot);
    assert.match(run('--apply'), /1 ledger\(s\) rotated/);
    assert.deepEqual(fs.readFileSync(snapshot), Buffer.from(source));
    const hot = fs.readFileSync(file, 'utf8');
    const cold = fs.readFileSync(path.join(archive, 'SIL_2026Q1.md'), 'utf8');
    assert.ok(Buffer.byteLength(hot) <= 300 * 1024 * 0.6);
    const sections = parseBlocks(source).blocks;
    for (const section of sections) {
      const bytes = section.lines.join('\n');
      assert.ok(hot.includes(bytes) || cold.includes(bytes), section.header);
    }
    assert.match(run('--check-size'), /all ledgers under cap/);
    const before = fs.readdirSync(archive).map(p => [p, fs.readFileSync(path.join(archive,p)).toString('hex')]);
    assert.match(run('--apply'), /0 ledger\(s\) rotated/);
    assert.equal(fs.readFileSync(file, 'utf8'), hot);
    assert.deepEqual(fs.readdirSync(archive).map(p => [p,fs.readFileSync(path.join(archive,p)).toString('hex')]), before);
  } finally { fs.rmSync(root, {recursive:true,force:true}); }
});
