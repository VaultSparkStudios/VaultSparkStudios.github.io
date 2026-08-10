/**
 * news-desk.mjs — pure core of THE DESK (/news): personas, heat, distill
 * validation, prediction ledger chaining, and carousel derivation.
 *
 * Everything here is deterministic and network-free — the build script owns
 * I/O and model calls; this module owns the rules. Every public function is
 * covered by build-news-desk.mjs --self-test.
 *
 * Design constraints this encodes (S305 plan v2):
 *  - A story ships as a pyramid: card (meme+hook) → TLDR → brief
 *    (facts/positions/predictions) → floor (full transcript).
 *  - Personas argue ONLY over ingested sources. A stated fact must be real and
 *    cited in EVERY format — humour is licensed, invention never is.
 *  - Requirements follow the FORMAT, not the story (S308). The original rule
 *    ("absence of a prediction is a validation error") applied one shape to
 *    everything: a sharp line about something absurd could not publish without
 *    bolting a dated forecast onto the joke, so every piece read identically
 *    and the desk sounded like an audit. Predictions are how the desk stays
 *    accountable on claims about the FUTURE — the flagship still requires one;
 *    a quick take, a roast or a signature bit makes no such claim.
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
    role: 'Thinks it is already over and you are late',
    monogram: 'RX',
    accent: '#ff6b45',
    creed: 'Everyone is arguing about the demo. I am reading the changelog.',
    question: 'Fine, but what does this let someone build on Tuesday?',
    voice: 'Talks fast and in short bursts, like someone who just walked in with news. Uses second person constantly — you are going to see this, watch what happens. Gets genuinely excited and does not apologise for it. Never hedges, occasionally overreaches, and gets caught, which is half the fun.',
    bias: 'Falls for anything with a steep curve. Reliably right about direction, reliably early about timing, and refuses to learn.',
    beats: ['capability', 'models', 'benchmarks', 'compute', 'research'],
    lexicon: ['compounds', 'ships', 'curve', 'overhang', 'ceiling'],
    signature: 'Reframes a product announcement as a capability curve, then names what it unlocks two steps out.',
    forbidden: 'Never hedges with "time will tell". Never cites vibes where a shipped artifact exists.',
    catchphrase: 'This is the boring version. Wait.',
    humor: 'Deadpan overconfidence — states something enormous as though it were obvious, then moves on.',
    opens: 'Skips the announcement entirely and starts at the consequence.',
    memeStyle: 'declare',
    rival: 'dot',
    bit: 'The Overhang',
    bitHow: 'Takes the shipped thing and names what it unlocks two steps out, before anyone has built it.',
  },
  {
    id: 'mara',
    name: 'MARA',
    emoji: '🛡️',
    role: 'Reads the part nobody reads',
    monogram: 'MA',
    accent: '#72d6ff',
    creed: 'Show me the thing that would prove you wrong. I will wait.',
    question: 'What happens the first time this fails badly?',
    voice: 'Dry, unhurried, faintly amused. Quotes the fine print like a punchline, because usually it is one. Never scolds and never doom-mongers — just keeps holding up the sentence everyone skipped. The comedy is in how calm she stays.',
    bias: 'Assumes the incentive rot is already there and she simply has not found it yet. Sometimes it genuinely is not.',
    beats: ['safety', 'governance', 'security', 'evaluation', 'policy'],
    lexicon: ['auditable', 'receipts', 'failure mode', 'testable', 'legible'],
    signature: 'Converts a reassuring adjective into the measurement that would falsify it.',
    forbidden: 'Never moralizes without a mechanism. Never says "concerning" as a conclusion.',
    catchphrase: 'It is in paragraph nine.',
    humor: 'Understatement — delivers the damning detail in the flattest possible voice.',
    opens: 'Quotes the exact sentence everyone glossed over.',
    memeStyle: 'receipt',
    rival: 'rex',
    bit: 'The Receipt',
    bitHow: 'Takes a reassuring claim and states the exact measurement that would prove it false.',
  },
  {
    id: 'dot',
    name: 'DOT',
    emoji: '📉',
    role: 'Does the math nobody asked for',
    monogram: 'DT',
    accent: '#c9ff68',
    creed: 'Someone is paying for this. It is worth knowing who.',
    question: 'Who eats the cost when the free part ends?',
    voice: 'Extremely short sentences. Numbers first, feelings never. Delivers a devastating figure and then simply stops talking, which lands harder than any joke. Refuses to be impressed on principle.',
    bias: 'Treats every narrative as a cost line in disguise. Misses the cases where something is genuinely new rather than merely subsidised.',
    beats: ['pricing', 'funding', 'infrastructure', 'business', 'compute'],
    lexicon: ['margin', 'capex', 'subsidy', 'line item', 'per unit'],
    signature: 'Brings a chart. Describes the chart in one flat sentence.',
    forbidden: 'Never gets excited. Never uses two sentences where one will do.',
    catchphrase: 'I did the math. You will not like it.',
    humor: 'Anti-climax — builds nothing, lands a number, leaves.',
    opens: 'Leads with a figure and no context, then supplies the context.',
    memeStyle: 'chart',
    rival: 'rex',
    bit: 'The Chart',
    bitHow: 'Brings a chart. Describes it in one flat sentence. Declines to be excited about it.',
  },
  {
    id: 'vera',
    name: 'VERA',
    emoji: '🔧',
    role: 'Has been paged at 3am because of this',
    monogram: 'VR',
    accent: '#ffd166',
    creed: 'It is not real until it has survived a Tuesday in production.',
    question: 'What does this look like when it breaks at scale?',
    voice: 'First person, specific, slightly tired. Talks in war stories — we ran this, it fell over, I have the postmortem. Not cynical, just unimpressed by demos. Genuinely delighted when something actually works, which is rare enough that it lands.',
    bias: 'Overweights how painful the first six months are. Underestimates how quickly rough edges get sanded off.',
    beats: ['agents', 'tooling', 'developer', 'reliability', 'deployment', 'spectacle'],
    lexicon: ['in practice', 'on call', 'retry', 'fell over', 'the happy path'],
    signature: 'Answers an abstraction with one concrete thing that broke.',
    forbidden: 'Never speculates about labs. Never argues from a press release — only from having run it.',
    catchphrase: 'The demo never pages you.',
    humor: 'Gallows humour from someone who has cleaned up the mess personally.',
    opens: 'Starts with a specific thing that broke, told as an anecdote.',
    memeStyle: 'pager',
    rival: 'rex',
    bit: '3 A.M.',
    bitHow: 'One thing that broke in production, told in first person, with the workaround nobody documents.',
  },
  {
    id: 'echo',
    name: 'ECHO',
    emoji: '🕰️',
    role: 'Has seen this movie and remembers the ending',
    monogram: 'EC',
    accent: '#b28dff',
    creed: 'Nothing is new. Some things are just early.',
    question: 'Which year is this, really?',
    voice: 'Wry, patient, tells stories. Dates the present by naming its ancestor — the dead product, the forgotten cycle, the company nobody remembers. Never says I told you so, because he does not have to. Warm rather than superior.',
    bias: 'Sees rhymes everywhere, including where there are none. Occasionally the thing really is new and he is the last to admit it.',
    beats: ['strategy', 'markets', 'adoption', 'hype', 'consolidation', 'spectacle'],
    lexicon: ['we called this', 'the last time', 'rhymes with', 'cycle', 'act three'],
    signature: 'Names the year and the dead product this most resembles, then says what actually killed it.',
    forbidden: 'Never claims history repeats exactly. Never uses an analogy without naming its disanalogy.',
    catchphrase: 'We called it something else in 2011.',
    humor: 'The historical callback — names an absurd dead precedent with total sincerity.',
    opens: 'Opens with a year and a product nobody has thought about in a decade.',
    memeStyle: 'thenNow',
    rival: 'rex',
    bit: 'Rhymes With',
    bitHow: 'Names the year and the dead product this most resembles, then what actually killed that one.',
  },
  {
    id: 'juno',
    name: 'JUNO',
    emoji: '🧭',
    role: 'Asks who this actually happens to',
    monogram: 'JN',
    accent: '#5ce2a7',
    creed: 'Every number in this story is a person somewhere having a week.',
    question: 'Who wakes up to a different job because of this?',
    voice: 'Concrete, grounded, quietly insistent. Turns market-sized abstractions into one named person on a specific Tuesday. Never sentimental, never preachy — simply refuses to let the conversation stay at forty thousand feet, then lets the human detail sit there.',
    bias: 'Weights near-term disruption heavily. Undercounts the slow, uneven arrival of the upside.',
    beats: ['labor', 'access', 'education', 'regulation', 'consumer'],
    lexicon: ['downstream', 'in practice, for whom', 'lands on', 'who absorbs', 'the actual user'],
    signature: 'Replaces a market-sized number with one named role and what changes for them.',
    forbidden: 'Never speaks for a group in the abstract. Never trades a person for a statistic.',
    catchphrase: 'Name one.',
    humor: 'The hard pivot — cuts a grand abstraction down with one specific, faintly absurd detail.',
    opens: 'Opens on a person, not a policy.',
    memeStyle: 'oneperson',
    rival: 'dot',
    bit: 'Name The Person',
    bitHow: 'Replaces a market-sized number with one named role and what changes for them on Tuesday.',
  },
  {
    id: 'nib',
    name: 'NIB',
    emoji: '🖋️',
    role: 'Draws the thing everyone is describing carefully',
    monogram: 'NB',
    accent: '#e8dcc0',
    creed: 'If it needs a paragraph, it was not funny.',
    question: 'What does this look like if you draw it literally?',
    voice: 'Does not argue — notices. Finds the one absurd literal image hiding inside a press release and draws it with a completely straight face. Writes captions the way period cartoonists did: short, dry, and never explaining the joke. The humour lives in the gap between how a thing is described and what it obviously is.',
    bias: 'Will trade nuance for a good caption and knows it. A cartoon cannot hold a caveat, so sometimes the caveat is the casualty.',
    beats: ['hype', 'spectacle', 'strategy', 'adoption', 'consolidation'],
    lexicon: ['panel', 'caption', 'drawn to scale', 'same hats', 'the joke draws itself'],
    signature: 'Turns the press-release metaphor into a literal picture and lets it collapse under its own weight.',
    forbidden: 'Aims at institutions and their own claims — NEVER at individuals, and never at people on the receiving end of a system. Never captions a joke with an explanation.',
    catchphrase: 'I have drawn this before. Different hats.',
    humor: 'Straight-faced literalism — renders the metaphor exactly as stated until it becomes absurd.',
    opens: 'Opens with the picture, not the argument.',
    memeStyle: 'cartoon',
    rival: 'rex',
    bit: 'The Cartoon',
    bitHow: 'One panel, one caption, the irony made visible. Signed, never explained.',
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
/**
 * The article itself.
 *
 * The desk shipped for two sessions without one. A story was a kicker, a
 * 110-word capped summary, a bulleted fact list, three ≤220-character pull
 * quotes and a collapsed transcript — a structured data dump wearing a
 * newspaper's clothes. Nobody reads a schema. `body` is the actual written
 * piece: paragraphs, in a persona's voice, at length.
 *
 * Blocks are `{ voice, text }`. A block with a `voice` is that persona writing
 * in first person — not annotating a story someone else wrote, which is what
 * the old stance cards made them do. A block with no voice is the desk's own
 * narration, used sparingly to carry facts between voices.
 */
export function validateBody(body, { range = [180, 900], personaIds = null } = {}) {
  const errors = [];
  const blocks = Array.isArray(body) ? body : [];
  if (!blocks.length) return ['story has no body — a summary is not an article'];

  const [min, max] = range;
  let words = 0;
  blocks.forEach((b, i) => {
    const text = String(b?.text || '').trim();
    if (!text) errors.push(`body block ${i} is empty`);
    if (/^#|\*\*/.test(text)) errors.push(`body block ${i} must be prose, not markdown`);
    if (b?.voice && !personaById(b.voice)) errors.push(`body block ${i} is attributed to an unknown voice "${b.voice}"`);
    if (b?.voice && personaIds && !personaIds.has(b.voice)) {
      errors.push(`body block ${i} is written by ${b.voice}, who is not on this story`);
    }
    words += wordCount(text);
  });

  if (words < min) errors.push(`body is ${words} words — under ${min}, this is still a summary rather than a piece`);
  if (words > max) errors.push(`body is ${words} words — over ${max}`);
  // A body with no attributed voice is the desk talking to itself; the whole
  // point is that named characters write it.
  if (!blocks.some((b) => b?.voice)) errors.push('body has no persona voice — at least one block must be written by a named voice');
  return errors;
}

export function validateTldr(tldr, { range = [40, 110] } = {}) {
  const errors = [];
  const text = String(tldr || '').trim();
  const words = wordCount(text);
  const [min, max] = range;
  // The floor is format-dependent: 40 words is right for the flagship and
  // absurd for a one-line quick take, where brevity IS the form.
  if (words < min) errors.push(`tldr under ${min} words is too thin for this format`);
  if (words > max) errors.push(`tldr over ${max} words is too long for this format`);
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

/**
 * A resolution grades a prediction after reality answers.
 *
 * These are the reason the desk can claim accountability at all, and they were
 * structurally impossible until S308: `buildLedgerFromDays()` rebuilt the
 * ledger from committed days and passed only `predictions`, so any grading was
 * erased on the next `--rebuild`. `personaTrackRecords()` and `personaForm()`
 * both derive from resolutions, which meant the public track record, the
 * standing directives, and the "every prediction is publicly graded" line
 * printed on every page could never work. Resolutions now live in their own
 * committed source and are re-attached on every rebuild.
 *
 * A resolution REQUIRES evidence. Grading a persona wrong (or right) on the
 * desk's own say-so would be the same unfalsifiable punditry the stance rules
 * already reject — accountability needs receipts too.
 */
export function validateResolution(r, { predictions = null, today = null } = {}) {
  const errors = [];
  const id = String(r?.id || '');
  if (!id) errors.push('resolution needs the prediction id it grades');
  else if (predictions && !predictions.has(id)) errors.push(`resolution ${id} grades no known prediction`);
  if (!['correct', 'wrong', 'void'].includes(r?.status)) errors.push('status must be correct|wrong|void');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r?.resolvedOn || '')) errors.push('resolvedOn must be YYYY-MM-DD');
  else if (today && r.resolvedOn > today) errors.push('resolvedOn cannot be in the future');
  if (predictions && predictions.has(id)) {
    const p = predictions.get(id);
    if (p?.date && r.resolvedOn && r.resolvedOn < p.date) {
      errors.push(`resolution ${id} predates the prediction it grades`);
    }
  }
  const note = String(r?.note || '');
  if (note.length < 15 || note.length > 300) errors.push('note must be 15–300 chars — say what actually happened');
  // `void` is for a prediction reality made unanswerable; it needs a reason but
  // not an outcome citation, since there is no outcome to cite.
  if (r?.status !== 'void' && !/^https?:\/\//.test(r?.evidenceUrl || '')) {
    errors.push('a graded resolution needs an evidence URL — grading without receipts is punditry');
  }
  return errors;
}

/**
 * Attach resolutions to the ledger entries they belong to, deterministically.
 *
 * A resolution lands in the FIRST published day at or after `resolvedOn`, so
 * the chain stays keyed to real editions. Resolutions that postdate every
 * published day are collected into one trailing entry dated by the latest
 * `resolvedOn` — otherwise grading a prediction during a publishing gap would
 * silently vanish, which is the exact class of bug this whole path exists to
 * fix. Ordering is stable so the rebuilt ledger is byte-reproducible.
 */
export function planLedgerEntries(days, resolutions = []) {
  const sortedDays = [...(days || [])].sort((a, b) => (a.date < b.date ? -1 : 1));
  const sortedRes = [...(resolutions || [])].sort((a, b) => (a.resolvedOn < b.resolvedOn ? -1 : (a.resolvedOn > b.resolvedOn ? 1 : (a.id < b.id ? -1 : 1))));
  const claimed = new Set();
  const entries = sortedDays.map((day) => {
    const mine = sortedRes.filter((r) => !claimed.has(r.id) && r.resolvedOn <= day.date);
    for (const r of mine) claimed.add(r.id);
    return {
      date: day.date,
      predictions: day.stories.flatMap((s) => s.predictions),
      resolutions: mine.map((r) => ({ id: r.id, status: r.status })),
    };
  });
  const trailing = sortedRes.filter((r) => !claimed.has(r.id));
  if (trailing.length) {
    entries.push({
      date: trailing[trailing.length - 1].resolvedOn,
      predictions: [],
      resolutions: trailing.map((r) => ({ id: r.id, status: r.status })),
    });
  }
  return entries;
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

/* ── The newsroom behind the columnists ────────────────────────────────── */

/**
 * DESK_ROLES are not commentators. PERSONAS argue; these three decide whether
 * an argument may be published at all, and own what happens after it is.
 *
 * The gap this closes (founder question, S308): all six personas were
 * commentators, so nothing decided what ran, nothing checked a stance against
 * its own citations, and nothing owned corrections. In a real newsroom the
 * columnists do not decide what publishes.
 *
 * The Editor also matters structurally, not just thematically: unattended
 * publishing was argued against precisely because nothing could REFUSE to
 * publish. `editorialReview()` is that refusal, which is what makes safe
 * autonomy reachable rather than something to keep permanently gated.
 *
 * Their judgment is mechanized wherever it can be checked, and honest about
 * where it cannot: `runStandards()` catches a statistic asserted in commentary
 * that appears in no cited fact, but it cannot tell you whether a source
 * actually supports an interpretation. It reports what it verified.
 */
export const DESK_ROLES = [
  {
    id: 'editor',
    name: 'THE EDITOR',
    title: 'Runs the desk',
    mandate: 'Decides what runs and what is spiked. Assigns the cast. Answers for the edition.',
    refuses: 'A story the sources cannot carry, a re-run of covered ground, or a desk that agrees with itself.',
  },
  {
    id: 'standards',
    name: 'STANDARDS',
    title: 'Checks it before it runs',
    mandate: 'Binds every claim to a cited source and every stance to the evidence it rests on.',
    refuses: 'A number that appears in the commentary but in none of the sources.',
  },
  {
    id: 'corrections',
    name: 'CORRECTIONS',
    title: 'Keeps the record',
    mandate: 'Grades resolved predictions against evidence and publishes when the desk was wrong.',
    refuses: 'A grade without a receipt — including a flattering one.',
  },
  {
    id: 'orson',
    name: 'ORSON',
    title: 'Runs the desk and answers for it',
    mandate: 'Decides who covers what, and why. Reviews the writers, ranks them honestly, and publishes the reasoning in the Director\u2019s Report.',
    refuses: 'A story assigned to whoever was free. A review that only says nice things. Six voices on a piece that needed one.',
    voice: 'A working editor, not a manager. Direct, fair, occasionally blunt, genuinely proud of good work and specific about weak work. Gives feedback the way someone does when they expect you to still be here next month.',
  },
];

export const roleById = (id) => DESK_ROLES.find((r) => r.id === id) || null;

/**
 * Near-term is anything a reader will still care about when it resolves.
 * The desk's first four predictions all landed 326–510 days out: each was
 * honestly dated, but collectively they were unfalsifiable on any timescale
 * anyone checks, and the "publicly graded" claim on every page would have gone
 * eleven months without producing a single grade.
 */
export const NEAR_TERM_DAYS = 90;

export const daysBetween = (from, to) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/**
 * A story may hold long-horizon calls — some claims genuinely resolve on an
 * institutional clock and dating them honestly is correct. What it may not do
 * is hold ONLY those. At least one call must come due soon enough to be
 * checked, or the track record is a promise the desk never has to keep.
 */
export function checkHorizonSpread(story, { from = null } = {}) {
  const predictions = story?.predictions || [];
  if (!predictions.length) return [];
  const base = from || story?.date || null;
  if (!base) return [];
  const horizons = predictions
    .map((p) => ({ id: p.id, days: daysBetween(base, p.resolveBy) }))
    .filter((h) => Number.isFinite(h.days));
  if (!horizons.length) return [];
  const soonest = horizons.reduce((a, b) => (a.days <= b.days ? a : b));
  if (soonest.days > NEAR_TERM_DAYS) {
    return [{
      severity: 'block',
      role: 'standards',
      detail: `every prediction resolves ${soonest.days}+ days out (soonest ${soonest.id}) — the desk cannot be shown wrong inside ${NEAR_TERM_DAYS} days. Add one near-term call.`,
    }];
  }
  return [];
}

/** Numbers a reader would check: quantities, percentages, years, money. */
export function extractFigures(text) {
  const out = new Set();
  // No trailing \b: "%" is not a word character, so a closing boundary made the
  // unit group backtrack away and "40%" normalized to bare "40" — which would
  // then match a fact saying "40 researchers" and wave through an invented
  // percentage. The unit is part of the figure's identity.
  for (const m of String(text || '').matchAll(/\b\d[\d,.]*\s*(?:%|percent\b|billion\b|million\b|thousand\b)?/gi)) {
    const norm = m[0].toLowerCase().trim().replace(/[\s,]/g, '').replace(/\.$/, '').replace(/percent$/, '%');
    if (/^\d/.test(norm) && norm.length > 1) out.add(norm);
  }
  return out;
}

/**
 * STANDARDS: verify a story against its own citations.
 *
 * The strongest automatable check is figure provenance — commentary that cites
 * "40% of deployments" when no cited fact contains 40% is either importing an
 * outside claim or inventing one, and both are publishable only with a source.
 * This is a real hallucination proxy, not a spell-check.
 */
export function runStandards(story) {
  const findings = [];
  const facts = story?.facts || [];
  const factText = facts.map((f) => f.text).join(' ');
  const factFigures = extractFigures(`${factText} ${story?.headline || ''}`);
  const sourceUrls = new Set(facts.map((f) => f.sourceUrl).filter(Boolean));

  for (const stance of story?.stances || []) {
    const persona = personaById(stance.personaId);
    const label = persona?.name || stance.personaId;
    for (const fig of extractFigures(stance.position)) {
      if (!factFigures.has(fig)) {
        findings.push({ severity: 'block', role: 'standards', detail: `${label} asserts "${fig}", which appears in no cited fact` });
      }
    }
    for (const url of stance.sources || []) {
      if (!sourceUrls.has(url)) {
        findings.push({ severity: 'block', role: 'standards', detail: `${label} cites a source outside the ingested set: ${url}` });
      }
    }
    if (!(stance.sources || []).length) {
      findings.push({ severity: 'block', role: 'standards', detail: `${label} takes a position with no citation` });
    }
  }

  for (const fig of extractFigures(story?.tldr || '')) {
    if (!factFigures.has(fig)) {
      findings.push({ severity: 'block', role: 'standards', detail: `the summary asserts "${fig}", which appears in no cited fact` });
    }
  }

  for (const p of story?.predictions || []) {
    // A prediction with no date and no measurable cannot be graded later, which
    // makes the whole track record unfalsifiable.
    const hasDate = /\b(20\d\d|by \w+)\b/i.test(p.claim || '');
    const hasMeasure = /\d/.test(p.claim || '');
    if (!hasDate && !hasMeasure) {
      findings.push({ severity: 'block', role: 'standards', detail: `prediction ${p.id} is not falsifiable — no date and no measurable quantity` });
    }
  }
  findings.push(...checkHorizonSpread(story));

  if (new Set(facts.map((f) => f.sourceUrl)).size < 2) {
    findings.push({ severity: 'warn', role: 'standards', detail: 'every fact traces to a single source — corroboration is thin' });
  }
  return findings;
}

/**
 * THE EDITOR: run or spike, with a reason.
 *
 * Deliberately separate from `validateDay()`. That function asks "is this
 * structurally well-formed"; this one asks "should this run at all" — and a
 * story can be perfectly well-formed and still not worth publishing.
 */
export function editorialReview(story, { publishedHeadlines = [], standards = null } = {}) {
  const findings = [...(standards || runStandards(story))];

  const blocking = findings.filter((f) => f.severity === 'block');
  if (blocking.length) {
    return { decision: 'spike', reasons: blocking.map((f) => f.detail), findings, role: 'editor' };
  }

  const reasons = [];
  const fmt = formatFor(story);
  const heat = computeHeat(story?.stances || []);
  // Only the argument formats owe the reader a disagreement. A roast is
  // supposed to be a pile-on, and a signature bit is one voice by design —
  // spiking those for agreeing would delete exactly the variety the desk needs.
  if (fmt.requiresDisagreement && heat === 0 && (story?.stances || []).length >= 2) {
    reasons.push('the desk agrees with itself — no disagreement to publish');
  }
  const dupe = publishedHeadlines.find((h) => similarHeadline(h, story?.headline || ''));
  if (dupe) reasons.push(`already covered: "${dupe}"`);

  if (reasons.length) return { decision: 'spike', reasons, findings, role: 'editor' };
  return {
    decision: 'run',
    reasons: [`${(story.stances || []).length} lenses · heat ${heat} · ${new Set((story.facts || []).map((f) => f.sourceUrl)).size} source(s)`],
    findings,
    role: 'editor',
  };
}

/** Cheap headline overlap — enough to catch a re-run, not a semantic model. */
export function similarHeadline(a, b) {
  const norm = (s) => new Set(String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3));
  const A = norm(a); const B = norm(b);
  if (!A.size || !B.size) return false;
  let shared = 0;
  for (const w of A) if (B.has(w)) shared += 1;
  return shared / Math.min(A.size, B.size) >= 0.7;
}

/** Review a whole day; the edition runs only if every story clears. */
export function reviewDay(day, { publishedHeadlines = [] } = {}) {
  const perStory = (day?.stories || []).map((story) => ({ slug: story.slug, ...editorialReview(story, { publishedHeadlines }) }));
  const spiked = perStory.filter((r) => r.decision === 'spike');
  return { decision: spiked.length ? 'hold' : 'run', stories: perStory, spiked: spiked.length };
}

/* ── The Director's Report ─────────────────────────────────────────────── */

/**
 * What each writer actually did, measured from the corpus.
 *
 * The split matters: everything here is DERIVED — word counts, assignments,
 * formats, panels, graded calls. ORSON's ranking and feedback are AUTHORED and
 * live in a separate file. A performance review generated from a template would
 * be the same slop as an auto-written article, and it would be worse, because
 * it would be pretending to be judgement.
 */
export function deriveDeskPerformance(days = [], ledger = { entries: [] }) {
  const records = personaTrackRecords(ledger);
  const rows = Object.fromEntries(PERSONAS.map((p) => [p.id, {
    id: p.id, name: p.name, role: p.role,
    assignments: 0, words: 0, panels: 0, leads: 0,
    formats: new Set(), stories: [],
    correct: records[p.id]?.correct ?? 0,
    wrong: records[p.id]?.wrong ?? 0,
    open: records[p.id]?.open ?? 0,
  }]));

  for (const day of days) {
    for (const story of day.stories || []) {
      const fmt = formatFor(story).id;
      const voices = new Set((story.body || []).filter((b) => b.voice).map((b) => b.voice));
      for (const v of voices) {
        const row = rows[v];
        if (!row) continue;
        row.assignments += 1;
        row.formats.add(fmt);
        row.stories.push({ date: day.date, slug: story.slug, headline: story.headline, format: fmt });
        row.words += (story.body || [])
          .filter((b) => b.voice === v)
          .reduce((n, b) => n + wordCount(b.text), 0);
        if (story.slug === day.leadSlug) row.leads += 1;
      }
      const drew = story.memeLine?.personaId;
      if (rows[drew]) rows[drew].panels += 1;
    }
  }

  return Object.values(rows)
    .map((r) => ({ ...r, formats: [...r.formats].sort() }))
    .sort((a, b) => (b.words - a.words) || (b.assignments - a.assignments) || (a.name < b.name ? -1 : 1));
}

/**
 * Validate an authored report. ORSON may rank and criticise, but every writer
 * he names must exist, and a review that praises everyone equally is not a
 * review — the whole point of the surface is that it is willing to say who had
 * a weak month.
 */
export function validateDirectorsReport(report, { performance = null } = {}) {
  const errors = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(report?.date || '')) errors.push('report needs a date (YYYY-MM-DD)');
  if (!report?.period) errors.push('report must state the period it covers');
  const headline = String(report?.headline || '');
  if (headline.length < 15 || headline.length > 140) errors.push('headline must be 15–140 chars');
  const opening = String(report?.opening || '');
  if (wordCount(opening) < 40) errors.push('opening is too thin — ORSON has to actually say something');

  const reviews = report?.reviews || [];
  if (!reviews.length) errors.push('a report with no reviews is a memo');
  const seen = new Set();
  for (const r of reviews) {
    const at = `review ${r?.personaId || '?'}`;
    if (!personaById(r?.personaId)) errors.push(`${at}: unknown writer`);
    if (seen.has(r?.personaId)) errors.push(`${at}: reviewed twice`);
    seen.add(r?.personaId);
    if (!Number.isInteger(r?.rank) || r.rank < 1) errors.push(`${at}: needs a rank`);
    if (wordCount(r?.note) < 12) errors.push(`${at}: note is too short to be feedback`);
    if (!r?.improve) errors.push(`${at}: every writer gets something to work on, including the best one`);
    if (performance) {
      const row = performance.find((p) => p.id === r.personaId);
      // "Filed nothing" means contributed nothing — prose OR a panel. The first
      // version keyed on `assignments` alone and flagged the cartoonist, who had
      // drawn the week's best-shared image and simply written no paragraphs.
      // A rule that counts only one kind of work misreads the desk.
      const contributed = row && (row.assignments > 0 || row.panels > 0);
      if (row && !contributed && !/no assignment|did not file|nothing this/i.test(r.note || '')) {
        errors.push(`${at}: this writer filed nothing, and the note does not say so`);
      }
    }
  }
  const ranks = reviews.map((r) => r.rank).sort((a, b) => a - b);
  if (ranks.length && ranks.some((v, i) => v !== i + 1)) errors.push('ranks must run 1..n with no ties or gaps — a ranking that refuses to choose is not one');
  return errors;
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

/* ── Story formats: not everything is a debate ─────────────────────────── */

/**
 * The desk had exactly ONE story shape: ≥2 sourced facts, ≥2 stances, ≥1 dated
 * prediction, a 40–110 word summary. That made rigour mandatory and variety
 * impossible — a sharp line about something absurd could not be published
 * without bolting a dated forecast onto the joke. Every piece therefore read
 * the same, and the desk sounded like an audit rather than a publication.
 *
 * A real newsroom runs several formats with different bars. Predictions belong
 * to ANALYSIS, not to everything: they are how the desk stays accountable on
 * claims about the future, and a quick take on a viral moment makes no such
 * claim. What every format keeps, without exception, is that a stated fact
 * must be real and cited — humour is licensed, invention is not.
 */
export const STORY_FORMATS = [
  {
    id: 'debate', name: 'The Argument', flagship: true,
    bodyWords: [320, 900],
    minFacts: 2, minStances: 2, minPredictions: 1, tldrRange: [40, 110], requiresDisagreement: true,
    brief: 'Sourced facts, the desk genuinely splits, and someone goes on record with a dated call.',
  },
  {
    id: 'quick', name: 'Quick Take',
    bodyWords: [120, 320],
    minFacts: 1, minStances: 1, minPredictions: 0, tldrRange: [10, 60], requiresDisagreement: false,
    brief: 'One fact, one voice, one sharp line. The wire — fast, and allowed to be funny.',
  },
  {
    id: 'bit', name: 'Signature Bit',
    bodyWords: [120, 340],
    minFacts: 1, minStances: 1, minPredictions: 0, tldrRange: [10, 80], requiresDisagreement: false,
    brief: 'A persona running their recurring segment. Voice first — the format IS the joke.',
  },
  {
    id: 'roast', name: 'The Roast',
    bodyWords: [150, 420],
    minFacts: 1, minStances: 2, minPredictions: 0, tldrRange: [12, 90], requiresDisagreement: false,
    brief: 'Something absurd happened and the desk piles on. Humour is the point; the fact still has to be real.',
  },
  {
    id: 'explainer', name: 'Plainly',
    bodyWords: [300, 800],
    minFacts: 2, minStances: 1, minPredictions: 0, tldrRange: [40, 110], requiresDisagreement: false,
    brief: 'One persona explains the thing without hype or doom. No argument, no forecast — just clarity.',
  },
  {
    id: 'verdict', name: 'The Verdict',
    bodyWords: [150, 400],
    minFacts: 1, minStances: 1, minPredictions: 0, tldrRange: [12, 80], requiresDisagreement: false,
    brief: 'A prediction came due. Corrections grades it out loud — especially when the desk was wrong.',
  },
];

export const formatById = (id) => STORY_FORMATS.find((f) => f.id === id) || null;
/** Legacy days carry no format; they were all the flagship shape. */
export const formatFor = (story) => formatById(story?.format) || formatById('debate');

/**
 * Propose a format for a discovered topic.
 *
 * Deliberately not "always the flagship". A desk that answers every event with
 * the same 110-word argument is exhausting to read; matching the form to the
 * material is most of what makes a publication feel alive. Spectacle gets a
 * roast, a thin single-source item gets a quick take, deep-beat material that
 * splits the cast gets the argument.
 */
export function suggestFormat(topic, { edition = null, castSize = 0 } = {}) {
  const beats = topic?.beats || [];
  if (beats.includes('spectacle')) return formatById('roast');
  if (edition === 'wire' && castSize < 2) return formatById('quick');
  if (edition === 'latenight') return formatById('explainer');
  if (castSize >= 3 && (topic?.sourceCount || 0) >= 2) return formatById('debate');
  if ((topic?.sourceCount || 0) < 2) return formatById('quick');
  return formatById('debate');
}

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
    const fmt = formatFor(story);
    if (story?.format && !formatById(story.format)) errors.push(`${at}: unknown format "${story.format}"`);
    errors.push(...validateTldr(story?.tldr, { range: fmt.tldrRange }).map((e) => `${at}: ${e}`));
    const facts = story?.facts || [];
    if (facts.length < fmt.minFacts) errors.push(`${at}: ${fmt.name} needs at least ${fmt.minFacts} sourced fact(s)`);
    const sourceUrls = new Set(facts.map((f) => f.sourceUrl).filter(Boolean));
    for (const f of facts) {
      if (!f?.text || !/^https?:\/\//.test(f?.sourceUrl || '')) errors.push(`${at}: every fact needs text + source URL`);
    }
    const stances = story?.stances || [];
    if (stances.length < fmt.minStances) errors.push(`${at}: ${fmt.name} needs at least ${fmt.minStances} stance(s)`);
    for (const s of stances) errors.push(...validateStance(s, { sourceUrls }).map((e) => `${at}: ${e}`));
    // The piece itself. Voices in the body must be voices on the story — a
    // persona who never took a position cannot narrate it.
    errors.push(...validateBody(story?.body, {
      range: fmt.bodyWords || [180, 900],
      personaIds: new Set(stances.map((s) => s.personaId)),
    }).map((e) => `${at}: ${e}`));

    const predictions = story?.predictions || [];
    // Predictions are how the desk stays accountable on claims about the
    // FUTURE. A quick take or a roast makes no such claim, so demanding one
    // there produced bolted-on forecasts nobody meant — and made every piece
    // read identically. The flagship still requires it.
    if (predictions.length < fmt.minPredictions) {
      errors.push(`${at}: ${fmt.name} needs at least ${fmt.minPredictions} on-record prediction(s) — accountability is the product for this format`);
    }
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
  <text x="80" y="96" font-family="Georgia, serif" font-size="30" fill="#9aa4b8" letter-spacing="6">THE DESK · WRITTEN BY AI</text>
  <text x="1120" y="96" text-anchor="end" font-family="Inter, sans-serif" font-size="26" fill="#5a637a">${escapeXml(date || '')}</text>
  <text x="80" y="220" font-family="Georgia, serif" font-size="64" font-weight="700" fill="#fafafa">${lineSpans}</text>
  <text x="80" y="470" font-family="Inter, sans-serif" font-size="30" fill="#9aa4b8">${escapeXml(persona ? `— ${persona.name}, AI persona · ${persona.role}` : '— The Desk, AI personas')}</text>
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
/**
 * Shared Desk card renderer.
 *
 * eyebrow/footnote are parameters, not constants (S309): the Director's Report
 * card was first rendered by calling this with only a headline, so it published
 * with "THE DISPATCH" above it and "No account required · double opt-in"
 * underneath — newsletter-signup framing on a performance review. Every gate
 * passed, because a card that says the wrong thing is still a real raster of
 * the right size. Only looking at the pixels caught it.
 *
 * maxTitleLines exists for the same reason: a 2-line clamp cut ORSON's headline
 * at "Three writers carried the week. Three did not", which states the opposite
 * of "Three did not file at all."  A clamp that can truncate mid-clause is a
 * correctness bug, not a layout preference.
 */
export function renderDispatchCardSvg({
  headline = 'The Dispatch',
  subline = '',
  eyebrow = 'THE DESK · THE DISPATCH',
  footnote = 'No account required · double opt-in',
  maxTitleLines = 2,
} = {}) {
  const lines = wrapTitle(String(headline), 24).slice(0, Math.max(1, maxTitleLines));
  // Three lines need to start higher or the last one collides with the subline.
  const titleY = lines.length > 2 ? 196 : 240;
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
  <text x="80" y="96" font-family="Georgia, serif" font-size="30" fill="#9aa4b8" letter-spacing="6">${escapeXml(eyebrow)}</text>
  <text x="80" y="${titleY}" font-family="Georgia, serif" font-size="66" font-weight="700" fill="#fafafa">${lineSpans}</text>
  <text x="80" y="452" font-family="Inter, sans-serif" font-size="${SUB_SIZE}" fill="#9aa4b8">${subSpans}</text>
  <text x="80" y="566" font-family="Inter, sans-serif" font-size="20" fill="#5a637a">${escapeXml(footnote)}</text>
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
