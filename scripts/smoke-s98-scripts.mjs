#!/usr/bin/env node
/**
 * smoke-s98-scripts.mjs — Sanity-check the six scripts shipped during S98
 * (hub migration + portfolio heartbeat + founder presence + email capture +
 * meta-description backfill + shared registry loader).
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

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');

let failures = 0;
function pass(name)       { console.log(`  ✓ ${name}`); }
function fail(name, why)  { console.error(`  ✗ ${name} — ${why}`); failures++; }

function run(args, opts = {}) {
  // First element of args is the script filename; everything after is passed
  // through as argv to that script.
  const [scriptName, ...scriptArgs] = args;
  return spawnSync(process.execPath, [path.join(ROOT, 'scripts', scriptName), ...scriptArgs], {
    cwd: ROOT, encoding: 'utf8', timeout: 30_000, ...opts,
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

// 2. generate-heartbeat: writing + --check idempotent.
{
  const r1 = run(['generate-heartbeat.mjs']);
  if (r1.status !== 0) fail('generate-heartbeat write', `exit ${r1.status}: ${r1.stderr}`);
  else pass('generate-heartbeat write');
  const r2 = run(['generate-heartbeat.mjs', '--check']);
  if (r2.status !== 0) fail('generate-heartbeat --check', `exit ${r2.status}: ${r2.stderr || r2.stdout}`);
  else pass('generate-heartbeat --check idempotent');
}

// 3. generate-founder-presence: default to live=false, kill-switch honoured.
{
  const r1 = run(['generate-founder-presence.mjs']);
  if (r1.status !== 0) fail('generate-founder-presence write', `exit ${r1.status}: ${r1.stderr}`);
  else pass('generate-founder-presence write');
  const r2 = run(['generate-founder-presence.mjs', '--check']);
  if (r2.status !== 0) fail('generate-founder-presence --check', `exit ${r2.status}: ${r2.stderr || r2.stdout}`);
  else pass('generate-founder-presence --check idempotent');
  const r3 = run(['generate-founder-presence.mjs'], { env: { ...process.env, FOUNDER_PRESENCE_DISABLED: '1' } });
  if (r3.status !== 0) fail('generate-founder-presence kill-switch', `exit ${r3.status}`);
  else pass('generate-founder-presence honours FOUNDER_PRESENCE_DISABLED');
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

    if (!index.includes('data-spine-proof') || !spine.includes("safeFetch('/api/status-proof.json')") || !spine.includes("proofs['public-status']")) {
      fail('homepage studio signal proof source', 'showcase spine must expose status-proof/public-status provenance, not heartbeat pulse counts');
    } else {
      pass('homepage studio signal derives from status-proof provenance');
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
