// public-contract-libs.unit.spec.js — pure-function coverage for three untested
// scripts/lib modules that gate what reaches public surfaces and receipts:
//   public-oracle-text.mjs     (operator-vocabulary scrub on the public Oracle feed)
//   json-schema-lite.mjs       (contract validator behind project-status/agent-dna checks)
//   proof-source-manifest.mjs  (byte identity a full-suite receipt certifies)
// Run: node --test tests/public-contract-libs.unit.spec.js
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  sanitizePublicOracleText,
  sanitizePublicOracleFeed,
} from '../scripts/lib/public-oracle-text.mjs';
import { validateJsonSchema } from '../scripts/lib/json-schema-lite.mjs';
import {
  buildProofSourceManifest,
  validateProofSourceManifest,
  diffProofSourceManifests,
  formatProofSourceDiff,
} from '../scripts/lib/proof-source-manifest.mjs';

// ── public-oracle-text ───────────────────────────────────────────────────────

test('oracle text: operator vocabulary is rewritten to public voice', () => {
  const cases = [
    ['Clear 2 blockers before commit counts drop; Human Action Required on internal scoring',
      'Clear 2 friction points before signal counts drop; Founder review needed on studio scoring'],
    ['HUMAN ACTION: operator vocabulary', 'FOUNDER REVIEW: studio vocabulary'],
    ['human-blocked by the operator', 'founder-review by the studio'],
    ['1 commit, 1 blocker', '1 signal, 1 friction point'],
    ['blocker count rising', 'friction signals rising'],
  ];
  for (const [input, expected] of cases) assert.equal(sanitizePublicOracleText(input), expected, input);
});

test('oracle text: word boundaries protect ordinary words (negative control)', () => {
  const benign = 'recommitted internally by cooperators; blockership';
  assert.equal(sanitizePublicOracleText(benign), benign);
});

test('oracle text: idempotent and non-strings pass through untouched', () => {
  const once = sanitizePublicOracleText('internal blockers need HUMAN ACTION');
  assert.equal(sanitizePublicOracleText(once), once);
  for (const v of [null, undefined, 42, true]) assert.equal(sanitizePublicOracleText(v), v);
});

test('oracle feed: projects + voices + evidence are scrubbed without mutating the input', () => {
  const deepFreeze = (o) => { Object.values(o).forEach((v) => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o); };
  const feed = deepFreeze({
    generatedAt: '2026-09-14',
    projects: [{ slug: 'x', currentFocus: 'internal blockers', nextMilestone: 'ship commits', voice: { quote: 'operator says hi', tone: 'internal', evidence: { regimeRationale: 'Human Action Required', topRecommendation: 'clear blocker' } } }],
    voices: { y: { quote: 'commit counts up', tone: 'calm' } },
  });
  const out = sanitizePublicOracleFeed(feed);
  assert.equal(out.generatedAt, '2026-09-14');
  assert.equal(out.projects[0].slug, 'x');
  assert.equal(out.projects[0].currentFocus, 'studio-side friction points');
  assert.equal(out.projects[0].nextMilestone, 'ship signals');
  assert.equal(out.projects[0].voice.quote, 'studio says hi');
  assert.equal(out.projects[0].voice.tone, 'studio-side');
  assert.equal(out.projects[0].voice.evidence.regimeRationale, 'Founder review needed');
  assert.equal(out.projects[0].voice.evidence.topRecommendation, 'clear friction point');
  assert.equal(out.voices.y.quote, 'signal counts up');
  assert.equal(feed.projects[0].currentFocus, 'internal blockers', 'input not mutated');
  const leak = JSON.stringify(out);
  assert.ok(!/\b(internal|operator|blockers?|commits?|HUMAN)\b/i.test(leak.replace(/"(slug|generatedAt)":"[^"]*"/g, '')), leak);
});

// ── json-schema-lite ─────────────────────────────────────────────────────────

const STATUS_SCHEMA = {
  type: 'object',
  required: ['status', 'lastUpdated'],
  additionalProperties: false,
  properties: {
    status: { enum: ['FORGE', 'SPARKED', 'VAULTED'] },
    lastUpdated: { type: 'string', format: 'date' },
    score: { type: 'integer', minimum: 0, maximum: 1000 },
    url: { type: 'string', format: 'uri' },
    tags: { type: 'array', maxItems: 2, items: { type: 'string', minLength: 1 } },
    at: { type: 'string', format: 'date-time' },
  },
};

test('schema-lite: a valid document yields no errors', () => {
  assert.deepEqual(validateJsonSchema({ status: 'SPARKED', lastUpdated: '2026-09-14', score: 990, url: 'https://vaultsparkstudios.com/', tags: ['a'], at: '2026-09-14T10:00:00Z' }, STATUS_SCHEMA), []);
});

test('schema-lite: every violated keyword is reported at its JSON path', () => {
  const errors = validateJsonSchema({ status: 'LIVE', lastUpdated: 'Sept 14', score: 10.5, url: 'javascript:alert(1)', tags: ['', 'b', 'c'], at: 'not a time', extra: 1 }, STATUS_SCHEMA);
  const expectFragments = [
    '/status must be one of',
    '/lastUpdated must be an ISO date',
    '/score must be integer, got number',
    '/url must be http(s) URI',
    '/tags exceeds maxItems 2',
    '/tags/0 shorter than minLength 1',
    '/at must be an ISO date-time',
    '/extra additional property not allowed',
  ];
  for (const frag of expectFragments) assert.ok(errors.some((e) => e.includes(frag)), `missing "${frag}" in ${JSON.stringify(errors)}`);
  assert.deepEqual(validateJsonSchema({}, STATUS_SCHEMA), ['/status required', '/lastUpdated required']);
  assert.ok(validateJsonSchema({ status: 'FORGE', lastUpdated: '2026-01-01', score: 1001 }, STATUS_SCHEMA).some((e) => e.includes('above maximum 1000')));
  assert.ok(validateJsonSchema({ status: 'FORGE', lastUpdated: '2026-01-01', score: -1 }, STATUS_SCHEMA).some((e) => e.includes('below minimum 0')));
});

test('schema-lite: type mismatch short-circuits (array/null are not objects)', () => {
  assert.deepEqual(validateJsonSchema([], { type: 'object', required: ['a'] }), ['/ must be object, got array']);
  assert.deepEqual(validateJsonSchema(null, { type: 'object', required: ['a'] }), ['/ must be object, got null']);
  assert.deepEqual(validateJsonSchema(3, { type: ['integer', 'null'] }), []);
});

test('schema-lite: anyOf, const, and allOf if/then', () => {
  const nullable = { anyOf: [{ type: 'string' }, { type: 'null' }] };
  assert.deepEqual(validateJsonSchema(null, nullable), []);
  const bad = validateJsonSchema(3, nullable);
  assert.equal(bad[0], '/ must match at least one allowed shape');
  assert.deepEqual(validateJsonSchema(2, { const: 1 }), ['/ must equal 1']);

  // `then` must name type/properties for `required` to be reached — see the todo below.
  const conditional = { type: 'object', allOf: [{ if: { properties: { status: { const: 'SPARKED' } } }, then: { type: 'object', required: ['stagingUrl'] } }] };
  assert.deepEqual(validateJsonSchema({ status: 'FORGE' }, conditional), []);
  assert.deepEqual(validateJsonSchema({ status: 'SPARKED' }, conditional), ['/stagingUrl required']);
  assert.deepEqual(validateJsonSchema({ status: 'SPARKED', stagingUrl: 'https://x' }, conditional), []);

  assert.deepEqual(validateJsonSchema({ a: 1 }, { type: 'object', allOf: [{ type: 'object', required: ['b'] }] }), ['/b required'], 'allOf branches are applied');
});

// `required` (and additionalProperties) are only evaluated inside
// `if (schema.type === 'object' || schema.properties)`. A branch schema written
// as `{ required: [...] }` — the natural shape for an if/then conditional — is
// therefore a silent no-op, so a contract could pass while missing a mandated key.
test('schema-lite: a bare {required:[...]} schema enforces required keys', {
  todo: 'BUG scripts/lib/json-schema-lite.mjs skips required unless the schema also declares type:"object" or properties',
}, () => {
  assert.deepEqual(validateJsonSchema({}, { required: ['stagingUrl'] }), ['/stagingUrl required']);
});

// ── proof-source-manifest ────────────────────────────────────────────────────

function fixtureTree() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-proof-manifest-'));
  const write = (rel, body) => { const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, body); };
  write('scripts/a.mjs', 'export const a = 1;\n');
  write('scripts/sub/b.json', '{"b":2}\n');
  write('scripts/notes.txt', 'not a source file');
  write('.github/workflows/ci.yml', 'on: push\n');
  write('ignis/src/x.ts', 'export {}\n');
  write('package.json', '{"name":"fixture"}\n');
  write('assets/ignored.js', 'outside the certified roots');
  return { root, write };
}
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

test('proof manifest: inventories only certified roots + source extensions, sorted with / paths', (t) => {
  const { root } = fixtureTree();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const m = buildProofSourceManifest(root);
  assert.equal(m.schemaVersion, 1);
  assert.equal(m.algorithm, 'sha256');
  assert.deepEqual(m.files.map((f) => f.path), ['.github/workflows/ci.yml', 'ignis/src/x.ts', 'package.json', 'scripts/a.mjs', 'scripts/sub/b.json']);
  assert.equal(m.totalFiles, 5);
  assert.equal(m.files.find((f) => f.path === 'scripts/a.mjs').sha256, sha('export const a = 1;\n'));
  assert.deepEqual(validateProofSourceManifest(m), { ok: true, errors: [] });
  assert.equal(buildProofSourceManifest(root).rootHash, m.rootHash, 'deterministic');
});

test('proof manifest: tampering with any stored field is detected', (t) => {
  const { root } = fixtureTree();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const good = buildProofSourceManifest(root);
  const clone = () => JSON.parse(JSON.stringify(good));

  const swapped = clone(); swapped.files[0].sha256 = sha('forged');
  assert.ok(validateProofSourceManifest(swapped).errors.includes('proof-source rootHash does not authenticate stored entries'));

  const dup = clone(); dup.files.push({ ...dup.files[0] }); dup.totalFiles = dup.files.length;
  assert.ok(validateProofSourceManifest(dup).errors.some((e) => e.startsWith('missing or duplicate proof-source path')));

  const count = clone(); count.totalFiles = 99;
  assert.ok(validateProofSourceManifest(count).errors.some((e) => e.startsWith('proof-source totalFiles 99')));

  const algo = clone(); algo.algorithm = 'md5';
  assert.equal(validateProofSourceManifest(algo).ok, false);

  const badHex = clone(); badHex.files[1].sha256 = 'XYZ';
  assert.ok(validateProofSourceManifest(badHex).errors.some((e) => e.startsWith('invalid proof-source sha256')));

  assert.equal(validateProofSourceManifest(null).ok, false);
});

test('proof manifest: diff classifies added/removed/changed, bounds output, normalises Windows paths', (t) => {
  const { root, write } = fixtureTree();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const before = buildProofSourceManifest(root);
  write('scripts/a.mjs', 'export const a = 2;\n');
  write('scripts/new1.mjs', '1');
  write('scripts/new2.mjs', '2');
  fs.rmSync(path.join(root, 'ignis/src/x.ts'));
  const after = buildProofSourceManifest(root);
  assert.notEqual(after.rootHash, before.rootHash);

  const diff = diffProofSourceManifests(before, after);
  assert.deepEqual(diff.changed, ['scripts/a.mjs']);
  assert.deepEqual(diff.added, ['scripts/new1.mjs', 'scripts/new2.mjs']);
  assert.deepEqual(diff.removed, ['ignis/src/x.ts']);
  assert.equal(diff.truncated, false);
  assert.equal(formatProofSourceDiff(diff), 'added 2: scripts/new1.mjs, scripts/new2.mjs · removed 1: ignis/src/x.ts · changed 1: scripts/a.mjs');

  const bounded = diffProofSourceManifests(before, after, { limit: 1 });
  assert.deepEqual(bounded.added, ['scripts/new1.mjs']);
  assert.equal(bounded.counts.added, 2);
  assert.equal(bounded.truncated, true);

  const windows = { files: before.files.map((f) => ({ ...f, path: f.path.replace(/\//g, '\\') })) };
  assert.deepEqual(diffProofSourceManifests(windows, before).counts, { added: 0, removed: 0, changed: 0 });
  assert.equal(formatProofSourceDiff(diffProofSourceManifests(before, before)), 'manifest root differs without a file-level delta');
});
