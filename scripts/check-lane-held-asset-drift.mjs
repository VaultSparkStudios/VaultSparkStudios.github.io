#!/usr/bin/env node
/**
 * check-lane-held-asset-drift.mjs — S357.
 *
 * Measures the one thing nothing else measures: assets the content lane HOLDS,
 * whose served bytes no longer match the repo.
 *
 * WHY THIS EXISTS. `check-content-lane-purity` classifies an unhashed `.js` as
 * "sensitive, executable, or unrecognised type" and holds it; only fingerprinted
 * shell assets are promotable. That is the right safety property — executable
 * code should not ride a content lane — but its consequence was never measured:
 * **a plain client script can never be updated by the content lane.** It changes
 * only on a full deploy.
 *
 * That is how a fetch S356 deleted stayed live. `assets/studio-now.js` still
 * called a retired privacy endpoint in the SERVED bytes while the repo copy was
 * clean, and the only reason anyone noticed was that the release ceremony's
 * browser gate happened to record the 404. Production looked innocent because it
 * still served the pre-removal deploy. Measured by hand during S357: 27 of 171
 * unhashed client scripts were stale on staging, 32 of 171 on production.
 *
 * A hand-run measurement that finds a live defect once should not need to be
 * reconstructed from memory the next time. This is that measurement, wired.
 *
 * HONESTY PROPERTIES.
 *   - A transport failure is NOT drift. Unreachable assets are reported as
 *     `unknown` and never counted as either clean or stale.
 *   - A 404 is NOT drift either: an asset the origin does not serve has nothing
 *     to compare. It is reported separately.
 *   - The verdict names its vantage, because a Pages origin and the apex Worker
 *     can legitimately serve different things.
 *   - `--check` is advisory by default (`--strict` makes drift fail), because
 *     the honest baseline on a repo with a real backlog is "not zero yet", and a
 *     gate that fails from day one gets suppressed rather than fixed.
 *
 * Usage:
 *   node scripts/check-lane-held-asset-drift.mjs            # measure, advisory
 *   node scripts/check-lane-held-asset-drift.mjs --strict   # non-zero on drift
 *   node scripts/check-lane-held-asset-drift.mjs --origin https://...
 *   node scripts/check-lane-held-asset-drift.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const SELF_TEST = args.includes('--self-test');
const STRICT = args.includes('--strict');
const ORIGIN = args.includes('--origin') ? args[args.indexOf('--origin') + 1] : 'https://vaultsparkstudios.com';
const OUT = path.join(ROOT, '.cache', 'lane-held-asset-drift.json');

const FINGERPRINTED = /\.shell-[a-f0-9]{10}\.(?:js|css)$/;
const sha = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

/**
 * Assets the content lane holds: unhashed .js under assets/. A fingerprinted
 * name is promotable and therefore cannot go stale under the same URL.
 */
export function laneHeldAssets(names) {
  return names.filter((name) => name.endsWith('.js') && !FINGERPRINTED.test(name)).sort();
}

/**
 * Is this asset still referenced by anything the repo ships?
 *
 * Drift only MATTERS for an asset something still loads. Once a script is
 * fingerprinted, its old unhashed copy lingers on the origin and will read as
 * "drifted" forever while nothing loads it — residue, not risk. Counting those
 * the same way overstates the problem and trains people to ignore the number.
 * Observed immediately: hero-ticker, public-intelligence and studio-now were all
 * fingerprinted earlier in S357 and still showed as drift.
 */
export function referencedAssets(root = ROOT) {
  const refs = new Set();
  const skip = /^(?:node_modules|\.git|\.cache|output|lighthouse-results|playwright-report|docs|coverage|scripts|tests)$/;
  // A RUNTIME load only. Two shapes ship to a browser:
  //   <script src="/assets/x.js">        — a page tag
  //   { src: '/assets/x.js', when: ... } — a loader entry (ambient/idle loaders)
  // Everything else that merely NAMES the file is build-time bookkeeping: the
  // service worker's non-cacheable source list, build-shell-assets' input table,
  // this gate's own docs. Counting those made every asset I had just fingerprinted
  // still read as RISK, because the build table still names its source.
  const TAG = /<script[^>]+src=["']\/?(assets\/[a-z0-9-]+\.js)["']/gi;
  const LOADER = /\bsrc:\s*['"]\/?(assets\/[a-z0-9-]+\.js)['"]/gi;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) { if (!skip.test(entry.name)) walk(path.join(dir, entry.name)); continue; }
      const full = path.join(dir, entry.name);
      const rel = path.relative(root, full).replace(/\\/g, '/');
      if (rel === 'sw.js') continue; // precache bookkeeping, not a load
      let text;
      if (/\.html$/i.test(entry.name)) {
        try { text = fs.readFileSync(full, 'utf8'); } catch { continue; }
        for (const m of text.matchAll(TAG)) refs.add(m[1]);
      } else if (/^assets\//.test(rel) && /\.js$/i.test(entry.name)) {
        try { text = fs.readFileSync(full, 'utf8'); } catch { continue; }
        for (const m of text.matchAll(LOADER)) { if (m[1] !== rel) refs.add(m[1]); }
      }
    }
  };
  walk(root);
  return refs;
}

/** Pure: turn per-asset observations into a verdict. */
export function summarize(observations, { origin = ORIGIN } = {}) {
  const drifted = observations.filter((o) => o.state === 'drift');
  const clean = observations.filter((o) => o.state === 'match');
  const unknown = observations.filter((o) => o.state === 'unknown');
  const absent = observations.filter((o) => o.state === 'absent');
  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    origin,
    // Named so a reader cannot mistake the scope: this is the HELD set only.
    note: 'Assets the content lane holds (unhashed .js). A fingerprinted asset ships under a new URL and cannot be served stale, so it is out of scope by construction.',
    total: observations.length,
    match: clean.length,
    drift: drifted.length,
    driftThatMatters: drifted.filter((o) => o.referenced).length,
    unknown: unknown.length,
    absent: absent.length,
    drifted: drifted.map((o) => o.asset),
    driftedReferenced: drifted.filter((o) => o.referenced).map((o) => o.asset),
    driftedResidue: drifted.filter((o) => !o.referenced).map((o) => o.asset),
    unknownAssets: unknown.map((o) => ({ asset: o.asset, reason: o.reason })),
    // Unknown is never folded into either side: an unreachable asset is not
    // evidence of drift and not evidence of cleanliness.
    measured: clean.length + drifted.length,
  };
}

async function observe(asset, origin, referenced = new Set()) {
  const local = sha(fs.readFileSync(path.join(ROOT, 'assets', asset)));
  try {
    const response = await fetch(`${origin}/assets/${asset}`, { signal: AbortSignal.timeout(15000) });
    const isRef = referenced.has('assets/' + asset);
    if (response.status === 404) return { asset, state: 'absent', referenced: isRef };
    if (!response.ok) return { asset, state: 'unknown', referenced: isRef, reason: `HTTP ${response.status}` };
    const served = sha(Buffer.from(await response.arrayBuffer()));
    return { asset, state: served === local ? 'match' : 'drift', referenced: isRef };
  } catch (error) {
    return { asset, state: 'unknown', referenced: referenced.has('assets/' + asset), reason: String(error?.cause?.message || error?.message || error).slice(0, 80) };
  }
}

function selfTest() {
  const cases = [];
  const t = (name, ok) => cases.push([name, Boolean(ok)]);
  t('a fingerprinted asset is out of scope', laneHeldAssets(['a.shell-0123456789.js', 'b.js']).join() === 'b.js');
  t('non-js is out of scope', laneHeldAssets(['a.css', 'b.js']).join() === 'b.js');
  const s = summarize([
    { asset: 'a.js', state: 'match' },
    { asset: 'b.js', state: 'drift' },
    { asset: 'c.js', state: 'unknown', reason: 'timeout' },
    { asset: 'd.js', state: 'absent' },
  ]);
  t('drift is counted and named', s.drift === 1 && s.drifted[0] === 'b.js');
  // The two controls that matter: neither unknown nor absent may be laundered
  // into a clean result.
  t('an unreachable asset is NOT counted clean', s.match === 1);
  t('an unreachable asset is NOT counted as drift', s.drift === 1 && s.unknown === 1);
  t('measured excludes unknown and absent', s.measured === 2 && s.total === 4);
  const split = summarize([
    { asset: 'live.js', state: 'drift', referenced: true },
    { asset: 'old.js', state: 'drift', referenced: false },
  ]);
  t('referenced drift is the number that matters', split.driftThatMatters === 1 && split.driftedReferenced[0] === 'live.js');
  t('unreferenced drift is residue, not risk', split.driftedResidue[0] === 'old.js' && split.drift === 2);
  t('the verdict names its vantage', typeof s.origin === 'string' && s.origin.startsWith('http'));
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
  console.log(`check-lane-held-asset-drift --self-test: ${cases.length - failed.length}/${cases.length}`);
  process.exitCode = failed.length ? 1 : 0;
}

async function main() {
  const assets = laneHeldAssets(fs.readdirSync(path.join(ROOT, 'assets')));
  const referenced = referencedAssets();
  const observations = [];
  // Small batches: this is a few hundred requests against our own origin.
  for (let i = 0; i < assets.length; i += 8) {
    observations.push(...await Promise.all(assets.slice(i, i + 8).map((asset) => observe(asset, ORIGIN, referenced))));
  }
  const report = summarize(observations, { origin: ORIGIN });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n');

  console.log(`lane-held-asset-drift @ ${report.origin}`);
  console.log(`  ${report.total} held asset(s) · ${report.match} match · ${report.drift} drift (${report.driftThatMatters} STILL REFERENCED) · ${report.unknown} unknown · ${report.absent} not served`);
  for (const asset of report.driftedReferenced) console.log(`    RISK      ${asset} — something still loads this`);
  for (const asset of report.driftedResidue.slice(0, 20)) console.log(`    residue   ${asset} — nothing references it; an old copy the origin still serves`);
  if (report.unknown) console.log(`  ${report.unknown} unreachable — counted as neither clean nor drifted`);
  if (report.drift) {
    console.log('  These cannot be repaired by a content-lane promotion: the lane HOLDS unhashed .js.');
    console.log('  Fingerprint them through build-shell-assets (and CONTENT_ADDRESSED_PREDICATE_SRCS if a loader names them), or ship a full deploy.');
  }
  // Only referenced drift can actually hurt a visitor; residue is cleanup.
  if (STRICT && report.driftThatMatters > 0) process.exitCode = 1;
}

if (SELF_TEST) selfTest();
else await main();
