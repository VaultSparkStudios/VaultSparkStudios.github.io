#!/usr/bin/env node
/* generate-build-sha.mjs — S210 #3 post-push build verify (step 1 of 2)
 *
 * Emits api/build-sha.json with the current HEAD SHA so check-pages-deploy.mjs
 * can compare what CF Pages actually deployed to what was pushed.
 *
 * Runs as the LAST step of `npm run build` so the SHA reflects the commit
 * that will be pushed — not a stale build from a prior session.
 *
 * Import-safe: side effects only when invoked directly.
 * Usage:
 *   node scripts/generate-build-sha.mjs           # emit api/build-sha.json
 *   node scripts/generate-build-sha.mjs --check   # exit 1 if file missing/stale
 */
import { execSync } from './lib/safe-spawn.mjs';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'api', 'build-sha.json');
const RUN_DIRECT = process.argv[1] &&
  process.argv[1].replace(/\\/g, '/').endsWith('generate-build-sha.mjs');

export function getBuildSha() {
  try {
    return execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch (_) { return 'unknown'; }
}

/**
 * One declared shape, two producers (S319).
 *
 * `api/build-sha.json` is written by TWO things: this script on a full build,
 * and `.github/workflows/pages-deploy.yml` on a content-lane deploy. They had
 * diverged — measured live, production served `schemaVersion: "1.1"` carrying
 * `baselineSha` / `contentLaneHead` / `contentLanePathSetSha256` /
 * `workflowRunId`, while this script emitted `1.0` carrying none of them. So a
 * consumer reading `baselineSha` got a real value after a content deploy and
 * `undefined` after a full build, with nothing to distinguish the two — the
 * reader-keyed-on-a-field-its-producer-never-emits shape.
 *
 * Both producers now emit the same 1.1 field set. This script emits the
 * content-lane provenance fields as explicit `null`, which says "this build did
 * not come through the content lane" rather than leaving the reader to guess
 * from an absent key.
 */
export const BUILD_SHA_SCHEMA_VERSION = '1.1';

export function buildShaPayload(sha, now = new Date()) {
  return {
    schemaVersion: BUILD_SHA_SCHEMA_VERSION,
    generatedAt: now.toISOString().slice(0, 10),
    sha,
    builtAt: now.toISOString(),
    deployedBy: 'full-build',
    // Declared-and-null, never absent: the content lane fills these; a full
    // build genuinely has no content-lane provenance to report.
    baselineSha: null,
    contentLaneHead: null,
    contentLanePaths: null,
    contentLanePathSetSha256: null,
    workflowRunId: null,
  };
}

export function generate() {
  const sha = getBuildSha();
  const payload = JSON.stringify(buildShaPayload(sha), null, 2);
  writeFileSync(OUT, payload, 'utf8');
  console.log(`✓ api/build-sha.json — ${sha.slice(0, 8)}`);
}

/** Every field a consumer may read, from either producer. */
export const BUILD_SHA_FIELDS = Object.freeze([
  'schemaVersion', 'generatedAt', 'sha', 'builtAt', 'deployedBy',
  'baselineSha', 'contentLaneHead', 'contentLanePaths', 'contentLanePathSetSha256', 'workflowRunId',
]);

export function selfTest() {
  const payload = buildShaPayload('a'.repeat(40), new Date('2026-01-02T03:04:05.006Z'));
  const workflow = existsSync(join(ROOT, '.github', 'workflows', 'pages-deploy.yml'))
    ? readFileSync(join(ROOT, '.github', 'workflows', 'pages-deploy.yml'), 'utf8') : '';
  const cases = [
    ['full build declares every field a consumer may read', BUILD_SHA_FIELDS.every((f) => Object.hasOwn(payload, f))],
    ['content-lane provenance is null, never absent', payload.baselineSha === null && Object.hasOwn(payload, 'baselineSha')],
    // There are FOUR producers of this artifact, not two: this script plus three
    // separate printf blocks in pages-deploy.yml (full deploy, content hotfix,
    // content lane). An assertion that checked only the first literal it found
    // passed while two producers were still on the old shape — so check EVERY
    // block that writes api/build-sha.json.
    ['every producer agrees on the schema version', (() => {
      if (!workflow) return true;
      const blocks = workflow.split('\n').filter((l) => l.includes('build-sha.json') || l.includes('schemaVersion'));
      const versions = workflow.match(/schemaVersion\\?":\s*\\?"([\d.]+)/g) || [];
      return blocks.length > 0 && versions.length > 0
        && versions.every((v) => v.endsWith(BUILD_SHA_SCHEMA_VERSION));
    })()],
    ['every producer emits the content-lane provenance fields', (() => {
      if (!workflow) return true;
      // split() always yields a leading segment BEFORE the first printf; that
      // preamble is not a producer and must not be graded as one.
      const printfs = workflow.split('printf').slice(1).filter((chunk) => chunk.includes('build-sha.json'));
      return printfs.length === 3 && printfs.every((chunk) => chunk.includes('baselineSha') && chunk.includes('contentLaneHead'));
    })()],
    ['generatedAt is date-only', /^\d{4}-\d{2}-\d{2}$/.test(payload.generatedAt)],
    ['the sha is carried verbatim', payload.sha === 'a'.repeat(40)],
    ['the producer identifies itself', payload.deployedBy === 'full-build'],
  ];
  for (const [name, ok] of cases) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (cases.some(([, ok]) => !ok)) process.exit(1);
  console.log(`generate-build-sha self-test: ${cases.length}/${cases.length}`);
}

export function check() {
  if (!existsSync(OUT)) {
    console.error('✗ generate-build-sha --check: api/build-sha.json missing — run npm run build');
    process.exit(1);
  }
  const current = getBuildSha();
  const stored = JSON.parse(readFileSync(OUT, 'utf8')).sha;
  if (stored !== current) {
    let distance = Infinity;
    try {
      distance = Number(execSync(`git rev-list --count ${stored}..${current}`, { cwd: ROOT, encoding: 'utf8' }).trim());
    } catch (_) {
      distance = Infinity;
    }
    // Pages deploy stamps the served artifact with the exact pushed SHA. The committed
    // file is therefore normally one commit behind, plus optional [skip ci] artifact commits.
    if (Number.isFinite(distance) && distance > 0 && distance <= 5) {
      console.warn(`⚠ generate-build-sha --check: stored deploy SHA ${stored.slice(0, 8)} trails HEAD ${current.slice(0, 8)} by ${distance} commit(s); accepted because Pages deploy stamps the served artifact.`);
      return;
    }
    console.error(`✗ generate-build-sha --check: stored SHA ${stored.slice(0, 8)} ≠ HEAD ${current.slice(0, 8)} — run npm run build`);
    process.exit(1);
  }
  console.log(`✓ generate-build-sha --check: ok (${current.slice(0, 8)})`);
}

if (RUN_DIRECT) {
  if (process.argv.includes('--self-test')) selfTest();
  else if (process.argv.includes('--check')) check();
  else generate();
}
