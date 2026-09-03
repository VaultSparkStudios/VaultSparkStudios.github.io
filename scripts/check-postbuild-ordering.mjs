#!/usr/bin/env node
/**
 * check-postbuild-ordering.mjs — S340
 *
 * THE LIVE S338 CASE. `build-news-visual-receipts` hashes each news story's
 * rendered page. It ran at postbuild position 7; `build-shell-assets` rewrites
 * every page's fingerprinted script tags at position 9. On any build that
 * rotated a shell hash the receipt was bound to pre-rotation bytes and was stale
 * BY CONSTRUCTION — and its own error message ("rebuild after news pages") was a
 * workaround for the ordering rather than a fix. Same defect S335 had fixed for
 * `_headers`. Two instances of one class, both found by accident.
 *
 * S339 tried to close the class by classifying the steps from source and was
 * wrong in BOTH directions: page writes go through helpers, so a grep cannot
 * tell a writer from a reader. That is the whole reason this gate is empirical.
 *
 * THE PROPERTY, which names no step and no page:
 *
 *   For every postbuild step S that OBSERVES a rendered page P, no step running
 *   AFTER S may WRITE P.
 *
 * A step OBSERVES P when it reads P and does NOT write P back. That distinction
 * is the whole gate. A page rewriter — `propagate-nav`, `build-shell-assets` —
 * reads every page and writes it straight back; its read is transient and a
 * later rewrite of the same page costs it nothing. An OBSERVER derives something
 * durable from those bytes and keeps it: a hash, a receipt, a manifest. Only the
 * observer can be left holding a value for bytes that no longer exist. Measured
 * live, dropping this distinction reports seven violations of which six are
 * ordinary pipeline transforms.
 *
 * Stated per-page rather than as a global "last writer before first reader", so
 * two steps touching disjoint page sets never accuse each other. Evidence comes
 * from `scripts/lib/postbuild-fs-trace.cjs`, preloaded into each step, which
 * observes the actual fs calls — helper indirection, dynamic paths and all.
 *
 *   node scripts/check-postbuild-ordering.mjs --instrument   # run the chain, record evidence
 *   node scripts/check-postbuild-ordering.mjs --check        # assert the property
 *   node scripts/check-postbuild-ordering.mjs --self-test
 *
 * `--check` on an ABSENT trace reports `unmeasured` and exits 0: this gate must
 * not turn a clean checkout red for never having run the instrument. It reports
 * that it has no evidence rather than that there is no defect — different
 * claims, and a gate must not conflate them.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Routed through lib/safe-spawn.mjs, which forces windowsHide on every call.
// A direct child_process import pops a console window per spawn on Windows and
// is refused by check-windows-hide — which caught this file on its first run,
// while it was already passing `windowsHide: true` by hand. Setting the flag is
// not the contract; going through the one place that cannot forget it is.
import { spawnSync } from './lib/safe-spawn.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TRACE_FILE = path.join(ROOT, '.cache', 'postbuild-fs-trace.ndjson');
const RECEIPT = path.join(ROOT, '.cache', 'postbuild-ordering.json');

const args = process.argv.slice(2);
const INSTRUMENT = args.includes('--instrument');
const SELF_TEST = args.includes('--self-test');

/** The postbuild chain, in order, as package.json actually declares it. */
export function postbuildSteps(pkg) {
  const raw = pkg?.scripts?.postbuild || '';
  return raw
    .split('&&')
    .map((s) => s.trim())
    .map((s) => s.match(/^node\s+(?:--[^\s]+\s+)*scripts\/([a-z0-9][a-z0-9.-]*\.mjs)(.*)$/i))
    .filter(Boolean)
    .map((m) => ({ script: m[1], argv: m[2].trim() }));
}

/**
 * The ordering property. `events` are {step, op, page}; `order` is the step list
 * in execution order.
 */
export function violations(order, events) {
  const idx = new Map();
  order.forEach((s, i) => { if (!idx.has(s)) idx.set(s, i); });

  const readsBy = new Map();   // page -> [stepIndex]
  const writesBy = new Map();  // page -> [stepIndex]
  for (const e of events) {
    const i = idx.get(e.step);
    if (i === undefined) continue;
    const bucket = e.op === 'write' ? writesBy : readsBy;
    if (!bucket.has(e.page)) bucket.set(e.page, []);
    bucket.get(e.page).push(i);
  }

  const found = [];
  for (const [page, readers] of readsBy) {
    const writers = writesBy.get(page) || [];
    for (const r of readers) {
      // A step that writes back the page it read is transforming it, not
      // observing it. Nothing durable of its survives the read, so a later
      // rewrite cannot strand it.
      if (writers.includes(r)) continue;
      const later = writers.filter((w) => w > r);
      if (!later.length) continue;
      const w = Math.min(...later);
      found.push({ page, reader: order[r], readerIndex: r, writer: order[w], writerIndex: w });
    }
  }
  // One row per (reader, writer) pair — a shell rotation touches 137 pages and
  // the operator needs the pair, not 137 copies of it.
  const byPair = new Map();
  for (const v of found) {
    const key = `${v.reader}|${v.writer}`;
    if (!byPair.has(key)) byPair.set(key, { ...v, pages: 0, sample: v.page });
    byPair.get(key).pages += 1;
  }
  return [...byPair.values()].sort((a, b) => b.pages - a.pages);
}

function readTrace() {
  if (!fs.existsSync(TRACE_FILE)) return null;
  const out = [];
  for (const line of fs.readFileSync(TRACE_FILE, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* a torn last line is not a defect */ }
  }
  return out;
}

function instrument() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const steps = postbuildSteps(pkg);
  fs.mkdirSync(path.dirname(TRACE_FILE), { recursive: true });
  fs.writeFileSync(TRACE_FILE, '');

  const preload = path.join(ROOT, 'scripts', 'lib', 'postbuild-fs-trace.cjs');
  console.log(`> instrumenting ${steps.length} postbuild steps`);
  const order = [];
  for (const [i, step] of steps.entries()) {
    order.push(step.script);
    const argv = step.argv ? step.argv.split(/\s+/).filter(Boolean) : [];
    const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', step.script), ...argv], {
      cwd: ROOT,
      encoding: 'utf8',
      windowsHide: true,
      env: {
        ...process.env,
        NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --require ${JSON.stringify(preload)}`.trim(),
        VS_FS_TRACE: TRACE_FILE,
        VS_FS_TRACE_STEP: step.script,
        VS_FS_TRACE_ROOT: ROOT,
      },
    });
    const mark = r.status === 0 ? 'ok  ' : 'FAIL';
    console.log(`  ${mark} ${String(i + 1).padStart(2)}. ${step.script}${r.status === 0 ? '' : `  (exit ${r.status})`}`);
    if (r.status !== 0) {
      console.error(`       ${(r.stderr || '').trim().split('\n').slice(-3).join('\n       ')}`);
    }
  }
  fs.writeFileSync(RECEIPT, JSON.stringify({
    schemaVersion: '1.0',
    generatedBy: 'scripts/check-postbuild-ordering.mjs --instrument',
    generatedAt: new Date().toISOString(),
    order,
  }, null, 2) + '\n');
  console.log(`\ntrace -> ${path.relative(ROOT, TRACE_FILE)}`);
}

function check() {
  const events = readTrace();
  if (!events || !fs.existsSync(RECEIPT)) {
    console.log('. check-postbuild-ordering: unmeasured — no trace in this tree.');
    console.log('  evidence: node scripts/check-postbuild-ordering.mjs --instrument');
    return 0;
  }
  const { order } = JSON.parse(fs.readFileSync(RECEIPT, 'utf8'));
  const bad = violations(order, events);
  const pages = new Set(events.map((e) => e.page)).size;
  const readers = new Set(events.filter((e) => e.op === 'read').map((e) => e.step)).size;
  const writers = new Set(events.filter((e) => e.op === 'write').map((e) => e.step)).size;

  if (bad.length) {
    console.error('x check-postbuild-ordering: a step reads rendered pages that a LATER step rewrites.');
    console.error('  Anything it derived from those bytes is stale by construction, on every build');
    console.error('  that changes them — and it reads exactly like a receipt that passed.');
    for (const v of bad) {
      console.error(`    · ${v.reader} (#${v.readerIndex + 1}) reads ${v.pages} page(s) that ${v.writer} (#${v.writerIndex + 1}) rewrites`);
      console.error(`      e.g. ${v.sample}`);
    }
    console.error('  fix: move the reader after the last writer in package.json postbuild.');
    return 1;
  }
  console.log(`✓ check-postbuild-ordering: ${order.length} steps · ${pages} rendered pages observed · ${writers} writer(s), ${readers} reader(s) · no reader precedes a later writer`);
  return 0;
}

function selfTest() {
  const cases = [];
  const order = ['a.mjs', 'b.mjs', 'c.mjs'];

  // The live D-S338.4 shape: a reader at 0, a writer at 2.
  let v = violations(order, [
    { step: 'a.mjs', op: 'read', page: 'news/x/index.html' },
    { step: 'c.mjs', op: 'write', page: 'news/x/index.html' },
  ]);
  cases.push(['reader before a later writer is a violation', v.length === 1 && v[0].reader === 'a.mjs' && v[0].writer === 'c.mjs']);

  // Correct order: writer first, reader last.
  v = violations(order, [
    { step: 'a.mjs', op: 'write', page: 'p/index.html' },
    { step: 'c.mjs', op: 'read', page: 'p/index.html' },
  ]);
  cases.push(['reader after the writer is clean', v.length === 0]);

  // Disjoint page sets must never accuse each other.
  v = violations(order, [
    { step: 'a.mjs', op: 'read', page: 'one/index.html' },
    { step: 'c.mjs', op: 'write', page: 'two/index.html' },
  ]);
  cases.push(['disjoint pages do not collide', v.length === 0]);

  // A step that rewrites what it read is not a violation of itself.
  v = violations(order, [
    { step: 'b.mjs', op: 'read', page: 'p/index.html' },
    { step: 'b.mjs', op: 'write', page: 'p/index.html' },
  ]);
  cases.push(['a step rewriting what it read is not a violation', v.length === 0]);

  // THE TRANSFORM EXCLUSION, and the reason it must be per-page. A rewriter
  // reads and writes P; a LATER step also writes P. That is an ordinary
  // pipeline, not a stranded receipt.
  v = violations(order, [
    { step: 'a.mjs', op: 'read', page: 'p/index.html' },
    { step: 'a.mjs', op: 'write', page: 'p/index.html' },
    { step: 'c.mjs', op: 'write', page: 'p/index.html' },
  ]);
  cases.push(['a transform followed by a later rewriter is clean', v.length === 0]);

  // ...but the exclusion must not launder a real observer. Same shape, except
  // the reader writes a DIFFERENT page, so it kept something derived from P.
  v = violations(order, [
    { step: 'a.mjs', op: 'read', page: 'p/index.html' },
    { step: 'a.mjs', op: 'write', page: 'other/index.html' },
    { step: 'c.mjs', op: 'write', page: 'p/index.html' },
  ]);
  cases.push(['writing a different page does not excuse observing P', v.length === 1 && v[0].sample === 'p/index.html']);

  // A shell rotation touches many pages; the operator gets one row per pair.
  v = violations(order, [
    ...Array.from({ length: 137 }, (_, i) => ({ step: 'a.mjs', op: 'read', page: `p${i}/index.html` })),
    ...Array.from({ length: 137 }, (_, i) => ({ step: 'c.mjs', op: 'write', page: `p${i}/index.html` })),
  ]);
  cases.push(['many pages collapse to one pair row with a count', v.length === 1 && v[0].pages === 137]);

  // Events naming a step outside the recorded order are ignored, not crashed on.
  v = violations(order, [{ step: 'ghost.mjs', op: 'read', page: 'p/index.html' }]);
  cases.push(['unknown step is ignored', v.length === 0]);

  // The chain parser must read package.json's real shape, flags and all.
  const steps = postbuildSteps({ scripts: { postbuild: 'node scripts/one.mjs && node scripts/two.mjs --apply && echo hi' } });
  cases.push(['chain parses scripts in order', steps.length === 2 && steps[0].script === 'one.mjs' && steps[1].script === 'two.mjs']);
  cases.push(['chain preserves step argv', steps[1].argv === '--apply']);
  cases.push(['a non-node step is not treated as a step', steps.every((s) => s.script.endsWith('.mjs'))]);

  let failed = 0;
  for (const [name, ok] of cases) {
    if (!ok) failed++;
    console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  }
  console.log(`\n${cases.length - failed}/${cases.length} self-tests passing`);
  return failed ? 1 : 0;
}

if (SELF_TEST) process.exit(selfTest());
else if (INSTRUMENT) { instrument(); process.exit(0); }
else process.exit(check());
