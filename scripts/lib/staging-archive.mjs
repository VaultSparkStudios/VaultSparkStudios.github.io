/** Exact pre-upload inventory admission using the same installed tar as the producer.
 * Listing is deliberately fail-closed: unsupported/escaped names are not guessed.
 * This proves names/types, not a frozen source snapshot or per-member byte parity.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createGunzip } from 'node:zlib';
import { Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { spawnSync } from './safe-spawn.mjs';

export function assertArchivePath(name) {
  if (typeof name !== 'string' || !name || /[^\x20-\x7e]/.test(name)
    || name.includes('\\') || name.startsWith('-') || path.posix.isAbsolute(name)
    || name.includes(':') || name.split('/').some(part => !part || part === '.' || part === '..')) {
    throw Error('Unsupported staging archive path');
  }
}

export function assertArchiveSources(root, files) {
  if (!files.length || new Set(files).size !== files.length) throw Error('Empty or duplicate staging manifest');
  const base = path.resolve(root);
  if (!fs.lstatSync(base).isDirectory() || fs.lstatSync(base).isSymbolicLink()) throw Error('Unsafe archive root');
  for (const name of files) {
    assertArchivePath(name);
    const parts = name.split('/');
    let current = base;
    for (const [index, part] of parts.entries()) {
      current = path.join(current, part);
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink() || (index < parts.length - 1 ? !stat.isDirectory() : !stat.isFile() || stat.nlink !== 1)) {
        throw Error('Staging archive sources must be regular files with real directory parents');
      }
    }
  }
}

export function compareArchiveInventory(files, namesOutput, typesOutput) {
  const lines = output => {
    if (typeof output !== 'string' || !output.endsWith('\n')) throw Error('Incomplete archive listing');
    return output.replace(/\r\n/g, '\n').slice(0, -1).split('\n');
  };
  const expected = [...files].sort();
  expected.forEach(assertArchivePath);
  if (!expected.length || new Set(expected).size !== expected.length) throw Error('Empty or duplicate staging manifest');
  const names = lines(namesOutput);
  names.forEach(assertArchivePath);
  const types = lines(typesOutput);
  if (types.length !== expected.length || types.some(line => !line.startsWith('-'))) throw Error('Archive contains nonregular entries or incomplete type listing');
  if (names.length !== expected.length || new Set(names).size !== names.length
    || names.sort().some((name, index) => name !== expected[index])) throw Error('Archive inventory differs from staging manifest');
  return { schemaVersion: 1, fileCount: names.length, regularFilesOnly: true,
    inventorySha256: crypto.createHash('sha256').update(expected.join('\0') + '\0').digest('hex') };
}

export async function verifyStagingArchive(root, archive, files, { run = spawnSync } = {}) {
  assertArchiveSources(root, files);
  // bsdtar can list a gzip whose CRC is invalid. Drain Node's checked decoder
  // without buffering the multi-gigabyte uncompressed release in memory.
  try {
    await pipeline(fs.createReadStream(path.resolve(root, archive)), createGunzip(),
      new Writable({ write(_chunk, _encoding, done) { done(); } }));
  } catch { throw Error('Staging archive gzip integrity failed'); }
  const listing = flag => {
    const result = run('tar', [flag, archive], { cwd: root, encoding: 'utf8', windowsHide: true,
      timeout: 900_000, maxBuffer: 16 * 1024 * 1024 });
    if (result.error || result.status !== 0 || result.signal) throw Error('Staging archive listing failed');
    return result.stdout;
  };
  const proof = compareArchiveInventory(files, listing('-tzf'), listing('-tvzf'));
  // Recheck types after tar read; link substitutions during packaging stay nonpassing.
  assertArchiveSources(root, files);
  return proof;
}
