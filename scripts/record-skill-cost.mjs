#!/usr/bin/env node
/**
 * record-skill-cost.mjs - thin delegation shim (S246)
 *
 * Canonical implementation lives in vaultspark-studio-ops. This shim forwards
 * argv verbatim with this repo as cwd and exits cleanly when the sibling is not
 * available.
 */
import { existsSync } from 'node:fs';
import { spawnSync } from './lib/safe-spawn.mjs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SIBLING = path.resolve(ROOT, '..', 'vaultspark-studio-ops', 'scripts', 'record-skill-cost.mjs');

if (!existsSync(SIBLING)) {
  console.log('record-skill-cost.mjs (shim): studio-ops sibling not reachable - skipping.');
  process.exit(0);
}

const r = spawnSync(process.execPath, [SIBLING, ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: ROOT,
  windowsHide: true,
});
process.exit(r.status ?? 0);
