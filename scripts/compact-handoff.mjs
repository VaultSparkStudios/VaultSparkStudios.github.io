#!/usr/bin/env node
/**
 * compact-handoff.mjs — LATEST_HANDOFF compactor + trimmer (v3.2)
 *
 * Two modes:
 *
 * DEFAULT: Extract `context/LATEST_HANDOFF.md` deterministically with a source hash and omission lookup.
 *   Cache remains valid while the source bytes and format match; no API calls.
 *   Read the digest at session start instead of the full file (bounded source excerpt; never infer omitted approvals).
 *
 * --trim: Archive all sessions beyond the newest 2 to `context/HANDOFF_ARCHIVE.md`.
 *   Keeps LATEST_HANDOFF.md at ≤2 sessions (~5-8K tokens max).
 *   Run automatically at closeout to prevent unbounded file growth.
 *   Idempotent — re-running when already ≤2 sessions is a no-op.
 *
 * Usage:
 *   node scripts/compact-handoff.mjs           # digest cache (default)
 *   node scripts/compact-handoff.mjs --force   # force re-digest
 *   node scripts/compact-handoff.mjs --trim    # archive old sessions
 *   node scripts/compact-handoff.mjs --trim --dry-run  # preview only
 *   node scripts/compact-handoff.mjs --measure  # read-only: extract omissions across committed handoff history
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { archiveBeforeMutate } from './lib/archive-then-compact.mjs';
import { handoffDigest, measureOmissions } from './lib/handoff-digest.mjs';
import { trimHandoffText } from './lib/handoff-trim.mjs';
import { parseDeployArgv } from './lib/deploy-argv.mjs';
const admission = parseDeployArgv(process.argv.slice(2), { name: 'compact-handoff', boolFlags: ['--force','--trim','--measure'], modes: ['--force','--trim','--measure'] });
if (admission.help) { console.log('Usage: compact-handoff [--force | --trim | --measure] [--dry-run] — deterministic source extraction, no API.'); process.exit(0); }

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const HANDOFF = path.join(ROOT, 'context', 'LATEST_HANDOFF.md');
const CACHE   = path.join(ROOT, '.ops-cache', 'handoff-digest.json');
const OUT     = path.join(ROOT, 'context', 'LATEST_HANDOFF.compact.md');

const force   = process.argv.includes('--force');
const trim    = process.argv.includes('--trim');
const dryRun = admission.dry;

function readText(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }

// ── TRIM MODE ────────────────────────────────────────────────────────────────
if (trim) {
  const ARCHIVE = path.join(ROOT, 'context', 'HANDOFF_ARCHIVE.md');
  const raw = readText(HANDOFF);
  if (!raw) { console.error('No LATEST_HANDOFF.md found.'); process.exit(1); }

  const KEEP = 2;
  const result = trimHandoffText(raw, KEEP);
  const { kept: toKeep, archived: toArchive } = result;
  if (!result.trimmed) { console.log('= LATEST_HANDOFF.md already bounded — no trim needed.'); process.exit(0); }
  console.log(`✂ Trimming LATEST_HANDOFF.md: keeping ${KEEP} sessions, archiving ${toArchive.length}`);
  toArchive.forEach(s => {
    const firstLine = s.split('\n')[0].replace('## Where We Left Off', '').trim();
    console.log(`  → archive: ${firstLine}`);
  });

  if (!dryRun) {
    archiveBeforeMutate({
      sourcePath: HANDOFF,
      content: raw,
      label: 'handoff-trim',
      suffix: '.full.md',
    });
    // Append archived sessions to HANDOFF_ARCHIVE.md
    const archiveHeader = `\n\n---\n<!-- archived: ${new Date().toISOString().slice(0, 10)} -->\n\n`;
    fs.appendFileSync(ARCHIVE, archiveHeader + result.archiveText);
    // Rewrite LATEST_HANDOFF with just the keeper sections
    fs.writeFileSync(HANDOFF, result.text);
    console.log(`✓ LATEST_HANDOFF.md trimmed (${toKeep.length} sessions kept)`);
    console.log(`✓ ${toArchive.length} session(s) appended to context/HANDOFF_ARCHIVE.md`);
  } else {
    console.log(`(dry-run) would rewrite LATEST_HANDOFF.md + append ${toArchive.length} to HANDOFF_ARCHIVE.md`);
  }
  process.exit(0);
}

// ── MEASURE MODE (read-only) ─────────────────────────────────────────────────
if (process.argv.includes('--measure')) {
  // Loaded here only: the default extract path stays free of subprocess modules.
  const { execFileSync } = await import('./lib/safe-spawn.mjs');
  const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  const shas = git('log', '--format=%H', '-n', '80', '--', 'context/LATEST_HANDOFF.md').split(/\r?\n/).filter(Boolean);
  const sources = shas.map(sha => { try { return git('show', `${sha}:context/LATEST_HANDOFF.md`); } catch { return null; } }).filter(s => s !== null);
  console.log(JSON.stringify(measureOmissions(sources), null, 2));
  process.exit(0);
}

// Deterministic digest: no credentials, model calls, or time-based refresh.
const handoff = readText(HANDOFF);
if (!handoff) { console.error('No LATEST_HANDOFF.md found.'); process.exit(1); }
const extracted = handoffDigest(handoff);
let cached;
try { cached = JSON.parse(readText(CACHE)); } catch {}
const validCache = cached?.mode === 'deterministic-v1' && cached.hash === extracted.hash && cached.digest === extracted.digest;
if (dryRun) { console.log('Preview: deterministic extract ' + extracted.digest.length + ' chars; no files written.'); process.exit(0); }
const digest = validCache && !force ? cached.digest : extracted.digest;
fs.writeFileSync(OUT, digest);
fs.mkdirSync(path.dirname(CACHE), { recursive: true });
fs.writeFileSync(CACHE, JSON.stringify({mode:'deterministic-v1', hash:extracted.hash, digest}, null, 2) + '\n');
console.log('✓ Compact handoff (deterministic source extract) → context/LATEST_HANDOFF.compact.md (' + digest.length + ' chars; omitted=' + extracted.omitted + ')');
