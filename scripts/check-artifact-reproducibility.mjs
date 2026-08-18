#!/usr/bin/env node
/**
 * check-artifact-reproducibility.mjs — S319. No non-reproducible input may enter
 * a byte-checked artifact.
 *
 * THE DEFECT CLASS. A Merkle root or a `--check` byte-equality gate is only a
 * valid gate when every hashed input is a pure function of the commit. This repo
 * has now hit the violation twice in one artifact, and it cost 12.3 days of
 * production staleness before anyone traced it:
 *
 *   · CRON-OWNED PATHS. `api/uptime.json` and `api/worker-route-provenance.json`
 *     sat inside the candidate promotion manifest while `uptime-probe.yml`
 *     rewrote them hourly — in the SAME commit that rewrote the manifest and the
 *     release proof judging it. The candidate was invalidated and re-judged
 *     every hour, so an 8/8 ceremony was unreachable by construction.
 *
 *   · WALL-CLOCK FIELDS. `assets/shell-manifest.json` and
 *     `api/public-intelligence.json` differed between two builds of identical
 *     source in ONE field: `generatedAt`. `api/build-sha.json` carried `builtAt`.
 *     Byte-identical content, different roots.
 *
 * Fixing the two instances is not enough — the next byte-checked artifact will
 * acquire a third. So this is a structural gate over the class, not a list of
 * known offenders. It fails when a declared artifact leaf set intersects either
 * hazard without an explicit, justified exemption.
 *
 * Modes: (default) check · --json · --self-test
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOW_DIR = path.join(ROOT, '.github', 'workflows');

/**
 * Hazard 2 is MEASURED on the artifact, not inferred from its producer.
 *
 * A first draft scanned producer scripts for `Date.now()` / `toISOString()`.
 * That was inference, and it was wrong: it flagged four HTML pages because some
 * script that writes them mentions a clock somewhere, while a stamp in a
 * generator does not imply a stamp in its output. Reading the leaf's own bytes
 * is a direct observation with no attribution guessing.
 *
 * Time-of-day precision is required deliberately. `2026-08-11` is a human-facing
 * date that changes when the CONTENT changes; `2026-08-11T17:27:28.974Z` is a
 * machine stamp that changes on every build of identical source. Only the second
 * shape breaks byte-equality.
 */
export const MACHINE_STAMP_RE = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/**
 * Scheduled writes that are legitimate CONTENT changes, not time-drift.
 *
 * The distinction that matters: `api/uptime.json` changes hourly with zero
 * source change, so it can never byte-match a staging deploy. `index.html`
 * changes only when the analytics numbers embedded in it actually move — a real
 * content change that SHOULD invalidate the candidate and force a redeploy.
 *
 * Every entry must carry a reason. An exemption without one fails the gate, so
 * silence can never buy a pass.
 */
export const CRON_WRITE_EXEMPT = Object.freeze({
  'index.html': 'cloudflare-analytics-pull embeds real analytics values; a change here is a genuine content change that should invalidate the candidate and force a staging redeploy, not time-drift.',
  'status/index.html': 'Same producer and same reasoning as index.html — the rewritten bytes are measured values the site is meant to publish.',
});

/**
 * Byte-checked artifacts and the producer that owns each leaf set.
 *
 * `exempt` entries are the DECLARED, narrow escapes — each must name why the
 * hazard cannot break the gate. An exemption without a reason is itself a
 * failure, so silence can never buy a pass.
 */
export const BYTE_CHECKED_ARTIFACTS = Object.freeze([
  {
    id: 'candidate-artifact-manifest',
    producer: 'scripts/build-candidate-artifact-manifest.mjs',
    // Leaves are enumerated by the producer itself, so the gate reads them from
    // the module rather than duplicating a list that would drift immediately.
    leavesFrom: 'CORE_PATHS',
    observedFrom: 'OBSERVED_PATHS',
    volatileFrom: 'VOLATILE_FIELDS',
  },
]);

const normalize = (p) => String(p || '').replaceAll('\\', '/').replace(/^\/+/, '');

/**
 * Which repo paths does a scheduled workflow write? Read from the `git add`
 * lines of any workflow carrying a `schedule:` trigger — that is what actually
 * lands bytes on main, and it is the shape every publisher in this repo uses.
 */
export function scheduledWritePaths(workflowSources) {
  const written = new Map();
  for (const [name, source] of Object.entries(workflowSources || {})) {
    if (!/^\s*schedule:/m.test(source)) continue;
    for (const line of source.split('\n')) {
      const match = line.match(/^\s*git add\s+(.+)$/);
      if (!match) continue;
      for (const token of match[1].split(/\s+/)) {
        if (!token || token.startsWith('-') || token.includes('$') || token === '2>/dev/null' || token === '||' || token === 'true') continue;
        const clean = normalize(token);
        if (!clean) continue;
        if (!written.has(clean)) written.set(clean, []);
        if (!written.get(clean).includes(name)) written.get(clean).push(name);
      }
    }
  }
  return written;
}

/** Does a scheduled-write token cover this leaf? Tokens may be dirs or globs. */
export function writeCovers(token, leaf) {
  const t = normalize(token);
  const l = normalize(leaf);
  if (t === l) return true;
  if (t.endsWith('/')) return l.startsWith(t);
  if (t.includes('*')) {
    const rx = new RegExp(`^${t.replace(/[.+^${}()|[\]]/g, '\\$&').replace(/\*/g, '[^/]*')}$`);
    return rx.test(l);
  }
  return false;
}

/**
 * Evaluate one artifact's leaf set against both hazards.
 *
 * @returns {{artifact:string, findings:{leaf:string,hazard:string,detail:string}[]}}
 */
export function evaluateArtifact({ id, hashedLeaves, observedLeaves, volatileFields, scheduledWrites, leafContents, exempt = CRON_WRITE_EXEMPT }) {
  const findings = [];
  const observed = new Set((observedLeaves || []).map(normalize));
  const volatile = new Set(Object.keys(volatileFields || {}).map(normalize));
  const seen = new Set();

  for (const rawLeaf of hashedLeaves || []) {
    const leaf = normalize(rawLeaf);
    const declared = observed.has(leaf) || volatile.has(leaf);

    // Hazard 1 — a scheduled workflow rewrites this leaf's bytes.
    for (const [token, workflows] of scheduledWrites || []) {
      if (!writeCovers(token, leaf) || declared) continue;
      const key = `${leaf}|cron-owned`;
      if (seen.has(key)) continue;
      const reason = Object.hasOwn(exempt, leaf) ? exempt[leaf] : null;
      if (reason && String(reason).trim()) continue;   // declared, reasoned exemption
      seen.add(key);
      findings.push({
        leaf, hazard: 'cron-owned',
        detail: Object.hasOwn(exempt, leaf)
          ? `exempted from ${id} without a reason — an exemption must say why the scheduled rewrite is a content change rather than time-drift`
          : `hashed into ${id} but rewritten by scheduled workflow(s) ${workflows.join(', ')} — declare it in OBSERVED_PATHS, VOLATILE_FIELDS, or CRON_WRITE_EXEMPT with a reason`,
      });
    }

    // Hazard 2 — the leaf's own bytes carry a machine stamp. Measured, not inferred.
    const body = (leafContents || {})[leaf];
    if (body != null && !declared && MACHINE_STAMP_RE.test(String(body))) {
      findings.push({
        leaf, hazard: 'machine-stamp',
        detail: `hashed into ${id} but its bytes contain a machine timestamp (${String(body).match(MACHINE_STAMP_RE)[0]}) — declare the field in VOLATILE_FIELDS so identical source cannot produce different roots`,
      });
    }
  }
  return { artifact: id, findings };
}

async function loadLive() {
  const { pathToFileURL } = await import('node:url');
  const results = [];
  const workflowSources = {};
  if (fs.existsSync(WORKFLOW_DIR)) {
    for (const file of fs.readdirSync(WORKFLOW_DIR).filter((f) => /\.ya?ml$/.test(f))) {
      workflowSources[file] = fs.readFileSync(path.join(WORKFLOW_DIR, file), 'utf8');
    }
  }
  const scheduledWrites = [...scheduledWritePaths(workflowSources).entries()];

  for (const spec of BYTE_CHECKED_ARTIFACTS) {
    const modulePath = path.join(ROOT, spec.producer);
    if (!fs.existsSync(modulePath)) {
      results.push({ artifact: spec.id, findings: [{ leaf: spec.producer, hazard: 'missing-producer', detail: 'declared producer does not exist' }] });
      continue;
    }
    const mod = await import(pathToFileURL(modulePath).href);
    const hashedLeaves = mod[spec.leavesFrom] || [];
    const observedLeaves = mod[spec.observedFrom] || [];
    const volatileFields = mod[spec.volatileFrom] || {};

    // Hazard 2 is measured on the artifact's own bytes — no producer attribution.
    const leafContents = {};
    for (const leaf of hashedLeaves) {
      const absolute = path.join(ROOT, normalize(leaf));
      if (fs.existsSync(absolute)) leafContents[normalize(leaf)] = fs.readFileSync(absolute, 'utf8');
    }
    results.push(evaluateArtifact({ id: spec.id, hashedLeaves, observedLeaves, volatileFields, scheduledWrites, leafContents }));
  }
  return results;
}

function selfTest() {
  const t = [];
  const add = (name, ok) => t.push([name, ok]);

  const workflows = {
    'uptime-probe.yml': 'on:\n  schedule:\n    - cron: "0 * * * *"\njobs:\n  x:\n    steps:\n      - run: |\n          git add api/uptime.json api/citation.json\n',
    'manual-only.yml': 'on:\n  workflow_dispatch:\njobs:\n  x:\n    steps:\n      - run: |\n          git add api/manual.json\n',
  };
  const writes = scheduledWritePaths(workflows);
  add('a scheduled workflow write is detected', writes.has('api/uptime.json'));
  add('the owning workflow is named', writes.get('api/uptime.json').includes('uptime-probe.yml'));
  add('a manual-only workflow is not counted', !writes.has('api/manual.json'));

  add('an exact token covers its leaf', writeCovers('api/uptime.json', 'api/uptime.json'));
  add('a directory token covers its children', writeCovers('news/', 'news/2026-01-01/index.html'));
  add('a glob token covers a match', writeCovers('assets/desk-*.js', 'assets/desk-a.js'));
  add('a glob does not cross a directory', !writeCovers('assets/*.js', 'assets/deep/a.js'));
  add('an unrelated token does not cover', !writeCovers('api/uptime.json', 'index.html'));

  const scheduledWrites = [...writes.entries()];
  const base = { id: 'x', scheduledWrites, leafContents: {}, exempt: {} };

  // Hazard 1 both ways.
  add('an undeclared cron-owned leaf is a finding', evaluateArtifact({
    ...base, hashedLeaves: ['api/uptime.json'], observedLeaves: [], volatileFields: {},
  }).findings.some((f) => f.hazard === 'cron-owned'));
  add('declaring it observed clears the finding', evaluateArtifact({
    ...base, hashedLeaves: ['api/uptime.json'], observedLeaves: ['api/uptime.json'], volatileFields: {},
  }).findings.length === 0);
  add('declaring only its volatile field also clears it', evaluateArtifact({
    ...base, hashedLeaves: ['api/citation.json'], observedLeaves: [], volatileFields: { 'api/citation.json': ['generatedAt'] },
  }).findings.length === 0);
  add('a leaf no cron writes is clean', evaluateArtifact({
    ...base, hashedLeaves: ['index.html'], observedLeaves: [], volatileFields: {},
  }).findings.length === 0);

  // A reasoned exemption passes; a bare one does not. Silence never buys a pass.
  add('a reasoned exemption clears the finding', evaluateArtifact({
    ...base, hashedLeaves: ['api/uptime.json'], observedLeaves: [], volatileFields: {},
    exempt: { 'api/uptime.json': 'genuine content change' },
  }).findings.length === 0);
  add('an exemption with no reason still fails', evaluateArtifact({
    ...base, hashedLeaves: ['api/uptime.json'], observedLeaves: [], volatileFields: {},
    exempt: { 'api/uptime.json': '' },
  }).findings.some((f) => /without a reason/.test(f.detail)));

  // Hazard 2 is measured on the leaf's own bytes.
  add('a machine stamp in the leaf is a finding', evaluateArtifact({
    ...base, hashedLeaves: ['assets/shell-manifest.json'], observedLeaves: [], volatileFields: {},
    leafContents: { 'assets/shell-manifest.json': '{"generatedAt":"2026-08-17T17:27:46.098Z"}' },
  }).findings.some((f) => f.hazard === 'machine-stamp'));
  add('declaring the volatile field clears it', evaluateArtifact({
    ...base, hashedLeaves: ['assets/shell-manifest.json'], observedLeaves: ['assets/shell-manifest.json'], volatileFields: {},
    leafContents: { 'assets/shell-manifest.json': '{"generatedAt":"2026-08-17T17:27:46.098Z"}' },
  }).findings.length === 0);
  add('a leaf with no stamp is clean', evaluateArtifact({
    ...base, hashedLeaves: ['assets/x.json'], observedLeaves: [], volatileFields: {},
    leafContents: { 'assets/x.json': '{"a":1}' },
  }).findings.length === 0);

  // Precision: a human-facing date must not be mistaken for a machine stamp.
  add('a machine stamp is recognised', MACHINE_STAMP_RE.test('2026-08-17T17:27:46.098Z'));
  add('a date-only value is NOT a machine stamp', !MACHINE_STAMP_RE.test('2026-08-17'));
  add('a rendered human date is not flagged', evaluateArtifact({
    ...base, hashedLeaves: ['news/index.html'], observedLeaves: [], volatileFields: {},
    leafContents: { 'news/index.html': '<p>latest evidence 2026-08-11 · 6 days old</p>' },
  }).findings.length === 0);

  for (const [name, ok] of t) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (t.some(([, ok]) => !ok)) process.exit(1);
  console.log(`artifact-reproducibility self-test: ${t.length}/${t.length}`);
}

async function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const results = await loadLive();
  const findings = results.flatMap((r) => r.findings);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ results, ok: findings.length === 0 }, null, 2));
  } else if (findings.length) {
    console.error(`check-artifact-reproducibility: ${findings.length} non-reproducible input(s) in a byte-checked artifact`);
    for (const f of findings) console.error(`  ⛔ ${f.leaf} [${f.hazard}] — ${f.detail}`);
  } else {
    console.log(`check-artifact-reproducibility: ok (${results.length} byte-checked artifact(s), every hashed leaf is commit-derived)`);
  }
  if (findings.length) process.exitCode = 1;
}

if (process.argv[1]?.endsWith('check-artifact-reproducibility.mjs')) await main();
