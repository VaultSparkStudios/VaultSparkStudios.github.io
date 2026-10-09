/** Match persona output after the shared shell restores its indentation.
 * The persona generator already normalizes line-edge indentation. Other
 * artifacts keep their existing exact comparison (apart from outer trim).
 */
export function newsPageMatches(existing, expected, route) {
  const persona = /^news\/personas\/[^/]+\/(?:page\/\d+\/)?index\.html$/.test(route);
  const comparable = value => persona
    ? value.replace(/[ \t]+$/gm, '').replace(/\n[ \t]+/g, '\n').trim()
    : value.trim();
  return comparable(existing) === comparable(expected);
}
