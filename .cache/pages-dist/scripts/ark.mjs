#!/usr/bin/env node
/**
 * ark.mjs — thin delegating shim (S172 audit #6 · ark-drain-restore)
 *
 * AGENTS.md + the /start protocol expect `node scripts/ark.mjs drain` in every
 * Studio repo, but this repo never had the script — every /start hit
 * MODULE_NOT_FOUND and cargo addressed here (including the Obelisk replies
 * that DRAIN-HUB-OBELISK-REPLIES waits on) could sit undrained.
 *
 * The canonical CLI lives in studio-ops (CANON-018 transport owner). This
 * shim resolves the sibling and forwards argv verbatim, so behavior is always
 * canon-current. If the sibling is unreachable it exits 0 with a note (the
 * /start protocol treats missing transport as non-fatal).
 *
 * synced-from: delegation shim — no logic copied; nothing to drift.
 */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SIBLING = path.resolve(ROOT, '..', 'vaultspark-studio-ops', 'scripts', 'ark.mjs');

if (!existsSync(SIBLING)) {
  console.log('ark (shim): studio-ops sibling not reachable — Ark transport unavailable in this checkout.');
  process.exit(0);
}

const result = spawnSync(process.execPath, [SIBLING, ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: ROOT,
});
process.exit(result.status ?? 0);
