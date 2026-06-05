#!/usr/bin/env node
// synthesize-ignis-voices.mjs — S134 follow-up.
//
// Reads each project's actual IGNIS output (regime, mind-score, recommendation-diff,
// predictions, contradictions, feedback-loop, evidence-centrality, strategy-arbitration)
// and synthesizes per-project voice quotes from real data — not handwritten prose.
//
// Translation rules:
//   - regime change   → "I'm reading <regime> regime — <rationale>"
//   - trend cue       → "score is climbing/cooling at <N>/cycle"
//   - top recommendation unchanged for ≥3 sessions → "My top recommendation has held <N> sessions"
//   - high contradictions → "I've flagged <N> open contradictions"
//   - top authority pillar with high surprise → "<PILLAR> has emerged as the dominant signal — that's surprising"
//   - prediction accuracy → "Last forecast landed within band" / "missed band"
//   - feedback-loop reliability → "feedback reliability at <pct>%"
//
// Each quote is 2–3 sentences max, public-readable, cites the IGNIS files that
// informed it. Zero API calls — pure deterministic template selection.
//
// Output: ignis/output/project-voices.json (replaces hand-seeded prose).
//
// Usage:
//   node scripts/synthesize-ignis-voices.mjs
//   node scripts/synthesize-ignis-voices.mjs --pretty
//   node scripts/synthesize-ignis-voices.mjs --keep-handwritten  # preserves prior prose as fallback

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitizePublicOracleVoice } from './lib/public-oracle-text.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const devRoot = process.env.STUDIO_DEV_ROOT || path.resolve(repoRoot, '..');
const opsRoot = path.join(devRoot, 'vaultspark-studio-ops');

const args = new Set(process.argv.slice(2));
const pretty = args.has('--pretty');
const keepHandwritten = args.has('--keep-handwritten');

function readJSON(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }

// page-slug → registry-slug + sibling-repo folder + voice-key
const PAGES = [
  { folder: 'Call-Of-Doodie',         voice: 'call-of-doodie',          name: 'Call of Doodie' },
  { folder: 'Gridiron-GM',            voice: 'gridiron-gm',             name: 'Gridiron GM' },
  { folder: 'gridiron-gm-play',       voice: 'gridiron-gm-play',        name: 'Gridiron GM (play)' },
  { folder: 'mindframe',              voice: 'mindframe',               name: 'MindFrame' },
  { folder: 'Solara',                 voice: 'solara',                  name: 'Solara' },
  { folder: 'The-Exodus',             voice: 'the-exodus',              name: 'The Exodus' },
  { folder: 'VaultFront',             voice: 'vaultfront',              name: 'VaultFront' },
  { folder: 'VaultSpark Football GM', voice: 'vaultspark-football-gm',  name: 'VaultSpark Football GM' },
  { folder: 'Canon',                  voice: 'canon',                   name: 'Canon' },
  { folder: 'IdeaForge',              voice: 'ideaforge',               name: 'IdeaForge' },
  { folder: 'PromoGrind',             voice: 'promogrind',              name: 'PromoGrind' },
  { folder: 'StatVault',              voice: 'statvault',               name: 'StatVault' },
  { folder: 'The-Living-Protocol',    voice: 'the-living-protocol',     name: 'The Living Protocol' },
  { folder: 'Velaxis',                voice: 'velaxis',                 name: 'Velaxis' },
  { folder: 'Vorn',                   voice: 'vorn',                    name: 'Vorn' },
  { folder: 'Voidfall',               voice: 'voidfall',                name: 'Voidfall' },
  { folder: 'Scriptorium',            voice: 'scriptorium',             name: 'Scriptorium' },
  { folder: 'Seamline',               voice: 'seamline',                name: 'Seamline' },
  { folder: 'SparkFunnel',            voice: 'sparkfunnel',             name: 'SparkFunnel' },
  { folder: 'vaultspark-studio-ops',  voice: 'studio-ops',              name: 'Studio Ops' },
  { folder: 'vaultspark-ignis',       voice: 'vaultspark-ignis',        name: 'IGNIS' },
  { folder: 'VaultSpark-Forge',       voice: 'vaultspark-forge',        name: 'VaultSpark Forge' },
  { folder: 'vaultspark-studio-hub',  voice: 'vaultspark-studio-hub',   name: 'VaultSpark Studio Hub' },
  { folder: 'vaultspark-social-dashboard', voice: 'vaultspark-studios-social-dashboard', name: 'Social Dashboard' },
  { folder: 'vaultsparkstudios.github.io', voice: 'vaultsparkstudios-website', name: 'VaultSpark Studios Website' },
  { folder: 'Orva',                   voice: 'orva-eon',                name: 'Orva EON' },
  { folder: 'Hashmark',               voice: 'hashmark',                name: 'Hashmark' },
];

// ---------- signal extraction per project ----------
function extractSignals(folder) {
  if (!folder) return null;
  const base = path.join(devRoot, folder, 'ignis', 'output');
  if (!fs.existsSync(base)) return null;

  const regime    = readJSON(path.join(base, 'regime.json'));
  const mindScore = readJSON(path.join(base, 'mind-score.json'));
  const recDiff   = readJSON(path.join(base, 'recommendation-diff.json'));
  const preds     = readJSON(path.join(base, 'predictions.json'));
  const contra    = readJSON(path.join(base, 'contradiction-ledger.json'));
  const feedback  = readJSON(path.join(base, 'feedback-loop.json'));
  const evidence  = readJSON(path.join(base, 'evidence-centrality.json'));
  const strategy  = readJSON(path.join(base, 'strategy-arbitration.json'));

  // Parse "trend N/cycle" cue (regime.cues)
  let trendPerCycle = null;
  for (const cue of regime?.cues || []) {
    const m = /trend\s+(-?\d+)\/cycle/i.exec(cue);
    if (m) trendPerCycle = parseInt(m[1], 10);
  }

  // Top-authority pillar with surprise
  let topAuthority = null;
  if (evidence?.topAuthority?.length) {
    const top = evidence.topAuthority[0];
    if (top.isSurprise && top.surpriseScore > 1.5) {
      topAuthority = { pillar: top.nodeLabel || top.nodeId, surprise: top.surpriseScore };
    }
  }

  // Open contradiction count (records with no resolvedAt)
  const openContradictions = (contra?.records || []).filter(r => !r.resolvedAt).length;

  // Recommendation freshness
  const recUnchangedFor = recDiff && !recDiff.changed
    ? 1   // we don't have a counter, so flag "held since last run"
    : 0;

  // Latest prediction accuracy
  let lastPrediction = null;
  if (Array.isArray(preds?.entries) && preds.entries.length > 0) {
    const latest = preds.entries[preds.entries.length - 1];
    if (latest.validatedAt) {
      lastPrediction = {
        label: latest.label,
        withinBand: !!latest.withinInterval,
        error: latest.error,
        predicted: latest.predictedValue,
        actual: latest.actualValue,
      };
    }
  }

  return {
    regime: regime ? { id: regime.id, label: regime.label, rationale: regime.rationale, cues: regime.cues } : null,
    mindScore: mindScore?.domains?.core?.score ?? null,
    mindScoreSummary: mindScore?.domains?.core?.summary ?? null,
    trendPerCycle,
    topRecommendation: recDiff?.currentTopAction ?? null,
    recommendationUnchanged: recDiff?.changed === false,
    openContradictions,
    feedbackReliabilityPct: feedback?.feedbackReliability != null ? Math.round(feedback.feedbackReliability * 100) : null,
    feedbackSummary: feedback?.summary ?? null,
    topAuthority,
    lastPrediction,
    strategyLeader: strategy?.leader ?? null,
    coveragePct: (() => {
      for (const cue of regime?.cues || []) {
        const m = /coverage\s+(\d+)%/.exec(cue);
        if (m) return parseInt(m[1], 10);
      }
      return null;
    })(),
  };
}

// ---------- voice synthesis from signals ----------
// Strategy: pick the 2-3 most DIVERGENT (project-specific) signals for that
// project. Vary opener per project hash so the structure doesn't read template-y.
function pickVariant(projectName, n) {
  let h = 0;
  for (let i = 0; i < projectName.length; i++) h = ((h << 5) - h + projectName.charCodeAt(i)) | 0;
  return Math.abs(h) % n;
}

function synthesize(signals, projectName) {
  if (!signals) return null;

  const beats = [];
  const evidenceFiles = [];

  // -- Beat A: regime + trend (varied phrasing) --
  if (signals.regime?.label) {
    const r = signals.regime;
    const trend = signals.trendPerCycle;
    const variants = [];

    if (r.id === 'plateau') {
      variants.push(
        `I'm reading plateau regime${trend != null ? ` with score moving ${trend > 0 ? '+' : ''}${trend}/cycle` : ''} — there's motion but not yet decisive direction.`,
        `Plateau holds${trend != null ? ` (${trend > 0 ? '+' : ''}${trend}/cycle, inside the volatility band)` : ''}. The next push needs to break the band, not float inside it.`,
        `Reading a plateau${trend != null ? `, trend ${trend > 0 ? '+' : ''}${trend}/cycle` : ''}. The project is alive but waiting for something to commit it.`,
      );
    } else if (r.id === 'post-launch') {
      variants.push(
        `${projectName} is in post-launch regime${trend != null && trend > 0 ? ` — score climbing at +${trend}/cycle` : ''}. The work now is signal quality, not signal generation.`,
        `Post-launch detected${trend != null ? ` (${trend > 0 ? '+' : ''}${trend}/cycle)` : ''}. The signal has shifted from "does it work" to "what is it actually saying".`,
        `${trend > 0 ? `Climbing at +${trend}/cycle, ` : ''}${projectName} is now operating in post-launch regime. Follow-through is the differentiator from here.`,
      );
    } else if (r.id === 'breakthrough') {
      variants.push(
        `Breakthrough regime — the signal pattern broke its prior band this cycle.`,
        `The numbers stepped through a threshold this cycle. IGNIS calls it breakthrough; the data calls it overdue.`,
      );
    } else if (r.id === 'consolidation') {
      variants.push(
        `Consolidation regime — the work now is making yesterday's wins durable.`,
        `IGNIS reads consolidation. Stop adding surface; reinforce what shipped.`,
      );
    } else if (r.id === 'recovery') {
      variants.push(
        `Recovery regime${trend != null && trend < 0 ? ` (still cooling at ${trend}/cycle, but slowing)` : ''}. The fall stopped; the climb hasn't started.`,
        `IGNIS flags recovery — the trajectory bent, but bending isn't climbing yet.`,
      );
    } else if (r.id === 'incubation') {
      variants.push(
        `Incubation regime — the project is still finding its shape, and that's the right answer for now.`,
        `Incubation. Don't measure this one against shippers yet.`,
      );
    } else {
      variants.push(`Reading ${r.label.toLowerCase()} regime${trend != null ? ` (${trend > 0 ? '+' : ''}${trend}/cycle)` : ''}.`);
    }

    beats.push(variants[pickVariant(projectName, variants.length)]);
    evidenceFiles.push('regime.json');
  }

  // -- Beat B: pick ONE secondary signal that's strongest for this project --
  const secondaryCandidates = [];

  if (signals.openContradictions > 0) {
    const n = signals.openContradictions;
    secondaryCandidates.push({
      weight: n * 10,
      text: `${n} open contradiction${n === 1 ? '' : 's'} on the ledger — those are the cheapest score points on the board.`,
      source: 'contradiction-ledger.json',
    });
  }

  if (signals.recommendationUnchanged && signals.topRecommendation) {
    const t = signals.topRecommendation.length > 70 ? signals.topRecommendation.slice(0, 67) + '…' : signals.topRecommendation;
    secondaryCandidates.push({
      weight: 5,
      text: `My top recommendation has held: "${t}" — it's either correct, or being avoided.`,
      source: 'recommendation-diff.json',
    });
  }

  if (signals.topAuthority) {
    const t = signals.topAuthority;
    // High surprise = more interesting
    secondaryCandidates.push({
      weight: t.surprise * 2,
      text: `${t.pillar} is the dominant authority in the evidence graph (surprise score ${t.surprise.toFixed(1)}) — that's not where I'd have placed the weight.`,
      source: 'evidence-centrality.json',
    });
  }

  if (signals.lastPrediction) {
    const lp = signals.lastPrediction;
    if (lp.withinBand) {
      secondaryCandidates.push({
        weight: 4,
        text: `Last forecast landed inside band (predicted ${lp.predicted.toLocaleString()}, actual ${lp.actual.toLocaleString()}).`,
        source: 'predictions.json',
      });
    } else {
      secondaryCandidates.push({
        weight: 6,
        text: `Last forecast missed by ${Math.abs(lp.error).toLocaleString()} — IGNIS is recalibrating its model on this project.`,
        source: 'predictions.json',
      });
    }
  }

  if (signals.feedbackReliabilityPct != null && signals.feedbackReliabilityPct < 50) {
    secondaryCandidates.push({
      weight: 3,
      text: `Feedback reliability is ${signals.feedbackReliabilityPct}% — the loop between intent and outcome is leaking.`,
      source: 'feedback-loop.json',
    });
  }

  if (signals.mindScore != null && signals.coveragePct != null && signals.coveragePct < 70) {
    secondaryCandidates.push({
      weight: 2,
      text: `Score ${signals.mindScore.toLocaleString()} on ${signals.coveragePct}% coverage — the read is sharper than the data underneath it.`,
      source: 'mind-score.json',
    });
  }

  // Pick top-2 most interesting secondary signals.
  secondaryCandidates.sort((a, b) => b.weight - a.weight);
  for (const c of secondaryCandidates.slice(0, 2)) {
    beats.push(c.text);
    if (!evidenceFiles.includes(c.source)) evidenceFiles.push(c.source);
  }

  if (beats.length === 0) return null;

  return {
    quote: beats.join(' '),
    tone: signals.regime?.id || 'observational',
    scoredAt: new Date().toISOString().slice(0, 10),
    evidence: {
      sources: evidenceFiles,
      mindScore: signals.mindScore,
      regime: signals.regime?.label || null,
      regimeRationale: signals.regime?.rationale || null,
      trendPerCycle: signals.trendPerCycle,
      openContradictions: signals.openContradictions,
      recommendationUnchanged: signals.recommendationUnchanged,
      topRecommendation: signals.topRecommendation,
      topAuthorityPillar: signals.topAuthority?.pillar || null,
      coveragePct: signals.coveragePct,
      feedbackReliabilityPct: signals.feedbackReliabilityPct,
    },
  };
}

// ---------- main ----------
const existingVoices = readJSON(path.join(repoRoot, 'ignis', 'output', 'project-voices.json'));
const newVoices = {};
let dataGrounded = 0;
let fallback = 0;
let missing = 0;

for (const entry of PAGES) {
  const signals = extractSignals(entry.folder);
  const synth = synthesize(signals, entry.name);
  if (synth) {
    newVoices[entry.voice] = sanitizePublicOracleVoice(synth);
    dataGrounded++;
  } else if (keepHandwritten && existingVoices?.voices?.[entry.voice]) {
    newVoices[entry.voice] = sanitizePublicOracleVoice({ ...existingVoices.voices[entry.voice], _source: 'handwritten-fallback' });
    fallback++;
  } else {
    missing++;
  }
}

const out = {
  schemaVersion: '2.0',
  generatedAt: new Date().toISOString(),
  generator: 'scripts/synthesize-ignis-voices.mjs',
  narratorPersona: 'IGNIS — Living Flame Intelligence v4.1. Speaks from data: regime detection, recommendation tracking, evidence centrality, contradiction ledger, predictions vs outcomes.',
  voices: newVoices,
};

const outPath = path.join(repoRoot, 'ignis', 'output', 'project-voices.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, pretty ? 2 : 0));

console.log(`synthesize-ignis-voices`);
console.log(`  data-grounded:        ${dataGrounded}`);
console.log(`  handwritten fallback: ${fallback}`);
console.log(`  no IGNIS output:      ${missing}`);
console.log(`  → ${path.relative(repoRoot, outPath)}`);
