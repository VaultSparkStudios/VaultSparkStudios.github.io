/**
 * sil-forecaster.mjs
 *
 * Parses SELF_IMPROVEMENT_LOOP.md session history and projects next session's
 * SIL score (total + per-category) from recent trend. Feeds the optional
 * "SIL FORECAST" block in the startup brief, which degrades gracefully when
 * this returns [] / null.
 *
 * Contract (relied on by render-startup-brief.mjs:1216):
 *   parseSilHistory(silTxt) -> Array<{ session, date, total, velocity, categories }>  (NEWEST first)
 *   forecastNext(sessions, { velocity, blockerPressure, contextAge })
 *       -> { totalPredicted: number, categories: { [name]: { predicted, delta } } } | null
 */

// Canonical 10 SIL v3.0 categories (label as it appears in SIL category lines).
const CATEGORY_ALIASES = {
  'dev health': 'Dev Health',
  'creative alignment': 'Alignment',
  'alignment': 'Alignment',
  'momentum': 'Momentum',
  'engagement': 'Engagement',
  'process quality': 'Process Quality',
  'cross-repo coherence': 'Coherence',
  'coherence': 'Coherence',
  'security posture': 'Security',
  'security': 'Security',
  'ecosystem integration': 'Ecosystem',
  'ecosystem': 'Ecosystem',
  'capital efficiency': 'Capital',
  'automation coverage': 'Automation',
  'automation': 'Automation',
};

function canonCategory(raw) {
  return CATEGORY_ALIASES[String(raw || '').trim().toLowerCase()] || null;
}

/**
 * Parse the per-session score lines. Each session is a `## ... Session N ...
 * Total: NNN/1000 ...` header optionally followed by a category line:
 *   "Dev Health 98 | Creative Alignment 99 | Momentum 98 | ..."
 *   (separator may be `|` or `·`, optionally wrapped in parentheses)
 * @param {string} silTxt
 * @returns {Array} sessions, newest first
 */
export function parseSilHistory(silTxt) {
  const txt = String(silTxt || '');
  if (!txt) return [];

  const lines = txt.split('\n');
  const sessions = [];
  const headerRe = /^##\s+(\d{4}-\d{2}-\d{2})\s+—\s+Session\s+(\d+)\b[\s\S]*?Total:\s*(\d+)\/1000/i;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(headerRe);
    if (!m) continue;
    const [, date, sessionStr, totalStr] = m;
    const velMatch = lines[i].match(/Velocity:\s*(\d+)/i);

    // Look ahead a few lines for the category breakdown line.
    const categories = {};
    for (let j = i + 1; j <= Math.min(i + 4, lines.length - 1); j++) {
      const cl = lines[j];
      if (/^##\s/.test(cl)) break; // hit next session
      // Category tokens look like "<Name words> <number>" separated by | or ·
      const pairRe = /([A-Za-z][A-Za-z -]+?)\s+(\d{1,3})(?=\s*[|·)]|\s*$)/g;
      let pm;
      let found = 0;
      while ((pm = pairRe.exec(cl)) !== null) {
        const name = canonCategory(pm[1]);
        const val = parseInt(pm[2], 10);
        if (name && Number.isFinite(val) && val >= 0 && val <= 100) {
          categories[name] = val;
          found++;
        }
      }
      if (found >= 5) break; // got a real category line
    }

    sessions.push({
      session: parseInt(sessionStr, 10),
      date,
      total: parseInt(totalStr, 10),
      velocity: velMatch ? parseInt(velMatch[1], 10) : null,
      categories,
    });
  }

  // File is already newest-first; preserve that order.
  return sessions;
}

/** Average of consecutive deltas (linear trend) over a numeric series given newest-first. */
function trendSlope(valuesNewestFirst) {
  const v = valuesNewestFirst.filter((n) => Number.isFinite(n));
  if (v.length < 2) return 0;
  let sum = 0;
  let n = 0;
  // newest-first → delta from older to newer is v[k-1] - v[k]
  for (let k = 1; k < v.length; k++) {
    sum += v[k - 1] - v[k];
    n++;
  }
  return n ? sum / n : 0;
}

const clamp100 = (x) => Math.max(0, Math.min(100, x));

/**
 * Project next session scores from recent history.
 * @param {Array} sessions - newest first (from parseSilHistory)
 * @param {object} [signals] - { velocity, blockerPressure, contextAge } (advisory)
 * @returns {{totalPredicted:number, categories:Object}|null}
 */
export function forecastNext(sessions, signals = {}) {
  if (!Array.isArray(sessions) || sessions.length === 0) return null;
  const recent = sessions.slice(0, 5);
  const current = recent[0];
  if (!current || !current.categories) return null;

  const catNames = Object.keys(current.categories);
  if (catNames.length === 0) return null;

  // Headwind: low velocity / high blocker pressure dampen projected gains.
  const velocity = Number(signals.velocity);
  const headwind = Number.isFinite(velocity) && velocity <= 1 ? 0.5 : 1;

  const categories = {};
  let totalPredicted = 0;
  for (const name of catNames) {
    const series = recent.map((s) => s.categories?.[name]).filter((n) => Number.isFinite(n));
    const curVal = current.categories[name];
    const slope = trendSlope(series) * headwind;
    const predicted = Math.round(clamp100(curVal + slope));
    categories[name] = { predicted, delta: predicted - curVal };
    totalPredicted += predicted;
  }

  return { totalPredicted, categories };
}

export default { parseSilHistory, forecastNext };
