import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from '../scripts/lib/safe-spawn.mjs';
import { recordArtCommitReceipt } from '../scripts/desk-art-autopilot.mjs';
import { readRoutineReceipts, routineReceiptCoversCommit } from '../scripts/lib/routine-session-receipt.mjs';
import { readCommits, evaluateWriteBackCurrency } from '../scripts/check-writeback-currency.mjs';
import { newsPageMatches } from '../scripts/lib/news-page-comparison.mjs';

test('persona shell indentation never conceals content changes or other artifact drift', () => {
  const original = '<header>\n  <a href="/news/" class="brand">The Desk</a>\n</header>';
  const indented = '<header>\n    <a href="/news/" class="brand">The Desk</a>  \n</header>';
  const route = 'news/personas/rex/index.html';
  assert.equal(newsPageMatches(original, indented, route), true);
  assert.equal(newsPageMatches(original, indented, 'news/personas/rex/page/2/index.html'), true);
  for (const changed of [original.replace('The Desk', 'Other Desk'), original.replace('/news/', '/games/'), original.replace('brand', 'different'), original.replace('The Desk', 'The  Desk')]) {
    assert.equal(newsPageMatches(original, changed, route), false);
  }
  for (const other of ['news/index.html', 'news/personas/index.html', 'news/personas/rex/data.json', 'news/personas/rex/admin/index.html']) {
    assert.equal(newsPageMatches(original, indented, other), false);
  }
});

test('Desk maintenance receipt binds exact source commit and files without a deploy claim', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'desk-receipt-'));
  const sha = 'a'.repeat(40);
  const files = ['assets/og/news/art.webp', 'news/story/index.html'];
  const runGit = (...args) => ({ status: 0, out: args[0] === 'rev-parse' ? sha : files.join('\n') });
  try {
    const options = { root, runGit, startedAt: '2026-10-09T00:00:00Z', completedAt: '2026-10-09T00:01:00Z' };
    assert.equal(recordArtCommitReceipt(options).appended, true);
    assert.equal(recordArtCommitReceipt(options).duplicate, true);
    const { rows } = readRoutineReceipts(root);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].writeBackDisposition, 'maintenance-recorded');
    assert.equal(routineReceiptCoversCommit(rows[0], { sha, files }), true);
    const sourceCommit = { sha, files, subject: 'chore(routine-desk-art): auto-reviewed art', isoDate: '2026-10-09T00:01:00Z' };
    const anchor = { sha: 'c'.repeat(40), files: ['context/SELF_IMPROVEMENT_LOOP.md'], subject: 'chore(S370): closeout', isoDate: '2026-10-08T00:00:00Z' };
    const evaluate = (routineReceipts) => evaluateWriteBackCurrency({ commits: [sourceCommit, anchor], routineReceipts });
    assert.equal(evaluate(rows).debtCount, 0);
    assert.equal(evaluate([]).debtCount, 1);
    assert.equal(evaluate([{ ...rows[0], changedPaths: ['news/wrong.html'], producedArtifacts: [] }]).debtCount, 1);
    assert.equal(routineReceiptCoversCommit(rows[0], { sha: 'b'.repeat(40), files }), false);
    assert.equal(routineReceiptCoversCommit(rows[0], { sha, files: [...files, 'scripts/change.mjs'] }), false);
    assert.throws(() => recordArtCommitReceipt({ ...options, runGit: () => ({ status: 1, out: '' }) }), /cannot bind/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('closeout history stays measured after more than 60 automation commits', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'closeout-history-'));
  const git = (args, input) => {
    const result = spawnSync('git', args, { cwd: root, input, encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  };
  try {
    git(['init', '-q']);
    let stream = '';
    const commit = (mark, email, subject, file) => {
      stream += `commit refs/heads/main\nmark :${mark}\ncommitter Person <${email}> ${1750000000 + mark} +0000\ndata ${Buffer.byteLength(subject)}\n${subject}\n`;
      if (mark > 1) stream += `from :${mark - 1}\n`;
      if (file) stream += `M 100644 inline ${file}\ndata 1\nx\n`;
      stream += '\n';
    };
    commit(1, 'person@example.test', 'chore: foundation', 'README.md');
    commit(2, 'person@example.test', 'chore(S370): closeout', 'context/SELF_IMPROVEMENT_LOOP.md');
    commit(3, 'person@example.test', 'feat: unrecorded outcome', 'assets/outcome.txt');
    for (let n = 4; n <= 71; n++) commit(n, 'github-actions[bot]@users.noreply.github.com', 'chore: refresh', 'api/data.json');
    git(['fast-import', '--quiet'], stream);
    git(['symbolic-ref', 'HEAD', 'refs/heads/main']);
    const commits = readCommits(root);
    assert.equal(commits.length, 70);
    const result = evaluateWriteBackCurrency({ commits, now: Date.parse('2026-10-09T00:00:00Z') });
    assert.equal(result.unmeasured, false);
    assert.equal(result.debtCount, 1);
    assert.equal(result.ok, false);
    const clean = evaluateWriteBackCurrency({ commits: commits.filter((c) => c.subject !== 'feat: unrecorded outcome') });
    assert.equal(clean.ok, true);
    assert.equal(clean.unmeasured, false);
    assert.equal(evaluateWriteBackCurrency({ commits: readCommits(root, 60) }).ok, false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('OG publisher accepts only main and checks out writable full-history main', () => {
  const text = fs.readFileSync(new URL('../.github/workflows/og-images.yml', import.meta.url), 'utf8');
  assert.match(text, /push:\s+branches: \[main\]/);
  assert.match(text, /if: github.ref == 'refs\/heads\/main'/);
  assert.match(text, /checkout@v4\s+with:\s+ref: main\s+fetch-depth: 0/);
});
