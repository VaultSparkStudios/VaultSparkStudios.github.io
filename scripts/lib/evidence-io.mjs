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