// Shared HTML escaping for Desk article rendering and the checks that read those
// articles back. Renderer and verifier must escape identically, or a fact that is
// on the page reads as absent (S355: a double quote did exactly that).
//
// Invisible characters (zero-width spaces, word joiners, direction overrides,
// TAG characters) are removed here for the same reason: feed and model text
// can carry them, a reader cannot see them, and both sides must agree.
import { stripInvisible } from './invisible-text.mjs';

export function escapeNewsHtml(value) {
  return stripInvisible(String(value)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
