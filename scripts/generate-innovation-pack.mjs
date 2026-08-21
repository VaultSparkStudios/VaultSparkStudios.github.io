#!/usr/bin/env node
// @verification-scope sprint — /go expansion artifact, not a product build gate.
/** Deterministic second-order innovation pack for the /go expansion pass. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from './lib/safe-spawn.mjs';
import { fileURLToPath } from 'node:url';
import { latestSilSnapshot } from './lib/sil-source.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'INNOVATION_PACK.md');
const CHECK = process.argv.includes('--check');

function read(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return ''; }
}

function trackedFiles() {
  try {
    return execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8', windowsHide: true })
      .split(/\r?\n/).filter(Boolean);
  } catch { return []; }
}

function markerCount(files) {
  let count = 0;
  for (const rel of files.filter((file) => /\.(?:mjs|js|html|css|md)$/.test(file))) {
    if (/^(?:context\/archive|node_modules|docs\/AUDIT_)/.test(rel)) continue;
    const text = read(rel);
    count += (text.match(/\b(?:TODO|FIXME)\b/g) || []).length;
  }
  return count;
}

function candidate(rank, title, evidence, shipped, next) {
  return { rank, title, evidence, status: shipped ? 'SHIPPED THIS PASS' : 'OPEN', next };
}

export function buildPack() {
  const files = trackedFiles();
  const sil = latestSilSnapshot(read('context/SELF_IMPROVEMENT_LOOP.md'));
  const opsRegistry = read('scripts/ops/index.mjs');
  const promotion = read('scripts/build-promotion-receipt.mjs');
  const beacon = read('scripts/build-ci-status-beacon.mjs');
  const scope = read('scripts/probe-capability.mjs');
  const coherence = read('scripts/check-startup-session-coherence.mjs');
  const silGate = read('scripts/check-sil-integrity.mjs');
  const sitemapGate = read('scripts/check-sitemap-coverage.mjs');
  const parityContract = read('scripts/check-shell-parity-contract.mjs');
  const statusPage = read('status/index.html');
  const geniusClassifier = read('scripts/lib/genius-task-classifier.mjs');
  const routes = ['privacy', 'terms', 'contact', 'ip'];
  const candidates = [
    candidate(1, 'Close the /go innovation-pack command parity gap', 'SESSION_PROTOCOL requires `ops.mjs innovation-pack`; the local command registry is the executable source of truth.', /'innovation-pack'/.test(opsRegistry), 'Register the deterministic generator and keep `--check` byte-stable.'),
    candidate(2, 'Make universal public routes a blocking sitemap contract', `Required source routes present: ${routes.filter((route) => fs.existsSync(path.join(ROOT, route, 'index.html'))).length}/${routes.length}.`, /UNIVERSAL_ROUTES/.test(sitemapGate), 'Require both source existence and sitemap membership for privacy, terms, contact, and IP.'),
    candidate(3, 'Preserve honest-dark at route granularity', 'Promotion proof previously collapsed browser evidence to the homepage.', /\/vault-member\//.test(promotion) && /browser\.routes/.test(promotion), 'Keep every critical route independently captured or explicitly dark.'),
    candidate(4, 'Probe deploy credentials against bound resources', 'A valid Cloudflare token can still fail deployment when its R2 binding is unreadable.', /interpretCloudflareDeployScope/.test(scope) && /scope-error/.test(scope), 'Read Workers Scripts and the bound R2 bucket before declaring deploy readiness.'),
    candidate(5, 'Separate active intent from completed-session evidence', 'An in-progress handoff intent previously advanced the startup session clock.', /handoffCompleted/.test(coherence), 'Derive completion only from the handoff heading or completed ledger sources.'),
    candidate(6, 'Cross-check every derived SIL surface against its ledger', `Latest scored ledger: S${sil?.session ?? '?'} · ${sil?.total ?? '?'}/${sil?.max ?? 1000}.`, /latestSilSnapshot/.test(silGate) && /PROJECT_STATUS SIL/.test(silGate), 'Fail when PROJECT_STATUS session, total, or category vector diverges from the append-only ledger.'),
    candidate(7, 'Escalate stranded deploys only on consecutive evidence', 'One behind receipt can be propagation lag; two consecutive receipts indicate a stranded promotion.', /currentBehindStreak/.test(beacon) && /strandedAlert/.test(beacon), 'Keep the beacon non-red for one settling receipt and explicit at the configured threshold.'),
    candidate(8, 'Make production parity prove it left localhost', 'The former production command could execute a local self-comparison and still look like a wired verification.', /canonical production origin/.test(parityContract) && /must not use --local/.test(parityContract), 'Structurally reject local mode, missing canonical origin binding, and parser duplication in every production evidence caller.'),
    candidate(9, 'Separate staging readiness from production currency for humans', 'A green candidate and a stale production route can both be true; one tile must not borrow the other state.', /Production deploy currency/.test(statusPage) && /shell fingerprint drift/.test(statusPage), 'Render commit distance and route-local shell state independently from staging health.'),
    candidate(10, 'Treat real-observation waits as gates, not local work', 'The Genius List called an already-instrumented recovery receipt open and unblocked even though only future source evidence can close it.', /evidenceWaitGateForTask/.test(geniusClassifier) && /external-evidence-wait/.test(geniusClassifier), 'Keep future real-recovery work visible in the deferred ledger without encouraging fabricated local closure.'),
  ];

  const lines = [
    '# Innovation Pack',
    '',
    `Generated: ${new Date().toISOString().slice(0, 10)} · source: live tracked code`,
    '',
    'Second-order candidates derived after the primary Unified Genius List pass. Status is computed from source evidence; no candidate is marked shipped by prose alone.',
    '',
    `Signals: ${files.length} tracked files · ${markerCount(files)} TODO/FIXME markers outside archives · latest SIL ${sil?.total ?? '?'}/${sil?.max ?? 1000}.`,
    '',
    ...candidates.flatMap((item) => [
      `## ${item.rank}. ${item.title}`,
      '',
      `**Status:** ${item.status}`,
      '',
      `**Evidence:** ${item.evidence}`,
      '',
      `**Quality bar:** ${item.next}`,
      '',
    ]),
  ];
  return `${lines.join('\n').trim()}\n`;
}

const rendered = buildPack();
if (CHECK) {
  const current = read('docs/INNOVATION_PACK.md');
  if (current !== rendered) {
    console.error('generate-innovation-pack --check: drift detected; run node scripts/ops.mjs innovation-pack');
    process.exit(1);
  }
  console.log('generate-innovation-pack --check: current');
} else {
  fs.writeFileSync(OUT, rendered, 'utf8');
  console.log(`generate-innovation-pack: wrote ${path.relative(ROOT, OUT)}`);
}
