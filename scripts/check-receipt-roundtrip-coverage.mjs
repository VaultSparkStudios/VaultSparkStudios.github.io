#!/usr/bin/env node
/**
 * S339 (D-S339.3) — every receipt re-derive site must carry the round-trip property.
 *
 * THE CLASS. A script that emits a receipt with `derive(observation)` and later
 * reconstructs the observation from that receipt owes the two functions a fixed
 * point: `derive(read(derive(x))) === derive(x)`. Three times on this repo a
 * field was added to a `derive()` and forgotten in its reader — retainedForHours
 * (S300), historyComplete (S316), the S336 content clock (found S338) — and each
 * was caught only after it had reddened a cron in production.
 *
 * S338 closed it for the one site that existed. S339 moved the property into
 * scripts/lib/receipt-roundtrip.mjs and added this gate, because the failure mode
 * that actually matters is the SECOND site: a new re-derive written without the
 * property, or with only the fixed-point half and not its proof-of-liveness. A
 * fixed-point test over a function that drops the same field on both passes is
 * self-consistently green, so half the pair is worse than none — it reports
 * success while measuring nothing.
 *
 * THE RULE, which names no script and no field:
 *   any script that re-derives from its own persisted receipt must import the
 *   shared harness and use the paired form.
 *
 * Usage:
 *   node scripts/check-receipt-roundtrip-coverage.mjs
 *   node scripts/check-receipt-roundtrip-coverage.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const HARNESS = 'lib/receipt-roundtrip.mjs';
const PAIRED = 'receiptRoundTripCases';

/**
 * A re-derive site: some function applied to a value reconstructed from a receipt
 * this script parsed off disk. Two spellings, both seen in the wild — with an
 * explicit reader (`derive(read(JSON.parse(readFileSync(X))))`) and without
 * (`read(JSON.parse(readFileSync(OUT)))`).
 */
export function reDeriveSites(source) {
  const sites = [];
  for (const m of source.matchAll(/\b([A-Za-z_$][\w$]*)\(\s*([A-Za-z_$][\w$]*)\(\s*JSON\.parse\(\s*fs\.readFileSync/g)) {
    sites.push(`${m[1]}(${m[2]}(…))`);
  }
  // Caught on this gate's own first live run: `consolidatedRoutes(parse(CONSOLIDATION))`
  // matched, but that file is CONFIG the script only ever reads. Reading a file
  // someone else wrote is not a round trip — there is no emitter here to drift
  // away from. What makes it a round trip is a script reading back a receipt it
  // WROTE ITSELF, so this spelling additionally requires a write to that target.
  for (const m of source.matchAll(/\b([A-Za-z_$][\w$]*)\(\s*JSON\.parse\(\s*fs\.readFileSync\(\s*([A-Z][A-Z_]*)\b/g)) {
    if (!new RegExp(String.raw`writeFileSync\(\s*${m[2]}\b`).test(source)) continue;
    sites.push(`${m[1]}(parse(${m[2]}))`);
  }
  return [...new Set(sites)];
}

export function evaluate(files) {
  const findings = [];
  let covered = 0;
  const sitesByFile = {};

  // The harness and this gate's own fixtures are the property's machinery, not
  // receipts anyone publishes — policing them would just be the gate measuring
  // its own test strings.
  const SELF = ['lib/', 'check-receipt-roundtrip-coverage.mjs'];
  for (const [name, source] of Object.entries(files)) {
    if (SELF.some((prefix) => name.startsWith(prefix))) continue;
    const sites = reDeriveSites(source);
    if (!sites.length) continue;
    sitesByFile[name] = sites;

    const importsHarness = source.includes(HARNESS);
    const usesPaired = new RegExp(`\\b${PAIRED}\\s*\\(`).test(source);

    if (!importsHarness) {
      findings.push(`${name} re-derives from its own receipt (${sites.join(', ')}) but does not import scripts/${HARNESS}`);
    } else if (!usesPaired) {
      // Importing the module and hand-rolling half of it is the exact regression
      // this gate exists to stop: the fixed point without its proof-of-liveness
      // is green whether or not it measures anything.
      findings.push(`${name} imports the round-trip harness but never calls ${PAIRED}(), so the fixed point may be shipping without its proof-of-liveness`);
    } else {
      covered += 1;
    }
  }

  return { ok: findings.length === 0, findings, covered, sites: sitesByFile };
}

function loadLive() {
  const files = {};
  const walk = (rel) => {
    for (const name of fs.readdirSync(path.join(ROOT, 'scripts', rel), { withFileTypes: true })) {
      const child = rel ? `${rel}/${name.name}` : name.name;
      if (name.isDirectory()) walk(child);
      else if (name.name.endsWith('.mjs')) files[child] = fs.readFileSync(path.join(ROOT, 'scripts', child), 'utf8');
    }
  };
  walk('');
  return files;
}

function selfTest() {
  const withSite = "import x from 'node:fs';\nfs.writeFileSync(OUT, payload);\nconst o = observationFromReceipt(JSON.parse(fs.readFileSync(OUT, 'utf8')));";
  const cases = [
    ['a script with no re-derive site is not required to carry the property',
      evaluate({ 'plain.mjs': 'const a = 1;' }).ok],

    // THE LIVE SHAPE: a new re-derive site written without the property at all.
    ['a re-derive site with no harness import fails',
      !evaluate({ 'new.mjs': withSite }).ok],
    ['the finding names the file and the site it found',
      (() => {
        const f = evaluate({ 'new.mjs': withSite }).findings.join(' ');
        return f.includes('new.mjs') && f.includes('observationFromReceipt');
      })()],

    // Half the pair is the subtler regression, and it is the dangerous one.
    ['importing the harness but never calling the paired form fails',
      !evaluate({ 'half.mjs': `import { receiptRoundTrip } from './lib/receipt-roundtrip.mjs';\n${withSite}\nreceiptRoundTrip({});` }).ok],
    ['the paired form satisfies the gate',
      evaluate({ 'good.mjs': `import { receiptRoundTripCases } from './lib/receipt-roundtrip.mjs';\n${withSite}\nreceiptRoundTripCases({});` }).ok],

    ['the harness itself is not required to police itself',
      evaluate({ 'lib/receipt-roundtrip.mjs': withSite }).ok],

    ['both re-derive spellings are recognised',
      reDeriveSites("derive(read(JSON.parse(fs.readFileSync(p))))").length === 1
      && reDeriveSites("fs.writeFileSync(OUT, p);\nread(JSON.parse(fs.readFileSync(OUT, 'utf8')))").length === 1],
    ['a plain receipt read that is not re-derived is not a site',
      reDeriveSites("const cfg = JSON.parse(fs.readFileSync(OUT, 'utf8'));").length === 0],
    // The false positive this gate produced on its own first live run.
    ['re-deriving from a CONFIG file the script never writes is not a round trip',
      reDeriveSites("const r = consolidatedRoutes(JSON.parse(fs.readFileSync(CONSOLIDATION, 'utf8')));").length === 0],
    ['but the same shape IS a round trip once the script also writes that file',
      reDeriveSites("fs.writeFileSync(CONSOLIDATION, x);\nconst r = consolidatedRoutes(JSON.parse(fs.readFileSync(CONSOLIDATION, 'utf8')));").length === 1],
  ];

  // The harness must also actually work — a coverage gate over a broken property
  // would be a gate that guarantees nothing.
  const derive = (o) => ({ a: o.a, b: o.b ?? null });
  const goodRead = (r) => ({ a: r.a, b: r.b });
  const lossyRead = (r) => ({ a: r.a });
  const populated = { a: 1, b: 2 };
  cases.push(
    ['the harness passes a faithful reader',
      harness.receiptRoundTrip({ derive, read: goodRead, populated }).ok],
    ['the harness catches a reader that drops a field, and names it',
      (() => {
        const r = harness.receiptRoundTrip({ derive, read: lossyRead, populated });
        return !r.ok && r.drifted.join(',') === 'b';
      })()],
    ['the liveness proof passes when the reader really restores the field',
      harness.receiptRoundTripCanFail({ derive, read: goodRead, populated, stripField: 'b' }).ok],
    ['the liveness proof fails when the fixture never emitted the stripped field',
      !harness.receiptRoundTripCanFail({ derive, read: goodRead, populated, stripField: 'nope' }).ok],
    ['the paired form returns exactly two rows',
      harness.receiptRoundTripCases({ derive, read: goodRead, populated, stripField: 'b' }).length === 2],
  );

  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'FAIL'} ${name}`);
  console.log(`check-receipt-roundtrip-coverage --self-test: ${cases.length - failed.length}/${cases.length}`);
  process.exit(failed.length ? 1 : 0);
}

const harness = await import('./lib/receipt-roundtrip.mjs');

if (process.argv.includes('--self-test')) selfTest();

const result = evaluate(loadLive());
if (!result.ok) {
  console.error('check-receipt-roundtrip-coverage: FAILED');
  for (const finding of result.findings) console.error(`  x ${finding}`);
  console.error(`\n  Import scripts/${HARNESS} and add ...${PAIRED}({ derive, read, populated, stripField }) to the self-test.`);
  console.error('  A field added to an emitter and forgotten in its reader has reddened production three times on this repo.');
  process.exit(1);
}
console.log(`check-receipt-roundtrip-coverage: ${result.covered} receipt re-derive site(s), all carrying the paired round-trip property`);
