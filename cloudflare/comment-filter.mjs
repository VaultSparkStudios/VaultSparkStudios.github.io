/**
 * comment-filter.mjs — automatic comment filtering for The Desk (S356).
 *
 * Pure, dependency-free and side-effect-free: no network, no storage, no
 * timers, no `Date.now()`. The Worker imports it (cloudflare/desk-comments.mjs)
 * and node:test unit-tests it directly (tests/desk-comments.unit.spec.js).
 *
 * Contract: filterComment() returns { verdict, score, reasons[] } where
 *   'published' — clean, post it now
 *   'held'      — borderline; stored for a human moderator, NEVER auto-shown
 *   'rejected'  — refused at the edge
 * Anything the filter is unsure about resolves to 'held'. Only unambiguous
 * hate/threat/explicit content resolves to 'rejected', because a false
 * rejection silences a real reader while a false hold only delays them.
 *
 * Why the term table is ROT13-encoded: this file ships in a public repo and is
 * read by people auditing the moderation rules. Storing the vocabulary encoded
 * (decoded once at module load, see rot13()) keeps the source from being a
 * plain-text slur list while leaving the rules fully reviewable.
 *
 * Why the invisible-character classes are written as \uXXXX escapes rather than
 * the characters themselves: literal NUL and control bytes made this file
 * BINARY to git and grep, so the moderation ruleset of a public repo could not
 * be diffed or reviewed. The escapes are byte-identical in behaviour.
 *
 * Evasion handling, in order: Unicode normalization (NFKC), zero-width and
 * control-character stripping, Zalgo/combining-mark trimming, Cyrillic/Greek
 * homoglyph folding, leetspeak folding, spaced-out spelling re-joining
 * ("f u c k"), per-letter repetition and punctuation/asterisk separators
 * ("n.i.g.g.e.r", "f**k"). Matching then happens on that skeleton.
 */

/** ROT13 both encodes and decodes; the table below is stored encoded. */
export function rot13(value) {
  return String(value == null ? '' : value).replace(/[a-z]/gi, (c) => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

export const BODY_MIN = 2;
export const BODY_MAX = 1500;
export const NAME_MAX = 40;
/** Score at or above which an otherwise-clean comment is held for review. */
export const HOLD_SCORE = 3;
export const GUEST_LINK_ALLOWANCE = 0;
export const MEMBER_LINK_ALLOWANCE = 2;

const WEIGHT = { rejected: 10, held: 5 };

// --- normalization ---------------------------------------------------------

/**
 * Both invisible-character classes are BUILT from code-point ranges instead of
 * being written out as characters or escapes. Written as characters, the class
 * contained literal NUL and control bytes, which made this file binary to git
 * and grep — a moderation ruleset in a public repo that could not be diffed.
 * Written as escapes, a single wrong backslash turns the class into "strip the
 * letters V and H", which is silent and passes a read-through. Ranges are
 * inclusive [start, end] code points; every character in them is a control or
 * formatting character, so none can be a regex metacharacter.
 */
function classFromRanges(ranges) {
  const body = ranges
    .map(([start, end]) => (start === end
      ? String.fromCodePoint(start)
      : `${String.fromCodePoint(start)}-${String.fromCodePoint(end)}`))
    .join('');
  return new RegExp(`[${body}]`, 'g');
}

// Zero-width spaces/joiners, bidi overrides, word joiners, BOM, soft hyphen.
const ZERO_WIDTH = classFromRanges([
  [0x200b, 0x200f], [0x202a, 0x202e], [0x2060, 0x2064], [0xfeff, 0xfeff], [0x00ad, 0x00ad],
]);
// Control characters, excluding tab (0x09) and newline (0x0a): tab collapses to
// a space and newlines are the reader's paragraphs. CR is rewritten before this
// class is applied, so 0x0d is intentionally absent from the ranges.
const CONTROL = classFromRanges([
  [0x0000, 0x0008], [0x000b, 0x000c], [0x000e, 0x001f], [0x007f, 0x009f],
]);

/**
 * Display-safe normalization. Keeps the reader's paragraphs (at most one blank
 * line) but removes invisible characters, collapses horizontal whitespace and
 * trims Zalgo stacks. The RESULT is what gets stored.
 */
export function normalizeText(value, { singleLine = false } = {}) {
  let text = String(value == null ? '' : value);
  try { text = text.normalize('NFKC'); } catch (_e) { /* engine without ICU */ }
  text = text.replace(ZERO_WIDTH, '').replace(/\r\n?/g, '\n').replace(CONTROL, '');
  text = text.replace(/[‘’‛]/g, "'").replace(/[“”]/g, '"');
  try { text = text.replace(/(\p{M})\p{M}{2,}/gu, '$1'); } catch (_e) { /* no unicode props */ }
  text = text.replace(/[^\S\n]+/g, ' ');
  if (singleLine) return text.replace(/\n+/g, ' ').replace(/ {2,}/g, ' ').trim();
  return text
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Cyrillic / Greek / Latin-extended look-alikes folded to ASCII.
const HOMOGLYPHS = {
  'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y',
  'х': 'x', 'і': 'i', 'ј': 'j', 'ѕ': 's', 'ԁ': 'd', 'н': 'h',
  'к': 'k', 'м': 'm', 'т': 't', 'в': 'b',
  'ɡ': 'g', 'ı': 'i', 'α': 'a', 'ο': 'o', 'ε': 'e', 'ι': 'i',
  'κ': 'k', 'τ': 't', 'ρ': 'p', 'ν': 'v', 'σ': 's',
};
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', 9: 'g', '@': 'a', '$': 's', '+': 't', '€': 'e' };

/**
 * Match skeleton: single-line, accent-free, homoglyph- and leet-folded, with
 * spaced-out spelling re-joined. Never stored or displayed — matching only.
 */
export function skeleton(value) {
  let text = normalizeText(value, { singleLine: true }).toLowerCase();
  try { text = text.normalize('NFKD').replace(/\p{M}+/gu, ''); } catch (_e) { /* ignore */ }
  text = text.replace(/[^\x00-\x7F]/g, (c) => HOMOGLYPHS[c] || c);
  // `!` and `|` only stand in for `i` between letters, so "wow!" stays "wow".
  text = text.replace(/(?<=[a-z])[!|](?=[a-z])/g, 'i');
  text = text.replace(/[0-9@$+€]/g, (c) => LEET[c] || c);
  // "f u c k" → "fuck" (runs of single letters separated by single spaces).
  text = text.replace(/(?<![a-z*])(?:[a-z*] ){2,}[a-z*](?![a-z*])/g, (m) => m.replace(/ /g, ''));
  return text;
}

// --- term table ------------------------------------------------------------
// [encoded, mode, verdict, reason, suffixes?, notAfter?]
//   mode 'word' — must stand as its own word (+ optional listed suffixes)
//   mode 'sub'  — matches anywhere (only for terms with no innocent host word)
//   notAfter    — a letter that must NOT precede the match (e.g. "snigger")
const TERMS = [
  // Unambiguous hate vocabulary → rejected.
  ['avttre', 'sub', 'rejected', 'slur', '', 's'],
  ['avttn', 'sub', 'rejected', 'slur', '', 's'],
  ['snttbg', 'sub', 'rejected', 'slur'],
  ['xvxr', 'word', 'rejected', 'slur', 's'],
  ['fcvp', 'word', 'rejected', 'slur', 's'],
  ['jrgonpx', 'sub', 'rejected', 'slur'],
  ['genaal', 'word', 'rejected', 'slur', 's'],
  ['genaavrf', 'word', 'rejected', 'slur'],
  ['enturnq', 'sub', 'rejected', 'slur'],
  ['gbjryurnq', 'sub', 'rejected', 'slur'],
  ['ornare', 'word', 'rejected', 'slur', 's'],
  ['tbbx', 'word', 'rejected', 'slur', 's'],
  ['wvtnobb', 'sub', 'rejected', 'slur'],
  // Ambiguous, reclaimed, or legitimate in other senses ("a chink in the
  // armour", "Pakistan") → held for a human rather than auto-rejected.
  ['puvax', 'word', 'held', 'slur_borderline', 's'],
  ['cnxv', 'word', 'held', 'slur_borderline', 's'],
  ['snt', 'word', 'held', 'slur_borderline', 's'],
  ['ergneq', 'word', 'held', 'slur_borderline', 's|ed'],
  ['qlxr', 'word', 'held', 'slur_borderline', 's'],
  ['wnc', 'word', 'held', 'slur_borderline', 's'],
  ['gneq', 'word', 'held', 'slur_borderline', 's'],
  // Explicit sexual content → rejected; softer sexual vocabulary → held.
  ['oybjwbo', 'sub', 'rejected', 'sexual_explicit'],
  ['unaqwbo', 'sub', 'rejected', 'sexual_explicit'],
  ['phzfubg', 'sub', 'rejected', 'sexual_explicit'],
  ['pernzcvr', 'sub', 'rejected', 'sexual_explicit'],
  ['tnatonat', 'sub', 'rejected', 'sexual_explicit'],
  ['cbea', 'word', 'held', 'sexual', 'o|s'],
  ['ahqrf', 'word', 'held', 'sexual'],
  ['uragnv', 'word', 'held', 'sexual'],
  ['obbof', 'word', 'held', 'sexual'],
  ['gvgf', 'word', 'held', 'sexual'],
  // Profanity → held. Never rejected: strong language about a news story is
  // an opinion, not abuse, and a moderator can publish it in one click.
  ['shpx', 'sub', 'held', 'profanity'],
  ['fuvg', 'word', 'held', 'profanity', 's|ty|ting|head|heads|hole|holes|show|post|posting|storm'],
  ['ohyyfuvg', 'sub', 'held', 'profanity'],
  ['phag', 'word', 'held', 'profanity', 's'],
  ['ovgpu', 'sub', 'held', 'profanity'],
  ['nffubyr', 'sub', 'held', 'profanity'],
  ['qvpx', 'word', 'held', 'profanity', 's|head|heads'],
  ['pbpx', 'word', 'held', 'profanity', 's'],
  ['chffl', 'word', 'held', 'profanity'],
  ['juber', 'word', 'held', 'profanity', 's'],
  ['fyhg', 'word', 'held', 'profanity', 's|ty'],
  ['onfgneq', 'word', 'held', 'profanity', 's'],
  ['gjng', 'word', 'held', 'profanity', 's'],
  ['jnaxre', 'word', 'held', 'profanity', 's'],
  ['cevpx', 'word', 'held', 'profanity', 's'],
];

// Display names a guest may not claim (impersonation of the studio or staff).
const RESERVED_TERMS = ['inhyg', 'fcnex', 'nqzva', 'zbqrengbe', 'fgnss', 'bssvpvny', 'sbhaqre', 'fhccbeg'];

const SEP = "[._*~+'\\-]?";

function escapeChar(ch) {
  return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** One letter, repeated freely; vowels may also be starred out ("f**k"). */
function letterPattern(ch) {
  const e = escapeChar(ch);
  return /[aeiou]/.test(ch) ? `(?:${e}+|[*#]+)` : `${e}+`;
}

function compile([encoded, mode, verdict, reason, suffixes = '', notAfter = '']) {
  const term = rot13(encoded);
  const core = Array.from(term).map(letterPattern).join(SEP);
  const lookBehind = notAfter ? `(?<![${notAfter}])` : '';
  const suffix = suffixes ? `(?:${suffixes})?` : '';
  const source = mode === 'word'
    ? `(?<![a-z])${core}${suffix}(?![a-z])`
    : `${lookBehind}${core}`;
  return { verdict, reason, re: new RegExp(source, 'i') };
}

const COMPILED = TERMS.map(compile);
const RESERVED = RESERVED_TERMS.map((t) => new RegExp(Array.from(rot13(t)).map(letterPattern).join(SEP), 'i'));

// --- pattern detectors -----------------------------------------------------

const EMAIL_RE = /[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/gi;
const EMAIL_OBFUSCATED_RE = /\b(?:at|@)\s*(?:gmail|yahoo|outlook|hotmail|protonmail|proton|icloud|yandex)\b/i;
const URL_RE = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9][a-z0-9\-]{0,62}\.(?:com|net|org|io|co|me|ru|xyz|ly|gg|app|dev|ai|info|biz|top|shop|site|online|live|tv|link|click|store|cc|tk|uk|de|cn|us)\b(?:\/\S*)?/gi;
const DOT_OBFUSCATED_RE = /\b[a-z0-9\-]{2,}\s*[([]?\s*dot\s*[)\]]?\s*(?:com|net|org|io|co)\b/i;
const PHONE_NANP_RE = /(?<!\w)(?:\+?1[\s.\-]?)?(?:\(\d{3}\)|\d{3})[\s.\-]\d{3}[\s.\-]\d{4}(?!\w)/;
const PHONE_INTL_RE = /(?<!\w)\+\d[\d\s.\-]{8,16}\d(?!\w)/;
const SSN_RE = /(?<!\w)\d{3}-\d{2}-\d{4}(?!\w)/;
const STREET_RE = /(?<!\w)\d{1,5}\s+[a-z][a-z.\-]*\s+(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|way)\b/i;

const THREAT_RES = [
  /\b(?:kill|hang|shoot|stab|murder)\s+(?:your ?self|yourself|urself|ur ?self|themselves)\b/,
  /\bkys\b/,
  /\b(?:i|we)\s*(?:'?ll|will|am going to|'?m going to|'?m gonna|gonna|going to)\s+(?:kill|hurt|shoot|stab|rape|murder|beat|find)\s+(?:you|u|him|her|them|your|ur)\b/,
  /\b(?:hope|wish)\s+(?:you|u|he|she|they)\s+(?:die|dies|burn|get killed|gets killed)\b/,
  /\bi know where (?:you|u|he|she|they) (?:live|lives|work|works|sleep|sleeps)\b/,
  /\b(?:rape|behead|lynch)\s+(?:you|u|him|her|them)\b/,
  /\bshould be (?:shot|hanged|hung|killed|lynched|gassed)\b/,
  /\bgo (?:die|kill yourself)\b/,
];

// Publishing a specific person's location or identifier is refused outright.
// TALKING about doxxing ("they published his home address in the piece") is a
// legitimate thing to say about a news story, so it is held for a person
// instead — rejecting it would silence commentary on the article.
const DOX_HARD_RES = [
  STREET_RE,
  SSN_RE,
  /\b(?:lives|living|works) (?:at|on) \d/,
];

const DOX_SOFT_RES = [
  /\b(?:home|house|street|ip) address\b/,
  /\bdox+(?:ed|ing|es)?\b/,
];

const SPAM_PHRASE_RE = /\b(?:buy now|click here|limited (?:time )?offer|free money|work from home|make \$?\d+k? (?:a|per) (?:day|week|month)|crypto (?:giveaway|signals?)|investment opportunity|guaranteed returns|dm me|hit me up for|onlyfans|casino|viagra|cialis|escorts?|promo code|use my code|check my (?:bio|profile)|followers for free)\b/i;
const CONTACT_APP_RE = /\b(?:whats ?app|telegram|wechat|signal group)\b/i;

function capsProfile(text) {
  let letters = 0;
  let upper = 0;
  for (const ch of text) {
    if (/[a-z]/i.test(ch)) {
      letters += 1;
      if (ch === ch.toUpperCase()) upper += 1;
    }
  }
  return { letters, ratio: letters ? upper / letters : 0 };
}

function tokenRepetition(skel) {
  const tokens = skel.split(/[^a-z0-9]+/).filter((t) => t.length >= 2);
  if (tokens.length < 6) return false;
  const counts = new Map();
  let run = 1;
  let maxRun = 1;
  tokens.forEach((t, i) => {
    counts.set(t, (counts.get(t) || 0) + 1);
    if (i > 0 && tokens[i - 1] === t) { run += 1; maxRun = Math.max(maxRun, run); } else { run = 1; }
  });
  const max = Math.max(...counts.values());
  return max / tokens.length >= 0.5 || maxRun >= 4;
}

/** Short, non-specific category for the reader-facing rejection message. */
export function publicCategory(reasons) {
  const set = new Set(reasons || []);
  if (set.has('threat')) return 'threat';
  if (set.has('slur')) return 'hate';
  if (set.has('sexual_explicit')) return 'sexual';
  if (set.has('doxxing')) return 'privacy';
  if (set.has('length')) return 'length';
  return 'policy';
}

/**
 * Classify one comment body.
 * @param {string} body raw reader input
 * @param {{authorKind?: 'guest'|'member'}} options members get a small link allowance
 * @returns {{verdict: 'published'|'held'|'rejected', score: number, reasons: string[], text: string, links: number, category: string}}
 */
export function filterComment(body, { authorKind = 'guest' } = {}) {
  const text = normalizeText(body);
  const chars = Array.from(text).length;
  if (chars < BODY_MIN || chars > BODY_MAX) {
    return { verdict: 'rejected', score: 100, reasons: ['length'], text, links: 0, category: 'length' };
  }

  const skel = skeleton(text);
  const reasons = new Set();
  let score = 0;
  let verdict = 'published';
  const add = (reason, weight) => {
    if (reasons.has(reason)) return;
    reasons.add(reason);
    score += weight;
  };
  const escalate = (next) => {
    if (next === 'rejected') verdict = 'rejected';
    else if (next === 'held' && verdict !== 'rejected') verdict = 'held';
  };

  for (const term of COMPILED) {
    if (term.re.test(skel)) {
      add(term.reason, WEIGHT[term.verdict]);
      escalate(term.verdict);
    }
  }
  for (const re of THREAT_RES) {
    if (re.test(skel)) { add('threat', WEIGHT.rejected); escalate('rejected'); break; }
  }
  // Digits survive in `text`, but leetspeak folding rewrites them in `skel`
  // ("221 Baker Street" → "22i baker street"), so address and identifier
  // patterns are matched against the normalized text as well. A skeleton-only
  // check could never fire on any of them — the class of bug where a rule is
  // present, passes review, and has no reachable input.
  const lowerText = text.toLowerCase();
  for (const re of DOX_HARD_RES) {
    if (re.test(lowerText) || re.test(skel)) { add('doxxing', WEIGHT.rejected); escalate('rejected'); break; }
  }
  for (const re of DOX_SOFT_RES) {
    if (re.test(skel)) { add('doxxing_mention', WEIGHT.held); escalate('held'); break; }
  }

  const emails = text.match(EMAIL_RE) || [];
  if (emails.length || EMAIL_OBFUSCATED_RE.test(skel)) { add('email', WEIGHT.held); escalate('held'); }
  if (PHONE_NANP_RE.test(text) || PHONE_INTL_RE.test(text)) { add('phone', WEIGHT.held); escalate('held'); }

  const links = (text.replace(EMAIL_RE, ' ').match(URL_RE) || []).length + (DOT_OBFUSCATED_RE.test(skel) ? 1 : 0);
  const allowance = authorKind === 'member' ? MEMBER_LINK_ALLOWANCE : GUEST_LINK_ALLOWANCE;
  if (links > allowance) {
    add(authorKind === 'member' ? 'links_excess' : 'link', WEIGHT.held);
    escalate('held');
  }

  if (/(.)\1{6,}/u.test(text)) add('spam_repeat_chars', 2);
  const caps = capsProfile(text);
  if (caps.letters >= 16 && caps.ratio >= 0.7) add('spam_caps', caps.letters >= 40 ? 3 : 2);
  if (tokenRepetition(skel)) add('spam_repeat_tokens', 3);
  if (SPAM_PHRASE_RE.test(skel)) add('spam_phrase', 3);
  if (CONTACT_APP_RE.test(skel)) add('spam_contact_app', 2);

  // Accumulated spam signal alone is enough to hold, never to reject.
  if (verdict === 'published' && score >= HOLD_SCORE) verdict = 'held';

  const list = [...reasons];
  return { verdict, score: Math.min(score, 100), reasons: list, text, links, category: publicCategory(list) };
}

/**
 * Validate a display name. Names are not "held" — an unusable name is refused
 * so the reader can pick another one immediately.
 * @returns {{ok: boolean, name: string, reasons: string[]}}
 */
export function filterDisplayName(value, { authorKind = 'guest' } = {}) {
  const name = normalizeText(value, { singleLine: true });
  const chars = Array.from(name).length;
  if (chars < 1 || chars > NAME_MAX) return { ok: false, name, reasons: ['length'] };

  const skel = skeleton(name);
  const reasons = [];
  if ((name.match(EMAIL_RE) || []).length) reasons.push('email');
  if ((name.replace(EMAIL_RE, ' ').match(URL_RE) || []).length) reasons.push('link');
  if (PHONE_NANP_RE.test(name) || PHONE_INTL_RE.test(name)) reasons.push('phone');
  for (const term of COMPILED) {
    if (term.re.test(skel)) { reasons.push(term.reason); break; }
  }
  for (const re of THREAT_RES) {
    if (re.test(skel)) { reasons.push('threat'); break; }
  }
  if (authorKind !== 'member') {
    for (const re of RESERVED) {
      if (re.test(skel)) { reasons.push('reserved'); break; }
    }
  }
  if (!/[a-z0-9]/i.test(skel)) reasons.push('unreadable');
  return { ok: reasons.length === 0, name, reasons };
}
