import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { spawnSync } from '../scripts/lib/safe-spawn.mjs';
import { beginVisualCapture, createVisualCaptureDirectory, writeVisualCapture, sealVisualCapture } from '../scripts/lib/visual-capture-provenance.mjs';

const root = path.resolve(import.meta.dirname, '..');

function fixture() {
  const dir = fs.mkdtempSync(path.join(root, '.cache', 'theme-provenance-'));
  for (const sub of ['scripts/lib', 'assets/desk-personas', 'assets/og/news', 'api', 'raw']) fs.mkdirSync(path.join(dir, sub), { recursive: true });
  for (const file of ['scripts/capture-theme-matrix.mjs', 'scripts/lib/visual-capture-provenance.mjs', 'scripts/lib/mobile-runtime-contract.cjs', 'scripts/lib/artifact-io.mjs']) fs.copyFileSync(path.join(root, file), path.join(dir, file));
  fs.writeFileSync(path.join(dir, 'assets/style.css'), 'body{color:white}');
  fs.writeFileSync(path.join(dir, 'index.html'), '<h1>Original capture fixture</h1>');
  fs.writeFileSync(path.join(dir, 'api/candidate-artifact-manifest.json'), JSON.stringify({ candidateSha: 'a'.repeat(40), root: 'a'.repeat(64) }));
  const files = ['assets/style.css', 'index.html', 'scripts/capture-theme-matrix.mjs', 'scripts/lib/visual-capture-provenance.mjs'];
  const provenance = beginVisualCapture(dir, files, 'scripts/capture-theme-matrix.mjs');
  const raw = path.join(dir, 'raw', provenance.runId); fs.mkdirSync(raw);
  const file = 'home--dark--desktop.png';
  const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZV8AAAAASUVORK5CYII=', 'base64');
  const sha256 = writeVisualCapture(path.join(raw, file), bytes);
  const shot = { route: '/', theme: 'dark', observedTheme: { stored: 'dark', root: 'dark', body: 'dark' }, viewport: 'desktop', state: 'page', file, sha256, capturedAt: new Date().toISOString() };
  const sealed = sealVisualCapture(dir, raw, provenance, [shot], files);
  const receiptDir = path.join(dir, 'docs/visual-qa'); fs.mkdirSync(receiptDir, { recursive: true });
  const latest = path.join(receiptDir, 'LATEST.json'), old = Buffer.from('{"historical":"exact prior receipt bytes"}\r\n'); fs.writeFileSync(latest, old);
  return { dir, raw, files, provenance, shot, sealed, bytes, latest, old, receiptDir };
}
function runReceipt(f, nodeArgs = []) {
  return spawnSync(process.execPath, [...nodeArgs, path.join(f.dir, 'scripts/capture-theme-matrix.mjs'), '--out', f.raw, '--receipt-only'], { cwd: f.dir, encoding: 'utf8', windowsHide: true, timeout: 15000 });
}
function dispose(f) { assert.ok(f.dir.startsWith(path.join(root, '.cache') + path.sep)); fs.rmSync(f.dir, { recursive: true, force: true }); }

test('actual receipt-only writer preserves capture-time bindings, immutable images and exact LATEST preimage', () => {
  const f = fixture();
  try {
    const result = runReceipt(f); assert.equal(result.status, 0, result.stderr);
    const receipt = JSON.parse(fs.readFileSync(f.latest));
    assert.deepEqual(receipt.source, f.provenance.source); assert.deepEqual(receipt.candidate, f.provenance.candidate);
    assert.equal(receipt.capturedAt, f.sealed.capturedAt);
    assert.equal(receipt.captures[0].file, f.provenance.runId + '--' + f.shot.file);
    assert.deepEqual(fs.readFileSync(path.join(f.receiptDir, receipt.captures[0].file)), f.bytes);
    const archive = fs.readdirSync(f.receiptDir).find(n => n.startsWith('history--LATEST--'));
    assert.deepEqual(fs.readFileSync(path.join(f.receiptDir, archive)), f.old);
    assert.equal(receipt.inspection.renderedPixelsReviewed, false); assert.equal(receipt.captures[0].inspection.mode, 'automated-only');
    // Same run can gain an explicit later review without ever rewriting its originals.
    const before = fs.statSync(path.join(f.receiptDir, receipt.captures[0].file)).mtimeMs;
    assert.equal(runReceipt(f).status, 0);
    assert.equal(fs.statSync(path.join(f.receiptDir, receipt.captures[0].file)).mtimeMs, before);
  } finally { dispose(f); }
});

test('actual receipt-only writer rejects the demonstrated stale-source rebinding exploit before publication', () => {
  const f = fixture();
  try {
    fs.writeFileSync(path.join(f.dir, 'assets/style.css'), 'body{color:black}');
    const result = runReceipt(f); assert.equal(result.status, 1); assert.match(result.stderr, /source\/candidate drift/);
    assert.deepEqual(fs.readFileSync(f.latest), f.old); assert.deepEqual(fs.readdirSync(f.receiptDir), ['LATEST.json']);
  } finally { dispose(f); }
});

for (const defect of ['missing provenance', 'candidate drift', 'image mismatch', 'image hash missing']) {
  test(`actual receipt-only writer refuses ${defect} without copying or replacing evidence`, () => {
    const f = fixture();
    try {
      if (defect === 'candidate drift') fs.writeFileSync(path.join(f.dir, 'api/candidate-artifact-manifest.json'), JSON.stringify({ candidateSha: 'b'.repeat(40), root: 'b'.repeat(64) }));
      if (defect === 'image mismatch') fs.writeFileSync(path.join(f.raw, f.shot.file), Buffer.from('changed image'));
      if (defect === 'missing provenance' || defect === 'image hash missing') {
        const manifest = structuredClone(f.sealed);
        if (defect === 'missing provenance') delete manifest.captureProvenance; else delete manifest.shots[0].sha256;
        fs.writeFileSync(path.join(f.raw, 'manifest.json'), JSON.stringify(manifest));
      }
      const result = runReceipt(f); assert.equal(result.status, 1, result.stdout);
      assert.deepEqual(fs.readFileSync(f.latest), f.old); assert.deepEqual(fs.readdirSync(f.receiptDir), ['LATEST.json']);
    } finally { dispose(f); }
  });
}

test('immutable destination collision preserves both existing PNG and LATEST byte-for-byte', () => {
  const f = fixture();
  try {
    const dest = path.join(f.receiptDir, f.provenance.runId + '--' + f.shot.file), collision = Buffer.from('owned historical collision');
    fs.writeFileSync(dest, collision);
    const result = runReceipt(f); assert.equal(result.status, 1); assert.match(result.stderr, /destination collision/);
    assert.deepEqual(fs.readFileSync(dest), collision); assert.deepEqual(fs.readFileSync(f.latest), f.old);
    assert.equal(fs.readdirSync(f.receiptDir).length, 2);
  } finally { dispose(f); }
});

test('capture-end drift and exclusive original writes fail without rewriting the original', () => {
  const f = fixture();
  try {
    assert.throws(() => writeVisualCapture(path.join(f.raw, f.shot.file), Buffer.from('replacement')), /EEXIST/);
    assert.deepEqual(fs.readFileSync(path.join(f.raw, f.shot.file)), f.bytes);
    const next = beginVisualCapture(f.dir, f.files, 'scripts/capture-theme-matrix.mjs'), raw = path.join(f.dir, 'raw', next.runId); fs.mkdirSync(raw);
    writeVisualCapture(path.join(raw, f.shot.file), f.bytes);
    fs.writeFileSync(path.join(f.dir, 'index.html'), '<h1>Changed during capture</h1>');
    assert.throws(() => sealVisualCapture(f.dir, raw, next, [f.shot], f.files), /source\/candidate drift/);
    assert.equal(fs.existsSync(path.join(raw, 'manifest.json')), false); assert.deepEqual(fs.readFileSync(f.latest), f.old);
  } finally { dispose(f); }
});

test('an existing publication lock cannot be bypassed or removed by another receipt writer', () => {
  const f = fixture();
  try {
    const lock = path.join(f.receiptDir, '.capture-publication.lock'); fs.writeFileSync(lock, 'another writer');
    const result = runReceipt(f); assert.equal(result.status, 1); assert.match(result.stderr, /EEXIST/);
    assert.equal(fs.readFileSync(lock, 'utf8'), 'another writer'); assert.deepEqual(fs.readFileSync(f.latest), f.old);
    assert.equal(fs.readdirSync(f.receiptDir).filter(n => n.endsWith('.png')).length, 0);
  } finally { dispose(f); }
});

test('actual receipt-only writer preserves a manual-review pointer update made during PNG publication', () => {
  const f = fixture();
  try {
    const updated = '{"manualReview":"concurrent review must survive"}\n';
    const preload = path.join(f.dir, 'inject-concurrent-review.mjs');
    fs.writeFileSync(preload, `import fs from 'node:fs';
const original=fs.writeFileSync;
let injected=false;
fs.writeFileSync=function(file,...args){
 if(!injected && String(file).includes('visual-qa') && String(file).endsWith('.png')){
  injected=true; original(${JSON.stringify(f.latest)},${JSON.stringify(updated)});
 }
 return original.call(this,file,...args);
};\n`);
    const result = runReceipt(f, ['--import', pathToFileURL(preload).href]);
    assert.equal(result.status, 1); assert.match(result.stderr, /Receipt pointer changed/);
    assert.equal(fs.readFileSync(f.latest, 'utf8'), updated);
    assert.equal(fs.existsSync(path.join(f.receiptDir, '.capture-publication.lock')), false);
  } finally { dispose(f); }
});

for (const writer of ['record-visual-review.mjs', 'commit-visual-review-receipt.mjs']) {
  test(`canonical ${writer} refuses another publisher lock without altering it or LATEST`, () => {
    const f = fixture();
    try {
      const lock = path.join(f.receiptDir, '.capture-publication.lock'); fs.writeFileSync(lock, 'another publisher');
      const args = writer.startsWith('record-') ? ['--all', '--reviewer', 'synthetic-test'] : ['--input', f.raw, '--reviewer', 'synthetic-test'];
      const result = spawnSync(process.execPath, [path.join(root, 'scripts', writer), ...args], { cwd: f.dir, encoding: 'utf8', windowsHide: true, timeout: 15000 });
      assert.equal(result.status, 1); assert.match(result.stderr, /EEXIST/);
      assert.equal(fs.readFileSync(lock, 'utf8'), 'another publisher'); assert.deepEqual(fs.readFileSync(f.latest), f.old);
      assert.equal(fs.readdirSync(f.receiptDir).filter(n => n.endsWith('.png')).length, 0);
    } finally { dispose(f); }
  });
}

test('canonical manual review holds shared transaction lock and releases on success or invalid selection', () => {
  const f = fixture();
  try {
    assert.equal(runReceipt(f).status, 0);
    const before = JSON.parse(fs.readFileSync(f.latest));
    const run = args => spawnSync(process.execPath, [path.join(root, 'scripts/record-visual-review.mjs'), ...args, '--reviewer', 'synthetic-test'], { cwd: f.dir, encoding: 'utf8', windowsHide: true, timeout: 15000 });
    assert.equal(run(['--all']).status, 0);
    const after = JSON.parse(fs.readFileSync(f.latest));
    assert.deepEqual(after.source, before.source); assert.deepEqual(after.candidate, before.candidate);
    assert.equal(after.captures[0].inspection.mode, 'manual');
    assert.equal(fs.existsSync(path.join(f.receiptDir, '.capture-publication.lock')), false);
    const bytes = fs.readFileSync(f.latest);
    assert.equal(run(['--files', 'unknown.png']).status, 1);
    assert.deepEqual(fs.readFileSync(f.latest), bytes);
    assert.equal(fs.existsSync(path.join(f.receiptDir, '.capture-publication.lock')), false);
  } finally { dispose(f); }
});

for (const contended of [true, false]) {
  test(`canonical journey writer ${contended ? 'rejects foreign lock before browser load' : 'releases its lock after browser-load failure'}`, () => {
    const f = fixture();
    try {
      const lock = path.join(f.receiptDir, '.capture-publication.lock');
      if (contended) fs.writeFileSync(lock, 'another publisher');
      const original = path.join(f.receiptDir, 'journey-dark-desktop.png'); fs.writeFileSync(original, f.bytes);
      const preload = path.join(f.dir, 'forbid-journey-browser.mjs');
      fs.writeFileSync(preload, `import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){
 if(specifier==='@playwright/test') throw Error('JOURNEY_BROWSER_LOAD_PROBE');
 return next(specifier,context);
}});\n`);
      const result = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, path.join(root, 'scripts/capture-journey-visual-proof.mjs')], { cwd: f.dir, encoding: 'utf8', windowsHide: true, timeout: 15000 });
      assert.equal(result.status, 1);
      if (contended) {
        assert.match(result.stderr, /EEXIST/); assert.doesNotMatch(result.stderr, /JOURNEY_BROWSER_LOAD_PROBE/);
        assert.equal(fs.readFileSync(lock, 'utf8'), 'another publisher');
        assert.equal(fs.existsSync(path.join(f.dir, '.cache/journey-visual')), false);
      } else {
        assert.match(result.stderr, /JOURNEY_BROWSER_LOAD_PROBE/);
        assert.equal(fs.existsSync(lock), false);
      }
      assert.deepEqual(fs.readFileSync(original), f.bytes); assert.deepEqual(fs.readFileSync(f.latest), f.old);
    } finally { dispose(f); }
  });
}

test('a fresh run publishes new names while retaining the first run images and exact archived receipt', () => {
  const f = fixture();
  try {
    assert.equal(runReceipt(f).status, 0);
    const prior = fs.readFileSync(f.latest), first = JSON.parse(prior), firstImage = path.join(f.receiptDir, first.captures[0].file);
    const next = beginVisualCapture(f.dir, f.files, 'scripts/capture-theme-matrix.mjs');
    const raw = createVisualCaptureDirectory(f.dir, path.join(f.dir, 'second'), next);
    assert.notEqual(raw, f.raw);
    const pixels = Buffer.concat([f.bytes, Buffer.from('second synthetic capture')]);
    const sha256 = writeVisualCapture(path.join(raw, f.shot.file), pixels);
    sealVisualCapture(f.dir, raw, next, [{ ...f.shot, sha256 }], f.files);
    assert.equal(runReceipt({ ...f, raw }).status, 0);
    const second = JSON.parse(fs.readFileSync(f.latest));
    assert.notEqual(second.captures[0].file, first.captures[0].file);
    assert.deepEqual(fs.readFileSync(firstImage), f.bytes);
    const digest = crypto.createHash('sha256').update(prior).digest('hex');
    assert.deepEqual(fs.readFileSync(path.join(f.receiptDir, `history--LATEST--${digest}.json`)), prior);
    assert.equal(second.inspection.renderedPixelsReviewed, false);
  } finally { dispose(f); }
});

test('corrupt preimage archive is refused before any new PNG or receipt write', () => {
  const f = fixture();
  try {
    const digest = crypto.createHash('sha256').update(f.old).digest('hex');
    const archive = path.join(f.receiptDir, `history--LATEST--${digest}.json`);
    fs.writeFileSync(archive, 'corrupt existing archive');
    const result = runReceipt(f); assert.equal(result.status, 1); assert.match(result.stderr, /preimage archive collision/);
    assert.deepEqual(fs.readFileSync(f.latest), f.old); assert.equal(fs.readFileSync(archive, 'utf8'), 'corrupt existing archive');
    assert.equal(fs.readdirSync(f.receiptDir).filter(n => n.endsWith('.png')).length, 0);
  } finally { dispose(f); }
});

test('run creation rejects foreign output paths and existing run-directory collisions', () => {
  const f = fixture();
  try {
    assert.throws(() => createVisualCaptureDirectory(f.dir, path.dirname(f.dir), f.provenance), /inside its project/);
    const base = path.join(f.dir, 'exclusive-run'); createVisualCaptureDirectory(f.dir, base, f.provenance);
    assert.throws(() => createVisualCaptureDirectory(f.dir, base, f.provenance), /EEXIST/);
    assert.deepEqual(fs.readFileSync(f.latest), f.old);
  } finally { dispose(f); }
});

test('receipt-only validation does not resolve the browser runtime', () => {
  const dir = fs.mkdtempSync(path.join(root, '.cache', 'theme-receipt-isolation-'));
  const receiptName = path.basename(dir) + '.json';
  const receipt = path.join(root, 'docs/visual-qa', receiptName);
  try {
    const preload = path.join(dir, 'forbid-browser.mjs');
    fs.writeFileSync(preload, `import {registerHooks} from 'node:module';
registerHooks({resolve(specifier, context, next) {
  if (specifier === '@playwright/test') throw Error('RECEIPT_ONLY_BROWSER_RUNTIME_LOADED');
  return next(specifier, context);
}});`);
    fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ shots: [{
      route: '/', theme: 'dark', viewport: 'desktop', state: 'page', file: 'not-a-real-capture.png',
    }] }));
    const result = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href,
      path.join(root, 'scripts/capture-theme-matrix.mjs'), '--out', dir, '--receipt-only', '--receipt-name', receiptName],
    { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 15000 });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /Theme evidence missing/);
    assert.doesNotMatch(result.stderr, /RECEIPT_ONLY_BROWSER_RUNTIME_LOADED/);
    assert.equal(fs.existsSync(receipt), false);
  } finally {
    if (fs.existsSync(receipt)) fs.unlinkSync(receipt);
    assert.ok(dir.startsWith(path.join(root, '.cache') + path.sep));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test('actual receipt-only CLI refuses missing and mismatched observed themes before copying files', () => {
  const dir = fs.mkdtempSync(path.join(root, '.cache', 'theme-receipt-negative-'));
  const receiptName = path.basename(dir) + '.json';
  const receipt = path.join(root, 'docs/visual-qa', receiptName);
  try {
    for (const observedTheme of [undefined, { stored: 'light', root: 'dark', body: 'dark' }]) {
      const shot = { route: '/leaderboards/call-of-doodie/', theme: 'light', viewport: 'desktop',
        state: 'page', file: 'not-a-real-capture.png', observedTheme };
      fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ shots: [shot] }));
      const result = spawnSync(process.execPath, [path.join(root, 'scripts/capture-theme-matrix.mjs'),
        '--out', dir, '--receipt-only', '--receipt-name', receiptName],
      { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 15000 });
      assert.equal(result.status, 1, result.stdout);
      assert.match(result.stderr, observedTheme ? /Theme evidence mismatch/ : /Theme evidence missing/);
      assert.equal(fs.existsSync(receipt), false);
    }
  } finally {
    if (fs.existsSync(receipt)) fs.unlinkSync(receipt);
    assert.ok(dir.startsWith(path.join(root, '.cache') + path.sep));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
