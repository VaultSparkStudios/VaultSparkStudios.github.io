// Shared HTML escaping for Desk article rendering and the checks that read those
// articles back. Renderer and verifier must escape identically, or a fact that is
// on the page reads as absent (S355: a double quote did exactly that).
export function escapeNewsHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
