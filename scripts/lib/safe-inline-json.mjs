/**
 * safe-inline-json.mjs — make JSON safe to place inside an inline <script>.
 *
 * JSON.stringify does not escape "<". A value containing a closing script tag
 * ends the script element early, and whatever follows is parsed as markup. For
 * pages whose text comes from a model, a feed or a member, that is a script
 * injection path. Escaping "<", ">", "&" and the two JavaScript line
 * separators (code points 0x2028 and 0x2029) as backslash-u sequences keeps
 * the JSON equivalent once parsed and removes every character sequence the
 * HTML parser reacts to.
 *
 * These characters are only legal inside JSON strings, so rewriting them in
 * already-serialised JSON text is safe.
 *
 * The separators are built from code points on purpose: this source file must
 * not contain invisible characters itself.
 */

const LINE_SEP = String.fromCharCode(0x2028);
const PARA_SEP = String.fromCharCode(0x2029);
const UNSAFE_CHARS = ['<', '>', '&', LINE_SEP, PARA_SEP];

const hex4 = (ch) => ch.charCodeAt(0).toString(16).padStart(4, '0');
const REPLACEMENT = new Map(UNSAFE_CHARS.map((ch) => [ch, '\\' + 'u' + hex4(ch)]));
const UNSAFE = new RegExp('[' + UNSAFE_CHARS.join('') + ']', 'g');

/** Escape already-serialised JSON text for an inline script element. */
export function safeInlineJson(jsonText) {
  return String(jsonText ?? '').replace(UNSAFE, (ch) => REPLACEMENT.get(ch));
}

/** Serialise a value and escape it for an inline script element. */
export function stringifyForScript(value, space) {
  return safeInlineJson(JSON.stringify(value, null, space));
}

/** True when text can sit inside an inline script without closing it. */
export function isInlineSafe(text) {
  const s = String(text ?? '');
  return !UNSAFE_CHARS.some((ch) => s.includes(ch));
}
