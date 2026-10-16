#!/usr/bin/env node
// @verification-scope session — checks the selected local audit with the Studio Ops verifier.
// The shared verifier explicitly supports --project; never let it infer Ops here.
import path from 'node:path';
import { existsSync } from 'node:fs';
import { spawnSync } from './lib/safe-spawn.mjs';
import { findLatestAuditSidecar } from './lib/audit-sidecar.mjs';
const root = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('check-audit-premises — verify local audit claims. --strict --audit <local sidecar> --json. Defaults to latest local audit; requires Studio Ops sibling.');
} else if (args.some(arg => arg === '--project' || arg.startsWith('--project=') || arg.startsWith('--audit=') || arg === '--evidence' || arg.startsWith('--evidence=')) || args.filter(arg => arg === '--audit').length > 1) {
  console.error('check-audit-premises: use at most one --audit <local sidecar>; project/evidence overrides are not accepted');
  process.exitCode = 2;
} else {
  const script = path.resolve(root, '../vaultspark-studio-ops/scripts/check-audit-premises.mjs');
  if (!existsSync(script)) { console.error('check-audit-premises: Studio Ops verifier unavailable'); process.exitCode = 2; }
  else {
    const auditIndex = args.indexOf('--audit');
    const selected = auditIndex >= 0 ? args[auditIndex + 1] : findLatestAuditSidecar(root)?.path;
    const audit = selected && path.resolve(root, selected);
    if (!audit || !audit.startsWith(root + path.sep) || !existsSync(audit)) {
      console.error('check-audit-premises: an existing local audit is required'); process.exitCode = 2;
    } else {
      const forwarded = auditIndex >= 0 ? args.filter((_, i) => i !== auditIndex && i !== auditIndex + 1) : args;
      const result = spawnSync(process.execPath, [script, ...forwarded, '--audit', audit, '--project', root], { cwd: root, stdio: 'inherit', windowsHide: true });
      process.exitCode = result.status ?? 2;
    }
  }
}
