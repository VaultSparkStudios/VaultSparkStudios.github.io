#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'docs', 'visual-qa');
const SELF_TEST = process.argv.includes('--self-test');
const CHECK = process.argv.includes('--check');

export function classify(files, receipt) {
  const retained = new Set((receipt?.captures || []).map((x) => x.file));
  retained.add('LATEST.json');
  const png = files.filter((f) => f.endsWith('.png'));
  return { retained: png.filter((f) => retained.has(f)), archivalCandidates: png.filter((f) => !retained.has(f)) };
}

if (SELF_TEST) {
  const got = classify(['a.png', 'b.png', 'LATEST.json'], { captures: [{ file: 'b.png' }] });
  if (got.retained[0] !== 'b.png' || got.archivalCandidates[0] !== 'a.png') process.exit(1);
  console.log('check-visual-qa-retention --self-test: all passed');
} else {
  const receipt = JSON.parse(fs.readFileSync(path.join(DIR, 'LATEST.json'), 'utf8'));
  const got = classify(fs.readdirSync(DIR), receipt);
  const out = {
    schemaVersion: 1,
    generatedBy: 'scripts/check-visual-qa-retention.mjs',
    policy: 'LATEST.json captures are immutable release evidence; other PNGs are archival candidates, never automatically deleted.',
    retainedCount: got.retained.length,
    archivalCandidateCount: got.archivalCandidates.length,
    archivalCandidates: got.archivalCandidates,
  };
  const outPath = path.join(ROOT, 'docs', 'performance', 'visual-qa-retention.json');
  const bytes = JSON.stringify(out, null, 2) + '\n';
  if (CHECK) {
    if (!fs.existsSync(outPath) || fs.readFileSync(outPath, 'utf8') !== bytes) {
      console.error('check-visual-qa-retention --check: report stale; run without --check');
      process.exit(1);
    }
  } else {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, bytes);
  }
  console.log('check-visual-qa-retention: ok (' + got.retained.length + ' bound, ' + got.archivalCandidates.length + ' archival candidates; zero deleted)');
}
