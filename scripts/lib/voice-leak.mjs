/**
 * voice-leak.mjs — structural voice-leak patrol for rendered visitor text.
 *
 * [[feedback_voice_leak_patrol]] / [[feedback_denylist_of_dev_words_is_the_wrong_shape_for_a_public_surface]]:
 * a word denylist is out-vocabularied within the hour. This patrol keys on
 * SHAPES that can only come from the studio's operating layer, never from copy
 * written for a visitor:
 *
 *   - session ids (`S205`, `S367`) — the studio's internal session counter
 *   - registry-internal field names (`playUrl`, `vaultStatus`, `sealedCount`, …)
 *     and audience enums (`public-unlaunched`) leaking out of a JSON feed
 *
 * It reads only text a visitor can see: text nodes, plus the meta description,
 * og/twitter descriptions, alt, title and aria-label attributes. Scripts,
 * styles, comments, JSON-LD and templates are stripped first.
 *
 * Pure functions; the live sweep lives in check-content-coherence.mjs.
 */

export const SESSION_ID = /\bS\d{3}\b/;

// Field names that exist only in data/game-registry.json, api/public-intelligence.json
// and PROJECT_STATUS.json — never in visitor copy. camelCase/kebab tokens, so ordinary
// English cannot collide with them.
export const REGISTRY_FIELDS = Object.freeze([
  'playUrl', 'navOrder', 'vaultStatus', 'deployedUrl', 'sealedCount', 'publicListed',
  'currentFocus', 'nextMilestone', 'mediaReady', 'sourceRepo', 'silCategories',
  'statusNote', 'public-unlaunched', 'public-launched',
]);
const FIELD_RE = new RegExp(`(?<![\\w-])(${REGISTRY_FIELDS.map((f) => f.replace(/-/g, '\\-')).join('|')})(?![\\w-])`);

const decode = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&middot;/g, '·').replace(/&[a-z]+;|&#\d+;/gi, ' ');

/** Visible text of an HTML document (text nodes + visitor-visible attributes). */
export function visibleText(html) {
  const src = String(html || '');
  const attrs = [];
  for (const m of src.matchAll(/<meta\b[^>]*(?:name|property)=["'](?:description|og:description|twitter:description|og:title|twitter:title)["'][^>]*>/gi)) {
    const c = m[0].match(/content=["']([^"']*)["']/i);
    if (c) attrs.push(c[1]);
  }
  const body = src
    .replace(/<head\b[\s\S]*?<\/head>/i, ' ')
    .replace(/<(script|style|template|noscript|svg)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  for (const m of body.matchAll(/\s(?:alt|title|aria-label|placeholder)=["']([^"']*)["']/gi)) attrs.push(m[1]);
  const text = body.replace(/<[^>]+>/g, ' ');
  return decode([text, ...attrs].join(' \n ')).replace(/\s+/g, ' ').trim();
}

/** Leaks in one document: [{ kind, match, context }]. */
export function findVoiceLeaks(html) {
  const text = visibleText(html);
  const out = [];
  const grab = (re, kind) => {
    const g = new RegExp(re.source, 'g');
    for (const m of text.matchAll(g)) {
      out.push({ kind, match: m[0], context: text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40) });
    }
  };
  grab(SESSION_ID, 'session-id');
  grab(FIELD_RE, 'registry-field');
  return out;
}
