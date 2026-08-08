/**
 * news-desk.mjs — pure core of THE DESK (/news): personas, heat, distill
 * validation, prediction ledger chaining, and carousel derivation.
 *
 * Everything here is deterministic and network-free — the build script owns
 * I/O and model calls; this module owns the rules. Every public function is
 * covered by build-news-desk.mjs --self-test.
 *
 * Design constraints this encodes (S305 plan v2):
 *  - A story ships as a pyramid: card (meme+hook) → TLDR (≤110 words) →
 *    brief (facts/positions/predictions) → floor (full transcript).
 *  - Personas argue ONLY over ingested sources; every position carries a
 *    dated, falsifiable prediction with confidence. Absence of a prediction
 *    is a validation error, not a stylistic choice.
 *  - Heat (0–100) is computed from stance divergence, never asserted by the
 *    model — the meter is math, so it cannot be vibes.
 *  - The prediction ledger is hash-chained (content address + prevHash) in
 *    the same spirit as the deploy ledger behind /proof, so a track record
 *    can be re-verified, not merely claimed.
 */

import crypto from 'node:crypto';
import { escapeXml, wrapTitle } from './og-template.mjs';

/* ── The cast ──────────────────────────────────────────────────────────── */

/**
 * Casting doctrine (S308). The original three (REX/MARA/DOT) were three points
 * on ONE line — hype. That made every debate the same shape: REX bullish, MARA
 * careful, DOT bearish. Predictable is the enemy of a daily read.
 *
 * Two structural fixes, not "more pundits":
 *
 *  1. A SECOND AXIS. A stance now carries `horizon` (-2 immediate … +2
 *     structural) alongside `direction` (-2 overhyped … +2 underhyped). Two
 *     personas can now agree something is huge and still fight about WHEN —
 *     the most common real disagreement in technology, previously unmodelable.
 *
 *  2. EPISTEMIC DIVERSITY. The new three differ by what they KNOW, not by how
 *     optimistic they are: VERA has run the thing in production, ECHO has seen
 *     the cycle before, JUNO tracks who it lands on. None of them is a fourth
 *     opinion about hype.
 *
 * REX/MARA/DOT are RETAINED, not replaced: the prediction ledger is
 * hash-chained and its entries reference these ids. Retiring a persona would
 * orphan a verifiable public track record, which is the product's whole claim.
 *
 * Six voices do NOT all argue every story — see castForStory(). Rotation is
 * what keeps the desk unpredictable; volume would just make it noise.
 */
export const PERSONAS = [
  {
    id: 'rex',
    name: 'REX',
    emoji: '🔥',
    role: 'Accelerationist maximalist',
    monogram: 'RX',
    accent: '#ff6b45',
    creed: 'Velocity reveals the future.',
    question: 'What compounds if this ships?',
    voice: 'Kinetic, certain, allergic to hedging. Sees compounding curves everywhere. Respects only shipped things.',
    bias: 'Overweights capability gains and speed; underweights failure modes and adoption friction.',
    beats: ['capability', 'models', 'benchmarks', 'compute', 'research'],
    lexicon: ['compounds', 'ships', 'curve', 'overhang', 'ceiling'],
    signature: 'Reframes a product announcement as a capability curve, then names what it unlocks two steps out.',
    forbidden: 'Never hedges with "time will tell". Never cites vibes where a shipped artifact exists.',
    rival: 'dot',
  },
  {
    id: 'mara',
    name: 'MARA',
    emoji: '🛡️',
    role: 'Safety hawk and receipts-keeper',
    monogram: 'MA',
    accent: '#72d6ff',
    creed: 'Trust begins where claims become testable.',
    question: 'What breaks, and who carries the cost?',
    voice: 'Precise, cool, devastating with a citation. Keeps a mental ledger of every broken promise in the industry.',
    bias: 'Overweights tail risk and incentive rot; underweights how often things simply work out.',
    beats: ['safety', 'governance', 'security', 'evaluation', 'policy'],
    lexicon: ['auditable', 'receipts', 'failure mode', 'testable', 'legible'],
    signature: 'Converts a reassuring adjective into the measurement that would falsify it.',
    forbidden: 'Never moralizes without a mechanism. Never says "concerning" as a conclusion.',
    rival: 'rex',
  },
  {
    id: 'dot',
    name: 'DOT',
    emoji: '📉',
    role: 'Deadpan unit economist',
    monogram: 'DT',
    accent: '#c9ff68',
    creed: 'Every miracle eventually meets a spreadsheet.',
    question: 'Who pays after the subsidy ends?',
    voice: 'Dry, terse, numbers-first. Finds the cost line in every press release. Unimpressable on purpose.',
    bias: 'Overweights margins and capex gravity; underweights narrative and network effects.',
    beats: ['pricing', 'funding', 'infrastructure', 'business', 'compute'],
    lexicon: ['margin', 'capex', 'subsidy', 'line item', 'per unit'],
    signature: 'Brings a chart. Describes the chart in one flat sentence.',
    forbidden: 'Never gets excited. Never uses two sentences where one will do.',
    rival: 'rex',
  },
  {
    id: 'vera',
    name: 'VERA',
    emoji: '🔧',
    role: 'Field engineer who actually shipped it',
    monogram: 'VR',
    accent: '#ffd166',
    creed: 'The demo is not the deployment.',
    question: 'What happens to this at 3am under real load?',
    voice: 'First-person, specific, unglamorous. Talks in incidents and workarounds. Earns authority by having been on call, not by predicting.',
    bias: 'Overweights operational friction and integration cost; underweights how fast rough edges get sanded off.',
    beats: ['agents', 'tooling', 'developer', 'reliability', 'deployment'],
    lexicon: ['in practice', 'on call', 'retry', 'fell over', 'the happy path'],
    signature: 'Answers an abstraction with one concrete thing that broke.',
    forbidden: 'Never speculates about labs. Never argues from a press release — only from having run it.',
    rival: 'rex',
  },
  {
    id: 'echo',
    name: 'ECHO',
    emoji: '🕰️',
    role: 'Cycle historian with pattern memory',
    monogram: 'EC',
    accent: '#b28dff',
    creed: 'This has a rhyme, and I have heard it.',
    question: 'Which prior cycle is this, and how did that one end?',
    voice: 'Analogical, patient, mildly amused. Dates the present by matching it to the past. Punctures hype without ever scolding.',
    bias: 'Overweights historical rhyme; underweights genuine discontinuity — sometimes the thing really is new.',
    beats: ['strategy', 'markets', 'adoption', 'hype', 'consolidation'],
    lexicon: ['we called this', 'the last time', 'rhymes with', 'cycle', 'act three'],
    signature: 'Names the year and the dead product this most resembles, then says what actually killed it.',
    forbidden: 'Never claims history repeats exactly. Never uses an analogy without naming its disanalogy.',
    rival: 'rex',
  },
  {
    id: 'juno',
    name: 'JUNO',
    emoji: '🧭',
    role: 'Consequence desk — who this lands on',
    monogram: 'JN',
    accent: '#5ce2a7',
    creed: 'Every system has someone downstream of it.',
    question: 'Name the person this happens to.',
    voice: 'Concrete, human-scaled, refuses abstraction. Converts a policy into a Tuesday in someone\'s life. Never sentimental — just specific.',
    bias: 'Overweights near-term human disruption; underweights aggregate gains that arrive slowly and unevenly.',
    beats: ['labor', 'access', 'education', 'regulation', 'consumer'],
    lexicon: ['downstream', 'in practice, for whom', 'lands on', 'who absorbs', 'the actual user'],
    signature: 'Replaces a market-sized number with one named role and what changes for them.',
    forbidden: 'Never speaks for a group in the abstract. Never trades a person for a statistic.',
    rival: 'dot',
  },
];

export const personaById = (id) => PERSONAS.find((p) => p.id === id) || null;

/* ── Casting: which voices argue THIS story ────────────────────────────── */

/**
 * Deterministic casting by beat affinity. A story declares `beats`; personas
 * score by overlap, ties break by roster order so the same story always casts
 * the same desk (byte-reproducible artifacts).
 *
 * `anchor` is always seated — the desk keeps one voice that owns the topic —
 * and the anchor's declared rival is seated next whenever it clears the floor,
 * because a debate needs an actual opponent, not three degrees of agreement.
 */
export function castForStory({ beats = [], size = 3, anchorId = null } = {}) {
  const wanted = new Set((beats || []).map((b) => String(b).toLowerCase()));
  const scored = PERSONAS.map((p, idx) => ({
    persona: p,
    idx,
    score: p.beats.reduce((n, b) => n + (wanted.has(b) ? 1 : 0), 0),
  }));
  const byRank = [...scored].sort((a, b) => (b.score - a.score) || (a.idx - b.idx));

  const seated = [];
  const seat = (id) => {
    const row = byRank.find((r) => r.persona.id === id);
    if (row && !seated.some((s) => s.id === id)) seated.push(row.persona);
  };
  if (anchorId) seat(anchorId);
  const anchor = seated[0] || byRank[0]?.persona || null;
  if (anchor && !seated.length) seat(anchor.id);
  if (anchor?.rival) seat(anchor.rival);
  for (const row of byRank) {
    if (seated.length >= Math.max(2, size)) break;
    seat(row.persona.id);
  }
  return seated.slice(0, Math.max(2, size));
}

/* ── Stances + heat ────────────────────────────────────────────────────── */

export const VERDICTS = ['overhyped', 'underhyped', 'fair'];

/**
 * A stance: { personaId, direction (-2..2), verdict, confidence (0..1),
 * position (pull-quote ≤220 chars), sources (≥1 url), horizon (-2..2, opt) }.
 *
 * `horizon` is the second axis (S308): -2 "this matters this quarter" …
 * +2 "this only matters in a decade". It is OPTIONAL and defaults to 0 so
 * every previously published day stays valid and keeps its exact heat.
 */
export function validateStance(stance, { sourceUrls = null } = {}) {
  const errors = [];
  if (!personaById(stance?.personaId)) errors.push('unknown persona');
  if (!Number.isFinite(stance?.direction) || stance.direction < -2 || stance.direction > 2) {
    errors.push('direction must be a number in [-2, 2]');
  }
  if (stance?.horizon !== undefined
    && (!Number.isFinite(stance.horizon) || stance.horizon < -2 || stance.horizon > 2)) {
    errors.push('horizon must be a number in [-2, 2]');
  }
  if (!VERDICTS.includes(stance?.verdict)) errors.push('verdict must be overhyped|underhyped|fair');
  if (!Number.isFinite(stance?.confidence) || stance.confidence <= 0 || stance.confidence > 1) {
    errors.push('confidence must be in (0, 1]');
  }
  const position = String(stance?.position || '');
  if (position.length < 20 || position.length > 220) errors.push('position must be 20–220 chars');
  if (!Array.isArray(stance?.sources) || stance.sources.length === 0) {
    errors.push('a stance without sources is punditry, not coverage');
  } else if (sourceUrls) {
    for (const url of stance.sources) {
      if (!sourceUrls.has(url)) errors.push(`source not in the ingested set: ${url}`);
    }
  }
  return errors;
}

/**
 * Heat: confidence-weighted mean pairwise distance across BOTH stance axes
 * (direction + horizon), scaled to 0–100 and clamped.
 *
 * Backward compatibility is structural, not incidental: horizon defaults to 0,
 * so for any day written before the second axis existed every horizon term is
 * zero, the metric collapses exactly to the old 1-D formula, and the published
 * heat of an already-shipped story cannot move. The divisor stays 4 (the 1-D
 * maximum) precisely to preserve that identity; genuine 2-D disagreement can
 * exceed it, which is what the clamp is for — a story where the desk splits on
 * both what-it-is and when-it-lands legitimately pins the meter.
 */
export function computeHeat(stances) {
  if (!Array.isArray(stances) || stances.length < 2) return 0;
  let weighted = 0;
  let weights = 0;
  for (let i = 0; i < stances.length; i += 1) {
    for (let j = i + 1; j < stances.length; j += 1) {
      const a = stances[i];
      const b = stances[j];
      const w = (a.confidence + b.confidence) / 2;
      const dDir = a.direction - b.direction;
      const dHor = (a.horizon ?? 0) - (b.horizon ?? 0);
      weighted += Math.hypot(dDir, dHor) * w;
      weights += w;
    }
  }
  if (weights === 0) return 0;
  const meanDistance = weighted / weights;
  return Math.min(100, Math.round((meanDistance / 4) * 100));
}

/**
 * Split heat into its two components so the page can say WHY the desk is hot:
 * "they agree it's big and disagree on when" is a different (and more
 * interesting) story than "they disagree about whether it matters at all".
 * Returns { heat, valence, timing, shape }.
 */
export function heatBreakdown(stances) {
  const axis = (pick) => {
    if (!Array.isArray(stances) || stances.length < 2) return 0;
    let weighted = 0;
    let weights = 0;
    for (let i = 0; i < stances.length; i += 1) {
      for (let j = i + 1; j < stances.length; j += 1) {
        const w = (stances[i].confidence + stances[j].confidence) / 2;
        weighted += Math.abs(pick(stances[i]) - pick(stances[j])) * w;
        weights += w;
      }
    }
    return weights ? Math.round((weighted / weights / 4) * 100) : 0;
  };
  const valence = axis((s) => s.direction);
  const timing = axis((s) => s.horizon ?? 0);
  let shape = 'aligned';
  if (valence >= 45 && timing >= 45) shape = 'split-on-both';
  else if (valence >= 45) shape = 'split-on-worth';
  else if (timing >= 45) shape = 'split-on-timing';
  return { heat: computeHeat(stances), valence, timing, shape };
}

/* ── TLDR + meme-line validation ───────────────────────────────────────── */

const wordCount = (text) => String(text || '').trim().split(/\s+/).filter(Boolean).length;

/**
 * The TLDR paragraph is the atomic unit: it must survive alone on the
 * homepage card. ≤110 words, one paragraph, ends with forward tension
 * (a question or a prediction tease), no URLs, no markdown headings.
 */
export function validateTldr(tldr) {
  const errors = [];
  const text = String(tldr || '').trim();
  const words = wordCount(text);
  if (words < 40) errors.push('tldr under 40 words reads as a caption, not a summary');
  if (words > 110) errors.push('tldr over 110 words is a story, not a card');
  if (/\n/.test(text)) errors.push('tldr must be a single paragraph');
  if (/https?:\/\//i.test(text)) errors.push('tldr must carry no raw URLs');
  if (/^#|\*\*/.test(text)) errors.push('tldr must be plain prose, not markdown');
  return errors;
}

/**
 * Choose the meme line: the most quotable persona moment. Scoring is
 * deterministic — brevity, punch (contrast/negation/numbers), and heat of
 * the story it came from. Candidates: every stance position + explicit quips.
 */
export function scoreMemeLine(line) {
  const text = String(line || '').trim();
  if (text.length < 8 || text.length > 140) return 0;
  let score = 50;
  score += Math.max(0, 40 - Math.abs(45 - text.length));         // sweet spot ~45 chars — memes are short
  if (/\d/.test(text)) score += 10;                               // numbers punch
  if (/\b(no|not|never|wrong|stop|actually)\b/i.test(text)) score += 8; // contrast
  if (/\?$/.test(text)) score += 4;
  if (/https?:\/\//i.test(text)) return 0;
  return score;
}

export function pickMemeLine(candidates) {
  let best = null;
  let bestScore = 0;
  for (const c of candidates || []) {
    const s = scoreMemeLine(c.text);
    if (s > bestScore) { best = c; bestScore = s; }
  }
  return best;
}

/* ── Predictions + hash-chained ledger ─────────────────────────────────── */

export function validatePrediction(p, { today }) {
  const errors = [];
  if (!personaById(p?.personaId)) errors.push('unknown persona');
  const claim = String(p?.claim || '');
  if (claim.length < 15 || claim.length > 240) errors.push('claim must be 15–240 chars');
  if (!Number.isFinite(p?.confidence) || p.confidence <= 0 || p.confidence >= 1) {
    errors.push('confidence must be in (0,1) — certainty is not a prediction');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p?.resolveBy || '')) errors.push('resolveBy must be YYYY-MM-DD');
  else if (today && p.resolveBy <= today) errors.push('resolveBy must be in the future');
  if (p?.status && !['open', 'correct', 'wrong', 'void'].includes(p.status)) errors.push('invalid status');
  return errors;
}

const sha = (value) => crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');

/**
 * Append a day entry to the prediction ledger. Entry identity is a content
 * address over its canonical payload; each entry binds the previous head so
 * history cannot be quietly rewritten. Returns the new entry.
 */
export function appendLedgerEntry(ledger, { date, predictions, resolutions = [] }) {
  const prev = ledger.entries.length ? ledger.entries[ledger.entries.length - 1] : null;
  const payload = {
    date,
    predictions: [...predictions].sort((a, b) => (a.id < b.id ? -1 : 1)),
    resolutions: [...resolutions].sort((a, b) => (a.id < b.id ? -1 : 1)),
    prevHash: prev ? prev.contentHash : null,
  };
  const entry = { ...payload, contentHash: sha(payload) };
  ledger.entries.push(entry);
  ledger.head = entry.contentHash;
  ledger.depth = ledger.entries.length;
  return entry;
}

/** Re-verify the whole chain. Returns { ok, brokenAt } — never throws. */
export function verifyLedger(ledger) {
  let prevHash = null;
  for (let i = 0; i < (ledger?.entries?.length || 0); i += 1) {
    const entry = ledger.entries[i];
    const { contentHash, ...payload } = entry;
    if (payload.prevHash !== prevHash) return { ok: false, brokenAt: i, reason: 'prevHash mismatch' };
    if (sha(payload) !== contentHash) return { ok: false, brokenAt: i, reason: 'content hash mismatch' };
    prevHash = contentHash;
  }
  if ((ledger?.head ?? null) !== (ledger?.entries?.length ? ledger.entries[ledger.entries.length - 1].contentHash : null)) {
    return { ok: false, brokenAt: -1, reason: 'head does not match last entry' };
  }
  return { ok: true, brokenAt: null };
}

/** Per-persona accuracy from resolved predictions across the ledger. */
export function personaTrackRecords(ledger) {
  const records = Object.fromEntries(PERSONAS.map((p) => [p.id, { open: 0, correct: 0, wrong: 0, void: 0 }]));
  // Two passes: a resolution always lands in a LATER entry than its
  // prediction, so grading must see the whole chain before counting.
  const statusById = new Map();
  for (const entry of ledger?.entries || []) {
    for (const r of entry.resolutions || []) statusById.set(r.id, r.status);
  }
  for (const entry of ledger?.entries || []) {
    for (const p of entry.predictions || []) {
      if (!records[p.personaId]) continue;
      const resolved = statusById.get(p.id);
      records[p.personaId][resolved || 'open'] += 1;
    }
  }
  for (const rec of Object.values(records)) {
    const graded = rec.correct + rec.wrong;
    rec.accuracy = graded ? Math.round((rec.correct / graded) * 1000) / 10 : null;
  }
  return records;
}

/* ── Standing: the voice reacts to its own public record ───────────────── */

/**
 * The mechanic no other news product can run, because no other news product
 * keeps a hash-chained record of what its commentators said.
 *
 * The ledger already grades every persona. `personaForm` turns that grade into
 * a WRITING DIRECTIVE: a persona on a cold streak is written chastened and
 * concessive; one on a hot streak is written emboldened. The desk's characters
 * therefore change over time as a consequence of being *measured*, not because
 * an author decided they should have an arc.
 *
 * Two hard rules keep this honest rather than theatrical:
 *   - Standing is derived only from RESOLVED predictions. Unresolved
 *     confidence buys no swagger.
 *   - Below `minGraded` the standing is `unproven` and carries NO tone shift.
 *     A persona with two lucky calls does not get to strut; a small sample is
 *     reported as a small sample (CANON-031).
 *
 * Resolution order follows the chain: a resolution appears in a later entry
 * than its prediction, so walking entries in order yields true chronology.
 */
export function personaForm(ledger, { minGraded = 4, streakWindow = 5 } = {}) {
  const predictionOwner = new Map();
  for (const entry of ledger?.entries || []) {
    for (const p of entry.predictions || []) predictionOwner.set(p.id, p.personaId);
  }
  const timeline = Object.fromEntries(PERSONAS.map((p) => [p.id, []]));
  for (const entry of ledger?.entries || []) {
    for (const r of entry.resolutions || []) {
      const owner = predictionOwner.get(r.id);
      if (!owner || !timeline[owner]) continue;
      if (r.status === 'correct' || r.status === 'wrong') timeline[owner].push(r.status);
    }
  }

  const records = personaTrackRecords(ledger);
  const form = {};
  for (const persona of PERSONAS) {
    const history = timeline[persona.id];
    const graded = history.length;
    const recent = history.slice(-streakWindow);
    const recentCorrect = recent.filter((s) => s === 'correct').length;

    let streak = 0;
    for (let i = history.length - 1; i >= 0; i -= 1) {
      if (i === history.length - 1) { streak = history[i] === 'correct' ? 1 : -1; continue; }
      if (history[i] === 'correct' && streak > 0) streak += 1;
      else if (history[i] === 'wrong' && streak < 0) streak -= 1;
      else break;
    }

    let standing = 'unproven';
    let tone = 'Standard voice. Too few resolved calls to earn a swagger or a wince — do not reference the record.';
    if (graded >= minGraded) {
      const rate = recent.length ? recentCorrect / recent.length : 0;
      if (streak <= -2 || rate < 0.34) {
        standing = 'cold';
        tone = `Chastened. ${persona.name} has been publicly wrong recently and knows the reader can check. Concede the prior miss once, plainly, then argue harder on narrower ground. No bluster.`;
      } else if (streak >= 3 || rate > 0.74) {
        standing = 'hot';
        tone = `Emboldened. ${persona.name} has a live winning record and may claim it once — briefly, never smugly — before pressing the call further than usual.`;
      } else {
        standing = 'even';
        tone = `Level. ${persona.name} is neither vindicated nor stung; argue from the evidence without invoking the record at all.`;
      }
    }

    form[persona.id] = {
      standing,
      tone,
      streak,
      graded,
      correct: records[persona.id]?.correct ?? 0,
      wrong: records[persona.id]?.wrong ?? 0,
      open: records[persona.id]?.open ?? 0,
      accuracy: records[persona.id]?.accuracy ?? null,
      recentWindow: recent.length,
    };
  }
  return form;
}

/* ── Day validation + carousel derivation ──────────────────────────────── */

/* ── Editions: publishing rhythm inside a single day ───────────────────── */

/**
 * The desk publishes on a clock, not once a day. Each edition is a named slot
 * with its own editorial job, so "more often" does not decay into "more of the
 * same" — the reader who returns at 18:00 gets a different KIND of read than
 * the one who showed up at 06:00.
 *
 * Volume discipline survives: the cap moves from per-DAY to per-EDITION, so
 * cadence rises without any edition turning into a link dump.
 */
export const EDITIONS = [
  { id: 'wire', name: 'The Wire', at: '06:00', maxStories: 3, brief: 'What broke overnight. Fast, factual, low commentary.' },
  { id: 'midday', name: 'Midday Desk', at: '12:00', maxStories: 3, brief: 'The main argument of the day. Full debate, highest heat.' },
  { id: 'close', name: 'The Close', at: '18:00', maxStories: 3, brief: 'What actually mattered, and what the desk got wrong today.' },
  { id: 'latenight', name: 'Late Night', at: '22:00', maxStories: 2, brief: 'The quiet story nobody covered. Long horizon.' },
];

export const editionById = (id) => EDITIONS.find((e) => e.id === id) || null;
const EDITION_ORDER = new Map(EDITIONS.map((e, i) => [e.id, i]));

/** Total stories a day may carry if every edition ran full. */
export const MAX_STORIES_PER_DAY = EDITIONS.reduce((n, e) => n + e.maxStories, 0);

/**
 * A day artifact: { date, stories: [{ slug, headline, hook, tldr, kind,
 * edition?, facts[≥2 {text, sourceUrl}], stances[≥2], predictions[≥1],
 * transcript[], memeLine }], quietStorySlug }.
 *
 * `edition` is optional: a day whose stories declare none is a legacy
 * single-edition day and keeps the original 1–3 cap exactly.
 */
export function validateDay(day, { today } = {}) {
  const errors = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day?.date || '')) errors.push('date must be YYYY-MM-DD');
  const stories = day?.stories || [];
  const editioned = stories.filter((s) => s?.edition !== undefined);
  if (editioned.length && editioned.length !== stories.length) {
    errors.push('mixed day: either every story declares an edition or none does');
  }
  if (!editioned.length) {
    if (stories.length < 1 || stories.length > 3) errors.push('a day carries 1–3 stories — volume discipline is a feature');
  } else {
    if (stories.length < 1) errors.push('a day carries at least 1 story');
    const perEdition = new Map();
    for (const story of stories) {
      const ed = editionById(story.edition);
      if (!ed) { errors.push(`story ${story?.slug || '?'}: unknown edition "${story?.edition}"`); continue; }
      perEdition.set(ed.id, (perEdition.get(ed.id) || 0) + 1);
    }
    for (const [id, count] of perEdition) {
      const ed = editionById(id);
      if (count > ed.maxStories) {
        errors.push(`edition ${id} carries ${count} stories — cap is ${ed.maxStories}; volume discipline is per-edition`);
      }
    }
  }
  const slugs = new Set();
  for (const story of stories) {
    const at = `story ${story?.slug || '?'}`;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(story?.slug || '')) errors.push(`${at}: bad slug`);
    if (slugs.has(story?.slug)) errors.push(`${at}: duplicate slug`);
    slugs.add(story?.slug);
    if (!story?.headline || story.headline.length > 90) errors.push(`${at}: headline required, ≤90 chars`);
    if (!story?.hook || story.hook.length > 120) errors.push(`${at}: hook required, ≤120 chars`);
    errors.push(...validateTldr(story?.tldr).map((e) => `${at}: ${e}`));
    const facts = story?.facts || [];
    if (facts.length < 2) errors.push(`${at}: at least 2 sourced facts`);
    const sourceUrls = new Set(facts.map((f) => f.sourceUrl).filter(Boolean));
    for (const f of facts) {
      if (!f?.text || !/^https?:\/\//.test(f?.sourceUrl || '')) errors.push(`${at}: every fact needs text + source URL`);
    }
    const stances = story?.stances || [];
    if (stances.length < 2) errors.push(`${at}: a debate needs at least 2 stances`);
    for (const s of stances) errors.push(...validateStance(s, { sourceUrls }).map((e) => `${at}: ${e}`));
    const predictions = story?.predictions || [];
    if (predictions.length < 1) errors.push(`${at}: at least one on-record prediction — accountability is the product`);
    for (const p of predictions) errors.push(...validatePrediction(p, { today: today || day?.date }).map((e) => `${at}: ${e}`));
    if (!story?.memeLine?.text) errors.push(`${at}: meme line missing (distill must pick one)`);
  }
  if (day?.quietStorySlug && !slugs.has(day.quietStorySlug)) errors.push('quietStorySlug not among stories');
  return errors;
}

/**
 * The machine wire: one NDJSON line per claim — stance-per-persona,
 * confidence, sources, prediction linkage. This is the "API of opinions
 * with track records" no news product offers agents today (CANON-048).
 * Deterministic ordering so the feed is byte-reproducible.
 */
export function deriveClaimsFeed(days) {
  const lines = [];
  const sorted = [...(days || [])].sort((a, b) => (a.date < b.date ? -1 : 1));
  for (const day of sorted) {
    for (const story of day.stories) {
      const heat = computeHeat(story.stances);
      for (const stance of story.stances) {
        lines.push({
          type: 'stance',
          date: day.date,
          story: story.slug,
          url: `https://vaultsparkstudios.com/news/${day.date}/${story.slug}/`,
          persona: stance.personaId,
          verdict: stance.verdict,
          direction: stance.direction,
          confidence: stance.confidence,
          position: stance.position,
          sources: stance.sources,
          heat,
        });
      }
      for (const p of story.predictions) {
        lines.push({
          type: 'prediction',
          date: day.date,
          story: story.slug,
          id: p.id,
          persona: p.personaId,
          claim: p.claim,
          confidence: p.confidence,
          resolveBy: p.resolveBy,
          status: p.status || 'open',
        });
      }
    }
  }
  return lines.map((l) => JSON.stringify(l)).join('\n') + (lines.length ? '\n' : '');
}

/* ── The Card: house-style meme SVG (1200×630, rasterized by the build) ── */

const HEAT_COLOR = (heat) => (heat >= 75 ? '#ff5a3c' : heat >= 45 ? '#ffc400' : '#7EC9FF');

/**
 * Deterministic news-desk card: meme line front and center, persona
 * attribution, live heat gauge, dateline. One template = one recognizable
 * house style; $0 marginal cost; no diffusion roulette.
 */
export function renderNewsCardSvg({ memeLine, personaId, heat, date, headline }) {
  const persona = personaById(personaId);
  const lines = wrapTitle(String(memeLine || ''), 26).slice(0, 3);
  const heatColor = HEAT_COLOR(Number(heat) || 0);
  const heatWidth = Math.max(6, Math.round((Math.min(100, Math.max(0, Number(heat) || 0)) / 100) * 420));
  const lineSpans = lines.map((ln, i) => `<tspan x="80" dy="${i === 0 ? 0 : 74}">${escapeXml(ln)}</tspan>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0c0d12"/><stop offset="1" stop-color="#131722"/>
    </linearGradient>
    <linearGradient id="heatg" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${heatColor}" stop-opacity="0.35"/><stop offset="1" stop-color="${heatColor}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="6" fill="${heatColor}"/>
  <text x="80" y="96" font-family="Georgia, serif" font-size="30" fill="#9aa4b8" letter-spacing="6">THE DESK · AI SIGNAL</text>
  <text x="1120" y="96" text-anchor="end" font-family="Inter, sans-serif" font-size="26" fill="#5a637a">${escapeXml(date || '')}</text>
  <text x="80" y="220" font-family="Georgia, serif" font-size="64" font-weight="700" fill="#fafafa">${lineSpans}</text>
  <text x="80" y="470" font-family="Inter, sans-serif" font-size="30" fill="#9aa4b8">${escapeXml(persona ? `— ${persona.name}, ${persona.role}` : '— The Desk')}</text>
  <text x="80" y="540" font-family="Inter, sans-serif" font-size="24" fill="#5a637a">${escapeXml(clampText(headline, 78))}</text>
  <g>
    <rect x="80" y="566" width="420" height="14" rx="7" fill="#1d2230"/>
    <rect x="80" y="566" width="${heatWidth}" height="14" rx="7" fill="url(#heatg)"/>
    <text x="516" y="580" font-family="Inter, sans-serif" font-size="24" font-weight="700" fill="${heatColor}">HEAT ${Math.round(Number(heat) || 0)}</text>
  </g>
  <text x="1120" y="580" text-anchor="end" font-family="Inter, sans-serif" font-size="22" fill="#5a637a">vaultsparkstudios.com/news</text>
</svg>`;
}

function clampText(s, max) {
  const text = String(s || '');
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/**
 * The Dispatch card — a bespoke social card for /news/subscribed/.
 *
 * Deliberately NOT renderNewsCardSvg: that template always draws a heat gauge,
 * and heat is computed disagreement between personas. A subscription
 * confirmation has no stances, so it would have to render HEAT 0 — a real
 * metric showing a meaningless value, which is exactly the kind of honest-
 * looking noise CANON-031 exists to prevent. Same house style, no fake meter.
 */
export function renderDispatchCardSvg({ headline = 'The Dispatch', subline = '' } = {}) {
  const lines = wrapTitle(String(headline), 24).slice(0, 2);
  const lineSpans = lines.map((ln, i) => `<tspan x="80" dy="${i === 0 ? 0 : 76}">${escapeXml(ln)}</tspan>`).join('');
  // The rasterizer has neither Inter nor Georgia and falls back to a MONOSPACE
  // face roughly 0.6em wide per glyph — far wider than the intended stack. A
  // single clamped line therefore ran off the canvas and the two footer texts
  // collided, both visible only in the rendered PNG. So the subline wraps on a
  // width derived from that fallback metric, and the footer keeps one line on
  // the left and the URL on the right with a measured gap between them.
  const SUB_SIZE = 26;
  const subCols = Math.floor((1120 - 80) / (SUB_SIZE * 0.62));
  const subLines = wrapTitle(String(subline), subCols).slice(0, 2);
  const subSpans = subLines.map((ln, i) => `<tspan x="80" dy="${i === 0 ? 0 : 38}">${escapeXml(ln)}</tspan>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0c0d12"/><stop offset="1" stop-color="#131722"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="6" fill="#ffc400"/>
  <text x="80" y="96" font-family="Georgia, serif" font-size="30" fill="#9aa4b8" letter-spacing="6">THE DESK · THE DISPATCH</text>
  <text x="80" y="240" font-family="Georgia, serif" font-size="66" font-weight="700" fill="#fafafa">${lineSpans}</text>
  <text x="80" y="452" font-family="Inter, sans-serif" font-size="${SUB_SIZE}" fill="#9aa4b8">${subSpans}</text>
  <text x="80" y="566" font-family="Inter, sans-serif" font-size="20" fill="#5a637a">No account required · double opt-in</text>
  <text x="1120" y="566" text-anchor="end" font-family="Inter, sans-serif" font-size="20" fill="#5a637a">vaultsparkstudios.com/news</text>
</svg>`;
}

/**
 * Derive the homepage carousel artifact from validated days (newest first,
 * capped). Honest-dark: an empty/absent set derives an explicit dark state
 * rather than nothing, so the homepage can render truth.
 */
export function deriveCarousel(days, { limit = 5, generatedAt } = {}) {
  const sorted = [...(days || [])].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, limit);
  return {
    schemaVersion: '1.0',
    generatedAt: generatedAt || (sorted[0]?.date ?? null),
    generatedBy: 'scripts/build-news-desk.mjs',
    publicSafe: true,
    state: sorted.length ? 'live' : 'dark',
    cards: sorted.map((day) => {
      const lead = day.stories.find((s) => s.slug === day.leadSlug) || day.stories[0];
      const heat = computeHeat(lead.stances);
      return {
        date: day.date,
        slug: lead.slug,
        href: `/news/${day.date}/${lead.slug}/`,
        headline: lead.headline,
        hook: lead.hook,
        tldr: lead.tldr,
        memeLine: lead.memeLine.text,
        memePersona: lead.memeLine.personaId || null,
        heat,
        verdicts: Object.fromEntries((lead.stances || []).map((s) => [s.personaId, s.verdict])),
        image: `/assets/og/news/${day.date}--${lead.slug}.png`,
        storyCount: day.stories.length,
      };
    }),
  };
}
