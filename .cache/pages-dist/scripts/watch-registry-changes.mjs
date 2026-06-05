#!/usr/bin/env node
/**
 * CANON-022 — Registry Change Watcher (per-repo passive shim).
 *
 * The canonical watcher runs from `vaultspark-studio-ops` and broadcasts
 * `registry-change` cargo to siblings via Studio Ark. This per-repo shim
 * provides the call-site referenced by SESSION_PROTOCOL.md without owning
 * the watcher itself. It reads the most recent registry-change cargo
 * receipts that have been drained into `.cache/ark-inbox.json` and reports
 * any changes that touched this slug.
 *
 * Exit 0 always (read-only). `--json` for machine consumption.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const asJson = process.argv.includes('--json');
const inboxPath = path.join(ROOT, '.cache/ark-inbox.json');

const SLUG = (() => {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    if (pkg.name) return pkg.name;
  } catch {}
  return path.basename(ROOT);
})();

let relevantChanges = [];
let inboxStatus = 'absent';

if (fs.existsSync(inboxPath)) {
  inboxStatus = 'present';
  try {
    const inbox = JSON.parse(fs.readFileSync(inboxPath, 'utf8'));
    const items = Array.isArray(inbox) ? inbox : inbox.items || [];
    relevantChanges = items
      .filter((it) => it && it.type === 'registry-change')
      .filter((it) => {
        const payload = it.payload || {};
        return payload.slug === SLUG || payload.affects === '*' || (payload.affects || []).includes(SLUG);
      })
      .slice(-10);
  } catch {
    inboxStatus = 'unreadable';
  }
}

const payload = {
  schemaVersion: '1.0',
  project: SLUG,
  checkedAt: new Date().toISOString(),
  inboxStatus,
  relevantChangeCount: relevantChanges.length,
  recentChanges: relevantChanges.map((it) => ({
    ts: it.ts || it.timestamp || null,
    from: it.from || null,
    summary: it.payload && it.payload.summary ? it.payload.summary : null,
  })),
};

if (asJson) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  console.log(`registry-change watcher: ${relevantChanges.length} recent change(s) for ${SLUG} (inbox: ${inboxStatus})`);
  for (const c of payload.recentChanges) {
    console.log(`  · ${c.ts || '?'} from ${c.from || '?'} — ${c.summary || '(no summary)'}`);
  }
}

process.exit(0);
