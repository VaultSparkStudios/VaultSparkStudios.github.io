#!/usr/bin/env node
/** Build an overdue Desk recovery packet; never publish it. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRAFTS = path.join(ROOT, '.cache', 'news-drafts');
const OUT = path.join(ROOT, '.cache', 'news-desk-recovery-packet.json');

export function recoveryPacket({ queue, draft, generatedAt = new Date().toISOString() }) {
  return {
    schemaVersion: '1.0', generatedAt, state: 'review-held', publicationAuthorized: false,
    sourceQueueGeneratedAt: queue?.generatedAt || null,
    topic: draft?._authoring?.topic || draft?.story?.slug || null,
    draftPath: draft?._path || null,
    gates: ['source review', 'fact verification', 'persona commentary review', 'editorial promotion'],
    publishCommand: null,
    note: 'This packet is evidence recovery, not a publish authorization. Promotion remains an explicit editor action.',
  };
}

function run(script, args) {
  return spawnSync(process.execPath, [path.join(ROOT, 'scripts', script), ...args], {
    cwd: ROOT, stdio: 'inherit', windowsHide: true,
  });
}

function selfTest() {
  const packet = recoveryPacket({ queue: { generatedAt: 'x' }, draft: { _path: '.cache/news-drafts/x.json', story: { slug: 'x' } }, generatedAt: 'y' });
  const ok = packet.state === 'review-held' && packet.publicationAuthorized === false && packet.publishCommand === null && packet.gates.length === 4;
  console.log(`  ${ok ? 'ok' : 'FAIL'} recovery packet cannot self-publish`);
  if (!ok) process.exit(1);
  console.log('recover-news-desk --self-test: 1/1 passed');
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  if (!process.argv.includes('--prepare')) {
    console.error('Usage: node scripts/recover-news-desk.mjs --prepare | --self-test');
    process.exit(2);
  }
  const scan = run('news-trend-radar.mjs', ['--scan']);
  if (scan.status !== 0) process.exit(scan.status || 1);
  const draft = run('news-draft-edition.mjs', ['--prepare']);
  if (draft.status !== 0) process.exit(draft.status || 1);
  const latest = fs.readdirSync(DRAFTS).filter((name) => name.endsWith('.json'))
    .map((name) => ({ name, mtime: fs.statSync(path.join(DRAFTS, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0];
  if (!latest) throw new Error('drafter completed without a review-held draft');
  const draftValue = JSON.parse(fs.readFileSync(path.join(DRAFTS, latest.name), 'utf8'));
  draftValue._path = path.relative(ROOT, path.join(DRAFTS, latest.name)).replace(/\\/g, '/');
  const queue = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'news-desk', 'topic-queue.json'), 'utf8'));
  fs.writeFileSync(OUT, `${JSON.stringify(recoveryPacket({ queue, draft: draftValue }), null, 2)}\n`);
  console.log(`review-held recovery packet → ${path.relative(ROOT, OUT)} (publicationAuthorized=false)`);
}

main();
