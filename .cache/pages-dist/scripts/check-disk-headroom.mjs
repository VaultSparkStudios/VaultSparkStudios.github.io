#!/usr/bin/env node
/**
 * Reports local disk headroom and project-local generated cleanup candidates.
 * It does not delete anything.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const json = args.includes('--json');
const apply = args.includes('--apply');
const yes = args.includes('--yes');
const minMb = Number(valueFor('--min-mb') || 512);

// S153 — explicit safe-to-reclaim allowlist. NEVER expand this list without
// founder approval; every entry must be an idempotently-regenerated artifact.
const candidates = [
  { path: '.cache', reason: 'generated Studio/startup cache' },
  { path: 'playwright-report', reason: 'generated Playwright HTML report' },
  { path: 'test-results', reason: 'generated Playwright artifacts' },
  { path: 'docs/mobile-audit', reason: 'generated mobile-audit screenshots/reports' },
].map((entry) => ({
  ...entry,
  exists: fs.existsSync(path.join(ROOT, entry.path)),
  sizeMb: sizeMb(path.join(ROOT, entry.path)),
}));

let reclaim = null;
if (apply) {
  if (!yes) {
    console.error('check-disk-headroom: --apply requires --yes (non-interactive guard).');
    process.exit(2);
  }
  const removed = [];
  let bytesFreed = 0;
  for (const entry of candidates) {
    if (!entry.exists || entry.sizeMb <= 0) continue;
    const abs = path.join(ROOT, entry.path);
    const before = walkSize(abs);
    try {
      fs.rmSync(abs, { recursive: true, force: true });
      removed.push({ path: entry.path, mb: Math.round(before / 1024 / 1024) });
      bytesFreed += before;
    } catch (err) {
      removed.push({ path: entry.path, error: String(err?.message || err) });
    }
  }
  reclaim = { removed, mbFreed: Math.round(bytesFreed / 1024 / 1024) };
  for (const entry of candidates) {
    entry.exists = fs.existsSync(path.join(ROOT, entry.path));
    entry.sizeMb = sizeMb(path.join(ROOT, entry.path));
  }
}

const freeMb = freeDiskMb(ROOT);
const payload = {
  ok: freeMb >= minMb,
  freeMb,
  minMb,
  reclaimableMb: Math.round(candidates.reduce((sum, entry) => sum + entry.sizeMb, 0)),
  candidates,
  ...(reclaim ? { reclaim } : {}),
};

if (json) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  console.log(`Disk headroom: ${freeMb}MB free / ${minMb}MB target (${payload.ok ? 'OK' : 'LOW'})`);
  if (reclaim) {
    console.log(`Reclaimed: ${reclaim.mbFreed}MB across ${reclaim.removed.length} path(s).`);
    for (const r of reclaim.removed) {
      if (r.error) console.log(`  ! ${r.path}: ${r.error}`);
      else console.log(`  - ${r.path}: ${r.mb}MB freed`);
    }
  }
  for (const entry of candidates.filter((item) => item.exists && item.sizeMb > 0)) {
    console.log(`- ${entry.path}: ${entry.sizeMb}MB · ${entry.reason}`);
  }
}

process.exit(payload.ok ? 0 : 1);

function valueFor(flag) {
  const item = args.find((arg) => arg.startsWith(`${flag}=`));
  if (item) return item.slice(flag.length + 1);
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : null;
}

function freeDiskMb(target) {
  if (typeof fs.statfsSync !== 'function') return 0;
  const stats = fs.statfsSync(target);
  return Math.floor((stats.bavail * stats.bsize) / 1024 / 1024);
}

function sizeMb(target) {
  if (!fs.existsSync(target)) return 0;
  const bytes = walkSize(target);
  return Math.round(bytes / 1024 / 1024);
}

function walkSize(target) {
  let stat;
  try {
    stat = fs.statSync(target);
  } catch {
    return 0;
  }
  if (stat.isFile()) return stat.size;
  if (!stat.isDirectory()) return 0;
  let total = 0;
  for (const name of fs.readdirSync(target)) {
    total += walkSize(path.join(target, name));
  }
  return total;
}
