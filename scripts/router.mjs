#!/usr/bin/env node
/**
 * router.mjs — thin delegation shim (S246)
 *
 * Plain-English intent routing lives in vaultspark-studio-ops. This local shim
 * keeps /start preflight from crashing when it precomputes route suggestions.
 */
import { existsSync } from 'node:fs';
import { spawnSync } from './lib/safe-spawn.mjs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SIBLING = path.resolve(ROOT, '..', 'vaultspark-studio-ops', 'scripts', 'router.mjs');

if (!existsSync(SIBLING)) {
  console.log('router.mjs (shim): studio-ops sibling not reachable — skipping.');
  process.exit(0);
}

const r = spawnSync(process.execPath, [SIBLING, ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: ROOT,
  windowsHide: true,
});
process.exit(r.status ?? 0);
