/**
 * Tracks first-seen dates for Human Action Required items so they can show
 * age in the startup brief even if the task has no explicit session-count notation.
 *
 * Ledger persisted at .cache/human-action-ages.json
 */

import fs from 'fs';
import path from 'path';

const LEDGER_FILE = '.cache/human-action-ages.json';

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Returns days between isoDate and today (always >= 0). */
export function daysSince(isoDate) {
  const ms = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/**
 * Read the ledger, backfill any missing items from taskBoard text, persist,
 * and return the ledger map: { [title]: { firstSeen: 'YYYY-MM-DD' } }
 */
export function ensureAges(taskBoard, { root = '.' } = {}) {
  const ledgerPath = path.join(root, LEDGER_FILE);

  // Load existing ledger
  let ledger = {};
  try {
    ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  } catch {
    // No ledger yet — start fresh
  }

  // Extract current Human Action Required items
  const parts = taskBoard.split(/^## /m);
  const section = parts.find(p => p.startsWith('Human Action Required'));
  const items = section
    ? section
        .slice(section.indexOf('\n') + 1)
        .split(/\r?\n/)
        .filter(l => /^- \[ \]/.test(l))
    : [];

  const now = today();
  let changed = false;

  for (const line of items) {
    const title = line
      .replace(/^- \[ \]\s*/, '')
      .replace(/\*\*/g, '')
      .split(/\s+—\s+/)[0]
      .trim();
    if (title && !ledger[title]) {
      ledger[title] = { firstSeen: now };
      changed = true;
    }
  }

  if (changed) {
    try {
      fs.mkdirSync(path.join(root, '.cache'), { recursive: true });
      fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
    } catch {
      // Non-fatal — ledger just won't persist this run
    }
  }

  return ledger;
}
