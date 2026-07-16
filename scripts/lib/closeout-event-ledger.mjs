import fs from 'node:fs';
import path from 'node:path';

export function resolveProjectEventLedger(projectRoot) {
  const root = path.resolve(projectRoot);
  const ledger = path.resolve(root, 'portfolio', 'events.ndjson');
  const relative = path.relative(root, ledger);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`event ledger escaped project root: ${ledger}`);
  }
  return ledger;
}

export function validateProjectEventLedger(projectRoot) {
  const ledger = resolveProjectEventLedger(projectRoot);
  if (!fs.existsSync(ledger)) return { path: ledger, exists: false, count: 0 };
  const lines = fs.readFileSync(ledger, 'utf8').split(/\r?\n/).filter(Boolean);
  for (let index = 0; index < lines.length; index += 1) {
    try { JSON.parse(lines[index]); }
    catch { throw new Error(`malformed event JSON at line ${index + 1}`); }
  }
  return { path: ledger, exists: true, count: lines.length };
}
