#!/usr/bin/env node
/**
 * Backwards-compatible shim for the compliance velocity check.
 *
 * `track-compliance-velocity.mjs` is the canonical implementation; this file
 * keeps operator/docs muscle memory from failing with MODULE_NOT_FOUND.
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts', 'track-compliance-velocity.mjs');
const result = spawnSync(process.execPath, [script, ...process.argv.slice(2)], {
  cwd: root,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
