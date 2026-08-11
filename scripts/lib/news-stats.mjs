/**
 * news-stats.mjs — every published number about The Desk, derived from the corpus.
 *
 * The rule this module exists to enforce: a statistic on a public page must be
 * COMPUTED from the thing it describes, never authored alongside it. The panel
 * it replaces printed "The desk disagrees" as a canned sentence keyed off a heat
 * score. On the two stories where it appeared the claim happened to be TRUE —
 * stances really did span +2 underhyped to −1 overhyped — but the reader had no
 * way to know that, because the page asserted a conclusion and showed none of
 * the evidence. An unfalsifiable claim on a page whose entire product is
 * "publicly checkable" is worse than a wrong one.
 *
 * So: no adjectives that a number could carry, and every count traceable to the
 * story JSON that produced it.
 *
 * Honesty rules baked in rather than left to the caller:
 *   · accuracy is null below MIN_GRADED_FOR_ACCURACY — a 1-for-1 record is not
 *     "100% accurate", it is an unproven record, and rounding it to 100 would be
 *     the single most flattering lie this desk could tell about itself.
 *   · sources count unique HOSTS, so three facts citing one blog post is one
 *     source and says so, rather than inflating to three.
 *   · every derived field has an explicit zero/null state, so an empty desk
 *     renders honest emptiness instead of a blank.
 */

/** A track record needs a real sample before it becomes a percentage. */
export const MIN_GRADED_FOR_ACCURACY = 4;

/** Average adult reading speed for considered prose, words per minute. */
const WPM = 220;

export function wordsIn(story) {
  return (story?.body || []).reduce(
    (n, b) => n + String(b?.text || '').split(/\s+/).filter(Boolean).length, 0,
  );
}

export function readMinutes(words) {
  return Math.max(1, Math.round(words / WPM));
}

/**
 * Publisher host, normalised. Deliberately NOT the full URL: two facts from the
 * same article are one source, and the page should say one.
 */
export function hostOf(url) {
  try {
    return new URL(String(url)).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Where the desk actually stands, as a shape rather than an adjective.
 *
 * `solo`  — one voice; nothing to agree or disagree about
 * `agree` — every voice on the same side of zero (or exactly at it)
 * `split` — voices on BOTH sides of zero: a genuine disagreement
 * `lean`  — same side, but meaningfully far apart in degree
 */
export function stanceShape(stances = []) {
  const dirs = stances.map((s) => Number(s?.direction) || 0);
  if (dirs.length <= 1) return { shape: 'solo', spread: 0, positive: dirs.filter((d) => d > 0).length, negative: dirs.filter((d) => d < 0).length };
  const min = Math.min(...dirs);
  const max = Math.max(...dirs);
  const positive = dirs.filter((d) => d > 0).length;
  const negative = dirs.filter((d) => d < 0).length;
  const spread = max - min;
  const shape = positive > 0 && negative > 0 ? 'split' : spread >= 2 ? 'lean' : 'agree';
  return { shape, spread, min, max, positive, negative };
}

/** Human sentence for a stance shape — derived, and it names the actual numbers. */
export function shapeLabel(shape, stances = []) {
  const n = stances.length;
  if (shape === 'solo') return n === 1 ? 'One voice on this one' : 'No stance on record';
  if (shape === 'split') return `${n} voices, and they split`;
  if (shape === 'lean') return `${n} voices, same side, different degree`;
  return `${n} voices, broadly agreed`;
}

export function deriveStoryStats(story, day = {}, { ledger = { entries: [] } } = {}) {
  const words = wordsIn(story);
  const facts = (story?.facts || []).filter((f) => f?.sourceUrl);
  const hosts = [...new Set(facts.map((f) => hostOf(f.sourceUrl)).filter(Boolean))];
  const voices = [...new Set((story?.body || []).filter((b) => b?.voice).map((b) => b.voice))];
  const stances = story?.stances || [];
  const shape = stanceShape(stances);

  // Predictions belong to the ledger, not the story, because the ledger is what
  // gets graded. Reading them from the story would report what was CLAIMED
  // rather than what is on the record.
  const ledgerForDay = (ledger?.entries || []).find((e) => e.date === day?.date);
  const preds = (ledgerForDay?.predictions || []).filter((p) => voices.includes(p.personaId) || stances.some((s) => s.personaId === p.personaId));
  const graded = preds.filter((p) => p.status === 'correct' || p.status === 'wrong');

  return {
    slug: story?.slug || null,
    words,
    minutes: readMinutes(words),
    voices,
    voiceCount: voices.length,
    stanceCount: stances.length,
    sources: hosts,
    sourceCount: hosts.length,
    factCount: facts.length,
    panels: story?.memeLine?.text ? 1 : 0,
    panelBy: story?.memeLine?.personaId || null,
    format: story?.format || null,
    edition: story?.edition || null,
    isLead: Boolean(day?.leadSlug && story?.slug === day.leadSlug),
    shape: shape.shape,
    spread: shape.spread,
    label: shapeLabel(shape.shape, stances),
    positions: stances.map((s) => ({ personaId: s.personaId, direction: Number(s.direction) || 0, verdict: s.verdict || null })),
    predictions: {
      onRecord: preds.length,
      open: preds.filter((p) => p.status === 'open').length,
      graded: graded.length,
      correct: preds.filter((p) => p.status === 'correct').length,
    },
  };
}

/**
 * Desk-wide totals. `accuracy` stays null until the sample is real — see
 * MIN_GRADED_FOR_ACCURACY. A public scoreboard that reports 100% off one graded
 * call is not a track record, it is an advert.
 */
export function deriveDeskStats(days = [], ledger = { entries: [] }) {
  const stories = days.flatMap((d) => (d.stories || []).map((s) => ({ day: d, story: s })));
  const per = stories.map(({ day, story }) => deriveStoryStats(story, day, { ledger }));

  const allPreds = (ledger?.entries || []).flatMap((e) => e.predictions || []);
  const correct = allPreds.filter((p) => p.status === 'correct').length;
  const wrong = allPreds.filter((p) => p.status === 'wrong').length;
  const graded = correct + wrong;

  const voices = [...new Set(per.flatMap((p) => p.voices))];
  const panelists = [...new Set(per.map((p) => p.panelBy).filter(Boolean))];
  const dates = days.map((d) => d.date).filter(Boolean).sort();

  return {
    days: days.length,
    firstDate: dates[0] || null,
    latestDate: dates[dates.length - 1] || null,
    stories: stories.length,
    words: per.reduce((n, p) => n + p.words, 0),
    minutes: per.reduce((n, p) => n + p.minutes, 0),
    voices: voices.length,
    voiceIds: voices.sort(),
    panelists: panelists.sort(),
    sources: [...new Set(per.flatMap((p) => p.sources))].sort(),
    sourceCount: new Set(per.flatMap((p) => p.sources)).size,
    facts: per.reduce((n, p) => n + p.factCount, 0),
    panels: per.reduce((n, p) => n + p.panels, 0),
    formats: countBy(per.map((p) => p.format)),
    editions: countBy(per.map((p) => p.edition)),
    shapes: countBy(per.map((p) => p.shape)),
    predictions: {
      onRecord: allPreds.length,
      open: allPreds.filter((p) => p.status === 'open').length,
      graded,
      correct,
      wrong,
      // null, not 0 and not 100 — "we have not been graded enough to say" is the
      // true statement, and the page must be able to render exactly that.
      accuracy: graded >= MIN_GRADED_FOR_ACCURACY ? Math.round((correct / graded) * 100) : null,
      accuracyBasis: graded >= MIN_GRADED_FOR_ACCURACY
        ? `${correct} of ${graded} graded calls`
        : `${graded} graded so far — a record needs ${MIN_GRADED_FOR_ACCURACY} before it means anything`,
    },
  };
}

function countBy(values) {
  const out = {};
  for (const v of values) {
    if (v === null || v === undefined) continue;
    out[v] = (out[v] || 0) + 1;
  }
  return out;
}
