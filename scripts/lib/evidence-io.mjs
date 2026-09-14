/** Atomic writes for public-safe evidence receipts.
 * A killed process must leave either the previous complete receipt or the next
 * complete receipt—never a truncated JSON file that another surface trusts. */
import fs from 'node:fs';
import path from 'node:path';

export function writeTextAtomic(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  try {
    fs.writeFileSync(tempPath, text, 'utf8');
    fs.renameSync(tempPath, filePath);
  } finally {
    try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch { /* best-effort temp cleanup */ }
  }
}

export function writeJsonAtomic(filePath, value) {
  writeTextAtomic(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
// S354: Windows can briefly lock a file another process just wrote (indexer,
// antivirus), surfacing as UNKNOWN/EBUSY/EPERM/EACCES on open. One such lock on
// leaderboards/call-of-doodie/index.html failed a whole `npm run build` in S353
// though the file opened normally seconds later. Retry only those transient
// codes, briefly; any other error, or a lock that persists, still throws.
const TRANSIENT_WRITE_CODES = new Set(['UNKNOWN', 'EBUSY', 'EPERM', 'EACCES']);
export function writeFileWithRetry(filePath, data, options, { attempts = 5, delayMs = 150, write = fs.writeFileSync } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      return write(filePath, data, options);
    } catch (error) {
      if (!TRANSIENT_WRITE_CODES.has(error?.code) || attempt >= attempts) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs * attempt);
    }
  }
}
