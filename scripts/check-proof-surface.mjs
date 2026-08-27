#!/usr/bin/env node
/**
 * check-proof-surface.mjs (S192)
 *
 * Single orchestrator for the S192 proof-surface honesty gates, kept as ONE
 * build:check entry on purpose: build:check is invoked by npm through cmd.exe on
 * Windows, which caps the command line at 8191 chars — the chain was already at
 * the edge, so four more `&&` segments overflowed it locally (CI on bash is
 * unaffected). Collapsing them here keeps the gate intact without lengthening the
 * npm script. Each sub-check runs in its own process; any non-zero fails the gate.
 *
 * Runs (in order): build-public-status self-test+check · build-security-posture
 * self-test+check · build-status-proof --check · check-proof-feed-generators
 * self-test+live (no bundled proof feed is a hand-seed) · check-og-images
 * self-test+live (S194 — no crawler-facing share card is a blank SVG/missing PNG).
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { format } from 'node:util';
import { spawnSync } from './lib/safe-spawn.mjs';
import path from 'node:path';
import url from 'node:url';
import { writeJsonAtomic, writeTextAtomic } from './lib/evidence-io.mjs';
import { receiptIdFor } from './lib/build-check-evidence.mjs';
import {
  runProofDiagnosticsSelfTest,
  summarizeProofRows as summarizeRows,
  validateProofDiagnostics,
} from './lib/proof-diagnostics.mjs';
import { runProofCommand as runPublicStatus } from './build-public-status.mjs';
import { runProofCommand as runSecurityPosture } from './build-security-posture.mjs';
import { runProofCommand as runFeedGenerators } from './check-proof-feed-generators.mjs';
import { runProofCommand as runOgImages } from './check-og-images.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIAG_JSON = path.join(ROOT, 'api', 'proof-surface-diagnostics.json');
const DIAG_MD = path.join(ROOT, 'docs', 'PROOF_SURFACE_DIAGNOSTICS.md');
export function classifyFailure(row) {
  const command = String(row?.command || '');
  const error = String(row?.error || '');
  if (/check-registry-freshness|validate-compliance|track-compliance-velocity|check-nav-catalog-sync/.test(command)) {
    return { owner: 'sibling', class: 'portfolio-drift', blocking: false };
  }
  if (/freshness|generatedAt|stale|build-sha|trust-feed|feed-publisher|content-freshness|ci-status/.test(command)) {
    return { owner: 'self', class: 'freshness', blocking: true };
  }
  if (/timeout|ETIMEDOUT|ECONNRESET|EAI_AGAIN|network|flaky/i.test(error)) {
    return { owner: 'unknown', class: 'flaky-or-external', blocking: true };
  }
  if (/ENOENT|MODULE_NOT_FOUND|ERR_MODULE_NOT_FOUND/.test(error)) {
    return { owner: 'self', class: 'local-tooling', blocking: true };
  }
  return { owner: 'self', class: 'contract', blocking: true };
}

function runSelfTest() {
  const cases = [
    ['registry drift is sibling-owned', classifyFailure({ command: 'node scripts/check-registry-freshness.mjs' }).owner === 'sibling'],
    ['trust feed stale is freshness', classifyFailure({ command: 'node scripts/check-trust-feed-freshness.mjs' }).class === 'freshness'],
    ['network timeout is flaky/external', classifyFailure({ command: 'node scripts/foo.mjs', error: 'ETIMEDOUT' }).class === 'flaky-or-external'],
    ['missing module is local tooling', classifyFailure({ command: 'node scripts/foo.mjs', error: 'ERR_MODULE_NOT_FOUND' }).class === 'local-tooling'],
    ['ordinary checker failure is contract', classifyFailure({ command: 'node scripts/check-proof-feed-generators.mjs' }).class === 'contract'],
    ['advisory red is recorded without blocking', (() => { const s = summarizeRows([{ status: 1, durationMs: 5, enforcement: 'advisory' }]); return s.advisoryFailed === 1 && s.blockingFailed === 0 && s.overallPass; })()],
    ['blocking red fails the receipt', (() => { const s = summarizeRows([{ status: 1, durationMs: 7, enforcement: 'blocking' }]); return s.blockingFailed === 1 && !s.overallPass; })()],
    ['classified timings include every row', summarizeRows([{ status: 0, durationMs: 3, enforcement: 'blocking' }, { status: 0, durationMs: 4, enforcement: 'advisory' }]).totalDurationMs === 7],
    ['malformed persisted receipt fails closed', (() => { try { validateProofDiagnostics({ schemaVersion: '2.0', steps: [], commandCount: 1 }); return false; } catch { return true; } })()],
    ...runProofDiagnosticsSelfTest().map(([name, ok]) => [`receipt contract · ${name}`, ok]),
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (failed.length) {
    console.error(`check-proof-surface --self-test: ${failed.length} failure(s)`);
    process.exit(1);
  }
  console.log('check-proof-surface --self-test: all passed');
}

if (process.argv.includes('--self-test')) { runSelfTest(); process.exit(0); }

// Ordering preserved from the prior inline build:check chain: derive/verify the
// posture feeds first, then the manifest that bundles them, then the gate that
// proves none of them is a hand-seed.
const STEPS = [
  ['build-public-status.mjs', ['--self-test']],
  ['build-public-status.mjs', ['--check']],
  ['build-security-posture.mjs', ['--self-test']],
  ['build-security-posture.mjs', ['--check']],
  // S293: --check-content was declared as this node's verification in
  // config/evidence-graph.json but was never actually passed here, so the
  // embedded-source-content half of the contract never ran. A declared check
  // that nothing executes is indistinguishable from a passing one.
  // check-evidence-check-reachability.mjs now makes that class impossible.
  ['build-status-proof.mjs', ['--check', '--check-content']],
  ['check-proof-feed-generators.mjs', ['--self-test']],
  ['check-proof-feed-generators.mjs', []],
  // S194: social-card integrity — an SVG/_og or missing-asset og:image renders a
  // blank share card on every platform, a silent conversion leak on shared links.
  ['check-og-images.mjs', ['--self-test']],
  ['check-og-images.mjs', []],
  // S239: OG-coverage observability — persists card/dark/untriaged counts to
  // api/og-coverage.json so coverage trends are measurable over time, not just
  // a transient build-log line. The --check gate verifies freshness + shape.
  ['build-og-coverage.mjs', ['--self-test']],
  ['build-og-coverage.mjs', ['--check']],
  // S196: per-title share cards — the generator that rasterizes the OG SVG to real
  // PNGs (via sharp) for every page still on a generic card. Its --self-test guards
  // the slug/generic-detection/raster logic so the bespoke-card pipeline can't drift.
  ['build-og-cards.mjs', ['--self-test']],
  // S196: collection structured-data — the journal/archive/dispatches/changelog listing
  // pages must carry CollectionPage schema (journal+archive enumerate every post). The
  // --check fails if a new journal post isn't reflected in the ItemList (drift guard).
  ['inject-collection-jsonld.mjs', ['--self-test']],
  ['inject-collection-jsonld.mjs', ['--check']],
  // S194: schema honesty — no VideoGame page may carry a fabricated aggregateRating
  // (S193 removed three; this keeps invented review stars from silently returning).
  ['check-videogame-schema.mjs', ['--self-test']],
  ['check-videogame-schema.mjs', []],
  // S236: VideoGame schema completeness — all game pages must carry applicationCategory,
  // operatingSystem, and image in their VideoGame JSON-LD; vaultspark-forge upgraded from
  // SoftwareApplication. Folded here to keep build:check under the cmd.exe 8191-char limit.
  ['enrich-videogame-schema.mjs', ['--check']],
  // S236: Project schema completeness — projects/index.html carries CollectionPage/hasPart
  // ItemList; signal-log/vault-member/vault-pipeline carry their proper app-schema types.
  // Prevents the project directory from being a structured-data dead zone.
  ['enrich-projects-schema.mjs', ['--check']],
  // S236: Schema coverage gate — 16 high-traffic public pages must each carry at least one
  // entity-schema @type beyond BreadcrumbList/ListItem nav-only types. Closes the structured-
  // data dead-zone class (membership, oracle, press, community all had zero entity context).
  ['check-schema-coverage.mjs', ['--self-test']],
  ['check-schema-coverage.mjs', []],
  // S197: SPARKED↔playable coherence — a live game's page must not contradict its
  // own status with a stale "Demo Coming Soon" / [GAME_EMBED_URL] placeholder, and
  // must expose a real play link. Closes the self-contradicting-surface class on
  // the studio's prime conversion surface without lengthening the build:check chain.
  ['check-game-playability-coherence.mjs', ['--self-test']],
  ['check-game-playability-coherence.mjs', []],
  // S248: hero spotlight coherence — the editorially-curated hero showcase (catalog
  // `spotlight` ranks → hero tile order) must stay coherent: unique/contiguous ranks,
  // no VAULTED flagship, and the rendered index.html hero order actually matches the
  // curation. Blocks a silent break in the first surface every human + agent sees.
  ['check-hero-spotlight-coherence.mjs', ['--self-test']],
  ['check-hero-spotlight-coherence.mjs', []],
  // D-S208.4: project-hyperlink coverage — every Atlas + hero project link must
  // resolve to a real on-disk page or a valid (non-dev-host) live URL. Fails on a
  // dead page or a dev/staging host leaking as a public CTA. The studio site is the
  // live source of truth for the ecosystem, so its links are verified every build.
  ['check-project-links.mjs', ['--self-test']],
  ['check-project-links.mjs', []],
  // D-S208.5: every forge/pre-launch project the registry surfaces must have an
  // on-site studio page (generated by build-forge-project-pages.mjs) so the Atlas/
  // hero never link to a generic fallback. --check fails if a configured page is missing.
  ['build-forge-project-pages.mjs', ['--self-test']],
  ['build-forge-project-pages.mjs', ['--check']],
  // D-S208.6: portfolio counts derive from the catalog — the press-kit "N sparked ·
  // M forge" stat line + prose count words are injected at build time, so they can't
  // drift when a project's status changes (they broke build:check twice in S208).
  ['build-portfolio-counts.mjs', ['--self-test']],
  ['build-portfolio-counts.mjs', ['--check']],
  // D-S208.7: registry-freshness self-test — the diff logic that surfaces local↔canonical
  // registry divergence (the silent-drift class behind the S208 wrong-links problem).
  // The live run is advisory (below); only its self-test gates here.
  ['check-registry-freshness.mjs', ['--self-test']],
  // D-S251.1: TASK_BOARD duplicate-title self-test — guards the exact-title matching
  // logic that flags resolved-DONE carries surviving as open duplicates. The live
  // run is advisory (below); only its self-test gates here.
  ['check-taskboard-duplicate-titles.mjs', ['--self-test']],
  // S195: structured-data coverage — every indexable public page must carry a
  // BreadcrumbList so breadcrumb rich-results never silently regress (folded into
  // this orchestrator rather than extending the cmd.exe-bounded build:check chain).
  ['inject-breadcrumb-jsonld.mjs', ['--check']],
  // S305: THE DESK (/news) — day artifacts, hash-chained prediction ledger, and
  // carousel feed stay reproducible; pages stay in sync with committed days.
  ['build-news-desk.mjs', ['--self-test']],
  ['build-news-desk.mjs', ['--check']],
  ['generate-news-pages.mjs', ['--check']],
  // S327: public-safe scheduler receipt — the status surface must derive the
  // latest observed Desk run and next expected slot from workflow/CI evidence.
  ['build-newsroom-run.mjs', ['--self-test']],
  ['build-newsroom-run.mjs', ['--check']],
  // S242: Oracle + Studio Pulse hydration — executable Oracle inline scripts must
  // parse, the public 60-day velocity fallback must stay wired, and Studio Pulse
  // must render public catalog nodes when founder-confirmed graph edges are empty.
  ['check-intelligence-hydration.mjs', ['--self-test']],
  ['check-intelligence-hydration.mjs', []],
  // S198: oracle velocity series — public git-derived cadence feed must be
  // non-empty and schema-valid so the oracle chart never silently shows empty.
  ['build-velocity-series.mjs', ['--self-test']],
  ['build-velocity-series.mjs', ['--check']],
  // S199: game-registry coherence — nav and index HTML must reflect the registry;
  // derive scripts fail --check when any page's games nav is out of sync or any
  // card's data-status drifts from the canonical game-registry.json entry.
  ['derive-game-nav.mjs', ['--self-test']],
  ['derive-game-nav.mjs', ['--check']],
  ['derive-game-index.mjs', ['--self-test']],
  ['derive-game-index.mjs', ['--check']],
  // S199: stale shell cleanup — guard that no unreferenced *.shell-*.js asset
  // accumulates; exits 1 if stale files are found (run --apply to clean).
  ['clean-stale-shells.mjs', ['--check']],
  // S231: trust-feed freshness — generalizes the S230 changelog blockDays ceiling to the
  // machine-generated public trust feeds (status-proof/uptime/site-health/heartbeat). A feed
  // past its hard blockDays ceiling means its scheduled generator is dead (S221/S222 class)
  // and the public site is serving a stale "live" signal → BLOCK build:check. Short drifts
  // stay warn-only; a missing feed warns (existence is gated by each generate-*.mjs --check).
  ['check-trust-feed-freshness.mjs', ['--self-test']],
  ['check-trust-feed-freshness.mjs', []],
  // S238: proof-feed publisher parity — every trust feed above must also declare a real
  // generator + recovery command + scheduled workflow, so a stale feed names exactly how to
  // recover it (no dead end behind a blockDays ceiling). --check verifies api/feed-publishers.json
  // (the public provenance inventory) is in sync with the SURFACES table.
  ['check-feed-publisher-manifest.mjs', ['--self-test']],
  ['check-feed-publisher-manifest.mjs', ['--check']],
  // S205: vault momentum — rolling score from 3 public feeds; gating ensures
  // api/vault-momentum.json stays in sync with source feeds at build time.
  ['build-vault-momentum.mjs', ['--self-test']],
  ['build-vault-momentum.mjs', ['--check']],
  // S216: journal-date gate — every Signal Log post must display a day-level date
  // ("March 5, 2026", not "March 2026"). Fails when update-journal-dates.mjs has not
  // been run after adding a new post. Fix: node scripts/update-journal-dates.mjs.
  ['check-journal-dates.mjs', ['--self-test']],
  ['check-journal-dates.mjs', []],
  // S218: decision-currency — DECISIONS.md "public label" claims are self-validated
  // against the canonical public surface (index.html). A label asserted as "the public
  // label" but absent there is a stale decision (the S218 B3 Forge-Window phantom class):
  // mark it SUPERSEDED or re-propagate. Folded here (not a new cmd.exe-bounded build:check
  // segment) — observability honesty: a decision record must not lie about live state.
  ['check-decision-currency.mjs', ['--self-test']],
  ['check-decision-currency.mjs', []],
  // S218: proposed-graph-edges — the founder curation doc (context/PROPOSED_GRAPH_EDGES.md)
  // must stay in sync with the catalog so the projectGraph activation path never goes stale.
  // Proposals only (D-S218.5 keeps projectGraph founder-confirmed); --check guards drift.
  ['build-proposed-edges.mjs', ['--self-test']],
  ['build-proposed-edges.mjs', ['--check']],
  // S225: leaderboard SEO sub-pages — 7 category pages must exist with correct title/h1/CTA.
  // Missing pages break leaderboards.spec.js in CI. Generated by build-leaderboard-subpages.mjs.
  ['build-leaderboard-subpages.mjs', ['--check']],
  // S227: sitemap coverage — every generated page (leaderboards/games/projects) present in sitemap.xml.
  ['check-sitemap-coverage.mjs', []],
  // S234: cross-surface truth sentinel — gates the drift CLASS (retired vocab, tier-theme
  // disagreement, stale days-since-launch, vaulted-count mismatch). Self-test gates here;
  // the live run also executes as an advisory below.
  ['check-content-coherence.mjs', ['--self-test']],
  ['check-content-coherence.mjs', []],
  // S235: Oracle prebaked answers — committed, public-safe answer corpus must stay
  // in sync with oracle-insights + membership tiers so the agent Answer API never drifts.
  ['build-oracle-answers.mjs', ['--self-test']],
  ['build-oracle-answers.mjs', ['--check']],
  // S239: Worker rewriter safety — every HTMLRewriter.transform() call must chain
  // .arrayBuffer() before the result is assigned or cloned. A streaming transform
  // cloned twice creates a double-tee backpressure deadlock (S239 P0). This gate
  // makes that regression impossible to miss at build time.
  ['check-worker-rewriter-safety.mjs', ['--self-test']],
  ['check-worker-rewriter-safety.mjs', []],
  // S247: hero badge ↔ nav status-group coherence (velaxis/vorn/promogrind/
  // vault-member said "Forge" while the nav promoted them as "Sparked").
  ['check-project-status-coherence.mjs', ['--self-test']],
  ['check-project-status-coherence.mjs', []],
  // S249: decided-phantom registry integrity — every context/PHANTOM_CARRIES.json
  // entry that the genius generator uses to suppress a settled-rejected carry must
  // stay DECISION-BACKED (its supersededBy id present in DECISIONS.md) so the
  // suppressor can never silently bury a live item. Folded here, not into the
  // cmd.exe-bounded build:check chain (8035/8191 chars).
  ['check-phantom-carries.mjs', ['--self-test']],
  ['check-phantom-carries.mjs', []],
  // S321: provider-chain classifiers. The `--live` path probes the external Obelisk
  // routes and is run on demand (it needs network), but the classifiers it decides
  // with are pure and hermetic, so they belong in a blocking chain: they encode what
  // "the provider shipped this route" means. The S319 outage shape — discovery
  // answering 200 with HTML from an SPA catch-all — is a fixture here, as is the
  // rule that an unprobed leg is `unverified` and never counts as ready. Folded here
  // rather than into the cmd.exe-bounded build:check chain.
  ['verify-provider-chain.mjs', ['--self-test']],
  // S330 merge-integration sweep: these checks existed and exposed --check or
  // live verification modes, but no authoritative release path invoked them.
  // Keep them inside the measured proof runner so the Windows command-length
  // ceiling stays bounded while reachability remains explicit.
  ['build-intelligence-suite.mjs', ['--self-test']],
  ['build-intelligence-suite.mjs', ['--check']],
  ['build-news-visual-receipts.mjs', ['--self-test']],
  ['build-news-visual-receipts.mjs', ['--check']],
  ['build-projects-catalog.mjs', ['--self-test']],
  ['build-projects-catalog.mjs', ['--check']],
  ['build-route-consolidation.mjs', ['--self-test']],
  ['build-route-consolidation.mjs', ['--check']],
  ['check-cache-evidence-classification.mjs', ['--self-test']],
  ['check-cache-evidence-classification.mjs', []],
  ['check-franchise-interaction-attribution.mjs', ['--self-test']],
  ['check-franchise-interaction-attribution.mjs', []],
  ['check-receipt-ordering.mjs', ['--self-test']],
  ['check-receipt-ordering.mjs', []],
  ['check-visual-qa-retention.mjs', ['--self-test']],
  ['check-visual-qa-retention.mjs', ['--check']],
  ['generate-sitemap.mjs', ['--self-test']],
  ['generate-sitemap.mjs', ['--check']],
];

const ADVISORY_STEPS = [
  ['check-mission-statement-coherence.mjs', [], 'retired framing detected'],
  ['check-dead-ctas.mjs', ['--check'], 'dead CTA feed drift'],
  // S321: this gate carried "freshness" in its name for fifteen sessions while only
  // asserting voice regexes, and exited 0 the whole time the public status surface
  // published an outage that had ended. It now also requires a degradation claim to
  // be corroborated by a fresh, actually-degraded receipt.
  ['check-public-note-freshness.mjs', ['--self-test'], 'public-copy gate self-test'],
  ['check-public-note-freshness.mjs', [], 'dev jargon or an uncorroborated degradation claim in public copy'],
  ['check-identity-coherence.mjs', [], 'identity-narrowing copy found'],
  ['build-oracle-query-insights.mjs', ['--check'], 'Oracle query insights missing or stale'],
  ['build-constellation-activity.mjs', ['--check'], 'constellation activity missing or stale'],
  ['build-oracle-feedback-themes.mjs', ['--check'], 'Oracle feedback themes missing or stale'],
  ['build-cta-state.mjs', ['--check'], 'CTA state missing or stale'],
  ['build-hero-portfolio.mjs', ['--check'], 'hero portfolio stale'],
  ['build-atlas.mjs', ['--check'], 'Atlas index stale'],
  ['check-registry-freshness.mjs', [], 'local/canonical registry divergence'],
  ['check-nav-catalog-sync.mjs', [], 'SPARKED catalog entries missing from navigation'],
  ['generate-build-sha.mjs', ['--check'], 'build SHA missing or stale'],
  ['check-lighthouse-trend.mjs', [], 'Lighthouse trend regression'],
  ['check-taskboard-duplicate-titles.mjs', [], 'duplicate active/completed task titles'],
  // S324: this gate printed `state: rejected` and exited 0 — a well-formed
  // rejection read as a pass, so the cross-repo release handshake could never
  // hold anything. It now exits 1 on `rejected`. It lands in the ADVISORY lane
  // rather than the blocking one deliberately: the standing rejection is
  // `obelisk-staging-registration:missing`, an unanswered Ark cargo owned by a
  // sibling repo. CANON-018 says resolve that upstream, not from here, so
  // blocking this repo's suite on it would be noise. Advisory makes the
  // rejection VISIBLE AND NAMED, which is the actual fix for printing it as
  // success.
  ['build-release-dependencies.mjs', ['--check'], 'release dependency handshake rejected (a declared cross-repo dependency is missing/invalid/expired)'],
];

if (process.argv.includes('--check-diagnostics')) {
  try {
    const receipt = validateProofDiagnostics(JSON.parse(readFileSync(DIAG_JSON, 'utf8')), {
      expectedBlockingCount: STEPS.length,
      expectedAdvisoryCount: ADVISORY_STEPS.length,
    });
    const markdown = readFileSync(DIAG_MD, 'utf8');
    if (!markdown.includes(`Receipt: \`${receipt.receiptId}\``)) throw new Error('Markdown receipt does not match JSON receiptId');
    console.log(`check-proof-surface --check-diagnostics: ok (${receipt.commandCount} commands · ${receipt.blockingCount} blocking · ${receipt.advisoryCount} advisory · receipt ${receipt.receiptId})`);
    process.exit(0);
  } catch (error) {
    console.error(`check-proof-surface --check-diagnostics: malformed receipt — ${error.message}`);
    process.exit(1);
  }
}
const rows = [];
const startedAt = new Date().toISOString();

const MODULE_RUNNERS = new Map([
  ['build-public-status.mjs', runPublicStatus],
  ['build-security-posture.mjs', runSecurityPosture],
  ['check-proof-feed-generators.mjs', runFeedGenerators],
  ['check-og-images.mjs', runOgImages],
]);

function captureModuleOutput(run) {
  const chunks = [];
  const originals = { log: console.log, warn: console.warn, error: console.error };
  for (const level of Object.keys(originals)) console[level] = (...values) => chunks.push(`${level}: ${format(...values)}`);
  try {
    return { status: run(), output: chunks.join('\n') };
  } catch (error) {
    chunks.push(`error: ${error?.stack || error?.message || String(error)}`);
    return { status: 1, output: chunks.join('\n'), error };
  } finally {
    Object.assign(console, originals);
  }
}

function runStep(script, args, enforcement, warning = null) {
  const command = `node scripts/${script}${args.length ? ` ${args.join(' ')}` : ''}`;
  const stepStarted = Date.now();
  const moduleRunner = MODULE_RUNNERS.get(script);
  const result = moduleRunner
    ? captureModuleOutput(() => moduleRunner(args))
    : spawnSync(process.execPath, [path.join(__dirname, script), ...args], {
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  const output = moduleRunner
    ? result.output
    : [result.stdout, result.stderr].filter(Boolean).join(result.stdout && result.stderr ? '\n' : '');
  const status = result.error ? 1 : (result.status ?? 1);
  const durationMs = Date.now() - stepStarted;
  rows.push({
    step: rows.length + 1,
    command,
    enforcement,
    status,
    durationMs,
    executor: moduleRunner ? 'module' : 'process',
    outputBytes: Buffer.byteLength(output || '', 'utf8'),
    outputDigest: createHash('sha256').update(output || '').digest('hex').slice(0, 16),
    error: result.error ? result.error.message : null,
  });
  const marker = status === 0 ? '✓' : enforcement === 'advisory' ? '⚠' : '✗';
  console.log(`  ${marker} ${String(rows.length).padStart(2, '0')}/${STEPS.length + ADVISORY_STEPS.length} ${command} · ${durationMs}ms · ${moduleRunner ? 'module' : 'process'}`);
  if (status !== 0 && output) console.error(output.trimEnd());
  if (status !== 0 && enforcement === 'advisory') {
    console.warn(`  ⚠  ${script}: ${warning || 'advisory check reported a finding'}`);
  }
  return status;
}

function writeDiagnostics() {
  const finishedAt = new Date().toISOString();
  const counts = summarizeRows(rows);
  const failures = rows.filter((row) => row.status !== 0);
  const classifiedFailures = failures.map((row) => ({
    ...row,
    classification: { ...classifyFailure(row), blocking: row.enforcement === 'blocking' },
  }));
  const slowest = [...rows].sort((a, b) => b.durationMs - a.durationMs).slice(0, 10);
  const summary = {
    schemaVersion: '2.0',
    generatedAt: finishedAt,
    publicSafe: true,
    source: 'scripts/check-proof-surface.mjs',
    ...counts,
    plannedBlockingCount: STEPS.length,
    plannedAdvisoryCount: ADVISORY_STEPS.length,
    coverageComplete: counts.blockingCount === STEPS.length && counts.advisoryCount === ADVISORY_STEPS.length,
    startedAt,
    finishedAt,
    slowest,
    failures: classifiedFailures,
    steps: rows,
    execution: {
      moduleCommands: rows.filter((row) => row.executor === 'module').length,
      processCommands: rows.filter((row) => row.executor === 'process').length,
      quietOnSuccess: true,
      fullOutputOnFailure: true,
    },
    note: 'Public-safe timing, executor, output-byte count/digest, planned coverage, and direct status receipt for every logical blocking and advisory proof command. Passing output is suppressed; full output is printed only on failure and never persisted.',
  };
  summary.receiptId = receiptIdFor(summary);
  writeJsonAtomic(DIAG_JSON, summary);
  const lines = [
    '# Proof Surface Diagnostics',
    '',
    `Generated: ${summary.generatedAt}`,
    `Receipt: \`${summary.receiptId}\` · coverage ${summary.commandCount}/${summary.plannedBlockingCount + summary.plannedAdvisoryCount}`,
    '',
    `Latest: **${summary.passed}/${summary.commandCount}** passed · blocking ${summary.blockingCount - summary.blockingFailed}/${summary.blockingCount} · advisory findings ${summary.advisoryFailed}/${summary.advisoryCount} · total ${(summary.totalDurationMs / 1000).toFixed(1)}s`,
    '',
    '## Slowest Substeps',
    '',
    '| Step | Class | Duration | Status | Command |',
    '|---:|---|---:|---:|---|',
    ...summary.slowest.map((row) => `| ${row.step} | ${row.enforcement} | ${(row.durationMs / 1000).toFixed(1)}s | ${row.status} | \`${row.command}\` |`),
    '',
    '## Failures',
    '',
    ...(summary.failures.length
      ? summary.failures.map((row) => `- Step ${row.step} [${row.enforcement}]: \`${row.command}\` exited ${row.status}${row.error ? ` (${row.error})` : ''} — ${row.classification.owner}/${row.classification.class}`)
      : ['- None.']),
    '',
  ];
  writeTextAtomic(DIAG_MD, lines.join('\n'));
  const persisted = validateProofDiagnostics(JSON.parse(readFileSync(DIAG_JSON, 'utf8')), {
    expectedBlockingCount: STEPS.length,
    expectedAdvisoryCount: ADVISORY_STEPS.length,
  });
  const persistedMarkdown = readFileSync(DIAG_MD, 'utf8');
  if (!persistedMarkdown.includes(`Receipt: \`${persisted.receiptId}\``)) {
    throw new Error('persisted proof diagnostic Markdown does not match JSON receiptId');
  }
  return summary;
}

let blockingFailed = false;
for (const [script, args] of STEPS) {
  if (runStep(script, args, 'blocking') !== 0) {
    blockingFailed = true;
    break;
  }
}

if (!blockingFailed) {
  for (const [script, args, warning] of ADVISORY_STEPS) runStep(script, args, 'advisory', warning);
}

const summary = writeDiagnostics();
if (!summary.overallPass) {
  console.error('check-proof-surface: a blocking proof-surface honesty gate failed (see above).');
  process.exit(1);
}
console.log(`check-proof-surface ✓ ${summary.blockingCount}/${summary.blockingCount} blocking passed · ${summary.advisoryFailed} advisory finding(s) recorded`);
