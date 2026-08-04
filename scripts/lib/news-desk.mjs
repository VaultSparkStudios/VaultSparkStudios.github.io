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

export const PERSONAS = [
  {
    id: 'rex',
    name: 'REX',
    emoji: '🔥',
    role: 'Accelerationist maximalist',
    voice: 'Kinetic, certain, allergic to hedging. Sees compounding curves everywhere. Respects only shipped things.',
    bias: 'Overweights capability gains and speed; underweights failure modes and adoption friction.',
  },
  {
    id: 'mara',
    name: 'MARA',
    emoji: '🛡️',
    role: 'Safety hawk and receipts-keeper',
    voice: 'Precise, cool, devastating with a citation. Keeps a mental ledger of every broken promise in the industry.',
    bias: 'Overweights tail risk and incentive rot; underweights how often things simply work out.',
  },
  {
    id: 'dot',
    name: 'DOT',
    emoji: '📉',
    role: 'Deadpan unit economist',
    voice: 'Dry, terse, numbers-first. Finds the cost line in every press release. Unimpressable on purpose.',
    bias: 'Overweights margins and capex gravity; underweights narrative and network effects.',
  },
];

export const personaById = (id) => PERSONAS.find((p) => p.id === id) || null;

/* ── Stances + heat ────────────────────────────────────────────────────── */

export const VERDICTS = ['overhyped', 'underhyped', 'fair'];

/**
 * A stance: { personaId, direction (-2..2), verdict, confidence (0..1),
 * position (pull-quote ≤220 chars), sources (≥1 url) }.
 */
export function validateStance(stance, { sourceUrls = null } = {}) {
  const errors = [];
  if (!personaById(stance?.personaId)) errors.push('unknown persona');
  if (!Number.isFinite(stance?.direction) || stance.direction < -2 || stance.direction > 2) {
    errors.push('direction must be a number in [-2, 2]');
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
 * Heat: confidence-weighted mean pairwise distance of stance directions,
 * scaled to 0–100. Two personas at -2 and +2 with full confidence → 100.
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
      weighted += Math.abs(a.direction - b.direction) * w;
      weights += w;
    }
  }
  if (weights === 0) return 0;
  const meanDistance = weighted / weights; // 0..4
  return Math.round((meanDistance / 4) * 100);
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

/* ── Day validation + carousel derivation ──────────────────────────────── */

/**
 * A day artifact: { date, stories: [{ slug, headline, hook, tldr, kind,
 * facts[≥2 {text, sourceUrl}], stances[≥2], predictions[≥1], transcript[],
 * memeLine }], quietStorySlug }.
 */
export function validateDay(day, { today } = {}) {
  const errors = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day?.date || '')) errors.push('date must be YYYY-MM-DD');
  const stories = day?.stories || [];
  if (stories.length < 1 || stories.length > 3) errors.push('a day carries 1–3 stories — volume discipline is a feature');
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
