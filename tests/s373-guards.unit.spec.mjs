import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from '../scripts/lib/safe-spawn.mjs';
import { findLatestAuditSidecar, sidecarKeyFor, writeAuditSidecar, readAuditSidecar } from '../scripts/lib/audit-sidecar.mjs';
import { scanCommitMessage } from '../scripts/pre-push-scan.mjs';
import { summarize, meets, laneFor, isServedCandidate } from '../scripts/check-served-parity.mjs';
import { publicDataAnchorFindings, classifyPath } from '../scripts/check-content-hotfix-gate.mjs';

// S373 guards for defects that actually happened in S372. Each test names the incident.
const ROOT = path.resolve(import.meta.dirname, '..');

function tempRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vss-s373-'));
  fs.mkdirSync(path.join(dir, 'docs'));
  return dir;
}

test('audit sidecar: a second session on one date gets its own file and cannot overwrite the first', () => {
  const repo = tempRepo();
  try {
    writeAuditSidecar(repo, '2026-10-09', { session: 371, items: [] });
    assert.equal(sidecarKeyFor(repo, '2026-10-09', 371), '2026-10-09', 'the owning session keeps the plain date');
    assert.equal(sidecarKeyFor(repo, '2026-10-09', 372), '2026-10-09-S372');
    assert.throws(() => writeAuditSidecar(repo, '2026-10-09', { session: 372, items: [] }), /refusing to overwrite/);
    assert.equal(readAuditSidecar(repo, '2026-10-09').session, 371, 'the first session’s audit is intact');
    writeAuditSidecar(repo, sidecarKeyFor(repo, '2026-10-09', 372), { session: 372, items: [] });
    assert.equal(readAuditSidecar(repo, '2026-10-09-S372').session, 372);
  } finally { fs.rmSync(repo, { recursive: true, force: true }); }
});

test('audit sidecar: the finder returns the session-suffixed file as latest, ordered by session number', () => {
  const repo = tempRepo();
  try {
    for (const [key, session] of [['2026-10-08', 370], ['2026-10-09', 371], ['2026-10-09-S372', 372], ['2026-10-09-S1000', 1000]]) {
      fs.writeFileSync(path.join(repo, 'docs', `AUDIT_${key}.json`), JSON.stringify({ session }));
    }
    fs.writeFileSync(path.join(repo, 'docs', 'AUDIT_BRIEF_S372_2026-10-09.json'), '{}');
    const latest = findLatestAuditSidecar(repo);
    assert.equal(latest.date, '2026-10-09-S1000', 'numeric, not lexicographic, session order');
    assert.equal(latest.audit.session, 1000);
    fs.rmSync(path.join(repo, 'docs', 'AUDIT_2026-10-09-S1000.json'));
    assert.equal(findLatestAuditSidecar(repo).date, '2026-10-09-S372');
    fs.rmSync(path.join(repo, 'docs', 'AUDIT_2026-10-09-S372.json'));
    assert.equal(findLatestAuditSidecar(repo).date, '2026-10-09', 'the plain file is still found');
  } finally { fs.rmSync(repo, { recursive: true, force: true }); }
});

test('closeout autopilot: a non-interactive shell is refused before any work starts', () => {
  const run = spawnSync(process.execPath, ['scripts/closeout-autopilot.mjs'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, timeout: 60_000 });
  assert.equal(run.status, 2, 'S372: it ran ten minutes of gates and then died at a prompt it could not read');
  assert.match(run.stderr, /--yes/);
  assert.doesNotMatch(run.stdout, /Step 1/, 'no closeout step may start');
});

test('pre-push: a skip-CI token is allowed in a subject and blocked in a body', () => {
  const token = '[skip' + ' ci]';
  assert.equal(scanCommitMessage('a1', `chore: update beacon ${token}`).length, 0);
  assert.equal(scanCommitMessage('a1', `fix: re-review\n\nThe edition (434cced41, ${token}) rewrote the list.`).length, 1, 'the S372 commit that skipped every workflow');
  assert.equal(scanCommitMessage('a1', 'fix: re-review\n\nNo token here.').length, 0);
});

test('served parity: verdicts order correctly and an unread origin is never "current"', () => {
  const row = (file, state) => ({ file, lane: laneFor(file), state });
  assert.equal(summarize([row('index.html', 'identical')]).verdict, 'tree-current');
  const contentCurrent = summarize([row('index.html', 'identical'), row('data/ignis-search-index.json', 'differ')]);
  assert.equal(contentCurrent.verdict, 'content-current', 'S372: this state was reported as "fully deployed"');
  assert.equal(meets(contentCurrent.verdict, 'tree-current'), false);
  assert.equal(summarize([row('games/index.html', 'differ')]).verdict, 'content-lag');
  assert.equal(summarize([row('index.html', 'identical'), row('sw.js', 'error')]).verdict, 'unverified');
  assert.equal(isServedCandidate('context/LATEST_HANDOFF.md'), false);
});

test('content lane: allowlisted data files keep a real public anchor; browser-read data stays on the full gate', () => {
  assert.deepEqual(publicDataAnchorFindings(ROOT), []);
  for (const file of ['data/promotion-history.ndjson', 'data/uptime-history.ndjson', 'data/stats-surface.json']) assert.equal(classifyPath(file), 'content');
  for (const file of ['data/ignis-search-index.json', 'data/lqip-map.json', 'data/game-registry.json']) assert.equal(classifyPath(file), 'blocked');
});

test('receipt binding: only a dated Desk article with exactly one routine block is marked; everything else is hashed as-is', async () => {
  const { createRequire } = await import('node:module');
  const lib = createRequire(import.meta.url)('../scripts/lib/mobile-runtime-contract.cjs');
  const article = 'news/2026-10-09/a-story/index.html';
  const block = (inner) => `<section class="desk-more" aria-labelledby="t"><ul>${inner}</ul></section>`;
  const page = (inner, body = 'body') => Buffer.from(`<main>${body}</main>${block(inner)}<footer>f</footer>`);
  // Routine content differs, reviewed content identical → same bound bytes, different routine digest.
  assert.ok(lib.bindingBytes(article, page('<li>a</li>')).equals(lib.bindingBytes(article, page('<li>b</li><li>c</li>'))));
  assert.notEqual(lib.routineRegionDigest(article, page('<li>a</li>')), lib.routineRegionDigest(article, page('<li>b</li>')));
  assert.ok(lib.bindingBytes(article, page('<li>a</li>')).includes(lib.DESK_ROUTINE_REGION_MARKER));
  // Reviewed content differs → different bound bytes.
  assert.equal(lib.bindingBytes(article, page('<li>a</li>')).equals(lib.bindingBytes(article, page('<li>a</li>', 'edited'))), false);
  // Not an article, no block, two blocks, or binary → untouched, no routine digest.
  const untouched = [
    ['news/index.html', page('<li>a</li>')],
    ['games/index.html', page('<li>a</li>')],
    ['news/2026-10-09/a-story/critique.json', page('<li>a</li>')],
    [article, Buffer.from('<main>no block here</main>')],
    [article, Buffer.concat([page('<li>a</li>'), Buffer.from(block('<li>second</li>'))])],
    [article, Buffer.concat([page('<li>a</li>'), Buffer.from([0, 1, 2])])],
  ];
  for (const [file, bytes] of untouched) {
    assert.ok(lib.bindingBytes(file, bytes).equals(bytes), `${file} must be hashed as-is`);
    assert.equal(lib.routineRegionDigest(file, bytes), null);
  }
  // Non-ASCII bytes outside the block survive the round trip exactly.
  const unicode = Buffer.from(`<main>café — ’quoted’ 日本</main>${block('<li>x</li>')}`);
  const bound = lib.bindingBytes(article, unicode);
  assert.ok(bound.toString('utf8').startsWith('<main>café — ’quoted’ 日本</main>'));
});

test('satire lane: the 640 AVIF is a lane derivative with a budget, and every published cartoon has one', async () => {
  const { SATIRE_CARTOON_DERIVATIVES, SATIRE_CARTOON_BUDGETS } = await import('../scripts/lib/news-memes.mjs');
  assert.deepEqual(SATIRE_CARTOON_DERIVATIVES['--640.avif'], { width: 640, format: 'avif' });
  for (const suffix of Object.keys(SATIRE_CARTOON_DERIVATIVES)) assert.ok(SATIRE_CARTOON_BUDGETS[suffix] > 0, `${suffix} needs a budget or the build cannot verify it`);
  const dir = path.join(ROOT, 'assets', 'og', 'news');
  const files = new Set(fs.readdirSync(dir));
  const cartoons = [...files].filter((f) => f.endsWith('--satire--640.webp'));
  assert.ok(cartoons.length >= 100, `expected the published cartoon set, found ${cartoons.length}`);
  // S372: the art run shipped a 640 WebP alone and main failed check-image-formats.
  const missing = cartoons.filter((f) => !files.has(f.slice(0, -'.webp'.length) + '.avif'));
  assert.deepEqual(missing, []);
  const over = cartoons.map((f) => f.slice(0, -'.webp'.length) + '.avif').filter((f) => fs.statSync(path.join(dir, f)).size > SATIRE_CARTOON_BUDGETS['--640.avif']);
  assert.deepEqual(over, [], 'every sibling fits the lane budget');
});
