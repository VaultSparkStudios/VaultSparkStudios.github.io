#!/usr/bin/env node
/**
 * rebind-mobile-receipt.mjs — S357.
 *
 * Re-stamps docs/mobile-audit/receipt.json against the CURRENT candidate
 * manifest, without re-running the 215-cell Playwright audit.
 *
 * WHY THIS EXISTS. check-receipt-ordering rejects a receipt whose
 * `candidate.candidateSha` differs from the final candidate manifest — correctly,
 * because a receipt only proves the bytes it observed. But the candidate sha is
 * METADATA: it moves every time the manifest is rebuilt, which happens on every
 * `npm run build`, which happens after every publisher rebase. The visual
 * receipt has had a rebind path for this since S303
 * (`capture-theme-matrix --receipt-only`); the mobile receipt never did, so the
 * only way to clear a pure metadata mismatch was a ~7-minute re-run of an audit
 * whose findings had not changed. Measured live in S357: three separate rebases,
 * three full re-runs, identical 215/215 results each time.
 *
 * WHAT IT WILL NOT DO. It never fabricates evidence:
 *   - The records come from the real audit's docs/mobile-audit/findings.jsonl.
 *   - Every capture hash is recomputed from the PNG actually on disk.
 *   - The source binding is recomputed from the current files, and if any bound
 *     source changed since the audit ran, that is a genuinely stale receipt, so
 *     this REFUSES and tells you to re-run the audit.
 *   - It imports the same lib the spec uses, so the two cannot drift.
 *
 * Usage:
 *   node scripts/rebind-mobile-receipt.mjs            # rebind, or refuse
 *   node scripts/rebind-mobile-receipt.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PAGES, VIEWPORTS, candidateBinding, sourceBinding, validateReceipt } = require('./lib/mobile-runtime-contract.cjs');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'docs', 'mobile-audit');
const RECEIPT = path.join(OUT_DIR, 'receipt.json');
const FINDINGS = path.join(OUT_DIR, 'findings.jsonl');

/** The spec's SOURCE_FILES list, read from the spec itself so it cannot drift. */
export function specSourceFiles(specText, pages = PAGES) {
  const block = specText.slice(specText.indexOf('const SOURCE_FILES = ['));
  const literal = block.slice(0, block.indexOf('].filter('));
  // The literal also contains the inline `page.url === '/'` comparison, so a bare
  // quoted-string match picks up '/' and any read of it throws EISDIR. Keep only
  // strings that name an actual FILE.
  const listed = [...literal.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const derived = pages.map((page) => (page.url === '/' ? 'index.html' : `${page.url.slice(1)}index.html`));
  const isFile = (file) => {
    const abs = path.join(ROOT, file);
    try { return fs.statSync(abs).isFile(); } catch { return false; }
  };
  return [...new Set([...listed, ...derived])].filter(isFile);
}

function readRecords() {
  return fs.readFileSync(FINDINGS, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

export function rebind({ prior, records, sourceFiles, root = ROOT }) {
  const source = sourceBinding(root, sourceFiles);
  // A changed source means the receipt is stale for real, not just re-stamped.
  if (prior?.source?.sha256 && prior.source.sha256 !== source.sha256) {
    const changed = (prior.source.entries || [])
      .filter((entry) => {
        const abs = path.join(root, entry.path);
        if (!fs.existsSync(abs)) return true;
        return crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex') !== entry.sha256;
      })
      .map((entry) => entry.path);
    return { ok: false, changed, reason: 'a bound source changed since the audit ran — re-run the audit, do not rebind' };
  }
  // Mirrors the spec's own filter exactly: 40 of the 215 cells (ipad-portrait)
  // record no screenshot, so the receipt carries 175 captures against 215
  // completed probes. Dropping that filter here produced a null path.
  const captures = records.filter((record) => record.screenshot).map((record) => ({
    route: record.url,
    viewport: record.viewport,
    theme: record.theme || 'runtime-default',
    file: record.screenshot,
    sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, record.screenshot))).digest('hex'),
  }));
  const receipt = {
    schemaVersion: 1,
    // Preserved: this is when the pixels were observed, not when they were re-stamped.
    generatedAt: prior?.generatedAt || new Date().toISOString(),
    rebound: { at: new Date().toISOString(), by: 'scripts/rebind-mobile-receipt.mjs', note: 'candidate metadata re-stamped; records and pixel hashes unchanged' },
    review: prior?.review || { mode: 'automated-only', renderedPixelsReviewed: false },
    source,
    candidate: candidateBinding(root),
    matrix: {
      routes: PAGES, viewports: VIEWPORTS, themes: ['runtime-default'],
      expectedProbes: PAGES.length * VIEWPORTS.length, completedProbes: records.length,
    },
    captures,
  };
  return { ok: true, receipt };
}

function selfTest() {
  const cases = [];
  const t = (name, ok) => cases.push([name, Boolean(ok)]);
  const spec = fs.readFileSync(path.join(ROOT, 'tests', 'mobile-audit.spec.js'), 'utf8');
  const files = specSourceFiles(spec);
  t('source list is parsed from the spec, not copied', files.includes('assets/style.css') && files.includes('tests/mobile-audit.spec.js'));
  t('page-derived sources are included', files.includes('index.html'));
  t('every listed source exists', files.every((f) => fs.existsSync(path.join(ROOT, f))));
  // A changed source must REFUSE rather than re-stamp.
  const refused = rebind({
    prior: { source: { sha256: 'deadbeef', entries: [{ path: 'index.html', sha256: 'not-the-real-hash' }] } },
    records: [], sourceFiles: files,
  });
  t('a changed bound source refuses the rebind', refused.ok === false && /re-run the audit/.test(refused.reason));
  t('the refusal names what changed', Array.isArray(refused.changed) && refused.changed.includes('index.html'));
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
  console.log(`rebind-mobile-receipt --self-test: ${cases.length - failed.length}/${cases.length}`);
  process.exitCode = failed.length ? 1 : 0;
}

if (process.argv.includes('--self-test')) {
  selfTest();
} else {
  if (!fs.existsSync(RECEIPT) || !fs.existsSync(FINDINGS)) {
    console.error('rebind-mobile-receipt: no prior receipt or findings — run the mobile audit first');
    process.exitCode = 1;
  } else {
    const prior = JSON.parse(fs.readFileSync(RECEIPT, 'utf8'));
    const spec = fs.readFileSync(path.join(ROOT, 'tests', 'mobile-audit.spec.js'), 'utf8');
    const result = rebind({ prior, records: readRecords(), sourceFiles: specSourceFiles(spec) });
    if (!result.ok) {
      console.error(`rebind-mobile-receipt: REFUSED — ${result.reason}`);
      for (const file of result.changed.slice(0, 10)) console.error(`  - ${file}`);
      process.exitCode = 1;
    } else {
      const problems = validateReceipt(result.receipt, { root: ROOT, records: readRecords() });
      if (problems.length) {
        console.error('rebind-mobile-receipt: rebound receipt fails its own contract — not written');
        for (const problem of problems.slice(0, 10)) console.error(`  - ${problem}`);
        process.exitCode = 1;
      } else {
        fs.writeFileSync(RECEIPT, JSON.stringify(result.receipt, null, 2) + '\n');
        console.log(`rebind-mobile-receipt: re-stamped to candidate ${result.receipt.candidate.candidateSha.slice(0, 12)} · ${result.receipt.captures.length} capture(s), pixel hashes unchanged`);
      }
    }
  }
}
