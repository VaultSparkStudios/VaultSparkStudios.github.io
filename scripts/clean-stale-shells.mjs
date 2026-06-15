#!/usr/bin/env node
/**
 * clean-stale-shells.mjs — S199 stale-shell-cleanup.
 *
 * Scans assets/*.shell-*.js and removes any file whose content-hash is not
 * referenced in any HTML page.  Prevents unbounded accumulation of orphaned
 * shell builds and reduces cold-cache payload confusion.
 *
 * Flags:
 *   --dry-run   Print stale files without deleting (default when stdout is a TTY)
 *   --apply     Actually delete; required when piped / in CI
 *
 * Import-safe: side effects run only when invoked directly.
 */
import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { globSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'assets');

/** Collect every hash that appears in any HTML file under ROOT. */
function liveHashes() {
  const htmlFiles = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') walk(join(dir, entry.name));
      } else if (entry.name.endsWith('.html')) {
        htmlFiles.push(join(dir, entry.name));
      }
    }
  }
  walk(ROOT);

  const set = new Set();
  const pat = /shell-([a-f0-9]+)\.js/g;
  for (const f of htmlFiles) {
    const src = readFileSync(f, 'utf8');
    let m;
    while ((m = pat.exec(src)) !== null) set.add(m[1]);
    pat.lastIndex = 0;
  }
  return set;
}

/** Return all *.shell-*.js filenames (just the basenames + paths) in assets/. */
function shellFiles() {
  const entries = readdirSync(ASSETS).filter((n) => /\.shell-[a-f0-9]+\.js$/.test(n));
  return entries.map((name) => ({ name, path: join(ASSETS, name) }));
}

const isMain = process.argv[1] &&
  process.argv[1].replace(/\\/g, '/').endsWith('scripts/clean-stale-shells.mjs');

if (isMain) {
  const args = process.argv.slice(2);
  const check  = args.includes('--check');
  const dryRun = args.includes('--dry-run') || (!args.includes('--apply') && !check);

  const live = liveHashes();
  const stale = shellFiles().filter(({ name }) => {
    const m = name.match(/shell-([a-f0-9]+)\.js$/);
    return m && !live.has(m[1]);
  });

  if (stale.length === 0) {
    console.log('clean-stale-shells → no stale shell files found.');
    process.exit(0);
  }

  if (check) {
    console.error(`✗ clean-stale-shells --check: ${stale.length} stale shell file(s) found. Run with --apply to clean.`);
    for (const { name } of stale) console.error('  ' + name);
    process.exit(1);
  }

  console.log((dryRun ? '[DRY RUN] ' : '') + `Found ${stale.length} stale shell file(s):`);
  for (const { name } of stale) {
    console.log('  ' + (dryRun ? '(would delete) ' : '(deleting) ') + name);
    if (!dryRun) rmSync(join(ASSETS, name));
  }
  if (dryRun) {
    console.log('\nRun with --apply to delete.');
  } else {
    console.log(`\nDeleted ${stale.length} file(s).`);
  }
}
