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
import { readdirSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'assets');

/**
 * Enumerate HTML files to scan for live shell hashes.
 *
 * MUST be git-tracked HTML only (S231 root-fix). A plain filesystem walk also
 * picks up gitignored, locally-generated report HTML — e.g. lighthouse-results and
 * .cache lhr report files — which embed whatever shell hash was current when the
 * report was captured. Those references made an orphaned committed shell look "live"
 * locally (exit 0) while CI (clean checkout, no local reports) correctly flagged it
 * stale (exit 1) — a green-locally / red-in-CI divergence. `git ls-files` is identical
 * on every machine, so the verdict is deterministic. Mirrors the S229 build-lqip-map fix.
 */
function trackedHtmlFiles() {
  const res = spawnSync('git', ['-C', ROOT, 'ls-files', '*.html'], {
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (res.status === 0 && res.stdout) {
    return res.stdout.split('\n').map((p) => p.trim()).filter(Boolean)
      .map((rel) => join(ROOT, rel)).filter((p) => existsSync(p));
  }
  // Defensive fallback (no git available): fs-walk, but still exclude dot-dirs +
  // known local report output dirs so the masking class cannot reappear.
  const EXCLUDE_DIRS = new Set(['node_modules', 'lighthouse-results', '.lighthouseci']);
  const htmlFiles = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && !EXCLUDE_DIRS.has(entry.name)) walk(join(dir, entry.name));
      } else if (entry.name.endsWith('.html')) {
        htmlFiles.push(join(dir, entry.name));
      }
    }
  }
  walk(ROOT);
  return htmlFiles;
}

/** Collect every hash that appears in any git-tracked HTML file. */
function liveHashes() {
  const htmlFiles = trackedHtmlFiles();

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
