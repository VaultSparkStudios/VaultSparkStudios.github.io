#!/usr/bin/env node
/**
 * review-satire-batch.mjs — the review step between staging and ingesting Desk
 * satire cartoons (D-S368.7).
 *
 * WHY (S368). Approving a batch by hand meant copying 16-hex hashes out of a
 * dry run. A helper that approved "every valid staged cartoon" then ingested
 * two cartoons nobody had looked at, because another worker had staged them in
 * the meantime. This tool keeps the two steps apart:
 *
 *   node scripts/review-satire-batch.mjs --sheets
 *       Writes 2×2 contact sheets (id, persona and caption over each cartoon)
 *       of every staged cartoon not yet ingested to
 *       .cache/desk-art-staging/_review/, plus ids.txt. Look at every sheet.
 *
 *   node scripts/review-satire-batch.mjs --approve <id,id,...> [--caricature <id,...>] [--allow-reformat]
 *       Ingests ONLY the listed ids, each bound to the hash of the file staged
 *       right now. An id that is not currently stageable is reported, never
 *       substituted. --caricature marks the ids whose cartoon shows a real
 *       public figure; every other approved id is recorded as +none.
 *
 *   node scripts/review-satire-batch.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from './lib/safe-spawn.mjs';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STAGE = path.join(ROOT, '.cache', 'desk-art-staging');
const ART = path.join(ROOT, 'data', 'news-desk', 'art');
const REVIEW = path.join(STAGE, '_review');

/** Parse `ingest-news-art --kind satire --dry-run` output into { id → sha16 } for valid cartoons. */
export function parseDryRun(text) {
  const out = new Map();
  for (const line of String(text).split('\n')) {
    const m = line.match(/valid satire (\S+) .*\bsha=([0-9a-f]{16})\b/);
    if (m) out.set(m[1], m[2]);
  }
  return out;
}

/** Build the --reviewed list from an explicit id list only. */
export function buildApprovals(requested, staged, caricature = []) {
  const car = new Set(caricature);
  const approved = [];
  const missing = [];
  for (const id of requested) {
    const sha = staged.get(id);
    if (!sha) { missing.push(id); continue; }
    approved.push(`${id}@${sha}+${car.has(id) ? 'caricature' : 'none'}`);
  }
  return { approved, missing };
}

const list = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);
const flag = (argv, name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };

function pendingIds() {
  if (!fs.existsSync(STAGE)) return [];
  return fs.readdirSync(STAGE)
    .filter((id) => !id.startsWith('_') && fs.existsSync(path.join(STAGE, id, 'satire.png')) && !fs.existsSync(path.join(ART, `${id}--satire.png`)))
    .sort();
}

async function sheets() {
  const { default: sharp } = await import('sharp');
  const ids = pendingIds();
  fs.rmSync(REVIEW, { recursive: true, force: true });
  fs.mkdirSync(REVIEW, { recursive: true });
  const S = 700; const LABEL = 58;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  let n = 0;
  for (let i = 0; i < ids.length; i += 4) {
    const tiles = await Promise.all(ids.slice(i, i + 4).map(async (id, k) => {
      let meta = {};
      try { meta = JSON.parse(fs.readFileSync(path.join(STAGE, id, 'satire-meta.json'), 'utf8')); } catch { /* label without caption */ }
      const img = await sharp(path.join(STAGE, id, 'satire.png')).resize(S, S, { fit: 'cover' }).png().toBuffer();
      const label = Buffer.from(`<svg width="${S}" height="${LABEL}"><rect width="100%" height="100%" fill="#111"/><text x="8" y="22" font-family="Arial" font-size="16" fill="#ffd54a">${i + k + 1}. ${esc(id.slice(0, 74))}</text><text x="8" y="46" font-family="Arial" font-size="16" fill="#fff">${esc(String(meta.persona || '').toUpperCase())}: ${esc(String(meta.caption || '').slice(0, 70))}</text></svg>`);
      const x = (k % 2) * S; const y = Math.floor(k / 2) * (S + LABEL);
      return [{ input: label, left: x, top: y }, { input: img, left: x, top: y + LABEL }];
    }));
    n += 1;
    await sharp({ create: { width: S * 2, height: (S + LABEL) * 2, channels: 3, background: '#000' } })
      .composite(tiles.flat()).jpeg({ quality: 80 }).toFile(path.join(REVIEW, `sheet-${String(n).padStart(2, '0')}.jpg`));
  }
  fs.writeFileSync(path.join(REVIEW, 'ids.txt'), ids.join('\n'));
  console.log(`review-satire-batch: ${ids.length} pending cartoon(s) → ${n} sheet(s) in ${path.relative(ROOT, REVIEW)}`);
  console.log('Look at every sheet, then: node scripts/review-satire-batch.mjs --approve <ids> [--caricature <ids>]');
}

function approve(argv) {
  const requested = list(flag(argv, '--approve'));
  if (!requested.length) { console.error('review-satire-batch: --approve needs an explicit comma-separated id list'); process.exit(2); }
  const ingest = ['scripts/ingest-news-art.mjs', '--kind', 'satire', '--from', STAGE];
  const dry = spawnSync(process.execPath, [...ingest, '--dry-run'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
  const { approved, missing } = buildApprovals(requested, parseDryRun(`${dry.stdout}${dry.stderr}`), list(flag(argv, '--caricature')));
  console.log(`review-satire-batch: approving ${approved.length} of ${requested.length} requested`);
  if (missing.length) console.log(`  not stageable now (left alone): ${missing.join(', ')}`);
  if (!approved.length) process.exit(missing.length ? 1 : 0);
  const extra = argv.includes('--allow-reformat') ? ['--allow-reformat'] : [];
  const run = spawnSync(process.execPath, [...ingest, '--reviewed', approved.join(','), ...extra], { cwd: ROOT, stdio: 'inherit' });
  process.exit(run.status ?? 1);
}

function selfTest() {
  const dry = [
    '(dry-run) ✓ valid satire 2026-10-01--a 1254x1254 → 1200x1200 sha=0123456789abcdef entropy=7 VERA/pager',
    '(dry-run) ✓ valid satire 2026-10-01--b 1254x1254 → 1200x1200 sha=fedcba9876543210 entropy=7 DOT/chart',
    '(dry-run) · skip 2026-10-01--c: already ingested',
    '(dry-run) ✗ reject 2026-10-01--d: satire budget preflight failed',
  ].join('\n');
  const staged = parseDryRun(dry);
  const r = buildApprovals(['2026-10-01--a', '2026-10-01--c'], staged, ['2026-10-01--a']);
  const cases = [
    ['parses only valid satire rows', staged.size === 2 && staged.get('2026-10-01--b') === 'fedcba9876543210'],
    ['approves only explicitly requested ids', r.approved.length === 1 && r.approved[0] === '2026-10-01--a@0123456789abcdef+caricature'],
    ['a valid staged cartoon that was not requested is never approved', !r.approved.some((a) => a.startsWith('2026-10-01--b'))],
    ['a requested id that is not stageable is reported, not substituted', r.missing.length === 1 && r.missing[0] === '2026-10-01--c'],
    ['caricature defaults to +none', buildApprovals(['2026-10-01--b'], staged).approved[0].endsWith('+none')],
  ];
  let failed = 0;
  for (const [name, ok] of cases) { console.log(`  ${ok ? 'ok' : 'FAIL'} ${name}`); if (!ok) failed += 1; }
  console.log(`review-satire-batch --self-test: ${cases.length - failed}/${cases.length} passed`);
  process.exit(failed ? 1 : 0);
}

const argv = process.argv.slice(2);
const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  if (argv.includes('--self-test')) selfTest();
  else if (argv.includes('--sheets')) await sheets();
  else if (argv.includes('--approve')) approve(argv);
  else { console.error('usage: review-satire-batch.mjs --sheets | --approve <ids> [--caricature <ids>] [--allow-reformat] | --self-test'); process.exit(2); }
}
