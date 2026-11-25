#!/usr/bin/env node
/**
 * smoke-s98-scripts.mjs — Sanity-check the scripts shipped during S98
 * (hub migration + portfolio heartbeat + email capture + meta-description
 * backfill + shared registry loader). The founder-presence generator this
 * file once covered was deleted: publishing whether a person is at the desk
 * is a privacy surface, not a feature (CANON-028).
 *
 * Each script gets a critical-path smoke test. Fails loud with exit code 1
 * if any script crashes, produces malformed output, or stops honouring its
 * documented contract.
 *
 * Wire into build:check once stable to prevent silent regressions.
 *
 * Usage: node scripts/smoke-s98-scripts.mjs
 */
import { spawnSync } from './lib/safe-spawn.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');

let failures = 0;
function pass(name)       { console.log(`  ✓ ${name}`); }
function fail(name, why)  { console.error(`  ✗ ${name} — ${why}`); failures++; }

function run(args, opts = {}) {
  // First element of args is the script filename; everything after is passed
  // through as argv to that script.
  const [scriptName, ...scriptArgs] = args;
  const { root = ROOT, ...processOptions } = opts;
  return spawnSync(process.execPath, [path.join(root, 'scripts', scriptName), ...scriptArgs], {
    cwd: root, encoding: 'utf8', timeout: 30_000, windowsHide: true, ...processOptions,
  });
}

console.log('S98 scripts smoke test');

// 1. hash-hub-password: deterministic format.
{
  const r = run(['hash-hub-password.mjs', 'smoke-test-not-a-real-password']);
  if (r.status !== 0) fail('hash-hub-password', `exit ${r.status}: ${r.stderr}`);
  else if (!/^pbkdf2\$100000\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/.test((r.stdout || '').trim())) {
    fail('hash-hub-password', 'output not in expected pbkdf2$iter$salt$hash form');
  } else pass('hash-hub-password produces pbkdf2$100000$…');
}

// 2. Exercise the actual writer and checker in a disposable checkout.
// Verification must leave the already-built public heartbeat untouched.
{
  const temporaryParent = fs.realpathSync(os.tmpdir());
  const directory = fs.mkdtempSync(path.join(temporaryParent, 'vs-heartbeat-smoke-'));
  const initialDirectory = fs.lstatSync(directory);
  const fixtureRoot = path.join(directory, 'project');
  const liveFile = path.join(ROOT, 'api', 'heartbeat.json');
  const liveBefore = fs.readFileSync(liveFile);
  try {
    for (const file of ['scripts/generate-heartbeat.mjs', 'scripts/lib/public-activity.mjs', 'scripts/lib/project-activity.mjs']) {
      const target = path.join(fixtureRoot, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(ROOT, file), target);
    }
    fs.writeFileSync(path.join(fixtureRoot, 'package.json'), '{"type":"module"}\n');
    const registry = path.join(fixtureRoot, 'studio-hub', 'src', 'data', 'studioRegistry.js');
    fs.mkdirSync(path.dirname(registry), { recursive: true });
    fs.writeFileSync(registry, 'export const PROJECTS = [{id:"smoke-site",name:"Smoke site",vaultStatus:"forge"}];\n');
    const events = path.join(fixtureRoot, 'portfolio', 'events.ndjson');
    fs.mkdirSync(path.dirname(events), { recursive: true });
    const firstEventTime = Date.now() - 1000;
    fs.writeFileSync(events, JSON.stringify({ slug: 'smoke-site', ts: new Date(firstEventTime).toISOString() }) + '\n');
    const r1 = run(['generate-heartbeat.mjs'], { root: fixtureRoot });
    if (r1.status !== 0) fail('generate-heartbeat isolated write', `exit ${r1.status}: ${r1.stderr}`);
    else {
      const output = JSON.parse(fs.readFileSync(path.join(fixtureRoot, 'api', 'heartbeat.json'), 'utf8'));
      if (output.projects.length !== 1 || output.projects[0].slug !== 'smoke-site'
          || output.projects[0].pulses7d !== 1 || output.projects[0].pulses30d !== 1) {
        fail('generate-heartbeat isolated write', 'fixture source was not faithfully rendered');
      } else pass('generate-heartbeat isolated write');
    }
    const r2 = run(['generate-heartbeat.mjs', '--check'], { root: fixtureRoot });
    if (r2.status !== 0) fail('generate-heartbeat isolated --check', `exit ${r2.status}: ${r2.stderr || r2.stdout}`);
    else pass('generate-heartbeat isolated --check idempotent');
    fs.appendFileSync(events, JSON.stringify({ slug: 'smoke-site', ts: new Date(firstEventTime + 1).toISOString() }) + '\n');
    const rejected = run(['generate-heartbeat.mjs', '--check'], { root: fixtureRoot });
    if (rejected.status !== 1 || !/heartbeat drift/.test(rejected.stderr || '')) {
      fail('generate-heartbeat changed-source refusal', 'checker did not reject the changed fixture');
    } else pass('generate-heartbeat changed-source refusal');
  } catch (error) {
    fail('generate-heartbeat isolated fixture', error.message);
  } finally {
    const currentDirectory = fs.lstatSync(directory);
    if (path.dirname(path.resolve(directory)) !== temporaryParent
        || fs.realpathSync(directory) !== directory || currentDirectory.isSymbolicLink()
        || currentDirectory.ino !== initialDirectory.ino || currentDirectory.dev !== initialDirectory.dev
        || !/^vs-heartbeat-smoke-[A-Za-z0-9]+$/.test(path.basename(directory))) {
      throw new Error('Heartbeat fixture cleanup target changed');
    }
    fs.rmSync(directory, { recursive: true, force: true });
    if (!fs.readFileSync(liveFile).equals(liveBefore)) fail('generate-heartbeat isolation', 'public artifact bytes changed');
    else pass('generate-heartbeat preserves public artifact bytes');
  }
}

// 4. inject-early-signal: dry-run must not mutate any file.
{
  const r = run(['inject-early-signal.mjs', '--dry-run']);
  if (r.status !== 0) fail('inject-early-signal --dry-run', `exit ${r.status}: ${r.stderr}`);
  else if (!/Done\. Injected: \d+, Skipped/.test(r.stdout)) {
    fail('inject-early-signal --dry-run', 'missing expected tally line');
  } else pass('inject-early-signal --dry-run prints tally');
}

// 5. backfill-meta-descriptions: dry-run contract.
{
  // The public tree now exceeds 200 HTML files; this read-only crawl regularly
  // crosses the generic 30s child budget on Windows. Keep a bounded, local
  // override instead of weakening every smoke command.
  const r = run(['backfill-meta-descriptions.mjs', '--dry-run'], { timeout: 90_000 });
  if (r.status !== 0) fail('backfill-meta-descriptions --dry-run', `exit ${r.status}: ${r.stderr}`);
  else if (!/Done\. Wrote: \d+/.test(r.stdout)) {
    fail('backfill-meta-descriptions --dry-run', 'missing expected tally line');
  } else pass('backfill-meta-descriptions --dry-run prints tally');
}

// 6. lib/load-registry: imports + returns { registry, path } shape.
{
  try {
    const mod = await import(pathToFileURL(path.join(ROOT, 'scripts', 'lib', 'load-registry.mjs')).href);
    if (typeof mod.loadRegistry !== 'function') {
      fail('lib/load-registry', 'loadRegistry export missing');
    } else {
      const result = mod.loadRegistry(ROOT);
      if (!result || typeof result !== 'object' || !('registry' in result) || !('path' in result)) {
        fail('lib/load-registry', 'loadRegistry() did not return { registry, path }');
      } else pass('lib/load-registry exports loadRegistry() with { registry, path } shape');
    }
  } catch (err) {
    fail('lib/load-registry import', err.message);
  }
}

// 7. Homepage runtime contract: idle-hydrated proof surfaces must initialize
// after DOMContentLoaded, and preload hints must not create known console noise.
{
  try {
    const trustDepth = fs.readFileSync(path.join(ROOT, 'assets', 'trust-depth.js'), 'utf8');
    const headers = fs.readFileSync(path.join(ROOT, '_headers'), 'utf8');
    const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const spine = fs.readFileSync(path.join(ROOT, 'assets', 'showcase-spine.js'), 'utf8');
    const preloadBlock = (index.match(/<!-- hero-lcp-preload:start -->([\s\S]*?)<!-- hero-lcp-preload:end -->/) || [])[1] || '';

    if (!trustDepth.includes("document.readyState === 'loading'") || !trustDepth.includes('init();')) {
      fail('homepage trust-depth idle hydration', 'trust-depth.js must initialize when idle-loaded after DOMContentLoaded');
    } else {
      pass('homepage trust-depth initializes after late idle load');
    }

    if (/ambient-core\.shell-[a-f0-9]+\.js>; rel=preload; as=script/.test(headers)) {
      fail('homepage Link preload policy', '_headers must not preload deferred ambient-core shell JS');
    } else {
      pass('homepage Link preload policy excludes deferred ambient-core shell JS');
    }

    if (/\.webp"[^>]*rel="preload"|rel="preload"[^>]*\.webp/.test(preloadBlock)) {
      fail('homepage LCP image preload policy', 'hero-lcp-preload must not preload the WebP fallback used only when AVIF is unavailable');
    } else {
      pass('homepage LCP image preload policy avoids WebP fallback warning');
    }

    if (!index.includes('data-spine-proof') || !spine.includes("safeFetch('/api/status-proof.json')") || !spine.includes("safeFetch('/api/public-intelligence.json')") || /(?:safeFetch|fetch)\s*\(\s*['"][^'"]*heartbeat[^'"]*['"]/.test(spine)) {
      fail('homepage studio snapshot sources', 'counts must use public-intelligence and recorded proof must use status-proof; heartbeat counts are not a snapshot source');
    } else {
      pass('homepage studio snapshot has public-intelligence counts and status-proof provenance');
    }

    // Reuse the owning renderer's actual runtime regressions: contradictory
    // proof counts, both resolution orders, failed count feed, invalid timestamp
    // and real pulse behavior. Source-subfield spelling is not count authority.
    const snapshotRuntime = spawnSync(process.execPath, ['--test', '--test-reporter=tap', '--test-name-pattern=^Home snapshot', path.join(ROOT, 'tests', 'active-availability.unit.spec.mjs')], {
      cwd: ROOT, encoding: 'utf8', timeout: 30_000,
    });
    const passedSnapshotTests = Number((snapshotRuntime.stdout || '').match(/^# pass (\d+)\s*$/m)?.[1] || 0);
    if (snapshotRuntime.status !== 0 || passedSnapshotTests < 4) {
      fail('homepage studio snapshot runtime authority', 'existing Home snapshot regressions failed: ' + (snapshotRuntime.stderr || snapshotRuntime.stdout || 'exit ' + snapshotRuntime.status));
    } else {
      pass('homepage studio snapshot runtime count authority, recording time and failure behavior');
    }

    if (!spine.includes('proof.summary.worstStale') || !spine.includes('proof.summary.seedRisk') || !spine.includes('no seed-risk')) {
      fail('homepage studio signal proof detail', 'proof text must include oldest-feed age and seed-risk status from status-proof summary');
    } else {
      pass('homepage studio signal surfaces proof detail');
    }
  } catch (err) {
    fail('homepage runtime/preload contract', err.message);
  }
}
if (failures > 0) {
  console.error(`\n✗ ${failures} smoke check${failures === 1 ? '' : 's'} failed`);
  process.exit(1);
}
console.log('\n✓ all S98 scripts smoke-tested cleanly');
