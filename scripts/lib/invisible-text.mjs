/**
 * invisible-text.mjs — remove characters a reader cannot see.
 *
 * Feed text and model output sometimes carry zero-width spaces, word joiners,
 * direction overrides or Unicode TAG characters. They are invisible on the
 * page, can hide instructions from a human reviewer while a model still reads
 * them, and can reorder what a reader sees. Published text and text handed to
 * a model should never contain them.
 *
 * The ranges are built from code points so this file stays free of the
 * characters it removes.
 */

export const INVISIBLE_RANGES = [
  [0x00ad, 0x00ad], // soft hyphen
  [0x061c, 0x061c], // Arabic letter mark
  [0x180e, 0x180e], // Mongolian vowel separator
  [0x200b, 0x200f], // zero-width space/joiners, direction marks
  [0x202a, 0x202e], // direction embeddings and overrides
  [0x2060, 0x2064], // word joiner, invisible operators
  [0x2066, 0x2069], // direction isolates
  [0xfeff, 0xfeff], // byte-order mark / zero-width no-break space
  [0xe0000, 0xe007f], // TAG characters
];

const escapeCodePoint = (cp) => `\\u{${cp.toString(16)}}`;
const CLASS = INVISIBLE_RANGES
  .map(([from, to]) => (from === to ? escapeCodePoint(from) : `${escapeCodePoint(from)}-${escapeCodePoint(to)}`))
  .join('');
const INVISIBLE = new RegExp(`[${CLASS}]`, 'gu');
const INVISIBLE_ONE = new RegExp(`[${CLASS}]`, 'u');

/** Remove invisible characters from text. Non-strings are returned unchanged. */
export function stripInvisible(value) {
  return typeof value === 'string' ? value.replace(INVISIBLE, '') : value;
}

/** True when text contains at least one invisible character. */
export function hasInvisible(value) {
  return typeof value === 'string' && INVISIBLE_ONE.test(value);
}

/** Strip invisible characters from every string inside a JSON-like value. */
export function stripInvisibleDeep(value) {
  if (typeof value === 'string') return stripInvisible(value);
  if (Array.isArray(value)) return value.map(stripInvisibleDeep);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [stripInvisible(k), stripInvisibleDeep(v)]));
  }
  return value;
}
