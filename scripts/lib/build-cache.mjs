/**
 * build-cache.mjs — content-hash skip for expensive build scripts.
 *
 * Usage:
 *   import { checkHash, saveHash } from './lib/build-cache.mjs';
 *
 *   const { hit, hash } = checkHash('my-key', ['/abs/path/to/input.json', ...]);
 *   if (hit) { console.log('SKIP (inputs unchanged)'); process.exit(0); }
 *   // ... run expensive build ...
 *   saveHash('my-key', hash);
 *
 * Hash entries live in .cache/<key>-hash (gitignored).
 * Pass --force to bypass the skip (for CI or after a logic change).
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const CACHE_DIR = path.resolve(__dirname, '..', '..', '.cache');

function hashFiles(inputFiles) {
  const h = crypto.createHash('sha256');
  for (const f of [...inputFiles].sort()) {
    try {
      h.update(fs.readFileSync(f));
    } catch {
      h.update('MISSING:' + f);
    }
  }
  return h.digest('hex');
}

function cachePath(key) {
  return path.join(CACHE_DIR, key + '-hash');
}

/**
 * Check whether the given input files have changed since last saveHash call.
 * Returns { hit: boolean, hash: string }.
 * hit=true → inputs unchanged, caller may skip the expensive build.
 */
export function checkHash(key, inputFiles) {
  const hash = hashFiles(inputFiles);
  let saved = '';
  try { saved = fs.readFileSync(cachePath(key), 'utf8').trim(); } catch {}
  return { hit: hash === saved, hash };
}

/**
 * Save the hash for a given key so future checkHash calls can detect no-change.
 */
export function saveHash(key, hash) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(cachePath(key), hash + '\n', 'utf8');
}

// Self-test (node scripts/lib/build-cache.mjs --self-test)
const isMain = process.argv[1] && process.argv[1].endsWith('build-cache.mjs');
if (isMain && process.argv.includes('--self-test')) {
  const os = await import('node:os');
  const tmpDir = fs.mkdtempSync(path.join(os.default.tmpdir(), 'vs-build-cache-'));
  const tmpFile = path.join(tmpDir, 'test.txt');
  const KEY = '_self-test-' + process.pid;

  fs.writeFileSync(tmpFile, 'hello');
  const r1 = checkHash(KEY, [tmpFile]);
  console.assert(!r1.hit, 'first check: miss expected');
  saveHash(KEY, r1.hash);

  const r2 = checkHash(KEY, [tmpFile]);
  console.assert(r2.hit, 'second check: hit expected after save');

  fs.writeFileSync(tmpFile, 'world');
  const r3 = checkHash(KEY, [tmpFile]);
  console.assert(!r3.hit, 'after file change: miss expected');

  // cleanup
  try { fs.unlinkSync(cachePath(KEY)); } catch {}
  fs.rmSync(tmpDir, { recursive: true });

  console.log('build-cache --self-test: 3/3 passed');
  process.exit(0);
}
