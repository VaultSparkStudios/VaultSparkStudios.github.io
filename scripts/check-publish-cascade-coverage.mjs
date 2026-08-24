#!/usr/bin/env node
/**
 * check-publish-cascade-coverage.mjs  (S291)
 *
 * Structural guard against the "[skip ci] publisher strands a derived artifact"
 * drift class — the recurring S291 root cause.
 *
 * A scheduled workflow that regenerates + commits a BASE feed
 * (api/staging-health.json, api/uptime.json, api/public-intelligence.json,
 * api/ship-receipts.json, …) must ALSO regenerate + stage every byte-checked
 * artifact DERIVED from that feed. When it doesn't, the committed tree goes
 * quietly inconsistent between crons: `npm run build:check` is red for the next
 * human pull, and — worse — every derived PUBLIC trust surface (release-proof,
 * citation) serves a stale value until a human closeout resyncs it. build:check's
 * own --check steps catch the drift, but only on a real (non-skip-ci) push, so
 * the [skip ci] crons that CAUSE it never trip a gate.
 *
 * S291 hit this FOUR times: uptime-probe stranded release-proof + citation;
 * refresh-live-data stranded the you-asked-shipped changelog SSR; vault-narrative
 * stranded citation. This gate pins those fixes so the class cannot silently
 * return, and fails the next author who adds a cron staging a base feed without
 * cascading its derivatives.
 *
 * Contract, per workflow: for every derived artifact whose (transitive) source
 * feed the workflow stages, the artifact must be
 *   (1) STAGED   — present in a `git add` set (explicit path, or a covering
 *                  directory / glob token), AND
 *   (2) REBUILT  — its builder script invoked somewhere in the workflow, OR the
 *                  workflow runs `npm run build` (which regenerates all of them).
 *
 * Every edge below is EMPIRICALLY verified (S291) to produce byte-drift when the
 * source feed changes — no speculative edges, so false-positives stay at zero.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEvidenceGraph, validateEvidenceGraph } from './lib/evidence-graph.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const WF_DIR = join(ROOT, '.github', 'workflows');

// One graph now drives publisher closure AND the real pre-push coherence seal.
// This removes the hand-maintained second dependency map that could drift from
// the public evidence graph it claimed to defend.
const EVIDENCE_GRAPH = loadEvidenceGraph(ROOT);
export const DERIVED = Object.fromEntries(EVIDENCE_GRAPH.nodes
  .filter((node) => node.publishCascade === true)
  .map((node) => [node.output, { from: node.sources, builder: node.builder.split('/').at(-1), alsoStage: node.alsoStage || [] }]));

// Every feed that appears as a source of some derived artifact.
export const SOURCE_FEEDS = [...new Set(Object.values(DERIVED).flatMap((d) => d.from))];

// Does a single `git add` token cover `target`? Handles explicit paths,
// directory adds ('api/' or bare 'api'), and single-segment globs ('a/*.json').
export function tokenCovers(token, target) {
  const t = token.replace(/^['"]|['"]$/g, '').trim();
  if (!t) return false;
  if (t === target) return true;
  if (t.endsWith('/')) return target.startsWith(t); // directory add: api/
  if (t.includes('*')) {
    const re = new RegExp('^' + t.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '$');
    return re.test(target);
  }
  // bare directory name (no dot, no slash) → covers its subtree
  if (!t.includes('.') && !t.includes('/')) return target.startsWith(t + '/');
  return false;
}

const covered = (tokens, target) => tokens.some((tok) => tokenCovers(tok, target));

// Extract the staged-path token set from every `git add …` line in a workflow.
export function stagedTokens(text) {
  const tokens = [];
  for (const line of text.split('\n')) {
    const m = line.match(/git add\s+(.+)$/);
    if (!m) continue;
    for (const raw of m[1].split(/\s+/)) {
      // stop at redirections / shell operators / comments
      if (/^(2>|1>|>|<|\|\||&&|#|;)/.test(raw)) break;
      if (raw === 'git' || raw === 'add') continue;
      tokens.push(raw);
    }
  }
  return tokens;
}

// Transitive closure: which derived artifacts must a workflow resync, given the
// set of source feeds it produces (stages)? A derived node is required if any of
// its sources is produced OR is itself a required derived node.
export function requiredDerived(producedFeeds) {
  const required = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (const [artifact, spec] of Object.entries(DERIVED)) {
      if (required.has(artifact)) continue;
      if (spec.from.some((f) => producedFeeds.has(f) || required.has(f))) {
        required.add(artifact);
        changed = true;
      }
    }
  }
  return required;
}

// Core check for one workflow's text. Returns an array of violation strings.
export function checkWorkflow(name, text) {
  const tokens = stagedTokens(text);
  if (!tokens.length) return [];
  const produced = new Set(SOURCE_FEEDS.filter((f) => covered(tokens, f)));
  if (!produced.size) return [];
  const rebuildsAll = /npm run build\b/.test(text);
  const required = requiredDerived(produced);
  const violations = [];
  for (const artifact of required) {
    if (!covered(tokens, artifact)) {
      violations.push(`${name}: stages a source of ${artifact} but never \`git add\`s ${artifact} (cascade strand)`);
    }
    if (!rebuildsAll && !text.includes(DERIVED[artifact].builder)) {
      violations.push(`${name}: stages/needs ${artifact} but never regenerates it (missing \`${DERIVED[artifact].builder}\` or \`npm run build\`)`);
    }
    // A derived feed committed WITHOUT the append-only ledger it was computed
    // from is the same strand class one level down: the tree then holds a feed
    // its own committed inputs cannot reproduce, so the next `--check` is red.
    for (const sibling of DERIVED[artifact].alsoStage) {
      if (!covered(tokens, sibling)) {
        violations.push(`${name}: stages ${artifact} but never \`git add\`s its ledger ${sibling} (feed would outrun its own input)`);
      }
    }
  }
  return violations;
}

function selfTest() {
  const cases = [];
  // 1. tokenCovers semantics
  cases.push(['dir add covers file', tokenCovers('api/', 'api/citation.json') === true]);
  cases.push(['explicit covers self', tokenCovers('api/release-proof.json', 'api/release-proof.json') === true]);
  cases.push(['glob covers segment', tokenCovers('api/leaderboard/v1/*.json', 'api/leaderboard/v1/x.json') === true]);
  cases.push(['glob does not cross slash', tokenCovers('api/*.json', 'api/sub/x.json') === false]);
  cases.push(['unrelated not covered', tokenCovers('data/', 'api/citation.json') === false]);

  // 2. closure: staging-health pulls the whole chain
  const chain = requiredDerived(new Set(['api/staging-health.json']));
  cases.push(['staging-health ⇒ release-proof', chain.has('api/release-proof.json')]);
  cases.push(['staging-health ⇒ status-proof', chain.has('api/status-proof.json')]);
  cases.push(['staging-health ⇒ citation (transitive)', chain.has('api/citation.json')]);
  cases.push(['staging-health ⇏ changelog', !chain.has('changelog/index.html')]);

  // 3. a stranding workflow FAILS (explicit list, no cascade)
  const bad = `run: |\n  node scripts/check-staging-parity.mjs --refresh\n  git add api/staging-health.json api/uptime.json`;
  const badV = checkWorkflow('bad.yml', bad);
  cases.push(['strander flagged (release-proof)', badV.some((v) => v.includes('api/release-proof.json'))]);
  cases.push(['strander flagged (citation)', badV.some((v) => v.includes('api/citation.json'))]);

  // 4. a fully-cascaded explicit workflow PASSES
  // S324: api/status-proof.json joined the graph as a SOURCE of the CANON-054
  // public stats surface, so a workflow committing it must now re-derive and
  // stage data/stats-surface.json plus its two sibling writes. The real
  // uptime-probe.yml was widened the same way — this fixture tracks a widened
  // contract, it does not relax one; the mutation below proves it still bites.
  const good = `run: |\n  node scripts/check-staging-parity.mjs --refresh\n  node scripts/build-candidate-artifact-manifest.mjs\n  node scripts/build-release-proof.mjs\n  node scripts/build-status-proof.mjs\n  node scripts/build-citation.mjs\n  node scripts/build-stats-surface.mjs\n  git add api/staging-health.json api/uptime.json api/candidate-artifact-manifest.json api/release-proof.json api/status-proof.json api/citation.json data/stats-surface.json stats.json api/ecosystem-stats.json`;
  cases.push(['fully-cascaded passes', checkWorkflow('good.yml', good).length === 0]);
  // Mutation the other way: drop the newly-required stats surface and the gate
  // must go red again, or the widening above would be indistinguishable from
  // having quietly disabled the check.
  cases.push(['dropping the stats surface from a full cascade is flagged',
    checkWorkflow('good.yml', good.replace(' data/stats-surface.json stats.json api/ecosystem-stats.json', ''))
      .some((v) => v.includes('data/stats-surface.json'))]);

  // 5. a broad `git add api/` + `npm run build` workflow PASSES without listing each file
  // S319: index.html joined the graph as a derived artifact (the homepage Desk
  // module renders api/news-desk*.json), so a workflow staging `api/` must now
  // stage index.html too. The real refresh-live-data.yml was widened the same
  // way — this fixture tracks a widened contract, it does not relax one.
  // S328: .cache/cta-readiness.json joined the graph as the first .cache/ node —
  // it is derived from api/funnel-summary.json, which a broad `api/` add covers —
  // so a workflow staging `api/` must now stage it too. Same widening shape as
  // index.html above; the mutation below proves it still bites.
  const broad = `run: |\n  npm run build\n  node scripts/build-ship-receipts.mjs\n  node scripts/build-you-asked-shipped.mjs\n  git add api/ index.html changelog/index.html news/ data/worker-route-history.ndjson data/stats-surface.json stats.json .cache/cta-readiness.json`;
  cases.push(['broad api/ + npm build + changelog passes', checkWorkflow('broad.yml', broad).length === 0]);
  // Mutation the other way: dropping index.html must FAIL, or the widening above
  // would be indistinguishable from having quietly disabled the check.
  const broadStranding = broad.replace(' index.html changelog/index.html', ' changelog/index.html');
  cases.push(['dropping index.html from a broad add is flagged', checkWorkflow('broad.yml', broadStranding).some((v) => v.includes('index.html'))]);
  // S328 regression: this is the exact strand that shipped. A broad `api/` add
  // stages the producer (api/funnel-summary.json) while leaving the byte-checked
  // consumer behind — the gate passed on this for as long as no .cache/ node was
  // declared. It must now be flagged by name.
  const cacheStranding = broad.replace(' .cache/cta-readiness.json', '');
  cases.push(['dropping .cache/cta-readiness.json from a broad add is flagged',
    checkWorkflow('broad.yml', cacheStranding).some((v) => v.includes('.cache/cta-readiness.json'))]);

  // 6. staging ship-receipts without the SSR consumer FAILS
  const shipBad = `run: |\n  npm run build\n  node scripts/build-ship-receipts.mjs\n  git add api/`;
  cases.push(['ship-receipts without changelog flagged', checkWorkflow('ship.yml', shipBad).some((v) => v.includes('changelog/index.html'))]);

  // 7. alsoStage — a derived feed must not be committed without its ledger.
  //    Self-tested in BOTH directions so the rule can neither rot inert nor
  //    fire on a workflow that already does the right thing.
  const ledgerStrand = `run: |\n  npm run build\n  git add api/worker-route-provenance.json api/worker-route-history.json`;
  const ledgerClosed = `run: |\n  npm run build\n  git add api/ data/worker-route-history.ndjson`;
  cases.push(['feed without its ledger flagged', checkWorkflow('ledger.yml', ledgerStrand).some((v) => v.includes('data/worker-route-history.ndjson'))]);
  cases.push(['feed with its ledger passes', !checkWorkflow('ledger-ok.yml', ledgerClosed).some((v) => v.includes('data/worker-route-history.ndjson'))]);
  cases.push(['alsoStage is declared on the graph, not hardcoded here', (DERIVED['api/worker-route-history.json']?.alsoStage || []).includes('data/worker-route-history.ndjson')]);

  const failed = cases.filter(([, ok]) => !ok);
  cases.forEach(([name, ok]) => console.log(`  ${ok ? 'ok' : 'FAIL'} ${name}`));
  console.log(`check-publish-cascade-coverage --self-test: ${cases.length - failed.length}/${cases.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

function run() {
  const graphErrors = validateEvidenceGraph(EVIDENCE_GRAPH);
  if (graphErrors.length) {
    for (const error of graphErrors) console.error(`check-publish-cascade-coverage: evidence graph invalid — ${error}`);
    process.exit(1);
  }
  const files = readdirSync(WF_DIR).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
  const violations = [];
  for (const f of files) {
    violations.push(...checkWorkflow(f, readFileSync(join(WF_DIR, f), 'utf8')));
  }
  if (violations.length) {
    console.error('check-publish-cascade-coverage: derived-artifact cascade strand(s):');
    for (const v of violations) console.error(`  ✗ ${v}`);
    console.error('  fix: regenerate + `git add` the derived artifact in the same workflow step that commits its source feed.');
    process.exit(1);
  }
  console.log(`check-publish-cascade-coverage: ${files.length} workflow(s) — all publish cascades closed`);
  process.exit(0);
}

if (process.argv.includes('--self-test')) selfTest();
else run();
