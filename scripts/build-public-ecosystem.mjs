#!/usr/bin/env node
/**
 * build-public-ecosystem — public-safe Oracle rich-layer feed.
 *
 * Founder decision (S193): the Oracle's rich panels may show ALL EXTERNAL
 * (public) projects, with NO proprietary internal-only data. This derives a
 * sanitized `api/ecosystem-state.json` from the local, gitignored
 * `ignis/output/ecosystem-state.json` (which aggregates every sibling repo,
 * sealed projects included) by:
 *   - keeping only public-audience projects (drops audience=internal + VAULTED/sealed)
 *   - dropping internal-only fields (blockers, blockerCount, stagingUrl, internal links)
 *   - running the voice firewall over currentFocus / nextMilestone / voice / studioVoice
 *     (the same Studio-OS-jargon scrub used for Ask IGNIS — [[feedback_voice_leak_patrol]])
 *
 * The Oracle (oracle/index.html + assets/oracle-extra.js) falls back to this
 * deployed feed so the cognition hero + ecosystem panels light up on prod,
 * where the local /ignis/output/* feed 404s.
 *
 * Modes:
 *   (default)     regenerate api/ecosystem-state.json from the local source.
 *                 If the local source is ABSENT (CI), warn + exit 0 — never
 *                 clobber the committed artifact from a missing input.
 *   --check       validate the COMMITTED artifact's structure + public-safety
 *                 (no internal/sealed projects, no jargon leak). Reads only the
 *                 committed file, so it is deterministic in CI where the volatile
 *                 source is absent ([[feedback_check_gate_volatile_input_drift]]).
 *   --self-test   unit-check the filter + sanitizer.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'ignis', 'output', 'ecosystem-state.json');
const OUT = path.join(ROOT, 'api', 'ecosystem-state.json');

const CHECK = process.argv.includes('--check');
const SELFTEST = process.argv.includes('--self-test');

// ── Voice firewall (same class as build-ignis-search-index) ───────────────────
const FORBIDDEN = [
  [/\bS\d{2,3}\b/gi, ''],
  [/\bsession\s+\d+\b/gi, ''],
  [/\bgoal[\s-]*chain\b/gi, ''],
  [/\/(start|audit|implement|closeout|go)\b/gi, ''],
  [/\bbuild:check\b/gi, 'automated checks'],
  [/\bproof surface\b/gi, 'public proof pages'],
  [/\bharden(?:ed|ing)?\s+its\s+honesty\b/gi, ''],
  [/\b\d+\s+shipped\b/gi, ''],
  [/\bdeferred[\s-]*(?:with[\s-]*evidence)?\b/gi, ''],
  [/\bgates?\s+green\b/gi, ''],
  [/\bself[\s-]*tests?\b/gi, ''],
  [/\b[0-9a-f]{7,40}\b/g, ''],
  [/[#>]+/g, ' '],
];
function sanitize(s) {
  let out = String(s || '');
  for (const [re, rep] of FORBIDDEN) out = out.replace(re, rep);
  return out.replace(/\s+([.,;:])/g, '$1').replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').trim();
}

const LEAK = /\bS\d{2,3}\b|goal[\s-]*chain|\/(start|audit|implement|closeout)\b|\bdeferred\b|\d+\s+shipped|proof surface|build:check/i;

// A project is public/external iff its audience starts with "public" and it is
// not sealed/VAULTED. Everything else is internal-only and is dropped.
function isPublic(p) {
  const aud = String(p.audience || '').toLowerCase();
  const status = String(p.vaultStatus || '').toLowerCase();
  if (status === 'vaulted' || p.sealed) return false;
  return aud.startsWith('public');
}

// Public per-project COPY comes from the curated public catalog note (already
// public-voice), NOT the internal ecosystem-state currentFocus/voice (those are
// raw multi-paragraph sprint brain-dumps — proprietary internal-only per the S193
// founder decision). The ecosystem-state contributes scores/health/structure only.
function sanitizeProject(p, publicNote) {
  return {
    slug: p.slug,
    name: p.name,
    type: p.type,
    medium: p.medium,
    vaultStatus: p.vaultStatus,
    health: p.health,
    liveUrl: p.liveUrl || p.runtimeUrl || null,
    // public curated copy only; truncated + jargon-scrubbed as a safety net.
    currentFocus: sanitize(publicNote).slice(0, 240),
    nextMilestone: '',
    ignisScore: p.ignisScore ?? null,
    ignisGrade: p.ignisGrade ?? null,
    lastUpdated: p.lastUpdated,
    staleDays: p.staleDays ?? 0,
    voice: '',
    // internal-only fields intentionally dropped: blockers, blockerCount,
    // stagingUrl, internal links, raw currentFocus/voice. blockerCount zeroed.
    blockerCount: 0,
  };
}

function build(srcJson, publicCatalog) {
  const noteBySlug = new Map((publicCatalog || []).map((c) => [c.id, c.note || '']));
  const publicProjects = (srcJson.projects || []).filter(isPublic)
    .map((p) => sanitizeProject(p, noteBySlug.get(p.slug) || ''));
  const agg = srcJson.ignisAggregate || null;
  const publicAgg = agg ? {
    currentStudioScore: agg.currentStudioScore ?? null,
    previousScore: agg.previousScore ?? null,
    trend: agg.trend || 'flat',
    studioCognitionTier: agg.studioCognitionTier || 'forge',
    sessionsRecorded: agg.sessionsRecorded ?? 0,
    studioVoice: sanitize(agg.studioVoice).slice(0, 200),
  } : null;
  return {
    schemaVersion: '1.0',
    generatedAt: srcJson.generatedAt || null,   // deterministic: track the source, not wall-clock
    generatedBy: 'scripts/build-public-ecosystem.mjs',
    publicSafe: true,
    audience: 'public-only (external projects; internal + sealed excluded per S193 founder decision)',
    studioTotals: {
      publicProjects: publicProjects.length,
      green: publicProjects.filter((p) => p.health === 'green').length,
      yellow: publicProjects.filter((p) => p.health === 'yellow').length,
    },
    ignisAggregate: publicAgg,
    projects: publicProjects,
  };
}

// ── Self-test (also run at the top of --check so build:check needs one segment
//    only — the cmd.exe 8191 limit is near. [[feedback_buildcheck_cmdexe_length_limit]]) ──
function runSelfTest() {
  let pass = 0, fail = 0;
  const t = (name, cond) => { if (cond) { pass++; } else { fail++; console.error('  ✘ ' + name); } };
  t('drops VAULTED', !isPublic({ audience: 'public-live', vaultStatus: 'VAULTED' }));
  t('drops internal audience', !isPublic({ audience: 'internal', vaultStatus: 'sparked' }));
  t('keeps public-live', isPublic({ audience: 'public-live', vaultStatus: 'sparked' }));
  t('keeps public-forge', isPublic({ audience: 'public-forge', vaultStatus: 'forge' }));
  t('drops sealed flag', !isPublic({ audience: 'public-live', sealed: true }));
  t('sanitize strips session jargon', !LEAK.test(sanitize('S191 goal-chain (/start -> /audit): 4 shipped')));
  t('sanitize keeps real prose', sanitize('Playable now. Live multiplayer chaos.') === 'Playable now. Live multiplayer chaos.');
  const sample = build({ generatedAt: '2026-06-12T00:00:00Z', ignisAggregate: { currentStudioScore: 100, studioVoice: 'S191 shipped 4' }, projects: [
    { slug: 'a', name: 'A', audience: 'public-live', vaultStatus: 'sparked', currentFocus: 'S191 goal-chain work', blockerCount: 5 },
    { slug: 'b', name: 'B', audience: 'internal', vaultStatus: 'sparked' },
  ] }, [{ id: 'a', note: 'Playable now. Live multiplayer chaos.' }]);
  t('build uses public catalog note', sample.projects[0].currentFocus === 'Playable now. Live multiplayer chaos.');
  t('build drops internal voice', sample.projects[0].voice === '');
  t('build keeps only public', sample.projects.length === 1 && sample.projects[0].slug === 'a');
  t('build zeroes blockerCount', sample.projects[0].blockerCount === 0);
  t('build sanitizes focus', !LEAK.test(sample.projects[0].currentFocus));
  t('build sanitizes studioVoice', !LEAK.test(sample.ignisAggregate.studioVoice));
  console.log(`build-public-ecosystem --self-test: ${pass} passed, ${fail} failed`);
  return fail;
}

if (SELFTEST) {
  process.exit(runSelfTest() ? 1 : 0);
}

// ── Check (committed artifact only — deterministic in CI) ──────────────────────
if (CHECK) {
  if (runSelfTest()) process.exit(1);
  if (!fs.existsSync(OUT)) {
    console.error('build-public-ecosystem --check: api/ecosystem-state.json is missing');
    process.exit(1);
  }
  let art;
  try { art = JSON.parse(fs.readFileSync(OUT, 'utf8')); }
  catch { console.error('build-public-ecosystem --check: api/ecosystem-state.json is not valid JSON'); process.exit(1); }
  const errs = [];
  if (!art.publicSafe) errs.push('publicSafe flag missing/false');
  if (!Array.isArray(art.projects)) errs.push('projects[] missing');
  for (const p of art.projects || []) {
    if (String(p.vaultStatus || '').toLowerCase() === 'vaulted') errs.push(`sealed/VAULTED project leaked: ${p.slug}`);
    if (p.blockerCount) errs.push(`internal blockerCount leaked: ${p.slug}`);
    if ('blockers' in p || 'stagingUrl' in p) errs.push(`internal field leaked: ${p.slug}`);
    if (LEAK.test(p.currentFocus || '') || LEAK.test(p.voice || '') || LEAK.test(p.nextMilestone || '')) errs.push(`voice-leak in ${p.slug}`);
  }
  if (art.ignisAggregate && LEAK.test(art.ignisAggregate.studioVoice || '')) errs.push('voice-leak in studioVoice');
  if (errs.length) {
    console.error('build-public-ecosystem --check FAILED:');
    errs.forEach((e) => console.error('  - ' + e));
    process.exit(1);
  }
  console.log(`build-public-ecosystem --check: ok (${art.projects.length} public projects, no internal leak)`);
  process.exit(0);
}

// ── Default: regenerate from local source (skip gracefully if absent) ─────────
if (!fs.existsSync(SRC)) {
  console.log('build-public-ecosystem: local ignis/output/ecosystem-state.json absent (CI) — keeping committed artifact, skipping regen');
  process.exit(0);
}
const srcJson = JSON.parse(fs.readFileSync(SRC, 'utf8'));
let publicCatalog = [];
try { publicCatalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'api', 'public-intelligence.json'), 'utf8')).catalog || []; } catch { /* none */ }
const artifact = build(srcJson, publicCatalog);
fs.writeFileSync(OUT, JSON.stringify(artifact, null, 2) + '\n');
console.log(`build-public-ecosystem -> api/ecosystem-state.json (${artifact.projects.length} public projects, sealed/internal excluded)`);
