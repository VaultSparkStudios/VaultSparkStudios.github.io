#!/usr/bin/env node
// Reuse the studio-owned parser, but always project the owning checkout's board.
import path from 'node:path';
import { existsSync } from 'node:fs';
import { spawnSync } from './lib/safe-spawn.mjs';
const root = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('task-slice — bounded local TASK_BOARD lookup. --audit-context --max-chars 8000 --json; --search <text> --limit 5 --json; --id <id> --json. Requires the Studio Ops sibling.');
} else if (args.some(arg => arg === '--path' || arg.startsWith('--path='))) {
  console.error('task-slice: this adapter is scoped to this checkout; --path is not accepted');
  process.exitCode = 2;
} else {
  const script = path.resolve(root, '../vaultspark-studio-ops/scripts/task-slice.mjs');
  if (!existsSync(script)) { console.error('task-slice: Studio Ops parser unavailable'); process.exitCode = 2; }
  else {
    const result = spawnSync(process.execPath, [script, ...args, '--path', path.join(root, 'context/TASK_BOARD.md')], { cwd: root, stdio: 'inherit', windowsHide: true });
    process.exitCode = result.status ?? 2;
  }
}
