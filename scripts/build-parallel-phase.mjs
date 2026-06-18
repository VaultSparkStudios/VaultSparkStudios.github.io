#!/usr/bin/env node
/* build-parallel-phase.mjs — S206 audit item #12 (build-parallelization L2)
   Runs a set of fully-independent API generators in parallel using
   child_process.spawn, reducing build time from serial-sum to longest-single.

   Generators included are verified to have NO cross-generator input dependencies
   at build time (all read from source data files, not from peer generator outputs).

   Each generator is isolated: a single failing generator prints its error to
   stderr and exits non-zero (failing the entire phase), but we collect all
   output before exiting so the diagnosis is always visible.

   Timing: prints elapsed time per generator and total wall-clock savings vs serial. */

import { spawn } from 'node:child_process';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const PARALLEL_GENERATORS = [
  // All read from source files only — no cross-generator input deps at build time.
  'build-og-cards.mjs',
  'build-changelog-narrative.mjs',
  'build-entity-graph.mjs',
  'build-ai-canonical-pages.mjs',
  'build-ignis-roi.mjs',
  'build-commit-map.mjs',
  'build-forge-feed.mjs',
  'build-feedback-provenance.mjs',
  'build-ship-receipts.mjs',
  'build-field-win-proof.mjs',
  'build-oracle-query-insights.mjs',
  'build-constellation-activity.mjs',
  'build-ark-signature-dossier.mjs',
];

const startAll = Date.now();

function runGenerator(script) {
  return new Promise(function (resolve, reject) {
    var scriptPath = path.join(__dirname, script);
    var start = Date.now();
    var proc = spawn(process.execPath, [scriptPath], { stdio: 'pipe' });
    var out = '';
    var err = '';
    proc.stdout.on('data', function (d) { out += d; });
    proc.stderr.on('data', function (d) { err += d; });
    proc.on('close', function (code) {
      var elapsed = Date.now() - start;
      if (out.trim()) process.stdout.write(out);
      if (err.trim()) process.stderr.write(err);
      if (code !== 0) {
        reject(new Error(script + ' exited ' + code + ' (' + elapsed + 'ms)'));
      } else {
        resolve({ script: script, elapsed: elapsed });
      }
    });
    proc.on('error', function (e) { reject(e); });
  });
}

const results = await Promise.allSettled(PARALLEL_GENERATORS.map(runGenerator));

var failed = 0;
results.forEach(function (r) {
  if (r.status === 'rejected') {
    console.error('✗ ' + (r.reason && r.reason.message || r.reason));
    failed++;
  }
});

var elapsed = Date.now() - startAll;
var serialEstimate = results.reduce(function (sum, r) {
  return sum + (r.status === 'fulfilled' ? r.value.elapsed : 0);
}, 0);

console.log(
  'build-parallel-phase: ' + PARALLEL_GENERATORS.length + ' generators · ' +
  (elapsed / 1000).toFixed(1) + 's wall-clock' +
  (serialEstimate > elapsed ? ' (saved ~' + ((serialEstimate - elapsed) / 1000).toFixed(1) + 's vs serial)' : '')
);

if (failed) {
  console.error('build-parallel-phase: ' + failed + ' generator(s) failed');
  process.exit(1);
}
